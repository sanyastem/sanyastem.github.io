---
layout: post
title: "Claude Code: пишем свой MCP-сервер с нуля"
categories: ai
translation_of: "/en/ai/claude-code-mcp-build/"
tldr:
  - "Свой MCP-сервер на TypeScript: npm install @modelcontextprotocol/sdk zod, класс Server + StdioServerTransport и хендлеры ListTools/CallToolRequestSchema."
  - "Подключение: npm run build, затем .mcp.json с command: node и args: путь к dist/index.js; после перезапуска /mcp покажет сервер и его инструменты."
  - "Отладка — npx @modelcontextprotocol/inspector node ./dist/index.js: UI в браузере с raw JSON-запросами; логи только в stderr — console.log в stdout ломает протокол."
  - "Безопасность: валидируй пути (full.startsWith(DOCS_DIR) против path traversal); для команды публикуй пакет в npm и подключай через npx -y @your-org/mcp-server."
date: 2026-05-08
date_ru: "8 мая 2026"
read_time: 10
difficulty: intermediate
series: "Claude Code: полный гайд"
part: 5
description: "Пошаговый гайд: пишем MCP-сервер на TypeScript, подключаем к Claude Code, отлаживаем через MCP Inspector и расшариваем команде."
excerpt_text: "Свой MCP-сервер — когда готовых не хватает: реальный пример с поиском по внутренним докам, отладка и публикация в npm"
keywords: "MCP server, model context protocol, своими руками, claude code custom mcp, mcp sdk typescript, mcp inspector"
howto:
  name: "Написать собственный MCP-сервер для Claude Code"
  totalTime: "PT30M"
  steps:
    - name: "Создать проект"
      text: "mkdir mcp-server && cd mcp-server; npm init -y; npm install @modelcontextprotocol/sdk zod; npm install -D typescript @types/node tsx."
    - name: "Написать минимальный server"
      text: "src/index.ts с импортом Server из @modelcontextprotocol/sdk, StdioServerTransport, и одним ping-tool через setRequestHandler."
    - name: "Реализовать реальные tools"
      text: "Заменить ping на свои tools (search_docs, read_doc и т.д.). Каждый — name, description, inputSchema с zod-валидацией, обработчик в CallToolRequestSchema."
    - name: "Защитить от path traversal"
      text: "Если работаешь с файлами, валидировать full.startsWith(BASE_DIR). MCP-сервер запускается с правами твоего пользователя — может прочитать /etc/passwd если не проверять."
    - name: "Подключить к Claude Code"
      text: "Скомпилировать (npm run build), создать .mcp.json в корне проекта с command: node, args: путь к dist/index.js. Restart Claude Code → /mcp покажет твой сервер."
    - name: "Отладить через MCP Inspector"
      text: "npx @modelcontextprotocol/inspector node ./dist/index.js — UI в браузере с raw JSON-запросами/ответами. Прогнать все tools на edge-кейсах."
    - name: "Опубликовать в npm"
      text: "package.json с bin field, npm publish --access=public. Теперь команда подключает через npx -y @your-org/mcp-server в их .mcp.json."
faq:
  - q: "Когда писать свой vs брать готовый?"
    a: "Свой — для внутренних API без коннектора, специфичных БД, регулярно используемых workflows. Готовый из реестра — для стандартного (GitHub, Postgres, Slack). Не пиши свой для разовых задач — bash-скрипт + skill справится."
  - q: "Резидентский MCP или Stdio?"
    a: "Stdio — стандарт для локальных Claude Code сценариев (Python/Node процесс запускается per-session). HTTP/SSE — для remote MCP (доступ из cloud, общий между пользователями). Для большинства команд — Stdio проще и безопаснее."
  - q: "Куда писать логи MCP-сервера?"
    a: "В stderr или файл — НЕ в stdout. stdout зарезервирован под протокол. console.log сломает парсер на стороне Claude и сервер отвалится с ошибкой. Используй process.stderr.write."
  - q: "Можно ли передавать секреты в MCP env?"
    a: "Да, через env в .mcp.json: \"env\": { \"API_KEY\": \"\\${API_KEY}\" }. Подставляется из системной среды. Не хардкодь токены в .mcp.json — файл коммитится в репо."
---

В [предыдущей части](/ai/claude-code-mcp/) мы подключали готовые MCP-серверы. Но иногда нужно своё: внутренний API, специфичная база, корпоративный сервис без публичного коннектора. Сейчас напишем рабочий сервер с нуля — за один присест.

## Когда писать свой, а когда взять готовый

| Ситуация | Решение |
|---|---|
| Нужен GitHub / Postgres / Slack / Jira | Готовый из реестра |
| Внутренний REST API без OpenAPI | Свой |
| Локальная утилита (CLI, скрипт) с особым интерфейсом | Свой |
| База данных с нестандартной авторизацией | Свой (или fork готового) |
| Один-два простых вызова — можно скриптом | Skill или Bash, не MCP |

Свой MCP оправдан, когда инструмент будет переиспользоваться: команда, несколько проектов, регулярные задачи. Для разовой задачи проще написать обычный скрипт и звать его через Bash.

## Что мы построим

Сервер `docs-search` — ищет по локальным `.md` файлам в папке. Два инструмента:

- `search_docs(query, limit)` — полнотекстовый поиск, возвращает топ-N совпадений со сниппетами
- `read_doc(path)` — читает конкретный файл

Реальный кейс: внутренние команды держат wiki в `/docs/` репозитория, и Claude должен уметь по ней шерстить, не загружая всё в контекст.

## Шаг 1. Скелет проекта

```bash
mkdir mcp-docs-search && cd mcp-docs-search
npm init -y
npm install @modelcontextprotocol/sdk zod
npm install -D typescript @types/node tsx
npx tsc --init
```

В `package.json` добавь:

```json
{
  "type": "module",
  "bin": {
    "mcp-docs-search": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts"
  }
}
```

В `tsconfig.json` важные опции:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true
  }
}
```

## Шаг 2. Минимальный сервер

```typescript
// src/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "docs-search", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "ping",
      description: "Проверка связи. Возвращает pong.",
      inputSchema: { type: "object", properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name === "ping") {
    return { content: [{ type: "text", text: "pong" }] };
  }
  throw new Error(`Unknown tool: ${req.params.name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

Запусти `npm run dev` — сервер ждёт сообщения на stdin. Для теста есть отдельный инструмент (см. шаг 5), пока продолжаем.

## Шаг 3. Реальные инструменты

Заменим `ping` на полезные `search_docs` и `read_doc`. Для поиска возьмём простую реализацию через `grep`-style проход — для тысяч файлов хватит, под бóльшие объёмы потом подменишь на индекс.

```typescript
// src/index.ts (полная версия)
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFile } from "node:fs/promises";
import { glob } from "node:fs/promises";
import { resolve, relative } from "node:path";

const DOCS_DIR = resolve(process.env.DOCS_DIR ?? "./docs");

const server = new Server(
  { name: "docs-search", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "search_docs",
      description:
        "Ищет по содержимому всех .md файлов в DOCS_DIR. Возвращает совпадения с фрагментом контекста.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Поисковая фраза" },
          limit: { type: "number", default: 5, description: "Макс число результатов" },
        },
        required: ["query"],
      },
    },
    {
      name: "read_doc",
      description: "Читает файл из DOCS_DIR по относительному пути.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Относительный путь к .md" },
        },
        required: ["path"],
      },
    },
  ],
}));

async function searchDocs(query: string, limit = 5) {
  const q = query.toLowerCase();
  const results: Array<{ path: string; snippet: string }> = [];

  for await (const file of glob("**/*.md", { cwd: DOCS_DIR })) {
    const full = resolve(DOCS_DIR, file);
    const text = await readFile(full, "utf8");
    const lower = text.toLowerCase();
    const idx = lower.indexOf(q);
    if (idx === -1) continue;

    const start = Math.max(0, idx - 80);
    const end = Math.min(text.length, idx + q.length + 80);
    results.push({
      path: relative(DOCS_DIR, full),
      snippet: text.slice(start, end).replace(/\s+/g, " ").trim(),
    });
    if (results.length >= limit) break;
  }
  return results;
}

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  if (name === "search_docs") {
    const { query, limit = 5 } = args as { query: string; limit?: number };
    const results = await searchDocs(query, limit);
    return {
      content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
    };
  }

  if (name === "read_doc") {
    const { path } = args as { path: string };
    const full = resolve(DOCS_DIR, path);
    if (!full.startsWith(DOCS_DIR)) throw new Error("Path traversal blocked");
    const text = await readFile(full, "utf8");
    return { content: [{ type: "text", text }] };
  }

  throw new Error(`Unknown tool: ${name}`);
});

await server.connect(new StdioServerTransport());
```

<div class="warn-block">
<span class="tip-icon">⚠️</span>
<p>Проверка <code>full.startsWith(DOCS_DIR)</code> — критична. Без неё <code>read_doc</code> с <code>path: "../../etc/passwd"</code> прочитает что угодно. MCP-сервер запускается с правами твоего пользователя.</p>
</div>

## Шаг 4. Подключение к Claude Code

Скомпилируй: `npm run build`. Получишь `dist/index.js`. Зарегистрируй в `.mcp.json` проекта (как и любой сервер из [обзора MCP](/ai/claude-code-mcp/), он станет доступен всей команде; базовая настройка Claude Code — [здесь](/ai/claude-code-setup/)):

```json
{
  "mcpServers": {
    "docs-search": {
      "command": "node",
      "args": ["./mcp-docs-search/dist/index.js"],
      "env": {
        "DOCS_DIR": "./docs"
      }
    }
  }
}
```

Перезапусти Claude Code — внутри сессии набери `/mcp` и убедись, что `docs-search` показывает 2 инструмента.

Теперь работают запросы вроде:

```
Найди в наших доках всё про деплой через staging и собери чеклист
```

Claude вызовет `search_docs("деплой staging")` → возьмёт топ-5 файлов → при необходимости дочитает целиком через `read_doc`.

## Шаг 5. Отладка через MCP Inspector

Запускать Claude Code на каждый чих — медленно. Для итерации есть Inspector — UI, который показывает запросы/ответы сервера в реальном времени:

```bash
npx @modelcontextprotocol/inspector node ./dist/index.js
```

Откроется браузер. Слева список tools, справа — форма для запуска и raw JSON ответа. Видно полный фрейм MCP-протокола, ошибки, тайминги.

<div class="tip-block">
<span class="tip-icon">💡</span>
<p>Inspector — стандарт де-факто для разработки MCP. Перед коммитом прогоняй через него все tools с edge-кейсами: пустой query, несуществующий path, очень большой результат.</p>
</div>

## Шаг 6. Логирование

`stdout` зарезервирован под протокол — твои `console.log` сломают парсер на стороне Claude. Логи пиши в `stderr` или файл:

```typescript
function log(msg: string, data?: unknown) {
  process.stderr.write(`[docs-search] ${msg} ${data ? JSON.stringify(data) : ""}\n`);
}

log("server started", { docsDir: DOCS_DIR });
```

В Claude Code логи MCP-серверов видны через `claude mcp logs docs-search`.

## Шаг 7. Публикация для команды

Если сервер полезен не только тебе, опубликуй в npm:

```bash
# package.json
{
  "name": "@your-org/mcp-docs-search",
  "version": "0.1.0",
  "bin": { "mcp-docs-search": "./dist/index.js" }
}

npm publish --access=public
```

Теперь в `.mcp.json` твоей команды:

```json
{
  "mcpServers": {
    "docs-search": {
      "command": "npx",
      "args": ["-y", "@your-org/mcp-docs-search"],
      "env": { "DOCS_DIR": "./docs" }
    }
  }
}
```

Никто ничего не клонирует — `npx` подтянет пакет при первом запуске.

## Что ещё умеет MCP

Мы делали только **tools**, но протокол шире:

| Capability | Когда использовать |
|---|---|
| **Tools** | Действия с побочным эффектом (поиск, write, API call) |
| **Resources** | Read-only данные, которые модель может «прочитать» (файлы, БД-строки) |
| **Prompts** | Готовые шаблоны промптов с параметрами |
| **Sampling** | Сервер просит модель выполнить под-задачу |

Resources хорошо ложатся на «список открытых тикетов» или «список миграций» — ты выдаёшь URI, Claude сам решает когда подгрузить. Prompts удобны для шаблонов вроде «code review по нашим правилам» — но это часто перекрывается Skills.

## Итого

- Свой MCP оправдан, когда инструмент будет переиспользоваться
- Скелет на TypeScript: `@modelcontextprotocol/sdk` + `StdioServerTransport` + два хендлера
- Безопасность: всегда валидируй пути и не доверяй входным аргументам
- Логи — только в `stderr`, иначе сломаешь протокол
- Отладка — через `@modelcontextprotocol/inspector`
- Шаринг с командой — публикация в npm + `.mcp.json` через `npx`
- Tools покрывают 80% кейсов; resources/prompts — когда нужен read-only доступ или шаблоны

---
layout: post
title: "Claude Code: MCP — подключаем внешние инструменты"
categories: ai
translation_of: "/en/ai/claude-code-mcp/"
tldr:
  - "MCP (Model Context Protocol) даёт Claude Code доступ к внешним инструментам — БД, GitHub, браузер; сервер добавляется командой claude mcp add --transport stdio|http."
  - "Для команды серверы фиксируют в .mcp.json в корне репозитория (или claude mcp add --scope project); проверка — claude mcp list или /mcp внутри сессии."
  - "Актуальные серверы: GitHub — hosted HTTP (https://api.githubcopilot.com/mcp/), браузер — @playwright/mcp (puppeteer архивирован), плюс Postgres, SQLite, Sentry, Linear."
  - "Секреты не хардкодят в .mcp.json — только подстановка переменных вида ${GITHUB_TOKEN}; свой сервер пишется на @modelcontextprotocol/sdk (TypeScript или Python)."
date: 2026-03-02
last_modified_at: 2026-05-24
date_ru: "2 марта 2026"
read_time: 8
difficulty: intermediate
series: "Claude Code: полный гайд"
part: 4
description: "Что такое MCP (Model Context Protocol), как подключить серверы к Claude Code и какие MCP полезны при разработке."
excerpt_text: "MCP расширяет возможности Claude Code: базы данных, GitHub, браузер, файловая система и не только"
keywords: "MCP claude code, model context protocol, mcp сервер, claude code расширения, mcp разработка"
faq:
  - q: "MCP и Skills — в чём разница?"
    a: "Skills — это Markdown-промпт + (опционально) скрипт, выполняется самим Claude Code. MCP — внешний процесс по протоколу JSON-RPC, который даёт Claude дополнительные tools/resources. Skills проще для команд-помощников, MCP — для интеграции с внешними системами (БД, API, браузер)."
  - q: "Можно ли подключать MCP-серверы публикуемые сторонними людьми?"
    a: "Технически да, фактически — осторожно. MCP-сервер запускается с твоими правами и видит всё, что ты ему передаёшь (включая код). Подключай только серверы из официального реестра или от проверенных авторов. Обязательно читай permissions, которые сервер требует."
  - q: "Куда писать секреты для MCP-сервера — в .mcp.json?"
    a: "Никогда не хардкодь токены прямо в .mcp.json — этот файл коммитится. Используй подстановку через переменные окружения: \"env\": { \"GITHUB_TOKEN\": \"${GITHUB_TOKEN}\" }, а сам токен держи в .env (gitignored) или в системных переменных."
  - q: "Как проверить что MCP-сервер реально подключился?"
    a: "Внутри сессии — команда /mcp покажет список подключённых серверов и их инструменты. Из терминала — claude mcp list (статус) и claude mcp logs <name> (если что-то не работает)."
  - q: "Можно ли использовать один и тот же MCP-сервер в разных проектах?"
    a: "Да. Глобальные серверы в ~/.claude.json применяются ко всем проектам. Локальные .mcp.json — только к конкретному. Для команды лучше .mcp.json в репо — все получают одинаковую конфигурацию автоматически."
---

## Что такое MCP

**MCP (Model Context Protocol)** — открытый протокол, который позволяет подключать внешние инструменты к Claude. Вместо того чтобы Claude знал только о файлах в твоём проекте, MCP-серверы дают ему доступ к базам данных, GitHub, браузеру, Jira, Slack и многому другому.

Архитектура простая:

```
Claude Code ←→ MCP-клиент ←→ MCP-сервер ←→ Внешний сервис
```

## Как подключить MCP-сервер

### Через CLI (быстро)

```bash
# Локальный (stdio) сервер: опции идут ДО имени, команда отделяется `--`
claude mcp add --transport stdio <название> -- npx -y <пакет> [аргументы]

# Удалённый (HTTP) сервер:
claude mcp add --transport http <название> <url>

# Примеры:
claude mcp add --transport stdio filesystem -- npx -y @modelcontextprotocol/server-filesystem /path/to/dir
claude mcp add --transport http github https://api.githubcopilot.com/mcp/ --header "Authorization: Bearer ${GITHUB_TOKEN}"
```

По умолчанию сервер ставится в scope `local` (только ты, только этот проект). Добавь `--scope project`, чтобы записать его в `.mcp.json` и расшарить на команду.

### Через .mcp.json (рекомендуется для команды)

Создай `.mcp.json` в корне проекта:

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": {
        "Authorization": "Bearer ${GITHUB_TOKEN}"
      }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "${DATABASE_URL}"
      }
    }
  }
}
```

Этот файл коммитится в репозиторий — все в команде получают одинаковые инструменты.

## Полезные MCP для разработки

### GitHub MCP

```bash
# GitHub теперь hosted HTTP-сервер (старый npm-пакет @modelcontextprotocol/server-github устарел)
claude mcp add --transport http github https://api.githubcopilot.com/mcp/ --header "Authorization: Bearer ${GITHUB_TOKEN}"
```

Что умеет:
- Читать и создавать Issues и Pull Requests
- Просматривать код в репозитории
- Управлять ветками и коммитами
- Искать по коду на GitHub

Пример использования:
```
"Посмотри на открытые баги с лейблом 'critical' и предложи план исправлений"
"Создай PR с описанием для текущей ветки"
```

### PostgreSQL / SQLite MCP

```bash
# PostgreSQL
claude mcp add --transport stdio postgres -- npx -y @modelcontextprotocol/server-postgres

# SQLite
claude mcp add --transport stdio sqlite -- npx -y @modelcontextprotocol/server-sqlite --db-path ./db.sqlite
```

Что умеет:
- Просматривать схему БД
- Выполнять SQL-запросы
- Анализировать данные

Пример:
```
"Покажи таблицы с самым большим количеством строк"
"Найди N+1 проблемы в этом коде, зная структуру БД"
```

### Filesystem MCP

```bash
claude mcp add --transport stdio filesystem -- npx -y @modelcontextprotocol/server-filesystem /home/user/projects
```

Расширенный доступ к файлам за пределами рабочей директории — например, к общим конфигам или другим проектам.

### Playwright MCP (браузер)

```bash
# Playwright — актуальный браузерный сервер (reference-сервер puppeteer архивирован)
claude mcp add --transport stdio playwright -- npx -y @playwright/mcp
```

Что умеет:
- Открывать страницы в браузере
- Делать скриншоты
- Взаимодействовать с UI (клики, ввод)
- Тестировать веб-приложения

Пример:
```
"Зайди на localhost:3000 и проверь что форма регистрации работает"
"Сделай скриншот страницы и найди визуальные баги"
```

### Brave Search MCP

```bash
claude mcp add --transport stdio brave-search -- npx -y @modelcontextprotocol/server-brave-search
# Нужен BRAVE_API_KEY
```

Поиск в интернете прямо из сессии — полезно когда нужно найти актуальную документацию или решение ошибки.

### Sentry MCP

```bash
# Sentry — hosted HTTP-сервер
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp
```

Доступ к ошибкам из Sentry:
```
"Покажи последние 10 ошибок в production и предложи исправления"
```

### Linear MCP

```bash
claude mcp add --transport stdio linear -- npx -y linear-mcp-server
```

Работа с задачами в Linear:
```
"Создай задачу на основе этого бага"
"Какие задачи в спринте ещё не взяты?"
```

## Проверка подключённых серверов

```bash
# Список всех серверов
claude mcp list

# Детали конкретного сервера
claude mcp get github

# Удалить сервер
claude mcp remove github
```

Внутри сессии можно проверить доступные инструменты через `/mcp`.

## Безопасность

MCP-серверы получают доступ к твоим данным — подключай только проверенные серверы.

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "${DATABASE_URL}"
      }
    }
  }
}
```

Никогда не хардкоди credentials в `.mcp.json` — используй переменные окружения. Сам файл можно коммитить, секреты — нет.

## Свой MCP-сервер

Если нужен доступ к внутренней системе, можно написать свой сервер — MCP SDK доступен на TypeScript и Python:

```bash
npm install @modelcontextprotocol/sdk
```

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({ name: "my-server", version: "1.0.0" }, {
  capabilities: { tools: {} }
});

server.setRequestHandler("tools/list", async () => ({
  tools: [{
    name: "get_deploys",
    description: "Получить последние деплои из внутренней системы",
    inputSchema: { type: "object", properties: {} }
  }]
}));

server.setRequestHandler("tools/call", async (req) => {
  if (req.params.name === "get_deploys") {
    // обращение к внутреннему API
    return { content: [{ type: "text", text: JSON.stringify(deploys) }] };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

## Итого

- MCP расширяет Claude Code внешними инструментами: БД, GitHub, браузер, поиск
- `.mcp.json` в корне проекта — удобный способ зафиксировать серверы для команды
- Самые полезные для разработки: GitHub, PostgreSQL, Playwright, Brave Search
- Секреты — только через переменные окружения, не в конфиг
- Можно написать свой MCP-сервер для любого внутреннего сервиса

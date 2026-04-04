---
layout: post
title: "Claude Code: MCP — подключаем внешние инструменты"
categories: tools
date: 2026-03-02
date_ru: "2 марта 2026"
read_time: 8
difficulty: intermediate
series: "Claude Code: полный гайд"
part: 4
description: "Что такое MCP (Model Context Protocol), как подключить серверы к Claude Code и какие MCP полезны при разработке."
excerpt_text: "MCP расширяет возможности Claude Code: базы данных, GitHub, браузер, файловая система и не только"
keywords: "MCP claude code, model context protocol, mcp сервер, claude code расширения, mcp разработка"
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
# Добавить сервер в конфиг проекта
claude mcp add <название> <команда>

# Примеры:
claude mcp add filesystem npx -y @modelcontextprotocol/server-filesystem /path/to/dir
claude mcp add github npx -y @modelcontextprotocol/server-github
```

### Через .mcp.json (рекомендуется для команды)

Создай `.mcp.json` в корне проекта:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
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
claude mcp add github npx -y @modelcontextprotocol/server-github
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
claude mcp add postgres npx -y @modelcontextprotocol/server-postgres

# SQLite
claude mcp add sqlite npx -y @modelcontextprotocol/server-sqlite --db-path ./db.sqlite
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
claude mcp add filesystem npx -y @modelcontextprotocol/server-filesystem /home/user/projects
```

Расширенный доступ к файлам за пределами рабочей директории — например, к общим конфигам или другим проектам.

### Puppeteer / Playwright MCP

```bash
# Puppeteer
claude mcp add puppeteer npx -y @modelcontextprotocol/server-puppeteer

# Playwright (более мощный)
claude mcp add playwright npx -y @playwright/mcp
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
claude mcp add brave-search npx -y @modelcontextprotocol/server-brave-search
# Нужен BRAVE_API_KEY
```

Поиск в интернете прямо из сессии — полезно когда нужно найти актуальную документацию или решение ошибки.

### Sentry MCP

```bash
claude mcp add sentry npx -y @modelcontextprotocol/server-sentry
```

Доступ к ошибкам из Sentry:
```
"Покажи последние 10 ошибок в production и предложи исправления"
```

### Linear MCP

```bash
claude mcp add linear npx -y linear-mcp-server
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

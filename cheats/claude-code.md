---
layout: default
lang: ru
title: "Claude Code: шпаргалка"
permalink: /cheats/claude-code/
description: "Все команды, флаги, файлы, slash-команды, SKILL.md frontmatter, MCP-настройка, hooks-события — одной страницей. Готовая закладка."
keywords: "claude code, шпаргалка, cheat sheet, slash команды, SKILL.md, MCP, hooks, .claude/settings.json"
og_image: /assets/og-ai.png
translation_of: /en/cheats/claude-code/
---

<article class="article-body" markdown="1" style="max-width:820px; margin:calc(var(--nav-height) + 56px) auto 100px; padding:0 24px;">

# Claude Code: шпаргалка

Все команды, флаги, файлы и конфиги одной страницей. Сделай закладку — пригодится.

## Установка

```bash
# macOS / Linux / WSL
curl -fsSL https://claude.ai/install.sh | bash

# Windows PowerShell
irm https://claude.ai/install.ps1 | iex

# macOS — Homebrew
brew install --cask claude-code

# Windows — WinGet
winget install Anthropic.ClaudeCode
```

> Старый `npm install -g @anthropic/claude-code` устарел.

## CLI-флаги

| Команда | Что делает |
|---|---|
| `claude` | Интерактивная сессия |
| `claude -p "..."` | Один запрос → выйти |
| `claude --continue` | Продолжить последнюю сессию |
| `claude --resume` | Выбрать сессию из истории |
| `claude --bare -p "..."` | Минимальный режим: без hooks/skills/MCP/CLAUDE.md — для скриптов |
| `claude --dangerously-skip-permissions` | Авторежим без подтверждений (осторожно) |
| `claude --version` | Версия |
| `claude --help` | Полный список флагов |

## Slash-команды (в сессии)

| Команда | Что делает |
|---|---|
| `/help` | Все команды |
| `/clear` | Сбросить контекст |
| `/compact` | Сжать историю |
| `/memory` | Управлять CLAUDE.md |
| `/recap` | Резюме сессии |
| `/rewind` | Откат к чекпойнту |
| `/init` | Сгенерировать CLAUDE.md |
| `/agents` | Управлять субагентами |
| `/mcp` | Подключённые MCP-серверы |
| `/plugin` | Установка плагинов и маркетплейсы |
| `/usage` | Статистика по токенам |
| `/doctor` | Диагностика установки |

## Bundled skills

| Skill | Что делает |
|---|---|
| `/code-review` | Ревью изменений на баги и качество |
| `/security-review` | Поиск уязвимостей |
| `/verify` | Запустить приложение и проверить правку |
| `/run` | Запустить приложение проекта |
| `/debug` | Отладка вместе с агентом |
| `/loop` | Повторять задачу по расписанию (`/loop 5m /check`) |
| `/batch` | Параллельные правки в большой кодовой базе |
| `/claude-api` | Помощь по Claude/Anthropic API |

## Горячие клавиши

| Сочетание | Действие |
|---|---|
| `Ctrl+C` | Прервать операцию |
| `Ctrl+D` | Выйти |
| `Esc` | Прервать ответ модели |

## Файлы и папки

```text
project/
├── CLAUDE.md                       # контекст проекта (стек, команды, правила)
├── .claude/
│   ├── settings.json               # permissions, hooks (проектные)
│   ├── settings.local.json         # личные настройки (gitignore)
│   ├── skills/<name>/SKILL.md      # свои /команды
│   ├── commands/<name>.md          # старый формат skill (обратная совместимость)
│   └── agents/<name>.md            # свои субагенты
├── .mcp.json                       # MCP-серверы (project scope)
└── .env                            # секреты для MCP (gitignore)

~/.claude/
├── settings.json                   # глобальные настройки
├── skills/<name>/SKILL.md          # глобальные skills
├── agents/<name>.md                # глобальные субагенты
└── .claude.json                    # MCP local/user scope
```

## CLAUDE.md — минимум

```markdown
# Проект

Краткое описание (1-2 строки)

## Стек
- Next.js 15, TypeScript, Prisma, Tailwind

## Команды
- `npm run dev` — dev-сервер
- `npm run test` — тесты
- `npm run lint` — линтер

## Правила
- Без `any` в TS
- Conventional Commits
- Не трогать `src/generated/`
```

## .claude/settings.json — permissions

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(git diff *)",
      "Bash(git status)"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(git push *)",
      "WebFetch(*)"
    ]
  }
}
```

**Шаблон правила:** `Tool(спецификатор)` — `Bash(npm run *)`, `Read(./.env)`, `Edit(./src/**)`, `WebFetch(domain:example.com)`, `Skill(my-skill)`. `deny` побеждает `allow`.

## SKILL.md — frontmatter

```yaml
---
name: review
description: Код-ревью изменений по стандартам проекта   # ≤1024 симв., решает модель
allowed-tools: Read, Bash                                # ограничить инструменты
argument-hint: "[путь или пусто]"                         # подсказка для $ARGUMENTS
effort: medium                                            # low / medium / high / xhigh / max
context: fork                                             # запустить в субагенте
user-invocable: true                                      # доступен через /имя
disable-model-invocation: false                           # авто-вызов моделью разрешён
model: opus                                               # модель для skill
agent: Explore                                            # тип субагента (если context: fork)
paths: ["src/**/*.ts"]                                    # активация по путям
shell: bash                                               # bash / powershell
when_to_use: "когда меняешь TS-файлы"                     # подсказка модели
hooks: { ... }                                            # скилл-локальные хуки
---

Тело — инструкция агенту обычным Markdown.
$ARGUMENTS — подставляется из вызова /name <args>
```

## Subagent — `.claude/agents/<name>.md`

```yaml
---
name: security-reviewer
description: Аудит на уязвимости — injection, утечки, небезопасные зависимости
model: opus
tools: Read, Grep, Bash
---

Проверь изменения на уязвимости. Верни список с файлом и строкой.
```

Вызов — вручную через `/agents` или авто-делегирование по `description`.

## MCP — `claude mcp add`

```bash
# Локальный (stdio) — опции ДО имени, команда отделяется `--`
claude mcp add --transport stdio <name> -- npx -y <пакет> [args]

# Удалённый (HTTP)
claude mcp add --transport http <name> <url>

# Scope: local (default), project (→ .mcp.json), user (общий)
claude mcp add --scope project --transport stdio postgres -- npx -y @modelcontextprotocol/server-postgres

# Авторизация для HTTP
claude mcp add --transport http github https://api.githubcopilot.com/mcp/ \
  --header "Authorization: Bearer ${GITHUB_TOKEN}"
```

```bash
claude mcp list             # все серверы
claude mcp get <name>       # детали
claude mcp remove <name>    # удалить
claude mcp logs <name>      # логи (если не работает)
```

В сессии: `/mcp` — список доступных инструментов.

## .mcp.json — пример

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": { "Authorization": "Bearer ${GITHUB_TOKEN}" }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": { "POSTGRES_CONNECTION_STRING": "${DATABASE_URL}" }
    }
  }
}
```

## Hooks — события

В `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit|Write",
      "hooks": [{ "type": "command", "command": "npm run lint -- --fix" }]
    }]
  }
}
```

| Событие | Когда срабатывает |
|---|---|
| `SessionStart` | Старт сессии |
| `UserPromptSubmit` | Промпт от пользователя |
| `PreToolUse` | Перед вызовом инструмента |
| `PostToolUse` | После успешного вызова |
| `PostToolUseFailure` | После ошибки инструмента |
| `PermissionRequest` | Запрос разрешения |
| `Notification` | Уведомление |
| `Stop` | Агент завершил работу |
| `SubagentStart` / `SubagentStop` | Жизненный цикл субагента |
| `PreCompact` / `PostCompact` | До/после сжатия контекста |

## Плагины и маркетплейсы

```bash
# Подключить маркетплейс
/plugin marketplace add owner/repo

# Установить плагин
/plugin install <имя>@<маркетплейс>
```

Скиллы из плагина вызываются с префиксом: `/имя-плагина:имя-скилла`. Официальный маркетплейс `claude-plugins-official` доступен сразу.

## SDK для своих воркфлоу

```bash
# TypeScript / JS
npm install @anthropic-ai/claude-agent-sdk

# Python
pip install claude-agent-sdk
```

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

const result = await query({
  prompt: "Найди все TODO",
  options: { maxTurns: 10, cwd: "/path/to/project" },
});
for await (const m of result) console.log(m);
```

## Глубже в темы

- [Установка и базовая настройка](/ai/claude-code-setup/)
- [Skills — свои /команды](/ai/claude-code-skills/)
- [Agents и SDK](/ai/claude-code-agents/)
- [MCP — внешние инструменты](/ai/claude-code-mcp/)
- [Свой MCP-сервер с нуля](/ai/claude-code-mcp-build/)

</article>

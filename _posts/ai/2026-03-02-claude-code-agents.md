---
layout: post
title: "Claude Code: Agents — параллельные субагенты и SDK"
categories: ai
translation_of: "/en/ai/claude-code-agents/"
tldr:
  - "Субагенты — независимые экземпляры Claude с изолированным контекстом; работают параллельно и могут использовать отдельные git worktree, не мешая основной ветке."
  - "Свой субагент описывается файлом .claude/agents/<имя>.md с frontmatter (name, description, model, tools); глобальные агенты кладут в ~/.claude/agents/."
  - "Claude Agent SDK встраивает агентов в свои скрипты: npm install @anthropic-ai/claude-agent-sdk или pip install claude-agent-sdk, функция query() с maxTurns и cwd."
  - "Hooks в .claude/settings.json запускают shell-команды на события (PostToolUse, Stop, SubagentStop); permissions с allow/deny блокируют опасное вроде git push и rm."
date: 2026-03-02
last_modified_at: 2026-05-24
date_ru: "2 марта 2026"
read_time: 7
difficulty: advanced
series: "Claude Code: полный гайд"
part: 3
description: "Как Claude Code запускает субагентов для параллельных задач, что такое Claude Agent SDK и как строить свои AI-воркфлоу."
excerpt_text: "Субагенты для параллельных задач, Claude Agent SDK и как строить собственные AI-воркфлоу"
keywords: "claude code agents, субагенты claude, claude agent sdk, AI агенты, claude code параллельные задачи"
faq:
  - q: "Когда использовать subagent vs main session?"
    a: "Subagent — для тяжёлых независимых задач (review, поиск по большому коду, миграции отдельных модулей) и для защиты main context от шума. Main session — когда нужно держать диалог и контекст подгружается итеративно. Правило: если задача \"иди сделай и принеси результат\" — subagent."
  - q: "Сколько subagents можно запустить параллельно?"
    a: "Технически — много (15+). Практически — оптимум 3-5: больше начинает упираться в rate-limits API и сложнее отслеживать. При запуске агентов одним сообщением они работают параллельно. Очень тяжёлые лучше последовательно с background mode."
  - q: "Subagent видит контекст main session?"
    a: "Нет, у каждого свой контекст. Получает только prompt от тебя при запуске. Поэтому prompt должен быть самодостаточный: что искать, где (пути), формат вывода. Главное правило: пиши brief как для нового коллеги — он не видел диалог."
  - q: "Как передать результат от subagent в основную работу?"
    a: "Subagent возвращает текстовый result. Main agent видит его в tool_result. Дальше — обычно человек резюмирует результат и встраивает в дальнейшую логику. Можно сделать chain: result subagent A → prompt subagent B, но это запускается ручным шагом."
---

## Агенты в Claude Code

Claude Code может запускать **субагентов** — отдельные экземпляры Claude, которые работают параллельно над независимыми задачами. Это полезно когда работа разбивается на несколько потоков: пока один агент пишет тесты, другой правит документацию. (Если ты ещё не настроил Claude Code — [начни отсюда](/ai/claude-code-setup/).)

## Как это работает

Когда ты просишь Claude выполнить большую задачу, он может сам решить запустить субагентов:

```
Ты: "Порефактори весь модуль auth — перепиши на TypeScript,
      добавь тесты и обнови README"

Claude: [запускает 3 агента параллельно]
  → Агент 1: конвертация .js → .ts
  → Агент 2: написание тестов
  → Агент 3: обновление документации
```

Каждый субагент получает свой контекст и инструменты, работает независимо, результаты собираются обратно.

## Изоляция через git worktree

Субагенты могут работать в изолированных git worktree — временных копиях репозитория. Агент делает изменения в своей ветке, не мешая основной работе:

```
main worktree: /project          ← основная работа
worktree 1:    /project-agent-1  ← агент пишет тесты
worktree 2:    /project-agent-2  ← агент делает рефакторинг
```

После завершения изменения вмёрживаются или предлагаются как PR.

## Свои субагенты — .claude/agents/

Кроме авто-запуска, можно описать собственного именованного субагента — файл `.claude/agents/<имя>.md` с frontmatter (формат похож на [Skills](/ai/claude-code-skills/)):

```markdown
---
name: security-reviewer
description: Аудит изменений на уязвимости — injection, утечки, небезопасные зависимости
model: opus
tools: Read, Grep, Bash
---

Проверь изменения на уязвимости: SQL/command injection, утечки секретов,
небезопасные зависимости. Верни список находок с файлом и строкой.
```

Вызвать можно вручную через `/agents` либо дать Claude делегировать задачу самому — по `description`. Глобальные агенты (для всех проектов) кладут в `~/.claude/agents/`.

## Claude Agent SDK

Для тех, кто хочет строить свои AI-воркфлоу программно, есть **Claude Agent SDK**. Он позволяет использовать Claude Code как движок внутри своих скриптов.

### Установка

```bash
# TypeScript / JavaScript
npm install @anthropic-ai/claude-agent-sdk

# Python
pip install claude-agent-sdk
```

> ⚠️ Старый пакет `@anthropic/claude-code` — устарел. Используй `@anthropic-ai/claude-agent-sdk`.

### Простой пример (TypeScript)

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

const result = await query({
  prompt: "Найди все TODO-комментарии в проекте и создай список задач",
  options: {
    maxTurns: 10,
    cwd: "/path/to/project",
  },
});

for await (const message of result) {
  console.log(message);
}
```

### Пример с кастомными инструментами

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

const result = await query({
  prompt: "Проанализируй производительность и предложи улучшения",
  options: {
    tools: [
      {
        name: "run_profiler",
        description: "Запускает профайлер на указанном файле",
        inputSchema: {
          type: "object",
          properties: {
            file: { type: "string" }
          }
        },
        handler: async ({ file }) => {
          // твоя логика профилирования
          return { result: "..." };
        }
      }
    ]
  }
});
```

### Пример на Python

```python
import claude_agent_sdk

async def main():
    async for message in claude_agent_sdk.query(
        prompt="Проверь тесты и исправь падающие",
        options={"cwd": "/path/to/project", "max_turns": 20}
    ):
        print(message)
```

## Практические сценарии с агентами

### Параллельный code review

```
Ты: "Сделай ревью PR #42: проверь безопасность,
      производительность и соответствие code style"

→ Агент безопасности: ищет уязвимости, injection, утечки данных
→ Агент производительности: смотрит на алгоритмы, запросы к БД
→ Агент code style: проверяет соглашения, именование, структуру
```

### Миграция кодовой базы

```
Ты: "Мигрируй проект с React 17 на React 19"

→ Агент 1: обновляет package.json и зависимости
→ Агент 2: исправляет deprecated API в компонентах
→ Агент 3: обновляет тесты
→ Агент 4: проверяет совместимость сторонних библиотек
```

## Hooks — перехваты событий

Hooks позволяют запускать shell-команды в ответ на события агента. Настраиваются в `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "npm run lint -- --fix"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "notify-send 'Claude Code' 'Задача выполнена'"
          }
        ]
      }
    ]
  }
}
```

Доступные события:

| Событие | Когда срабатывает |
|---------|-----------------|
| `SessionStart` | При старте сессии (до первого промпта) |
| `UserPromptSubmit` | При отправке промпта пользователем |
| `PreToolUse` | До вызова инструмента |
| `PostToolUse` | После успешного вызова инструмента |
| `PostToolUseFailure` | После ошибки инструмента |
| `PermissionRequest` | При запросе разрешения |
| `Notification` | При уведомлении агента |
| `Stop` | Когда агент завершил работу |
| `SubagentStart` | Когда субагент стартовал |
| `SubagentStop` | Когда субагент завершил работу |
| `PreCompact` | До сжатия контекста |
| `PostCompact` | После сжатия контекста |

## Ограничения агентов

Чтобы субагенты не натворили лишнего, настрой разрешения:

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run test)",
      "Bash(npm run lint)",
      "Bash(git diff *)",
      "Bash(git status)"
    ],
    "deny": [
      "Bash(git push *)",
      "Bash(rm *)",
      "WebFetch(*)"
    ]
  }
}
```

## Итого

- Субагенты работают параллельно над независимыми частями задачи
- Изоляция через git worktree — изменения не мешают основной ветке
- Claude Agent SDK — для встраивания агентов в свои скрипты и воркфлоу
- Hooks — для автоматических действий при событиях (линтер после редактирования, уведомление при завершении)
- Всегда ограничивай разрешения через `permissions` — особенно для push и удаления

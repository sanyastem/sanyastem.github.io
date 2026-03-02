---
layout: post
title: "Claude Code: установка и базовая настройка"
categories: tools
date: 2026-03-02
date_ru: "2 марта 2026"
read_time: 6
difficulty: beginner
series: "Claude Code: полный гайд"
part: 1
description: "Устанавливаем Claude Code, разбираемся с CLAUDE.md, настройками и первыми командами. Стартовый гайд для разработчиков."
excerpt_text: "Устанавливаем Claude Code, настраиваем CLAUDE.md и запускаем первые команды в терминале"
keywords: "claude code, установка claude code, claude code настройка, CLAUDE.md, Anthropic CLI"
---

## Что такое Claude Code

Claude Code — это CLI-инструмент от Anthropic, который запускает Claude прямо в твоём терминале. Он видит файлы проекта, запускает команды, читает код и вносит изменения. Это не чат с копипастой — агент работает в контексте твоего репозитория.

## Установка

Нужен Node.js 18+.

```bash
npm install -g @anthropic/claude-code
```

Проверь:

```bash
claude --version
```

Авторизация через браузер при первом запуске — просто введи:

```bash
claude
```

## Первые команды

```bash
# Запуск в текущей папке
claude

# Спринт-режим: выполнить задачу без диалога
claude -p "добавь ESLint в проект"

# Продолжить прерванную сессию
claude --continue
```

## CLAUDE.md — инструкция для агента

`CLAUDE.md` — это файл в корне проекта, который Claude читает при каждом запуске. Сюда пишут контекст проекта, правила, команды.

```markdown
# Проект

E-commerce на Next.js + PostgreSQL.

## Стек

- Next.js 15 (App Router)
- TypeScript (strict: true)
- Prisma ORM
- Tailwind CSS

## Команды

- `npm run dev` — запуск dev-сервера
- `npm run test` — тесты (Vitest)
- `npm run lint` — линтер

## Правила

- Пиши на TypeScript, не используй `any`
- Компоненты — в `src/components/`, один файл = один компонент
- Коммиты в стиле Conventional Commits
- Не трогай файлы в `src/generated/`
```

Чем точнее `CLAUDE.md`, тем меньше нужно объяснять в каждой сессии.

## Настройки (.claude/settings.json)

Файл `.claude/settings.json` в корне проекта управляет разрешениями:

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(git *)",
      "Bash(npx *)"
    ],
    "deny": [
      "Bash(rm -rf *)"
    ]
  }
}
```

Глобальные настройки хранятся в `~/.claude/settings.json` — применяются ко всем проектам.

## Режимы работы

| Режим | Команда | Что делает |
|-------|---------|------------|
| Диалог | `claude` | Интерактивный чат с агентом |
| Авторежим | `claude --dangerously-skip-permissions` | Без подтверждений (осторожно) |
| Один запрос | `claude -p "задача"` | Выполнить и выйти |
| Продолжить | `claude --continue` | Возобновить последнюю сессию |

## Полезные горячие клавиши в сессии

| Комбинация | Действие |
|------------|---------|
| `Ctrl+C` | Прервать текущую операцию |
| `Ctrl+D` | Выйти из Claude Code |
| `/help` | Список всех команд |
| `/clear` | Очистить контекст сессии |
| `/compact` | Сжать историю для экономии токенов |

## Итого

- Установка: `npm install -g @anthropic/claude-code`
- Настрой `CLAUDE.md` с описанием проекта и командами
- Ограничь разрешения через `.claude/settings.json`
- Используй `/help` внутри сессии — там много полезного

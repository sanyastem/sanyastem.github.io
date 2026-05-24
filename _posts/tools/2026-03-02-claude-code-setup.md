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
howto:
  name: "Установка и первая настройка Claude Code"
  totalTime: "PT15M"
  steps:
    - name: "Установить Claude Code"
      text: "Нативный установщик: curl -fsSL https://claude.ai/install.sh | bash (macOS/Linux/WSL) или irm https://claude.ai/install.ps1 | iex (Windows). Node.js не требуется."
    - name: "Авторизоваться"
      text: "Запустить команду claude в терминале — откроется браузер для логина в Anthropic-аккаунт."
    - name: "Создать CLAUDE.md в проекте"
      text: "В корне проекта создать файл CLAUDE.md с описанием стека, соглашений, команд для билда/тестов. Этот файл агент читает при каждом запуске."
    - name: "Запустить первую сессию"
      text: "claude в папке проекта → описать задачу обычным языком. Агент проанализирует код и предложит план."
faq:
  - q: "Нужен ли API ключ Anthropic?"
    a: "Нет, если работаешь через подписку Claude (Pro $20/мес или Max). API ключ нужен только если хочешь биллинг по токенам через API (плата за реальное использование, без лимитов). Для большинства задач Pro-подписки достаточно."
  - q: "Сколько стоит Claude Code?"
    a: "Сам Claude Code бесплатный. Платишь только за модель: подписка Pro $20/мес — 5х лимиты vs free; Max $100-200/мес — больше токенов и доступ к Opus. Через API — pay-as-you-go, разработчику в среднем $10-50/мес."
  - q: "Работает ли Claude Code на Windows?"
    a: "Да. Нативно через установщик irm https://claude.ai/install.ps1 | iex или winget install Anthropic.ClaudeCode. Также работает в WSL2 (Ubuntu) — там используй curl -fsSL https://claude.ai/install.sh | bash."
  - q: "Что писать в CLAUDE.md?"
    a: "Контекст проекта в 1-2 страницы: технологии, команды (build/test/lint), архитектурные правила, стиль коммитов, путь к docs, что НЕ трогать. Цель — чтобы агент сразу понимал контекст без расспросов. Используй /init команду чтобы Claude сам сгенерировал черновик."
---

## Что такое Claude Code

Claude Code — это CLI-инструмент от Anthropic, который запускает Claude прямо в твоём терминале. Он видит файлы проекта, запускает команды, читает код и вносит изменения. Это не чат с копипастой — агент работает в контексте твоего репозитория.

## Установка

Нативный установщик (рекомендуется):

```bash
# macOS / Linux / WSL
curl -fsSL https://claude.ai/install.sh | bash

# Windows PowerShell
irm https://claude.ai/install.ps1 | iex

# macOS через Homebrew
brew install --cask claude-code

# Windows через WinGet
winget install Anthropic.ClaudeCode
```

> ⚠️ Старый способ `npm install -g @anthropic/claude-code` устарел и не рекомендуется с 2025 года.

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
| Headless | `claude --headless` | Без UI, управление через API (Dispatch) |

## Полезные горячие клавиши в сессии

| Комбинация | Действие |
|------------|---------|
| `Ctrl+C` | Прервать текущую операцию |
| `Ctrl+D` | Выйти из Claude Code |
| `/help` | Список всех команд |
| `/clear` | Очистить контекст сессии |
| `/compact` | Сжать историю для экономии токенов |
| `/memory` | Редактировать CLAUDE.md файлы памяти |
| `/doctor` | Диагностика установки |
| `/rewind` | Откатиться к предыдущему checkpoint |

## IDE и Web

Claude Code работает не только в терминале:
- **VS Code** — расширение с inline diff и планом изменений
- **JetBrains** — плагин для IntelliJ, PyCharm, WebStorm, Rider
- **claude.ai/code** — веб-версия с подключением GitHub репозиториев

## Итого

- Установка: `curl -fsSL https://claude.ai/install.sh | bash`
- Настрой `CLAUDE.md` с описанием проекта и командами
- Ограничь разрешения через `.claude/settings.json`
- Используй `/help` внутри сессии — там много полезного

---
layout: post
title: ".gitignore: что туда класть и почему"
categories: git
translation_of: "/en/git/gitignore/"
tldr:
  - "В .gitignore обязательно: node_modules и прочие зависимости, .env с секретами, артефакты сборки (dist/, build/, __pycache__/) и системные .DS_Store, Thumbs.db."
  - "Уже закоммиченный файл .gitignore не скроет — убери его из индекса через git rm --cached .env; если в .env были секреты, смени все скомпрометированные ключи."
  - "Системный мусор выноси в глобальный игнор: git config --global core.excludesfile ~/.gitignore_global — не придётся дублировать в каждом проекте."
  - "Готовый .gitignore под стек генерирует gitignore.io — вводишь «Node», «Python», «macOS» и получаешь полный файл."
faq:
  - q: "Что обязательно добавлять в .gitignore?"
    a: "Четыре категории: зависимости (node_modules, vendor, .venv — генерируются через npm install и весят сотни МБ), файлы окружения с секретами (.env, .env.local), артефакты сборки (dist/, build/, .next/, __pycache__/) и системные файлы (.DS_Store на macOS, Thumbs.db на Windows). Логи (*.log) и настройки редакторов (.idea/, .vscode/settings.json) тоже стоит исключить."
  - q: "Почему файл всё ещё в репозитории, хотя он добавлен в .gitignore?"
    a: ".gitignore влияет только на неотслеживаемые файлы — уже закоммиченный файл Git продолжит отслеживать. Убери его из индекса, оставив локально: git rm --cached .env или git rm -r --cached node_modules/, затем закоммить. Если в .env были секреты — этого мало: они остались в истории, нужно удалить файл из истории и сменить все скомпрометированные ключи."
  - q: "Что делать, если случайно закоммитил .env с секретами?"
    a: "Простое добавление в .gitignore не поможет — секреты уже в истории коммитов и в публичном репо их может прочитать кто угодно. Сначала смени все скомпрометированные пароли, API-ключи и токены, затем удали файл из индекса через git rm --cached .env и при необходимости вычисти его из истории репозитория."
  - q: "Как настроить глобальный .gitignore для всех проектов?"
    a: "Создай файл и зарегистрируй его: touch ~/.gitignore_global, затем git config --global core.excludesfile ~/.gitignore_global. Добавь туда системный и редакторский мусор — .DS_Store, .idea/ — и он будет игнорироваться во всех репозиториях без дублирования правил в каждом проекте."
  - q: "Где взять готовый шаблон .gitignore под свой стек?"
    a: "Сайт gitignore.io генерирует готовый файл по списку технологий: вводишь «Node», «Python», «macOS» — получаешь полный .gitignore. Альтернатива — официальная коллекция шаблонов GitHub, которую он же предлагает при создании репозитория."
date: 2025-01-25
date_ru: "25 января 2025"
read_time: 3
difficulty: beginner
series: "Git workflow: профессиональная работа"
part: 2
description: "node_modules, .env, .DS_Store — что никогда не должно попадать в репозиторий, как настроить .gitignore и глобальный gitignore."
excerpt_text: "node_modules, .env, .DS_Store — что никогда не должно попасть в репозиторий"
keywords: ".gitignore, git ignore, node_modules, .env, gitignore шаблоны"
---

## Что такое .gitignore

Файл `.gitignore` говорит Git какие файлы игнорировать — не отслеживать, не добавлять в коммиты. Создаётся в корне репозитория.

## Что обязательно игнорировать

**Зависимости** — `node_modules`, `vendor`, `.venv`. Генерируются автоматически через `npm install`, весят сотни МБ, у каждого разработчика свои.

**Файлы окружения** — `.env`. Здесь хранятся секреты: пароли, API-ключи, токены. Если закоммитишь — они попадут в публичный репо (как безопасно передавать их в контейнеры — в статье про [Docker Compose](/devops/docker-compose-advanced/)).

> ⚠️ Если ты уже закоммитил `.env` — простое добавление в .gitignore не поможет. Нужно удалить файл из истории и сменить все скомпрометированные ключи.

**Системные файлы** — `.DS_Store` (macOS), `Thumbs.db` (Windows).

**Артефакты сборки** — `dist/`, `build/`, `.next/`, `__pycache__/`.

Как организовать сами ветки и коммиты — в статье про [Git flow](/git/git-flow/).

## Типовой .gitignore для Node.js

```gitignore
# Зависимости
node_modules/

# Окружение
.env
.env.local
.env.*.local

# Сборка
dist/
build/
.next/

# Логи
*.log
npm-debug.log*

# Системные
.DS_Store
Thumbs.db

# Редакторы
.vscode/settings.json
.idea/
```

> 💡 Сайт **gitignore.io** генерирует готовый `.gitignore` по технологиям. Введи «Node», «Python», «macOS» — получишь полный файл.

## Глобальный .gitignore

Системный мусор лучше вынести в глобальный gitignore — не добавлять в каждый проект:

```bash
touch ~/.gitignore_global
git config --global core.excludesfile ~/.gitignore_global
echo ".DS_Store" >> ~/.gitignore_global
echo ".idea/" >> ~/.gitignore_global
```

## Если файл уже в репо

Добавление в `.gitignore` не удаляет уже отслеживаемый файл. Чтобы убрать из отслеживания, но оставить локально:

```bash
git rm -r --cached node_modules/
git rm --cached .env
git commit -m "remove tracked files from gitignore"
```

---
layout: post
title: ".gitignore: что туда класть и почему"
categories: git
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

**Файлы окружения** — `.env`. Здесь хранятся секреты: пароли, API-ключи, токены. Если закоммитишь — они попадут в публичный репо.

> ⚠️ Если ты уже закоммитил `.env` — простое добавление в .gitignore не поможет. Нужно удалить файл из истории и сменить все скомпрометированные ключи.

**Системные файлы** — `.DS_Store` (macOS), `Thumbs.db` (Windows).

**Артефакты сборки** — `dist/`, `build/`, `.next/`, `__pycache__/`.

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

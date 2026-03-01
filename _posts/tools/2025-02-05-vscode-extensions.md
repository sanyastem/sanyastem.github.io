---
layout: post
title: "VS Code: расширения которые я использую каждый день"
categories: tools
date: 2025-02-05
date_ru: "5 февраля 2025"
read_time: 3
description: "Prettier, GitLens, Error Lens, Path Intellisense, Thunder Client — что ставить в VS Code в первую очередь и как настроить."
excerpt_text: "Prettier, GitLens, Error Lens — что ставить в первую очередь"
keywords: "vs code расширения, vscode extensions, prettier, gitlens, error lens, настройка vs code"
---

## Prettier — форматирование кода

Автоматически форматирует код при сохранении. Никаких споров о стиле в команде.

После установки добавь в `settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

> 💡 Создай `.prettierrc` в корне проекта для кастомных настроек: ширина строки, одиночные/двойные кавычки, точка с запятой.

## GitLens — суперсилы для Git

Показывает прямо в коде кто, когда и зачем написал эту строку (blame-аннотации). Наводишь на строку — видишь последний коммит, автора и сообщение. Бесценно при разборе чужого кода.

## Error Lens — ошибки прямо в строке

Выводит ошибки и предупреждения рядом со строкой кода — не нужно смотреть в нижнюю панель. Экономит кучу времени.

## Path Intellisense — автодополнение путей

Автоматически дополняет пути к файлам при написании импортов. Незаменим в проектах с глубокой структурой папок.

## Thunder Client — REST-клиент прямо в VS Code

Лёгкая альтернатива Postman внутри редактора. Поддерживает коллекции, переменные среды, историю запросов.

## Auto Rename Tag

Переименовываешь открывающий HTML-тег — закрывающий меняется автоматически.

## Настройки которые стоит включить сразу

```json
{
  "editor.renderWhitespace": "boundary",
  "editor.fontFamily": "'Fira Code', monospace",
  "editor.fontLigatures": true,
  "files.autoSave": "onFocusChange",
  "editor.rulers": [80]
}
```

> 💡 Открыть `settings.json` быстро: `Ctrl+Shift+P` → «Open User Settings (JSON)».

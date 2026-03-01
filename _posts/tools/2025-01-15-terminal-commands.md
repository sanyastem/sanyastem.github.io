---
layout: post
title: "Терминал: команды которые экономят время"
categories: tools
date: 2025-01-15
date_ru: "15 января 2025"
read_time: 4
description: "alias, history, ctrl+r, && и || — базовые трюки терминала, которые должен знать каждый разработчик."
excerpt_text: "alias, history, ctrl+r и другие трюки которые должен знать каждый разработчик"
keywords: "терминал команды, bash команды, alias bash, история команд, unix команды"
---

## Ctrl+R — поиск по истории

Нажми `Ctrl+R` и начни вводить — терминал найдёт последнюю команду с таким текстом. Быстрее чем листать стрелкой вверх.

```bash
# Нажимаешь Ctrl+R, вводишь "docker"
(reverse-i-search)`docker': docker-compose up -d
# Enter — выполнить, стрелки — редактировать
```

## alias — короткие команды

Добавь в `~/.bashrc` или `~/.zshrc`:

```bash
# Git сокращения
alias gs='git status'
alias ga='git add .'
alias gc='git commit -m'
alias gp='git push'
alias gl='git log --oneline -10'

# Навигация
alias ..='cd ..'
alias ...='cd ../..'
alias ll='ls -la'

# Docker
alias dcu='docker-compose up -d'
alias dcd='docker-compose down'
```

```bash
# Применить изменения
source ~/.zshrc
```

## && и || — цепочки команд

`&&` — выполнить следующую команду только если предыдущая прошла успешно.
`||` — только если предыдущая провалилась.

```bash
# Собрать и запустить (только если сборка прошла)
npm run build && npm start

# Создать папку и перейти в неё
mkdir my-project && cd my-project
```

## Навигация

```bash
# Перейти в предыдущую директорию
cd -

# История команд
history
history | grep docker   # найти команды с docker

# Выполнить команду из истории по номеру
!42
```

## Горячие клавиши

- `Ctrl+C` — прервать текущую команду
- `Ctrl+L` — очистить экран
- `Ctrl+A` — перейти в начало строки
- `Ctrl+E` — перейти в конец строки
- `Ctrl+W` — удалить слово назад
- `Tab` — автодополнение
- `Tab Tab` — показать все варианты

> 💡 Попробуй **zsh + Oh My Zsh** — умное автодополнение, подсветка команд, удобные плагины для git.

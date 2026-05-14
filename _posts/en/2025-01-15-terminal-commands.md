---
layout: post
title: "Terminal: commands that save time"
categories: tools
date: 2025-01-15
read_time: 4
difficulty: beginner
description: "alias, history, ctrl+r, && and || — basic terminal tricks every developer should know."
excerpt_text: "alias, history, ctrl+r and other tricks every developer should know"
keywords: "terminal commands, bash commands, alias bash, command history, unix commands"
translation_of: "/tools/terminal-commands/"
---

## Ctrl+R — search history

Press `Ctrl+R` and start typing — the terminal finds the last command containing that text. Faster than scrolling with the up arrow.

```bash
# Press Ctrl+R, type "docker"
(reverse-i-search)`docker': docker-compose up -d
# Enter — execute, arrows — edit
```

## alias — short commands

Add to `~/.bashrc` or `~/.zshrc`:

```bash
# Git shortcuts
alias gs='git status'
alias ga='git add .'
alias gc='git commit -m'
alias gp='git push'
alias gl='git log --oneline -10'

# Navigation
alias ..='cd ..'
alias ...='cd ../..'
alias ll='ls -la'

# Docker
alias dcu='docker-compose up -d'
alias dcd='docker-compose down'
```

```bash
# Apply changes
source ~/.zshrc
```

## && and || — command chains

`&&` — run the next command only if the previous one succeeded.
`||` — only if the previous one failed.

```bash
# Build and run (only if the build passed)
npm run build && npm start

# Create a folder and cd into it
mkdir my-project && cd my-project
```

## Navigation

```bash
# Go back to the previous directory
cd -

# Command history
history
history | grep docker   # find commands containing docker

# Run a command from history by number
!42
```

## Hotkeys

- `Ctrl+C` — interrupt the current command
- `Ctrl+L` — clear the screen
- `Ctrl+A` — jump to start of line
- `Ctrl+E` — jump to end of line
- `Ctrl+W` — delete the previous word
- `Tab` — autocomplete
- `Tab Tab` — show all options

> Try **zsh + Oh My Zsh** — smart autocomplete, command highlighting, handy git plugins.

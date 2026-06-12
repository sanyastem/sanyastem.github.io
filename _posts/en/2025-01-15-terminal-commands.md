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
tldr:
  - "Ctrl+R is reverse history search: start typing and the terminal finds the last matching command; faster than scrolling with the up arrow."
  - "Shortcuts via alias in ~/.bashrc or ~/.zshrc: alias gs='git status', gc='git commit -m', dcu='docker-compose up -d'; apply with source ~/.zshrc."
  - "&& runs the next command only if the previous one succeeded (npm run build && npm start), || only if it failed."
  - "cd - returns to the previous directory, history | grep docker searches your history, !42 runs command number 42."
faq:
  - q: "How do I quickly find a command I typed earlier in the terminal?"
    a: "Press Ctrl+R and start typing — reverse search finds the last command containing that text: Enter runs it, the arrow keys let you edit it. Other options: history | grep docker searches your whole history, and !42 runs command number 42."
  - q: "How do I create an alias in bash or zsh?"
    a: "Add a line like alias gs='git status' to ~/.bashrc or ~/.zshrc and apply the changes with source ~/.zshrc. Handy shortcuts from the article: ga='git add .', gc='git commit -m', gp='git push', dcu='docker-compose up -d', ll='ls -la'."
  - q: "What is the difference between && and || on the command line?"
    a: "&& runs the next command only if the previous one succeeded: npm run build && npm start launches the app only after a successful build. || is the opposite — it fires only when the previous command failed."
  - q: "Which terminal keyboard shortcuts are worth memorizing?"
    a: "Ctrl+C interrupts the current command, Ctrl+L clears the screen, Ctrl+A and Ctrl+E jump to the start and end of the line, Ctrl+W deletes the previous word. Tab autocompletes, double Tab shows all options, and cd - returns to the previous directory."
  - q: "What does zsh with Oh My Zsh give you over plain bash?"
    a: "Smart autocompletion, command highlighting and ready-made git plugins. Aliases are declared the same way — in ~/.zshrc — and applied with source ~/.zshrc."
---

## Ctrl+R — search history

Press `Ctrl+R` and start typing — the terminal finds the last command containing that text. Faster than scrolling with the up arrow.

```bash
# Press Ctrl+R, type "docker"
(reverse-i-search)`docker': docker-compose up -d
# Enter — execute, arrows — edit
```

## alias — short commands

Add to `~/.bashrc` or `~/.zshrc` (the git commands themselves are covered in [Git flow](/en/git/git-flow/)):

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

> Try **zsh + Oh My Zsh** — smart autocomplete, command highlighting, handy git plugins. And if you live in VS Code, the built-in terminal plus the [right extensions](/en/tools/vscode-extensions/) cover 90% of tasks.

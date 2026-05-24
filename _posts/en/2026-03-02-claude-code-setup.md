---
layout: post
title: "Claude Code: install and basic setup"
categories: tools
date: 2026-03-02
read_time: 6
difficulty: beginner
series: "Claude Code: complete guide"
part: 1
description: "Install Claude Code, learn about CLAUDE.md, settings and the first commands. A starter guide for developers."
excerpt_text: "Install Claude Code, configure CLAUDE.md and run your first commands in the terminal"
keywords: "claude code, install claude code, claude code setup, CLAUDE.md, Anthropic CLI"
translation_of: "/tools/claude-code-setup/"
howto:
  name: "Install and first-time setup of Claude Code"
  totalTime: "PT15M"
  steps:
    - name: "Install Claude Code"
      text: "Native installer: curl -fsSL https://claude.ai/install.sh | bash (macOS/Linux/WSL) or irm https://claude.ai/install.ps1 | iex (Windows). No Node.js required."
    - name: "Authenticate"
      text: "Run claude in the terminal — a browser opens for login to your Anthropic account."
    - name: "Create CLAUDE.md in the project"
      text: "In the project root create a CLAUDE.md file describing the stack, conventions, and build/test commands. The agent reads this file on every run."
    - name: "Run the first session"
      text: "claude in the project folder — describe a task in plain English. The agent will analyze the code and propose a plan."
---

## What is Claude Code

Claude Code is a CLI tool from Anthropic that runs Claude right in your terminal. It sees the project files, runs commands, reads code and makes changes. It's not a copy-paste chat — the agent works in the context of your repository.

## Installation

Native installer (recommended):

```bash
# macOS / Linux / WSL
curl -fsSL https://claude.ai/install.sh | bash

# Windows PowerShell
irm https://claude.ai/install.ps1 | iex

# macOS via Homebrew
brew install --cask claude-code

# Windows via WinGet
winget install Anthropic.ClaudeCode
```

> The old method `npm install -g @anthropic/claude-code` is deprecated and not recommended since 2025.

Verify:

```bash
claude --version
```

Browser-based authentication on first run — just type:

```bash
claude
```

## First commands

```bash
# Run in the current folder
claude

# Sprint mode: execute a task without dialog
claude -p "add ESLint to the project"

# Continue an interrupted session
claude --continue
```

## CLAUDE.md — instructions for the agent

`CLAUDE.md` is a file in the project root that Claude reads on every run. Put project context, rules and commands here.

```markdown
# Project

E-commerce on Next.js + PostgreSQL.

## Stack

- Next.js 15 (App Router)
- TypeScript (strict: true)
- Prisma ORM
- Tailwind CSS

## Commands

- `npm run dev` — start dev server
- `npm run test` — tests (Vitest)
- `npm run lint` — linter

## Rules

- Write in TypeScript, don't use `any`
- Components in `src/components/`, one file = one component
- Commits in Conventional Commits style
- Don't touch files in `src/generated/`
```

The more precise `CLAUDE.md` is, the less you need to explain in each session.

## Settings (.claude/settings.json)

The `.claude/settings.json` file in the project root manages permissions:

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

Global settings live in `~/.claude/settings.json` — they apply to all projects.

## Modes of operation

| Mode | Command | What it does |
|-------|---------|------------|
| Dialog | `claude` | Interactive chat with the agent |
| Auto mode | `claude --dangerously-skip-permissions` | No confirmations (use carefully) |
| One-shot | `claude -p "task"` | Execute and exit |
| Continue | `claude --continue` | Resume the last session |
| Headless | `claude --headless` | No UI, controlled via API (Dispatch) |

## Useful hotkeys in a session

| Combo | Action |
|------------|---------|
| `Ctrl+C` | Interrupt current operation |
| `Ctrl+D` | Exit Claude Code |
| `/help` | List of all commands |
| `/clear` | Clear session context |
| `/compact` | Compress history to save tokens |
| `/memory` | Edit CLAUDE.md memory files |
| `/doctor` | Installation diagnostics |
| `/rewind` | Roll back to a previous checkpoint |

## IDE and Web

Claude Code works not only in the terminal:
- **VS Code** — extension with inline diff and a change plan
- **JetBrains** — plugin for IntelliJ, PyCharm, WebStorm, Rider
- **claude.ai/code** — web version with GitHub repository integration

## Summary

- Install: `curl -fsSL https://claude.ai/install.sh | bash`
- Configure `CLAUDE.md` with project description and commands
- Restrict permissions via `.claude/settings.json`
- Use `/help` inside a session — lots of useful stuff there

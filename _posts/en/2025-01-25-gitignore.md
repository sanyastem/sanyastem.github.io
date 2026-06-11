---
layout: post
title: ".gitignore: what to put in it and why"
categories: git
date: 2025-01-25
read_time: 3
difficulty: beginner
series: "Git workflow: professional practice"
part: 2
description: "node_modules, .env, .DS_Store — what should never end up in a repository, how to configure .gitignore and a global gitignore."
excerpt_text: "node_modules, .env, .DS_Store — what should never end up in a repository"
keywords: ".gitignore, git ignore, node_modules, .env, gitignore templates"
translation_of: "/git/gitignore/"
tldr:
  - "Must-haves in .gitignore: node_modules and other dependencies, .env with secrets, build artifacts (dist/, build/, __pycache__/) and system files .DS_Store, Thumbs.db."
  - ".gitignore will not hide an already committed file — remove it from the index with git rm --cached .env; if .env held secrets, rotate every compromised key."
  - "Move system junk to a global ignore: git config --global core.excludesfile ~/.gitignore_global — no need to duplicate it in every project."
  - "gitignore.io generates a ready-made .gitignore for your stack — type in Node, Python, macOS and get a complete file."
---

## What is .gitignore

A `.gitignore` file tells Git which files to ignore — don't track, don't include in commits. Created at the repo root.

## What must always be ignored

**Dependencies** — `node_modules`, `vendor`, `.venv`. Generated automatically by `npm install`, weighing hundreds of MB, different on every machine.

**Environment files** — `.env`. Contains secrets: passwords, API keys, tokens. Commit it once and they're in your public repo.

> ⚠️ If you already committed `.env` — just adding it to .gitignore won't help. You need to remove the file from history and rotate all compromised keys.

**System files** — `.DS_Store` (macOS), `Thumbs.db` (Windows).

**Build artifacts** — `dist/`, `build/`, `.next/`, `__pycache__/`.

## Typical .gitignore for Node.js

```gitignore
# Dependencies
node_modules/

# Environment
.env
.env.local
.env.*.local

# Build
dist/
build/
.next/

# Logs
*.log
npm-debug.log*

# System
.DS_Store
Thumbs.db

# Editors
.vscode/settings.json
.idea/
```

> 💡 The site **gitignore.io** generates a ready `.gitignore` by technology. Type "Node", "Python", "macOS" — you get a full file.

## Global .gitignore

System junk is better off in a global gitignore — instead of adding it to every project:

```bash
touch ~/.gitignore_global
git config --global core.excludesfile ~/.gitignore_global
echo ".DS_Store" >> ~/.gitignore_global
echo ".idea/" >> ~/.gitignore_global
```

## If a file is already in the repo

Adding it to `.gitignore` doesn't remove an already-tracked file. To untrack it but keep it locally:

```bash
git rm -r --cached node_modules/
git rm --cached .env
git commit -m "remove tracked files from gitignore"
```

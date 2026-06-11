---
layout: post
title: "VS Code: extensions I use every day"
categories: tools
date: 2025-02-05
read_time: 3
difficulty: beginner
description: "Prettier, GitLens, Error Lens, Path Intellisense, Thunder Client — what to install in VS Code first and how to configure it."
excerpt_text: "Prettier, GitLens, Error Lens — what to install first"
keywords: "vs code extensions, vscode extensions, prettier, gitlens, error lens, vs code setup"
translation_of: "/tools/vscode-extensions/"
tldr:
  - "The core set: Prettier (format on save), GitLens (blame annotations in code), Error Lens (inline errors), Path Intellisense, Thunder Client."
  - "For Prettier enable in settings.json: editor.formatOnSave: true and editor.defaultFormatter: esbenp.prettier-vscode; custom options go in .prettierrc."
  - "Thunder Client is a lightweight Postman replacement inside VS Code: collections, environment variables, request history."
  - "Settings worth enabling right away: files.autoSave: onFocusChange, editor.rulers: [80], font ligatures with Fira Code; open settings.json via Ctrl+Shift+P → Open User Settings (JSON)."
---

## Prettier — code formatting

Automatically formats code on save. No more style debates on the team.

After install, add to `settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

> Create `.prettierrc` in the project root for custom settings: line width, single/double quotes, semicolons.

## GitLens — Git superpowers

Shows who, when and why wrote each line right inside the code (blame annotations). Hover over a line — see the last commit, author and message. Invaluable when reading someone else's code.

## Error Lens — errors right on the line

Displays errors and warnings next to the line of code — no need to look at the bottom panel. Saves a lot of time.

## Path Intellisense — path autocomplete

Automatically completes file paths in imports. Indispensable in projects with deep folder structures.

## Thunder Client — REST client inside VS Code

A lightweight Postman alternative inside the editor. Supports collections, environment variables, request history.

## Auto Rename Tag

Rename an opening HTML tag — the closing one updates automatically.

## Settings worth enabling right away

```json
{
  "editor.renderWhitespace": "boundary",
  "editor.fontFamily": "'Fira Code', monospace",
  "editor.fontLigatures": true,
  "files.autoSave": "onFocusChange",
  "editor.rulers": [80]
}
```

> Quick way to open `settings.json`: `Ctrl+Shift+P` -> "Open User Settings (JSON)".

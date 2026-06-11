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
  - "Useful settings: files.autoSave: onFocusChange, editor.rulers: [80], font ligatures with Fira Code; open settings.json via Ctrl+Shift+P → Open User Settings (JSON)."
faq:
  - q: "Which VS Code extensions should I install first?"
    a: "The core set: Prettier (format on save), GitLens (blame annotations right in the code), Error Lens (errors next to the line), Path Intellisense (path autocompletion in imports), Thunder Client (a REST client) and Auto Rename Tag for HTML tags."
  - q: "How do I set up Prettier to format on save?"
    a: "Add editor.formatOnSave: true and editor.defaultFormatter: esbenp.prettier-vscode to settings.json. Custom options — line width, single or double quotes, semicolons — go in a .prettierrc file in the project root."
  - q: "How is Thunder Client different from Postman?"
    a: "It is a lightweight REST client right inside VS Code — no need to switch to a separate app. It supports collections, environment variables and request history; for day-to-day API work that is enough."
  - q: "Which VS Code settings are worth enabling right away?"
    a: "files.autoSave: onFocusChange (save on focus loss), editor.rulers: [80] (a vertical ruler), editor.fontLigatures: true with the Fira Code font, and editor.renderWhitespace: boundary. To open settings.json quickly: Ctrl+Shift+P → Open User Settings (JSON)."
  - q: "What does GitLens do and why do I need it?"
    a: "GitLens shows blame annotations right in the code: hover over a line and you see the last commit, its author and message. Invaluable when digging through someone else's code and you need to know who wrote a line, when and why."
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

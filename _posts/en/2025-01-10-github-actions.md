---
layout: post
title: "GitHub Actions: auto-deploy in 15 minutes"
categories: devops
date: 2025-01-10
read_time: 5
difficulty: intermediate
description: "Setting up a CI/CD pipeline: every push to main automatically runs tests and deploys. Writing the .yml from scratch."
excerpt_text: "CI/CD pipeline from scratch — tests and deploy on every push to main"
keywords: "github actions, ci/cd, auto-deploy, workflow yml, continuous integration"
translation_of: "/devops/github-actions/"
tldr:
  - "A workflow is a .yml file in .github/workflows; triggers on: push and pull_request to main, the job runs on runs-on: ubuntu-latest."
  - "Basic CI: actions/checkout@v4, setup-node@v4 with cache: npm, then npm ci, npm test and npm run build — runs on every push."
  - "SSH deploy via appleboy/ssh-action@v1: git pull, npm ci --production, pm2 restart app; host, user and private key live in Secrets."
  - "Secrets are stored in Settings → Secrets and variables → Actions and injected via the secrets context — values never show up in logs."
---

## How it works

You create a `.github/workflows/deploy.yml` file — GitHub automatically runs it on push, PR, or on a schedule. You describe the steps: install dependencies, run tests, deploy.

## Workflow file structure

```yaml
# .github/workflows/deploy.yml

name: Deploy

# When to run
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

# What to do
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build
```

## Deploying to a server over SSH

```yaml
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/my-app
            git pull origin main
            npm ci --production
            pm2 restart app
```

## Secrets

Passwords and keys live in the repository's **Secrets**. Settings → Secrets and variables → Actions → New repository secret.

> ⚠️ Never paste passwords directly into the yml file. Use `${{ secrets.MY_SECRET }}` — the value is injected at runtime and is not visible in logs.

## Deploying to GitHub Pages

```yaml
name: Deploy to Pages

on:
  push:
    branches: [ main ]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    environment:
      name: github-pages
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'
      - uses: actions/deploy-pages@v4
```

> 💡 The status of the latest workflow shows up right on the repo page — a green check or red cross next to the commit.

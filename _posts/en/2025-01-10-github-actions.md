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
faq:
  - q: "How many free minutes does GitHub Actions give you?"
    a: "Unlimited for public repos. Private repos get 2000 minutes/month on the Free plan, 3000 on Pro. A Linux runner counts as 1x minute, Windows as 2x, macOS as 10x. The trick: even on the Free plan, a public repo means unlimited CI."
  - q: "Where should I store secrets for workflows?"
    a: "Settings → Secrets and variables → Actions. Never put tokens in code or a .env inside the repo. In a workflow you use them as \\${{ secrets.MY_TOKEN }}. Environments let you scope secrets to production/staging."
  - q: "Why does my workflow not run on a PR?"
    a: "Three reasons: 1) on: pull_request is not specified (only push), 2) the PR comes from a forked repo — the workflow has no access to secrets for security reasons, 3) the first PR from a new contributor requires maintainer approval."
  - q: "Self-hosted runner or GitHub-hosted?"
    a: "GitHub-hosted (the default) — a clean VM for every job, convenient but paid beyond the limit. Self-hosted — your own server, the cache persists between runs (faster), free but needs maintenance. For a blog/MVP — hosted; for enterprise with heavy builds — self-hosted."
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

If the app on your server runs in Docker, the full path from zero to production is covered in [deploying to a VPS](/en/devops/docker-deploy-vps/).

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

How to set up a Pages site in the first place is in a [separate guide](/en/devops/github-pages/). The deploy workflow:

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

> 💡 The status of the latest workflow shows up right on the repo page — a green check or red cross next to the commit. If your pipeline builds Docker images, speed it up with [BuildKit cache](/en/devops/docker-buildkit-cache-github-actions/).

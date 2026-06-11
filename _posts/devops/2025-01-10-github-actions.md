---
layout: post
title: "GitHub Actions: автодеплой за 15 минут"
categories: devops
translation_of: "/en/devops/github-actions/"
tldr:
  - "Workflow — это .yml-файл в .github/workflows; триггеры on: push и pull_request в main, job выполняется на runs-on: ubuntu-latest."
  - "Базовый CI: actions/checkout@v4, setup-node@v4 с cache: npm, затем npm ci, npm test и npm run build — прогоняется при каждом пуше."
  - "Деплой по SSH через appleboy/ssh-action@v1: git pull, npm ci --production, pm2 restart app; хост, юзер и приватный ключ — в Secrets."
  - "Секреты хранятся в Settings → Secrets and variables → Actions и подставляются через контекст secrets — значения не видны в логах."
date: 2025-01-10
date_ru: "10 января 2025"
read_time: 5
difficulty: intermediate
description: "Настраиваем CI/CD пайплайн: при каждом пуше в main автоматически запускаются тесты и деплой. Пишем .yml с нуля."
excerpt_text: "CI/CD пайплайн с нуля — тесты и деплой при каждом пуше в main"
keywords: "github actions, ci/cd, автодеплой, workflow yml, continuous integration"
howto:
  name: "Настроить CI/CD пайплайн через GitHub Actions"
  totalTime: "PT15M"
  steps:
    - name: "Создать папку .github/workflows"
      text: "В корне репозитория mkdir -p .github/workflows. Все workflow-файлы хранятся здесь как .yml."
    - name: "Написать первый workflow"
      text: "ci.yml с триггерами on push/pull_request. Steps: actions/checkout, actions/setup-node, npm ci, npm test. Каждый push — автоматически прогоняются тесты."
    - name: "Добавить деплой"
      text: "Job deploy зависит от build через needs: build. Условие if: github.ref == 'refs/heads/main' — деплоит только из main. Деплой шаги — SSH на сервер, rsync, docker compose pull."
    - name: "Хранить секреты безопасно"
      text: "Settings → Secrets and variables → Actions. SSH_KEY, DEPLOY_HOST, DB_PASSWORD — никогда в коде. В workflow: \\${{ secrets.SSH_KEY }}."
    - name: "Настроить уведомления"
      text: "Slack/Discord/Telegram webhook через action отдельным step с if: failure(). При падении билда команда получает alert."
faq:
  - q: "Сколько минут даёт GitHub Actions бесплатно?"
    a: "Для публичных репо — безлимитно. Для приватных — 2000 минут/месяц на Free плане, 3000 — на Pro. Linux runner = 1× минута, Windows = 2×, macOS = 10×. Хитрость: даже на Free плане публичный репо = бесконечный CI."
  - q: "Где хранить секреты для workflow?"
    a: "Settings → Secrets and variables → Actions. Никогда не клади токены в код или .env в репо. В workflow используешь как \\${{ secrets.MY_TOKEN }}. Environments → можно scoping секретов на production/staging."
  - q: "Почему мой workflow не запускается на PR?"
    a: "3 причины: 1) on: pull_request не указан (только push), 2) PR из forked-репо — workflow не имеет доступа к secrets по соображениям безопасности, 3) первый PR от нового contributor требует одобрения мейнтейнера."
  - q: "Self-hosted runner или GitHub-hosted?"
    a: "GitHub-hosted (по умолчанию) — чистая VM на каждый job, удобно но платно после лимита. Self-hosted — твой сервер, кэш сохраняется между runs (быстрее), бесплатно но требует поддержки. Для блога/MVP — hosted, для энтерпрайза с тяжёлыми билдами — self-hosted."
---

## Как это работает

Создаёшь файл `.github/workflows/deploy.yml` — GitHub автоматически запускает его при пуше, PR или по расписанию. Описываешь шаги: установить зависимости, запустить тесты, задеплоить.

## Структура workflow-файла

```yaml
# .github/workflows/deploy.yml

name: Deploy

# Когда запускать
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

# Что делать
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

## Деплой на сервер по SSH

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

## Секреты

Пароли и ключи хранятся в **Secrets** репозитория. Settings → Secrets and variables → Actions → New repository secret.

> ⚠️ Никогда не вставляй пароли прямо в yml-файл. Используй `${{ secrets.MY_SECRET }}` — значение подставится при запуске, но не будет видно в логах.

## Деплой на GitHub Pages

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

> 💡 Статус последнего workflow виден прямо на странице репозитория — зелёная галочка или красный крест рядом с коммитом.

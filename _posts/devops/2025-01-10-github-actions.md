---
layout: post
title: "GitHub Actions: автодеплой за 15 минут"
categories: devops
date: 2025-01-10
date_ru: "10 января 2025"
read_time: 5
difficulty: intermediate
description: "Настраиваем CI/CD пайплайн: при каждом пуше в main автоматически запускаются тесты и деплой. Пишем .yml с нуля."
excerpt_text: "CI/CD пайплайн с нуля — тесты и деплой при каждом пуше в main"
keywords: "github actions, ci/cd, автодеплой, workflow yml, continuous integration"
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

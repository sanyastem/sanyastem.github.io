---
layout: post
title: "Как запустить сайт на GitHub Pages за 5 минут"
categories: devops
translation_of: "/en/devops/github-pages/"
tldr:
  - "Репозиторий с именем username.github.io плюс index.html в корне = бесплатный сайт; включается в Settings → Pages → Deploy from a branch, деплой за 1-2 минуты."
  - "Кастомный домен: вписать в поле Custom domain и добавить DNS-запись CNAME на username.github.io; HTTPS включается сам через Let's Encrypt."
  - "Только статика (HTML/CSS/JS), серверной логики нет; лимиты: репо и сайт до 1 ГБ, файл до 100 МБ, около 100 ГБ трафика в месяц."
  - "Страница 404 — проверь, что файл называется index.html строчными и лежит в корне; сайт не обновляется — пушишь не в ту ветку или кэшируется CDN."
date: 2025-02-28
date_ru: "28 февраля 2025"
read_time: 5
difficulty: beginner
description: "GitHub Pages — бесплатный хостинг прямо из репозитория. Пошагово от нуля до рабочего сайта с кастомным доменом и HTTPS."
excerpt_text: "Бесплатный хостинг прямо из репозитория — пошагово от нуля до рабочего сайта"
keywords: "github pages, хостинг, бесплатный хостинг, статический сайт, деплой"
howto:
  name: "Запустить сайт на GitHub Pages"
  totalTime: "PT5M"
  steps:
    - name: "Создать репозиторий"
      text: "На github.com создать репо с именем username.github.io (для пользовательского сайта) или любым именем (для project page). Public, с README."
    - name: "Закоммитить index.html"
      text: "Создать минимальный index.html в корне. git clone, добавить, git push. Можно просто загрузить через UI github.com."
    - name: "Включить Pages"
      text: "Settings → Pages → Source: Deploy from a branch → Branch: main → / (root) → Save. Через 1-2 минуты сайт доступен на https://username.github.io."
    - name: "Подключить кастомный домен (опционально)"
      text: "В Settings → Pages вписать домен (yoursite.com). В DNS-провайдере добавить CNAME → username.github.io. HTTPS подтягивается автоматически через Let's Encrypt за 5-10 минут."
faq:
  - q: "Можно ли использовать React/Vue/Angular?"
    a: "Можно. Билдишь приложение (npm run build), коммитишь содержимое dist/ в gh-pages ветку или main. Для production-сборок настрой GitHub Actions с upload-pages-artifact + deploy-pages — автоматический деплой на push."
  - q: "Есть ли ограничения по размеру?"
    a: "Репо до 1GB, сайт до 1GB, soft-limit 100GB трафика в месяц. Файлы до 100MB каждый. Для блога / документации / лендинга — overkill. Если ты упёрся в лимиты — рассмотри Vercel или Cloudflare Pages."
  - q: "Поддерживает ли GitHub Pages backend?"
    a: "Нет, только статика (HTML/CSS/JS). Если нужен backend — GitHub Pages frontend + отдельный API (Cloudflare Workers, AWS Lambda, Vercel Functions). Или используй Jekyll/Hugo для SSG."
  - q: "Можно ли скрыть site от индексации?"
    a: "Положи robots.txt с Disallow: / в корень. Но Pages нельзя сделать приватным — публичные репо обязательно публичные сайты. Для приватных нужен GitHub Enterprise или другой хостинг."
---

## Что такое GitHub Pages

GitHub Pages берёт файлы из твоего репозитория и раздаёт их как статический сайт. Работает с HTML, CSS, JavaScript. Бесплатно, домен по умолчанию — `username.github.io`.

Идеально для: портфолио, документации, блогов, лендингов. (Этот блог тоже живёт на Pages — деплой настроен через [GitHub Actions](/devops/github-actions/).)

## Шаг 1 — Создай репозиторий

Имя репозитория должно быть строго `username.github.io`, где `username` — твой логин на GitHub.

> 💡 Для проекта (не персонального сайта) имя может быть любым — он будет доступен по адресу `username.github.io/repo-name`.

## Шаг 2 — Добавь index.html

GitHub Pages ищет точку входа — файл `index.html` в корне репозитория. Вот минимальный файл:

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Мой сайт</title>
</head>
<body>
  <h1>Привет, мир!</h1>
</body>
</html>
```

## Шаг 3 — Включи Pages в настройках

1. Открой **Settings** репозитория
2. В левом сайдбаре найди **Pages**
3. Source: **Deploy from branch**
4. Выбери ветку — `main` или `master`, папку — `/ (root)`
5. Нажми **Save**

GitHub начнёт деплой — обычно занимает 1–2 минуты.

## Шаг 4 — Открой сайт

После деплоя в разделе Pages появится адрес: `https://username.github.io`.

## Кастомный домен

Чтобы подключить свой домен:

1. В настройках Pages введи домен в поле **Custom domain**
2. У регистратора добавь DNS-запись: `CNAME @ username.github.io`
3. Подожди распространения DNS — от 5 минут до нескольких часов

> ✅ HTTPS включается автоматически через Let's Encrypt — ничего настраивать не нужно.

## Частые проблемы

**Сайт не обновляется после push** — проверь, что пушишь в ту ветку, которую указал в настройках. Если верная — подожди несколько минут, CDN кэшируется.

**Страница 404** — убедись, что файл называется именно `index.html` (строчными) и лежит в корне, а не в подпапке.

> ⚠️ GitHub Pages не поддерживает серверную логику (Node.js, PHP, Python). Только статика: HTML, CSS, JS. Если нужен бэкенд — смотри [деплой на VPS](/devops/docker-deploy-vps/).

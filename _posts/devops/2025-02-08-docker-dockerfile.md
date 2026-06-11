---
layout: post
title: "Docker: пишем Dockerfile и собираем образы"
categories: devops
translation_of: "/en/devops/docker-dockerfile/"
tldr:
  - "Каждая инструкция Dockerfile создаёт слой, слои кэшируются: редко меняющееся (COPY package*.json и RUN npm ci) ставь выше кода — COPY . . в самом конце."
  - "Multi-stage сборка (FROM ... AS builder, затем COPY --from=builder) уменьшает образ в 5-10 раз: Node.js-проект — с 1.2 ГБ до 120 МБ."
  - "Alpine-образы экономят место: node:20 весит 1.1 ГБ, node:20-alpine — 180 МБ; кэш apt чисти в той же RUN-инструкции (rm -rf /var/lib/apt/lists/*)."
  - "В .dockerignore добавь node_modules, .git, .env; в продакшне не запускай контейнер от root — поставь USER node перед CMD."
date: 2025-02-08
date_ru: "8 февраля 2025"
last_modified_at: 2026-05-08
read_time: 8
difficulty: intermediate
series: "Docker: от установки до продакшна"
part: 2
description: "Разбираем Dockerfile по инструкциям, слои образов, кэширование сборки и оптимизацию — как уменьшить размер образа в разы."
excerpt_text: "Dockerfile по инструкциям, слои, кэш сборки и оптимизация размера образа"
keywords: "dockerfile, docker образ, docker build, слои docker, оптимизация docker, multi-stage"
howto:
  name: "Написать оптимизированный Dockerfile с нуля"
  totalTime: "PT20M"
  steps:
    - name: "Выбрать базовый образ"
      text: "Использовать минимальный официальный образ под язык (node:20-alpine вместо node:20, python:3.12-slim вместо python:3.12). Это уменьшает финальный размер в 5-10 раз."
    - name: "Скопировать manifest зависимостей"
      text: "COPY package*.json ./ или requirements.txt отдельно от кода. Кэш Docker не инвалидирует слой если файл не менялся, npm install не выполнится повторно."
    - name: "Установить зависимости"
      text: "RUN npm ci --omit=dev или pip install --no-cache-dir -r requirements.txt. --omit=dev убирает devDependencies в production-сборке."
    - name: "Скопировать код"
      text: "COPY . . — копирует весь код приложения. Этот слой меняется на каждом коммите, но restore выше уже в кэше."
    - name: "Multi-stage для уменьшения размера"
      text: "Второй FROM с минимальным runtime-образом (например, distroless или alpine), COPY --from=build /app/dist /app — финальный образ без компилятора и dev-tools."
    - name: "Запустить под не-root пользователем"
      text: "USER 1000 или USER nodejs — повышает безопасность. Если контейнер взломают, атакующий не получит root в host через kernel exploit."
faq:
  - q: "CMD vs ENTRYPOINT — в чём разница?"
    a: "ENTRYPOINT задаёт исполняемый файл (всегда выполнится), CMD — аргументы по умолчанию (можно перезаписать в docker run). Обычная связка: ENTRYPOINT [\"node\"] + CMD [\"server.js\"]. Если оставить только CMD — пользователь может полностью заменить команду."
  - q: "Почему мой образ слишком большой?"
    a: "Чаще всего: базовый образ python:latest (1 ГБ) вместо python:3.12-slim (50 МБ), копирование node_modules вместо npm ci внутри Dockerfile, отсутствие .dockerignore, и единый stage вместо multi-stage. Запусти docker history image_name — увидишь какой слой жирный."
  - q: "Что такое multi-stage build?"
    a: "Несколько FROM в одном Dockerfile. Первый stage — build (с компилятором, всеми инструментами), второй — runtime (минимальный, копируется только результат через COPY --from=build). Финальный образ в 10x меньше: для .NET — 250 МБ вместо 2 ГБ."
  - q: "Зачем COPY package.json отдельно от COPY кода?"
    a: "Docker кэширует слои. Если package.json не менялся — npm install не выполнится повторно, экономия 30-60 сек на каждой сборке. Скопируешь весь код одной строкой → любая правка .js инвалидирует install. Правило: редко-меняющееся копировать первым."
---

## Как устроен образ Docker

Образ — это набор слоёв (layers). Каждая инструкция в Dockerfile создаёт новый слой. Слои кэшируются: если файл не изменился — Docker не пересобирает этот слой.

Это критически важно для скорости сборки. Неправильный порядок инструкций — и кэш сбрасывается при каждом изменении кода.

## Все основные инструкции Dockerfile

```dockerfile
# FROM — базовый образ. Всегда первая инструкция
FROM node:20-alpine

# WORKDIR — рабочая директория внутри контейнера
# Лучше явно задавать, а не работать в корне
WORKDIR /app

# COPY — копировать файлы с хоста в контейнер
COPY package*.json ./

# RUN — выполнить команду при сборке
RUN npm ci --only=production

# COPY остальной код (после установки зависимостей!)
COPY . .

# ENV — переменные окружения
ENV NODE_ENV=production
ENV PORT=3000

# EXPOSE — документирует порт (не открывает его сам по себе!)
EXPOSE 3000

# USER — запускать от непривилегированного пользователя
USER node

# CMD — команда по умолчанию при запуске контейнера
CMD ["node", "index.js"]

# ENTRYPOINT — фиксированная точка входа (не перезаписывается при запуске)
# ENTRYPOINT ["node"]
```

## Правильный порядок для кэширования

Главное правило: **то, что меняется реже — выше, что меняется чаще — ниже**.

```dockerfile
# ❌ Плохо — при любом изменении кода переустанавливаем зависимости
FROM node:20-alpine
WORKDIR /app
COPY . .              # Копируем всё сразу
RUN npm install       # Этот слой сбросится при ЛЮБОМ изменении файла
CMD ["node", "index.js"]
```

```dockerfile
# ✅ Хорошо — зависимости кэшируются отдельно от кода
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./   # Только package.json — меняется редко
RUN npm ci              # Этот слой кэшируется пока package.json не изменится
COPY . .                # Код — меняется часто, но зависимости уже закэшированы
CMD ["node", "index.js"]
```

## Multi-stage сборка — уменьшаем размер образа

Классическая проблема: для сборки нужны dev-инструменты (компиляторы, тесты), но в продакшне они не нужны. Multi-stage решает это:

```dockerfile
# Стадия 1: сборка
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci                   # Устанавливаем ВСЕ зависимости включая devDependencies
COPY . .
RUN npm run build            # Собираем проект

# Стадия 2: продакшн образ
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production  # Только production зависимости
COPY --from=builder /app/dist ./dist  # Берём только собранные файлы из стадии 1

USER node
CMD ["node", "dist/index.js"]
```

> 💡 Образ из Multi-stage сборки может быть в 5-10 раз меньше. Node.js проект: 1.2 ГБ → 120 МБ.

## Оптимизация размера образа

**Используй alpine-образы** — они минималистичны:

```dockerfile
# ❌ 1.1 ГБ
FROM node:20

# ✅ 180 МБ
FROM node:20-alpine
```

**Очищай кэш пакетного менеджера в одной инструкции RUN:**

```dockerfile
# ❌ Кэш остаётся в слое
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get clean

# ✅ Всё в одном слое, кэш удаляется
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
```

**Не копируй лишнее — используй .dockerignore:**

```
node_modules
.git
.env
*.log
dist
coverage
```

## Полезные команды при разработке

```bash
# Собрать образ с тегом
docker build -t myapp:1.0 .

# Посмотреть слои и их размеры
docker history myapp:1.0

# Проверить размер образа
docker images myapp

# Запустить и зайти внутрь для отладки
docker run -it myapp:1.0 sh

# Запустить с монтированием кода (для разработки)
docker run -p 3000:3000 -v $(pwd):/app myapp:1.0
```

> ⚠️ Никогда не запускай контейнер от root-пользователя в продакшне. Всегда добавляй `USER node` (или другого непривилегированного пользователя) перед `CMD`.

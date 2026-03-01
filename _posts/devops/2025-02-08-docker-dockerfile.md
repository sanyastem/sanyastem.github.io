---
layout: post
title: "Docker: пишем Dockerfile и собираем образы"
categories: devops
date: 2025-02-08
date_ru: "8 февраля 2025"
read_time: 8
difficulty: intermediate
series: "Docker: от установки до продакшна"
part: 2
description: "Разбираем Dockerfile по инструкциям, слои образов, кэширование сборки и оптимизацию — как уменьшить размер образа в разы."
excerpt_text: "Dockerfile по инструкциям, слои, кэш сборки и оптимизация размера образа"
keywords: "dockerfile, docker образ, docker build, слои docker, оптимизация docker, multi-stage"
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

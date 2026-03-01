---
layout: post
title: "Docker для новичка: контейнеры за 10 минут"
categories: devops
date: 2025-02-01
date_ru: "1 февраля 2025"
read_time: 7
description: "Что такое Docker-контейнер, первый docker run, Dockerfile и docker-compose на простом примере. Объясняем просто."
excerpt_text: "Что такое контейнер, первый docker run и docker-compose на простом примере"
keywords: "docker, контейнеры, dockerfile, docker-compose, docker для начинающих, devops"
---

## Что такое контейнер

Контейнер — изолированный процесс со своей файловой системой и зависимостями. В отличие от виртуальной машины, не включает целую ОС — запускается за секунды и весит мегабайты.

Аналогия: контейнер — как zip-архив с приложением и всем необходимым для его запуска.

## Установка

Скачай **Docker Desktop** с официального сайта. После установки:

```bash
docker --version
# Docker version 27.x.x

docker run hello-world
# Если видишь "Hello from Docker!" — всё работает
```

## Основные команды

```bash
# Запустить контейнер
docker run nginx

# Запустить в фоне (-d) и пробросить порт (-p)
docker run -d -p 8080:80 nginx
# Открой http://localhost:8080

# Список запущенных контейнеров
docker ps

# Остановить контейнер
docker stop <container_id>

# Список образов
docker images
```

## Dockerfile — свой образ

```dockerfile
# Берём базовый образ
FROM node:20-alpine

# Рабочая директория внутри контейнера
WORKDIR /app

# Копируем package.json и ставим зависимости
COPY package*.json ./
RUN npm install

# Копируем весь код
COPY . .

# Открываем порт
EXPOSE 3000

# Команда запуска
CMD ["node", "index.js"]
```

```bash
# Собрать образ
docker build -t my-app .

# Запустить
docker run -p 3000:3000 my-app
```

## docker-compose — несколько сервисов

```yaml
version: '3'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - db
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/mydb

  db:
    image: postgres:16
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: mydb
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

```bash
# Запустить всё
docker-compose up -d

# Остановить
docker-compose down
```

> 💡 Добавь `.dockerignore` рядом с `Dockerfile` и включи туда `node_modules`, `.git`, `.env` — они не должны попадать в образ.

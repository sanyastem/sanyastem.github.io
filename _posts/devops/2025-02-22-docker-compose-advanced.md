---
layout: post
title: "Docker Compose: оркестрация многоконтейнерных приложений"
categories: devops
date: 2025-02-22
date_ru: "22 февраля 2025"
read_time: 9
difficulty: intermediate
series: "Docker: от установки до продакшна"
part: 3
description: "Полный разбор docker-compose.yml: сети, volumes, переменные среды, health checks, профили и деплой на сервер."
excerpt_text: "Сети, volumes, переменные среды, health checks и деплой через docker-compose"
keywords: "docker-compose, docker сети, volumes, health check, docker профили, docker деплой"
---

## Зачем нужен Docker Compose

В реальных приложениях несколько сервисов: бэкенд, фронтенд, база данных, Redis, очередь задач. Запускать каждый вручную через `docker run` — неудобно. Compose описывает все сервисы в одном файле и запускает их одной командой.

## Структура docker-compose.yml

```yaml
version: '3.9'

services:       # Список сервисов (контейнеров)
  app:
    build: .
    ports:
      - "3000:3000"

networks:       # Кастомные сети (опционально)
  backend:

volumes:        # Именованные тома для хранения данных
  pgdata:
```

## Полный пример: приложение + PostgreSQL + Redis

```yaml
version: '3.9'

services:

  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://user:secret@db:5432/myapp
      REDIS_URL: redis://cache:6379
    depends_on:
      db:
        condition: service_healthy    # Ждём пока база готова
      cache:
        condition: service_started
    networks:
      - backend
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: myapp
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d myapp"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - backend

  cache:
    image: redis:7-alpine
    volumes:
      - redisdata:/data
    networks:
      - backend

networks:
  backend:
    driver: bridge

volumes:
  pgdata:
  redisdata:
```

## Переменные окружения через .env

Не хардкоди секреты прямо в `docker-compose.yml`. Используй `.env` файл:

```bash
# .env
POSTGRES_USER=user
POSTGRES_PASSWORD=supersecret
POSTGRES_DB=myapp
APP_PORT=3000
```

```yaml
# docker-compose.yml
services:
  db:
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
  app:
    ports:
      - "${APP_PORT}:3000"
```

> ⚠️ Добавь `.env` в `.gitignore`! Для CI/CD используй `.env.example` с заглушками.

## Health checks — ждём готовности сервиса

Без `depends_on + condition` бэкенд стартует раньше чем поднимется база, получает ошибку подключения и падает.

```yaml
db:
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
    interval: 10s     # Проверять каждые 10 сек
    timeout: 5s       # Таймаут одной проверки
    retries: 5        # После 5 неудач — unhealthy
    start_period: 30s # Не считать неудачи первые 30 сек
```

## Профили — разные конфигурации для dev и prod

```yaml
services:
  app:
    build: .
    # Без профиля — запускается всегда

  pgadmin:
    image: dpage/pgadmin4
    profiles:
      - dev          # Только в dev-режиме
    ports:
      - "5050:80"

  nginx:
    image: nginx:alpine
    profiles:
      - prod         # Только в продакшне
```

```bash
# Запустить только dev-профиль
docker-compose --profile dev up -d

# Запустить prod-профиль
docker-compose --profile prod up -d
```

## Основные команды

```bash
# Запустить всё в фоне
docker-compose up -d

# Посмотреть логи всех сервисов
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f app

# Выполнить команду в запущенном контейнере
docker-compose exec app sh

# Остановить без удаления данных
docker-compose stop

# Остановить и удалить контейнеры (данные в volumes остаются)
docker-compose down

# Удалить всё включая volumes (ОСТОРОЖНО — удалит данные БД!)
docker-compose down -v
```

> 💡 Для локальной разработки создай `docker-compose.override.yml` — он автоматически мержится с основным файлом и позволяет монтировать код для hot-reload без изменения основного compose-файла.

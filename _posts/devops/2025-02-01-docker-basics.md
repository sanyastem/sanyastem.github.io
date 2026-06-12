---
layout: post
title: "Docker для новичка: контейнеры за 10 минут"
categories: devops
date: 2025-02-01
date_ru: "1 февраля 2025"
last_modified_at: 2026-06-12
read_time: 7
difficulty: beginner
series: "Docker: от установки до продакшна"
part: 1
description: "Что такое Docker-контейнер, первый docker run, Dockerfile и docker-compose на простом примере. Объясняем просто."
excerpt_text: "Что такое контейнер, первый docker run и docker-compose на простом примере"
keywords: "docker, контейнеры, dockerfile, docker-compose, docker для начинающих, devops"
translation_of: "/en/devops/docker-basics/"
tldr:
  - "Контейнер — изолированный процесс со своей файловой системой; в отличие от ВМ не тащит целую ОС, стартует за секунды и весит мегабайты."
  - "Первый запуск: docker run hello-world, затем docker run -d -p 8080:80 nginx — сервер на http://localhost:8080."
  - "Dockerfile (FROM, WORKDIR, COPY, RUN, EXPOSE, CMD) — воспроизводимый рецепт сборки своего образа: docker build -t my-app ."
  - "docker-compose оркеструет несколько связанных сервисов (app + db) одной командой docker compose up; не забудь .dockerignore."
howto:
  name: "Запуск первого Docker-контейнера за 10 минут"
  totalTime: "PT10M"
  steps:
    - name: "Установить Docker Desktop"
      text: "Скачать Docker Desktop с docker.com и установить под свою ОС. Запустить, дождаться зелёной иконки в трее."
    - name: "Запустить первый контейнер"
      text: "Открыть терминал и выполнить docker run hello-world — Docker скачает образ и покажет приветственное сообщение."
    - name: "Запустить веб-сервер"
      text: "docker run -d -p 8080:80 nginx — поднимет nginx, доступный на http://localhost:8080."
    - name: "Написать свой Dockerfile"
      text: "Создать Dockerfile с FROM, COPY, RUN, CMD под своё приложение и собрать командой docker build -t myapp ."
    - name: "Использовать docker-compose"
      text: "Описать многоконтейнерное приложение в docker-compose.yml и запустить всё одной командой docker compose up."
faq:
  - q: "Чем контейнер отличается от виртуальной машины?"
    a: "ВМ виртуализирует железо и запускает целую гостевую ОС — обычно гигабайты памяти и долгие минуты на старт. Контейнер шарит ядро хоста и изолирует процессы через namespaces/cgroups, поэтому весит десятки мегабайт и стартует за секунды."
  - q: "Образ (image) и контейнер — это одно и то же?"
    a: "Нет. Образ — неизменяемый шаблон (как класс), контейнер — запущенный экземпляр (как объект). Из одного образа можно поднять много контейнеров одновременно с разными переменными и портами."
  - q: "Зачем нужен Dockerfile, если есть готовые образы в Docker Hub?"
    a: "Готовые образы покрывают базы — Postgres, Nginx, Node. Свой Dockerfile нужен, когда упаковываешь собственное приложение: копируешь код, ставишь зависимости, описываешь команду запуска. Это воспроизводимый рецепт сборки."
  - q: "Docker и docker-compose — это разные инструменты?"
    a: "Docker — движок для одного контейнера. docker-compose — обёртка для оркестрации нескольких связанных контейнеров одной командой через YAML-файл. Для проекта с БД + приложение + кэш compose обязателен."
  - q: "Контейнеры безопасны для продакшна?"
    a: "Сами по себе — относительно. Изоляция слабее, чем у ВМ, поэтому root в контейнере при ошибке конфига может получить доступ к хосту. На продакшне обязательно: непривилегированный пользователь в Dockerfile, минимальный базовый образ (alpine/distroless), сканирование образов на CVE."
---

## Что такое контейнер

Контейнер — изолированный процесс со своей файловой системой и зависимостями. В отличие от виртуальной машины, не включает целую ОС — запускается за секунды и весит мегабайты.

Аналогия: контейнер — как zip-архив с приложением и всем необходимым для его запуска.

## Установка

Скачай **Docker Desktop** с официального сайта. После установки:

```bash
docker --version
# Docker version 28.x.x

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

Здесь только базовый пример — подробный разбор инструкций и multi-stage сборки есть в [отдельной статье про Dockerfile](/devops/docker-dockerfile/).

```dockerfile
# Берём базовый образ
FROM node:22-alpine

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

Продвинутые сценарии — healthchecks, профили, зависимости — в [статье про Docker Compose](/devops/docker-compose-advanced/). А когда дойдёт до продакшна, есть гайд по [деплою на VPS](/devops/docker-deploy-vps/).

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

---
layout: default
lang: ru
title: "Docker: шпаргалка"
permalink: /cheats/docker/
description: "Команды контейнеров и образов, Dockerfile, docker compose, тома, сети, отладка и очистка — Docker одной страницей. Готовая закладка."
keywords: "docker шпаргалка, docker cheat sheet, docker команды, dockerfile, docker compose, docker volume, docker prune"
og_image: /assets/og-devops.png
translation_of: /en/cheats/docker/
---

<article class="article-body" markdown="1" style="max-width:820px; margin:calc(var(--nav-height) + 56px) auto 100px; padding:0 24px;">

# Docker: шпаргалка

Команды, которые покрывают 95% ежедневной работы с контейнерами. Сделай закладку. Подробные разборы — в статьях [Docker для новичка](/devops/docker-basics/), [пишем Dockerfile](/devops/docker-dockerfile/) и [docker compose](/devops/docker-compose-advanced/).

## Контейнеры

| Команда | Что делает |
|---|---|
| `docker run -d -p 8080:80 nginx` | Запустить в фоне, проброс порта |
| `docker run -it --rm ubuntu bash` | Интерактивно, удалить после выхода |
| `docker ps` / `docker ps -a` | Запущенные / все контейнеры |
| `docker logs -f <id>` | Логи в реальном времени |
| `docker exec -it <id> sh` | Шелл внутри контейнера |
| `docker stop <id>` / `docker start <id>` | Остановить / запустить |
| `docker rm <id>` | Удалить контейнер |
| `docker stats` | Использование CPU/RAM в реальном времени |

## Образы

```bash
docker images                    # список образов
docker build -t myapp:1.0 .      # собрать из Dockerfile
docker pull postgres:16          # скачать
docker tag myapp:1.0 myapp:latest
docker push registry/myapp:1.0   # загрузить в реестр
docker rmi <image>               # удалить образ
docker history myapp:1.0         # слои образа и их размер
```

## Dockerfile — основное

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./           # сначала зависимости — для кэша слоёв
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
USER node                       # не root в проде
CMD ["node", "server.js"]
```

> Порядок важен: то, что меняется реже — выше. Подробно: [пишем Dockerfile](/devops/docker-dockerfile/).

## docker compose

```bash
docker compose up -d             # поднять стек в фоне
docker compose down              # остановить и удалить
docker compose down -v           # + удалить тома (осторожно!)
docker compose ps                # статус сервисов
docker compose logs -f <сервис>  # логи одного сервиса
docker compose exec <сервис> sh  # шелл в сервисе
docker compose build --no-cache  # пересобрать с нуля
docker compose pull              # обновить образы
```

## Тома и данные

```bash
docker volume ls
docker volume create mydata
docker run -v mydata:/var/lib/postgresql/data postgres:16   # именованный том
docker run -v $(pwd):/app node:22                            # bind mount (код с хоста)
docker volume rm mydata
docker volume prune              # удалить неиспользуемые тома
```

## Сети

```bash
docker network ls
docker network create mynet
docker run --network mynet --name db postgres:16    # контейнеры видят друг друга по имени
docker network inspect mynet
```

## Отладка

```bash
docker inspect <id>              # вся метадата (JSON)
docker inspect -f '{% raw %}{{.State.Status}}{% endraw %}' <id>   # одно поле
docker logs --tail 100 <id>      # последние 100 строк
docker cp <id>:/app/log.txt .    # скопировать файл из контейнера
docker diff <id>                 # что изменилось в файловой системе
docker top <id>                  # процессы внутри
```

## Очистка (освободить место)

```bash
docker system df                 # сколько занято
docker container prune           # удалить остановленные контейнеры
docker image prune               # удалить «висячие» образы
docker image prune -a            # удалить все неиспользуемые образы
docker system prune -a --volumes # удалить ВСЁ неиспользуемое (агрессивно)
```

## .dockerignore

```gitignore
node_modules
.git
.env
dist
*.log
```

Без него `COPY . .` тащит в образ мусор и ломает кэш. Деплой на сервер с нуля — в статье про [VPS](/devops/docker-deploy-vps/).

</article>

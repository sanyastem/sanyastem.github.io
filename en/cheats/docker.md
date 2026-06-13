---
layout: default
lang: en
title: "Docker: cheat sheet"
permalink: /en/cheats/docker/
description: "Container and image commands, Dockerfile, docker compose, volumes, networks, debugging and cleanup — Docker on one page. Bookmark-ready."
keywords: "docker cheat sheet, docker commands, dockerfile, docker compose, docker volume, docker prune"
og_image: /assets/og-devops.png
translation_of: /cheats/docker/
---

<article class="article-body" markdown="1" style="max-width:820px; margin:calc(var(--nav-height) + 56px) auto 100px; padding:0 24px;">

# Docker: cheat sheet

The commands that cover 95% of daily container work. Bookmark it. Deep dives: [Docker for beginners](/en/devops/docker-basics/), [writing a Dockerfile](/en/devops/docker-dockerfile/) and [docker compose](/en/devops/docker-compose-advanced/).

## Containers

| Command | What it does |
|---|---|
| `docker run -d -p 8080:80 nginx` | Run detached, map a port |
| `docker run -it --rm ubuntu bash` | Interactive, remove on exit |
| `docker ps` / `docker ps -a` | Running / all containers |
| `docker logs -f <id>` | Follow logs in real time |
| `docker exec -it <id> sh` | Shell inside the container |
| `docker stop <id>` / `docker start <id>` | Stop / start |
| `docker rm <id>` | Remove a container |
| `docker stats` | Live CPU/RAM usage |

## Images

```bash
docker images                    # list images
docker build -t myapp:1.0 .      # build from a Dockerfile
docker pull postgres:16          # download
docker tag myapp:1.0 myapp:latest
docker push registry/myapp:1.0   # push to a registry
docker rmi <image>               # remove an image
docker history myapp:1.0         # layers and their sizes
```

## Dockerfile — the essentials

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./           # dependencies first — for layer caching
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
USER node                       # not root in production
CMD ["node", "server.js"]
```

> Order matters: rarely-changing things go higher. Details: [writing a Dockerfile](/en/devops/docker-dockerfile/).

## docker compose

```bash
docker compose up -d             # bring the stack up, detached
docker compose down              # stop and remove
docker compose down -v           # + remove volumes (careful!)
docker compose ps                # service status
docker compose logs -f <service> # logs of one service
docker compose exec <service> sh # shell into a service
docker compose build --no-cache  # rebuild from scratch
docker compose pull              # update images
```

## Volumes and data

```bash
docker volume ls
docker volume create mydata
docker run -v mydata:/var/lib/postgresql/data postgres:16   # named volume
docker run -v $(pwd):/app node:22                            # bind mount (host code)
docker volume rm mydata
docker volume prune              # remove unused volumes
```

## Networks

```bash
docker network ls
docker network create mynet
docker run --network mynet --name db postgres:16    # containers reach each other by name
docker network inspect mynet
```

## Debugging

```bash
docker inspect <id>              # full metadata (JSON)
docker inspect -f '{% raw %}{{.State.Status}}{% endraw %}' <id>   # one field
docker logs --tail 100 <id>      # last 100 lines
docker cp <id>:/app/log.txt .    # copy a file out of a container
docker diff <id>                 # what changed in the filesystem
docker top <id>                  # processes inside
```

## Cleanup (reclaim space)

```bash
docker system df                 # how much is used
docker container prune           # remove stopped containers
docker image prune               # remove dangling images
docker image prune -a            # remove all unused images
docker system prune -a --volumes # remove EVERYTHING unused (aggressive)
```

## .dockerignore

```gitignore
node_modules
.git
.env
dist
*.log
```

Without it, `COPY . .` drags junk into the image and breaks the cache. Deploying to a server from scratch — in the [VPS](/en/devops/docker-deploy-vps/) article.

</article>

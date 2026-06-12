---
layout: post
title: "Docker for beginners: containers in 10 minutes"
categories: devops
date: 2025-02-01
last_modified_at: 2026-06-12
read_time: 7
difficulty: beginner
description: "What a Docker container is, your first docker run, Dockerfile, and docker-compose on a simple example. Explained simply."
excerpt_text: "What a container is, your first docker run, and docker-compose on a simple example"
keywords: "docker, containers, dockerfile, docker-compose, docker for beginners, devops"
translation_of: "/devops/docker-basics/"
tldr:
  - "A container is an isolated process with its own filesystem; unlike a VM it doesn't carry a whole OS, starts in seconds and weighs megabytes."
  - "First run: docker run hello-world, then docker run -d -p 8080:80 nginx — a server on http://localhost:8080."
  - "A Dockerfile (FROM, WORKDIR, COPY, RUN, EXPOSE, CMD) is a reproducible recipe to build your own image: docker build -t my-app ."
  - "docker-compose orchestrates several linked services (app + db) with a single docker compose up; don't forget .dockerignore."
faq:
  - q: "How is a container different from a virtual machine?"
    a: "A VM virtualizes hardware and runs a whole guest OS — usually gigabytes of RAM and minutes to boot. A container shares the host kernel and isolates processes via namespaces/cgroups, so it weighs tens of megabytes and starts in seconds."
  - q: "Are images and containers the same?"
    a: "No. An image is an immutable template (like a class), a container is a running instance (like an object). From one image you can launch many containers in parallel with different env vars and ports."
  - q: "Why do I need a Dockerfile if there are ready-made images on Docker Hub?"
    a: "Ready-made images cover the basics — Postgres, Nginx, Node. You write your own Dockerfile when packaging your own application: copy code, install dependencies, set the start command. It's a reproducible build recipe."
  - q: "Are Docker and docker-compose different tools?"
    a: "Docker is the engine for one container. docker-compose is a wrapper that orchestrates multiple linked containers via one YAML file. For a project with DB + app + cache, compose is essential."
  - q: "Are containers safe for production?"
    a: "Relatively. Isolation is weaker than a VM, so root inside a container can break out under a misconfiguration. On production, you must: non-root user in Dockerfile, minimal base image (alpine/distroless), CVE scanning."
---

## What is a container

A container is an isolated process with its own filesystem and dependencies. Unlike a virtual machine, it doesn't bundle a whole OS — it starts in seconds and weighs megabytes.

Analogy: a container is like a zip archive with the application plus everything needed to run it.

## Installation

Download **Docker Desktop** from the official site. After install:

```bash
docker --version
# Docker version 28.x.x
```

## Your first container

```bash
docker run hello-world
```

Docker downloads the image, runs the container, and prints a hello message. Done — you have Docker working.

## Running an nginx web server

```bash
docker run -d -p 8080:80 nginx
```

- `-d` — detached (background)
- `-p 8080:80` — map host port 8080 to container port 80

Open `http://localhost:8080` — you'll see the default nginx page.

To stop:

```bash
docker ps                # list running containers
docker stop <id>         # stop by ID or name
```

## Writing your own Dockerfile

This is just the basic example — a detailed walkthrough of the instructions and multi-stage builds is in the [dedicated Dockerfile article](/en/devops/docker-dockerfile/).

For a Node.js app:

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

Build and run:

```bash
docker build -t myapp .
docker run -p 3000:3000 myapp
```

## docker-compose for multi-container apps

Advanced scenarios — healthchecks, profiles, dependencies — are in the [Docker Compose article](/en/devops/docker-compose-advanced/). And when you're ready for production, there's a guide to [deploying on a VPS](/en/devops/docker-deploy-vps/).

`docker-compose.yml`:

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    depends_on: [db]
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secret
    volumes:
      - dbdata:/var/lib/postgresql/data

volumes:
  dbdata:
```

One command brings up the whole stack:

```bash
docker compose up
```

> 💡 Add `.dockerignore` next to your `Dockerfile` and put `node_modules`, `.git`, `.env` in it — they shouldn't end up inside the image.

## Common commands

```bash
docker ps -a               # all containers
docker images              # all images
docker logs <id>           # container logs
docker exec -it <id> sh    # shell inside container
docker rm <id>             # delete container
docker rmi <id>            # delete image
docker system prune        # clean unused
```

## Summary

- A container is an isolated process, not a VM
- An image is a template; a container is a running instance
- Dockerfile describes how to build your image
- docker-compose orchestrates multiple containers
- One `docker compose up` brings up the whole stack — that's the point of Docker

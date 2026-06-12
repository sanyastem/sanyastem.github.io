---
layout: post
title: "Docker Compose: orchestrating multi-container apps"
categories: devops
date: 2025-02-22
last_modified_at: 2026-05-08
read_time: 9
difficulty: intermediate
series: "Docker: from install to production"
part: 3
description: "A complete walkthrough of docker-compose.yml: networks, volumes, environment variables, health checks, profiles, and deploy to a server."
excerpt_text: "Networks, volumes, env vars, health checks and deploy via docker-compose"
keywords: "docker-compose, docker networks, volumes, health check, docker profiles, docker deploy"
translation_of: "/devops/docker-compose-advanced/"
tldr:
  - "Compose describes all services (app, postgres:16-alpine, redis:7-alpine) in one docker-compose.yml and brings them up with a single docker-compose up -d."
  - "depends_on only sets startup order; to wait until the database is actually ready you need a healthcheck (pg_isready) plus condition: service_healthy."
  - "Keep secrets in a .env file next to the compose file and add it to .gitignore — Compose picks up variables like POSTGRES_PASSWORD automatically."
  - "Profiles split configurations: docker-compose --profile dev up -d starts pgadmin only in dev; docker-compose down -v also deletes volume data."
faq:
  - q: "docker-compose vs Kubernetes — when to use which?"
    a: "Compose — a single server, dev/staging, up to 10 services. Kubernetes — multiple servers, auto-scaling, production with high availability. For an MVP or a blog — Compose; for scalable SaaS — K8s."
  - q: "depends_on vs healthcheck — what is the difference?"
    a: "depends_on sets the startup order but does not wait for the service to be ready. healthcheck verifies the container is actually ready to accept requests. For databases it is a must: depends_on with condition: service_healthy."
  - q: "Where do I keep the .env with passwords for compose?"
    a: "A .env file next to docker-compose.yml, added to .gitignore. Compose picks up the variables automatically. In production — Docker secrets or an external vault (HashiCorp, AWS Secrets Manager)."
  - q: "Can I run compose in production?"
    a: "Yes, for small single-server deployments it is the norm. Use a separate compose.prod.yml with restart: always, no bind mounts of the code, and mandatory volume backups."
---

## Why Docker Compose

Real applications have multiple services: backend, frontend, database, Redis, task queue. Starting each one manually with `docker run` is tedious. Compose describes all the services in one file and brings them up with a single command. (Basics are in [Docker for beginners](/en/devops/docker-basics/), images in the [Dockerfile article](/en/devops/docker-dockerfile/).)

## docker-compose.yml structure

```yaml
version: '3.9'

services:       # List of services (containers)
  app:
    build: .
    ports:
      - "3000:3000"

networks:       # Custom networks (optional)
  backend:

volumes:        # Named volumes for persistent data
  pgdata:
```

## Full example: app + PostgreSQL + Redis

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
        condition: service_healthy    # Wait until db is ready
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

## Environment variables via .env

Don't hard-code secrets in `docker-compose.yml`. Use a `.env` file (and don't forget to add it to [.gitignore](/en/git/gitignore/)):

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

> ⚠️ Add `.env` to `.gitignore`! For CI/CD use a `.env.example` with placeholders.

## Health checks — wait for the service to be ready

Without `depends_on + condition` the backend starts before the database is up, gets a connection error and crashes.

```yaml
db:
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
    interval: 10s     # Check every 10 seconds
    timeout: 5s       # Per-check timeout
    retries: 5        # After 5 failures — unhealthy
    start_period: 30s # Don't count failures during the first 30 seconds
```

## Profiles — different configs for dev and prod

```yaml
services:
  app:
    build: .
    # No profile — always starts

  pgadmin:
    image: dpage/pgadmin4
    profiles:
      - dev          # Dev mode only
    ports:
      - "5050:80"

  nginx:
    image: nginx:alpine
    profiles:
      - prod         # Production only
```

```bash
# Start only the dev profile
docker-compose --profile dev up -d

# Start the prod profile
docker-compose --profile prod up -d
```

## Common commands

```bash
# Start everything in the background
docker-compose up -d

# Tail logs from all services
docker-compose logs -f

# Logs of a specific service
docker-compose logs -f app

# Run a command inside a running container
docker-compose exec app sh

# Stop without removing data
docker-compose stop

# Stop and remove containers (volumes data stays)
docker-compose down

# Remove everything including volumes (CAREFUL — wipes the DB!)
docker-compose down -v
```

> 💡 For local dev, create a `docker-compose.override.yml` — it's auto-merged with the main file and lets you mount code for hot-reload without touching the main compose file.

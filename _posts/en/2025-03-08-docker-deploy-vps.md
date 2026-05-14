---
layout: post
title: "Docker: deploying to a VPS from scratch"
categories: devops
date: 2025-03-08
last_modified_at: 2026-05-08
read_time: 10
difficulty: intermediate
series: "Docker: from install to production"
part: 4
description: "Renting a VPS, installing Docker, deploying via docker-compose, configuring Nginx, and automating deploy with GitHub Actions."
excerpt_text: "VPS, Docker, Nginx and auto-deploy via GitHub Actions — the full path from code to production"
keywords: "docker vps deploy, docker-compose production, nginx reverse proxy docker, github actions docker deploy, server deploy"
translation_of: "/devops/docker-deploy-vps/"
---

## What you need to start

- A VPS with Ubuntu 22.04 (any provider: Hetzner, DigitalOcean, Timeweb)
- A domain or just an IP address
- Locally: an SSH client and a repo with `Dockerfile` + `docker-compose.yml`

## Connecting to the server

```bash
ssh root@YOUR_SERVER_IP
```

First thing — update the system and create a user instead of root:

```bash
apt update && apt upgrade -y

# Create a user
adduser deploy
usermod -aG sudo deploy

# Copy the SSH key for the new user
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

## Installing Docker

```bash
# Official install script
curl -fsSL https://get.docker.com | sh

# Add the user to the docker group (no sudo needed)
usermod -aG docker deploy

# Verify
docker --version
docker compose version
```

> 💡 After `usermod` you need to log out and back in: `exit` and then `ssh deploy@IP`.

## Cloning the project to the server

```bash
# On the server
cd /home/deploy
git clone https://github.com/your-user/your-repo.git app
cd app
```

If the repo is private — add the server's SSH key to GitHub:

```bash
# Generate the key on the server
ssh-keygen -t ed25519 -C "deploy@server"

# Copy the public key
cat ~/.ssh/id_ed25519.pub
# Add it to GitHub → Settings → Deploy keys
```

## Configuring environment variables

```bash
# On the server create .env (don't commit it to git!)
cp .env.example .env
nano .env
```

```bash
# .env on the server
POSTGRES_USER=myuser
POSTGRES_PASSWORD=strong_password_here
POSTGRES_DB=myapp
APP_PORT=3000
NODE_ENV=production
```

## Starting the app

```bash
# Build images and start in the background
docker compose up -d --build

# Check status
docker compose ps

# View logs
docker compose logs -f app
```

If everything's up — the app is reachable at `http://IP:3000`.

## Nginx as a reverse proxy

Nginx accepts requests on 80/443 and proxies them into the container. Without it you don't get HTTPS or a clean domain.

Add Nginx to `docker-compose.yml`:

```yaml
services:
  app:
    build: .
    expose:
      - "3000"       # Port exposed only inside the Docker network
    networks:
      - web

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
    depends_on:
      - app
    networks:
      - web

networks:
  web:
    driver: bridge
```

The `nginx/default.conf` config:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass         http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

> 💡 For HTTPS — use [Certbot](https://certbot.eff.org/) or swap Nginx for **Caddy**: it grabs an SSL certificate automatically with no config.

## Auto-deploy via GitHub Actions

Every push to `main` triggers an automatic deploy to the server.

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host:     ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key:      ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /home/deploy/app
            git pull origin main
            docker compose up -d --build
            docker image prune -f
```

Add the secrets in GitHub → Settings → Secrets and variables → Actions:
- `SERVER_HOST` — server IP
- `SERVER_USER` — `deploy`
- `SERVER_SSH_KEY` — private key (`cat ~/.ssh/id_ed25519`)

## Useful server-side commands

```bash
# See what's taking up space
docker system df

# Remove unused images and layers
docker system prune -f

# Restart one service without downtime
docker compose up -d --no-deps --build app

# Shell into a container
docker compose exec app sh

# Database backup
docker compose exec db pg_dump -U myuser myapp > backup_$(date +%Y%m%d).sql
```

> ⚠️ Always check `docker compose logs` after deploy — the container can start but crash inside.

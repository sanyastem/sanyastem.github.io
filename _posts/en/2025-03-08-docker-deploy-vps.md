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
tldr:
  - "Minimum for Docker on a VPS — 2 CPUs and 4 GB RAM (Hetzner from €4.5/mo); Docker installs with one command: curl -fsSL https://get.docker.com | sh."
  - "Create a deploy user (usermod -aG docker deploy), clone the repo, fill in .env and run docker compose up -d --build — the app is live on port 3000."
  - "Nginx in compose proxies 80/443 to app:3000 via proxy_pass; the app container is not reachable from outside — it uses expose instead of ports."
  - "Auto-deploy: a workflow on push to main connects over SSH (appleboy/ssh-action), runs git pull, docker compose up -d --build and docker image prune -f."
faq:
  - q: "Which VPS should I pick for Docker?"
    a: "At least 2 CPUs + 4 GB RAM — otherwise you hit swap during builds. Hetzner CX22 (€4.5/mo), DigitalOcean Basic ($6), Vultr — the best price/performance ratios. Hetzner is cheaper in the EU; AWS Lightsail is pricier but more convenient for multi-region."
  - q: "Do I need Kubernetes if I have 1 server?"
    a: "No. For a single server docker-compose is enough. K8s gives auto-scaling, self-healing and rolling updates — but requires 3+ nodes and an admin. Overkill for pet projects and MVPs, a must for enterprise."
  - q: "How do I update a container without downtime?"
    a: "Via an nginx reverse proxy + docker compose up -d with a healthcheck. Compose replaces the old container only after the new one passes the healthcheck. The alternative is a blue/green deploy: run the new version in parallel, switch nginx over, shut down the old one."
  - q: "How do I back up data from volumes?"
    a: "The simplest: docker run --rm -v db_data:/data -v $(pwd):/backup alpine tar czf /backup/db-$(date +%Y%m%d).tar.gz /data. Run it via cron once a day. For databases, mysqldump/pg_dump inside the container is better: docker exec db mysqldump > backup.sql."
---

## What you need to start

- A VPS with Ubuntu 22.04 (any provider: Hetzner, DigitalOcean, Timeweb)
- A domain or just an IP address
- Locally: an SSH client and a repo with a [`Dockerfile`](/en/devops/docker-dockerfile/) + [`docker-compose.yml`](/en/devops/docker-compose-advanced/)

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

Every push to `main` triggers an automatic deploy to the server (Actions basics are in a [separate article](/en/devops/github-actions/)).

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

---
layout: post
title: "Docker: деплой на VPS с нуля"
categories: devops
date: 2025-03-08
date_ru: "8 марта 2025"
last_modified_at: 2026-05-08
read_time: 10
difficulty: intermediate
series: "Docker: от установки до продакшна"
part: 4
description: "Арендуем VPS, устанавливаем Docker, деплоим через docker-compose, настраиваем Nginx и автоматизируем деплой через GitHub Actions."
excerpt_text: "VPS, Docker, Nginx и автодеплой через GitHub Actions — полный путь от кода до продакшна"
keywords: "docker vps деплой, docker-compose продакшн, nginx reverse proxy docker, github actions docker deploy, деплой на сервер"
howto:
  name: "Развернуть Docker-приложение на VPS"
  totalTime: "PT30M"
  steps:
    - name: "Купить и подготовить VPS"
      text: "Hetzner / DigitalOcean / Vultr — 2 CPU + 4GB RAM от €4.5/мес. Ubuntu 22.04 или 24.04 LTS. SSH-ключ обязательно, без пароля."
    - name: "Установить Docker + Compose"
      text: "curl -fsSL https://get.docker.com | sh; sudo usermod -aG docker $USER. Logout/login. Compose v2 уже встроен через docker compose."
    - name: "Настроить firewall"
      text: "ufw allow 22 (SSH); ufw allow 80, 443 (HTTP/HTTPS); ufw enable. Закрыть все остальные порты — БД и API не должны быть доступны извне."
    - name: "Подготовить docker-compose.yml для production"
      text: "restart: always, без bind-mounts на код (используй COPY в Dockerfile), volumes для БД, nginx как reverse proxy для HTTPS."
    - name: "Получить SSL через Let's Encrypt"
      text: "Использовать nginx-proxy-acme или Caddy — автоматическое получение и обновление сертификатов. Один volume для сертификатов, монтируется в nginx."
    - name: "Настроить auto-deploy через GitHub Actions"
      text: "Workflow на push в main: SSH на VPS, git pull, docker compose up -d --build. SSH-ключ в Secrets. Деплой за 30-60 секунд после push."
faq:
  - q: "Какой VPS выбрать для Docker?"
    a: "Минимум 2 CPU + 4 GB RAM — иначе своп при сборке. Hetzner CX22 (€4.5/мес), DigitalOcean Basic ($6), Vultr — лучшие соотношения цена/производительность. Hetzner дешевле в EU, AWS Lightsail дороже но удобнее для multi-region."
  - q: "Нужен ли Kubernetes если у меня 1 сервер?"
    a: "Нет. Для 1 сервера достаточно docker-compose. K8s даёт авто-масштабирование, self-healing, rolling updates — но требует 3+ узла и админа. Для пет-проектов и MVP overkill, для энтерпрайза — обязательно."
  - q: "Как обновлять контейнер без downtime?"
    a: "Через nginx reverse proxy + docker compose up -d с healthcheck. Compose заменит старый контейнер только после того как новый пройдёт healthcheck. Альтернатива — blue/green deploy: запускаешь параллельно новую версию, переключаешь nginx, гасишь старую."
  - q: "Как сделать backup данных из volumes?"
    a: "Самое простое: docker run --rm -v db_data:/data -v $(pwd):/backup alpine tar czf /backup/db-$(date +%Y%m%d).tar.gz /data. По cron раз в сутки. Для БД — лучше mysqldump/pg_dump внутри контейнера: docker exec db mysqldump > backup.sql."
---

## Что нужно для старта

- VPS с Ubuntu 22.04 (от любого провайдера: Hetzner, DigitalOcean, Timeweb)
- Домен или просто IP-адрес
- Локально: SSH-клиент и репозиторий с `Dockerfile` + `docker-compose.yml`

## Подключаемся к серверу

```bash
ssh root@YOUR_SERVER_IP
```

Первым делом — обновляем систему и создаём пользователя вместо root:

```bash
apt update && apt upgrade -y

# Создаём пользователя
adduser deploy
usermod -aG sudo deploy

# Копируем SSH-ключ для нового пользователя
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

## Устанавливаем Docker

```bash
# Официальный скрипт установки
curl -fsSL https://get.docker.com | sh

# Добавляем пользователя в группу docker (не нужен sudo)
usermod -aG docker deploy

# Проверяем
docker --version
docker compose version
```

> 💡 После `usermod` нужно перелогиниться: `exit` и снова `ssh deploy@IP`.

## Клонируем проект на сервер

```bash
# На сервере
cd /home/deploy
git clone https://github.com/your-user/your-repo.git app
cd app
```

Если репозиторий приватный — добавь SSH-ключ сервера в GitHub:

```bash
# Генерируем ключ на сервере
ssh-keygen -t ed25519 -C "deploy@server"

# Копируем публичный ключ
cat ~/.ssh/id_ed25519.pub
# Добавляем в GitHub → Settings → Deploy keys
```

## Настраиваем переменные окружения

```bash
# На сервере создаём .env (не коммитим его в git!)
cp .env.example .env
nano .env
```

```bash
# .env на сервере
POSTGRES_USER=myuser
POSTGRES_PASSWORD=strong_password_here
POSTGRES_DB=myapp
APP_PORT=3000
NODE_ENV=production
```

## Запускаем приложение

```bash
# Собрать образы и запустить в фоне
docker compose up -d --build

# Проверить статус
docker compose ps

# Посмотреть логи
docker compose logs -f app
```

Если всё запустилось — приложение доступно на `http://IP:3000`.

## Nginx как reverse proxy

Nginx принимает запросы на 80/443 и проксирует их в контейнер. Без него не будет HTTPS и красивого домена.

Добавляем Nginx в `docker-compose.yml`:

```yaml
services:
  app:
    build: .
    expose:
      - "3000"       # Порт открыт только внутри сети Docker
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

Конфиг `nginx/default.conf`:

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

> 💡 Для HTTPS — используй [Certbot](https://certbot.eff.org/) или замени Nginx на **Caddy**: он сам получает SSL-сертификат без настройки.

## Автодеплой через GitHub Actions

Каждый пуш в `main` — автоматический деплой на сервер.

Создай `.github/workflows/deploy.yml`:

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

Добавь секреты в GitHub → Settings → Secrets and variables → Actions:
- `SERVER_HOST` — IP сервера
- `SERVER_USER` — `deploy`
- `SERVER_SSH_KEY` — приватный ключ (`cat ~/.ssh/id_ed25519`)

## Полезные команды на сервере

```bash
# Смотрим что занимает место
docker system df

# Удаляем неиспользуемые образы и слои
docker system prune -f

# Перезапустить один сервис без даунтайма
docker compose up -d --no-deps --build app

# Зайти в контейнер
docker compose exec app sh

# Бэкап базы данных
docker compose exec db pg_dump -U myuser myapp > backup_$(date +%Y%m%d).sql
```

> ⚠️ Всегда проверяй `docker compose logs` после деплоя — контейнер может стартовать, но падать внутри.

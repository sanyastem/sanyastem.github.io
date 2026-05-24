---
layout: post
title: "Docker BuildKit cache в GitHub Actions: -80% времени .NET-билда"
categories: devops
translation_of: "/en/devops/docker-buildkit-cache-github-actions/"
date: 2026-05-08
date_ru: "8 мая 2026"
read_time: 8
difficulty: intermediate
description: "Как сократить время сборки .NET-образа в Docker с 6 минут до 1.5 через BuildKit cache-from/cache-to с типом gha. Полный workflow, multi-stage Dockerfile, причины cache miss."
excerpt_text: "BuildKit cache в Actions: с 6 минут до 1.5 на .NET-проекте — полный workflow, multi-stage Dockerfile, разбор cache miss"
keywords: "docker buildkit cache github actions, dotnet docker cache, cache-from gha, buildx, multi-stage dockerfile .net"
---

Сборка .NET-образа в GitHub Actions без кэша занимает 5-7 минут. С правильно настроенным BuildKit-кэшем — 1-1.5. Разница — экономия часов в неделю на CI и более быстрый feedback на PR.

## Почему обычный Docker cache не работает в Actions

Каждый job на GitHub Actions запускается на чистой VM — слои образов из предыдущей сборки не сохраняются между ранами. `docker build` работает «как будто впервые» — скачивает базовый образ, восстанавливает все NuGet-пакеты, пересобирает с нуля.

Стандартный `actions/cache` спасёт `~/.nuget/packages`, но сборку **внутри Docker** не ускорит — кэш живёт на хосте, а в контейнере его нет.

Решение: **BuildKit** умеет экспортировать слои образа во внешнее хранилище и подтягивать их перед сборкой. С версии 0.10+ есть бэкенд `gha` — кэш живёт в нативном GitHub Actions cache (10 GB, бесплатно).

## Полный workflow для .NET

{% raw %}
```yaml
name: Build & Push

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: ${{ github.event_name != 'pull_request' }}
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          platforms: linux/amd64
```
{% endraw %}

Ключевые строки — `cache-from: type=gha` и `cache-to: type=gha,mode=max`. Первый раз кэш пустой, сборка идёт полностью. Все последующие — BuildKit сравнивает слои с кэшем и переиспользует неизменённые.

`mode=max` экспортирует **все** промежуточные слои, не только финальные — для multi-stage критично.

## Dockerfile, который реально кэшируется

Главное правило — слои с **редко меняющимися** данными должны быть до слоёв с **часто меняющимися**. У большинства .NET-проектов так:

```dockerfile
# syntax=docker/dockerfile:1.7
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# 1. Копируем только .csproj — слой инвалидируется только при
#    изменении зависимостей (а не на каждый правленный .cs)
COPY *.sln .
COPY src/Api/Api.csproj src/Api/
COPY src/Domain/Domain.csproj src/Domain/

# 2. Restore — самый долгий шаг (~1 мин). Кэшируется до изменения .csproj
RUN dotnet restore --no-cache

# 3. Копируем остальной код — этот слой инвалидируется на каждом коммите,
#    но restore выше уже закэширован
COPY . .

# 4. Build + publish
RUN dotnet publish src/Api/Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app/publish .
USER 1000
ENTRYPOINT ["dotnet", "Api.dll"]
```

Если ты копируешь `COPY . .` **в начале** — каждое изменение `.cs` файла инвалидирует слой restore. Все NuGet-пакеты будут скачиваться заново. На .NET-проекте это +2-3 минуты на каждый билд.

## Реальные цифры

Проект — Api на .NET 9, ~30 NuGet-пакетов, ~150 .cs файлов:

| Билд | Время | Что кэшировано |
|---|---|---|
| Первый (cache miss) | 5:42 | Ничего |
| Изменение README | 0:48 | Всё (cache hit на финальный слой) |
| Изменение `.cs` файла | 1:24 | Restore + base image |
| Добавление NuGet-пакета | 3:12 | Только base image |
| Обновление .NET SDK base image | 5:30 | Почти ничего |

Среднее по реальным PR — **~1:30**. Это в 4 раза быстрее некэшированной сборки.

## Подводные камни

### 10 GB лимит и eviction

GitHub Actions cache имеет жёсткий лимит **10 GB на репозиторий**. Если превысил — старые ключи вытесняются по LRU. Multi-stage с тяжёлыми слоями (~1-2 GB) может «забивать» кэш. Чисти ручками через `gh cache delete` или ожидай естественной очистки.

### `mode=max` vs `mode=min`

- `min` — кэширует только финальные слои финального этапа multi-stage. Маленький, но если меняешь Dockerfile — почти всё пересобирается.
- `max` — кэширует все промежуточные слои. Больше места, но восстановление с любой точки.

Для .NET — всегда `max`. Для микро-Dockerfile из 3 строк — `min` ок.

### Cache miss из-за `.dockerignore`

Если `.dockerignore` некорректный, в context попадают файлы, которые меняются часто (например, `bin/`, `obj/`). `COPY . .` инвалидируется на каждом билде. Минимальный `.dockerignore`:

```
bin/
obj/
.git/
.github/
.vs/
*.user
**/node_modules/
```

Сделай `docker build --progress=plain .` локально и проверь, какие файлы реально попадают в context.

<div class="warn-block">
<span class="tip-icon">⚠️</span>
<p>Если меняешь base image FROM (например, обновил .NET SDK с 9.0.0 до 9.0.1) — кэш ровно ноль. Это нормально. Не пытайся «зафиксировать» через digest без причины — пропустишь security-патчи.</p>
</div>

### Параллельные джобы и race condition

Если два PR одновременно пушат в кэш одного и того же ключа — последний выигрывает. Не критично, но иногда вылезает в виде «у меня закэшировалось, у коллеги нет». Для shared-кэша используй scope:

{% raw %}
```yaml
cache-from: type=gha,scope=${{ github.ref_name }}
cache-to: type=gha,mode=max,scope=${{ github.ref_name }}
```
{% endraw %}

Каждая ветка получает свой кэш.

## Альтернативы — registry cache

Если 10 GB GHA cache мало, кэш можно сложить в OCI-registry (тот же GHCR):

{% raw %}
```yaml
cache-from: type=registry,ref=ghcr.io/${{ github.repository }}:buildcache
cache-to: type=registry,ref=ghcr.io/${{ github.repository }}:buildcache,mode=max
```
{% endraw %}

Плюсы — нет лимита размера, доступен из других репо. Минусы — медленнее (push/pull через сеть), занимает место в registry.

## Итого

- BuildKit cache `type=gha` ускоряет .NET-билды в 3-4 раза, бесплатно.
- Структура Dockerfile решает: `.csproj` сначала → `restore` → код → `build`.
- `mode=max` для multi-stage — обязательно.
- Минимальный `.dockerignore` — без него `COPY . .` инвалидируется на пустом месте.
- 10 GB лимит — учитывай при больших проектах, scope по веткам помогает.
- Изменил base image — кэш сброшен, это норма.

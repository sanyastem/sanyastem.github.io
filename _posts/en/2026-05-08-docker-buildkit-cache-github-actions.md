---
layout: post
title: "Docker BuildKit cache in GitHub Actions: -80% .NET build time"
categories: devops
date: 2026-05-08
read_time: 8
difficulty: intermediate
description: "How to cut Docker .NET image build time from 6 minutes to 1.5 via BuildKit cache-from/cache-to with type=gha. Full workflow, multi-stage Dockerfile, cache miss reasons."
excerpt_text: "BuildKit cache in Actions: from 6 min to 1.5 on a .NET project — full workflow, multi-stage Dockerfile, cache miss analysis"
keywords: "docker buildkit cache github actions, dotnet docker cache, cache-from gha, buildx, multi-stage dockerfile .net"
translation_of: "/devops/docker-buildkit-cache-github-actions/"
tldr:
  - "BuildKit cache with cache-from/cache-to type=gha cuts a .NET image build in Actions from 5-7 minutes to ~1.5 — the cache lives in GitHub Actions cache (10 GB, free)."
  - "mode=max is mandatory for multi-stage: it exports all intermediate layers, not just the final ones; mode=min only suits micro-Dockerfiles."
  - "Layer order decides everything: first COPY *.csproj and dotnet restore, then COPY . . — otherwise any edited .cs file invalidates restore (+2-3 minutes per build)."
  - "Common cache-miss causes: extra files in the context due to an incomplete .dockerignore (bin/, obj/), an updated base image and LRU eviction past the 10 GB limit."
---

A .NET Docker image build in GitHub Actions without cache takes 5-7 minutes. With BuildKit cache properly set up — 1-1.5. The difference is hours of CI time saved per week and faster PR feedback.

## Why regular Docker cache doesn't work in Actions

Each GitHub Actions job runs on a clean VM — image layers from the previous build don't persist between runs. `docker build` works "as if for the first time" — pulls the base image, restores all NuGet packages, rebuilds from scratch.

The standard `actions/cache` saves `~/.nuget/packages`, but it won't speed up the build **inside Docker** — the cache lives on the host, not in the container.

The solution: **BuildKit** can export image layers to external storage and pull them back before building. Since 0.10+ there's a `gha` backend — the cache lives in native GitHub Actions cache (10 GB, free).

## Full workflow for .NET

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

The key lines — `cache-from: type=gha` and `cache-to: type=gha,mode=max`. First run: cache is empty, full build. All subsequent runs: BuildKit compares layers against cache and reuses unchanged ones.

`mode=max` exports **all** intermediate layers, not just final ones — critical for multi-stage.

## A Dockerfile that actually caches

Main rule — layers with **rarely changing** data go before layers with **frequently changing** data. For most .NET projects:

```dockerfile
# syntax=docker/dockerfile:1.7
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# 1. Copy only .csproj — this layer invalidates only when
#    dependencies change (not every edited .cs file)
COPY *.sln .
COPY src/Api/Api.csproj src/Api/
COPY src/Domain/Domain.csproj src/Domain/

# 2. Restore — the slowest step (~1 min). Cached until .csproj changes
RUN dotnet restore --no-cache

# 3. Copy the rest of the code — this layer invalidates on every commit,
#    but the restore above is already cached
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

If you do `COPY . .` **at the start** — every `.cs` change invalidates the restore layer. All NuGet packages get re-downloaded. On a .NET project that's +2-3 minutes per build.

## Real numbers

Project — a .NET 9 Api, ~30 NuGet packages, ~150 .cs files:

| Build | Time | What's cached |
|---|---|---|
| First (cache miss) | 5:42 | Nothing |
| README change | 0:48 | Everything (cache hit on final layer) |
| `.cs` file change | 1:24 | Restore + base image |
| New NuGet package | 3:12 | Base image only |
| .NET SDK base image update | 5:30 | Almost nothing |

Average across real PRs — **~1:30**. That's 4× faster than uncached builds.

## Pitfalls

### 10 GB limit and eviction

GitHub Actions cache has a hard **10 GB per repo** limit. Exceed it — old keys get evicted by LRU. Multi-stage with heavy layers (~1-2 GB) can "fill" the cache. Clean manually via `gh cache delete` or wait for natural eviction.

### `mode=max` vs `mode=min`

- `min` — caches only final layers of the final multi-stage stage. Small, but if you change the Dockerfile almost everything rebuilds.
- `max` — caches all intermediate layers. More space, but resumable from any point.

For .NET — always `max`. For a tiny 3-line Dockerfile — `min` is fine.

### Cache miss due to `.dockerignore`

If `.dockerignore` is wrong, the context includes frequently-changing files (e.g., `bin/`, `obj/`). `COPY . .` invalidates on every build. Minimal `.dockerignore`:

```
bin/
obj/
.git/
.github/
.vs/
*.user
**/node_modules/
```

Run `docker build --progress=plain .` locally and check which files actually go into the context.

<div class="warn-block">
<span class="tip-icon">⚠️</span>
<p>If you change a base image FROM (e.g., updated .NET SDK from 9.0.0 to 9.0.1) — cache is zero. That's normal. Don't try to "pin" via digest without a reason — you'll miss security patches.</p>
</div>

### Parallel jobs and race condition

If two PRs push to the same cache key at the same time — the last writer wins. Not critical, but sometimes shows up as "it cached for me, not for my colleague". For shared cache, use scope:

{% raw %}
```yaml
cache-from: type=gha,scope=${{ github.ref_name }}
cache-to: type=gha,mode=max,scope=${{ github.ref_name }}
```
{% endraw %}

Each branch gets its own cache.

## Alternatives — registry cache

If 10 GB GHA cache is not enough, store cache in an OCI registry (the same GHCR):

{% raw %}
```yaml
cache-from: type=registry,ref=ghcr.io/${{ github.repository }}:buildcache
cache-to: type=registry,ref=ghcr.io/${{ github.repository }}:buildcache,mode=max
```
{% endraw %}

Pros — no size limit, accessible from other repos. Cons — slower (push/pull over the network), takes space in the registry.

## Summary

- BuildKit cache `type=gha` speeds up .NET builds 3-4×, for free.
- Dockerfile structure is the key: `.csproj` first → `restore` → code → `build`.
- `mode=max` for multi-stage — mandatory.
- A minimal `.dockerignore` — without it `COPY . .` invalidates for no reason.
- 10 GB limit — keep in mind for big projects; per-branch scope helps.
- Changed a base image — cache is dropped, that's normal.

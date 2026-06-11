---
layout: post
title: "Docker: writing a Dockerfile and building images"
categories: devops
date: 2025-02-08
last_modified_at: 2026-05-08
read_time: 8
difficulty: intermediate
series: "Docker: from install to production"
part: 2
description: "A walkthrough of every Dockerfile instruction, image layers, build cache and optimization — how to shrink your image several times over."
excerpt_text: "Dockerfile instruction by instruction, layers, build cache and image size optimization"
keywords: "dockerfile, docker image, docker build, docker layers, docker optimization, multi-stage"
translation_of: "/devops/docker-dockerfile/"
tldr:
  - "Every Dockerfile instruction creates a layer and layers are cached: put rarely-changing parts (COPY package*.json and RUN npm ci) above the code — COPY . . goes last."
  - "A multi-stage build (FROM ... AS builder, then COPY --from=builder) shrinks the image 5-10x: a Node.js project goes from 1.2 GB to 120 MB."
  - "Alpine images save space: node:20 weighs 1.1 GB, node:20-alpine — 180 MB; clean the apt cache in the same RUN instruction (rm -rf /var/lib/apt/lists/*)."
  - "Add node_modules, .git and .env to .dockerignore; never run production containers as root — set USER node before CMD."
faq:
  - q: "CMD vs ENTRYPOINT — what is the difference?"
    a: "ENTRYPOINT defines the executable (it always runs), CMD provides default arguments (can be overridden in docker run). A typical combo: ENTRYPOINT set to node plus CMD set to server.js. If you keep only CMD, the user can replace the command entirely."
  - q: "Why is my image too big?"
    a: "Most often: a python:latest base image (1 GB) instead of python:3.12-slim (50 MB), copying node_modules instead of running npm ci inside the Dockerfile, no .dockerignore, and a single stage instead of multi-stage. Run docker history image_name to see which layer is bloated."
  - q: "What is a multi-stage build?"
    a: "Multiple FROM statements in one Dockerfile. The first stage is the build (with the compiler and all the tooling), the second is the runtime (minimal, only the output is copied via COPY --from=build). The final image is 10x smaller: for .NET, 250 MB instead of 2 GB."
  - q: "Why COPY package.json separately from the code?"
    a: "Docker caches layers. If package.json has not changed, npm install will not run again — saving 30-60 seconds on every build. Copy all the code in one line and any .js edit invalidates the install. Rule: copy what changes rarely first."
---

## How a Docker image is structured

An image is a stack of layers. Each instruction in the Dockerfile creates a new layer. Layers are cached: if a file hasn't changed, Docker doesn't rebuild that layer.

This is critical for build speed. Wrong instruction order — and the cache gets invalidated on every code change.

## All the main Dockerfile instructions

```dockerfile
# FROM — base image. Always the first instruction
FROM node:20-alpine

# WORKDIR — working directory inside the container
# Better to set it explicitly than work in root
WORKDIR /app

# COPY — copy files from host into the container
COPY package*.json ./

# RUN — execute a command at build time
RUN npm ci --only=production

# COPY the rest of the code (after installing dependencies!)
COPY . .

# ENV — environment variables
ENV NODE_ENV=production
ENV PORT=3000

# EXPOSE — documents the port (doesn't open it by itself!)
EXPOSE 3000

# USER — run as a non-privileged user
USER node

# CMD — default command when starting the container
CMD ["node", "index.js"]

# ENTRYPOINT — fixed entry point (not overridden at run time)
# ENTRYPOINT ["node"]
```

## The right order for caching

Main rule: **what changes less often goes higher, what changes more often goes lower**.

```dockerfile
# ❌ Bad — any code change reinstalls dependencies
FROM node:20-alpine
WORKDIR /app
COPY . .              # Copy everything at once
RUN npm install       # This layer is invalidated by ANY file change
CMD ["node", "index.js"]
```

```dockerfile
# ✅ Good — dependencies cached separately from code
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./   # Only package.json — rarely changes
RUN npm ci              # This layer is cached until package.json changes
COPY . .                # Code changes often, but dependencies are already cached
CMD ["node", "index.js"]
```

## Multi-stage builds — shrinking the image

A classic problem: you need dev tools (compilers, tests) for the build, but in production you don't. Multi-stage solves this:

```dockerfile
# Stage 1: build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci                   # Install ALL dependencies including devDependencies
COPY . .
RUN npm run build            # Build the project

# Stage 2: production image
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production  # Production dependencies only
COPY --from=builder /app/dist ./dist  # Take only built files from stage 1

USER node
CMD ["node", "dist/index.js"]
```

> 💡 A multi-stage image can be 5-10x smaller. A Node.js project: 1.2 GB → 120 MB.

## Image size optimization

**Use alpine images** — they're minimal:

```dockerfile
# ❌ 1.1 GB
FROM node:20

# ✅ 180 MB
FROM node:20-alpine
```

**Clean the package manager cache in the same RUN instruction:**

```dockerfile
# ❌ Cache stays in the layer
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get clean

# ✅ All in one layer, cache removed
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
```

**Don't copy junk — use .dockerignore:**

```
node_modules
.git
.env
*.log
dist
coverage
```

## Useful commands during development

```bash
# Build an image with a tag
docker build -t myapp:1.0 .

# Inspect layers and their sizes
docker history myapp:1.0

# Check image size
docker images myapp

# Run and shell in for debugging
docker run -it myapp:1.0 sh

# Run with code mounted (for development)
docker run -p 3000:3000 -v $(pwd):/app myapp:1.0
```

> ⚠️ Never run a container as root in production. Always add `USER node` (or another non-privileged user) before `CMD`.

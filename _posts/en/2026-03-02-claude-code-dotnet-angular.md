---
layout: post
title: "Claude Code for the .NET + Angular + MySQL + MongoDB + Docker stack"
categories: ai
date: 2026-03-02
read_time: 9
difficulty: intermediate
description: "Configuring Claude Code for the .NET, Angular, MySQL, MongoDB and Docker stack: CLAUDE.md, permissions, useful MCPs and ready-made Skills."
excerpt_text: "A ready-made CLAUDE.md template, settings and Skills for .NET + Angular + MySQL + MongoDB + Docker"
keywords: "claude code dotnet, claude code angular, claude code setup, CLAUDE.md template, claude code docker"
translation_of: "/ai/claude-code-dotnet-angular/"
tldr:
  - "CLAUDE.md at the monorepo root describes the stack (.NET 10, Angular 20, MySQL 8.4, MongoDB 7), commands (dotnet build, npm run start, docker compose up -d) and conventions."
  - "In .claude/settings.json allow Bash(dotnet *), Bash(npm run *), Bash(docker compose *); deny git push, docker compose down --volumes and dotnet ef database drop."
  - ".mcp.json wires up MySQL (@benborla29/mcp-server-mysql), MongoDB (mongodb-mcp-server) and GitHub MCP; secrets only via environment variables from .env."
  - "Ready-made skills in .claude/commands/: /migrate (EF Core migrations), /feature (feature scaffold), /check (build, test, lint before commit), /logs (Docker log analysis)."
faq:
  - q: "What should CLAUDE.md contain for a .NET + Angular project?"
    a: "Three blocks: the stack (.NET 10 + C# 14, Angular 20 with standalone components and Signals, MySQL 8.4, MongoDB 7, Docker), the commands (dotnet build, dotnet test, npm run start, docker compose up -d) and the conventions — Repository pattern, DTOs instead of entities, OnPush, inject() instead of constructor injection. Plus a 'do not touch' section: src/Migrations/, dist/ and .env files. The file lives at the monorepo root."
  - q: "Which permissions should I set in .claude/settings.json for a .NET + Docker stack?"
    a: "Allow the everyday commands: Bash(dotnet *), Bash(npm run *), Bash(ng *), Bash(docker compose *), plus git diff, git status, git add and git commit. Deny the destructive ones: Bash(git push *), Bash(docker compose down --volumes) and Bash(dotnet ef database drop *). That way Claude works autonomously, but pushing and dropping the database still require manual confirmation."
  - q: "How do I connect MySQL and MongoDB to Claude Code via MCP?"
    a: "Declare the servers in a .mcp.json at the project root: @benborla29/mcp-server-mysql for MySQL, mongodb-mcp-server for MongoDB and @modelcontextprotocol/server-github for GitHub — all launched via npx. No hardcoded secrets: the config uses references like ${MYSQL_PASSWORD}, and Claude picks the values up from environment variables loaded from .env via source .env or direnv."
  - q: "Which slash commands (skills) are useful for a .NET + Angular project?"
    a: "Four basics: /migrate creates and applies an EF Core migration and reviews its contents, /feature scaffolds a feature (controller, service, repository, DTOs on the backend and a standalone component with service and routes on the frontend), /check runs dotnet build, dotnet test, npm run lint and npm run build before a commit, and /logs shows and analyzes docker compose logs. Each one is a Markdown file in .claude/commands/."
  - q: "How does Claude Code handle secrets so they never reach the repository?"
    a: "Only an .env.example with empty or placeholder values is committed; the real .env is in .gitignore. The configs (.mcp.json, docker-compose.yml) reference environment variables like ${MYSQL_PASSWORD}, which Claude Code picks up from the current shell. The 'do not touch' section in CLAUDE.md additionally forbids committing .env files."
---

## Project structure

A typical monorepo for this stack looks like this:

```
project/
├── backend/          # .NET Web API
│   ├── src/
│   ├── tests/
│   └── backend.sln
├── frontend/         # Angular
│   ├── src/
│   └── package.json
├── docker-compose.yml
├── .mcp.json
└── CLAUDE.md
```

## CLAUDE.md — project template

Create `CLAUDE.md` in the repository root:

```markdown
# Project

[Name and short description]

## Stack

### Backend
- .NET 10, C# 14
- ASP.NET Core Web API
- Entity Framework Core (MySQL)
- MongoDB.Driver (MongoDB)
- FluentValidation, MediatR (CQRS)

### Frontend
- Angular 20 (standalone components, Signals)
- TypeScript (strict: true)
- Angular Material / PrimeNG
- RxJS / httpResource()

### Infrastructure
- Docker + Docker Compose
- MySQL 8.4 LTS
- MongoDB 7

## Commands

### Backend
- `dotnet build` — build
- `dotnet test` — run tests
- `dotnet run --project src/Api` — run API (port 5000)
- `dotnet ef migrations add <Name>` — new EF migration
- `dotnet ef database update` — apply migrations

### Frontend
- `npm run start` — dev server (port 4200)
- `npm run build` — prod build
- `npm run test` — tests (Karma/Jest)
- `npm run lint` — ESLint

### Docker
- `docker compose up -d` — bring up the whole environment
- `docker compose down` — stop
- `docker compose logs -f api` — backend logs

## Conventions

### Backend (C#)
- Folders: `Controllers/`, `Services/`, `Repositories/`, `Models/`, `DTOs/`
- Naming: PascalCase for classes, camelCase for fields
- Async/await everywhere there's IO
- Don't use `var` if the type isn't obvious
- Repository pattern for DB access
- DTOs for API requests and responses, don't return entities directly

### Frontend (Angular)
- Standalone components only (no NgModules)
- OnPush change detection where possible
- Services in `src/app/core/services/`
- Components in `src/app/features/<feature>/`
- Use `inject()` instead of constructor injection

## Don't touch
- `src/Migrations/` — generated automatically
- `dist/` — Angular build output
- `.env` files — don't commit secrets
```

## .claude/settings.json — permissions

```json
{
  "permissions": {
    "allow": [
      "Bash(dotnet *)",
      "Bash(npm run *)",
      "Bash(ng *)",
      "Bash(docker compose *)",
      "Bash(docker logs *)",
      "Bash(docker ps *)",
      "Bash(git diff *)",
      "Bash(git status)",
      "Bash(git log *)",
      "Bash(git add *)",
      "Bash(git commit *)"
    ],
    "deny": [
      "Bash(git push *)",
      "Bash(docker compose down --volumes)",
      "Bash(dotnet ef database drop *)"
    ]
  }
}
```

Confirmation required before push and before destructive DB operations.

## .mcp.json — connecting tools

```json
{
  "mcpServers": {
    "mysql": {
      "command": "npx",
      "args": ["-y", "@benborla29/mcp-server-mysql"],
      "env": {
        "MYSQL_HOST": "localhost",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "${MYSQL_USER}",
        "MYSQL_PASS": "${MYSQL_PASSWORD}",
        "MYSQL_DB": "${MYSQL_DATABASE}"
      }
    },
    "mongodb": {
      "command": "npx",
      "args": ["-y", "mongodb-mcp-server"],
      "env": {
        "MDB_MCP_CONNECTION_STRING": "${MONGODB_URI}"
      }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

Keep secrets in `.env` (don't commit) — Claude picks up environment variables from the shell.

## Skills — ready-made commands

### /migrate — create and apply an EF migration

Create `.claude/commands/migrate.md`:

```markdown
# Migrate

Create a new EF Core migration named $ARGUMENTS and apply it.

1. Go to the backend/ folder
2. Run: `dotnet ef migrations add $ARGUMENTS --project src/Infrastructure --startup-project src/Api`
3. Inspect the generated migration — check there are no unwanted changes
4. Run: `dotnet ef database update --project src/Infrastructure --startup-project src/Api`
5. Report which tables/columns were changed
```

Usage: `/migrate AddUserEmailIndex`

### /feature — scaffold a new feature

Create `.claude/commands/feature.md`:

```markdown
# Feature

Scaffold a new feature named $ARGUMENTS.

## Backend
1. `Controllers/$ARGUMENTSController.cs` — REST controller with basic CRUD endpoints
2. `Services/I$ARGUMENTSService.cs` + `Services/$ARGUMENTSService.cs`
3. `Repositories/I$ARGUMENTSRepository.cs` + `Repositories/$ARGUMENTSRepository.cs`
4. `DTOs/$ARGUMENTSDto.cs` — Request and Response DTOs
5. Register the service and repository in DI (Program.cs or extension)

## Frontend
1. `src/app/features/$arguments/` — feature folder
2. `$arguments.component.ts` — standalone component (OnPush)
3. `$arguments.service.ts` — service for API access
4. `$arguments.routes.ts` — routes

Use the existing conventions from CLAUDE.md.
```

Usage: `/feature Products`

### /check — pre-commit check

Create `.claude/commands/check.md`:

```markdown
# Check

Check the project before committing.

## Backend
1. `cd backend && dotnet build` — must be 0 errors
2. `dotnet test` — all tests green
3. No `TODO`, `FIXME`, `Console.WriteLine` in the code (except tests)

## Frontend
1. `cd frontend && npm run lint` — 0 ESLint errors
2. `npm run build` — build passes

If everything is fine — write "Ready to commit" and propose a commit message.
If something failed — describe what exactly and how to fix it.
```

### /logs — inspect Docker logs

Create `.claude/commands/logs.md`:

```markdown
# Logs

Show and analyze the latest logs of container $ARGUMENTS.

1. `docker compose logs --tail=100 $ARGUMENTS`
2. Highlight errors and warnings
3. If there are errors — explain the cause and propose a fix

If $ARGUMENTS is not provided — show logs of all containers for the last 5 minutes.
```

Usage: `/logs api` or `/logs`

## Environment variables

Create `.env.example` in the root (committed) and `.env` (in `.gitignore`):

```bash
# .env.example
MYSQL_USER=app
MYSQL_PASSWORD=changeme
MYSQL_DATABASE=myapp
MONGODB_URI=mongodb://localhost:27017/myapp
GITHUB_TOKEN=
```

Claude Code automatically reads environment variables from the current shell — just run `source .env` or use `direnv`.

## docker-compose.yml for development

```yaml
services:
  mysql:
    image: mysql:8.4
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: ${MYSQL_DATABASE}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  api:
    build: ./backend
    ports:
      - "5000:8080"
    environment:
      ConnectionStrings__MySQL: "Server=mysql;Database=${MYSQL_DATABASE};User=${MYSQL_USER};Password=${MYSQL_PASSWORD};"
      ConnectionStrings__MongoDB: "mongodb://mongodb:27017/${MYSQL_DATABASE}"
    depends_on:
      - mysql
      - mongodb

volumes:
  mysql_data:
  mongo_data:
```

## Typical tasks with Claude Code

```
# Add a new endpoint
"Add POST /api/products with FluentValidation
 and saving to MySQL via EF Core"

# Fix from log error
/logs api
"Fix the error from the logs"

# Create an Angular component
"Create a standalone ProductListComponent with pagination
 and search, data from ProductService"

# Write tests
"Write unit tests for ProductService, use xUnit and Moq"

# Inspect DB schema and write a query
"Look at the orders table schema and write a query for a sales
 report for the month grouped by category"
```

## Summary

1. `CLAUDE.md` in the root — stack description, commands, conventions
2. `.claude/settings.json` — permissions: yes to `dotnet`, `npm`, `docker compose`; no to push and DB drop
3. `.mcp.json` — connect MySQL and MongoDB MCPs to work with schema and data
4. Ready-made skills: `/migrate`, `/feature`, `/check`, `/logs`
5. Secrets — only via environment variables, not in configs

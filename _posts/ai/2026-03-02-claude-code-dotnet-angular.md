---
layout: post
title: "Claude Code под стек .NET + Angular + MySQL + MongoDB + Docker"
categories: ai
translation_of: "/en/ai/claude-code-dotnet-angular/"
tldr:
  - "CLAUDE.md в корне монорепо описывает стек (.NET 10, Angular 20, MySQL 8.4, MongoDB 7), команды (dotnet build, npm run start, docker compose up -d) и соглашения."
  - "В .claude/settings.json разрешай Bash(dotnet *), Bash(npm run *), Bash(docker compose *); запрещай git push, docker compose down --volumes и dotnet ef database drop."
  - ".mcp.json подключает MySQL (@benborla29/mcp-server-mysql), MongoDB (mongodb-mcp-server) и GitHub MCP; секреты — только через переменные окружения из .env."
  - "Готовые skills в .claude/commands/: /migrate (миграции EF Core), /feature (скелет фичи), /check (build, test, lint перед коммитом), /logs (анализ логов Docker)."
faq:
  - q: "Что писать в CLAUDE.md для проекта на .NET и Angular?"
    a: "Три блока: стек (.NET 10 + C# 14, Angular 20 со standalone-компонентами и Signals, MySQL 8.4, MongoDB 7, Docker), команды (dotnet build, dotnet test, npm run start, docker compose up -d) и соглашения — Repository pattern, DTO вместо entity, OnPush, inject() вместо constructor injection. Плюс секция «Не трогать»: src/Migrations/, dist/ и .env. Файл кладётся в корень монорепо."
  - q: "Какие разрешения настроить в .claude/settings.json для стека .NET + Docker?"
    a: "В allow — повседневные команды: Bash(dotnet *), Bash(npm run *), Bash(ng *), Bash(docker compose *), а также git diff, git status, git add и git commit. В deny — деструктивные операции: Bash(git push *), Bash(docker compose down --volumes) и Bash(dotnet ef database drop *). Так Claude работает автономно, но пуш и дроп БД требуют ручного подтверждения."
  - q: "Как подключить MySQL и MongoDB к Claude Code через MCP?"
    a: "В .mcp.json в корне проекта прописываются серверы: @benborla29/mcp-server-mysql для MySQL, mongodb-mcp-server для MongoDB и @modelcontextprotocol/server-github для GitHub — все запускаются через npx. Секреты не хардкодятся: в конфиге ссылки вида ${MYSQL_PASSWORD}, а значения Claude берёт из переменных окружения, загруженных из .env через source .env или direnv."
  - q: "Какие slash-команды (skills) полезны для .NET + Angular проекта?"
    a: "Четыре базовых: /migrate создаёт и применяет миграцию EF Core с проверкой содержимого, /feature генерирует скелет фичи (controller, service, repository, DTO на бэке и standalone-компонент с сервисом и маршрутами на фронте), /check прогоняет dotnet build, dotnet test, npm run lint и npm run build перед коммитом, /logs показывает и анализирует docker compose logs. Каждый — Markdown-файл в .claude/commands/."
  - q: "Как Claude Code работает с секретами, чтобы они не попали в репозиторий?"
    a: "В репозиторий коммитится только .env.example с пустыми или заглушечными значениями, а реальный .env добавлен в .gitignore. Конфиги (.mcp.json, docker-compose.yml) ссылаются на переменные окружения вида ${MYSQL_PASSWORD} — Claude Code подхватывает их из текущего shell. В CLAUDE.md секция «Не трогать» дополнительно запрещает коммитить .env."
date: 2026-03-02
date_ru: "2 марта 2026"
read_time: 9
difficulty: intermediate
description: "Настраиваем Claude Code для стека .NET, Angular, MySQL, MongoDB и Docker: CLAUDE.md, разрешения, полезные MCP и готовые Skills."
excerpt_text: "Готовый шаблон CLAUDE.md, настройки и Skills для .NET + Angular + MySQL + MongoDB + Docker"
keywords: "claude code dotnet, claude code angular, claude code настройка, CLAUDE.md шаблон, claude code docker"
---

## Структура проекта

Типичный монорепо для этого стека выглядит так:

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

## CLAUDE.md — шаблон для проекта

Создай `CLAUDE.md` в корне репозитория:

```markdown
# Проект

[Название и краткое описание]

## Стек

### Backend
- .NET 10, C# 14
- ASP.NET Core Web API
- Entity Framework Core (MySQL)
- MongoDB.Driver (MongoDB)
- FluentValidation, MediatR (CQRS)

### Frontend
- Angular 20 (standalone компоненты, Signals)
- TypeScript (strict: true)
- Angular Material / PrimeNG
- RxJS / httpResource()

### Инфраструктура
- Docker + Docker Compose
- MySQL 8.4 LTS
- MongoDB 7

## Команды

### Backend
- `dotnet build` — сборка
- `dotnet test` — запуск тестов
- `dotnet run --project src/Api` — запуск API (порт 5000)
- `dotnet ef migrations add <Name>` — новая миграция EF
- `dotnet ef database update` — применить миграции

### Frontend
- `npm run start` — dev-сервер (порт 4200)
- `npm run build` — prod-сборка
- `npm run test` — тесты (Karma/Jest)
- `npm run lint` — ESLint

### Docker
- `docker compose up -d` — поднять всё окружение
- `docker compose down` — остановить
- `docker compose logs -f api` — логи бэкенда

## Соглашения

### Backend (C#)
- Папки: `Controllers/`, `Services/`, `Repositories/`, `Models/`, `DTOs/`
- Именование: PascalCase для классов, camelCase для полей
- Async/await везде где есть IO
- Не используй `var` если тип неочевиден
- Repository pattern для работы с БД
- DTO для запросов и ответов API, не возвращай entity напрямую

### Frontend (Angular)
- Только standalone components (без NgModules)
- OnPush change detection где возможно
- Сервисы в `src/app/core/services/`
- Компоненты в `src/app/features/<feature>/`
- Используй `inject()` вместо constructor injection

## Не трогать
- `src/Migrations/` — генерируется автоматически
- `dist/` — результат сборки Angular
- `.env` файлы — не коммитить секреты
```

## .claude/settings.json — разрешения

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

Подтверждение перед пушем и перед деструктивными операциями с БД.

## .mcp.json — подключение инструментов

Как устроен MCP и зачем он нужен — в [отдельной статье](/ai/claude-code-mcp/). Конфиг для нашего стека:

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

Секреты храни в `.env` (не коммитить) — Claude подхватывает переменные окружения из shell.

## Skills — готовые команды

Подробно о формате скиллов — в [статье про Skills](/ai/claude-code-skills/), расширенная подборка под этот стек — в [топе Skills для .NET + Angular + Docker](/ai/claude-code-skills-dotnet/).

### /migrate — создать и применить миграцию EF

Создай `.claude/commands/migrate.md`:

```markdown
# Migrate

Создай новую EF Core миграцию с именем $ARGUMENTS и примени её.

1. Перейди в папку backend/
2. Запусти: `dotnet ef migrations add $ARGUMENTS --project src/Infrastructure --startup-project src/Api`
3. Проверь содержимое созданной миграции — нет ли нежелательных изменений
4. Запусти: `dotnet ef database update --project src/Infrastructure --startup-project src/Api`
5. Сообщи какие таблицы/колонки были изменены
```

Использование: `/migrate AddUserEmailIndex`

### /feature — создать новую фичу

Создай `.claude/commands/feature.md`:

```markdown
# Feature

Создай скелет новой фичи с именем $ARGUMENTS.

## Backend
1. `Controllers/$ARGUMENTSController.cs` — REST контроллер с базовыми CRUD эндпоинтами
2. `Services/I$ARGUMENTSService.cs` + `Services/$ARGUMENTSService.cs`
3. `Repositories/I$ARGUMENTSRepository.cs` + `Repositories/$ARGUMENTSRepository.cs`
4. `DTOs/$ARGUMENTSDto.cs` — Request и Response DTO
5. Зарегистрируй сервис и репозиторий в DI (Program.cs или расширение)

## Frontend
1. `src/app/features/$arguments/` — папка фичи
2. `$arguments.component.ts` — standalone компонент (OnPush)
3. `$arguments.service.ts` — сервис для работы с API
4. `$arguments.routes.ts` — маршруты

Используй существующие соглашения из CLAUDE.md.
```

Использование: `/feature Products`

### /check — проверка перед коммитом

Создай `.claude/commands/check.md`:

```markdown
# Check

Проверь проект перед коммитом.

## Backend
1. `cd backend && dotnet build` — должна быть 0 ошибок
2. `dotnet test` — все тесты зелёные
3. Нет `TODO`, `FIXME`, `Console.WriteLine` в коде (кроме тестов)

## Frontend
1. `cd frontend && npm run lint` — 0 ошибок ESLint
2. `npm run build` — сборка проходит

Если всё ок — напиши "Готово к коммиту ✓" и предложи сообщение коммита.
Если что-то упало — опиши что именно и как исправить.
```

### /logs — посмотреть логи Docker

Создай `.claude/commands/logs.md`:

```markdown
# Logs

Покажи и проанализируй последние логи контейнера $ARGUMENTS.

1. `docker compose logs --tail=100 $ARGUMENTS`
2. Выдели ошибки и предупреждения
3. Если есть ошибки — объясни причину и предложи решение

Если $ARGUMENTS не указан — покажи логи всех контейнеров за последние 5 минут.
```

Использование: `/logs api` или `/logs`

## Переменные окружения

Создай `.env.example` в корне (коммитится) и `.env` (в `.gitignore`):

```bash
# .env.example
MYSQL_USER=app
MYSQL_PASSWORD=changeme
MYSQL_DATABASE=myapp
MONGODB_URI=mongodb://localhost:27017/myapp
GITHUB_TOKEN=
```

Claude Code автоматически читает переменные окружения из текущего shell — просто выполни `source .env` или используй `direnv`.

## docker-compose.yml для разработки

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

## Типичные задачи с Claude Code

```
# Создать новый endpoint
"Добавь POST /api/products с валидацией через FluentValidation
 и сохранением в MySQL через EF Core"

# Исправить по ошибке из логов
/logs api
"Исправь ошибку из логов"

# Создать Angular компонент
"Создай standalone компонент ProductListComponent с пагинацией
 и поиском, данные из ProductService"

# Написать тесты
"Напиши unit-тесты для ProductService, используй xUnit и Moq"

# Проверить схему БД и написать запрос
"Посмотри схему таблицы orders и напиши запрос для отчёта
 по продажам за месяц с группировкой по категориям"
```

## Итого

1. `CLAUDE.md` в корне — описание стека, команды, соглашения
2. `.claude/settings.json` — разрешения: да на `dotnet`, `npm`, `docker compose`; нет на push и дроп БД
3. `.mcp.json` — подключи MySQL и MongoDB MCP для работы со схемой и данными
4. Готовые skills: `/migrate`, `/feature`, `/check`, `/logs`
5. Секреты — только через переменные окружения, не в конфигах

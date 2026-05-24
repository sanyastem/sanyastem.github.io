---
layout: post
title: "Skills для миграции: .NET 10, MySQL 8.4, Angular 20"
categories: tools
translation_of: "/en/tools/claude-code-skills-migration/"
date: 2026-04-10
date_ru: "10 апреля 2026"
read_time: 9
difficulty: intermediate
description: "Готовые Skills для Claude Code под задачи миграции и оптимизации: /dotnet-migrate, /csharp-modernize, /efcore-optimize, /mysql-audit, /mysql-explain, /ng-upgrade."
excerpt_text: "Скопируй и используй: 6 готовых Skills для миграции на .NET 10, MySQL 8.4 и Angular 20"
keywords: "claude code skills миграция dotnet, claude code angular upgrade, mysql audit claude, efcore optimize skill, ng-upgrade claude code"
---

## Структура

Все скиллы кладём в `.claude/skills/`:

```
.claude/
└── skills/
    ├── dotnet-migrate/SKILL.md    # /dotnet-migrate — .NET Framework → .NET 10
    ├── csharp-modernize/SKILL.md  # /csharp-modernize — C# 12–14 рефакторинг
    ├── efcore-optimize/SKILL.md   # /efcore-optimize — N+1, AsNoTracking, индексы
    ├── mysql-audit/SKILL.md       # /mysql-audit — аудит безопасности MySQL
    ├── mysql-explain/SKILL.md     # /mysql-explain — анализ медленных запросов
    └── ng-upgrade/SKILL.md        # /ng-upgrade — Angular → Signals/Standalone
```

---

## /dotnet-migrate

`.claude/skills/dotnet-migrate/SKILL.md`:

```markdown
---
name: dotnet-migrate
description: Migrate .NET Framework code to .NET 10 — analyze, plan, and apply changes step by step
allowed-tools: Read, Edit, Write, Bash
---

Мигрируй проект с .NET Framework на .NET 10: $ARGUMENTS

Если аргумент не передан — анализируй текущую директорию.

## Шаг 1 — Анализ

1. Найди все `.csproj` файлы: `find . -name "*.csproj" -not -path "*/obj/*"`
2. Прочитай каждый — определи target framework, формат (SDK или старый), наличие System.Web/WCF
3. Найди `Global.asax`, `Web.config`, `packages.config`

Выдай список: что нужно изменить, в каком порядке, что может сломаться.

## Шаг 2 — csproj в SDK-style

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
</Project>
```

## Шаг 3 — Program.cs

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
var app = builder.Build();
app.UseRouting();
app.MapControllers();
app.Run();
```

## Шаг 4 — Web.config → appsettings.json

`<appSettings>` → `appsettings.json`. Строки подключения → `ConnectionStrings`.

## Шаг 5 — Проверка

Запусти `dotnet build`. Если есть `System.Web` — предупреди: нужна замена.
После каждого исправленного файла — commit.
```

Использование: `/dotnet-migrate` или `/dotnet-migrate src/LegacyWebApp`

---

## /csharp-modernize

`.claude/skills/csharp-modernize/SKILL.md`:

```markdown
---
name: csharp-modernize
description: Refactor C# code to use modern C# 12-14 features — primary constructors, collection expressions, records, pattern matching, field keyword
allowed-tools: Read, Edit, Bash
---

Модернизируй C# код до современного стиля (C# 12–14): $ARGUMENTS

Если файл не указан — работай с изменёнными файлами из `git diff HEAD`.

## Что применять

**Primary Constructors (C# 12)** — конструктор только с присвоением полей:
```csharp
// ДО: class + поля + конструктор
// ПОСЛЕ: public class OrderService(IRepo repo, ILogger<OrderService> logger)
```

**Collection Expressions (C# 12)**:
`new List<string>()` → `[]`, `new[] {1,2,3}` → `[1,2,3]`, `Array.Empty<T>()` → `[]`

**Records для DTO** — класс только с get/init свойствами → `public record CreateOrderRequest(int UserId, ...)`

**Pattern Matching** — длинные if-else цепочки → switch expression

**`field` keyword (C# 14)** — backing field только для валидации:
`public string Name { get; set => field = value?.Trim() ?? ""; }`

**Raw string literals** — строки с экранированием → `"""..."""`

После изменений: `dotnet build` → 0 ошибок, `dotnet test`.
Не меняй логику — только синтаксис и структуру.
```

Использование: `/csharp-modernize OrderService.cs` или `/csharp-modernize` (работает с git diff)

---

## /efcore-optimize

`.claude/skills/efcore-optimize/SKILL.md`:

```markdown
---
name: efcore-optimize
description: Review and optimize EF Core queries — find N+1, missing AsNoTracking, slow queries, missing indexes
allowed-tools: Read, Edit, Bash
---

Найди и исправь проблемы производительности в EF Core: $ARGUMENTS

Если не указано — ищи все файлы с `.Include(`, `ToListAsync`, `DbContext`.

## Что искать

**N+1**: `ToListAsync()` → цикл → навигационное свойство → добавь `.Include()` или `Select()`

**Нет AsNoTracking**: любой запрос без `SaveChanges()` с этими данными → добавь `.AsNoTracking()`

**Лишние Include**: `.Include()` с данными которые не используются → убери или замени проекцией

**OFFSET пагинация**: `.Skip(page * size)` → cursor пагинация `WHERE id > lastId`

**Bulk операции**: `ToList()` → `RemoveRange()` → `SaveChanges()` →
заменяй на `ExecuteDeleteAsync()` / `ExecuteUpdateAsync()`

## Финально

Добавь логирование SQL в Development если нет:
```json
"Microsoft.EntityFrameworkCore.Database.Command": "Information"
```

После: `dotnet build` и `dotnet test`.
```

Использование: `/efcore-optimize` или `/efcore-optimize src/Infrastructure/Repositories/`

---

## /mysql-audit

`.claude/skills/mysql-audit/SKILL.md`:

```markdown
---
name: mysql-audit
description: Audit MySQL 8.4 security — check users/privileges, SSL, password policy, version (8.0 EOL April 2026)
allowed-tools: Read, Bash
---

Проверь безопасность MySQL конфигурации: $ARGUMENTS

## Запросы для аудита

```sql
-- 1. Пользователи с избыточными правами
SELECT user, host, Super_priv, Grant_priv, File_priv FROM mysql.user
WHERE Super_priv='Y' OR Grant_priv='Y' OR File_priv='Y';

-- 2. Пользователи без пароля
SELECT user, host FROM mysql.user WHERE authentication_string = '' OR authentication_string IS NULL;

-- 3. Доступ с любого хоста
SELECT user, host FROM mysql.user WHERE host = '%';

-- 4. SSL статус пользователей
SELECT user, host, ssl_type FROM mysql.user WHERE ssl_type = '';

-- 5. local_infile (должно быть OFF)
SHOW VARIABLES LIKE 'local_infile';

-- 6. Версия (8.0 = EOL апрель 2026!)
SELECT VERSION();
```

## Вывод

Для каждой проблемы: риск + SQL для исправления + приоритет (КРИТИЧНО/ВЫСОКИЙ/СРЕДНИЙ).
Не выполняй изменения автоматически — только показывай что делать.
```

Использование: `/mysql-audit`

---

## /mysql-explain

`.claude/skills/mysql-explain/SKILL.md`:

```markdown
---
name: mysql-explain
description: Analyze MySQL query performance — EXPLAIN ANALYZE, suggest composite indexes, rewrite slow queries, cursor pagination
allowed-tools: Read, Bash
---

Проанализируй и оптимизируй MySQL запрос: $ARGUMENTS

Если не передан — `sudo tail -50 /var/log/mysql/slow.log`

## Анализ

1. `EXPLAIN ANALYZE <запрос>;`

2. Что плохо: `Table scan` → нет индекса; `Sort` перед `Limit` → нужен индекс на сортировку;
   `actual rows >> estimated rows` → `ANALYZE TABLE` для обновления статистики

3. Правило ESR для составного индекса:
   - Equality (=) поля — первые
   - Sort (ORDER BY) — следующий
   - Range (>, <, BETWEEN) — последние
   
   ```sql
   -- WHERE category_id = 5 AND status = 'active' ORDER BY created_at DESC
   CREATE INDEX idx ON table (category_id, status, created_at DESC);
   ```

4. OFFSET пагинация → cursor:
   ```sql
   -- Вместо: LIMIT 20 OFFSET 10000
   WHERE id > :last_id ORDER BY id LIMIT 20
   ```

## Финальный ответ

- Текущий план с объяснением
- Конкретный `CREATE INDEX`
- Переписанный запрос если нужно
```

Использование: `/mysql-explain "SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 20 OFFSET 500"`

---

## /ng-upgrade

`.claude/skills/ng-upgrade/SKILL.md`:

```markdown
---
name: ng-upgrade
description: Migrate Angular component to Angular 20 style — Signals, standalone, @if/@for, input()/output(), OnPush, inject()
allowed-tools: Read, Edit, Bash
---

Модернизируй Angular компонент до Angular 20: $ARGUMENTS

Если не указан — работай с изменёнными `.component.ts` из `git diff HEAD`.

## Что мигрировать

**Standalone** — убери NgModule, добавь `standalone: true`, перечисли зависимости в `imports: []`

**OnPush** — добавь `changeDetection: ChangeDetectionStrategy.OnPush` (обязательно для Zoneless)

**@Input()/@Output() → Signals API**:
```typescript
userId = input.required<number>();  // вместо @Input() userId!: number
selected = output<User>();           // вместо @Output() selected = new EventEmitter
```

**BehaviorSubject → signal()**:
```typescript
items = signal<Item[]>([]);  // вместо private _items$ = new BehaviorSubject([])
```

***ngIf/*ngFor → @if/@for**:
```html
@if (user()) { <div>...</div> }
@for (item of items(); track item.id) { <li>{{ item.name }}</li> }
```

**Constructor injection → inject()**:
```typescript
private svc = inject(UserService);  // вместо constructor(private svc: UserService)
```

**async pipe → toSignal()**:
```typescript
items = toSignal(this.items$, { initialValue: [] });
// в шаблоне: items() вместо (items$ | async)
```

После: `ng build` → 0 ошибок, `npm test`.
Не переписывай логику — только паттерны.
```

Использование: `/ng-upgrade product-list.component.ts` или `/ng-upgrade` (git diff)

---

## Итого

```
.claude/
└── skills/
    ├── dotnet-migrate/SKILL.md    # /dotnet-migrate
    ├── csharp-modernize/SKILL.md  # /csharp-modernize
    ├── efcore-optimize/SKILL.md   # /efcore-optimize
    ├── mysql-audit/SKILL.md       # /mysql-audit
    ├── mysql-explain/SKILL.md     # /mysql-explain
    └── ng-upgrade/SKILL.md        # /ng-upgrade
```

Плюс из предыдущих статей: `/review`, `/test`, `/api`, `/component`, `/debug`, `/db`.

> 💡 Скиллы из этой статьи уже лежат в репозитории в папке `.claude/skills/` — клонируй и используй сразу.

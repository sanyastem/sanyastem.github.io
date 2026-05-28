---
layout: post
title: "Skills for migration: .NET 10, MySQL 8.4, Angular 20"
categories: ai
date: 2026-04-10
read_time: 9
difficulty: intermediate
description: "Ready-made Skills for Claude Code for migration and optimization tasks: /dotnet-migrate, /csharp-modernize, /efcore-optimize, /mysql-audit, /mysql-explain, /ng-upgrade."
excerpt_text: "Copy and use: 6 ready-made Skills for migrating to .NET 10, MySQL 8.4, and Angular 20"
keywords: "claude code skills dotnet migration, claude code angular upgrade, mysql audit claude, efcore optimize skill, ng-upgrade claude code"
translation_of: "/ai/claude-code-skills-migration/"
---

## Structure

We put all skills in `.claude/skills/`:

```
.claude/
└── skills/
    ├── dotnet-migrate/SKILL.md    # /dotnet-migrate — .NET Framework → .NET 10
    ├── csharp-modernize/SKILL.md  # /csharp-modernize — C# 12–14 refactor
    ├── efcore-optimize/SKILL.md   # /efcore-optimize — N+1, AsNoTracking, indexes
    ├── mysql-audit/SKILL.md       # /mysql-audit — MySQL security audit
    ├── mysql-explain/SKILL.md     # /mysql-explain — slow query analysis
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

Migrate a project from .NET Framework to .NET 10: $ARGUMENTS

If no argument is passed — analyze the current directory.

## Step 1 — Analysis

1. Find all `.csproj` files: `find . -name "*.csproj" -not -path "*/obj/*"`
2. Read each one — determine target framework, format (SDK or old), presence of System.Web/WCF
3. Find `Global.asax`, `Web.config`, `packages.config`

Produce a list: what needs to change, in what order, what may break.

## Step 2 — csproj to SDK-style

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
</Project>
```

## Step 3 — Program.cs

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
var app = builder.Build();
app.UseRouting();
app.MapControllers();
app.Run();
```

## Step 4 — Web.config → appsettings.json

`<appSettings>` → `appsettings.json`. Connection strings → `ConnectionStrings`.

## Step 5 — Verification

Run `dotnet build`. If `System.Web` is present — warn: replacement needed.
After each fixed file — commit.
```

Usage: `/dotnet-migrate` or `/dotnet-migrate src/LegacyWebApp`

---

## /csharp-modernize

`.claude/skills/csharp-modernize/SKILL.md`:

```markdown
---
name: csharp-modernize
description: Refactor C# code to use modern C# 12-14 features — primary constructors, collection expressions, records, pattern matching, field keyword
allowed-tools: Read, Edit, Bash
---

Modernize C# code to current style (C# 12–14): $ARGUMENTS

If no file is specified — work with changed files from `git diff HEAD`.

## What to apply

**Primary Constructors (C# 12)** — constructor only assigns fields:
```csharp
// BEFORE: class + fields + constructor
// AFTER: public class OrderService(IRepo repo, ILogger<OrderService> logger)
```

**Collection Expressions (C# 12)**:
`new List<string>()` → `[]`, `new[] {1,2,3}` → `[1,2,3]`, `Array.Empty<T>()` → `[]`

**Records for DTO** — class with only get/init properties → `public record CreateOrderRequest(int UserId, ...)`

**Pattern Matching** — long if-else chains → switch expression

**`field` keyword (C# 14)** — backing field only for validation:
`public string Name { get; set => field = value?.Trim() ?? ""; }`

**Raw string literals** — strings with escapes → `"""..."""`

After changes: `dotnet build` → 0 errors, `dotnet test`.
Don't change logic — only syntax and structure.
```

Usage: `/csharp-modernize OrderService.cs` or `/csharp-modernize` (works with git diff)

---

## /efcore-optimize

`.claude/skills/efcore-optimize/SKILL.md`:

```markdown
---
name: efcore-optimize
description: Review and optimize EF Core queries — find N+1, missing AsNoTracking, slow queries, missing indexes
allowed-tools: Read, Edit, Bash
---

Find and fix EF Core performance issues: $ARGUMENTS

If not specified — search all files with `.Include(`, `ToListAsync`, `DbContext`.

## What to look for

**N+1**: `ToListAsync()` → loop → navigation property → add `.Include()` or `Select()`

**No AsNoTracking**: any query without `SaveChanges()` on this data → add `.AsNoTracking()`

**Unnecessary Include**: `.Include()` with data that isn't used → remove or replace with projection

**OFFSET pagination**: `.Skip(page * size)` → cursor pagination `WHERE id > lastId`

**Bulk operations**: `ToList()` → `RemoveRange()` → `SaveChanges()` →
replace with `ExecuteDeleteAsync()` / `ExecuteUpdateAsync()`

## Final

Add SQL logging in Development if missing:
```json
"Microsoft.EntityFrameworkCore.Database.Command": "Information"
```

After: `dotnet build` and `dotnet test`.
```

Usage: `/efcore-optimize` or `/efcore-optimize src/Infrastructure/Repositories/`

---

## /mysql-audit

`.claude/skills/mysql-audit/SKILL.md`:

```markdown
---
name: mysql-audit
description: Audit MySQL 8.4 security — check users/privileges, SSL, password policy, version (8.0 EOL April 2026)
allowed-tools: Read, Bash
---

Check the security of a MySQL configuration: $ARGUMENTS

## Audit queries

```sql
-- 1. Users with excessive privileges
SELECT user, host, Super_priv, Grant_priv, File_priv FROM mysql.user
WHERE Super_priv='Y' OR Grant_priv='Y' OR File_priv='Y';

-- 2. Users without a password
SELECT user, host FROM mysql.user WHERE authentication_string = '' OR authentication_string IS NULL;

-- 3. Access from any host
SELECT user, host FROM mysql.user WHERE host = '%';

-- 4. SSL status of users
SELECT user, host, ssl_type FROM mysql.user WHERE ssl_type = '';

-- 5. local_infile (must be OFF)
SHOW VARIABLES LIKE 'local_infile';

-- 6. Version (8.0 = EOL April 2026!)
SELECT VERSION();
```

## Output

For each issue: risk + SQL to fix + priority (CRITICAL/HIGH/MEDIUM).
Don't apply changes automatically — only show what to do.
```

Usage: `/mysql-audit`

---

## /mysql-explain

`.claude/skills/mysql-explain/SKILL.md`:

```markdown
---
name: mysql-explain
description: Analyze MySQL query performance — EXPLAIN ANALYZE, suggest composite indexes, rewrite slow queries, cursor pagination
allowed-tools: Read, Bash
---

Analyze and optimize a MySQL query: $ARGUMENTS

If not passed — `sudo tail -50 /var/log/mysql/slow.log`

## Analysis

1. `EXPLAIN ANALYZE <query>;`

2. What's bad: `Table scan` → no index; `Sort` before `Limit` → need an index for sorting;
   `actual rows >> estimated rows` → `ANALYZE TABLE` to refresh statistics

3. ESR rule for a composite index:
   - Equality (=) fields — first
   - Sort (ORDER BY) — next
   - Range (>, <, BETWEEN) — last
   
   ```sql
   -- WHERE category_id = 5 AND status = 'active' ORDER BY created_at DESC
   CREATE INDEX idx ON table (category_id, status, created_at DESC);
   ```

4. OFFSET pagination → cursor:
   ```sql
   -- Instead of: LIMIT 20 OFFSET 10000
   WHERE id > :last_id ORDER BY id LIMIT 20
   ```

## Final answer

- Current plan with explanation
- Concrete `CREATE INDEX`
- Rewritten query if needed
```

Usage: `/mysql-explain "SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 20 OFFSET 500"`

---

## /ng-upgrade

`.claude/skills/ng-upgrade/SKILL.md`:

```markdown
---
name: ng-upgrade
description: Migrate Angular component to Angular 20 style — Signals, standalone, @if/@for, input()/output(), OnPush, inject()
allowed-tools: Read, Edit, Bash
---

Modernize an Angular component to Angular 20: $ARGUMENTS

If not specified — work with changed `.component.ts` from `git diff HEAD`.

## What to migrate

**Standalone** — remove NgModule, add `standalone: true`, list dependencies in `imports: []`

**OnPush** — add `changeDetection: ChangeDetectionStrategy.OnPush` (required for Zoneless)

**@Input()/@Output() → Signals API**:
```typescript
userId = input.required<number>();  // instead of @Input() userId!: number
selected = output<User>();           // instead of @Output() selected = new EventEmitter
```

**BehaviorSubject → signal()**:
```typescript
items = signal<Item[]>([]);  // instead of private _items$ = new BehaviorSubject([])
```

***ngIf/*ngFor → @if/@for**:
```html
@if (user()) { <div>...</div> }
@for (item of items(); track item.id) { <li>{{ item.name }}</li> }
```

**Constructor injection → inject()**:
```typescript
private svc = inject(UserService);  // instead of constructor(private svc: UserService)
```

**async pipe → toSignal()**:
```typescript
items = toSignal(this.items$, { initialValue: [] });
// in template: items() instead of (items$ | async)
```

After: `ng build` → 0 errors, `npm test`.
Don't rewrite logic — only patterns.
```

Usage: `/ng-upgrade product-list.component.ts` or `/ng-upgrade` (git diff)

---

## Summary

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

Plus from previous articles: `/review`, `/test`, `/api`, `/component`, `/debug`, `/db`.

> The skills from this article already live in the repository under `.claude/skills/` — clone and use them right away.

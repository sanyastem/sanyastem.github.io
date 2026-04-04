---
name: efcore-optimize
description: Review and optimize EF Core queries — find N+1, missing AsNoTracking, slow queries, missing indexes
allowed-tools: Read, Edit, Bash
---

Найди и исправь проблемы производительности в EF Core запросах: $ARGUMENTS

Если файл/папка не указаны — ищи все файлы с `DbContext`, `IQueryable`, `.Include(` в проекте.

## Что искать

### 1. Проблема N+1
Паттерн: `ToList()` или `ToListAsync()` → цикл → обращение к навигационному свойству.

```csharp
// ПРОБЛЕМА
var orders = await ctx.Orders.ToListAsync();
foreach (var o in orders) { var name = o.Customer.Name; } // N запросов!

// ИСПРАВЛЕНИЕ
var orders = await ctx.Orders.Include(o => o.Customer).ToListAsync();
// ИЛИ лучше через Select с проекцией
```

### 2. Отсутствие AsNoTracking
Любой запрос который не вызывает `SaveChanges()` с этими данными должен иметь `.AsNoTracking()`.

### 3. Лишние Include
`.Include()` с данными которые не используются в коде → убрать или заменить проекцией через `Select`.

### 4. OFFSET пагинация на больших таблицах
`.Skip(page * size).Take(size)` → предложи cursor пагинацию через `WHERE id > lastId`.

### 5. Возможности для ExecuteUpdateAsync/ExecuteDeleteAsync
Паттерн: `ToList()` → `RemoveRange()` / цикл с присвоением → `SaveChanges()`.
Заменяй на одну операцию без загрузки в память.

## Порядок работы

1. Прочитай все файлы репозиториев (`*Repository.cs`, `*QueryService.cs`)
2. Найди каждую проблему из списка выше
3. Для каждой — покажи до/после с объяснением почему это быстрее
4. Примени исправления
5. Запусти `dotnet build` и `dotnet test`

Добавь логирование запросов в `appsettings.Development.json` если ещё не настроено:
```json
"Logging": {
  "LogLevel": {
    "Microsoft.EntityFrameworkCore.Database.Command": "Information"
  }
}
```

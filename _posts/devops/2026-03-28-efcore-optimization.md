---
layout: post
title: "EF Core 9/10: производительность и новые возможности"
categories: devops
translation_of: "/en/devops/efcore-optimization/"
date: 2026-03-28
date_ru: "28 марта 2026"
read_time: 12
difficulty: intermediate
series: ".NET: от старого к новому"
part: 3
description: "EF Core 9 и 10: compiled queries, AsNoTracking, JSON columns, проблема N+1, auto-compiled models и как не убить производительность базы данных."
excerpt_text: "Как не убить БД через EF Core: N+1, compiled queries, AsNoTracking, JSON columns и новое в версии 9/10"
keywords: "EF Core 9 10 оптимизация, compiled queries ef core, AsNoTracking, N+1 проблема, JSON columns EF Core, auto-compiled model"
faq:
  - q: "AsNoTracking влияет на Include?"
    a: "Нет, навигационные свойства подгружаются как обычно. AsNoTracking только отключает Change Tracker — сущности не получают entity tracking entries, экономия памяти 30-70%. Для read-only — всегда AsNoTracking. Для write — оставляй tracking."
  - q: "Compiled queries дают эффект на маленьких таблицах?"
    a: "Маленькая разница (~5-10мс на запрос), но при 100+ вызовов одного запроса в секунду экономия складывается. Реальный выигрыш виден на hot-path — каталог товаров, корзина, профиль пользователя. Для админ-панели разовых запросов смысла нет."
  - q: "JSON column в EF Core заменяет отдельную таблицу?"
    a: "Заменяет, когда поля документа не используются в JOIN. Адрес доставки в заказе, настройки пользователя — идеальный кейс. Если нужно фильтровать/искать по полям JSON часто — лучше отдельная таблица с индексами, JSON_VALUE() в WHERE медленный на больших данных."
  - q: "ExecuteUpdate срабатывает на триггеры?"
    a: "Да, БД триггеры срабатывают (на уровне SQL). Но EF Core change-tracker и savechanges-interceptors — нет, EF их полностью обходит. Если у тебя AuditLog через DbContext.SaveChanges() — он НЕ запишется. Для критичного аудита делай на уровне БД (триггеры) или дублируй явно."
---

## Что нового в EF Core 9 и 10

EF Core 9 вышел с .NET 9 (ноябрь 2024), EF Core 10 — с .NET 10 (ноябрь 2025).

**EF Core 9:**
- Auto-compiled models (больше не нужно запускать `dotnet ef dbcontext optimize` вручную)
- `HierarchyId` для SQL Server
- Улучшения LINQ-трансляции (меньше случаев client-side evaluation)
- `ExecuteUpdateAsync` / `ExecuteDeleteAsync` стабильны

**EF Core 10:**
- Нативная поддержка LINQ `GroupJoin`
- Улучшенный `ExecuteUpdate` с поддержкой сложных выражений
- AOT-совместимость без generated models
- Улучшения JSON columns (вложенные объекты, коллекции)

## Главные проблемы производительности

### 1. Проблема N+1

Классическая ошибка — загрузить список сущностей, потом в цикле загружать связанные данные:

```csharp
// ПЛОХО — N+1 запросов
var orders = await context.Orders.ToListAsync(); // 1 запрос
foreach (var order in orders)
{
    // каждый раз новый запрос к БД
    Console.WriteLine(order.Customer.Name); // ленивая загрузка
}

// ХОРОШО — 1 запрос с JOIN
var orders = await context.Orders
    .Include(o => o.Customer)
    .ToListAsync();

// ЕЩЁ ЛУЧШЕ — только нужные поля
var orders = await context.Orders
    .Select(o => new { o.Id, o.Amount, CustomerName = o.Customer.Name })
    .ToListAsync();
```

Чтобы поймать N+1 — логируй запросы:

```csharp
// Program.cs
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString)
           .LogTo(Console.WriteLine, LogLevel.Information)
           .EnableSensitiveDataLogging()); // только для разработки!
```

### 2. Загрузка лишних данных

```csharp
// ПЛОХО — тянет все колонки, все связанные таблицы
var products = await context.Products
    .Include(p => p.Category)
    .Include(p => p.Images)
    .Include(p => p.Reviews)
    .ToListAsync();

// ХОРОШО — только что нужно для конкретного сценария
var products = await context.Products
    .Where(p => p.IsActive)
    .Select(p => new ProductListDto
    {
        Id = p.Id,
        Name = p.Name,
        Price = p.Price,
        CategoryName = p.Category.Name
    })
    .ToListAsync();
```

## AsNoTracking — когда обязателен

EF Core по умолчанию отслеживает (tracks) загруженные сущности. Это нужно для `SaveChanges()`, но при read-only запросах только тратит память.

```csharp
// Для read-only запросов — всегда AsNoTracking
var products = await context.Products
    .AsNoTracking()
    .Where(p => p.CategoryId == categoryId)
    .ToListAsync();

// Глобально для read-only репозитория
public class ProductReadRepository(AppDbContext context)
{
    private IQueryable<Product> Query =>
        context.Products.AsNoTracking();

    public async Task<ProductDto?> GetByIdAsync(int id) =>
        await Query
            .Where(p => p.Id == id)
            .Select(p => new ProductDto { ... })
            .FirstOrDefaultAsync();
}

// AsNoTrackingWithIdentityResolution — если нужны связанные
// объекты без дублирования в памяти
var orders = await context.Orders
    .AsNoTrackingWithIdentityResolution()
    .Include(o => o.Items)
    .ThenInclude(i => i.Product)
    .ToListAsync();
```

**Правило:** read-only запросы — всегда `AsNoTracking()`. Write запросы — оставляй трекинг.

## Compiled Queries

Каждый LINQ-запрос EF Core компилирует при первом выполнении. Для hot paths это лишняя работа. Compiled query компилируется один раз:

```csharp
// Объявляем как static readonly — один раз на весь lifetime приложения
public static class Queries
{
    public static readonly Func<AppDbContext, int, Task<Product?>>
        GetProductById = EF.CompileAsyncQuery(
            (AppDbContext ctx, int id) =>
                ctx.Products
                   .AsNoTracking()
                   .FirstOrDefault(p => p.Id == id));

    public static readonly Func<AppDbContext, int, IAsyncEnumerable<OrderListDto>>
        GetUserOrders = EF.CompileAsyncQuery(
            (AppDbContext ctx, int userId) =>
                ctx.Orders
                   .AsNoTracking()
                   .Where(o => o.UserId == userId)
                   .OrderByDescending(o => o.CreatedAt)
                   .Select(o => new OrderListDto
                   {
                       Id = o.Id,
                       Amount = o.Amount,
                       CreatedAt = o.CreatedAt
                   }));
}

// Использование
var product = await Queries.GetProductById(context, productId);

await foreach (var order in Queries.GetUserOrders(context, userId))
{
    // обрабатываем
}
```

**Когда применять:** часто вызываемые запросы (список товаров, пользователь по id, корзина). Не нужно для разовых операций.

## Auto-Compiled Models (EF Core 9+)

В больших моделях (50+ сущностей) старт EF Core медленный — модель строится из reflection при первом запросе.

EF Core 9 умеет генерировать compiled model автоматически при сборке:

```xml
<!-- .csproj -->
<PropertyGroup>
    <EFCoreAutoCompiledModels>true</EFCoreAutoCompiledModels>
</PropertyGroup>
```

Или вручную через CLI:

```bash
dotnet ef dbcontext optimize --output-dir CompiledModels --namespace MyApp.CompiledModels
```

```csharp
// Program.cs — указываем использовать compiled model
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString)
           .UseModel(MyAppCompiledModel.Instance)); // сгенерированный класс
```

Ускоряет первый запуск на 30–70% для больших моделей.

## JSON Columns (EF Core 7+, улучшения в 9/10)

Хранить документообразные данные в реляционной БД без отдельной таблицы:

```csharp
// Модели
public class Order
{
    public int Id { get; set; }
    public decimal Amount { get; set; }
    public ShippingInfo Shipping { get; set; } = null!; // JSON колонка
    public List<OrderItem> Items { get; set; } = []; // JSON колонка
}

public class ShippingInfo
{
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
}

// Конфигурация в OnModelCreating
modelBuilder.Entity<Order>()
    .OwnsOne(o => o.Shipping, builder => builder.ToJson())
    .OwnsMany(o => o.Items, builder => builder.ToJson());
```

```csharp
// Запросы по полям JSON работают через LINQ — EF генерирует SQL JSON_VALUE
var moscowOrders = await context.Orders
    .AsNoTracking()
    .Where(o => o.Shipping.City == "Moscow")
    .ToListAsync();
// SQL: WHERE JSON_VALUE(Shipping, '$.City') = 'Moscow'
```

**Когда использовать JSON columns:** адреса доставки, настройки пользователя, метаданные — данные которые не нужно джойнить по отдельным полям. Не используй для данных которые нужно фильтровать/джойнить часто.

## Bulk операции без загрузки в память

EF Core 7+ поддерживает прямые UPDATE/DELETE без загрузки сущностей:

```csharp
// ПЛОХО — загружает все сущности в память
var expiredTokens = await context.RefreshTokens
    .Where(t => t.ExpiresAt < DateTime.UtcNow)
    .ToListAsync();
context.RefreshTokens.RemoveRange(expiredTokens);
await context.SaveChangesAsync();

// ХОРОШО — один DELETE запрос без загрузки
await context.RefreshTokens
    .Where(t => t.ExpiresAt < DateTime.UtcNow)
    .ExecuteDeleteAsync();

// Массовый UPDATE без загрузки
await context.Products
    .Where(p => p.CategoryId == oldCategoryId)
    .ExecuteUpdateAsync(s =>
        s.SetProperty(p => p.CategoryId, newCategoryId)
         .SetProperty(p => p.UpdatedAt, DateTime.UtcNow));
```

Генерирует один SQL-запрос. Идеально для фоновых задач очистки, массовых обновлений.

## Пагинация: cursor vs OFFSET

```csharp
// ПЛОХО — OFFSET пагинация, медленно на больших таблицах
public async Task<List<Product>> GetPageAsync(int page, int pageSize)
{
    return await context.Products
        .OrderBy(p => p.Id)
        .Skip((page - 1) * pageSize) // OFFSET становится медленным при больших значениях
        .Take(pageSize)
        .AsNoTracking()
        .ToListAsync();
}

// ХОРОШО — cursor пагинация, всегда быстро
public async Task<List<Product>> GetNextPageAsync(int? afterId, int pageSize)
{
    var query = context.Products.AsNoTracking().OrderBy(p => p.Id);

    if (afterId.HasValue)
        query = (IOrderedQueryable<Product>)query.Where(p => p.Id > afterId.Value);

    return await query.Take(pageSize).ToListAsync();
}
```

Cursor пагинация всегда O(log n) через индекс. OFFSET пагинация становится O(n) — на миллионной записи скан всех предыдущих строк.

## Полезный паттерн: Specification

Вместо захламления репозиториев методами — спецификации:

```csharp
// Спецификация
public class ActiveProductsSpec : Specification<Product>
{
    public ActiveProductsSpec(int? categoryId = null)
    {
        AddCriteria(p => p.IsActive);

        if (categoryId.HasValue)
            AddCriteria(p => p.CategoryId == categoryId);

        AddInclude(p => p.Category);
        ApplyOrderBy(p => p.Name);
        ApplyAsNoTracking();
    }
}

// Репозиторий стал тонким
public async Task<List<T>> ListAsync(Specification<T> spec) =>
    await ApplySpec(context.Set<T>(), spec).ToListAsync();

// Использование
var products = await repo.ListAsync(new ActiveProductsSpec(categoryId: 5));
```

> 💡 Самый быстрый запрос — тот который не попадает в БД. Внедри кеширование (IMemoryCache / Redis) поверх репозиториев для часто читаемых и редко меняемых данных.

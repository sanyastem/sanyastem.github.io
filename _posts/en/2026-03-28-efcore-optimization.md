---
layout: post
title: "EF Core 9/10: performance and new features"
categories: dotnet
date: 2026-03-28
read_time: 12
difficulty: intermediate
series: ".NET: from legacy to modern"
part: 3
description: "EF Core 9 and 10: compiled queries, AsNoTracking, JSON columns, the N+1 problem, auto-compiled models, and how to avoid killing your database."
excerpt_text: "How not to kill your DB with EF Core: N+1, compiled queries, AsNoTracking, JSON columns, and what's new in 9/10"
keywords: "EF Core 9 10 optimization, compiled queries ef core, AsNoTracking, N+1 problem, JSON columns EF Core, auto-compiled model"
translation_of: "/dotnet/efcore-optimization/"
tldr:
  - "For read-only queries always call AsNoTracking() — the Change Tracker is switched off, saving 30-70% memory; keep tracking for writes."
  - "The N+1 problem is fixed with Include() or a Select() projection into a DTO; catch it by logging queries via .LogTo(Console.WriteLine, LogLevel.Information)."
  - "ExecuteUpdateAsync and ExecuteDeleteAsync run bulk UPDATE/DELETE as a single SQL statement without loading entities into memory — ideal for background cleanup jobs."
  - "Auto-compiled models (EFCoreAutoCompiledModels in .csproj or dotnet ef dbcontext optimize) speed up EF Core 9 startup by 30-70% with 50+ entities."
faq:
  - q: "Does AsNoTracking affect Include?"
    a: "No, navigation properties load as usual. AsNoTracking only disables the Change Tracker — entities get no entity tracking entries, saving 30-70% memory. For read-only — always AsNoTracking. For writes — keep tracking on."
  - q: "Do compiled queries make a difference on small tables?"
    a: "The difference is small (~5-10 ms per query), but at 100+ calls of the same query per second the savings add up. The real win shows on hot paths — product catalog, shopping cart, user profile. For one-off admin-panel queries there is no point."
  - q: "Does a JSON column in EF Core replace a separate table?"
    a: "It does, when the document fields are not used in JOINs. A shipping address on an order, user settings — perfect cases. If you often need to filter or search by JSON fields — a separate table with indexes is better; JSON_VALUE() in WHERE is slow on large data."
  - q: "Does ExecuteUpdate fire triggers?"
    a: "Yes, database triggers fire (at the SQL level). But the EF Core change tracker and SaveChanges interceptors do not — EF bypasses them entirely. If your AuditLog goes through DbContext.SaveChanges() — it will NOT be written. For critical auditing do it at the database level (triggers) or duplicate it explicitly."
---

## What's new in EF Core 9 and 10

EF Core 9 shipped with .NET 9 (November 2024), EF Core 10 — with .NET 10 (November 2025).

**EF Core 9:**
- Auto-compiled models (no more manual `dotnet ef dbcontext optimize`)
- `HierarchyId` for SQL Server
- Better LINQ translation (fewer client-side evaluation cases)
- `ExecuteUpdateAsync` / `ExecuteDeleteAsync` stable

**EF Core 10:**
- Native LINQ `GroupJoin` support
- Improved `ExecuteUpdate` with complex expressions
- AOT compatibility without generated models
- Improved JSON columns (nested objects, collections)

## Main performance issues

### 1. The N+1 problem

The classic mistake — load a list of entities, then load related data in a loop:

```csharp
// BAD — N+1 queries
var orders = await context.Orders.ToListAsync(); // 1 query
foreach (var order in orders)
{
    // a new DB query every iteration
    Console.WriteLine(order.Customer.Name); // lazy loading
}

// GOOD — 1 query with JOIN
var orders = await context.Orders
    .Include(o => o.Customer)
    .ToListAsync();

// EVEN BETTER — only the fields you need
var orders = await context.Orders
    .Select(o => new { o.Id, o.Amount, CustomerName = o.Customer.Name })
    .ToListAsync();
```

To catch N+1 — log queries:

```csharp
// Program.cs
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString)
           .LogTo(Console.WriteLine, LogLevel.Information)
           .EnableSensitiveDataLogging()); // dev only!
```

### 2. Loading too much data

```csharp
// BAD — pulls all columns, all related tables
var products = await context.Products
    .Include(p => p.Category)
    .Include(p => p.Images)
    .Include(p => p.Reviews)
    .ToListAsync();

// GOOD — only what's needed for this scenario
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

## AsNoTracking — when it's mandatory

EF Core tracks loaded entities by default. That's needed for `SaveChanges()`, but for read-only queries it just wastes memory.

```csharp
// For read-only queries — always AsNoTracking
var products = await context.Products
    .AsNoTracking()
    .Where(p => p.CategoryId == categoryId)
    .ToListAsync();

// Globally for a read-only repository
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

// AsNoTrackingWithIdentityResolution — if you need related
// objects without duplicate copies in memory
var orders = await context.Orders
    .AsNoTrackingWithIdentityResolution()
    .Include(o => o.Items)
    .ThenInclude(i => i.Product)
    .ToListAsync();
```

**Rule:** read-only queries — always `AsNoTracking()`. Write queries — keep tracking on.

## Compiled Queries

EF Core compiles every LINQ query on first execution. For hot paths that's wasted work. A compiled query compiles once:

```csharp
// Declare as static readonly — once per process lifetime
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

// Usage
var product = await Queries.GetProductById(context, productId);

await foreach (var order in Queries.GetUserOrders(context, userId))
{
    // process
}
```

**When to use:** frequently-called queries (product list, user by id, cart). Not needed for one-off operations.

## Auto-Compiled Models (EF Core 9+)

In large models (50+ entities) EF Core startup is slow — the model is built from reflection on first query.

EF Core 9 can generate a compiled model automatically at build time:

```xml
<!-- .csproj -->
<PropertyGroup>
    <EFCoreAutoCompiledModels>true</EFCoreAutoCompiledModels>
</PropertyGroup>
```

Or manually via CLI:

```bash
dotnet ef dbcontext optimize --output-dir CompiledModels --namespace MyApp.CompiledModels
```

```csharp
// Program.cs — tell it to use the compiled model
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString)
           .UseModel(MyAppCompiledModel.Instance)); // generated class
```

Speeds up the first request by 30–70% for large models.

## JSON Columns (EF Core 7+, improvements in 9/10)

Store document-like data in a relational DB without a separate table:

```csharp
// Models
public class Order
{
    public int Id { get; set; }
    public decimal Amount { get; set; }
    public ShippingInfo Shipping { get; set; } = null!; // JSON column
    public List<OrderItem> Items { get; set; } = []; // JSON column
}

public class ShippingInfo
{
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
}

// Configuration in OnModelCreating
modelBuilder.Entity<Order>()
    .OwnsOne(o => o.Shipping, builder => builder.ToJson())
    .OwnsMany(o => o.Items, builder => builder.ToJson());
```

```csharp
// Queries on JSON fields work via LINQ — EF generates SQL JSON_VALUE
var warsawOrders = await context.Orders
    .AsNoTracking()
    .Where(o => o.Shipping.City == "Warsaw")
    .ToListAsync();
// SQL: WHERE JSON_VALUE(Shipping, '$.City') = 'Warsaw'
```

**When to use JSON columns:** shipping addresses, user settings, metadata — data you don't need to JOIN by individual fields. Don't use it for data you filter/JOIN on often.

## Bulk operations without loading into memory

EF Core 7+ supports direct UPDATE/DELETE without loading entities:

```csharp
// BAD — loads all entities into memory
var expiredTokens = await context.RefreshTokens
    .Where(t => t.ExpiresAt < DateTime.UtcNow)
    .ToListAsync();
context.RefreshTokens.RemoveRange(expiredTokens);
await context.SaveChangesAsync();

// GOOD — single DELETE query without loading
await context.RefreshTokens
    .Where(t => t.ExpiresAt < DateTime.UtcNow)
    .ExecuteDeleteAsync();

// Bulk UPDATE without loading
await context.Products
    .Where(p => p.CategoryId == oldCategoryId)
    .ExecuteUpdateAsync(s =>
        s.SetProperty(p => p.CategoryId, newCategoryId)
         .SetProperty(p => p.UpdatedAt, DateTime.UtcNow));
```

Generates a single SQL query. Perfect for cleanup background jobs and bulk updates.

## Pagination: cursor vs OFFSET

On the database side this depends on proper indexes — see the EXPLAIN walkthrough in [MySQL optimization](/en/databases/mysql-optimization/).

```csharp
// BAD — OFFSET pagination, slow on large tables
public async Task<List<Product>> GetPageAsync(int page, int pageSize)
{
    return await context.Products
        .OrderBy(p => p.Id)
        .Skip((page - 1) * pageSize) // OFFSET gets slow at high values
        .Take(pageSize)
        .AsNoTracking()
        .ToListAsync();
}

// GOOD — cursor pagination, always fast
public async Task<List<Product>> GetNextPageAsync(int? afterId, int pageSize)
{
    var query = context.Products.AsNoTracking().OrderBy(p => p.Id);

    if (afterId.HasValue)
        query = (IOrderedQueryable<Product>)query.Where(p => p.Id > afterId.Value);

    return await query.Take(pageSize).ToListAsync();
}
```

Cursor pagination is always O(log n) via an index. OFFSET pagination becomes O(n) — at the millionth row you scan all previous rows.

## Useful pattern: Specification

Instead of cluttering repositories with methods — specifications:

```csharp
// Specification
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

// Repository becomes thin
public async Task<List<T>> ListAsync(Specification<T> spec) =>
    await ApplySpec(context.Set<T>(), spec).ToListAsync();

// Usage
var products = await repo.ListAsync(new ActiveProductsSpec(categoryId: 5));
```

> 💡 The fastest query is the one that never hits the DB. Add caching (IMemoryCache / Redis) on top of repositories for frequently-read and rarely-changed data. [Claude Code with the /efcore-optimize skill](/en/ai/claude-code-skills-migration/) helps find N+1 and missing AsNoTracking across the project. EF Core 9/10 features become available after [migrating to .NET 10](/en/dotnet/dotnet-migration/).

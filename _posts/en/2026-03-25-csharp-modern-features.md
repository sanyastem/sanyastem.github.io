---
layout: post
title: "C# 12-14: what's new and when to use it"
categories: dotnet
date: 2026-03-25
read_time: 11
difficulty: intermediate
series: ".NET: from legacy to modern"
part: 2
description: "Key features of C# 12-14: primary constructors, collection expressions, records, pattern matching, field keyword, extension members."
excerpt_text: "Primary constructors, collection expressions, C# 14 extension members and other features — with examples of when to actually use them"
keywords: "C# 12 13 14 new features, primary constructor C#, collection expressions, pattern matching C# 14, extension members C# 14, field keyword C#"
translation_of: "/dotnet/csharp-modern-features/"
tldr:
  - "C# 12 (ships with .NET 8) added primary constructors and collection expressions [1, 2, 3] with the spread operator ..; an empty collection [] beats new List<T>()."
  - "C# 13 (with .NET 9) allowed params for any collection type, including params ReadOnlySpan<T> — no heap allocation on hot paths."
  - "C# 14 (with .NET 10) added the field keyword — logic in auto-properties without a backing field — and extension members: properties via an extension(string s) block."
  - "Records fit DTOs and value objects (readonly record struct Money), but not EF Core entities — change tracking issues."
faq:
  - q: "Which C# version ships with which .NET version?"
    a: "C# 12 ships with .NET 8, C# 13 with .NET 9, and C# 14 with .NET 10 (November 2025). C# 12 brought primary constructors and collection expressions, C# 13 added params for any collection type and System.Threading.Lock, and C# 14 introduced the field keyword, extension members and null-conditional assignment."
  - q: "When should I use primary constructors — and when not?"
    a: "Use them for DI services, repositories and any class whose constructor only assigns dependencies: public class OrderService(IOrderRepository repo, ILogger<OrderService> logger) removes the boilerplate fields and assignments. Avoid them when the constructor needs logic — checks or transformations — where an explicit constructor is better. Keep in mind: primary constructor parameters are captured variables, not fields, and they do not exist on this."
  - q: "Can I use records for EF Core entities?"
    a: "No — records have change-tracking issues in EF Core, like any type that was designed to be immutable. Records fit Request/Response DTOs in APIs, value objects in the domain model (readonly record struct Money(decimal Amount, string Currency) is a stack-allocated value type) and configuration objects; changes are expressed via with-expressions."
  - q: "What does the field keyword do in C# 14?"
    a: "It lets you add logic to an auto-property without declaring an explicit backing field: the compiler creates the field for you and you access it via the field keyword. For example, set => field = value?.Trim() ?? string.Empty normalizes a string on write, and a setter can also include validation that throws ArgumentOutOfRangeException. Previously you had to declare a private string _name by hand."
  - q: "What are extension members in C# 14 and how do they beat extension methods?"
    a: "It is an extension(string s) { ... } block where you can declare not only extension methods but also properties and indexers — previously only static methods with a this parameter were possible. For example, the property public bool IsValidEmail => s.Contains('@') is used as email.IsValidEmail without parentheses. It also works for interfaces: extension(IEnumerable<Order> orders) adds a TotalRevenue property without inheritance."
---

## What changed and in which version

| Feature | Version |
|---------|---------|
| Primary constructors (classes) | C# 12 |
| Collection expressions | C# 12 |
| `ref readonly` parameters | C# 12 |
| `params` collections | C# 13 |
| `lock` object (System.Threading.Lock) | C# 13 |
| `field` keyword | C# 14 |
| Extension members | C# 14 |
| `null-conditional assignment` (`??=`) improvements | C# 14 |

C# 14 ships with **.NET 10** (November 2025). C# 12 — with .NET 8, C# 13 — with .NET 9. If your project is still on .NET Framework, start with [migrating to .NET 10](/en/dotnet/dotnet-migration/).

## Primary Constructors (C# 12)

Before C# 12, every class had the same boilerplate: field, constructor, assignment.

```csharp
// Before
public class OrderService
{
    private readonly IOrderRepository _repo;
    private readonly ILogger<OrderService> _logger;

    public OrderService(IOrderRepository repo, ILogger<OrderService> logger)
    {
        _repo = repo;
        _logger = logger;
    }
}

// After (C# 12)
public class OrderService(IOrderRepository repo, ILogger<OrderService> logger)
{
    public async Task<Order?> GetAsync(int id)
    {
        logger.LogInformation("Fetching order {Id}", id);
        return await repo.GetByIdAsync(id);
    }
}
```

Primary constructor parameters are available throughout the class body as captured variables. Important: these are not fields, but captured variables — they are not on `this`.

**When to use:** services with DI, repositories, any class where the constructor only assigns dependencies.

**When not to use:** if you need logic in the constructor — checks, transformations — better keep an explicit constructor.

## Collection Expressions (C# 12)

A unified syntax for any collection:

```csharp
// Array
int[] nums = [1, 2, 3, 4, 5];

// List<T>
List<string> names = ["Alice", "Bob", "Charlie"];

// Spread operator (..) — combine collections
int[] first = [1, 2, 3];
int[] second = [4, 5, 6];
int[] all = [..first, ..second]; // [1, 2, 3, 4, 5, 6]

// In method parameters
ProcessItems(["item1", "item2"]);

// Empty collection
IReadOnlyList<int> empty = [];
```

The compiler picks the optimal way to build the collection. `[]` for empty collections is more efficient than `new List<T>()` or `Array.Empty<T>()`.

## Records (C# 9+, improvements in C# 12-14)

Records are immutable value-like types for data. In the .NET stack they replace DTO classes:

```csharp
// Record class (reference type)
public record CreateOrderRequest(
    int UserId,
    List<OrderItem> Items,
    string? PromoCode
);

// Record struct (value type, stack allocation)
public readonly record struct Money(decimal Amount, string Currency);

// With-expression for changes
var original = new Money(100m, "USD");
var doubled = original with { Amount = 200m };

// Destructuring
var (amount, currency) = original;
```

**When to use records:**
- Request/Response DTOs in an API
- Value objects in the domain model (Money, Email, Address)
- Configuration objects

**Don't use records for:** EF Core entities (issues with change tracking), objects with mutable state.

## Pattern Matching — the full arsenal

```csharp
// Switch expression with patterns (C# 8-12)
public decimal CalcDiscount(Customer customer) => customer switch
{
    { IsVip: true, TotalOrders: > 100 } => 0.20m,
    { IsVip: true }                      => 0.10m,
    { TotalOrders: > 50 }               => 0.05m,
    _                                    => 0m
};

// List patterns (C# 11)
public string Describe(int[] arr) => arr switch
{
    []          => "empty",
    [var x]     => $"one element: {x}",
    [var x, var y] => $"two elements: {x}, {y}",
    [var first, .., var last] => $"starts {first}, ends {last}"
};

// Type patterns with when
public string Process(object obj) => obj switch
{
    string s when s.Length > 100 => "long string",
    string s                      => $"string: {s}",
    int n when n < 0              => "negative",
    int n                         => $"positive: {n}",
    null                          => "null",
    _                             => "unknown"
};
```

## `params` collections (C# 13)

Previously `params` only worked with arrays. Now it works with any collection:

```csharp
// C# 12 and earlier — array only
public void Log(string message, params object[] args) { ... }

// C# 13 — any collection
public void Log(string message, params IEnumerable<object> args) { ... }
public void AddTags(params ReadOnlySpan<string> tags) { ... } // no heap allocation

// Call site is unchanged
Log("User {0} logged in", userId);
AddTags("backend", "api", "v2");
```

`params ReadOnlySpan<T>` is especially useful for hot paths — no heap allocations.

## `field` keyword (C# 14)

Lets you add logic to an auto-property without declaring an explicit backing field:

```csharp
// Before — had to declare the field manually
private string _name = string.Empty;
public string Name
{
    get => _name;
    set => _name = value?.Trim() ?? string.Empty;
}

// After (C# 14)
public string Name
{
    get;
    set => field = value?.Trim() ?? string.Empty;
}

// With validation
public int Age
{
    get;
    set
    {
        if (value < 0 || value > 150)
            throw new ArgumentOutOfRangeException(nameof(Age));
        field = value;
    }
}
```

## Extension Members (C# 14)

The biggest C# 14 feature. Lets you add not just methods, but also properties and indexers, to existing types:

```csharp
// Before: extension methods only
public static class StringExtensions
{
    public static bool IsValidEmail(this string s) =>
        s.Contains('@') && s.Contains('.');
}

// After: extension block with methods AND properties (C# 14)
extension(string s)
{
    // Extension property
    public bool IsValidEmail => s.Contains('@') && s.Contains('.');
    public bool IsEmpty => string.IsNullOrWhiteSpace(s);

    // Extension method
    public string Truncate(int maxLength) =>
        s.Length <= maxLength ? s : s[..maxLength] + "...";
}

// Usage
string email = "user@example.com";
if (email.IsValidEmail)
{
    Console.WriteLine(email.Truncate(20));
}
```

Extensions for interfaces — handy for enriching without inheritance:

```csharp
extension(IEnumerable<Order> orders)
{
    public decimal TotalRevenue => orders.Sum(o => o.Amount);
    public IEnumerable<Order> ForUser(int userId) =>
        orders.Where(o => o.UserId == userId);
}

// Usage
decimal revenue = dbOrders.TotalRevenue;
var myOrders = dbOrders.ForUser(currentUserId);
```

## Null Safety — new capabilities

```csharp
// Null-conditional assignment (C# 14)
// Assigns only if the left side is not null
user?.Name = "Alice"; // assigns only if user != null

// Compound null-coalescing
config.Timeout ??= TimeSpan.FromSeconds(30); // already in C# 8
config.BaseUrl ??= "https://api.example.com";

// Required members (C# 11) — initialization guarantee
public class UserDto
{
    public required string Email { get; init; }
    public required string Name { get; init; }
    public string? Phone { get; init; } // optional
}

// The compiler enforces initialization of required properties
var dto = new UserDto { Email = "a@b.com", Name = "Alice" }; // OK
var dto2 = new UserDto { Email = "a@b.com" }; // COMPILE ERROR
```

## Raw String Literals (C# 11)

```csharp
// Before — escaping nightmare
string json = "{\"name\": \"Alice\", \"age\": 30}";
string path = "C:\\Users\\Alice\\Documents";

// Now — raw string literals
string json = """
    {
        "name": "Alice",
        "age": 30
    }
    """;

// With interpolation (double $$ to escape {})
string name = "Alice";
{% raw %}
string template = $$"""
    {
        "name": "{{name}}",
        "timestamp": "{{DateTime.UtcNow:O}}"
    }
    """;
{% endraw %}
```

Especially handy for SQL, JSON templates, regex.

## When to apply this in real projects

**Right away:** primary constructors (less boilerplate), collection expressions (readability), raw string literals (SQL/JSON).

**Case by case:** records for DTOs and value objects, pattern matching instead of long if-else chains.

**C# 14 (only on .NET 10):** `field` keyword — when you need property logic without a full field. Extension members — for enriching library types.

> 💡 Use the `dotnet-upgrade-assistant` analyzer and Roslyn analyzers — they'll point out places where new patterns can be applied automatically. Bulk refactoring to the new syntax is a good job for [Claude Code with the /csharp-modernize skill](/en/ai/claude-code-skills-migration/).

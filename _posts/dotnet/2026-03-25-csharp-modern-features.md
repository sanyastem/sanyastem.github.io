---
layout: post
title: "C# 12–14: что добавили и зачем это использовать"
categories: dotnet
translation_of: "/en/dotnet/csharp-modern-features/"
tldr:
  - "C# 12 (поставляется с .NET 8) добавил primary constructors и collection expressions [1, 2, 3] со spread-оператором ..; пустая коллекция [] эффективнее new List<T>()."
  - "C# 13 (с .NET 9) разрешил params для любых коллекций, включая params ReadOnlySpan<T> — без heap-аллокации на hot paths."
  - "C# 14 (с .NET 10) ввёл field keyword — логика в auto-property без явного backing field — и extension members: свойства расширения через блок extension(string s)."
  - "Records подходят для DTO и value objects (readonly record struct Money), но не для сущностей EF Core — проблемы с отслеживанием изменений."
faq:
  - q: "Какая версия C# идёт с какой версией .NET?"
    a: "C# 12 поставляется с .NET 8, C# 13 — с .NET 9, C# 14 — с .NET 10 (ноябрь 2025). C# 12 принёс primary constructors и collection expressions, C# 13 — params для любых коллекций и System.Threading.Lock, C# 14 — field keyword, extension members и null-conditional assignment."
  - q: "Когда стоит и когда не стоит использовать primary constructors?"
    a: "Стоит — для сервисов с DI, репозиториев и любых классов, где конструктор только присваивает зависимости: public class OrderService(IOrderRepository repo, ILogger<OrderService> logger) убирает шаблонные поля и присвоения. Не стоит — когда в конструкторе нужна логика (проверки, трансформации): тогда лучше явный конструктор. Важно помнить: параметры primary constructor — это захваченные переменные, а не поля, их нет в this."
  - q: "Можно ли использовать records для сущностей EF Core?"
    a: "Нет — у records проблемы с отслеживанием изменений в EF Core, как и у любых объектов, которые задумывались изменяемыми. Records подходят для Request/Response DTO в API, value objects в доменной модели (readonly record struct Money(decimal Amount, string Currency) — value type со стек-аллокацией) и конфигурационных объектов; изменения выражаются через with-expression."
  - q: "Что делает field keyword в C# 14?"
    a: "Позволяет добавить логику в auto-property без объявления явного backing field: компилятор сам создаёт поле, к которому обращаешься через слово field. Например, set => field = value?.Trim() ?? string.Empty нормализует строку при записи, а в setter можно вставить и валидацию с throw new ArgumentOutOfRangeException. Раньше для этого пришлось бы вручную заводить private string _name."
  - q: "Что такое extension members в C# 14 и чем они лучше методов расширения?"
    a: "Это блок extension(string s) { ... }, внутри которого можно объявлять не только методы расширения, но и свойства и индексаторы — раньше были доступны только статические методы с this-параметром. Например, свойство public bool IsValidEmail => s.Contains('@') вызывается как email.IsValidEmail без скобок. Удобно и для интерфейсов: extension(IEnumerable<Order> orders) добавляет свойство TotalRevenue без наследования."
date: 2026-03-25
date_ru: "25 марта 2026"
read_time: 11
difficulty: intermediate
series: ".NET: от старого к новому"
part: 2
description: "Разбор ключевых фич C# 12, 13 и 14: primary constructors, collection expressions, записи, pattern matching, field keyword, расширения типов и null-conditional assignment."
excerpt_text: "Primary constructors, collection expressions, extension members C#14 и другие фичи — с примерами когда реально применять"
keywords: "C# 12 13 14 новые фичи, primary constructor C#, collection expressions, pattern matching C# 14, extension members C# 14, field keyword C#"
---

## Что изменилось и в какой версии

| Фича | Версия |
|------|--------|
| Primary constructors (классы) | C# 12 |
| Collection expressions | C# 12 |
| `ref readonly` параметры | C# 12 |
| `params` коллекции | C# 13 |
| `lock` объект (System.Threading.Lock) | C# 13 |
| `field` keyword | C# 14 |
| Extension members | C# 14 |
| `null-conditional assignment` (`??=`) улучшения | C# 14 |

C# 14 поставляется с **.NET 10** (ноябрь 2025). C# 12 — с .NET 8, C# 13 — с .NET 9. Если проект ещё на .NET Framework — сначала [миграция на .NET 10](/dotnet/dotnet-migration/).

## Primary Constructors (C# 12)

До C# 12 в каждом классе был шаблонный boilerplate: поле, конструктор, присвоение.

```csharp
// Было
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

// Стало (C# 12)
public class OrderService(IOrderRepository repo, ILogger<OrderService> logger)
{
    public async Task<Order?> GetAsync(int id)
    {
        logger.LogInformation("Fetching order {Id}", id);
        return await repo.GetByIdAsync(id);
    }
}
```

Параметры primary constructor доступны во всём теле класса как captured variables. Важно: это не поля, а захваченные переменные — их нет в `this`.

**Когда использовать:** сервисы с DI, репозитории, любой класс где конструктор только присваивает зависимости.

**Когда не использовать:** если нужна логика в конструкторе — проверки, трансформации — лучше оставить явный конструктор.

## Collection Expressions (C# 12)

Единый синтаксис для любых коллекций:

```csharp
// Массив
int[] nums = [1, 2, 3, 4, 5];

// List<T>
List<string> names = ["Alice", "Bob", "Charlie"];

// Spread оператор (..) — объединение коллекций
int[] first = [1, 2, 3];
int[] second = [4, 5, 6];
int[] all = [..first, ..second]; // [1, 2, 3, 4, 5, 6]

// В параметрах метода
ProcessItems(["item1", "item2"]);

// Пустая коллекция
IReadOnlyList<int> empty = [];
```

Компилятор выбирает оптимальный способ создания коллекции. `[]` для пустых коллекций эффективнее `new List<T>()` или `Array.Empty<T>()`.

## Records (C# 9+, улучшения в C# 12–14)

Records — неизменяемые типы-значения для данных. В .NET стеке заменяют DTO-классы:

```csharp
// Record class (reference type)
public record CreateOrderRequest(
    int UserId,
    List<OrderItem> Items,
    string? PromoCode
);

// Record struct (value type, стек-аллокация)
public readonly record struct Money(decimal Amount, string Currency);

// With-expression для изменения
var original = new Money(100m, "RUB");
var doubled = original with { Amount = 200m };

// Деструктуризация
var (amount, currency) = original;
```

**Когда использовать records:**
- Request/Response DTO в API
- Value objects в доменной модели (Money, Email, Address)
- Конфигурационные объекты

**Не используй records для:** сущностей EF Core (проблемы с отслеживанием изменений), объектов с изменяемым состоянием.

## Pattern Matching — полный арсенал

```csharp
// Switch expression с паттернами (C# 8-12)
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

// Type patterns с when
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

## `params` коллекции (C# 13)

Раньше `params` работал только с массивами. Теперь с любой коллекцией:

```csharp
// C# 12 и раньше — только массив
public void Log(string message, params object[] args) { ... }

// C# 13 — любая коллекция
public void Log(string message, params IEnumerable<object> args) { ... }
public void AddTags(params ReadOnlySpan<string> tags) { ... } // без heap-аллокации

// Вызов без изменений
Log("User {0} logged in", userId);
AddTags("backend", "api", "v2");
```

`params ReadOnlySpan<T>` особенно полезен для hot paths — не аллоцирует память в куче.

## `field` keyword (C# 14)

Позволяет добавить логику в auto-property без объявления явного backing field:

```csharp
// Было — нужно объявлять поле вручную
private string _name = string.Empty;
public string Name
{
    get => _name;
    set => _name = value?.Trim() ?? string.Empty;
}

// Стало (C# 14)
public string Name
{
    get;
    set => field = value?.Trim() ?? string.Empty;
}

// С валидацией
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

Самая крупная фича C# 14. Позволяет добавлять не только методы, но и свойства, индексаторы к существующим типам:

```csharp
// Было: только методы расширения
public static class StringExtensions
{
    public static bool IsValidEmail(this string s) =>
        s.Contains('@') && s.Contains('.');
}

// Стало: extension блок с методами И свойствами (C# 14)
extension(string s)
{
    // Свойство расширения
    public bool IsValidEmail => s.Contains('@') && s.Contains('.');
    public bool IsEmpty => string.IsNullOrWhiteSpace(s);

    // Метод расширения
    public string Truncate(int maxLength) =>
        s.Length <= maxLength ? s : s[..maxLength] + "...";
}

// Использование
string email = "user@example.com";
if (email.IsValidEmail)
{
    Console.WriteLine(email.Truncate(20));
}
```

Extension для интерфейсов — удобно для обогащения без наследования:

```csharp
extension(IEnumerable<Order> orders)
{
    public decimal TotalRevenue => orders.Sum(o => o.Amount);
    public IEnumerable<Order> ForUser(int userId) =>
        orders.Where(o => o.UserId == userId);
}

// Использование
decimal revenue = dbOrders.TotalRevenue;
var myOrders = dbOrders.ForUser(currentUserId);
```

## Null Safety — новые возможности

```csharp
// Null-conditional assignment (C# 14)
// Присваивает только если левая часть не null
user?.Name = "Alice"; // присвоит только если user != null

// Compound null-coalescing
config.Timeout ??= TimeSpan.FromSeconds(30); // уже был в C# 8
config.BaseUrl ??= "https://api.example.com";

// Required members (C# 11) — гарантия инициализации
public class UserDto
{
    public required string Email { get; init; }
    public required string Name { get; init; }
    public string? Phone { get; init; } // опционально
}

// Компилятор требует инициализации required-свойств
var dto = new UserDto { Email = "a@b.com", Name = "Alice" }; // OK
var dto2 = new UserDto { Email = "a@b.com" }; // ОШИБКА компиляции
```

## Raw String Literals (C# 11)

```csharp
// Раньше — экранирование кошмар
string json = "{\"name\": \"Alice\", \"age\": 30}";
string path = "C:\\Users\\Alice\\Documents";

// Теперь — raw string literals
string json = """
    {
        "name": "Alice",
        "age": 30
    }
    """;

// С интерполяцией (двойные $$ чтобы экранировать {})
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

Особенно удобно для SQL, JSON-шаблонов, regex.

## Когда применять в реальных проектах

**Сразу:** primary constructors (уменьшают boilerplate), collection expressions (читаемость), raw string literals (SQL/JSON).

**По ситуации:** records для DTO и value objects, pattern matching вместо длинных if-else цепочек.

**C# 14 (только .NET 10):** `field` keyword — когда нужна логика в property без полного поля. Extension members — для обогащения библиотечных типов.

> 💡 Используй анализатор `dotnet-upgrade-assistant` и Roslyn analyzers — они подскажут места где можно применить новые паттерны автоматически. Массовый рефакторинг под новый синтаксис удобно отдать [Claude Code со скиллом /csharp-modernize](/ai/claude-code-skills-migration/).

---
name: csharp-modernize
description: Refactor C# code to use modern C# 12-14 features — primary constructors, collection expressions, records, pattern matching, field keyword
allowed-tools: Read, Edit, Bash
---

Модернизируй C# код до современного стиля (C# 12–14): $ARGUMENTS

Если файл не указан — прочитай `git diff HEAD` и работай с изменёнными файлами.

## Что проверяй и меняй

### 1. Primary Constructors (C# 12)
Если класс имеет конструктор который только присваивает параметры в поля:
```csharp
// ДО
public class OrderService { 
    private readonly IRepo _repo;
    public OrderService(IRepo repo) { _repo = repo; }
}
// ПОСЛЕ
public class OrderService(IRepo repo) { }
```
Применяй для сервисов, репозиториев, handlers.

### 2. Collection Expressions (C# 12)
```csharp
// ДО: new List<string>(), new[] { 1,2,3 }, Array.Empty<T>()
// ПОСЛЕ: [], [1,2,3]
```

### 3. Records для DTO
Если класс используется только как контейнер данных (только get/init свойства):
```csharp
// ПОСЛЕ
public record CreateOrderRequest(int UserId, List<int> ItemIds);
```

### 4. Pattern Matching вместо if-else цепочек
Длинные `if (x is SomeType) ... else if (x is OtherType)` → switch expression.

### 5. `field` keyword (C# 14 / .NET 10)
Если есть backing field только для валидации в setter:
```csharp
// ПОСЛЕ
public string Name { get; set => field = value?.Trim() ?? ""; }
```

### 6. Raw string literals
Многострочные строки с экранированием → `"""..."""`

## Порядок работы

1. Прочитай файл
2. Найди применимые паттерны из списка выше
3. Примени изменения — только то что реально улучшает, не переусердствуй
4. Запусти `dotnet build` — убедись 0 ошибок
5. Запусти тесты если есть: `dotnet test`

Не меняй логику — только синтаксис и структуру.

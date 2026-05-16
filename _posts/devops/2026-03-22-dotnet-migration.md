---
layout: post
title: "Миграция с .NET Framework на .NET 10: пошаговый план"
categories: devops
date: 2026-03-22
date_ru: "22 марта 2026"
read_time: 12
difficulty: advanced
series: ".NET: от старого к новому"
part: 1
description: "Как перейти с .NET Framework 4.x на .NET 10 LTS: что изменилось в архитектуре, типичные проблемы при миграции и инструменты которые помогут."
excerpt_text: "Полный план перехода с .NET Framework 4.x на .NET 10 LTS — что сломается и как починить"
keywords: "миграция .NET Framework .NET 10, upgrade assistant dotnet, web.config appsettings, Global.asax Program.cs, breaking changes dotnet"
faq:
  - q: "Можно ли мигрировать только часть проектов?"
    a: "Да, миграцию делают постепенно. Сначала переносят отдельные библиотеки (DLL) на .NET Standard или .NET 10, потом тесты, потом web-проект. Главное — установить InternalsVisibleTo и убедиться что зависимости совместимы (NuGet target frameworks)."
  - q: "Что делать с зависимостями System.Web и WebForms?"
    a: "В .NET 10 не поддерживаются. WebForms → переписать на Razor Pages или ASP.NET Core MVC. System.Web.HttpContext → Microsoft.AspNetCore.Http.HttpContext. Если страниц много — запусти в Docker контейнере на старом фреймворке параллельно."
  - q: "Сколько времени занимает миграция?"
    a: "Маленький Web API (~10k LOC) — 1-2 недели. Средний enterprise (~100k LOC, 20+ проектов) — 2-6 месяцев. Главное узкое место: WebForms / WCF / EF 6 → EF Core. Upgrade Assistant ускоряет, но не решает все breaking changes."
  - q: ".NET 10 LTS или ждать .NET 12?"
    a: ".NET 10 LTS до ноября 2028. Если мигрируешь сейчас — бери 10, support 3 года. .NET 12 выйдет 2027 (LTS до 2030). Если можешь подождать год и проект не горит — инструменты улучшаются с каждым релизом."
---

## Зачем мигрировать и когда

**.NET Framework 4.8** — финальная версия «старого» .NET. Microsoft поддерживает его, но новых фич не добавляет. Всё новое — в `.NET 10`.

**.NET 10** вышел в ноябре 2025, это LTS-релиз с поддержкой до ноября 2028. Причины мигрировать:
- Производительность: .NET 10 в 2–5 раз быстрее Framework на типичных API-нагрузках
- Кроссплатформенность: Linux-контейнеры, Docker, меньше затрат на хостинг
- C# 14 и современные паттерны
- Native AOT — маленькие бинарники, быстрый старт

## Что принципиально изменилось

| .NET Framework | .NET 10 |
|----------------|---------|
| `Global.asax` | `Program.cs` |
| `Web.config` | `appsettings.json` |
| `Startup.cs` (OWIN) | `WebApplication.CreateBuilder()` |
| `System.Web.HttpContext` | `Microsoft.AspNetCore.Http.HttpContext` |
| `HttpModule` / `HttpHandler` | Middleware |
| `WebForms` | Blazor / Razor Pages / MVC |
| `WCF` | gRPC / REST / SignalR |
| Synchronous controllers | Async по умолчанию |

## Шаг 1 — Оцени масштаб

Перед началом запусти **.NET Upgrade Assistant**:

```bash
dotnet tool install -g upgrade-assistant
upgrade-assistant analyze ./YourSolution.sln
```

Покажет:
- Какие NuGet-пакеты несовместимы
- Какие API устарели или убраны
- Оценку сложности миграции по каждому проекту

Плюс проверь [.NET Compatibility Analyzer](https://learn.microsoft.com/dotnet/core/porting/) — вставляешь код, получаешь список проблем.

## Шаг 2 — Обнови project file

Старый формат `.csproj` заменяется на SDK-style:

```xml
<!-- Было (.NET Framework) -->
<Project ToolsVersion="15.0" xmlns="...">
  <Import Project="$(MSBuildExtensionsPath)\..." />
  <PropertyGroup>
    <TargetFrameworkVersion>v4.8</TargetFrameworkVersion>
  </PropertyGroup>
  <ItemGroup>
    <Reference Include="System.Web" />
    ...сотни строк References...
  </ItemGroup>
</Project>

<!-- Стало (.NET 10) -->
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
</Project>
```

## Шаг 3 — Program.cs вместо Global.asax

```csharp
// Было: Global.asax
protected void Application_Start()
{
    AreaRegistration.RegisterAllAreas();
    FilterConfig.RegisterGlobalFilters(GlobalFilters.Filters);
    RouteConfig.RegisterRoutes(RouteTable.Routes);
}

// Стало: Program.cs (.NET 10)
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Регистрация своих сервисов
builder.Services.AddScoped<IProductService, ProductService>();

var app = builder.Build();

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();
```

## Шаг 4 — Конфигурация

```csharp
// Было: Web.config + ConfigurationManager
var connStr = ConfigurationManager.ConnectionStrings["MyDb"].ConnectionString;
var apiKey  = ConfigurationManager.AppSettings["ApiKey"];

// Стало: appsettings.json + IConfiguration
// appsettings.json:
// {
//   "ConnectionStrings": { "MyDb": "Server=..." },
//   "ApiKey": "secret"
// }

// В сервисе через DI:
public class MyService(IConfiguration config)
{
    private readonly string _connStr = config.GetConnectionString("MyDb")!;
    private readonly string _apiKey  = config["ApiKey"]!;
}
```

Секреты для разработки — в `dotnet user-secrets`, для production — в переменные окружения или Vault.

## Шаг 5 — HttpContext и Request

```csharp
// Было
var userAgent = HttpContext.Current.Request.UserAgent;
var ip = HttpContext.Current.Request.UserHostAddress;
HttpContext.Current.Response.Redirect("/home");

// Стало — HttpContext инжектируется через IHttpContextAccessor
public class MyService(IHttpContextAccessor accessor)
{
    public string GetUserAgent()
    {
        var ctx = accessor.HttpContext!;
        return ctx.Request.Headers.UserAgent.ToString();
    }
}

// Или прямо в контроллере (он уже имеет HttpContext)
[ApiController]
public class HomeController : ControllerBase
{
    public IActionResult Index()
    {
        var ip = HttpContext.Connection.RemoteIpAddress;
        return Redirect("/home");
    }
}
```

## Шаг 6 — Middleware вместо HttpModules

```csharp
// Было: HttpModule
public class LoggingModule : IHttpModule
{
    public void Init(HttpApplication app)
    {
        app.BeginRequest += (s, e) => Log("Request started");
    }
}

// Стало: Middleware
public class LoggingMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        Log($"Request: {context.Request.Path}");
        await next(context);
        Log($"Response: {context.Response.StatusCode}");
    }
}

// Регистрация в Program.cs
app.UseMiddleware<LoggingMiddleware>();
```

## Типичные проблемы при миграции

**System.Web удалён полностью** — всё что зависит от `System.Web.dll` нужно заменять. Ищи альтернативы в `Microsoft.AspNetCore.*`.

**WCF не поддерживается** — замени на:
- REST API (ASP.NET Core Controllers или Minimal API)
- gRPC (`Grpc.AspNetCore`) — если нужен бинарный протокол
- CoreWCF — open-source порт WCF, помогает при больших легаси-кодобазах

**Синхронные операции** — в .NET Core синхронный I/O в контроллерах по умолчанию запрещён. Делай async:

```csharp
// Было
public ActionResult Get(int id)
{
    var product = _db.Products.Find(id); // синхронный вызов
    return View(product);
}

// Стало
public async Task<IActionResult> Get(int id)
{
    var product = await _db.Products.FindAsync(id);
    return Ok(product);
}
```

**Thread.Sleep в тестах и коде** — заменяй на `await Task.Delay()`.

## Стратегия: постепенно или сразу

Два подхода:

**Big bang** — переписываешь всё сразу. Подходит для небольших проектов (< 50K строк кода).

**Strangler Fig** — запускаешь новый .NET 10 API рядом со старым. Reverse proxy (nginx) роутит новые эндпоинты на новый сервис, старые — на Framework. Постепенно переносишь модуль за модулем.

```nginx
# Nginx роутинг: новые эндпоинты → .NET 10, остальное → .NET Framework
location /api/v2/ {
    proxy_pass http://dotnet10-service:5000;
}
location / {
    proxy_pass http://framework-service:80;
}
```

Strangler Fig безопаснее для больших проектов — в любой момент можно откатиться.

> 💡 .NET Upgrade Assistant умеет автоматически конвертировать project files, web.config и часть кода. Запусти его первым — сэкономит несколько часов ручной работы.

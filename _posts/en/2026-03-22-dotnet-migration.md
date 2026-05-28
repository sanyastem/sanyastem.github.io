---
layout: post
title: "Migrating from .NET Framework to .NET 10: a step-by-step plan"
categories: dotnet
date: 2026-03-22
read_time: 12
difficulty: advanced
series: ".NET: from legacy to modern"
part: 1
description: "How to move from .NET Framework 4.x to .NET 10 LTS: what changed in the architecture, common migration pitfalls, and the tools that help."
excerpt_text: "A full plan for moving from .NET Framework 4.x to .NET 10 LTS — what breaks and how to fix it"
keywords: "migration .NET Framework .NET 10, upgrade assistant dotnet, web.config appsettings, Global.asax Program.cs, breaking changes dotnet"
translation_of: "/dotnet/dotnet-migration/"
---

## Why migrate and when

**.NET Framework 4.8** is the final version of the "old" .NET. Microsoft still supports it but isn't adding new features. Everything new lives in `.NET 10`.

**.NET 10** shipped in November 2025, an LTS release supported until November 2028. Reasons to migrate:
- Performance: .NET 10 is 2-5x faster than Framework on typical API workloads
- Cross-platform: Linux containers, Docker, lower hosting costs
- C# 14 and modern patterns
- Native AOT — small binaries, fast startup

## What's fundamentally different

| .NET Framework | .NET 10 |
|----------------|---------|
| `Global.asax` | `Program.cs` |
| `Web.config` | `appsettings.json` |
| `Startup.cs` (OWIN) | `WebApplication.CreateBuilder()` |
| `System.Web.HttpContext` | `Microsoft.AspNetCore.Http.HttpContext` |
| `HttpModule` / `HttpHandler` | Middleware |
| `WebForms` | Blazor / Razor Pages / MVC |
| `WCF` | gRPC / REST / SignalR |
| Synchronous controllers | Async by default |

## Step 1 — Assess the scope

Before starting, run **.NET Upgrade Assistant**:

```bash
dotnet tool install -g upgrade-assistant
upgrade-assistant analyze ./YourSolution.sln
```

It will show:
- Which NuGet packages are incompatible
- Which APIs are deprecated or removed
- A migration complexity estimate per project

Also check the [.NET Compatibility Analyzer](https://learn.microsoft.com/dotnet/core/porting/) — paste in your code, get a list of issues.

## Step 2 — Update the project file

The old `.csproj` format is replaced by SDK-style:

```xml
<!-- Before (.NET Framework) -->
<Project ToolsVersion="15.0" xmlns="...">
  <Import Project="$(MSBuildExtensionsPath)\..." />
  <PropertyGroup>
    <TargetFrameworkVersion>v4.8</TargetFrameworkVersion>
  </PropertyGroup>
  <ItemGroup>
    <Reference Include="System.Web" />
    ...hundreds of References lines...
  </ItemGroup>
</Project>

<!-- After (.NET 10) -->
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
</Project>
```

## Step 3 — Program.cs instead of Global.asax

```csharp
// Before: Global.asax
protected void Application_Start()
{
    AreaRegistration.RegisterAllAreas();
    FilterConfig.RegisterGlobalFilters(GlobalFilters.Filters);
    RouteConfig.RegisterRoutes(RouteTable.Routes);
}

// After: Program.cs (.NET 10)
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Register your own services
builder.Services.AddScoped<IProductService, ProductService>();

var app = builder.Build();

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();
```

## Step 4 — Configuration

```csharp
// Before: Web.config + ConfigurationManager
var connStr = ConfigurationManager.ConnectionStrings["MyDb"].ConnectionString;
var apiKey  = ConfigurationManager.AppSettings["ApiKey"];

// After: appsettings.json + IConfiguration
// appsettings.json:
// {
//   "ConnectionStrings": { "MyDb": "Server=..." },
//   "ApiKey": "secret"
// }

// In a service via DI:
public class MyService(IConfiguration config)
{
    private readonly string _connStr = config.GetConnectionString("MyDb")!;
    private readonly string _apiKey  = config["ApiKey"]!;
}
```

For development, secrets go in `dotnet user-secrets`; for production, environment variables or Vault.

## Step 5 — HttpContext and Request

```csharp
// Before
var userAgent = HttpContext.Current.Request.UserAgent;
var ip = HttpContext.Current.Request.UserHostAddress;
HttpContext.Current.Response.Redirect("/home");

// After — HttpContext is injected via IHttpContextAccessor
public class MyService(IHttpContextAccessor accessor)
{
    public string GetUserAgent()
    {
        var ctx = accessor.HttpContext!;
        return ctx.Request.Headers.UserAgent.ToString();
    }
}

// Or directly in a controller (it already has HttpContext)
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

## Step 6 — Middleware instead of HttpModules

```csharp
// Before: HttpModule
public class LoggingModule : IHttpModule
{
    public void Init(HttpApplication app)
    {
        app.BeginRequest += (s, e) => Log("Request started");
    }
}

// After: Middleware
public class LoggingMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        Log($"Request: {context.Request.Path}");
        await next(context);
        Log($"Response: {context.Response.StatusCode}");
    }
}

// Registration in Program.cs
app.UseMiddleware<LoggingMiddleware>();
```

## Common migration problems

**System.Web is gone entirely** — anything that depends on `System.Web.dll` needs replacement. Look for alternatives in `Microsoft.AspNetCore.*`.

**WCF is not supported** — replace with:
- REST API (ASP.NET Core Controllers or Minimal API)
- gRPC (`Grpc.AspNetCore`) — if you need a binary protocol
- CoreWCF — open-source WCF port, helps with large legacy codebases

**Synchronous operations** — in .NET Core, synchronous I/O in controllers is forbidden by default. Go async:

```csharp
// Before
public ActionResult Get(int id)
{
    var product = _db.Products.Find(id); // synchronous call
    return View(product);
}

// After
public async Task<IActionResult> Get(int id)
{
    var product = await _db.Products.FindAsync(id);
    return Ok(product);
}
```

**Thread.Sleep in tests and code** — replace with `await Task.Delay()`.

## Strategy: gradual or big-bang

Two approaches:

**Big bang** — rewrite everything at once. Suitable for small projects (< 50K lines of code).

**Strangler Fig** — run a new .NET 10 API alongside the old one. A reverse proxy (nginx) routes new endpoints to the new service, old ones to Framework. Migrate module by module.

```nginx
# Nginx routing: new endpoints → .NET 10, the rest → .NET Framework
location /api/v2/ {
    proxy_pass http://dotnet10-service:5000;
}
location / {
    proxy_pass http://framework-service:80;
}
```

Strangler Fig is safer for big projects — you can roll back at any moment.

> 💡 .NET Upgrade Assistant can auto-convert project files, web.config, and some code. Run it first — saves a few hours of manual work.

---
name: dotnet-migrate
description: Migrate .NET Framework code to .NET 10 — analyze, plan, and apply changes step by step
allowed-tools: Read, Edit, Write, Bash
---

Мигрируй проект с .NET Framework на .NET 10: $ARGUMENTS

Если аргумент не передан — анализируй текущую директорию.

## Шаг 1 — Анализ

1. Найди все `.csproj` файлы: `find . -name "*.csproj" -not -path "*/obj/*"`
2. Прочитай каждый `.csproj` — определи:
   - Текущий target framework (`net48`, `net472` и т.д.)
   - Старый формат (есть `<Import Project="$(MSBuildToolsPath)\Microsoft.CSharp.targets">`) или SDK-style
   - Используется ли `System.Web`, `WCF`, `WebForms`
3. Найди `Global.asax`, `Web.config`, `packages.config` — это признаки старого проекта

Выдай список: что нужно изменить, в каком порядке, что может сломаться.

## Шаг 2 — Конвертация csproj в SDK-style

Для каждого `.csproj` замени содержимое на минимальный SDK формат:

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
</Project>
```

Добавь только те пакеты NuGet которые реально используются в коде.

## Шаг 3 — Program.cs

Если есть `Global.asax` — создай `Program.cs` с minimal hosting:

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
// перенеси регистрацию сервисов из Global.asax.cs Application_Start

var app = builder.Build();
app.UseRouting();
app.MapControllers();
app.Run();
```

## Шаг 4 — Web.config → appsettings.json

Конвертируй `<appSettings>` в `appsettings.json`. Строки подключения — в секцию `ConnectionStrings`.

## Шаг 5 — Проверка

Запусти `dotnet build` и исправь все ошибки компиляции. Если есть `System.Web` — предупреди: он не существует в .NET 10, нужна замена.

После каждого исправленного файла — commit чтобы можно было откатиться.

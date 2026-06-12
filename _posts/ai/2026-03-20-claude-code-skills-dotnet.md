---
layout: post
title: "Топ Skills для .NET + Angular + Docker в Claude Code"
categories: ai
translation_of: "/en/ai/claude-code-skills-dotnet/"
tldr:
  - "Шесть готовых скиллов под .NET + Angular: /review, /test, /api, /component, /debug, /db — каждый лежит в .claude/skills/<имя>/SKILL.md с frontmatter."
  - "/review запускает git diff HEAD и проверяет чеклист: async/await для IO, DTO вместо entity, standalone компоненты, OnPush, отсутствие any и Console.WriteLine."
  - "/test пишет unit-тесты: xUnit + Moq для C# (имя МетодНазвание_Условие_ОжидаемыйРезультат), Jasmine/Jest для Angular; после генерации запускает тесты."
  - "Frontmatter задаёт name, description и allowed-tools; чем точнее description, тем лучше Claude вызывает скилл сам; старый формат .claude/commands/ тоже работает."
faq:
  - q: "Чем формат SKILL.md отличается от старых команд в .claude/commands/?"
    a: "Скилл теперь живёт в папке .claude/skills/<имя>/SKILL.md и имеет frontmatter с полями name, description и allowed-tools. Разницы в поведении со старым форматом .claude/commands/review.md нет — он продолжает работать, просто новый поддерживает больше настроек. Поле allowed-tools ограничивает инструменты: например, /review хватает Read и Bash, а /test нужен ещё Write."
  - q: "Что проверяет скилл /review при код-ревью .NET + Angular проекта?"
    a: "Он запускает git diff HEAD и идёт по чеклисту. Для C#: async/await на IO, DTO вместо entity в контроллерах, отсутствие Console.WriteLine, Repository pattern, никаких магических строк. Для Angular: standalone-компоненты, OnPush, подписки через async pipe или takeUntilDestroyed(), inject() вместо constructor injection, явные типы без any. Результат — три списка: что хорошо, что нарушает стандарты (файл и строка) и спорные моменты."
  - q: "Как заставить Claude писать unit-тесты по стандартам проекта?"
    a: "Скилл /test фиксирует правила в SKILL.md: для C# — xUnit + Moq, имя теста МетодНазвание_Условие_ОжидаемыйРезультат, мок зависимостей вместо реальной БД, покрытие happy path, null-входов, граничных значений и исключений. Для Angular — Jasmine/TestBed или Jest с jasmine.createSpyObj и HttpClientTestingModule. После генерации скилл сам запускает тесты и проверяет, что они зелёные."
  - q: "Как Claude Code решает, когда вызвать скилл автоматически?"
    a: "По полю description в frontmatter: Claude сопоставляет запрос пользователя с описаниями доступных скиллов. Чем точнее description, тем выше шанс автоматического вызова — пиши его как ответ на вопрос «когда запускать этот скилл?». Например, «Проверить текущие изменения на соответствие стандартам проекта» сработает на просьбу сделать ревью без явного /review."
  - q: "Как передать аргументы в скилл Claude Code?"
    a: "Через плейсхолдер $ARGUMENTS в теле SKILL.md: всё, что написано после имени команды, подставляется на его место. Например, /test ProductService подставит ProductService, а /db «найти заказы за месяц с суммой > 1000» передаст всё описание запроса. Скилл может предусмотреть и пустой аргумент — /debug без параметров сам возьмёт логи через docker compose logs --tail=50 api."
date: 2026-03-20
date_ru: "20 марта 2026"
read_time: 10
difficulty: intermediate
description: "Готовые Skills для Claude Code под стек .NET, Angular, MySQL, MongoDB и Docker: /review, /test, /api, /component, /debug, /db — копируй и используй."
excerpt_text: "Готовые /review, /test, /api, /component, /debug и /db под твой стек — копируй и используй"
keywords: "claude code skills dotnet, claude code angular skills, .claude/commands, SKILL.md, claude code slash commands"
---

## Новый формат: SKILL.md с frontmatter

Раньше скиллы были просто Markdown-файлами в `.claude/commands/`. Сейчас рекомендуемый подход — папка `.claude/skills/` и файл `SKILL.md` с frontmatter ([основы Skills](/ai/claude-code-skills/) — в отдельной статье):

```
.claude/
└── skills/
    ├── review/
    │   └── SKILL.md
    ├── test/
    │   └── SKILL.md
    └── api/
        └── SKILL.md
```

Frontmatter управляет поведением:

```markdown
---
name: review
description: Код-ревью по стандартам проекта — C# и Angular
allowed-tools: Read, Bash
---
... инструкции ...
```

Старый формат `.claude/commands/review.md` тоже работает — разницы в поведении нет, просто новый поддерживает больше настроек.

---

## /review — код-ревью по стандартам проекта

`.claude/skills/review/SKILL.md`:

```markdown
---
name: review
description: Проверить текущие изменения на соответствие стандартам проекта
allowed-tools: Read, Bash
---

Сделай код-ревью изменений в репозитории.

1. Запусти `git diff HEAD` чтобы увидеть что изменилось
2. Проверь по чеклисту:

### Backend (C#)
- Async/await везде где есть IO — нет синхронных вызовов к БД
- DTO используются в контроллерах, entity не возвращаются напрямую
- Нет `Console.WriteLine`, `Debug.WriteLine` в продакшн-коде
- FluentValidation подключена для входящих запросов
- Зависимости инжектируются через конструктор или `inject()`, не через `new`
- Repository pattern — сервисы не работают напрямую с DbContext/IMongoCollection
- Нет магических строк — используются константы или enum

### Frontend (Angular)
- Standalone компоненты, без NgModules
- `ChangeDetectionStrategy.OnPush` где нет динамики
- Подписки через `async pipe` или `takeUntilDestroyed()` — нет утечек
- Нет прямого обращения к DOM через `document.querySelector`
- Сервисы через `inject()` а не constructor injection
- Типы явные, нет `any`

### Общее
- Нет закомментированного кода
- Нет TODO/FIXME без тикета
- Нет хардкода секретов, URL, паролей

Выдай:
- ✅ что хорошо
- ❌ что нарушает стандарты (с указанием файла и строки)
- ⚠️ спорные моменты
```

Использование: `/review`

---

## /test — написать тесты для файла

`.claude/skills/test/SKILL.md`:

```markdown
---
name: test
description: Написать unit-тесты для указанного файла или класса
allowed-tools: Read, Write, Bash
---

Напиши тесты для $ARGUMENTS.

### Если это C# (.NET):
- Используй xUnit + Moq
- Один тест — одно утверждение (или минимально связанные Assert)
- Имя теста: `МетодНазвание_Условие_ОжидаемыйРезультат`
- Мокируй зависимости через Moq, не создавай реальные объекты БД
- Покрой: happy path, пустые/null входные данные, граничные значения, ожидаемые исключения

Пример структуры:
```csharp
public class ProductServiceTests
{
    private readonly Mock<IProductRepository> _repo = new();
    private readonly ProductService _sut;

    public ProductServiceTests() => _sut = new(_repo.Object);

    [Fact]
    public async Task GetById_ExistingId_ReturnsProduct() { ... }

    [Fact]
    public async Task GetById_NotFound_ThrowsNotFoundException() { ... }
}
```

### Если это TypeScript (Angular):
- Используй Jasmine + TestBed или Jest
- Мокируй сервисы через `jasmine.createSpyObj`
- Проверяй: рендеринг компонента, вызовы сервисов, изменения состояния
- Для сервисов: проверяй вызовы HttpClient через `HttpClientTestingModule`

После написания запусти тесты и убедись что они проходят.
```

Использование: `/test ProductService` или `/test src/app/features/orders/order.component.ts`

---

## /api — добавить новый эндпоинт

`.claude/skills/api/SKILL.md`:

```markdown
---
name: api
description: Создать новый REST API эндпоинт с полным слоем: controller, service, repository, DTO
allowed-tools: Read, Write, Bash
---

Создай новый API эндпоинт: $ARGUMENTS

Шаги:

1. **DTO** — создай Request и Response DTO в `src/Api/DTOs/`
   - Используй record или class с init-свойствами
   - Добавь FluentValidation валидатор для Request DTO

2. **Repository** — создай интерфейс и реализацию в `src/Infrastructure/Repositories/`
   - Наследуй от базового репозитория если есть
   - Async методы, CancellationToken параметр

3. **Service** — создай интерфейс и реализацию в `src/Application/Services/`
   - Зависимость через интерфейс репозитория
   - Бизнес-логика здесь, не в контроллере

4. **Controller** — добавь эндпоинт в `src/Api/Controllers/`
   - `[ApiController]`, `[Route("api/[controller]")]`
   - Используй ActionResult<T>
   - Swagger-комментарии `[ProducesResponseType]`

5. **DI** — зарегистрируй сервис и репозиторий в `Program.cs` или extension-методе

6. Запусти `dotnet build` — должно быть 0 ошибок

Следуй соглашениям из CLAUDE.md.
```

Использование: `/api GET /products/{id} — получить продукт по ID`

---

## /component — Angular компонент

`.claude/skills/component/SKILL.md`:

```markdown
---
name: component
description: Создать Angular standalone компонент с сервисом и маршрутом
allowed-tools: Read, Write, Bash
---

Создай Angular компонент: $ARGUMENTS

1. Папка `src/app/features/$name/`

2. **Компонент** `$name.component.ts`:
   - `standalone: true`
   - `changeDetection: ChangeDetectionStrategy.OnPush`
   - Сервисы через `inject()`
   - Шаблон и стили в отдельных файлах

3. **Сервис** `$name.service.ts`:
   - `providedIn: 'root'`
   - Методы возвращают `Observable<T>`
   - `HttpClient` через `inject(HttpClient)`

4. **Маршрут** — добавь в `$name.routes.ts`:
   ```typescript
   export const NAME_ROUTES: Routes = [
     { path: '', component: NameComponent }
   ];
   ```

5. Используй `ng build` или `npm run build` чтобы убедиться что нет ошибок типов

Используй `inject()` вместо constructor injection. Типы явные, без `any`.
```

Использование: `/component ProductList`

---

## /debug — разобрать ошибку

`.claude/skills/debug/SKILL.md`:

```markdown
---
name: debug
description: Проанализировать ошибку или исключение и предложить решение
allowed-tools: Read, Bash
---

Разбери ошибку: $ARGUMENTS

Если аргумент не передан — возьми последние логи:
`docker compose logs --tail=50 api`

Порядок работы:
1. Прочитай сообщение об ошибке и stack trace полностью
2. Найди корневую причину (не симптом)
3. Найди в коде файл и строку где происходит ошибка
4. Объясни простым языком что произошло и почему
5. Предложи конкретное исправление с кодом
6. Если ошибка в конфигурации — проверь docker-compose.yml и .env

Не предлагай обойти ошибку через try/catch если не понятна причина.
```

Использование: `/debug` — возьмёт логи сам, или `/debug NullReferenceException in ProductService line 42`

---

## /db — помочь с запросом

`.claude/skills/db/SKILL.md`:

```markdown
---
name: db
description: Написать запрос к MySQL через EF Core LINQ или к MongoDB через Driver
allowed-tools: Read, Bash
---

Напиши запрос: $ARGUMENTS

Определи по контексту — MySQL или MongoDB.

### MySQL (EF Core):
- Используй LINQ, не сырой SQL
- Включай `.AsNoTracking()` для read-only запросов
- `.Include()` только для нужных связей — не грузи всё
- Для сложных фильтров — спецификации или expression-деревья
- Покажи сгенерированный SQL через `.ToQueryString()` если запрос нетривиальный

### MongoDB:
- Используй типизированные фильтры через `Builders<T>.Filter`
- Для агрегации — `.Aggregate()` pipeline
- Индексы: если запрос по полю которое часто фильтруется — предложи создать индекс
- Projection для больших документов — не тягай лишние поля

После написания запроса — объясни что он делает и есть ли риски производительности.
```

Использование: `/db найти все заказы пользователя за последний месяц с суммой > 1000`

---

## Итого: структура папки

```
.claude/
└── skills/
    ├── review/SKILL.md      # /review — код-ревью
    ├── test/SKILL.md        # /test — написать тесты
    ├── api/SKILL.md         # /api — новый эндпоинт
    ├── component/SKILL.md   # /component — Angular компонент
    ├── debug/SKILL.md       # /debug — разобрать ошибку
    └── db/SKILL.md          # /db — запрос к БД
```

Плюс из [предыдущей статьи](/ai/claude-code-dotnet-angular/): `/migrate`, `/feature`, `/check`, `/logs`.

> 💡 Чем точнее описание в `description:` — тем лучше Claude понимает когда применять скилл автоматически. Пиши его как ответ на вопрос «когда запускать этот скилл?».

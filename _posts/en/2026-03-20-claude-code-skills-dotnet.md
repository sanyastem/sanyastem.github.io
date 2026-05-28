---
layout: post
title: "Top Skills for .NET + Angular + Docker in Claude Code"
categories: ai
date: 2026-03-20
read_time: 10
difficulty: intermediate
description: "Ready-to-use Skills for Claude Code on a .NET, Angular, MySQL, MongoDB, and Docker stack: /review, /test, /api, /component, /debug, /db — copy and use."
excerpt_text: "Ready-to-use /review, /test, /api, /component, /debug, and /db for your stack — copy and use"
keywords: "claude code skills dotnet, claude code angular skills, .claude/commands, SKILL.md, claude code slash commands"
translation_of: "/ai/claude-code-skills-dotnet/"
---

## New format: SKILL.md with frontmatter

Skills used to be plain Markdown files in `.claude/commands/`. Now the recommended approach is a `.claude/skills/` folder with `SKILL.md` files and frontmatter:

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

Frontmatter controls behavior:

```markdown
---
name: review
description: Code review against project standards — C# and Angular
allowed-tools: Read, Bash
---
... instructions ...
```

The old `.claude/commands/review.md` format still works — no behavior difference, the new one just supports more settings.

---

## /review — code review against project standards

`.claude/skills/review/SKILL.md`:

```markdown
---
name: review
description: Check current changes against project standards
allowed-tools: Read, Bash
---

Do a code review of the repo changes.

1. Run `git diff HEAD` to see what changed
2. Check against the checklist:

### Backend (C#)
- Async/await wherever there's IO — no sync calls to DB
- DTOs in controllers, no raw entities returned
- No `Console.WriteLine`, `Debug.WriteLine` in production code
- FluentValidation wired up for incoming requests
- Dependencies injected via constructor or `inject()`, not `new`
- Repository pattern — services don't touch DbContext/IMongoCollection directly
- No magic strings — use constants or enums

### Frontend (Angular)
- Standalone components, no NgModules
- `ChangeDetectionStrategy.OnPush` where there's no dynamic state
- Subscriptions via `async pipe` or `takeUntilDestroyed()` — no leaks
- No direct DOM access via `document.querySelector`
- Services via `inject()`, not constructor injection
- Explicit types, no `any`

### General
- No commented-out code
- No TODO/FIXME without a ticket
- No hardcoded secrets, URLs, or passwords

Output:
- ✅ what's good
- ❌ what violates standards (with file and line)
- ⚠️ ambiguous bits
```

Usage: `/review`

---

## /test — write tests for a file

`.claude/skills/test/SKILL.md`:

```markdown
---
name: test
description: Write unit tests for the given file or class
allowed-tools: Read, Write, Bash
---

Write tests for $ARGUMENTS.

### If it's C# (.NET):
- xUnit + Moq
- One test — one assertion (or minimally related Asserts)
- Test name: `MethodName_Condition_ExpectedResult`
- Mock dependencies via Moq, don't create real DB objects
- Cover: happy path, empty/null input, edge values, expected exceptions

Structure example:
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

### If it's TypeScript (Angular):
- Jasmine + TestBed or Jest
- Mock services via `jasmine.createSpyObj`
- Check: component rendering, service calls, state changes
- For services: verify HttpClient calls via `HttpClientTestingModule`

After writing, run the tests and make sure they pass.
```

Usage: `/test ProductService` or `/test src/app/features/orders/order.component.ts`

---

## /api — add a new endpoint

`.claude/skills/api/SKILL.md`:

```markdown
---
name: api
description: Create a new REST API endpoint with the full layer cake: controller, service, repository, DTO
allowed-tools: Read, Write, Bash
---

Create a new API endpoint: $ARGUMENTS

Steps:

1. **DTO** — create Request and Response DTOs in `src/Api/DTOs/`
   - Use a record or class with init-only properties
   - Add a FluentValidation validator for the Request DTO

2. **Repository** — create interface and implementation in `src/Infrastructure/Repositories/`
   - Inherit from a base repository if one exists
   - Async methods, CancellationToken parameter

3. **Service** — create interface and implementation in `src/Application/Services/`
   - Depend on the repository interface
   - Business logic here, not in the controller

4. **Controller** — add the endpoint in `src/Api/Controllers/`
   - `[ApiController]`, `[Route("api/[controller]")]`
   - Use ActionResult<T>
   - Swagger annotations `[ProducesResponseType]`

5. **DI** — register service and repository in `Program.cs` or an extension method

6. Run `dotnet build` — must be 0 errors

Follow CLAUDE.md conventions.
```

Usage: `/api GET /products/{id} — get product by ID`

---

## /component — Angular component

`.claude/skills/component/SKILL.md`:

```markdown
---
name: component
description: Create a standalone Angular component with service and route
allowed-tools: Read, Write, Bash
---

Create an Angular component: $ARGUMENTS

1. Folder `src/app/features/$name/`

2. **Component** `$name.component.ts`:
   - `standalone: true`
   - `changeDetection: ChangeDetectionStrategy.OnPush`
   - Services via `inject()`
   - Template and styles in separate files

3. **Service** `$name.service.ts`:
   - `providedIn: 'root'`
   - Methods return `Observable<T>`
   - `HttpClient` via `inject(HttpClient)`

4. **Route** — add to `$name.routes.ts`:
   ```typescript
   export const NAME_ROUTES: Routes = [
     { path: '', component: NameComponent }
   ];
   ```

5. Run `ng build` or `npm run build` to confirm no type errors

Use `inject()` instead of constructor injection. Explicit types, no `any`.
```

Usage: `/component ProductList`

---

## /debug — diagnose an error

`.claude/skills/debug/SKILL.md`:

```markdown
---
name: debug
description: Analyze an error or exception and propose a fix
allowed-tools: Read, Bash
---

Diagnose the error: $ARGUMENTS

If no argument passed — pull the latest logs:
`docker compose logs --tail=50 api`

Procedure:
1. Read the error message and stack trace fully
2. Find the root cause (not the symptom)
3. Locate the file and line where the error happens
4. Explain in plain English what happened and why
5. Propose a concrete fix with code
6. If the error is in configuration — check docker-compose.yml and .env

Don't suggest hiding the error with try/catch if the cause is unclear.
```

Usage: `/debug` — grabs logs itself, or `/debug NullReferenceException in ProductService line 42`

---

## /db — help with a query

`.claude/skills/db/SKILL.md`:

```markdown
---
name: db
description: Write a query against MySQL via EF Core LINQ or MongoDB via Driver
allowed-tools: Read, Bash
---

Write a query: $ARGUMENTS

Detect from context — MySQL or MongoDB.

### MySQL (EF Core):
- Use LINQ, not raw SQL
- Add `.AsNoTracking()` for read-only queries
- `.Include()` only for needed relations — don't pull everything
- For complex filters — specifications or expression trees
- Show the generated SQL via `.ToQueryString()` if the query is non-trivial

### MongoDB:
- Use typed filters via `Builders<T>.Filter`
- For aggregation — `.Aggregate()` pipeline
- Indexes: if the query filters by a frequently-used field — suggest creating an index
- Projection for large documents — don't pull extra fields

After writing — explain what it does and any performance risks.
```

Usage: `/db find all orders for a user in the last month with total > 1000`

---

## Summary: folder structure

```
.claude/
└── skills/
    ├── review/SKILL.md      # /review — code review
    ├── test/SKILL.md        # /test — write tests
    ├── api/SKILL.md         # /api — new endpoint
    ├── component/SKILL.md   # /component — Angular component
    ├── debug/SKILL.md       # /debug — diagnose an error
    └── db/SKILL.md          # /db — DB query
```

Plus from the previous post: `/migrate`, `/feature`, `/check`, `/logs`.

> 💡 The more precise the `description:`, the better Claude understands when to apply the skill automatically. Write it as an answer to "when should this skill run?".

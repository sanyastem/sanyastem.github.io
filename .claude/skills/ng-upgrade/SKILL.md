---
name: ng-upgrade
description: Migrate Angular component to modern Angular 20 style — Signals, standalone, @if/@for, input()/output(), OnPush
allowed-tools: Read, Edit, Bash
---

Модернизируй Angular компонент до Angular 20 стиля: $ARGUMENTS

Если файл не указан — возьми из `git diff HEAD` изменённые `.component.ts` файлы.

## Что мигрировать

### 1. Standalone (обязательно)
Убери `NgModule`, добавь `standalone: true` и перечисли зависимости в `imports: []` самого компонента.

### 2. ChangeDetectionStrategy.OnPush
Добавь ко всем компонентам. Без этого Zoneless не работает корректно.

### 3. @Input()/@Output() → input()/output()
```typescript
// ДО
@Input() userId!: number;
@Output() selected = new EventEmitter<User>();

// ПОСЛЕ
userId = input.required<number>();
selected = output<User>();
```

### 4. BehaviorSubject/Subject → signal()
```typescript
// ДО
private _items$ = new BehaviorSubject<Item[]>([]);
items$ = this._items$.asObservable();

// ПОСЛЕ
items = signal<Item[]>([]);
```

### 5. *ngIf/*ngFor → @if/@for
```html
<!-- ДО -->
<div *ngIf="user; else loading">...</div>
<li *ngFor="let item of items; trackBy: trackById">

<!-- ПОСЛЕ -->
@if (user(); as u) { <div>...</div> } @else { <ng-container #loading /> }
@for (item of items(); track item.id) { <li>...</li> }
```

### 6. Constructor injection → inject()
```typescript
// ДО
constructor(private userService: UserService) {}

// ПОСЛЕ
private userService = inject(UserService);
```

### 7. async pipe → toSignal() для Observables
```typescript
// ДО: items$ | async в шаблоне
// ПОСЛЕ
items = toSignal(this.items$, { initialValue: [] });
// В шаблоне: items() вместо (items$ | async)
```

### 8. HTTP запросы → httpResource()
Если компонент загружает данные через сервис при инициализации:
```typescript
// ПОСЛЕ
dataResource = httpResource<T>(() => `/api/endpoint/${this.id()}`);
// шаблон: dataResource.value(), dataResource.isLoading(), dataResource.error()
```

## Порядок работы

1. Прочитай компонент целиком
2. Примени миграции из списка выше (только применимые)
3. Запусти `npm run build` или `ng build` — 0 ошибок
4. Запусти `npm test` если есть тесты

Не переписывай логику — только синтаксис и паттерны.

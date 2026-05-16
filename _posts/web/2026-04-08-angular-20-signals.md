---
layout: post
title: "Angular 20: Signals, Zoneless и новый синтаксис шаблонов"
categories: web
date: 2026-04-08
date_ru: "8 апреля 2026"
read_time: 13
difficulty: intermediate
description: "Angular 20 — Signals полностью стабильны, Zoneless вышел из experimental, новый control flow (@if/@for), resource() и httpResource() для async данных, standalone по умолчанию."
excerpt_text: "Signals stable, Zoneless stable, @if/@for, resource() и httpResource() — Angular 20 без компромиссов"
excerpt: "Что нового в Angular 20: Signals полностью стабильны, Zoneless вышел из experimental, новый @if/@for, resource() и httpResource()."
keywords: "Angular 20 Signals, Zoneless Angular, Angular control flow @if @for, httpResource Angular 20, linkedSignal, standalone компоненты Angular 20"
faq:
  - q: "Можно ли Signals с NgRx Classic?"
    a: "Да, они отлично сосуществуют. NgRx-store экспонирует Observable через selectors, конвертируешь в Signal через toSignal(). Часто гибрид встречается в крупных проектах: общий стейт (auth, router) на NgRx Classic, новые фичи на Signal Store. Через год Classic остаётся только где реально нужен."
  - q: "Zoneless требует переписать весь app?"
    a: "Нет. Включаешь provideZonelessChangeDetection() — Zone.js удаляется. Компоненты на Signals работают сразу. Компоненты на OnPush + Observable через async pipe — тоже работают. Сломаются только компоненты без OnPush, полагающиеся на zone-patching setTimeout/setInterval — но их и так нужно переписать."
  - q: "OnPush + Zone.js что делать?"
    a: "Ничего не делать — продолжают работать как прежде. Zoneless — opt-in, можно мигрировать постепенно: новые компоненты пиши Signal-first, старые оставляй на OnPush. Когда 80%+ покрыто Signals — включаешь zoneless глобально."
  - q: "linkedSignal vs computed — когда что?"
    a: "computed — derived signal только для чтения, пересчитывается автоматически из зависимостей. linkedSignal — derived + writable, можно перезаписать сверху и снова сбрасывается при изменении source. Пример: pagination current page — linkedSignal({source: category, computation: () => 1}) сбрасывает на 1 при смене категории."
---

{% raw %}
## Что изменилось в Angular 20

Angular 20 вышел в мае 2025. Это самый значительный релиз за несколько лет.

**Главное:**
- Signals API — полностью стабилен (`signal`, `computed`, `effect`, `linkedSignal`, `toSignal`, `toObservable`)
- Zoneless change detection — стабилен начиная с Angular 20.2
- Новый control flow (`@if`, `@for`, `@switch`) — стабилен с v17, теперь рекомендуемый
- `resource()` и `httpResource()` — встроенная загрузка async данных
- Standalone по умолчанию — NgModules уже не нужны для новых проектов
- Требуется TypeScript 5.8+

## Signals — реактивность без Zone.js

### Основы

```typescript
import { signal, computed, effect } from '@angular/core';

@Component({
  standalone: true,
  template: `
    <p>Count: {{ count() }}</p>
    <p>Double: {{ double() }}</p>
    <button (click)="increment()">+1</button>
  `
})
export class CounterComponent {
  count = signal(0);                          // WritableSignal<number>
  double = computed(() => this.count() * 2); // Signal<number>

  constructor() {
    effect(() => {
      // Автоматически перезапускается при изменении count()
      console.log('Count changed:', this.count());
    });
  }

  increment() {
    this.count.update(v => v + 1);  // функциональное обновление
    // или
    this.count.set(this.count() + 1); // прямое присвоение
  }
}
```

### linkedSignal (Angular 19+)

`linkedSignal` — signal который синхронизируется с другим signal:

```typescript
import { signal, linkedSignal } from '@angular/core';

@Component({
  standalone: true,
  template: `
    <select (change)="category.set($event.target.value)">
      <option>Electronics</option>
      <option>Books</option>
    </select>
    <!-- page сбрасывается при смене категории -->
    <span>Page: {{ page() }}</span>
    <button (click)="page.set(page() + 1)">Next</button>
  `
})
export class ProductListComponent {
  category = signal('Electronics');

  // page сбрасывается в 1 при каждом изменении category
  page = linkedSignal({
    source: this.category,
    computation: () => 1
  });
}
```

### Работа с Observable — toSignal / toObservable

```typescript
import { toSignal, toObservable } from '@angular/core/rxjs-interop';

@Component({ standalone: true })
export class SearchComponent {
  searchQuery = signal('');

  // Signal → Observable (для debounce/switchMap)
  results$ = toObservable(this.searchQuery).pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(query => this.api.search(query))
  );

  // Observable → Signal (для использования в шаблоне)
  results = toSignal(this.results$, { initialValue: [] });
}
```

## Zoneless Change Detection

Zone.js — библиотека которая патчила браузерные API (setTimeout, fetch, DOM events) чтобы Angular знал когда запускать change detection. Это добавляло ~100KB к бандлу и замедляло приложение.

Zoneless работает с Signals — Angular знает что изменилось, не нужно патчить всё подряд.

```typescript
// main.ts — включаем Zoneless
import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    // ...другие провайдеры
  ]
});
```

```typescript
// Компонент для Zoneless — используй Signals или OnPush
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush, // обязательно с Zoneless!
  template: `
    <h1>{{ title() }}</h1>
    <ul>
      @for (item of items(); track item.id) {
        <li>{{ item.name }}</li>
      }
    </ul>
  `
})
export class AppComponent {
  title = signal('My App');
  items = signal<Item[]>([]);
}
```

**Без `ChangeDetectionStrategy.OnPush` Zoneless не работает корректно.** Компонент не будет обновляться без явных сигналов от Signals или markForCheck().

## Новый Control Flow: @if, @for, @switch

Заменяет `*ngIf`, `*ngFor`, `*ngSwitch`. Встроен в компилятор, не требует импорта.

```html
<!-- @if — заменяет *ngIf -->
@if (user(); as u) {
  <p>Hello, {{ u.name }}!</p>
} @else if (loading()) {
  <app-spinner />
} @else {
  <p>Please log in</p>
}

<!-- @for — заменяет *ngFor -->
@for (product of products(); track product.id) {
  <app-product-card [product]="product" />
} @empty {
  <p>No products found</p>
}

<!-- @switch — заменяет *ngSwitch -->
@switch (status()) {
  @case ('active') { <span class="green">Active</span> }
  @case ('pending') { <span class="yellow">Pending</span> }
  @default { <span class="gray">Unknown</span> }
}
```

`@for` требует `track` — это не просто рекомендация, а обязательный синтаксис. Компилятор выдаст ошибку без него.

## resource() и httpResource()

Встроенная загрузка данных с состоянием loading/error/data без сторонних библиотек.

### resource()

```typescript
import { resource, signal } from '@angular/core';

@Component({
  standalone: true,
  template: `
    @if (productResource.isLoading()) {
      <app-spinner />
    } @else if (productResource.error()) {
      <p>Error: {{ productResource.error() }}</p>
    } @else {
      <app-product [product]="productResource.value()" />
    }
  `
})
export class ProductDetailComponent {
  productId = input.required<number>();

  productResource = resource({
    request: () => ({ id: this.productId() }), // реактивный request
    loader: async ({ request }) => {
      const response = await fetch(`/api/products/${request.id}`);
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json() as Promise<Product>;
    }
  });
}
```

`resource()` автоматически перезагружает данные когда меняется `productId`.

### httpResource() — для HTTP запросов

```typescript
import { httpResource } from '@angular/common/http';

@Component({ standalone: true })
export class OrderListComponent {
  userId = input.required<number>();

  // HttpResource — использует HttpClient внутри
  ordersResource = httpResource<Order[]>(
    () => `/api/users/${this.userId()}/orders`
  );

  // С параметрами запроса
  search = signal('');
  searchResource = httpResource<Product[]>(() => ({
    url: '/api/products',
    params: { q: this.search(), limit: '20' }
  }));

  // Принудительная перезагрузка
  refresh() {
    this.ordersResource.reload();
  }
}
```

`httpResource` возвращает объект с:
- `.value()` — данные (Signal)
- `.isLoading()` — boolean Signal
- `.error()` — Signal с ошибкой
- `.reload()` — принудительная перезагрузка

## Standalone — больше не нужны NgModules

```typescript
// Раньше — регистрировать в NgModule
@NgModule({
  declarations: [ProductCardComponent],
  imports: [CommonModule, RouterModule],
  exports: [ProductCardComponent]
})
export class ProductsModule {}

// Теперь — standalone компонент сам объявляет зависимости
@Component({
  standalone: true,
  selector: 'app-product-card',
  imports: [CurrencyPipe, RouterLink], // только то что нужно
  template: `
    <a [routerLink]="['/products', product().id]">
      <h3>{{ product().name }}</h3>
      <p>{{ product().price | currency:'RUB' }}</p>
    </a>
  `
})
export class ProductCardComponent {
  product = input.required<Product>();
}
```

## input(), output(), model() — новый API компонентов

```typescript
// Старый синтаксис
@Input() productId!: number;
@Output() selected = new EventEmitter<Product>();
@Input({ required: true }) label!: string;

// Новый синтаксис (Angular 17.1+, Signal-based)
@Component({ standalone: true })
export class ProductComponent {
  // inputs
  productId = input.required<number>();   // обязательный
  category = input<string>('all');        // с дефолтным значением

  // output
  selected = output<Product>();

  // two-way binding
  value = model<string>('');

  // computed из input
  productUrl = computed(() => `/products/${this.productId()}`);
}

// Использование в шаблоне родителя
// <app-product [productId]="42" (selected)="onSelect($event)" />
// <app-input [(value)]="searchQuery" />
```

## Пример: полный компонент с Signals

```typescript
import { Component, signal, computed, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy } from '@angular/core';

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
}

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, CurrencyPipe],
  template: `
    <input [(ngModel)]="search" placeholder="Search..." />

    @if (productsResource.isLoading()) {
      <p>Loading...</p>
    } @else if (productsResource.error()) {
      <p>Failed to load products</p>
      <button (click)="productsResource.reload()">Retry</button>
    } @else {
      <p>Found: {{ filteredProducts().length }}</p>
      @for (p of filteredProducts(); track p.id) {
        <div>
          <strong>{{ p.name }}</strong>
          <span>{{ p.price | currency:'RUB' }}</span>
        </div>
      } @empty {
        <p>No products match your search</p>
      }
    }
  `
})
export class ProductListComponent {
  search = signal('');

  productsResource = httpResource<Product[]>('/api/products');

  filteredProducts = computed(() => {
    const query = this.search().toLowerCase();
    const products = this.productsResource.value() ?? [];
    return query
      ? products.filter(p => p.name.toLowerCase().includes(query))
      : products;
  });
}
```

## Миграция с Zone.js на Signals

Постепенный путь:

1. Обнови до Angular 20, добавь TypeScript 5.8+
2. Конвертируй компоненты на `ChangeDetectionStrategy.OnPush`
3. Замени `@Input()/@Output()` на `input()/output()`
4. Замени `BehaviorSubject` на `signal()`
5. Замени `*ngIf/*ngFor` на `@if/@for`
6. Добавь `provideZonelessChangeDetection()` и удали `zone.js` из `polyfills`

Можно делать поэтапно — Zone.js и Signals работают вместе.

> 💡 `ng update @angular/core @angular/cli` — официальная миграция. Для каждой мажорной версии Angular предоставляет schematics которые автоматически конвертируют старый синтаксис. Запусти `ng update` чтобы увидеть доступные миграции.
{% endraw %}

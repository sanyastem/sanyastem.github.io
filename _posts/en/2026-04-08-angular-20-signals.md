---
layout: post
title: "Angular 20: Signals, Zoneless and the new template syntax"
categories: web
date: 2026-04-08
read_time: 13
difficulty: intermediate
description: "Angular 20: stable Signals, Zoneless out of experimental, new @if/@for control flow, resource() for async data, standalone by default."
excerpt_text: "Signals stable, Zoneless stable, @if/@for, resource() and httpResource() — Angular 20 with no compromises"
excerpt: "What's new in Angular 20: Signals are fully stable, Zoneless graduated from experimental, new @if/@for, resource() and httpResource()."
keywords: "Angular 20 Signals, Zoneless Angular, Angular control flow @if @for, httpResource Angular 20, linkedSignal, standalone components Angular 20"
translation_of: "/web/angular-20-signals/"
tldr:
  - "In Angular 20 the Signals API is fully stable (signal, computed, effect, linkedSignal), Zoneless change detection is stable since 20.2, TypeScript 5.8+ required."
  - "Zoneless is enabled with one line — provideZonelessChangeDetection() — and drops ~100KB of Zone.js from the bundle; components must use ChangeDetectionStrategy.OnPush."
  - "The new @if/@for/@switch control flow is built into the compiler and needs no imports; in @for the track parameter is mandatory — omitting it is a compile error."
  - "resource() and httpResource() load async data with built-in .value(), .isLoading(), .error() and .reload(), and re-fetch automatically when input signals change."
faq:
  - q: "Can I use Signals with NgRx Classic?"
    a: "Yes, they coexist nicely. The NgRx store exposes Observables through selectors, and you convert them to Signals with toSignal(). The hybrid is common in large projects: shared state (auth, router) on NgRx Classic, new features on Signal Store. A year in, Classic remains only where it is genuinely needed."
  - q: "Does Zoneless require rewriting the whole app?"
    a: "No. You enable provideZonelessChangeDetection() — Zone.js is removed. Components on Signals work right away. Components on OnPush + Observable via the async pipe work too. Only components without OnPush that rely on zone-patched setTimeout/setInterval break — and those need rewriting anyway."
  - q: "OnPush + Zone.js — what should I do?"
    a: "Nothing — they keep working as before. Zoneless is opt-in, so you can migrate gradually: write new components Signal-first, leave old ones on OnPush. Once 80%+ is covered by Signals — switch zoneless on globally."
  - q: "linkedSignal vs computed — when to use which?"
    a: "computed is a read-only derived signal, recomputed automatically from its dependencies. linkedSignal is derived + writable: you can overwrite it from above, and it resets again when the source changes. Example: the current pagination page — linkedSignal({source: category, computation: () => 1}) resets to 1 when the category changes."
---

{% raw %}
## What changed in Angular 20

Angular 20 was released in May 2025. It's the most significant release in several years.

**Highlights:**
- Signals API — fully stable (`signal`, `computed`, `effect`, `linkedSignal`, `toSignal`, `toObservable`)
- Zoneless change detection — stable starting with Angular 20.2
- New control flow (`@if`, `@for`, `@switch`) — stable since v17, now recommended
- `resource()` and `httpResource()` — built-in async data loading
- Standalone by default — NgModules are no longer needed for new projects
- Requires TypeScript 5.8+

## Signals — reactivity without Zone.js

### Basics

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
      // Re-runs automatically when count() changes
      console.log('Count changed:', this.count());
    });
  }

  increment() {
    this.count.update(v => v + 1);  // functional update
    // or
    this.count.set(this.count() + 1); // direct assignment
  }
}
```

### linkedSignal (Angular 19+)

`linkedSignal` — a signal that stays in sync with another signal:

```typescript
import { signal, linkedSignal } from '@angular/core';

@Component({
  standalone: true,
  template: `
    <select (change)="category.set($event.target.value)">
      <option>Electronics</option>
      <option>Books</option>
    </select>
    <!-- page resets when category changes -->
    <span>Page: {{ page() }}</span>
    <button (click)="page.set(page() + 1)">Next</button>
  `
})
export class ProductListComponent {
  category = signal('Electronics');

  // page resets to 1 every time category changes
  page = linkedSignal({
    source: this.category,
    computation: () => 1
  });
}
```

### Working with Observable — toSignal / toObservable

```typescript
import { toSignal, toObservable } from '@angular/core/rxjs-interop';

@Component({ standalone: true })
export class SearchComponent {
  searchQuery = signal('');

  // Signal → Observable (for debounce/switchMap)
  results$ = toObservable(this.searchQuery).pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(query => this.api.search(query))
  );

  // Observable → Signal (for use in the template)
  results = toSignal(this.results$, { initialValue: [] });
}
```

## Zoneless Change Detection

Zone.js — a library that patched browser APIs (setTimeout, fetch, DOM events) so Angular knew when to run change detection. It added ~100KB to the bundle and slowed down the app.

Zoneless works with Signals — Angular knows what changed, no need to patch everything indiscriminately.

```typescript
// main.ts — enable Zoneless
import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    // ...other providers
  ]
});
```

```typescript
// Component for Zoneless — use Signals or OnPush
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush, // mandatory with Zoneless!
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

**Without `ChangeDetectionStrategy.OnPush`, Zoneless doesn't work correctly.** The component won't update without explicit signals from Signals or markForCheck().

## New Control Flow: @if, @for, @switch

Replaces `*ngIf`, `*ngFor`, `*ngSwitch`. Built into the compiler, no import required.

```html
<!-- @if — replaces *ngIf -->
@if (user(); as u) {
  <p>Hello, {{ u.name }}!</p>
} @else if (loading()) {
  <app-spinner />
} @else {
  <p>Please log in</p>
}

<!-- @for — replaces *ngFor -->
@for (product of products(); track product.id) {
  <app-product-card [product]="product" />
} @empty {
  <p>No products found</p>
}

<!-- @switch — replaces *ngSwitch -->
@switch (status()) {
  @case ('active') { <span class="green">Active</span> }
  @case ('pending') { <span class="yellow">Pending</span> }
  @default { <span class="gray">Unknown</span> }
}
```

`@for` requires `track` — it's not just a recommendation, it's mandatory syntax. The compiler errors out without it.

## resource() and httpResource()

Built-in data loading with loading/error/data state, no third-party libraries.

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
    request: () => ({ id: this.productId() }), // reactive request
    loader: async ({ request }) => {
      const response = await fetch(`/api/products/${request.id}`);
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json() as Promise<Product>;
    }
  });
}
```

`resource()` automatically reloads data when `productId` changes.

### httpResource() — for HTTP requests

```typescript
import { httpResource } from '@angular/common/http';

@Component({ standalone: true })
export class OrderListComponent {
  userId = input.required<number>();

  // HttpResource — uses HttpClient under the hood
  ordersResource = httpResource<Order[]>(
    () => `/api/users/${this.userId()}/orders`
  );

  // With query parameters
  search = signal('');
  searchResource = httpResource<Product[]>(() => ({
    url: '/api/products',
    params: { q: this.search(), limit: '20' }
  }));

  // Force reload
  refresh() {
    this.ordersResource.reload();
  }
}
```

`httpResource` returns an object with:
- `.value()` — data (Signal)
- `.isLoading()` — boolean Signal
- `.error()` — Signal with the error
- `.reload()` — force reload

## Standalone — no more NgModules

```typescript
// Before — register in NgModule
@NgModule({
  declarations: [ProductCardComponent],
  imports: [CommonModule, RouterModule],
  exports: [ProductCardComponent]
})
export class ProductsModule {}

// Now — a standalone component declares its own dependencies
@Component({
  standalone: true,
  selector: 'app-product-card',
  imports: [CurrencyPipe, RouterLink], // only what you need
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

## input(), output(), model() — the new component API

```typescript
// Old syntax
@Input() productId!: number;
@Output() selected = new EventEmitter<Product>();
@Input({ required: true }) label!: string;

// New syntax (Angular 17.1+, Signal-based)
@Component({ standalone: true })
export class ProductComponent {
  // inputs
  productId = input.required<number>();   // required
  category = input<string>('all');        // with default value

  // output
  selected = output<Product>();

  // two-way binding
  value = model<string>('');

  // computed from input
  productUrl = computed(() => `/products/${this.productId()}`);
}

// Usage in the parent template
// <app-product [productId]="42" (selected)="onSelect($event)" />
// <app-input [(value)]="searchQuery" />
```

## Example: a complete component with Signals

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

## Migrating from Zone.js to Signals

For Signals-based state management there's a separate article — [Signal Store instead of NgRx](/en/web/angular-signal-store/). And [Claude Code with the /ng-upgrade skill](/en/ai/claude-code-skills-migration/) helps automate the migration routine.

A gradual path:

1. Upgrade to Angular 20, add TypeScript 5.8+
2. Convert components to `ChangeDetectionStrategy.OnPush`
3. Replace `@Input()/@Output()` with `input()/output()`
4. Replace `BehaviorSubject` with `signal()`
5. Replace `*ngIf/*ngFor` with `@if/@for`
6. Add `provideZonelessChangeDetection()` and remove `zone.js` from `polyfills`

You can do it incrementally — Zone.js and Signals work together.

> 💡 `ng update @angular/core @angular/cli` — the official migration. For each major version Angular ships schematics that automatically convert old syntax. Run `ng update` to see available migrations.
{% endraw %}

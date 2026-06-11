---
layout: post
title: "Angular 20 Signal Store: rewriting NgRx in an evening"
categories: web
date: 2026-05-08
read_time: 10
difficulty: intermediate
description: "Signal Store from @ngrx/signals — a modern replacement for classic NgRx. We walk through migrating real state, withComputed, withMethods, rxMethod, and what we trade for the simplicity."
excerpt_text: "Signal Store with no actions, reducers or effects: the same state in 3x less code. A real cart migration example"
keywords: "Angular Signal Store, ngrx signals, withComputed, withMethods, rxMethod, NgRx migration, NgRx replacement, signalStore"
translation_of: "/web/angular-signal-store/"
tldr:
  - "Signal Store from @ngrx/signals replaces NgRx Classic: one file instead of 4-5 (actions, reducer, selectors, effects), roughly 3x less code."
  - "A store is composed from withState, withComputed and withMethods; reading is direct access store.cart(), mutation goes only through patchState — immutability is still on you."
  - "Async logic goes through rxMethod with an RxJS pipeline (debounceTime, switchMap) or a plain async method; it is the equivalent of NgRx effects, but without actions."
  - "DevTools hook up via withDevtools('cart'), but without classic time-travel; keep NgRx Classic for complex effects, an action audit trail and large teams."
---

NgRx has been the standard for state in Angular for years, but on top of Signals a lighter option has appeared — Signal Store. The same predictable state, but no actions, reducers or effects. Today we rewrite a real cart store from NgRx to Signal Store and tally up what we win and where the trade-offs are.

## Why switch if NgRx works

Classic NgRx — a Redux pattern with a lot of overhead: actions, action creators, reducers, selectors, effects. Roughly 5 files per feature. When the state is complex and the team is used to it — it's justified. When the state is medium-sized or you're solo — it's overkill.

Signal Store (`@ngrx/signals`) — the same thing, but:

| | NgRx Classic | Signal Store |
|---|---|---|
| Base unit | Reducer + actions | `signalStore()` |
| Reading | Selector via `store.select()` | Property access `store.cart()` |
| Mutation | `dispatch(action)` | `store.addItem(item)` |
| Async logic | Effects + RxJS | `rxMethod` or plain await |
| Files per feature | 4–5 | 1 |
| DevTools | Out of the box | Via `withDevtools()` |
| Time-travel debugging | Yes | No (can be wired separately) |
| Learning curve | Steep | Gentle |

The key point: Signal Store **doesn't conflict** with Signals — it's wired straight into Angular's reactivity. NgRx Classic keeps state in an RxJS store, and you convert Observable → Signal at every boundary.

## Before: a cart on NgRx Classic

A real chunk of code — a cart with add, remove, total calculation and catalog loading.

```typescript
// cart.actions.ts
export const addItem = createAction('[Cart] Add Item', props<{ item: CartItem }>());
export const removeItem = createAction('[Cart] Remove', props<{ id: string }>());
export const loadCatalog = createAction('[Cart] Load Catalog');
export const loadCatalogSuccess = createAction(
  '[Cart] Load Catalog Success', props<{ catalog: Product[] }>()
);

// cart.reducer.ts
export const cartReducer = createReducer(
  initialState,
  on(addItem, (state, { item }) => ({ ...state, items: [...state.items, item] })),
  on(removeItem, (state, { id }) => ({
    ...state, items: state.items.filter(i => i.id !== id)
  })),
  on(loadCatalogSuccess, (state, { catalog }) => ({ ...state, catalog }))
);

// cart.selectors.ts
export const selectItems = (state: AppState) => state.cart.items;
export const selectTotal = createSelector(selectItems, items =>
  items.reduce((s, i) => s + i.price * i.qty, 0)
);

// cart.effects.ts
loadCatalog$ = createEffect(() => this.actions$.pipe(
  ofType(loadCatalog),
  switchMap(() => this.api.getCatalog().pipe(
    map(catalog => loadCatalogSuccess({ catalog }))
  ))
));

// cart.component.ts
items = this.store.selectSignal(selectItems);
total = this.store.selectSignal(selectTotal);
add(item: CartItem) { this.store.dispatch(addItem({ item })); }
```

Four files per feature plus registration in `provideStore` and `provideEffects`. You know exactly where to look, but it takes a long time to write.

## After: Signal Store

```typescript
// cart.store.ts
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { computed, inject } from '@angular/core';
import { switchMap, tap } from 'rxjs';

interface CartState {
  items: CartItem[];
  catalog: Product[];
  loading: boolean;
}

const initialState: CartState = { items: [], catalog: [], loading: false };

export const CartStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed(({ items }) => ({
    total: computed(() => items().reduce((s, i) => s + i.price * i.qty, 0)),
    count: computed(() => items().reduce((s, i) => s + i.qty, 0)),
  })),

  withMethods((store, api = inject(CatalogApi)) => ({
    addItem(item: CartItem) {
      patchState(store, ({ items }) => ({ items: [...items, item] }));
    },
    removeItem(id: string) {
      patchState(store, ({ items }) => ({ items: items.filter(i => i.id !== id) }));
    },
    loadCatalog: rxMethod<void>(
      switchMap(() => {
        patchState(store, { loading: true });
        return api.getCatalog().pipe(
          tap(catalog => patchState(store, { catalog, loading: false }))
        );
      })
    ),
  })),
);
```

One file instead of four. And the usage:

{% raw %}
```typescript
@Component({
  template: `
    <p>Total: {{ store.total() }}</p>
    <button (click)="store.addItem(item)">Add</button>
  `
})
export class CartComponent {
  protected readonly store = inject(CartStore);
  ngOnInit() { this.store.loadCatalog(); }
}
```
{% endraw %}

No `selectSignal`, no `dispatch`. Direct access to the state and methods.

## Breakdown piece by piece

### withState — more than just initialization

`withState(initialState)` exposes each field as a separate signal. So for state `{ items: [], catalog: [] }` you get `store.items` and `store.catalog` automatically.

This lets `withComputed` and components access them granularly — change detection reacts to a change in a specific field rather than the whole object.

### patchState — the only way to mutate

```typescript
// ❌ Doesn't work — you can't mutate
store.items().push(item);

// ✅ patchState — updates state immutably
patchState(store, { items: [...store.items(), item] });

// ✅ functional form — when the new value depends on the old one
patchState(store, ({ items }) => ({ items: [...items, item] }));
```

Immutability is still on you — Signal Store doesn't do magic under the hood, it's just a more convenient API on top of signals.

### rxMethod — the bridge to RxJS

What about async logic, debounce, switchMap? Use `rxMethod`:

```typescript
search: rxMethod<string>(
  pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(query => api.search(query)),
    tap(results => patchState(store, { results }))
  )
)
```

The method is called like any other (`store.search('foo')`), but inside it's an RxJS pipeline. The equivalent of an NgRx effect, only without actions and without a separate class.

If RxJS isn't needed — use a regular `async` method:

```typescript
async loadCatalog() {
  patchState(store, { loading: true });
  const catalog = await firstValueFrom(api.getCatalog());
  patchState(store, { catalog, loading: false });
}
```

### withHooks — onInit / onDestroy

```typescript
withHooks({
  onInit(store) {
    store.loadCatalog();  // load the catalog on first injection
  },
  onDestroy(store) {
    // cleanup, if needed
  }
})
```

Handy for lazy-loading data on the first access to the store.

## DevTools and debugging

The time-travel debugger from NgRx Classic didn't carry over out of the box, but there's `withDevtools()` from `@ngrx/signals`:

```typescript
import { withDevtools } from '@ngrx/signals';

export const CartStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withDevtools('cart'),
  // ...
);
```

In Redux DevTools you see every patchState call as an "event" with a state diff. Time-travel works, but without action objects — events are named after the methods (`addItem`, `removeItem`).

<div class="tip-block">
<span class="tip-icon">💡</span>
<p>Wire <code>withDevtools</code> only into dev builds via <code>environment.production</code>, otherwise you'll leak in production on every patchState.</p>
</div>

## When to stay on NgRx Classic

Signal Store isn't a silver bullet. Scenarios where Classic is still better:

1. **Big team with established practices** — rewriting for the sake of rewriting doesn't pay off
2. **Complex effects with coordination** — for example, `concatLatestFrom`, chains of effects feeding each other
3. **Strict audit history of actions** — the action pattern provides a human-readable log
4. **Plugin ecosystem** — entity-adapter, router-store, server-state with hydration
5. **Micro-frontends with split state** — Classic works better with lazy modules

For everything else — Signal Store saves time and code without noticeable losses.

## Hybrid scenario

In large projects you don't need to migrate everything at once. NgRx Classic and Signal Store **coexist** — Classic holds the shared state (auth, router) while new features are written on Signal Store. A year later you look back and Classic is left only in one or two places where it really makes sense.

```typescript
// auth — on NgRx Classic, because there are established effects
@Component({})
export class HeaderComponent {
  user = this.store.selectSignal(selectUser);
  cart = inject(CartStore);  // a new feature on Signal Store
}
```

## Bottom line

- Signal Store — a modern replacement for NgRx Classic in most projects
- One file instead of 4–5: `withState` / `withComputed` / `withMethods` plus optional `rxMethod` / `withHooks`
- `patchState` — the only way to mutate; immutability is still on you
- DevTools work via `withDevtools()`, but without classic time-travel semantics
- Don't migrate existing NgRx for the sake of migration — a hybrid approach pays off faster
- When the state is complex and the team is large — Classic can still be justified

Next — try it: take one store with 1–2 features, rewrite it, measure LoC. I get a 3x reduction with the same behavior and testability.

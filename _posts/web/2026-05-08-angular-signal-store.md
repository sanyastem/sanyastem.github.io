---
layout: post
title: "Angular 20 Signal Store: переписываем NgRx за вечер"
categories: web
date: 2026-05-08
date_ru: "8 мая 2026"
read_time: 10
difficulty: intermediate
description: "Signal Store из @ngrx/signals — современная замена классическому NgRx. Разбираем миграцию реального стейта, withComputed, withMethods, rxMethod и чем расплачиваемся за простоту."
excerpt_text: "Signal Store без actions, reducers и effects: тот же стейт в 3 раза меньше кода. Реальный пример миграции корзины"
keywords: "Angular Signal Store, ngrx signals, withComputed, withMethods, rxMethod, миграция NgRx, замена NgRx, signalStore"
---

NgRx годами был стандартом для стейта в Angular, но на Signals появился более лёгкий вариант — Signal Store. Тот же предсказуемый стейт, но без actions, reducers и effects. Сегодня переписываем реальный стейт корзины с NgRx на Signal Store и считаем, что выиграли и где компромиссы.

## Зачем менять, если NgRx работает

Классический NgRx — Redux-pattern с большим оверхедом: actions, action creators, reducers, selectors, effects. Для каждой фичи ~5 файлов. Когда стейт сложный и команда привычная — оправдано. Когда стейт средний или ты пишешь приложение в одиночку — оверкилл.

Signal Store (`@ngrx/signals`) — то же самое, но:

| | NgRx Classic | Signal Store |
|---|---|---|
| Базовая единица | Reducer + actions | `signalStore()` |
| Чтение | Selector через `store.select()` | Property access `store.cart()` |
| Изменение | `dispatch(action)` | `store.addItem(item)` |
| Async-логика | Effects + RxJS | `rxMethod` или прямой await |
| Файлов на фичу | 4–5 | 1 |
| DevTools | Из коробки | Через `withDevtools()` |
| Time-travel debugging | Да | Нет (можно подключить отдельно) |
| Кривая обучения | Высокая | Низкая |

Главное: Signal Store **не противоречит** Signals — он встроен в реактивность Angular напрямую. NgRx Classic держит стейт в RxJS-сторе, и ты конвертируешь Observable → Signal на каждой границе.

## Что было: корзина на NgRx Classic

Реальный кусок кода — корзина с добавлением, удалением, расчётом суммы и подгрузкой каталога.

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

Четыре файла на фичу + регистрация в `provideStore` и `provideEffects`. Понятно куда смотреть, но писать долго.

## Что стало: Signal Store

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

Один файл вместо четырёх. И использование:

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

Никаких `selectSignal`, никаких `dispatch`. Прямой access к стейту и методам.

## Разбор по полочкам

### withState — это не просто инициализация

`withState(initialState)` экспонирует каждое поле как отдельный signal. То есть для стейта `{ items: [], catalog: [] }` ты получаешь `store.items` и `store.catalog` автоматически.

Это позволяет в `withComputed` и компонентах обращаться к ним точечно — change detection реагирует на изменение конкретного поля, а не всего объекта.

### patchState — единственный способ изменить

```typescript
// ❌ Не сработает — нельзя мутировать
store.items().push(item);

// ✅ patchState — иммутабельно обновляет состояние
patchState(store, { items: [...store.items(), item] });

// ✅ функциональная форма — когда новое значение зависит от старого
patchState(store, ({ items }) => ({ items: [...items, item] }));
```

Иммутабельность всё ещё нужна — Signal Store не делает магии под капотом, он просто более удобный API над сигналами.

### rxMethod — мост к RxJS

Что делать с async-логикой, дебаунсом, switchMap? Использовать `rxMethod`:

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

Метод вызывается как обычный (`store.search('foo')`), но внутри — RxJS pipeline. Эквивалент NgRx-effect, только без actions и без отдельного класса.

Если RxJS не нужен — используй обычный `async` метод:

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
    store.loadCatalog();  // загрузить каталог при первой инъекции
  },
  onDestroy(store) {
    // cleanup, если нужно
  }
})
```

Удобно для ленивой загрузки данных при первом обращении к стору.

## DevTools и debugging

Time-travel дебаггер из NgRx Classic не переехал из коробки, но есть `withDevtools()` из `@ngrx/signals`:

```typescript
import { withDevtools } from '@ngrx/signals';

export const CartStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withDevtools('cart'),
  // ...
);
```

В Redux DevTools видно все patchState-вызовы как «события» с диффом стейта. Time-travel работает, но без действий-объектов — события называются именами методов (`addItem`, `removeItem`).

<div class="tip-block">
<span class="tip-icon">💡</span>
<p><code>withDevtools</code> подключай только в dev-сборке через <code>environment.production</code>, иначе будешь течь в проде на каждый patchState.</p>
</div>

## Когда оставаться на NgRx Classic

Signal Store — не серебряная пуля. Сценарии, где Classic всё ещё лучше:

1. **Большая команда с устоявшимися практиками** — переписывать ради переписывания невыгодно
2. **Сложные effects с координацией** — например, `concatLatestFrom`, цепочки эффектов друг на друга
3. **Жёсткая аудит-история действий** — actions-pattern даёт человекочитаемый лог
4. **Plugin-экосистема** — entity-adapter, router-store, server-state с гидрацией
5. **Микро-фронты с разделённым стейтом** — Classic лучше работает с lazy modules

Для всего остального — Signal Store экономит время и код без ощутимых потерь.

## Гибридный сценарий

В крупных проектах не нужно мигрировать всё разом. NgRx Classic и Signal Store **сосуществуют** — Classic держит общий стейт (auth, router), а новые фичи пишутся на Signal Store. Через год оборачиваешься, и Classic остался только в одном-двух местах, где он реально нужен.

```typescript
// auth — на NgRx Classic, потому что есть устоявшиеся effects
@Component({})
export class HeaderComponent {
  user = this.store.selectSignal(selectUser);
  cart = inject(CartStore);  // новая фича на Signal Store
}
```

## Итого

- Signal Store — современная замена NgRx Classic для большинства проектов
- Один файл вместо 4–5: `withState` / `withComputed` / `withMethods` + опционально `rxMethod` / `withHooks`
- `patchState` — единственный способ изменить, иммутабельность всё ещё на тебе
- DevTools работают через `withDevtools()`, но без классической time-travel-семантики
- Не мигрируй существующий NgRx ради миграции — гибридный подход быстрее окупается
- Когда стейт сложный и команда большая — Classic всё ещё может быть оправдан

Дальше — пробуй: возьми один store с 1–2 фичами, перепиши, замерь LoC. У меня выходит сокращение в 3 раза при том же поведении и тестируемости.

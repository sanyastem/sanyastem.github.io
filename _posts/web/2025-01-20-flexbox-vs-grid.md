---
layout: post
title: "Flexbox vs Grid: когда что использовать"
categories: web
date: 2025-01-20
date_ru: "20 января 2025"
read_time: 5
difficulty: intermediate
description: "Простое правило: Flexbox для одного направления, Grid для двумерных сеток. Разбираем на реальных примерах с кодом."
excerpt_text: "Простое правило и реальные примеры с кодом — раз и навсегда"
keywords: "flexbox, css grid, flexbox vs grid, css layout, верстка"
---

## Простое правило

**Flexbox** — когда элементы выстраиваются в одну линию (строку или колонку).
**Grid** — когда нужна двумерная сетка (строки И колонки одновременно).

> 💡 Они не конкуренты — используй оба. Типичная страница: Grid для основного макета, Flexbox для навигации и карточек.

## Flexbox — одно направление

Идеален для: навигации, строки кнопок, выравнивания по центру, карточек в ряд.

```css
/* Навигация в ряд */
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

/* Центрировать элемент */
.centered {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Карточки с переносом */
.cards {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
```

## Grid — две оси сразу

Идеален для: макета страницы, галерей, сеток с фиксированным количеством колонок.

```css
/* Макет: сайдбар + контент */
.layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  min-height: 100vh;
}

/* Адаптивная сетка — сами считают сколько влезет */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}
```

## Реальный пример: карточки блога

Для сетки карточек — Grid. Внутри каждой карточки — Flexbox.

```css
/* Сетка карточек — Grid */
.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

/* Внутри карточки — Flexbox */
.post-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Тег и время в одной строке — Flexbox */
.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
```

## auto-fill vs auto-fit

Оба создают адаптивные колонки, но по-разному:

- `auto-fill` — резервирует пустые колонки (сохраняет размер ячеек)
- `auto-fit` — растягивает оставшиеся элементы на всю ширину

Для карточек обычно нужен `auto-fill` — карточки не растягиваются до огромных размеров.

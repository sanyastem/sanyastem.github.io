---
layout: post
title: "Flexbox vs Grid: when to use which"
categories: web
date: 2025-01-20
read_time: 5
difficulty: intermediate
description: "Simple rule: Flexbox for one direction, Grid for two-dimensional layouts. Walked through real-world examples with code."
excerpt_text: "A simple rule and real examples with code — once and for all"
keywords: "flexbox, css grid, flexbox vs grid, css layout, layout"
translation_of: "/web/flexbox-vs-grid/"
tldr:
  - "Simple rule: Flexbox for one direction (a row or a column), Grid for a two-dimensional layout where rows and columns matter at the same time."
  - "A typical page: Grid for the layout (grid-template-columns: 260px 1fr) and the card grid, Flexbox for navigation and card internals."
  - "A responsive grid without media queries: repeat(auto-fill, minmax(280px, 1fr)) works out how many columns fit on its own."
  - "auto-fill reserves empty columns and keeps cell size, auto-fit stretches items to the full width; for cards you usually want auto-fill."
faq:
  - q: "When should I use Flexbox and when Grid?"
    a: "The simple rule: Flexbox when items line up in one direction (a row or a column) — navigation, button rows, centering. Grid when you need rows and columns at the same time: page layout, galleries, card grids."
  - q: "Can I use Flexbox and Grid together?"
    a: "Yes, they are not competitors. A typical page: Grid for the main layout (grid-template-columns: 260px 1fr) and the card grid, Flexbox for navigation and the content inside each card (flex-direction: column with gap)."
  - q: "What is the difference between auto-fill and auto-fit?"
    a: "Both create responsive columns, but auto-fill reserves empty columns and keeps the cell size, while auto-fit stretches the remaining items to the full width. For a card grid you usually want auto-fill — cards do not balloon to huge sizes."
  - q: "How do I build a responsive card grid without media queries?"
    a: "grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)) with gap: 20px — the browser works out how many columns fit on its own. You get one column on mobile, two on tablet, three or more on desktop."
  - q: "How do I center an element horizontally and vertically?"
    a: "Easiest with Flexbox: display: flex, align-items: center and justify-content: center on the container — the element sits at the center of both axes. It is one of the main uses of Flexbox alongside navigation."
---

## The simple rule

**Flexbox** — when items line up in one direction (a row or a column).
**Grid** — when you need a two-dimensional layout (rows AND columns at the same time).

> 💡 They're not competitors — use both. A typical page: Grid for the main layout, Flexbox for navigation and cards.

## Flexbox — one direction

Ideal for: navigation, button rows, centering, cards in a row.

```css
/* Navigation in a row */
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

/* Center an element */
.centered {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Cards with wrapping */
.cards {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
```

## Grid — two axes at once

Ideal for: page layout, galleries, grids with a fixed number of columns.

```css
/* Layout: sidebar + content */
.layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  min-height: 100vh;
}

/* Responsive grid — figures out how many fit on its own */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}
```

## Real example: blog cards

For a card grid — Grid. Inside each card — Flexbox. (Which breakpoints to pick, and when a grid needs no media queries at all, is covered in [responsive design](/en/web/responsive-design/).)

```css
/* Card grid — Grid */
.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

/* Inside the card — Flexbox */
.post-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Tag and time on one row — Flexbox */
.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
```

## auto-fill vs auto-fit

Both create responsive columns, but differently:

- `auto-fill` — reserves empty columns (preserves cell size)
- `auto-fit` — stretches the remaining items to full width

For cards you usually want `auto-fill` — cards don't blow up to giant sizes.

The next step after layout is a [dark theme on CSS variables](/en/web/css-dark-theme/).

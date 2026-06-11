---
layout: post
title: "Responsive design: media queries without pain"
categories: web
date: 2025-01-05
read_time: 4
difficulty: intermediate
description: "Mobile-first approach, breakpoints, clamp() instead of piles of media queries. How to make a site comfortable on any screen."
excerpt_text: "Mobile-first, clamp() and minimal code for a responsive site on any screen"
keywords: "responsive design, media queries, mobile first, responsive, clamp css"
translation_of: "/web/responsive-design/"
tldr:
  - "Write mobile-first: base styles target mobile, while @media (min-width: 768px) and (min-width: 1024px) expand the grid to 2 and 3 columns."
  - "clamp(min, preferred, max) scales sizes without media queries: font-size: clamp(1.2rem, 5vw, 2.4rem), padding: clamp(16px, 5vw, 80px)."
  - "A responsive grid without a single media query: grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))."
  - "Without the viewport meta tag (width=device-width, initial-scale=1.0) mobile browsers render the page as desktop; replace fixed width: 960px with max-width + width: 100%."
---

## Mobile-first — write for mobile first

Base styles are for mobile. Media queries extend them for larger screens.

```css
/* Base — mobile */
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

/* Tablet and up */
@media (min-width: 768px) {
  .grid {
    grid-template-columns: 1fr 1fr;
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

## Standard breakpoints

```css
/* Mobile:  < 480px  — base styles */
/* Tablet:  ≥ 768px  */
/* Desktop: ≥ 1024px */
/* Wide:    ≥ 1280px */
```

> 💡 Use `min-width` (mobile-first) instead of `max-width` — fewer overrides and more logical to read.

## clamp() — responsive sizes without media queries

`clamp(min, preferred, max)` — the value scales smoothly between minimum and maximum.

```css
/* Font: minimum 1.2rem, maximum 2.4rem */
h1 {
  font-size: clamp(1.2rem, 5vw, 2.4rem);
}

/* Padding: minimum 16px, maximum 80px */
.section {
  padding: clamp(16px, 5vw, 80px);
}

/* Container width */
.container {
  width: min(1200px, 100% - 48px);
  margin: 0 auto;
}
```

## Responsive grid without media queries

```css
.cards {
  display: grid;
  /* On mobile — 1 column, on tablet — 2, on desktop — 3+ */
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}
/* And all this WITHOUT a single media query */
```

## Don't forget the viewport meta

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

Without this tag, mobile browsers scale the page as if it were desktop.

> ⚠️ Never use fixed widths like `width: 960px` — it breaks layout on mobile. Use `max-width` + `width: 100%`.

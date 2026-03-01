---
layout: post
title: "Адаптивный дизайн: media queries без боли"
categories: web
date: 2025-01-05
date_ru: "5 января 2025"
read_time: 4
difficulty: intermediate
description: "Mobile-first подход, точки перехода, clamp() вместо куч медиазапросов. Как сделать сайт удобным на любом экране."
excerpt_text: "Mobile-first, clamp() и минимум кода для адаптивного сайта на любом экране"
keywords: "адаптивный дизайн, media queries, mobile first, responsive, clamp css"
---

## Mobile-first — пиши для мобильных сначала

Базовые стили — для мобильных. Медиазапросы расширяют их для больших экранов.

```css
/* Базово — мобильный */
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

/* Планшет и выше */
@media (min-width: 768px) {
  .grid {
    grid-template-columns: 1fr 1fr;
  }
}

/* Десктоп и выше */
@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

## Стандартные точки перехода

```css
/* Мобильный:  < 480px  — базовые стили */
/* Планшет:    ≥ 768px  */
/* Десктоп:    ≥ 1024px */
/* Широкий:    ≥ 1280px */
```

> 💡 Используй `min-width` (mobile-first) вместо `max-width` — меньше переопределений и логичнее читается.

## clamp() — адаптивные размеры без медиазапросов

`clamp(min, preferred, max)` — значение плавно масштабируется между минимумом и максимумом.

```css
/* Шрифт: минимум 1.2rem, максимум 2.4rem */
h1 {
  font-size: clamp(1.2rem, 5vw, 2.4rem);
}

/* Отступ: минимум 16px, максимум 80px */
.section {
  padding: clamp(16px, 5vw, 80px);
}

/* Ширина контейнера */
.container {
  width: min(1200px, 100% - 48px);
  margin: 0 auto;
}
```

## Адаптивная сетка без медиазапросов

```css
.cards {
  display: grid;
  /* На мобильном — 1 колонка, на планшете — 2, на десктопе — 3+ */
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}
/* И всё это БЕЗ единого медиазапроса */
```

## Не забудь viewport meta

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

Без этого тега мобильные браузеры масштабируют страницу как десктоп.

> ⚠️ Никогда не используй фиксированные ширины вида `width: 960px` — это ломает вёрстку на мобильных. Используй `max-width` + `width: 100%`.

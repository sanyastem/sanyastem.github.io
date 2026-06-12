---
layout: post
title: "Адаптивный дизайн: media queries без боли"
categories: web
translation_of: "/en/web/responsive-design/"
tldr:
  - "Пиши mobile-first: базовые стили — для мобильных, а @media (min-width: 768px) и (min-width: 1024px) расширяют сетку до 2 и 3 колонок."
  - "clamp(min, preferred, max) масштабирует размеры без медиазапросов: font-size: clamp(1.2rem, 5vw, 2.4rem), padding: clamp(16px, 5vw, 80px)."
  - "Адаптивная сетка без единого медиазапроса: grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))."
  - "Без meta viewport (width=device-width, initial-scale=1.0) мобильные браузеры рендерят страницу как десктоп; фиксированный width: 960px заменяй на max-width + width: 100%."
faq:
  - q: "Что такое mobile-first и чем он лучше desktop-first?"
    a: "Mobile-first — это когда базовые стили пишутся для мобильных, а @media (min-width: 768px) и (min-width: 1024px) расширяют макет для планшета и десктопа. С min-width получается меньше переопределений, чем с max-width: каждый медиазапрос только добавляет правила, а не отменяет уже написанные."
  - q: "Какие breakpoints использовать в адаптивной вёрстке?"
    a: "Достаточно трёх-четырёх точек: до 480px — мобильный (базовые стили), от 768px — планшет, от 1024px — десктоп, от 1280px — широкий экран. Не привязывайся к конкретным устройствам — ставь точки перехода там, где макет реально ломается."
  - q: "Как clamp() заменяет медиазапросы?"
    a: "clamp(min, preferred, max) плавно масштабирует значение между минимумом и максимумом в зависимости от ширины экрана. Например, font-size: clamp(1.2rem, 5vw, 2.4rem) для заголовка или padding: clamp(16px, 5vw, 80px) для секции — и ни одного @media."
  - q: "Можно ли сделать адаптивную сетку без единого медиазапроса?"
    a: "Да: grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)) сам считает, сколько колонок влезает — одна на мобильном, две на планшете, три и больше на десктопе. Для контейнера добавь width: min(1200px, 100% - 48px) с margin: 0 auto."
  - q: "Зачем нужен meta viewport и что будет без него?"
    a: "Тег meta name=viewport с content=width=device-width, initial-scale=1.0 говорит мобильному браузеру использовать реальную ширину экрана. Без него страница рендерится как десктопная и уменьшается до размеров экрана, а медиазапросы фактически не срабатывают."
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

Подробнее о выборе между сетками — в статье [Flexbox vs Grid](/web/flexbox-vs-grid/).

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

> ⚠️ Никогда не используй фиксированные ширины вида `width: 960px` — это ломает вёрстку на мобильных. Используй `max-width` + `width: 100%`. А для цветовых схем под устройство есть [CSS-переменные и тёмная тема](/web/css-dark-theme/).

---
layout: post
title: "CSS-переменные: тёмная тема без лишнего кода"
categories: web
date: 2025-02-10
date_ru: "10 февраля 2025"
read_time: 6
description: "Используем :root и CSS custom properties для переключения тёмной и светлой темы одной строкой JS. Никаких библиотек."
excerpt_text: "Переключаем тёмную тему через :root и одну строку JS — никаких библиотек"
keywords: "css переменные, тёмная тема, dark mode, css custom properties, prefers-color-scheme"
---

## Что такое CSS-переменные

CSS custom properties — именованные значения, которые ты объявляешь один раз и используешь везде. Если значение меняется в одном месте — меняется везде.

```css
/* Объявляем переменные в :root — они глобальны */
:root {
  --bg: #ffffff;
  --text: #111111;
  --accent: #0066cc;
}

/* Используем */
body {
  background: var(--bg);
  color: var(--text);
}
```

## Добавляем тёмную тему

Создаём второй набор переменных. Они переопределяют светлые, когда на `html` стоит атрибут `data-theme="dark"`.

```css
:root {
  --bg: #ffffff;
  --bg-card: #f5f5f5;
  --text: #111111;
  --text-muted: #666666;
  --border: rgba(0,0,0,0.1);
}

[data-theme="dark"] {
  --bg: #0a0a0f;
  --bg-card: #111118;
  --text: #e8e8f0;
  --text-muted: #6b6b80;
  --border: rgba(255,255,255,0.07);
}
```

## Переключение через JavaScript

```js
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');

  // Сохраняем выбор пользователя
  localStorage.setItem('theme', isDark ? 'light' : 'dark');
}

// Восстанавливаем тему при загрузке
const saved = localStorage.getItem('theme');
if (saved) document.documentElement.setAttribute('data-theme', saved);
```

## Автоматически по системным настройкам

Можно вообще не делать кнопку — CSS сам подхватит системную тему:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0a0a0f;
    --text: #e8e8f0;
  }
}
```

> 💡 Можно комбинировать: по умолчанию — системная тема, но пользователь может переключить вручную. Проверяй сначала `localStorage`, потом `prefers-color-scheme`.

## Плавный переход

```css
body {
  transition: background 0.2s, color 0.2s;
}
```

> ⚠️ Не вешай `transition: all` — это замедлит анимации. Только на конкретные свойства: `background`, `color`, `border-color`.

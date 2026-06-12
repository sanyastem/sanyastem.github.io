---
layout: post
title: "CSS variables: a dark theme without extra code"
categories: web
date: 2025-02-10
read_time: 6
difficulty: intermediate
description: "Use :root and CSS custom properties to switch between dark and light themes with one line of JS. No libraries."
excerpt_text: "Switch the dark theme via :root and one line of JS — no libraries"
keywords: "css variables, dark theme, dark mode, css custom properties, prefers-color-scheme"
translation_of: "/web/css-dark-theme/"
tldr:
  - "Declare colors as CSS variables in :root (--bg, --text, --accent), and a [data-theme='dark'] selector overrides them for the dark theme — no libraries."
  - "Switching is one line of JS: html.setAttribute('data-theme', isDark ? 'light' : 'dark'); persist the choice in localStorage and restore it on load."
  - "CSS picks up the system theme by itself via @media (prefers-color-scheme: dark); check localStorage first, then the system setting."
  - "For a smooth switch: transition: background 0.2s, color 0.2s on body; do not use transition: all — it slows animations down."
faq:
  - q: "How do I build a dark theme with CSS variables and no libraries?"
    a: "Declare your colors in :root (--bg, --text, --accent) and override them in a [data-theme='dark'] selector with dark values. Every element uses var(--bg) and var(--text), so flipping the data-theme attribute on html instantly recolors the page."
  - q: "How do I toggle the theme with one line of JavaScript?"
    a: "document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark'), where isDark is read from the current attribute. Persist the choice with localStorage.setItem('theme', ...) and restore it on page load."
  - q: "How do I pick up the user's system dark theme?"
    a: "Use the @media (prefers-color-scheme: dark) media query — override the :root variables inside it and CSS applies the dark colors with no JS at all. You can combine it with a manual toggle: check localStorage first, then the system setting."
  - q: "How do I make the switch between light and dark themes smooth?"
    a: "Add transition: background 0.2s, color 0.2s to body. Do not use transition: all — it slows down other animations; list only the specific properties: background, color, border-color."
---

## What CSS variables are

CSS custom properties — named values that you declare once and use everywhere. Change the value in one place — it changes everywhere. (If you're just getting into modern CSS, also check [Flexbox vs Grid](/en/web/flexbox-vs-grid/).)

```css
/* Declare variables in :root — they are global */
:root {
  --bg: #ffffff;
  --text: #111111;
  --accent: #0066cc;
}

/* Use them */
body {
  background: var(--bg);
  color: var(--text);
}
```

## Adding a dark theme

Create a second set of variables. They override the light ones whenever `html` has the attribute `data-theme="dark"`.

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

## Switching via JavaScript

```js
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');

  // Save the user's choice
  localStorage.setItem('theme', isDark ? 'light' : 'dark');
}

// Restore the theme on load
const saved = localStorage.getItem('theme');
if (saved) document.documentElement.setAttribute('data-theme', saved);
```

## Automatically follow system settings

You can skip the button entirely — CSS will pick up the system theme on its own (the same media-query approach as in [responsive design](/en/web/responsive-design/)):

```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0a0a0f;
    --text: #e8e8f0;
  }
}
```

> 💡 You can combine: by default — system theme, but the user can toggle manually. Check `localStorage` first, then `prefers-color-scheme`.

## Smooth transition

```css
body {
  transition: background 0.2s, color 0.2s;
}
```

> ⚠️ Don't use `transition: all` — it slows down animations. Only specific properties: `background`, `color`, `border-color`.

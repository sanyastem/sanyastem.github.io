# Аудит сайта: GEO / SEO / производительность / доступность

> Дата: 2026-05-24. Файл не публикуется (`_handoff/` игнорируется Jekyll + закрыт в robots.txt).

Цель аудита — усилить видимость сайта в ИИ-поиске (GEO) и закрыть точечные пробелы по SEO, производительности и доступности, не ломая работающее. Сайт изначально был в хорошем состоянии: jekyll-seo-tag/sitemap/feed, обширный JSON-LD, llms.txt, GDPR Consent Mode v2, двуязычность, self-hosted шрифты, Lighthouse CI.

---

## Что сделано (внедрено в код)

### GEO / видимость в ИИ-поиске
- **robots.txt** — явно разрешены AI/answer-краулеры: GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-Web, Claude-User, Google-Extended, PerplexityBot, Applebot-Extended, CCBot, Amazonbot, Bytespider. Сохранён block MJ12bot и crawl-delay для Ahrefs/Semrush. Поправлен вводящий в заблуждение комментарий.
- **`/llms-full.txt`** (новый, `llms-full.txt` → `permalink: /llms-full.txt`) — агрегированный plain-text всех 38 RU-статей (заголовок, URL, ссылка на EN-версию, описание, полный текст). HTML-сущности декодированы, теги вырезаны. Исключён из минификатора, добавлен в `llms.txt`. Для добавления полных EN-тел — раскомментировать второй проход (см. backlog).
- **TL;DR-блоки** — новый `_includes/tldr.html` + поле `tldr:` (строка или список) во front matter. Рендерится вверху статьи + добавляется как `abstract` в BlogPosting JSON-LD. Answer-движки преимущественно цитируют короткое самодостаточное саммари. i18n: «Кратко» / «TL;DR».

### SEO-контент
- **Per-post OG-обложки** — 4 категорийные картинки (`assets/og-{web,devops,git,tools}.png`, 1200×630, фирменные цвета) + фолбэк через `og_image:` в `_data/categories.yml`. `head.html`: `page.og_image` → картинка категории → `og-default.png`. Одна переменная питает og:image, twitter:image и BlogPosting.image.
- **Двунаправленный hreflang** — `translation_of` добавлен в 37 RU-постов (был только у docker-basics). Теперь RU↔EN взаимны. `x-default` исправлен — консистентно указывает на RU-версию кластера (раньше каждая страница ссылалась на саму себя).

### Производительность
- **Resource hints** в `head.html` — `preconnect` к googletagmanager/pagead2, `dns-prefetch` к google-analytics/doubleclick. Безопасно при Consent Mode (не ставят кук).
- **Font preload** — добавлен `inter-700-latin.woff2` (раньше preload-ился только cyrillic-700; EN-заголовки ждали загрузки).
- **Lighthouse CI** — добавлен mobile-конфиг (`.lighthouserc.mobile.json`, perf warn≥0.75) + EN-URL в оба конфига; workflow прогоняет desktop и mobile.
- **PWA-иконки** — `assets/icon-{180,192,512}.png` + `apple-touch-icon`; манифест теперь с корректными 192/512 вместо одной og-картинки 1200×630.

### Доступность (a11y)
- Фильтры на главной переведены с некорректного `role="tab"/tablist"` (нет связанных tabpanel) на честные `aria-pressed` toggle-кнопки в `role="group"`.
- `aria-label` + `type="button"` на кнопку scroll-top.
- JS smooth-scroll уважает `prefers-reduced-motion` (раньше игнорировал — CSS `scroll-behavior:auto` не покрывает JS `scrollTo`).
- Прогресс-бар чтения локализован через data-атрибуты (раньше хардкод «мин до конца»/«готово» на EN-страницах).

---

## Состояние по направлениям

### GEO — отлично
Хорошо: AI-краулеры открыты, llms.txt + llms-full.txt, богатый JSON-LD (BlogPosting/HowTo/FAQPage/Breadcrumb/WebSite/Organization), чистые URL, нет noindex. Осталось (backlog): расширить покрытие FAQ и TL;DR на остальные статьи.

### SEO — хорошо
Хорошо: seo-tag, sitemap, canonical, OG/Twitter, hreflang теперь двунаправленный, категорийные обложки. Осталось: per-post уникальные обложки (отложено — выбран вариант с 4 категорийными), инлайн-перелинковка статей.

### Производительность — хорошо
Хорошо: self-hosted субсет-шрифты с `font-display:swap`, минификация HTML/JSON, gzip Pages, preload, resource hints. CSS/JS-минификация отключена осознанно (баг gem 0.2.2 с кириллицей) — не трогать. В телах постов нет `<img>`, поэтому lazy-load не требовался.

### Доступность — хорошо
Базис уже был: skip-link, глобальный `:focus-visible`, `prefers-reduced-motion`, ARIA на nav/burger/theme-toggle, `aria-current`. Закрыты найденные пробелы (см. чеклист).

---

## A11y чеклист

| Пункт | Статус |
|---|---|
| Skip-link присутствует и стилизован | ✅ было |
| Глобальный `:focus-visible` (2px accent) | ✅ было |
| `prefers-reduced-motion` (CSS transitions, fade-in) | ✅ было |
| JS smooth-scroll уважает reduced-motion | ✅ исправлено |
| Закрытое мобильное меню не фокусируется (`display:none`) | ✅ было |
| Burger: aria-expanded, Escape закрывает | ✅ было |
| Theme-toggle: динамический aria-label | ✅ было |
| Фильтры: честная семантика (aria-pressed вместо фейкового tab) | ✅ исправлено |
| scroll-top: aria-label + type | ✅ исправлено |
| Прогресс-бар: aria-hidden (декоративный) | ✅ было |
| `.search-input` `outline:none` | ⚪ мёртвый CSS (нигде не используется — Pagefind рендерит свой инпут) |
| Контраст `--text-muted` и цветных тегов в обеих темах | ⏳ требует прогона axe/Lighthouse (см. ниже) |
| Заголовки/landmarks, порядок h1→h2 на главной | ⏳ требует прогона axe |

---

## hreflang — таблица бэкфилла

38 RU-постов = 38 EN-двойников (1:1 по именам файлов). У всех 37 ранее без `translation_of` добавлено `translation_of: "/en/<категория>/<slug>/"`; docker-basics уже имел. Проверено скриптом: каждый целевой EN-файл существует, пары взаимны (EN.translation_of ↔ RU.url).

Правило для новых статей: при добавлении RU-поста и его EN-перевода проставить `translation_of` в обоих (RU → `/en/...`, EN → `/...`).

---

## Backlog (контент / опционально)

- **FAQ** — добавить `faq:` (3-5 Q/A) в статьи без него: покрытие сейчас ~20/38. FAQPage — самый цитируемый answer-движками тип. Механика готова, нужен только контент.
- **TL;DR** — засеяны 2 флагмана (claude-code-setup, docker-basics). Прогнать по остальным landing-постам серий и «vs»-сравнениям. Формат: `tldr:` — список из 3-4 пунктов.
- **Инлайн-перелинковка** — каждой статье 2-3 ссылки на соседние статьи в тексте (link equity + ассоциации сущностей для GEO). Это контент-практика, не код.
- **llms-full.txt с EN** — при желании включить полные EN-тела: добавить второй проход по `lang: en` в `llms-full.txt`.
- **Per-post уникальные OG** (отложено) — Node-генератор (Satori) в Action рисует уникальный PNG на статью. Safe-mode Pages не мешает (кастомный Action). Сейчас выбран вариант с 4 категорийными.
- **Контраст/axe-проход** — прогнать axe DevTools + Lighthouse a11y в обеих темах, проверить `--text-muted` и цветные теги; поправить токены при необходимости.

---

## Как проверять

- **Локальная сборка:** `bundle exec jekyll build` (jekyll-бинарь: `/opt/rbenv/versions/3.3.6/bin/jekyll`). Проверить `_site/llms-full.txt` (plain text), `<head>` RU-поста (категорийная og:image + двунаправленный hreflang), TL;DR рендерится только при `tldr:`.
- **JSON-LD:** Rich Results Test / schema.org validator на статье — BlogPosting (с abstract), BreadcrumbList, HowTo, FAQPage парсятся.
- **Lighthouse:** ⚠️ `lighthouse.yml` запускается на **PR**, а пуши в `master` его НЕ триггерят (деплой идёт через `pages.yml`). Чтобы прогнать Lighthouse — открыть PR или запустить workflow вручную (Actions → Lighthouse CI → Run workflow). Здесь headless-Chrome недоступен, поэтому визуальная/Lighthouse-проверка локально не выполнялась.
- **A11y:** axe DevTools + клавиатурный проход (skip-link → nav → burger → фильтры → статья → share → footer) в светлой и тёмной темах.

# Внешние сервисы — пошаговая настройка

Эти настройки нельзя сделать кодом — нужны действия в UI сервисов. Код уже готов и ждёт: меняешь пару полей в `_config.yml` → фича включается.

## 1. Giscus (комментарии под статьями)

Виджет уже подключён в `_includes/giscus.html` и `_layouts/post.html`. Не рендерится, пока в `_config.yml` пустые `repo_id`/`category_id`.

1. https://github.com/sanyastem/sanyastem.github.io/settings → General → Features → ✅ Discussions
2. Установить приложение https://github.com/apps/giscus и дать доступ к репо
3. Открыть https://giscus.app:
   - Repository: `sanyastem/sanyastem.github.io`
   - Page ↔ Discussions Mapping: **pathname**
   - Discussion Category: **Announcements**
   - Скопировать `data-repo-id` и `data-category-id` из сгенерированного блока
4. Вписать в `_config.yml` под секцию `giscus:`:
   ```yaml
   giscus:
     repo: "sanyastem/sanyastem.github.io"
     repo_id: "R_kgDO..."        # из шага 3
     category: "Announcements"
     category_id: "DIC_kwDO..."   # из шага 3
   ```
5. Закоммитить, запушить — комменты появятся под каждой статьёй.

---

## 2. Newsletter через Buttondown

Форма уже встроена в `_includes/newsletter.html`, подключена в конце каждого поста и на главной. Скрыта, пока `newsletter.enabled: false`.

Buttondown: бесплатно до 100 подписчиков, дальше платные тарифы.

1. https://buttondown.com → Sign up.
2. Profile → Settings → выбрать имя рассылки и slug (это станет username).
3. В `_config.yml` поправить:
   ```yaml
   newsletter:
     enabled: true
     buttondown_username: "<твой_slug>"
   ```
4. Закоммитить → форма появляется в конце каждого поста и на главной.
5. Buttondown → Automations → создать **New post on RSS** → подключить `https://sanyastem.github.io/feed.xml` → автоматическая рассылка при публикации новых постов.

Структура HTML формы (action идёт на `https://buttondown.com/api/emails/embed-subscribe/<username>`) и тексты — в `_data/i18n/{ru,en}.yml` под ключом `newsletter:`.

---

## 3. Telegram-канал

Иконка TG в подвале + опц. callout. Появится, когда `telegram.enabled: true`.

1. Создать канал в Telegram (Settings → Create channel → Public).
2. Задать публичный username (без `@`), например `sanyastem_dev`.
3. В `_config.yml`:
   ```yaml
   telegram:
     enabled: true
     channel: "sanyastem_dev"
   ```
4. Закоммитить → иконка TG появится в footer рядом с GitHub и RSS.

**Авто-постинг новых статей в канал** (опционально):
- IFTTT/Zapier rule «RSS → Telegram» — связывает `feed.xml` с каналом.
- Альтернатива: GitHub Action, который при пуше в master постит ссылку через Bot API.

---

## 4. Cloudflare CDN перед GitHub Pages

Бесплатно. Даёт +30% скорость, кэш-заголовки, аналитика, защита от DDoS.

> ⚠️ Только если у тебя есть собственный домен (`sanyastem.dev` и т.п.). Для дефолтного `sanyastem.github.io` Cloudflare не поставить.

1. Зарегистрировать домен (Namecheap, Cloudflare Registrar, Reg.ru).
2. https://dash.cloudflare.com → Add Site → ввести домен → выбрать Free plan.
3. Cloudflare выдаст 2 NS-сервера → прописать у регистратора домена.
4. В Cloudflare DNS:
   - `CNAME @ sanyastem.github.io` (proxied — оранжевое облако)
   - `CNAME www sanyastem.github.io` (proxied)
5. В репо: создать файл `CNAME` в корне с содержимым `sanyastem.dev` (твой домен).
6. GitHub → Settings → Pages → Custom domain: `sanyastem.dev` → ✅ Enforce HTTPS.
7. В Cloudflare → SSL/TLS → выбрать **Full** (не Flexible — будет петля).
8. (опц.) Speed → Optimization → ✅ Auto Minify CSS/JS, ✅ Brotli.

Проверка: `curl -I https://sanyastem.dev` → видишь `cf-ray:` и `server: cloudflare`.

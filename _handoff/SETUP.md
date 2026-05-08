# Внешние сервисы — пошаговая настройка

Эти настройки нельзя сделать кодом — нужны действия в UI сервисов.

## 1. Giscus (комментарии)

После активации в `_config.yml` появятся комменты под каждой статьёй.

1. https://github.com/sanyastem/sanyastem.github.io/settings → General → раздел Features → ✅ Discussions
2. Установить приложение https://github.com/apps/giscus и дать доступ к репо
3. Открыть https://giscus.app:
   - Repository: `sanyastem/sanyastem.github.io`
   - Page ↔ Discussions Mapping: **pathname**
   - Discussion Category: **Announcements**
   - Скопировать `data-repo-id` и `data-category-id` из сгенерированного снизу кода
4. Вписать в `_config.yml` под секцию `giscus:`:
   ```yaml
   giscus:
     repo: "sanyastem/sanyastem.github.io"
     repo_id: "R_kgDO..."        # из шага 3
     category: "Announcements"
     category_id: "DIC_kwDO..."   # из шага 3
   ```
5. Закоммитить, запушить — комменты появятся.

---

## 2. Cloudflare CDN перед GitHub Pages

Бесплатно. Даёт +30% скорость, кэш-заголовки, аналитика, защита от DDoS.

> ⚠️ Только если у тебя есть собственный домен (`sanyastem.dev` и т.п.). Для дефолтного `sanyastem.github.io` Cloudflare не поставить.

1. Зарегистрировать домен (Namecheap, Cloudflare Registrar, Реги.ру).
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

---

## 3. Newsletter через Buttondown

Бесплатно до 100 подписчиков, $9/мес дальше.

1. https://buttondown.email → Sign up.
2. Profile → Settings → выбрать имя рассылки и кастомный slug.
3. Settings → Embedding → скопировать HTML формы подписки.
4. Вставить форму в `_includes/newsletter.html`:
   ```html
   <section class="newsletter">
     <h3>Получай новые статьи</h3>
     <form action="https://buttondown.email/api/emails/embed-subscribe/<твой-slug>" method="post" target="popupwindow">
       <input type="email" name="email" placeholder="email" required>
       <button type="submit">Подписаться</button>
     </form>
   </section>
   ```
5. Подключить include в `_layouts/default.html` перед `<footer>`.
6. Buttondown → Automations → создать «New post on RSS» → подключить `https://sanyastem.github.io/feed.xml` → автоматическая рассылка при публикации.

После — каждая новая статья летит подписчикам автоматически.

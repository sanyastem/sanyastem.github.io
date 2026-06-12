// Respect prefers-reduced-motion for JS-driven scrolling
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Fade-in on scroll (only on first load)
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add('visible'), i * 40);
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.06 });

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// ========== Filters (category + difficulty) ==========
const postCards  = document.querySelectorAll('.post-card');
const noPostsMsg = document.getElementById('no-posts');

let activeCategory = 'all';
let activeDiff     = 'all';

function applyFilter() {
    let visible = 0;
    postCards.forEach(card => {
        const okCat  = activeCategory === 'all' || card.dataset.category === activeCategory;
        const okDiff = activeDiff === 'all' || card.dataset.difficulty === activeDiff;
        const show = okCat && okDiff;
        card.style.display = show ? '' : 'none';
        if (show) visible++;
    });
    if (noPostsMsg) noPostsMsg.style.display = visible === 0 ? 'block' : 'none';
}

function syncUrl() {
    const params = new URLSearchParams();
    if (activeCategory !== 'all') params.set('filter', activeCategory);
    if (activeDiff !== 'all')     params.set('level', activeDiff);
    const qs = params.toString();
    const url = window.location.pathname + (qs ? '?' + qs : '');
    history.replaceState(null, '', url);
}

function bindFilterBar(barId, key, getter, setter) {
    const bar = document.getElementById(barId);
    if (!bar) return;
    bar.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            bar.querySelectorAll('.filter-btn').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
            setter(btn.dataset[key]);
            applyFilter();
            syncUrl();
        });
    });
}

bindFilterBar('cat-bar',  'filter', () => activeCategory, v => activeCategory = v);
bindFilterBar('diff-bar', 'diff',   () => activeDiff,     v => activeDiff = v);

// URL state on load
const params = new URLSearchParams(window.location.search);
['filter', 'level'].forEach(key => {
    const val = params.get(key);
    if (!val) return;
    const sel = key === 'filter'
        ? `#cat-bar .filter-btn[data-filter="${val}"]`
        : `#diff-bar .filter-btn[data-diff="${val}"]`;
    const btn = document.querySelector(sel);
    if (btn) btn.click();
});

// ========== Scroll top ==========
const scrollTopBtn = document.getElementById('scrollTop');
if (scrollTopBtn) {
    window.addEventListener('scroll', () => scrollTopBtn.classList.toggle('visible', window.scrollY > 400));
    scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' }));
}

// ========== Burger ==========
const burger   = document.getElementById('burger');
const navLinks = document.querySelector('.nav-links');
if (burger && navLinks) {
    const setOpen = (open) => {
        navLinks.classList.toggle('open', open);
        burger.classList.toggle('open', open);
        burger.setAttribute('aria-expanded', String(open));
    };
    burger.addEventListener('click', () => setOpen(!navLinks.classList.contains('open')));
    document.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
}

// ========== Copy button for code blocks ==========
document.querySelectorAll('.article-body div.highlight').forEach(block => {
    const wrap = document.createElement('div');
    wrap.className = 'highlight-wrap';
    block.parentNode.insertBefore(wrap, block);
    wrap.appendChild(block);

    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.type = 'button';
    btn.textContent = 'Скопировать';
    btn.setAttribute('aria-label', 'Скопировать код');
    btn.addEventListener('click', () => {
        const code = block.querySelector('pre')?.textContent || '';
        navigator.clipboard.writeText(code).then(() => {
            btn.textContent = 'Готово';
            btn.classList.add('copied');
            setTimeout(() => { btn.textContent = 'Скопировать'; btn.classList.remove('copied'); }, 1500);
        });
    });
    wrap.appendChild(btn);
});

// ========== Wrap tables for overflow scroll ==========
document.querySelectorAll('.article-body table').forEach(table => {
    if (!table.parentElement.classList.contains('table-wrap')) {
        const wrap = document.createElement('div');
        wrap.className = 'table-wrap';
        table.parentNode.insertBefore(wrap, table);
        wrap.appendChild(table);
    }
});

// ========== Heading anchors + TOC ==========
const headings = document.querySelectorAll('.article-body h2, .article-body h3');
const tocEl    = document.getElementById('article-toc');

function slugify(text) {
    return text.trim().toLowerCase()
        .replace(/[^\wа-яё\s-]/gi, '')
        .replace(/\s+/g, '-');
}

// Stage 1: read all heading data first (reads only)
const tocItems = [];
const anchorsToAppend = [];
headings.forEach(heading => {
    if (!heading.id) heading.id = slugify(heading.textContent);
    const anchor = document.createElement('a');
    anchor.className = 'heading-anchor';
    anchor.href = '#' + heading.id;
    anchor.textContent = '#';
    anchor.setAttribute('aria-label', 'Ссылка на раздел');
    anchorsToAppend.push({ heading, anchor });
    tocItems.push({ id: heading.id, text: heading.textContent.trim(), level: heading.tagName });
});

// Stage 2: write — build TOC list in DocumentFragment, render in both desktop sidebar
// и mobile <details> drawer (один и тот же UL клонируется)
function buildTocList(items) {
    const ul = document.createElement('ul');
    items.forEach(item => {
        const li = document.createElement('li');
        li.className = 'toc-' + item.level.toLowerCase();
        const a = document.createElement('a');
        a.href = '#' + item.id;
        a.textContent = item.text;
        li.appendChild(a);
        ul.appendChild(li);
    });
    return ul;
}

const tocMobileEl = document.getElementById('article-toc-m');
const tocMobileWrap = document.getElementById('article-toc-mobile');

if (tocItems.length >= 3) {
    if (tocEl) {
        tocEl.appendChild(buildTocList(tocItems));
        tocEl.parentElement.classList.add('has-toc');
    }
    if (tocMobileEl) {
        tocMobileEl.appendChild(buildTocList(tocItems));
        tocMobileWrap?.classList.add('has-toc');
    }

    const allLinks = document.querySelectorAll('#article-toc a, #article-toc-m a');
    const byId = new Map();
    allLinks.forEach(a => {
        const id = a.getAttribute('href').slice(1);
        if (!byId.has(id)) byId.set(id, []);
        byId.get(id).push(a);
    });
    const spy = new IntersectionObserver(entries => {
        entries.forEach(e => {
            const links = byId.get(e.target.id);
            if (!links) return;
            if (e.isIntersecting) {
                allLinks.forEach(l => l.classList.remove('is-active'));
                links.forEach(l => l.classList.add('is-active'));
            }
        });
    }, { rootMargin: '-80px 0px -70% 0px' });
    headings.forEach(h => spy.observe(h));

    // Закрывать mobile drawer после клика по ссылке
    tocMobileEl?.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => { if (tocMobileWrap) tocMobileWrap.open = false; });
    });
} else {
    tocMobileWrap?.remove();
}

// Append anchors after TOC build (writes batched)
anchorsToAppend.forEach(({ heading, anchor }) => heading.appendChild(anchor));

// ========== Reading progress bar (rAF-throttled) ==========
const progressBar = document.querySelector('.reading-progress');
const progressText = document.querySelector('.reading-progress-text');
const articleReadTime = parseInt(document.body.dataset.readTime || '0', 10);
if (progressBar) {
    let ticking = false;
    let cachedDocHeight = 0;
    function updateDocHeight() {
        cachedDocHeight = document.documentElement.scrollHeight - window.innerHeight;
    }
    function onScroll() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            if (cachedDocHeight > 0) {
                const pct = Math.min(window.scrollY / cachedDocHeight, 1);
                progressBar.style.width = (pct * 100) + '%';
                if (progressText && articleReadTime > 0) {
                    const left = Math.max(0, Math.ceil(articleReadTime * (1 - pct)));
                    const suffix = progressText.dataset.suffix || 'мин до конца';
                    const done = progressText.dataset.done || 'готово';
                    progressText.textContent = left > 0 ? left + ' ' + suffix : done;
                }
            }
            ticking = false;
        });
    }
    updateDocHeight();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateDocHeight, { passive: true });
}

// ========== Theme toggle (с dynamic aria-label) ==========
const themeToggle = document.getElementById('theme-toggle');
function syncThemeLabel() {
    if (!themeToggle) return;
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    themeToggle.setAttribute('aria-label', isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему');
}
syncThemeLabel();
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        const next = isDark ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        syncThemeLabel();
    });
}

// ========== Series box toggle ==========
const seriesToggle = document.getElementById('series-toggle');
const seriesParts  = document.getElementById('series-parts');
if (seriesToggle && seriesParts) {
    seriesToggle.addEventListener('click', () => {
        const open = seriesParts.style.display !== 'none';
        seriesParts.style.display = open ? 'none' : 'flex';
        seriesParts.style.marginTop = open ? '0' : '14px';
        seriesToggle.classList.toggle('open', !open);
        seriesToggle.setAttribute('aria-expanded', String(!open));
    });
}

// ========== Burger X-animation + search keyboard shortcut ==========
// (burger handler updated above to flip class via toggle('open'))
// Глобальный shortcut «/» — фокус на поиск
document.addEventListener('keydown', e => {
    if (e.key !== '/' || e.target.matches('input, textarea, [contenteditable]')) return;
    const search = document.querySelector('#pagefind input, .pagefind-ui__search-input');
    if (search) { e.preventDefault(); search.focus(); }
});

// ========== Mermaid diagrams ==========
// Конвертирует <pre><code class="language-mermaid">...</code></pre> в SVG
const mermaidBlocks = document.querySelectorAll('code.language-mermaid');
if (mermaidBlocks.length > 0) {
    const script = document.createElement('script');
    script.type = 'module';
    script.textContent = `
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        mermaid.initialize({
            startOnLoad: false,
            theme: isDark ? 'dark' : 'default',
            themeVariables: {
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: '14px'
            }
        });
        document.querySelectorAll('code.language-mermaid').forEach((el, i) => {
            const wrap = document.createElement('div');
            wrap.className = 'mermaid';
            wrap.id = 'mermaid-' + i;
            wrap.textContent = el.textContent;
            const pre = el.closest('pre') || el.closest('.highlight');
            (pre || el).replaceWith(wrap);
        });
        await mermaid.run({ querySelector: '.mermaid' });
    `;
    document.body.appendChild(script);
}

// ========== Share: copy link ==========
document.querySelectorAll('.post-share-copy').forEach(btn => {
    btn.addEventListener('click', () => {
        const url = btn.dataset.copy || window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            const orig = btn.textContent;
            btn.textContent = 'готово';
            btn.classList.add('copied');
            setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 1500);
        });
    });
});

// ========== Ad collapse / expand ==========
(function() {
    const KEY = 'ads-collapsed';
    function state() {
        try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch(e) { return {}; }
    }
    function save(map) { localStorage.setItem(KEY, JSON.stringify(map)); }

    function apply(wrap, collapsed) {
        wrap.classList.toggle('is-collapsed', collapsed);
        const btn = wrap.querySelector('.ad-toggle');
        if (btn) {
            btn.setAttribute('aria-expanded', String(!collapsed));
            btn.title = collapsed ? 'Развернуть' : 'Свернуть';
        }
    }

    // Применить сохранённое состояние при загрузке
    const s0 = state();
    document.querySelectorAll('.ad-wrap').forEach(wrap => {
        const key = wrap.dataset.adSlotKey || 'default';
        if (s0[key]) apply(wrap, true);
    });

    // Клик по кнопке-стрелке
    document.addEventListener('click', e => {
        const btn = e.target.closest('.ad-toggle');
        if (!btn) return;
        const wrap = btn.closest('.ad-wrap');
        if (!wrap) return;
        const key = wrap.dataset.adSlotKey || 'default';
        const s = state();
        const isCollapsed = !wrap.classList.contains('is-collapsed');
        if (isCollapsed) s[key] = true; else delete s[key];
        save(s);
        apply(wrap, isCollapsed);
    });

    // Public API: window.__expandAllAds() — развернуть все
    window.__expandAllAds = () => {
        localStorage.removeItem(KEY);
        document.querySelectorAll('.ad-wrap.is-collapsed').forEach(w => apply(w, false));
    };
})();

// ========== Cookie consent (GDPR + Google Consent Mode v2) ==========
(function() {
    const STORAGE_KEY = 'cookie-consent';
    const banner = document.getElementById('cookie-banner');
    const settings = document.getElementById('cookie-settings');
    if (!banner) return;

    function loadConsent() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch(e) { return null; }
    }
    function saveConsent(c) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...c, ts: Date.now() }));
        applyConsent(c);
    }
    function applyConsent(c) {
        if (typeof gtag === 'function') {
            gtag('consent', 'update', {
                'ad_storage':         c.ads       ? 'granted' : 'denied',
                'ad_user_data':       c.ads       ? 'granted' : 'denied',
                'ad_personalization': c.ads       ? 'granted' : 'denied',
                'analytics_storage':  c.analytics ? 'granted' : 'denied'
            });
        }
    }
    function showBanner() { banner.hidden = false; banner.classList.add('is-open'); }
    function hideBanner() { banner.hidden = true; banner.classList.remove('is-open'); }
    function showSettings() {
        const c = loadConsent() || { analytics: false, ads: false };
        document.getElementById('consent-analytics').checked = !!c.analytics;
        document.getElementById('consent-ads').checked = !!c.ads;
        settings.hidden = false;
        settings.classList.add('is-open');
    }
    function hideSettings() { settings.hidden = true; settings.classList.remove('is-open'); }

    // Открыть настройки извне (из футера / privacy)
    window.__openCookieSettings = () => { hideBanner(); showSettings(); };

    banner.querySelectorAll('[data-consent]').forEach(btn => {
        btn.addEventListener('click', () => {
            const v = btn.dataset.consent;
            if (v === 'all')        saveConsent({ analytics: true,  ads: true  });
            if (v === 'necessary')  saveConsent({ analytics: false, ads: false });
            if (v === 'customize')  { hideBanner(); showSettings(); return; }
            hideBanner();
        });
    });

    settings.querySelectorAll('[data-close-settings]').forEach(el => {
        el.addEventListener('click', hideSettings);
    });

    document.getElementById('cookie-save')?.addEventListener('click', () => {
        saveConsent({
            analytics: document.getElementById('consent-analytics').checked,
            ads:       document.getElementById('consent-ads').checked
        });
        hideSettings();
    });

    // Показать баннер при первом визите
    if (!loadConsent()) {
        setTimeout(showBanner, 400);
    }
})();

// ========== Прожектор за курсором (featured-card) ==========
document.querySelectorAll('.featured-card').forEach(card => {
    card.addEventListener('pointermove', e => {
        if (prefersReducedMotion()) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
});

// ========== Шапка: прячется вниз, появляется вверх ==========
(function () {
    const nav = document.querySelector('.navbar');
    if (!nav) return;
    let lastY = window.scrollY;
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            const y = window.scrollY;
            // Не прятать пока открыто мобильное меню
            const menuOpen = document.querySelector('.nav-links.open');
            if (!menuOpen && !prefersReducedMotion()) {
                if (y > lastY && y > 160) nav.classList.add('nav-hidden');
                else nav.classList.remove('nav-hidden');
            }
            lastY = y;
            ticking = false;
        });
    }, { passive: true });
})();

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
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
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
    scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ========== Burger ==========
const burger   = document.getElementById('burger');
const navLinks = document.querySelector('.nav-links');
if (burger && navLinks) {
    const setOpen = (open) => {
        navLinks.classList.toggle('open', open);
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

// Stage 2: write — build TOC in DocumentFragment, append all in one pass
if (tocEl && tocItems.length >= 3) {
    const frag = document.createDocumentFragment();
    const ul = document.createElement('ul');
    tocItems.forEach(item => {
        const li = document.createElement('li');
        li.className = 'toc-' + item.level.toLowerCase();
        const a = document.createElement('a');
        a.href = '#' + item.id;
        a.textContent = item.text;
        li.appendChild(a);
        ul.appendChild(li);
    });
    frag.appendChild(ul);
    tocEl.appendChild(frag);
    tocEl.parentElement.classList.add('has-toc');

    const tocLinks = tocEl.querySelectorAll('a');
    const byId = new Map(Array.from(tocLinks).map(a => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver(entries => {
        entries.forEach(e => {
            const link = byId.get(e.target.id);
            if (!link) return;
            if (e.isIntersecting) {
                tocLinks.forEach(l => l.classList.remove('is-active'));
                link.classList.add('is-active');
            }
        });
    }, { rootMargin: '-80px 0px -70% 0px' });
    headings.forEach(h => spy.observe(h));
}

// Append anchors after TOC build (writes batched)
anchorsToAppend.forEach(({ heading, anchor }) => heading.appendChild(anchor));

// ========== Reading progress bar (rAF-throttled) ==========
const progressBar = document.querySelector('.reading-progress');
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
                progressBar.style.width = Math.min(window.scrollY / cachedDocHeight * 100, 100) + '%';
            }
            ticking = false;
        });
    }
    updateDocHeight();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateDocHeight, { passive: true });
}

// ========== Theme toggle ==========
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        const next = isDark ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
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
document.querySelectorAll('.share-copy').forEach(btn => {
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

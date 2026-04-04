// Fade-in on scroll
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add('visible'), i * 50);
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.06 });

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// ========== Combined filter (category + difficulty + search) ==========
const postCards  = document.querySelectorAll('.post-card');
const noPostsMsg = document.getElementById('no-posts');

let activeCategory   = 'all';
let activeDifficulty = 'all';

function applyFilter() {
    let visible = 0;

    postCards.forEach(card => {
        const catMatch  = activeCategory   === 'all' || card.dataset.category   === activeCategory;
        const diffMatch = activeDifficulty === 'all' || card.dataset.difficulty === activeDifficulty || card.dataset.difficulty === 'series';
        const show = catMatch && diffMatch;

        card.style.display = show ? '' : 'none';
        if (show) {
            visible++;
            card.classList.remove('visible');
            setTimeout(() => card.classList.add('visible'), 50);
        }
    });

    if (noPostsMsg) noPostsMsg.style.display = visible === 0 ? 'block' : 'none';
}

// Category buttons
document.querySelectorAll('#cat-bar .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#cat-bar .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCategory = btn.dataset.filter;
        applyFilter();
    });
});

// Difficulty buttons
document.querySelectorAll('#diff-bar .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#diff-bar .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeDifficulty = btn.dataset.diff;
        applyFilter();
    });
});


// URL filter on load
const urlFilter = new URLSearchParams(window.location.search).get('filter');
if (urlFilter) {
    const btn = document.querySelector(`#cat-bar .filter-btn[data-filter="${urlFilter}"]`);
    if (btn) btn.click();
}

// Scroll top
const scrollTopBtn = document.getElementById('scrollTop');
if (scrollTopBtn) {
    window.addEventListener('scroll', () => scrollTopBtn.classList.toggle('visible', window.scrollY > 400));
    scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// Burger
const burger   = document.getElementById('burger');
const navLinks = document.querySelector('.nav-links');
if (burger) {
    burger.addEventListener('click', () => navLinks.classList.toggle('open'));
    document.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', () => navLinks.classList.remove('open')));
}

// ========== Copy button for code blocks ==========
document.querySelectorAll('.article-body div.highlight').forEach(block => {
    const wrap = document.createElement('div');
    wrap.className = 'highlight-wrap';
    block.parentNode.insertBefore(wrap, block);
    wrap.appendChild(block);

    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.textContent = 'Скопировать';
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

// ========== Heading anchors ==========
document.querySelectorAll('.article-body h2, .article-body h3').forEach(heading => {
    if (!heading.id) {
        heading.id = heading.textContent.trim().toLowerCase()
            .replace(/[^\wа-яё\s-]/gi, '').replace(/\s+/g, '-');
    }
    const anchor = document.createElement('a');
    anchor.className = 'heading-anchor';
    anchor.href = '#' + heading.id;
    anchor.textContent = '#';
    anchor.setAttribute('aria-label', 'Ссылка на раздел');
    heading.appendChild(anchor);
});

// ========== Reading progress bar ==========
const progressBar = document.querySelector('.reading-progress');
if (progressBar) {
    window.addEventListener('scroll', () => {
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (docHeight > 0) {
            progressBar.style.width = Math.min(window.scrollY / docHeight * 100, 100) + '%';
        }
    });
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
const seriesParts = document.getElementById('series-parts');
if (seriesToggle && seriesParts) {
    seriesToggle.addEventListener('click', () => {
        const open = seriesParts.style.display !== 'none';
        seriesParts.style.display = open ? 'none' : 'flex';
        seriesParts.style.marginTop = open ? '0' : '14px';
        seriesToggle.classList.toggle('open', !open);
    });
}

// ========== Active nav link for current category ==========
const pageCat = document.querySelector('.article-hero .tag')?.className.match(/tag-(\w+)/)?.[1];
if (pageCat) {
    document.querySelectorAll(`.nav-link[data-filter="${pageCat}"]`).forEach(l => l.classList.add('active'));
}

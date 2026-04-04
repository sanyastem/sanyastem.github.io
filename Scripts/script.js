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
const postsCount = document.getElementById('posts-count');
const searchInput = document.getElementById('search-input');

let activeCategory   = 'all';
let activeDifficulty = 'all';

function applyFilter() {
    let visible = 0;
    const query = (searchInput?.value || '').toLowerCase().trim();

    postCards.forEach(card => {
        const catMatch  = activeCategory   === 'all' || card.dataset.category   === activeCategory;
        const diffMatch = activeDifficulty === 'all' || card.dataset.difficulty === activeDifficulty || card.dataset.difficulty === 'series';
        const title   = card.querySelector('.post-title')?.textContent.toLowerCase() || '';
        const excerpt = card.querySelector('.post-excerpt')?.textContent.toLowerCase() || '';
        const searchMatch = !query || title.includes(query) || excerpt.includes(query);
        const show = catMatch && diffMatch && searchMatch;

        card.style.display = show ? '' : 'none';
        if (show) {
            visible++;
            card.classList.remove('visible');
            setTimeout(() => card.classList.add('visible'), 50);
        }
    });

    if (postsCount) postsCount.textContent = visible + ' ' + decline(visible);
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

// Search
if (searchInput) {
    searchInput.addEventListener('input', applyFilter);
}

function decline(n) {
    if (n === 1) return 'статья';
    if (n >= 2 && n <= 4) return 'статьи';
    return 'статей';
}

// Nav links with data-filter
document.querySelectorAll('.nav-link[data-filter]').forEach(link => {
    link.addEventListener('click', (e) => {
        const filter = link.dataset.filter;
        const btn = document.querySelector(`#cat-bar .filter-btn[data-filter="${filter}"]`);
        if (btn) {
            e.preventDefault();
            btn.click();
            document.getElementById('posts')?.scrollIntoView({ behavior: 'smooth' });
        }
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
document.querySelectorAll('.article-body .highlight').forEach(block => {
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
document.querySelectorAll('.article-body h2[id], .article-body h3[id]').forEach(heading => {
    const anchor = document.createElement('a');
    anchor.className = 'heading-anchor';
    anchor.href = '#' + heading.id;
    anchor.textContent = '#';
    anchor.setAttribute('aria-label', 'Ссылка на раздел');
    heading.appendChild(anchor);
});

// Generate ids for headings without them
document.querySelectorAll('.article-body h2:not([id]), .article-body h3:not([id])').forEach(heading => {
    const text = heading.textContent.replace(/#$/, '').trim();
    heading.id = text.toLowerCase().replace(/[^\wа-яё\s-]/gi, '').replace(/\s+/g, '-');
    const anchor = document.createElement('a');
    anchor.className = 'heading-anchor';
    anchor.href = '#' + heading.id;
    anchor.textContent = '#';
    anchor.setAttribute('aria-label', 'Ссылка на разд��л');
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

// ========== Active nav link for current category ==========
const pageCat = document.querySelector('.article-hero .tag')?.className.match(/tag-(\w+)/)?.[1];
if (pageCat) {
    document.querySelectorAll(`.nav-link[data-filter="${pageCat}"]`).forEach(l => l.classList.add('active'));
}

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

// ========== Combined filter (category + difficulty) ==========
const postCards  = document.querySelectorAll('.post-card');
const noPostsMsg = document.getElementById('no-posts');
const postsCount = document.getElementById('posts-count');

let activeCategory   = 'all';
let activeDifficulty = 'all';

function applyFilter() {
    let visible = 0;

    postCards.forEach(card => {
        const catMatch  = activeCategory   === 'all' || card.dataset.category   === activeCategory;
        const diffMatch = activeDifficulty === 'all' || card.dataset.difficulty === activeDifficulty;
        const show = catMatch && diffMatch;

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

function decline(n) {
    if (n === 1) return 'статья';
    if (n >= 2 && n <= 4) return 'статьи';
    return 'статей';
}

// Nav links with data-filter
document.querySelectorAll('.nav-link[data-filter]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const filter = link.dataset.filter;
        const btn = document.querySelector(`#cat-bar .filter-btn[data-filter="${filter}"]`);
        if (btn) { btn.click(); document.getElementById('posts')?.scrollIntoView({ behavior: 'smooth' }); }
    });
});

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

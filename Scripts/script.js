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

// Filter
const filterBtns  = document.querySelectorAll('.filter-btn');
const postCards   = document.querySelectorAll('.post-card');
const noPostsMsg  = document.getElementById('no-posts');
const postsCount  = document.getElementById('posts-count');

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.dataset.filter;
        let visible = 0;

        postCards.forEach(card => {
            const match = filter === 'all' || card.dataset.category === filter;
            card.style.display = match ? '' : 'none';
            if (match) {
                visible++;
                card.classList.remove('visible');
                setTimeout(() => card.classList.add('visible'), 50);
            }
        });

        if (postsCount) postsCount.textContent = visible + ' ' + decline(visible);
        if (noPostsMsg) noPostsMsg.style.display = visible === 0 ? 'block' : 'none';
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
        const btn = document.querySelector(`.filter-btn[data-filter="${filter}"]`);
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

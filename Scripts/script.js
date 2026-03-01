// ========== Fade-in on scroll ==========
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add('visible'), i * 60);
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.08 });

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// ========== Filter ==========
const filterBtns = document.querySelectorAll('.filter-btn');
const postCards  = document.querySelectorAll('.post-card');
const noPostsMsg = document.getElementById('no-posts');

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
                requestAnimationFrame(() => {
                    setTimeout(() => card.classList.add('visible'), 50);
                });
            }
        });

        noPostsMsg.style.display = visible === 0 ? 'block' : 'none';
    });
});

// ========== Scroll Top ==========
const scrollTopBtn = document.getElementById('scrollTop');

window.addEventListener('scroll', () => {
    scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
});

scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ========== Burger ==========
const burger   = document.getElementById('burger');
const navLinks = document.querySelector('.nav-links');

burger.addEventListener('click', () => navLinks.classList.toggle('open'));

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => navLinks.classList.remove('open'));
});

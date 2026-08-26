/* ========================================
   KEVIN'S TATTOO STUDIO — Main JS
   Navigation, scroll, parallax, gallery filter
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize AOS
    AOS.init({
        duration: 800,
        easing: 'ease-out-cubic',
        once: true,
        offset: 80,
        disable: window.innerWidth < 768 ? 'phone' : false
    });

    initNavigation();
    initSmoothScroll();
    initParallax();
    initGalleryFilter();
    initStatCounter();
    initContactForm();
});

/* === NAVIGATION === */
function initNavigation() {
    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section, .hero');

    // Scroll — add .scrolled class
    let lastScrollY = 0;
    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        navbar.classList.toggle('scrolled', scrollY > 50);
        lastScrollY = scrollY;

        // Active nav link based on scroll position
        updateActiveNav(sections, navLinks);
    }, { passive: true });

    // Hamburger toggle
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
        document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
    });

    // Close menu on link click
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navMenu.classList.contains('active')) {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}

function updateActiveNav(sections, navLinks) {
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 120;
        if (window.scrollY >= sectionTop) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
}

/* === SMOOTH SCROLL === */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const offsetTop = target.offsetTop - 80;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/* === PARALLAX HERO === */
function initParallax() {
    const heroImg = document.querySelector('.hero-bg-img');
    if (!heroImg || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                const scrollY = window.scrollY;
                const heroHeight = document.querySelector('.hero').offsetHeight;
                if (scrollY <= heroHeight) {
                    const parallaxOffset = scrollY * 0.3;
                    heroImg.style.transform = `scale(1.1) translateY(${parallaxOffset}px)`;
                }
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
}

/* === GALLERY FILTER === */
function initGalleryFilter() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const galleryItems = document.querySelectorAll('.gallery-item');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active button
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.dataset.filter;

            galleryItems.forEach((item, index) => {
                const category = item.dataset.category;
                const shouldShow = filter === 'all' || category === filter;

                if (shouldShow) {
                    item.classList.remove('hidden');
                    item.style.animationDelay = `${index * 50}ms`;
                    item.classList.remove('filtering-in');
                    // Force reflow
                    void item.offsetWidth;
                    item.classList.add('filtering-in');
                } else {
                    item.classList.add('hidden');
                }
            });
        });
    });
}

/* === STAT COUNTER ANIMATION === */
function initStatCounter() {
    const statNumbers = document.querySelectorAll('.stat-number[data-count]');
    if (!statNumbers.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    statNumbers.forEach(el => observer.observe(el));
}

function animateCounter(element) {
    const target = parseInt(element.dataset.count);
    const duration = 2000;
    const start = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out quad
        const eased = 1 - (1 - progress) * (1 - progress);
        const current = Math.floor(eased * target);
        element.textContent = current.toLocaleString();

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = target.toLocaleString();
            element.classList.add('counted');
        }
    }

    requestAnimationFrame(update);
}

/* === CONTACT FORM VALIDATION === */
function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Basic validation
        const name = form.querySelector('#name');
        const email = form.querySelector('#email');
        const message = form.querySelector('#message');
        let isValid = true;

        [name, email, message].forEach(field => {
            field.style.borderColor = '';
        });

        if (!name.value.trim()) {
            name.style.borderColor = '#e74c3c';
            isValid = false;
        }

        if (!email.value.trim() || !isValidEmail(email.value)) {
            email.style.borderColor = '#e74c3c';
            isValid = false;
        }

        if (!message.value.trim()) {
            message.style.borderColor = '#e74c3c';
            isValid = false;
        }

        if (isValid) {
            // Show success feedback (no backend yet)
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span>Message Sent!</span> <i class="fas fa-check"></i>';
            submitBtn.style.background = '#27ae60';
            submitBtn.disabled = true;

            setTimeout(() => {
                submitBtn.innerHTML = originalText;
                submitBtn.style.background = '';
                submitBtn.disabled = false;
                form.reset();
            }, 3000);
        }
    });
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

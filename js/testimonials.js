/* ========================================
   KEVIN'S TATTOO STUDIO — Testimonials
   Carousel with auto-slide & dot navigation
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    initTestimonials();
});

function initTestimonials() {
    const track = document.getElementById('testimonialsTrack');
    const dotsContainer = document.getElementById('testimonialDots');
    const prevBtn = document.querySelector('.testimonial-prev');
    const nextBtn = document.querySelector('.testimonial-next');

    if (!track || !dotsContainer) return;

    const cards = track.querySelectorAll('.testimonial-card');
    const totalSlides = cards.length;
    let currentSlide = 0;
    let autoPlayInterval = null;
    let isTransitioning = false;

    // Create dots
    for (let i = 0; i < totalSlides; i++) {
        const dot = document.createElement('button');
        dot.classList.add('testimonial-dot');
        dot.setAttribute('aria-label', `Go to testimonial ${i + 1}`);
        if (i === 0) dot.classList.add('active');
        dot.addEventListener('click', () => goToSlide(i));
        dotsContainer.appendChild(dot);
    }

    const dots = dotsContainer.querySelectorAll('.testimonial-dot');

    function goToSlide(index) {
        if (isTransitioning || index === currentSlide) return;
        isTransitioning = true;

        currentSlide = index;
        updateSlider();

        setTimeout(() => {
            isTransitioning = false;
        }, 500);
    }

    function updateSlider() {
        track.style.transform = `translateX(-${currentSlide * 100}%)`;

        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === currentSlide);
        });
    }

    function nextSlide() {
        const next = (currentSlide + 1) % totalSlides;
        goToSlide(next);
    }

    function prevSlide() {
        const prev = (currentSlide - 1 + totalSlides) % totalSlides;
        goToSlide(prev);
    }

    // Button listeners
    nextBtn.addEventListener('click', () => {
        nextSlide();
        resetAutoPlay();
    });

    prevBtn.addEventListener('click', () => {
        prevSlide();
        resetAutoPlay();
    });

    // Auto-play
    function startAutoPlay() {
        autoPlayInterval = setInterval(nextSlide, 5000);
    }

    function resetAutoPlay() {
        clearInterval(autoPlayInterval);
        startAutoPlay();
    }

    // Pause on hover
    const wrapper = document.querySelector('.testimonials-wrapper');
    wrapper.addEventListener('mouseenter', () => clearInterval(autoPlayInterval));
    wrapper.addEventListener('mouseleave', startAutoPlay);

    // Touch/swipe support
    let touchStartX = 0;
    let touchEndX = 0;

    track.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        clearInterval(autoPlayInterval);
    }, { passive: true });

    track.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
        startAutoPlay();
    }, { passive: true });

    function handleSwipe() {
        const diff = touchStartX - touchEndX;
        const threshold = 50;

        if (Math.abs(diff) > threshold) {
            if (diff > 0) {
                nextSlide();
            } else {
                prevSlide();
            }
        }
    }

    // Keyboard support when focused
    wrapper.setAttribute('tabindex', '0');
    wrapper.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            prevSlide();
            resetAutoPlay();
        } else if (e.key === 'ArrowRight') {
            nextSlide();
            resetAutoPlay();
        }
    });

    // Start auto-play
    startAutoPlay();

    // Pause when tab is not visible
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            clearInterval(autoPlayInterval);
        } else {
            startAutoPlay();
        }
    });
}

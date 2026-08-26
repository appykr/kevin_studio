/* ========================================
   KEVIN'S TATTOO STUDIO — Lightbox
   Image modal with navigation
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    initLightbox();
});

function initLightbox() {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImage');
    const lightboxCaption = document.getElementById('lightboxCaption');
    const closeBtn = lightbox.querySelector('.lightbox-close');
    const prevBtn = lightbox.querySelector('.lightbox-prev');
    const nextBtn = lightbox.querySelector('.lightbox-next');

    const galleryItems = document.querySelectorAll('.gallery-item');
    let currentIndex = 0;
    let visibleItems = [];

    function getVisibleItems() {
        return Array.from(galleryItems).filter(item => !item.classList.contains('hidden'));
    }

    function openLightbox(index) {
        visibleItems = getVisibleItems();
        currentIndex = index;

        const item = visibleItems[currentIndex];
        const img = item.querySelector('img');
        const category = item.querySelector('.gallery-category')?.textContent || '';
        const title = item.querySelector('h3')?.textContent || '';

        // Use higher resolution version
        const src = img.src.replace('w=600', 'w=1200').replace('w=800', 'w=1600');
        lightboxImg.src = src;
        lightboxImg.alt = img.alt;

        lightboxCaption.innerHTML = `
            <span class="gallery-category">${category}</span>
            <h3>${title}</h3>
        `;

        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';

        updateNavButtons();
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
        lightboxImg.src = '';
    }

    function navigate(direction) {
        currentIndex += direction;
        if (currentIndex < 0) currentIndex = visibleItems.length - 1;
        if (currentIndex >= visibleItems.length) currentIndex = 0;

        const item = visibleItems[currentIndex];
        const img = item.querySelector('img');
        const category = item.querySelector('.gallery-category')?.textContent || '';
        const title = item.querySelector('h3')?.textContent || '';

        const src = img.src.replace('w=600', 'w=1200').replace('w=800', 'w=1600');

        // Fade transition
        lightboxImg.style.opacity = '0';
        setTimeout(() => {
            lightboxImg.src = src;
            lightboxImg.alt = img.alt;
            lightboxCaption.innerHTML = `
                <span class="gallery-category">${category}</span>
                <h3>${title}</h3>
            `;
            lightboxImg.style.opacity = '1';
        }, 200);

        updateNavButtons();
    }

    function updateNavButtons() {
        // Always show both buttons (wrapping navigation)
        prevBtn.style.display = 'flex';
        nextBtn.style.display = 'flex';
    }

    // Event Listeners
    galleryItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            const visItems = getVisibleItems();
            const visIndex = visItems.indexOf(item);
            openLightbox(visIndex >= 0 ? visIndex : 0);
        });
    });

    closeBtn.addEventListener('click', closeLightbox);
    prevBtn.addEventListener('click', () => navigate(-1));
    nextBtn.addEventListener('click', () => navigate(1));

    // Close on backdrop click
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;

        switch (e.key) {
            case 'Escape':
                closeLightbox();
                break;
            case 'ArrowLeft':
                navigate(-1);
                break;
            case 'ArrowRight':
                navigate(1);
                break;
        }
    });

    // Add transition for fade effect
    lightboxImg.style.transition = 'opacity 0.2s ease';
}

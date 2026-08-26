# Kevin's Tattoo Studio — Website

A modern, dark-themed single-page portfolio website for a tattoo artist, built with plain HTML, CSS, and JavaScript.

## Features

- **Dark & Minimal Design** — Near-black palette with gold accents, editorial typography
- **Single-Page Scroll** — Smooth navigation between all sections
- **Gallery with Filters** — Masonry-style grid filterable by tattoo style (Traditional, Realism, Blackwork, Japanese, Geometric)
- **Lightbox Modal** — Full-screen image viewer with keyboard/swipe navigation
- **Testimonials Carousel** — Auto-advancing slider with touch support
- **Scroll Animations** — AOS (Animate on Scroll) library for entrance effects
- **Parallax Hero** — Subtle background movement on scroll
- **Stat Counter** — Animated number counters in the About section
- **Responsive Design** — Mobile-first, works on all screen sizes
- **Contact Form** — Client-side validation (no backend yet)

## Sections

1. Hero — Full-viewport intro with CTA
2. Gallery — Portfolio grid with category filters + lightbox
3. About — Artist bio, stats, specialties
4. Testimonials — Client reviews carousel
5. Social Feed — Instagram-style image grid
6. Contact — Form + studio info (address, hours, phone, email)
7. Footer — Links, newsletter signup, social icons

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Structure | HTML5 (semantic) |
| Styling | CSS3 (custom properties, Grid, Flexbox) |
| Interactivity | Vanilla JavaScript (ES6+) |
| Animations | [AOS](https://michalsnik.github.io/aos/) via CDN |
| Fonts | [Google Fonts](https://fonts.google.com/) (Cinzel + Inter) |
| Icons | [Font Awesome 6](https://fontawesome.com/) via CDN |
| Images | [Unsplash](https://unsplash.com/) (free, hotlinked) |

## Getting Started

```bash
# Clone and serve
cd kevin_tatto
python3 -m http.server 8080

# Open http://localhost:8080
```

No build tools or dependencies to install — just a web server.

## Project Structure

```
kevin_tatto/
├── index.html            # Single-page site
├── css/
│   ├── style.css         # Main stylesheet (dark theme, all sections)
│   ├── responsive.css    # Media queries (mobile, tablet, desktop)
│   └── animations.css    # Custom keyframes & transitions
├── js/
│   ├── main.js           # Nav, scroll, parallax, gallery filter, stats, form
│   ├── lightbox.js       # Image lightbox/modal
│   └── testimonials.js   # Carousel with auto-slide
├── images/               # Local assets (favicon, logo — future)
└── README.md
```

## Future Enhancements (Phase 2)

- **FastAPI Backend** — Python backend for dynamic features
- **Appointment Booking** — Date/time picker, service selection
- **Payment Integration** — Stripe for deposits
- **Portfolio CMS** — Admin panel to manage gallery (replace Unsplash placeholders)
- **Contact Form Backend** — Email notifications via SMTP
- **Google Maps** — Embedded interactive map
- **Instagram API** — Live feed integration

## License

All placeholder images are from [Unsplash](https://unsplash.com/) and used under the [Unsplash License](https://unsplash.com/license).

/* =====================================================================
   THE TAMIL WEDDING EXPERIENCE — animations.js
   GSAP 3 · ScrollTrigger · Lenis · Golden Particles · Custom Cursor
   ===================================================================== */
(function () {
  'use strict';

  const App = window.TamilWedding || {};
  const reducedMotion = Boolean(App.prefersReducedMotion);

  const introEl = document.getElementById('intro');
  const enterBtn = document.getElementById('enterBtn');
  const skipBtn = document.getElementById('skipIntro');
  const navEl = document.getElementById('nav');

  let lenis = null;
  let introDone = false;
  let introTl = null;
  let introParticlesCtrl = null;
  let closingParticlesCtrl = null;

  /* ---------- 1. Golden Dust Particles Engine ---------- */
  function createParticles(canvas, count, maxAlpha) {
    if (!canvas || reducedMotion) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let rafId = null;
    let running = false;

    const particles = [];

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width || window.innerWidth;
      height = rect.height || window.innerHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn(randomY) {
      return {
        x: Math.random() * width,
        y: randomY ? Math.random() * height : height + Math.random() * 40,
        r: 0.7 + Math.random() * 1.9,
        vy: 0.16 + Math.random() * 0.42,
        vx: (Math.random() - 0.5) * 0.22,
        phase: Math.random() * Math.PI * 2,
        alpha: (0.25 + Math.random() * 0.75) * maxAlpha
      };
    }

    resize();
    for (let i = 0; i < count; i++) particles.push(spawn(true));

    function tick(time) {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);
      const t = time * 0.001;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y -= p.vy;
        p.x += p.vx + Math.sin(t + p.phase) * 0.15;

        if (p.y < -12) {
          particles[i] = spawn(false);
          continue;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        const shimmer = 0.65 + 0.35 * Math.sin(t * 2 + p.phase);
        const a = p.alpha * shimmer;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 2.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(227, 194, 127, ${(a * 0.22).toFixed(3)})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 240, 200, ${a.toFixed(3)})`;
        ctx.fill();
      }

      rafId = requestAnimationFrame(tick);
    }

    window.addEventListener('resize', resize, { passive: true });

    return {
      start() {
        if (running) return;
        running = true;
        resize();
        rafId = requestAnimationFrame(tick);
      },
      stop() {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
      }
    };
  }

  /* ---------- 2. SVG Stroke Preparation Helper ---------- */
  function prepSvgStrokes(root) {
    if (!root) return [];
    const shapes = root.querySelectorAll('path, circle, rect, ellipse, polyline, polygon, line');
    const ready = [];
    shapes.forEach((node) => {
      if (typeof node.getTotalLength !== 'function') return;
      try {
        const len = Math.ceil(node.getTotalLength()) + 2;
        if (!len || !Number.isFinite(len)) return;
        // Preserve dashed lines cleanly by only dashing solid strokes
        if (!node.getAttribute('stroke-dasharray')) {
          node.style.strokeDasharray = `${len}`;
          node.style.strokeDashoffset = `${len}`;
          ready.push(node);
        }
      } catch (_) {
        // Element not rendered or invalid geometry
      }
    });
    return ready;
  }

  /* ---------- 3. Fallback if GSAP unavailable or Reduced Motion ---------- */
  function syncFallbackNav() {
    if (!navEl) return;
    navEl.classList.toggle('is-scrolled', (window.scrollY || 0) > 60);
  }

  function unlockWithoutAnimation() {
    document.body.classList.remove('is-locked');
    if (introEl) introEl.style.display = 'none';
    if (lenis) lenis.start();
    introDone = true;
    syncFallbackNav();
  }

  if (typeof window.gsap === 'undefined') {
    const inviteEl = document.getElementById('invite');
    const sceneEl = document.querySelector('.intro-scene');
    if (inviteEl) {
      inviteEl.style.visibility = 'visible';
      inviteEl.style.opacity = '1';
    }
    if (sceneEl) sceneEl.style.opacity = '0.24';
    if (enterBtn) enterBtn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('tamilwedding:enter'));
      unlockWithoutAnimation();
    });
    if (skipBtn) skipBtn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('tamilwedding:enter'));
      unlockWithoutAnimation();
    });
    if (!introEl) unlockWithoutAnimation();
    window.addEventListener('scroll', syncFallbackNav, { passive: true });
    syncFallbackNav();
    return;
  }

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ---------- 4. Lenis Smooth Scrolling + ScrollTrigger Sync ---------- */
  function initLenis() {
    if (reducedMotion || typeof window.Lenis === 'undefined') return;
    lenis = new window.Lenis({
      duration: 1.22,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.4
    });
    App.lenis = lenis;
    lenis.stop();

    if (ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
    }
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------- 5. Navbar Scroll Behavior ---------- */
  function initNavScroll() {
    if (!navEl) return;
    let lastY = window.scrollY || 0;

    function updateNav(y) {
      navEl.classList.toggle('is-scrolled', y > 60);

      const menuOpen = document.getElementById('menu')?.getAttribute('aria-hidden') === 'false';
      const focusedInside = navEl.contains(document.activeElement);
      if (y > window.innerHeight * 0.7 && y > lastY + 8 && !menuOpen && !focusedInside) {
        navEl.classList.add('is-hidden');
      } else if (y < lastY - 6 || y <= 100 || menuOpen) {
        navEl.classList.remove('is-hidden');
      }
      lastY = y;
    }

    if (lenis) {
      lenis.on('scroll', ({ scroll }) => updateNav(scroll));
    } else {
      window.addEventListener('scroll', () => updateNav(window.scrollY || 0), { passive: true });
    }
    updateNav(window.scrollY || 0);
  }

  /* ---------- 6. Hero Grand Reveal ---------- */
  let heroPlayed = false;
  function playHeroReveal() {
    if (heroPlayed) return;
    heroPlayed = true;

    const hero = document.querySelector('.hero');
    if (!hero) return;

    if (reducedMotion) return;

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.fromTo('.hero-media img',
      { scale: 1.12 },
      { scale: 1, duration: 2.2, ease: 'power2.out' },
      0
    )
    .fromTo('.hero-frame rect',
      { opacity: 0 },
      { opacity: 1, duration: 1.2 },
      0.15
    )
    .fromTo('.hero-corner',
      { opacity: 0, scale: 0.75 },
      { opacity: 1, scale: 1, duration: 0.9, stagger: 0.08 },
      0.25
    )
    .fromTo('.hero-eyebrow .split-inner',
      { yPercent: 120, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 0.85, stagger: 0.018 },
      0.2
    )
    .fromTo('.hero-name .line > span',
      { yPercent: 112 },
      { yPercent: 0, duration: 1.25, stagger: 0.14, ease: 'power4.out' },
      0.32
    )
    .fromTo('.hero-amp span',
      { yPercent: 120, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 1, ease: 'power3.out' },
      0.55
    )
    .fromTo('.hero-tamil',
      { y: 16, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9 },
      0.75
    )
    .fromTo('.hero-divider',
      { clipPath: 'inset(0 50% 0 50%)', opacity: 0 },
      { clipPath: 'inset(0 0% 0 0%)', opacity: 1, duration: 1, ease: 'power2.inOut' },
      0.85
    )
    .fromTo('.hero-meta p, .hero-meta-sep',
      { y: 18, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, stagger: 0.1 },
      0.95
    )
    .fromTo('.scroll-cue',
      { y: 16, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9 },
      1.15
    );
  }

  /* ---------- 7. Intro Closing Transition ---------- */
  function exitIntro() {
    if (introDone) return;
    introDone = true;

    window.dispatchEvent(new CustomEvent('tamilwedding:enter'));

    if (!introEl) {
      document.body.classList.remove('is-locked');
      if (lenis) lenis.start();
      playHeroReveal();
      return;
    }

    introEl.classList.add('is-leaving');

    if (reducedMotion) {
      unlockWithoutAnimation();
      playHeroReveal();
      return;
    }

    gsap.delayedCall(0.25, playHeroReveal);

    gsap.to(introEl, {
      autoAlpha: 0,
      scale: 1.04,
      duration: 1.05,
      ease: 'power3.inOut',
      onComplete: () => {
        if (introParticlesCtrl) introParticlesCtrl.stop();
        if (introTl) introTl.kill();
        introEl.style.display = 'none';
        document.body.classList.remove('is-locked');
        if (lenis) lenis.start();
        if (ScrollTrigger) ScrollTrigger.refresh();
      }
    });
  }

  /* ---------- 8. Cinematic Opening Timeline ---------- */
  function initIntro() {
    if (!introEl) {
      document.body.classList.remove('is-locked');
      if (lenis) lenis.start();
      playHeroReveal();
      return;
    }

    if (enterBtn) enterBtn.addEventListener('click', exitIntro);
    if (skipBtn) skipBtn.addEventListener('click', exitIntro);

    if (reducedMotion) {
      // Show invitation immediately without multi-stage doorway animation
      gsap.set('.intro-scene', { opacity: 0.22 });
      gsap.set('.doors', { opacity: 0 });
      gsap.set('.invite', { autoAlpha: 1 });
      if (skipBtn) skipBtn.style.display = 'none';
      return;
    }

    introParticlesCtrl = createParticles(document.querySelector('.intro-particles'), 46, 0.72);
    if (introParticlesCtrl) introParticlesCtrl.start();

    const frameLines = prepSvgStrokes(document.querySelector('.doorway-frame .frame-lines'));
    const kolamLines = prepSvgStrokes(document.querySelector('.intro-kolam'));
    const inviteOrnament = prepSvgStrokes(document.querySelector('.invite-ornament'));

    gsap.set('.intro-light', { scale: 0, opacity: 0 });
    gsap.set('.doorway-frame .frame-fill', { opacity: 0 });
    gsap.set('.lintel-dots circle, .thoranam *', { opacity: 0, scale: 0.7, transformOrigin: 'center' });
    gsap.set('.doors', { opacity: 0 });
    gsap.set('.doorway-inner-light', { opacity: 0 });
    gsap.set('.lamp', { opacity: 0 });
    gsap.set('.lamp-glow', { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' });
    gsap.set('.lamp .flame', { opacity: 0, scaleY: 0.2, transformOrigin: '50% 100%' });
    gsap.set('.intro-kolam .kolam-dot', { opacity: 0, scale: 0, transformOrigin: 'center' });
    gsap.set('.intro-particles', { opacity: 0 });

    gsap.set('.invite', { autoAlpha: 0 });
    gsap.set('.invite-sri', { y: 24, opacity: 0 });
    gsap.set('.invite-blessing .split-inner, .invite-name .split-inner, .invite-tamil .split-inner', { yPercent: 118 });
    gsap.set('.invite-amp', { opacity: 0, scale: 0.75 });
    gsap.set('.invite-divider', { clipPath: 'inset(0 50% 0 50%)', opacity: 0 });
    gsap.set('.invite-date, .invite-enter, .intro-sound', { y: 18, opacity: 0 });

    introTl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    // 1–2: Dark burgundy -> golden spark blooms at center
    introTl
      .to('.intro-light', { scale: 1.5, opacity: 1, duration: 0.9, ease: 'power2.out' }, 0.2)
      .to('.intro-light', { scale: 1.15, duration: 0.8, ease: 'sine.inOut' }, 1.1);

    // 3: Illustrated Tamil temple doorway reveals
    if (frameLines.length) {
      introTl.to(frameLines, {
        strokeDashoffset: 0,
        duration: 1.5,
        stagger: { amount: 0.65, from: 'center' },
        ease: 'power2.inOut'
      }, 0.65);
    }
    introTl
      .to('.doorway-frame .frame-fill', { opacity: 1, duration: 0.9 }, 1.15)
      .to('.lintel-dots circle, .thoranam *', { opacity: 1, scale: 1, duration: 0.7, stagger: 0.015 }, 1.4)
      .to('.doors', { opacity: 1, duration: 0.8 }, 1.25);

    // 4: Brass kuthu vilakku lamps illuminate on both sides
    introTl
      .to('.lamp', { opacity: 1, duration: 0.85 }, 1.45)
      .to('.lamp-glow', { opacity: 0.9, scale: 1, duration: 1.1, ease: 'power2.out' }, 1.7)
      .to('.lamp .flame', {
        opacity: 1,
        scaleY: 1,
        duration: 0.65,
        stagger: 0.06,
        onComplete: startFlameFlicker
      }, 1.8);

    // 5: Golden dust particles drift in
    introTl.to('.intro-particles', { opacity: 0.85, duration: 1.4 }, 1.75);

    // 6: Ornamental kolam draws itself
    if (kolamLines.length) {
      introTl.to(kolamLines, {
        strokeDashoffset: 0,
        duration: 1.7,
        stagger: { amount: 0.9, from: 'start' },
        ease: 'power2.inOut'
      }, 1.9);
    }
    introTl.to('.intro-kolam .kolam-dot', { opacity: 0.55, scale: 1, duration: 0.7, stagger: 0.012 }, 2.75);

    // 7: Temple doors swing open revealing warm sanctum radiance
    introTl
      .to('.doorway-inner-light', { opacity: 1, duration: 1.0 }, 3.2)
      .to('.door--left', { rotateY: -104, duration: 1.8, ease: 'power3.inOut' }, 3.35)
      .to('.door--right', { rotateY: 104, duration: 1.8, ease: 'power3.inOut' }, 3.35)
      .to('.intro-light', { scale: 5, opacity: 0, duration: 1.4, ease: 'power2.out' }, 3.45);

    // 8: Fade back architectural scene & unveil the invitation
    introTl
      .to('.intro-scene', { scale: 1.07, opacity: 0.18, duration: 1.5, ease: 'power2.inOut' }, 4.4)
      .set('.invite', { autoAlpha: 1 }, 4.55);

    if (inviteOrnament.length) {
      introTl.to(inviteOrnament, {
        strokeDashoffset: 0,
        duration: 1.1,
        stagger: 0.05,
        ease: 'power2.out'
      }, 4.65);
    }

    introTl
      .to('.invite-sri', { y: 0, opacity: 1, duration: 0.85 }, 4.75)
      .to('.invite-blessing .split-inner', { yPercent: 0, duration: 0.8, stagger: 0.045 }, 5.05)
      .to('.invite-name .split-inner', { yPercent: 0, duration: 0.95, stagger: 0.024, ease: 'power4.out' }, 5.25)
      .to('.invite-amp', { opacity: 1, scale: 1, duration: 0.8 }, 5.5)
      .to('.invite-tamil .split-inner', { yPercent: 0, duration: 0.85, stagger: 0.06 }, 5.7)
      .to('.invite-divider', { clipPath: 'inset(0 0% 0 0%)', opacity: 1, duration: 0.9, ease: 'power2.inOut' }, 5.95)
      .to(['.invite-date', '.invite-enter', '.intro-sound'], { y: 0, opacity: 1, duration: 0.8, stagger: 0.12 }, 6.15)
      .to(skipBtn, { opacity: 0, pointerEvents: 'none', duration: 0.5 }, 6.4);
  }

  function startFlameFlicker() {
    if (reducedMotion || introDone) return;
    document.querySelectorAll('.lamp .flame').forEach((flame, idx) => {
      gsap.to(flame, {
        scaleY: 0.88 + (idx % 3) * 0.09,
        scaleX: 0.94 + (idx % 2) * 0.08,
        opacity: 0.82,
        duration: 0.55 + (idx % 4) * 0.16,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: idx * 0.09
      });
    });
  }

  /* ---------- 9. ScrollTrigger Global System ---------- */
  function initScrollAnimations() {
    if (!ScrollTrigger || reducedMotion) return;

    // Hero background parallax
    gsap.to('.hero-media', {
      yPercent: 14,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: true
      }
    });

    // Generic split-text headings
    document.querySelectorAll('[data-reveal="split"]').forEach((heading) => {
      const chars = heading.querySelectorAll('.split-inner');
      if (!chars.length) return;
      gsap.fromTo(chars,
        { yPercent: 118, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.95,
          stagger: 0.04,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: heading,
            start: 'top 86%',
            once: true
          }
        }
      );
    });

    // Generic vertical clip reveals (Couple, Rituals, Venue)
    document.querySelectorAll('[data-reveal="clip"]').forEach((mask) => {
      const img = mask.querySelector('img');
      gsap.fromTo(mask,
        { clipPath: 'inset(100% 0 0 0)' },
        {
          clipPath: 'inset(0% 0 0 0)',
          duration: 1.25,
          ease: 'power3.inOut',
          scrollTrigger: {
            trigger: mask,
            start: 'top 84%',
            once: true
          }
        }
      );
      if (img) {
        gsap.fromTo(img,
          { scale: 1.1 },
          {
            scale: 1,
            duration: 1.4,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: mask,
              start: 'top 84%',
              once: true
            }
          }
        );
      }
    });

    // Subtle parallax on images with data-parallax
    document.querySelectorAll('[data-parallax]').forEach((el) => {
      const amount = Number(el.dataset.parallax) || 10;
      gsap.fromTo(el,
        { yPercent: -amount * 0.5 },
        {
          yPercent: amount * 0.5,
          ease: 'none',
          scrollTrigger: {
            trigger: el.closest('figure, section') || el,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true
          }
        }
      );
    });

    // Floating accent photographs in Couple section
    document.querySelectorAll('[data-speed]').forEach((el) => {
      const speed = Number(el.dataset.speed) || 10;
      gsap.fromTo(el,
        { y: -speed * 1.8 },
        {
          y: speed * 1.8,
          ease: 'none',
          scrollTrigger: {
            trigger: el.closest('.person') || el,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true
          }
        }
      );
    });

    // Draw SVG ornaments marked with [data-draw]
    document.querySelectorAll('[data-draw]').forEach((group) => {
      const paths = prepSvgStrokes(group);
      if (!paths.length) return;
      gsap.to(paths, {
        strokeDashoffset: 0,
        duration: 1.6,
        stagger: 0.08,
        ease: 'power2.inOut',
        scrollTrigger: {
          trigger: group.closest('svg') || group,
          start: 'top 85%',
          once: true
        }
      });
    });

    // Countdown entry reveal
    gsap.fromTo('.cd-unit, .cd-sep',
      { y: 28, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.9,
        stagger: 0.07,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.countdown-grid',
          start: 'top 82%',
          once: true
        }
      }
    );

    // Couple central motif gentle rotation on scroll
    gsap.to('.couple-motif svg', {
      rotation: 28,
      ease: 'none',
      scrollTrigger: {
        trigger: '.couple',
        start: 'top bottom',
        end: 'bottom top',
        scrub: true
      }
    });

    // Ritual index watermark subtle float
    document.querySelectorAll('.ritual-index').forEach((num) => {
      gsap.fromTo(num,
        { yPercent: -10 },
        {
          yPercent: 10,
          ease: 'none',
          scrollTrigger: {
            trigger: num.closest('.ritual'),
            start: 'top bottom',
            end: 'bottom top',
            scrub: true
          }
        }
      );
    });

    // Responsive ScrollTrigger setups via matchMedia
    const mm = gsap.matchMedia();

    // DESKTOP: Pinned Horizontal Story + Pinned Cultural Exhibition
    mm.add('(min-width: 1025px)', () => {
      // 1. Story Horizontal Track
      const storyPin = document.querySelector('.story-pin');
      const storyTrack = document.querySelector('.story-track');
      const progressBar = document.querySelector('.story-progress i');

      if (storyPin && storyTrack) {
        const getScrollAmount = () => Math.max(0, storyTrack.scrollWidth - window.innerWidth);

        const storyTween = gsap.to(storyTrack, {
          x: () => -getScrollAmount(),
          ease: 'none',
          scrollTrigger: {
            trigger: '.story',
            pin: storyPin,
            start: 'top top',
            end: () => '+=' + getScrollAmount(),
            scrub: 0.9,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              if (progressBar) {
                progressBar.style.transform = `scaleX(${self.progress.toFixed(4)})`;
              }
            }
          }
        });

        // Horizontal clip reveal for each chapter inside the horizontal track
        document.querySelectorAll('.chapter').forEach((chapter) => {
          const mask = chapter.querySelector('.chapter-mask');
          const leaf = chapter.querySelector('.chapter-leaf');
          if (mask) {
            gsap.fromTo(mask,
              { clipPath: 'inset(0 100% 0 0)' },
              {
                clipPath: 'inset(0 0% 0 0)',
                duration: 1.1,
                ease: 'power3.out',
                scrollTrigger: {
                  trigger: chapter,
                  containerAnimation: storyTween,
                  start: 'left 82%',
                  once: true
                }
              }
            );
          }
          if (leaf) {
            gsap.fromTo(leaf,
              { y: 28, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                duration: 0.9,
                ease: 'power3.out',
                scrollTrigger: {
                  trigger: chapter,
                  containerAnimation: storyTween,
                  start: 'left 75%',
                  once: true
                }
              }
            );
          }
        });
      }
    });

    // TABLET & MOBILE: Vertical Story Chapter Reveals
    mm.add('(max-width: 1024px)', () => {
      document.querySelectorAll('.chapter').forEach((chapter) => {
        const mask = chapter.querySelector('.chapter-mask');
        const leaf = chapter.querySelector('.chapter-leaf');
        if (mask) {
          gsap.fromTo(mask,
            { clipPath: 'inset(100% 0 0 0)' },
            {
              clipPath: 'inset(0% 0 0 0)',
              duration: 1.1,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: chapter,
                start: 'top 84%',
                once: true
              }
            }
          );
        }
        if (leaf) {
          gsap.fromTo(leaf,
            { y: 24, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.85,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: chapter,
                start: 'top 80%',
                once: true
              }
            }
          );
        }
      });
    });

    // Gallery staggered image clip-path + scale reveals
    const galleryItems = gsap.utils.toArray('.g-item');
    galleryItems.forEach((item, idx) => {
      const mask = item.querySelector('.g-mask');
      const img = item.querySelector('img');
      if (mask) {
        gsap.fromTo(mask,
          { clipPath: 'inset(100% 0 0 0)' },
          {
            clipPath: 'inset(0% 0 0 0)',
            duration: 1.15,
            delay: (idx % 3) * 0.08,
            ease: 'power3.inOut',
            scrollTrigger: {
              trigger: item,
              start: 'top 88%',
              once: true
            }
          }
        );
      }
      if (img) {
        gsap.fromTo(img,
          { scale: 1.14 },
          {
            scale: 1,
            duration: 1.35,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: item,
              start: 'top 88%',
              once: true
            }
          }
        );
      }
    });

    // Subtle desktop parallax offset inside gallery masonry
    mm.add('(min-width: 769px)', () => {
      ['.g-2', '.g-5', '.g-7', '.g-9'].forEach((sel, idx) => {
        const el = document.querySelector(sel);
        if (!el) return;
        gsap.fromTo(el,
          { y: idx % 2 === 0 ? 18 : -18 },
          {
            y: idx % 2 === 0 ? -18 : 18,
            ease: 'none',
            scrollTrigger: {
              trigger: el,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true
            }
          }
        );
      });
    });

    // Venue card subtle elevation
    gsap.fromTo('.venue-card',
      { y: 36, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.venue-card',
          start: 'top 85%',
          once: true
        }
      }
    );

    // Closing section emotional reveal
    gsap.fromTo('.closing-temple',
      { y: 40, opacity: 0.4 },
      {
        y: 0,
        opacity: 1,
        duration: 1.6,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '.closing',
          start: 'top 80%',
          once: true
        }
      }
    );

    gsap.fromTo('.closing-verse .line > span',
      { yPercent: 115 },
      {
        yPercent: 0,
        duration: 1.15,
        stagger: 0.16,
        ease: 'power4.out',
        scrollTrigger: {
          trigger: '.closing-verse',
          start: 'top 84%',
          once: true
        }
      }
    );

    gsap.fromTo('.closing-welcome .split-inner',
      { yPercent: 115, opacity: 0 },
      {
        yPercent: 0,
        opacity: 1,
        duration: 0.9,
        stagger: 0.06,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.closing-welcome',
          start: 'top 86%',
          once: true
        }
      }
    );

    gsap.fromTo('.closing-names, .closing-date, .closing-foot',
      { y: 20, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.95,
        stagger: 0.12,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.closing-names',
          start: 'top 88%',
          once: true
        }
      }
    );
  }

  /* ---------- 10. Closing Golden Particles Observer ---------- */
  function initClosingParticles() {
    const closingSection = document.querySelector('.closing');
    const canvas = document.querySelector('.closing-particles');
    if (!closingSection || !canvas || reducedMotion) return;

    closingParticlesCtrl = createParticles(canvas, 34, 0.6);
    if (!closingParticlesCtrl) return;

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) closingParticlesCtrl.start();
          else closingParticlesCtrl.stop();
        });
      }, { threshold: 0.05 });
      io.observe(closingSection);
    } else {
      closingParticlesCtrl.start();
    }
  }

  /* ---------- 11. Custom Desktop Cursor ---------- */
  function initCursor() {
    const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!hasFinePointer || reducedMotion) return;

    const cursor = document.querySelector('.cursor');
    const dot = document.querySelector('.cursor-dot');
    const ring = document.querySelector('.cursor-ring');
    const label = document.querySelector('.cursor-label');
    if (!cursor || !dot || !ring) return;

    document.body.classList.add('has-cursor');

    const moveDotX = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'power3.out' });
    const moveDotY = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'power3.out' });
    const moveRingX = gsap.quickTo(ring, 'x', { duration: 0.32, ease: 'power3.out' });
    const moveRingY = gsap.quickTo(ring, 'y', { duration: 0.32, ease: 'power3.out' });

    window.addEventListener('pointermove', (e) => {
      cursor.classList.remove('is-hidden');
      moveDotX(e.clientX);
      moveDotY(e.clientY);
      moveRingX(e.clientX);
      moveRingY(e.clientY);
    }, { passive: true });

    document.addEventListener('mouseleave', () => cursor.classList.add('is-hidden'));
    document.addEventListener('mouseenter', () => cursor.classList.remove('is-hidden'));

    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest('a, button, .g-btn');
      if (!target) {
        cursor.classList.remove('is-hover', 'is-view');
        if (label) label.textContent = '';
        return;
      }
      if (target.classList.contains('g-btn')) {
        cursor.classList.remove('is-hover');
        cursor.classList.add('is-view');
        if (label) label.textContent = 'VIEW';
      } else {
        cursor.classList.remove('is-view');
        cursor.classList.add('is-hover');
        if (label) label.textContent = '';
      }
    });
  }

  /* ---------- Boot ---------- */
  initLenis();
  initNavScroll();
  initIntro();
  initScrollAnimations();
  initClosingParticles();
  initCursor();
})();

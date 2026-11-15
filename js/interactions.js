/* =====================================================================
   THE TAMIL WEDDING EXPERIENCE — interactions.js
   Countdown · Calendar · Nav & Mobile Menu · Audio · Lightbox · Map
   ===================================================================== */
(function () {
  'use strict';

  const App = window.TamilWedding || {};
  const CONFIG = App.config || window.WEDDING_CONFIG;
  const reducedMotion = Boolean(App.prefersReducedMotion);
  const gsap = window.gsap;

  /* ---------- 1. Live Wedding Countdown ---------- */
  function initCountdown() {
    const grid = document.querySelector('[data-countdown]');
    if (!grid || !CONFIG?.date?.iso) return;

    const targetMs = new Date(CONFIG.date.iso).getTime();
    if (!Number.isFinite(targetMs)) return;

    const units = {};
    grid.querySelectorAll('.cd-value[data-unit]').forEach((el) => {
      const name = el.dataset.unit;
      const count = Number(el.dataset.digits) || 2;
      units[name] = { el, digits: [], prev: '' };
      ensureDigits(units[name], count);
    });

    function createDigitSlot() {
      const wrap = document.createElement('span');
      wrap.className = 'digit';

      const ghost = document.createElement('span');
      ghost.className = 'digit-ghost';
      ghost.setAttribute('aria-hidden', 'true');
      ghost.textContent = '0';

      const curr = document.createElement('span');
      curr.className = 'digit-face digit-face--curr';
      curr.textContent = '0';

      const next = document.createElement('span');
      next.className = 'digit-face digit-face--next';
      next.setAttribute('aria-hidden', 'true');
      next.textContent = '0';

      wrap.append(ghost, curr, next);
      return { wrap, curr, next };
    }

    function ensureDigits(unitObj, needed) {
      while (unitObj.digits.length < needed) {
        const slot = createDigitSlot();
        unitObj.digits.unshift(slot);
        unitObj.el.prepend(slot.wrap);
      }
      while (unitObj.digits.length > needed) {
        const removed = unitObj.digits.shift();
        removed.wrap.remove();
      }
    }

    function updateUnit(unitObj, str, animate) {
      const minDigits = Number(unitObj.el.dataset.digits) || 2;
      const padded = str.padStart(minDigits, '0');
      ensureDigits(unitObj, padded.length);

      for (let i = 0; i < padded.length; i++) {
        const ch = padded[i];
        const prevCh = unitObj.prev[i];
        const slot = unitObj.digits[i];
        if (ch === prevCh) continue;

        if (!animate || !gsap || reducedMotion || prevCh === undefined) {
          slot.curr.textContent = ch;
          gsap && gsap.set(slot.curr, { yPercent: 0, opacity: 1 });
          gsap && gsap.set(slot.next, { yPercent: 100, opacity: 0 });
        } else {
          slot.next.textContent = ch;
          gsap.killTweensOf([slot.curr, slot.next]);
          gsap.set(slot.next, { yPercent: 100, opacity: 0 });
          gsap.to(slot.curr, { yPercent: -100, opacity: 0, duration: 0.42, ease: 'power2.in' });
          gsap.to(slot.next, {
            yPercent: 0,
            opacity: 1,
            duration: 0.42,
            ease: 'power2.out',
            onComplete: () => {
              slot.curr.textContent = ch;
              gsap.set(slot.curr, { yPercent: 0, opacity: 1 });
              gsap.set(slot.next, { yPercent: 100, opacity: 0 });
            }
          });
        }
      }
      unitObj.prev = padded;
    }

    const srText = document.getElementById('countdownText');
    let lastMinute = -1;
    let firstRender = true;
    let timerId = null;

    function tick() {
      const diff = targetMs - Date.now();
      if (diff <= 0) {
        clearInterval(timerId);
        const done = document.createElement('p');
        done.className = 'countdown-done';
        done.innerHTML = 'Today is the day · <span lang="ta">இன்று திருமணம்</span>';
        grid.replaceWith(done);
        if (srText) srText.textContent = 'Today is the wedding day.';
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const animate = !firstRender;
      updateUnit(units.days, String(days), animate);
      updateUnit(units.hours, String(hours), animate);
      updateUnit(units.minutes, String(minutes), animate);
      updateUnit(units.seconds, String(seconds), animate);

      if (srText && minutes !== lastMinute) {
        lastMinute = minutes;
        srText.textContent = `${days} days, ${hours} hours, and ${minutes} minutes remaining until the Muhurtham.`;
      }
      firstRender = false;
    }

    tick();
    timerId = setInterval(tick, 1000);
  }

  /* ---------- 2. Add to Calendar (.ics) ---------- */
  function initCalendarDownload() {
    const btn = document.getElementById('addToCalendar');
    if (!btn || !CONFIG) return;

    function toIcsUtc(iso) {
      return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    }

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const start = toIcsUtc(CONFIG.date.iso);
      const end = toIcsUtc(CONFIG.date.endIso || CONFIG.date.iso);
      const summary = `${CONFIG.bride.name} & ${CONFIG.groom.name} — Tamil Wedding Muhurtham`;
      const location = `${CONFIG.venue.name}, ${CONFIG.venue.address}`;
      const description = `With the blessings of our families, join us for the Muhurtham of ${CONFIG.bride.name} and ${CONFIG.groom.name}.`;

      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Tamil Wedding Experience//EN',
        'BEGIN:VEVENT',
        `UID:tamil-wedding-${start}@celebration`,
        `DTSTAMP:${toIcsUtc(new Date().toISOString())}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${summary}`,
        `LOCATION:${location}`,
        `DESCRIPTION:${description}`,
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');

      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${CONFIG.bride.name}-${CONFIG.groom.name}-Wedding.ics`.replace(/\s+/g, '-');
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }

  /* ---------- 3. Navigation, Anchor Scrolling & Mobile Menu ---------- */
  function initNavigation() {
    const burger = document.querySelector('.nav-burger');
    const menu = document.getElementById('menu');
    const menuBg = menu?.querySelector('.menu-bg');
    const menuLinks = menu ? Array.from(menu.querySelectorAll('.menu-links a span')) : [];
    const menuFoot = menu?.querySelector('.menu-foot');
    let menuOpen = false;

    function scrollToHash(hash) {
      const target = document.querySelector(hash);
      if (!target) return;
      if (App.lenis && !reducedMotion) {
        App.lenis.scrollTo(target, { duration: 1.25 });
      } else {
        target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
      }
    }

    function openMenu() {
      if (!menu || !burger || menuOpen) return;
      menuOpen = true;
      burger.setAttribute('aria-expanded', 'true');
      burger.setAttribute('aria-label', 'Close menu');
      menu.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-locked');
      if (App.lenis) App.lenis.stop();

      if (gsap && !reducedMotion) {
        gsap.set(menu, { visibility: 'visible' });
        gsap.fromTo(menuBg,
          { clipPath: 'circle(0% at calc(100% - 44px) 40px)' },
          { clipPath: 'circle(155% at calc(100% - 44px) 40px)', duration: 0.75, ease: 'power3.inOut' }
        );
        gsap.fromTo(menuLinks,
          { yPercent: 115, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.7, stagger: 0.06, delay: 0.2, ease: 'power3.out' }
        );
        if (menuFoot) {
          gsap.fromTo(menuFoot, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, delay: 0.45 });
        }
      } else {
        menu.style.visibility = 'visible';
        if (menuBg) menuBg.style.clipPath = 'circle(155% at calc(100% - 44px) 40px)';
      }
    }

    function closeMenu(restoreFocus = false) {
      if (!menu || !burger || !menuOpen) return;
      menuOpen = false;
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Open menu');
      menu.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-locked');
      if (App.lenis) App.lenis.start();

      if (gsap && !reducedMotion) {
        gsap.to(menuBg, {
          clipPath: 'circle(0% at calc(100% - 44px) 40px)',
          duration: 0.55,
          ease: 'power3.inOut',
          onComplete: () => {
            if (!menuOpen) menu.style.visibility = 'hidden';
          }
        });
      } else {
        menu.style.visibility = 'hidden';
      }

      if (restoreFocus) burger.focus();
    }

    if (burger) {
      burger.addEventListener('click', () => {
        if (menuOpen) closeMenu(true);
        else openMenu();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuOpen) closeMenu(true);
    });

    // Smooth anchor navigation across nav, mobile menu, scroll cue, and footer
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        const href = anchor.getAttribute('href');
        if (!href || href === '#') return;
        const target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        if (menuOpen) closeMenu(false);
        scrollToHash(href);
      });
    });

    // Active nav section tracking
    const navAnchors = Array.from(document.querySelectorAll('.nav-links a[data-nav]'));
    const sections = navAnchors
      .map((a) => document.querySelector(a.getAttribute('href')))
      .filter(Boolean);

    if ('IntersectionObserver' in window && sections.length) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = `#${entry.target.id}`;
          navAnchors.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === id));
        });
      }, { rootMargin: '-38% 0px -52% 0px', threshold: 0 });
      sections.forEach((sec) => io.observe(sec));
    }
  }

  /* ---------- 4. Audio Experience (Background Track + Web Audio Fallback) ---------- */
  function initAudio() {
    const toggleBtn = document.getElementById('soundToggle');
    const toggleText = toggleBtn?.querySelector('.sound-text');
    const introSoundBtn = document.getElementById('introSound');
    const introSoundLabel = introSoundBtn?.querySelector('.intro-sound-label b');
    const audioEl = document.getElementById('weddingAudio');
    if (!toggleBtn || !audioEl) return;

    const SESSION_KEY = 'tamilWeddingMusic';
    let wantMusic = sessionStorage.getItem(SESSION_KEY) !== 'off';
    let isPlaying = false;
    let usingSynth = false;
    let synthCtrl = null;

    // Gentle Carnatic Raga (Hamsadhwani) + Tanpura ambient fallback if no MP3 is provided
    function createCarnaticFallback() {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;

      const ctx = new AudioCtx();
      const master = ctx.createGain();
      master.gain.value = 0.0001;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1100;
      filter.Q.value = 0.8;

      master.connect(filter);
      filter.connect(ctx.destination);

      // Soft Sa-Pa-Sa drone (D4 = 293.66Hz / A3 = 220Hz / D3 = 146.83Hz)
      const droneFreqs = [146.83, 220.0, 293.66];
      const drones = droneFreqs.map((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.value = freq;
        gain.gain.value = idx === 0 ? 0.14 : 0.08;
        osc.connect(gain);
        gain.connect(master);
        osc.start();
        return osc;
      });

      // Hamsadhwani pentatonic scale (S R2 G3 P N3 S): D4, E4, F#4, A4, C#5, D5
      const scale = [293.66, 329.63, 369.99, 440.0, 554.37, 587.33];
      const phrase = [0, 2, 3, 4, 5, 4, 3, 2, 1, 2, 0];
      let step = 0;
      let noteTimer = null;

      function playNextNote() {
        if (!isPlaying || !usingSynth) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(scale[phrase[step % phrase.length]], now);

        env.gain.setValueAtTime(0.0001, now);
        env.gain.exponentialRampToValueAtTime(0.085, now + 0.35);
        env.gain.exponentialRampToValueAtTime(0.0001, now + 2.1);

        osc.connect(env);
        env.connect(master);
        osc.start(now);
        osc.stop(now + 2.2);

        step += 1;
        noteTimer = setTimeout(playNextNote, 1850);
      }

      return {
        start() {
          if (ctx.state === 'suspended') ctx.resume();
          master.gain.cancelScheduledValues(ctx.currentTime);
          master.gain.setTargetAtTime(0.45, ctx.currentTime, 0.35);
          if (!noteTimer) playNextNote();
        },
        stop() {
          clearTimeout(noteTimer);
          noteTimer = null;
          master.gain.cancelScheduledValues(ctx.currentTime);
          master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.25);
        },
        dispose() {
          clearTimeout(noteTimer);
          drones.forEach((d) => { try { d.stop(); } catch (_) {} });
          ctx.close();
        }
      };
    }

    function syncUI() {
      toggleBtn.classList.toggle('is-playing', isPlaying);
      toggleBtn.setAttribute('aria-pressed', String(isPlaying));
      toggleBtn.setAttribute('aria-label', isPlaying ? 'Mute background music' : 'Play background music');
      if (toggleText) toggleText.textContent = isPlaying ? 'Playing' : 'Sound';

      if (introSoundBtn) {
        introSoundBtn.setAttribute('aria-pressed', String(wantMusic));
        if (introSoundLabel) introSoundLabel.textContent = wantMusic ? 'On' : 'Off';
      }
    }

    async function startPlayback() {
      wantMusic = true;
      sessionStorage.setItem(SESSION_KEY, 'on');

      if (!usingSynth) {
        try {
          if (CONFIG?.audio?.src && audioEl.querySelector('source')) {
            const srcNode = audioEl.querySelector('source');
            if (srcNode.getAttribute('src') !== CONFIG.audio.src) {
              srcNode.setAttribute('src', CONFIG.audio.src);
              audioEl.load();
            }
          }
          audioEl.volume = 0.65;
          await audioEl.play();
          isPlaying = true;
          syncUI();
          return;
        } catch (err) {
          if (err && (err.name === 'NotAllowedError' || err.name === 'AbortError')) {
            isPlaying = false;
            syncUI();
            return;
          }
          // Audio file missing or unplayable — fall back seamlessly to Carnatic synthesis
          usingSynth = true;
        }
      }

      if (!synthCtrl) synthCtrl = createCarnaticFallback();
      if (synthCtrl) {
        synthCtrl.start();
        isPlaying = true;
        syncUI();
        App.showToast && App.showToast('Playing ambient Carnatic accompaniment', 3500);
      } else {
        isPlaying = false;
        syncUI();
      }
    }

    function stopPlayback() {
      wantMusic = false;
      sessionStorage.setItem(SESSION_KEY, 'off');
      isPlaying = false;

      if (!audioEl.paused) audioEl.pause();
      if (synthCtrl) synthCtrl.stop();
      syncUI();
    }

    // Never autoplay on page load; reflect session preference on intro button only
    syncUI();

    if (introSoundBtn) {
      introSoundBtn.addEventListener('click', () => {
        wantMusic = !wantMusic;
        sessionStorage.setItem(SESSION_KEY, wantMusic ? 'on' : 'off');
        syncUI();
      });
    }

    // Start music on user click of "Enter the Celebration" if selected / remembered
    window.addEventListener('tamilwedding:enter', () => {
      if (wantMusic && !isPlaying) startPlayback();
    });

    toggleBtn.addEventListener('click', () => {
      if (isPlaying) stopPlayback();
      else startPlayback();
    });
  }

  /* ---------- 5. Gallery Lightbox ---------- */
  function initLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;

    const items = Array.from(document.querySelectorAll('.g-item')).map((item) => {
      const btn = item.querySelector('.g-btn');
      const img = item.querySelector('img');
      const cap = item.querySelector('figcaption');
      return {
        btn,
        src: img?.getAttribute('src') || '',
        alt: img?.getAttribute('alt') || '',
        title: cap?.textContent || ''
      };
    }).filter((entry) => entry.btn && entry.src);

    if (!items.length) return;

    const bg = lightbox.querySelector('.lightbox-bg');
    const imgEl = lightbox.querySelector('.lightbox-img');
    const titleEl = lightbox.querySelector('.lightbox-title');
    const countEl = lightbox.querySelector('.lightbox-count');
    const closeBtn = lightbox.querySelector('.lightbox-close');
    const prevBtn = lightbox.querySelector('.lightbox-prev');
    const nextBtn = lightbox.querySelector('.lightbox-next');

    let currentIdx = 0;
    let lastTrigger = null;
    let touchStartX = 0;

    function showSlide(index) {
      currentIdx = (index + items.length) % items.length;
      const item = items[currentIdx];
      imgEl.src = item.src;
      imgEl.alt = item.alt;
      titleEl.textContent = item.title;
      countEl.textContent = `${String(currentIdx + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
    }

    function open(index, triggerBtn) {
      lastTrigger = triggerBtn;
      showSlide(index);
      lightbox.hidden = false;
      requestAnimationFrame(() => lightbox.classList.add('is-open'));
      document.body.classList.add('is-locked');
      if (App.lenis) App.lenis.stop();
      closeBtn?.focus();
    }

    function close() {
      lightbox.classList.remove('is-open');
      document.body.classList.remove('is-locked');
      if (App.lenis) App.lenis.start();
      const finish = () => {
        lightbox.hidden = true;
        if (lastTrigger) lastTrigger.focus();
      };
      if (reducedMotion) finish();
      else setTimeout(finish, 360);
    }

    items.forEach((entry, idx) => {
      entry.btn.addEventListener('click', () => open(idx, entry.btn));
    });

    closeBtn?.addEventListener('click', close);
    bg?.addEventListener('click', close);
    prevBtn?.addEventListener('click', () => showSlide(currentIdx - 1));
    nextBtn?.addEventListener('click', () => showSlide(currentIdx + 1));

    document.addEventListener('keydown', (e) => {
      if (lightbox.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') showSlide(currentIdx - 1);
      else if (e.key === 'ArrowRight') showSlide(currentIdx + 1);
    });

    lightbox.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].clientX;
    }, { passive: true });
    lightbox.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 48) {
        if (dx > 0) showSlide(currentIdx - 1);
        else showSlide(currentIdx + 1);
      }
    }, { passive: true });
  }

  /* ---------- 7. Interactive Venue Map ---------- */
  function initVenueMap() {
    const btn = document.getElementById('loadMap');
    const frame = document.getElementById('venueMap');
    const wrap = btn?.closest('.venue-map');
    if (!btn || !frame || !wrap) return;

    btn.addEventListener('click', () => {
      const src = frame.dataset.src;
      if (!src) return;
      frame.src = src;
      wrap.classList.add('is-loaded');
    });
  }

  /* ---------- Boot ---------- */
  initCountdown();
  initCalendarDownload();
  initNavigation();
  initAudio();
  initLightbox();
  initVenueMap();
})();

/* =====================================================================
   THE TAMIL WEDDING EXPERIENCE — interactions.js
   Countdown · Calendar · Nav & Mobile Menu · Audio · Lightbox · Map · RSVP
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

  /* ---------- 4. Audio Experience (Nadaswaram + Web Audio Fallback) ---------- */
  function initAudio() {
    const toggleBtn = document.getElementById('soundToggle');
    const toggleText = toggleBtn?.querySelector('.sound-text');
    const introSoundBtn = document.getElementById('introSound');
    const introSoundLabel = introSoundBtn?.querySelector('.intro-sound-label b');
    const audioEl = document.getElementById('weddingAudio');
    if (!toggleBtn || !audioEl) return;

    const SESSION_KEY = 'tamilWeddingMusic';
    let wantMusic = sessionStorage.getItem(SESSION_KEY) === 'on';
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
      toggleBtn.setAttribute('aria-label', isPlaying ? 'Mute traditional music' : 'Play traditional music');
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
          await audioEl.play();
          isPlaying = true;
          syncUI();
          return;
        } catch (_) {
          // Audio file missing or unplayable — fall back seamlessly to Carnatic synthesis
          usingSynth = true;
        }
      }

      if (!synthCtrl) synthCtrl = createCarnaticFallback();
      if (synthCtrl) {
        synthCtrl.start();
        isPlaying = true;
        syncUI();
        App.showToast && App.showToast('Playing ambient Carnatic raga · Add assets/audio/nadaswaram.mp3 for your custom track', 4500);
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

  /* ---------- 5. Cultural Heritage Interactive Fallback (Tablet/Mobile + Click) ---------- */
  function initCultureInteractive() {
    const exhibits = Array.from(document.querySelectorAll('.exhibit'));
    if (!exhibits.length) return;

    const countEl = document.querySelector('.culture-count b');
    const barEl = document.querySelector('.culture-progress em');

    function setActive(index) {
      exhibits.forEach((el, i) => el.classList.toggle('is-active', i === index));
      if (countEl) countEl.textContent = String(index + 1).padStart(2, '0');
      if (barEl) barEl.style.transform = `scaleX(${((index + 1) / exhibits.length).toFixed(4)})`;
    }

    exhibits.forEach((ex, idx) => {
      const btn = ex.querySelector('.exhibit-name');
      if (!btn) return;
      btn.addEventListener('click', () => {
        // On desktop (>1024px) with ScrollTrigger pin, animations.js scrolls to the stop;
        // on <=1024px (or reduced motion), switch active exhibit directly.
        if (window.innerWidth <= 1024 || reducedMotion || typeof window.ScrollTrigger === 'undefined') {
          setActive(idx);
        }
      });
    });
  }

  /* ---------- 6. Gallery Lightbox ---------- */
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

  /* ---------- 8. RSVP Validation & Honest Submission ---------- */
  function initRsvp() {
    const form = document.getElementById('rsvpForm');
    if (!form) return;

    const nameInput = document.getElementById('guestName');
    const phoneInput = document.getElementById('guestPhone');
    const guestsField = document.getElementById('guestsField');
    const guestCount = document.getElementById('guestCount');
    const stepperBtns = Array.from(form.querySelectorAll('.stepper-btn'));
    const messageInput = document.getElementById('guestMessage');
    const msgCount = document.getElementById('msgCount');
    const statusEl = document.getElementById('formStatus');
    const submitBtn = form.querySelector('.rsvp-submit');

    const thanksBox = document.getElementById('rsvpThanks');
    const thanksMsg = document.getElementById('thanksMsg');
    const thanksNote = document.getElementById('thanksNote');
    const thanksWa = document.getElementById('thanksWhatsapp');
    const againBtn = document.getElementById('rsvpAgain');

    function setError(input, errId, msg) {
      const field = input?.closest('.field');
      const errEl = document.getElementById(errId);
      if (errEl) errEl.textContent = msg;
      if (field) field.classList.toggle('has-error', Boolean(msg));
      if (input && input.setAttribute) {
        input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      }
    }

    function updateGuestState() {
      const choice = form.querySelector('input[name="attending"]:checked')?.value;
      const disabled = choice === 'no';
      guestsField?.classList.toggle('is-disabled', disabled);
      if (guestCount) guestCount.disabled = disabled;
      stepperBtns.forEach((b) => { b.disabled = disabled; });
      if (disabled) setError(guestCount, 'guestCount-error', '');
    }

    form.querySelectorAll('input[name="attending"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        setError(radio, 'attending-error', '');
        updateGuestState();
      });
    });

    stepperBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!guestCount || guestCount.disabled) return;
        const delta = Number(btn.dataset.step) || 0;
        const curr = Number(guestCount.value) || 1;
        const next = Math.max(1, Math.min(10, curr + delta));
        guestCount.value = String(next);
        setError(guestCount, 'guestCount-error', '');
      });
    });

    guestCount?.addEventListener('input', () => setError(guestCount, 'guestCount-error', ''));
    nameInput?.addEventListener('input', () => setError(nameInput, 'guestName-error', ''));
    phoneInput?.addEventListener('input', () => setError(phoneInput, 'guestPhone-error', ''));

    if (messageInput && msgCount) {
      messageInput.addEventListener('input', () => {
        msgCount.textContent = String(messageInput.value.length);
      });
    }

    function validate() {
      let firstInvalid = null;
      const nameVal = (nameInput?.value || '').trim();
      const phoneVal = (phoneInput?.value || '').trim();
      const attending = form.querySelector('input[name="attending"]:checked');
      const guestsVal = Number(guestCount?.value);

      if (nameVal.length < 2) {
        setError(nameInput, 'guestName-error', 'Please enter your full name.');
        firstInvalid = firstInvalid || nameInput;
      } else {
        setError(nameInput, 'guestName-error', '');
      }

      if (phoneVal) {
        const digits = phoneVal.replace(/[^\d]/g, '');
        if (digits.length < 7 || digits.length > 15) {
          setError(phoneInput, 'guestPhone-error', 'Please enter a valid phone number, or leave it blank.');
          firstInvalid = firstInvalid || phoneInput;
        } else {
          setError(phoneInput, 'guestPhone-error', '');
        }
      } else {
        setError(phoneInput, 'guestPhone-error', '');
      }

      if (!attending) {
        setError(form.querySelector('input[name="attending"]'), 'attending-error', 'Please let us know if you can attend.');
        firstInvalid = firstInvalid || form.querySelector('input[name="attending"]');
      } else {
        setError(attending, 'attending-error', '');
      }

      if (attending?.value === 'yes') {
        if (!Number.isInteger(guestsVal) || guestsVal < 1 || guestsVal > 10) {
          setError(guestCount, 'guestCount-error', 'Please choose between 1 and 10 guests.');
          firstInvalid = firstInvalid || guestCount;
        } else {
          setError(guestCount, 'guestCount-error', '');
        }
      }

      if (firstInvalid) {
        firstInvalid.focus();
        return null;
      }

      return {
        name: nameVal,
        phone: phoneVal,
        attending: attending.value,
        guests: attending.value === 'yes' ? guestsVal : 0,
        message: (messageInput?.value || '').trim(),
        submittedAt: new Date().toISOString()
      };
    }

    function showConfirmation(payload, storedOnline) {
      form.hidden = true;
      thanksBox.hidden = false;

      if (payload.attending === 'yes') {
        const guestWord = payload.guests === 1 ? '1 guest' : `${payload.guests} guests`;
        thanksMsg.textContent = `We cannot wait to celebrate with you, ${payload.name} (${guestWord}).`;
      } else {
        thanksMsg.textContent = `Thank you for letting us know, ${payload.name}. We will miss you and hold your warm wishes close.`;
      }

      if (storedOnline) {
        thanksNote.textContent = 'Your RSVP has been recorded. Thank you for responding.';
      } else {
        thanksNote.textContent = 'Note: No Google Sheets or backend endpoint is configured in js/main.js yet, so this response was validated in your browser and not stored online.';
      }

      if (CONFIG?.rsvp?.whatsapp && thanksWa) {
        const waDigits = CONFIG.rsvp.whatsapp.replace(/[^\d]/g, '');
        if (waDigits) {
          const text = [
            `RSVP — ${CONFIG.bride.name} & ${CONFIG.groom.name}`,
            `Name: ${payload.name}`,
            `Attending: ${payload.attending === 'yes' ? `Yes (${payload.guests})` : 'Regretfully unable to attend'}`,
            payload.message ? `Message: ${payload.message}` : ''
          ].filter(Boolean).join('\n');
          thanksWa.href = `https://wa.me/${waDigits}?text=${encodeURIComponent(text)}`;
          thanksWa.hidden = false;
        }
      } else if (thanksWa) {
        thanksWa.hidden = true;
      }

      if (gsap && !reducedMotion) {
        gsap.fromTo(thanksBox,
          { y: 18, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.85, ease: 'power3.out' }
        );
      }
      thanksBox.focus();
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (statusEl) {
        statusEl.textContent = '';
        statusEl.classList.remove('is-error');
      }

      // Honeypot check
      if (form.website && form.website.value) return;

      const payload = validate();
      if (!payload) return;

      const endpoint = (CONFIG?.rsvp?.endpoint || '').trim();
      if (!endpoint) {
        showConfirmation(payload, false);
        return;
      }

      try {
        if (submitBtn) submitBtn.disabled = true;
        if (statusEl) statusEl.textContent = 'Sending your response…';

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        showConfirmation(payload, true);
      } catch (_) {
        if (statusEl) {
          statusEl.textContent = 'Unable to reach the RSVP service right now. Please try again shortly.';
          statusEl.classList.add('is-error');
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });

    againBtn?.addEventListener('click', () => {
      form.reset();
      if (msgCount) msgCount.textContent = '0';
      if (statusEl) {
        statusEl.textContent = '';
        statusEl.classList.remove('is-error');
      }
      updateGuestState();
      thanksBox.hidden = true;
      form.hidden = false;
      nameInput?.focus();
    });
  }

  /* ---------- Boot ---------- */
  initCountdown();
  initCalendarDownload();
  initNavigation();
  initAudio();
  initCultureInteractive();
  initLightbox();
  initVenueMap();
  initRsvp();
})();

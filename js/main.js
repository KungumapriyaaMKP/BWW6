/* =====================================================================
   THE TAMIL WEDDING EXPERIENCE — main.js
   Editable wedding data · DOM binding · SVG craft · custom text split
   ===================================================================== */
(function () {
  'use strict';

  /**
   * ✏️ EDITABLE WEDDING CONFIGURATION
   * Update names, dates, venues, rituals, RSVP backend URL and audio here.
   * All bound elements across the page update automatically.
   */
  const WEDDING_CONFIG = {
    bride: {
      name: 'Meenakshi',
      initial: 'M',
      tamil: 'மீனாட்சி',
      parents: 'Daughter of Mrs. Lakshmi & Mr. R. Sundaram',
      bio: 'A Bharatanatyam dancer and architect who sketches temple gopurams on every napkin. She believes filter coffee should be strong, kolams should be symmetrical, and love should feel like home.'
    },
    groom: {
      name: 'Arjun',
      initial: 'A',
      tamil: 'அர்ஜுன்',
      parents: 'Son of Mrs. Kamala & Mr. S. Raghavan',
      bio: 'A marine engineer, mridangam enthusiast and self-appointed biryani critic. He has crossed oceans for work, but says the bravest journey was asking her father for a cup of coffee.'
    },
    date: {
      // ISO 8601 timestamp with IST (+05:30) offset for the live countdown & calendar invite
      iso: '2027-02-12T07:30:00+05:30',
      endIso: '2027-02-12T09:00:00+05:30',
      display: 'Friday · 12 February 2027',
      time: '7:30 – 9:00 AM'
    },
    venue: {
      short: 'Sri Lakshmi Vilas Palace, Karaikudi',
      name: 'Sri Lakshmi Vilas Palace',
      address: 'Chettinad Heritage Road, Kanadukathan, Karaikudi, Tamil Nadu 630103',
      mapQuery: 'Kanadukathan Chettinad Palace Karaikudi Tamil Nadu 630103'
    },
    events: [
      {
        title: 'Nichayathartham',
        date: 'Saturday, 9 January 2027',
        time: '6:00 PM onwards',
        venue: "Sundaram Illam (Bride's Residence)",
        address: '14, Kamarajar Salai, Karaikudi, Tamil Nadu 630001',
        mapQuery: 'Kamarajar Salai Karaikudi Tamil Nadu 630001'
      },
      {
        title: 'Sumangali Prarthanai',
        date: 'Wednesday, 10 February 2027',
        time: '11:00 AM',
        venue: "Sundaram Illam (Bride's Residence)",
        address: '14, Kamarajar Salai, Karaikudi, Tamil Nadu 630001',
        mapQuery: 'Kamarajar Salai Karaikudi Tamil Nadu 630001'
      },
      {
        title: 'Muhurtham',
        date: 'Friday, 12 February 2027',
        time: '7:30 AM – 9:00 AM',
        venue: 'Sri Lakshmi Vilas Palace',
        address: 'Chettinad Heritage Road, Kanadukathan, Karaikudi, Tamil Nadu 630103',
        mapQuery: 'Kanadukathan Chettinad Palace Karaikudi Tamil Nadu 630103'
      },
      {
        title: 'Reception',
        date: 'Friday, 12 February 2027',
        time: '7:00 PM onwards',
        venue: 'The Durbar Courtyard, Sri Lakshmi Vilas Palace',
        address: 'Chettinad Heritage Road, Kanadukathan, Karaikudi, Tamil Nadu 630103',
        mapQuery: 'Kanadukathan Chettinad Palace Karaikudi Tamil Nadu 630103'
      }
    ],
    rsvp: {
      deadline: '25 January 2027',
      /**
       * To store RSVPs in Google Sheets or a custom backend:
       * Deploy a Google Apps Script Web App (doPost) or Formspree endpoint
       * and paste its URL below. Leave empty ('') for preview mode.
       */
      endpoint: '',
      // Optional WhatsApp number with country code (digits only, e.g. '919876543210')
      whatsapp: ''
    },
    audio: {
      src: 'assets/audio/nadaswaram.mp3'
    }
  };

  window.WEDDING_CONFIG = WEDDING_CONFIG;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function svgEl(tag, attrs) {
    const node = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, String(v)));
    }
    return node;
  }

  function resolvePath(obj, path) {
    return path.split('.').reduce((acc, part) => (acc != null ? acc[part] : undefined), obj);
  }

  /* ---------- 1. Data Binding ---------- */
  function bindWeddingData() {
    document.querySelectorAll('[data-bind]').forEach((el) => {
      const val = resolvePath(WEDDING_CONFIG, el.dataset.bind);
      if (val !== undefined && val !== null) {
        el.textContent = String(val);
      }
    });

    // Update page title and logo label
    const coupleNames = `${WEDDING_CONFIG.bride.name} & ${WEDDING_CONFIG.groom.name}`;
    document.title = `${coupleNames} · A Timeless Tamil Love Story · ${WEDDING_CONFIG.date.display.replace(/^[^·]+·\s*/, '')}`;
    const navLogo = document.querySelector('.nav-logo');
    if (navLogo) {
      navLogo.setAttribute('aria-label', `${WEDDING_CONFIG.bride.name} and ${WEDDING_CONFIG.groom.name} — home`);
    }

    // Bind Google Maps direction links
    document.querySelectorAll('[data-map]').forEach((link) => {
      const key = link.dataset.map;
      let query = WEDDING_CONFIG.venue.mapQuery || WEDDING_CONFIG.venue.address;
      if (key !== 'venue') {
        const idx = Number(key);
        const ev = WEDDING_CONFIG.events[idx];
        if (ev) query = ev.mapQuery || `${ev.venue} ${ev.address}`;
      }
      link.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    });

    // Bind lazy-load embed URL
    const mapFrame = document.getElementById('venueMap');
    if (mapFrame) {
      const q = WEDDING_CONFIG.venue.mapQuery || `${WEDDING_CONFIG.venue.name}, ${WEDDING_CONFIG.venue.address}`;
      mapFrame.dataset.src = `https://maps.google.com/maps?q=${encodeURIComponent(q)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    }
  }

  /* ---------- 2. Procedural Kolam Generator ---------- */
  function polar(r, deg) {
    const rad = (deg * Math.PI) / 180;
    return [+(r * Math.cos(rad)).toFixed(2), +(r * Math.sin(rad)).toFixed(2)];
  }

  function buildKolam(svg) {
    if (!svg) return;
    const frag = document.createDocumentFragment();

    // Concentric guide circles
    [34, 72, 134, 198, 252, 276].forEach((r, idx) => {
      const c = svgEl('circle', {
        cx: 0, cy: 0, r,
        class: 'kolam-line'
      });
      if (idx === 1 || idx === 4) c.setAttribute('stroke-dasharray', '3 6');
      frag.appendChild(c);
    });

    // Interlaced 8-fold sikku squares (two rotated octagrams)
    [0, 45].forEach((offset) => {
      let d = '';
      for (let i = 0; i < 4; i++) {
        const [x, y] = polar(196, i * 90 + offset);
        d += `${i === 0 ? 'M' : 'L'}${x} ${y} `;
      }
      frag.appendChild(svgEl('path', { d: d + 'Z', class: 'kolam-line' }));
    });

    // 8 inner lotus petals
    for (let i = 0; i < 8; i++) {
      const a = i * 45;
      const [sx, sy] = polar(34, a - 16);
      const [ex, ey] = polar(34, a + 16);
      const [c1x, c1y] = polar(92, a - 22);
      const [tx, ty] = polar(128, a);
      const [c2x, c2y] = polar(92, a + 22);
      const d = `M${sx} ${sy} Q${c1x} ${c1y} ${tx} ${ty} Q${c2x} ${c2y} ${ex} ${ey}`;
      frag.appendChild(svgEl('path', { d, class: 'kolam-line' }));
    }

    // 16 outer lotus petals + pulli dots
    for (let i = 0; i < 16; i++) {
      const a = i * 22.5;
      const [sx, sy] = polar(134, a - 10);
      const [ex, ey] = polar(134, a + 10);
      const [cx, cy] = polar(248, a);
      const d = `M${sx} ${sy} Q${cx} ${cy} ${ex} ${ey}`;
      frag.appendChild(svgEl('path', { d, class: 'kolam-line' }));

      // Pulli dots on outer ring & mid ring
      const [dx1, dy1] = polar(264, a);
      frag.appendChild(svgEl('circle', { cx: dx1, cy: dy1, r: 2.3, class: 'kolam-dot' }));

      if (i % 2 === 0) {
        const [dx2, dy2] = polar(94, a + 22.5);
        frag.appendChild(svgEl('circle', { cx: dx2, cy: dy2, r: 2.8, class: 'kolam-dot' }));
        const [dx3, dy3] = polar(164, a);
        frag.appendChild(svgEl('circle', { cx: dx3, cy: dy3, r: 2.4, class: 'kolam-dot' }));
      }
    }

    // Center bindu
    frag.appendChild(svgEl('circle', { cx: 0, cy: 0, r: 5, class: 'kolam-dot' }));
    svg.appendChild(frag);
  }

  /* ---------- 3. Doorway Lintel & Thoranam Garland ---------- */
  function buildDoorwayDetails() {
    const lintelDots = document.querySelector('.doorway-frame .lintel-dots');
    if (lintelDots) {
      for (let x = 78; x <= 322; x += 14) {
        const isCenter = Math.abs(x - 200) < 8;
        lintelDots.appendChild(svgEl('circle', {
          cx: x, cy: 221, r: isCenter ? 3.2 : 1.9
        }));
      }
    }

    const thoranam = document.querySelector('.doorway-frame .thoranam');
    if (thoranam) {
      // Quadratic bezier along M122 238 Q200 252 278 238
      const steps = 13;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const omt = 1 - t;
        const x = omt * omt * 122 + 2 * omt * t * 200 + t * t * 278;
        const y = omt * omt * 238 + 2 * omt * t * 252 + t * t * 238;
        const tilt = (t - 0.5) * -14;

        // Mango leaf
        const leaf = svgEl('path', {
          d: `M${x.toFixed(1)} ${y.toFixed(1)} c-3.5 7 -3.5 16 0 22 c3.5 -6 3.5 -15 0 -22 Z`,
          transform: `rotate(${tilt.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})`
        });
        thoranam.appendChild(leaf);

        // Alternating golden/marigold flower bead between leaves
        if (i < steps) {
          const mt = (i + 0.5) / steps;
          const momt = 1 - mt;
          const fx = momt * momt * 122 + 2 * momt * mt * 200 + mt * mt * 278;
          const fy = momt * momt * 238 + 2 * momt * mt * 252 + mt * mt * 238;
          thoranam.appendChild(svgEl('circle', {
            cx: fx.toFixed(1),
            cy: (fy + 4.5).toFixed(1),
            r: i % 2 === 0 ? 2.6 : 2.1,
            fill: i % 2 === 0 ? '#e3a83b' : '#f5ebdd',
            stroke: '#8a6a2f',
            'stroke-width': '0.5'
          }));
        }
      }
    }
  }

  /* ---------- 4. Closing Mandala & Temple Gopuram Illustration ---------- */
  function buildClosingScene() {
    const mandala = document.querySelector('.closing-mandala');
    if (mandala) {
      const g = svgEl('g', {
        fill: 'none',
        stroke: 'url(#gold)',
        'stroke-width': '1',
        'stroke-linecap': 'round',
        'data-draw': ''
      });
      g.appendChild(svgEl('circle', { cx: 0, cy: 0, r: 90 }));
      g.appendChild(svgEl('circle', { cx: 0, cy: 0, r: 80, 'stroke-dasharray': '2 5' }));
      g.appendChild(svgEl('circle', { cx: 0, cy: 0, r: 22 }));
      for (let i = 0; i < 12; i++) {
        const a = i * 30;
        const [sx, sy] = polar(22, a - 12);
        const [ex, ey] = polar(22, a + 12);
        const [tx, ty] = polar(76, a);
        g.appendChild(svgEl('path', { d: `M${sx} ${sy} Q${tx} ${ty} ${ex} ${ey}` }));
      }
      g.appendChild(svgEl('circle', { cx: 0, cy: 0, r: 4, fill: '#E3C27F', stroke: 'none' }));
      mandala.appendChild(g);
    }

    const temple = document.querySelector('.closing-temple');
    if (temple) {
      const frag = document.createDocumentFragment();

      // Atmospheric hills / distant shrine silhouettes
      frag.appendChild(svgEl('path', {
        d: 'M0 700 L0 560 Q180 510 340 555 Q460 580 600 540 Q760 510 920 555 Q1060 585 1200 545 L1200 700 Z',
        fill: '#23070b',
        opacity: '0.55'
      }));

      // Central Rajagopuram silhouette + golden rim linework
      const gopuramGroup = svgEl('g', { fill: '#1a0508', stroke: 'rgba(196,154,80,0.35)', 'stroke-width': '1' });
      // Base gateway wall
      gopuramGroup.appendChild(svgEl('rect', { x: 430, y: 470, width: 340, height: 230 }));
      // Inner sanctuary arch cutout lit with warm golden glow
      gopuramGroup.appendChild(svgEl('path', {
        d: 'M565 700 L565 550 Q600 505 635 550 L635 700 Z',
        fill: 'url(#glowGrad)',
        stroke: 'rgba(227,194,127,0.65)',
        'stroke-width': '1.2'
      }));

      // 7 stepped Gopuram tiers rising upward
      const tiers = [
        [446, 434, 308, 36],
        [462, 400, 276, 34],
        [478, 368, 244, 32],
        [494, 338, 212, 30],
        [510, 310, 180, 28],
        [526, 284, 148, 26],
        [542, 260, 116, 24]
      ];
      tiers.forEach(([x, y, w, h]) => {
        const path = `M${x - 8} ${y + h} L${x} ${y} L${x + w} ${y} L${x + w + 8} ${y + h} Z`;
        gopuramGroup.appendChild(svgEl('path', { d: path }));
        // Subtle niche windows on each tier
        for (let nx = x + 22; nx < x + w - 18; nx += 28) {
          gopuramGroup.appendChild(svgEl('path', {
            d: `M${nx} ${y + h - 3} V${y + 9} Q${nx + 5} ${y + 3} ${nx + 10} ${y + 9} V${y + h - 3}`,
            fill: 'none',
            stroke: 'rgba(227,194,127,0.28)',
            'stroke-width': '0.9'
          }));
        }
      });

      // Barrel-vaulted crown (Sala Shikhara) & 5 golden Kalasams
      gopuramGroup.appendChild(svgEl('path', {
        d: 'M540 260 Q540 218 600 218 Q660 218 660 260 Z',
        fill: '#1a0508',
        stroke: 'rgba(227,194,127,0.48)'
      }));
      [560, 580, 600, 620, 640].forEach((kx, idx) => {
        const kh = idx === 2 ? 24 : 18;
        gopuramGroup.appendChild(svgEl('path', {
          d: `M${kx - 3.5} 218 Q${kx} ${218 - kh} ${kx + 3.5} 218 Z`,
          fill: '#C49A50',
          stroke: 'none'
        }));
      });

      // Flanking Dravidian mandapam colonnades
      const pillars = [70, 145, 220, 295, 370, 830, 905, 980, 1055, 1130];
      pillars.forEach((px) => {
        gopuramGroup.appendChild(svgEl('rect', { x: px - 12, y: 500, width: 24, height: 200 }));
        gopuramGroup.appendChild(svgEl('rect', { x: px - 18, y: 490, width: 36, height: 12 }));
      });
      gopuramGroup.appendChild(svgEl('rect', { x: 0, y: 472, width: 430, height: 18 }));
      gopuramGroup.appendChild(svgEl('rect', { x: 770, y: 472, width: 430, height: 18 }));

      frag.appendChild(gopuramGroup);

      // Foreground courtyard stone steps & glowing oil lamps (agal vilakku)
      frag.appendChild(svgEl('rect', { x: 0, y: 658, width: 1200, height: 42, fill: '#140305' }));
      frag.appendChild(svgEl('line', { x1: 0, y1: 658, x2: 1200, y2: 658, stroke: 'rgba(196,154,80,0.4)', 'stroke-width': '1' }));

      const lampPositions = [110, 230, 355, 470, 600, 730, 845, 970, 1090];
      lampPositions.forEach((lx) => {
        const ly = 656;
        // Soft light pool
        frag.appendChild(svgEl('circle', {
          cx: lx, cy: ly - 16, r: 44,
          fill: 'url(#glowGrad)',
          opacity: '0.65'
        }));
        // Brass lamp base
        frag.appendChild(svgEl('path', {
          d: `M${lx - 13} ${ly - 6} Q${lx} ${ly + 3} ${lx + 13} ${ly - 6} L${lx + 9} ${ly} H${lx - 9} Z`,
          fill: '#C49A50'
        }));
        // Flame
        frag.appendChild(svgEl('path', {
          d: `M${lx} ${ly - 7} C${lx + 5} ${ly - 13} ${lx + 3} ${ly - 20} ${lx} ${ly - 28} C${lx - 3} ${ly - 20} ${lx - 5} ${ly - 13} ${lx} ${ly - 7} Z`,
          fill: 'url(#flameGrad)',
          class: 'closing-lamp-flame'
        }));
      });

      temple.appendChild(frag);
    }
  }

  /* ---------- 5. Custom Text Splitting ---------- */
  function containsTamil(text) {
    return /[\u0B80-\u0BFF]/.test(text);
  }

  function splitElement(el, mode) {
    if (!el || el.dataset.splitDone) return;
    const raw = el.textContent.replace(/\s+/g, ' ').trim();
    if (!raw) return;

    const isTamil = el.getAttribute('lang') === 'ta' || Boolean(el.closest('[lang="ta"]')) || containsTamil(raw);
    const effectiveMode = isTamil ? 'words' : (mode === 'chars' ? 'chars' : 'words');

    el.setAttribute('aria-label', raw);
    el.dataset.splitDone = effectiveMode;
    el.textContent = '';

    const frag = document.createDocumentFragment();
    const words = raw.split(' ');

    words.forEach((word, wIdx) => {
      const wordGroup = document.createElement('span');
      wordGroup.style.display = 'inline-block';
      wordGroup.style.whiteSpace = 'nowrap';
      wordGroup.setAttribute('aria-hidden', 'true');

      if (effectiveMode === 'chars') {
        Array.from(word).forEach((ch) => {
          const clip = document.createElement('span');
          clip.className = 'split-clip';
          const inner = document.createElement('span');
          inner.className = 'split-inner';
          inner.textContent = ch;
          clip.appendChild(inner);
          wordGroup.appendChild(clip);
        });
      } else {
        const clip = document.createElement('span');
        clip.className = 'split-clip';
        const inner = document.createElement('span');
        inner.className = 'split-inner';
        inner.textContent = word;
        clip.appendChild(inner);
        wordGroup.appendChild(clip);
      }

      frag.appendChild(wordGroup);
      if (wIdx < words.length - 1) {
        frag.appendChild(document.createTextNode(' '));
      }
    });

    el.appendChild(frag);
  }

  function splitTextElements() {
    if (prefersReducedMotion) return;

    document.querySelectorAll('[data-split]').forEach((el) => {
      splitElement(el, el.dataset.split);
    });
    document.querySelectorAll('[data-reveal="split"]').forEach((el) => {
      splitElement(el, 'words');
    });
  }

  /* ---------- 6. Toast Helper ---------- */
  let toastTimer = null;
  function showToast(message, duration = 3800) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('is-visible');
    }, duration);
  }

  /* ---------- Export Shared Namespace ---------- */
  window.TamilWedding = {
    config: WEDDING_CONFIG,
    prefersReducedMotion,
    lenis: null,
    showToast
  };

  /* ---------- Boot ---------- */
  bindWeddingData();
  buildKolam(document.querySelector('.intro-kolam'));
  buildKolam(document.querySelector('.menu-kolam'));
  buildDoorwayDetails();
  buildClosingScene();
  splitTextElements();
})();

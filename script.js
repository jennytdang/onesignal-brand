// ── Hero Pixel Cursor Trail ───────────────────
// Spawns glowing pixel squares that follow the cursor and fade out.
// Grid lines stay as static background, trail is a separate canvas on top.

(function () {
  const hero = document.getElementById('hero');
  const gridEl = document.getElementById('hero-grid');
  if (!hero || !gridEl) return;

  gridEl.innerHTML = '';

  // Trail canvas only — no grid lines
  const trailCanvas = document.createElement('canvas');
  trailCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;mix-blend-mode:screen;';
  gridEl.appendChild(trailCanvas);
  const tctx = trailCanvas.getContext('2d');

  const CELL        = 40;
  const TRAIL_LIFE  = 55;
  const SPAWN_DIST  = 12;
  const MAX_PIXELS  = 120;
  const COLORS      = [
    [255, 255, 255],
    [255, 255, 255],
    [255, 255, 255],
    [77,  166, 239],  // Blue 400
    [49,  225, 222],  // Cyan 300
    [255, 192, 114],  // Yellow 300
  ];

  let W = 0, H = 0, dpr = 1;
  let particles = [];
  let lastX = -1, lastY = -1, distAccum = 0;
  let rafId = null;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = hero.offsetWidth;
    H = hero.offsetHeight;
    trailCanvas.width  = Math.round(W * dpr);
    trailCanvas.height = Math.round(H * dpr);
    trailCanvas.style.width  = W + 'px';
    trailCanvas.style.height = H + 'px';
  }

  function spawnPixel(x, y) {
    // Snap to nearest grid cell
    const col = Math.round(x / CELL) * CELL;
    const row = Math.round(y / CELL) * CELL;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    // Don't stack too many on same cell
    const existing = particles.filter(p => p.col === col && p.row === row);
    if (existing.length > 1) return;

    particles.push({
      col, row,
      color,
      life: TRAIL_LIFE,
      maxLife: TRAIL_LIFE,
    });

    if (particles.length > MAX_PIXELS) particles.shift();
  }

  function render() {
    rafId = requestAnimationFrame(render);

    tctx.setTransform(1, 0, 0, 1, 0, 0);
    tctx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);

    let anyAlive = false;

    particles = particles.filter(p => p.life > 0);

    particles.forEach(p => {
      p.life--;
      const progress = p.life / p.maxLife;  // 1 = fresh, 0 = dead

      // Ease out — bright flash then slow fade
      const alpha = Math.pow(progress, 0.6) * 0.75;

      if (alpha < 0.005) return;
      anyAlive = true;

      const [r, g, b] = p.color;

      // Physical pixel coords
      const px = Math.round(p.col * dpr);
      const py = Math.round(p.row * dpr);
      const ps = Math.round(CELL * dpr);

      // Crisp pixel square only — no glow
      tctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
      tctx.fillRect(px, py, ps, ps);
    });

    if (!anyAlive) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function startRender() {
    if (!rafId) rafId = requestAnimationFrame(render);
  }

  hero.addEventListener('mousemove', e => {
    const rect = hero.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (lastX >= 0) {
      const dx = x - lastX;
      const dy = y - lastY;
      distAccum += Math.sqrt(dx * dx + dy * dy);

      while (distAccum >= SPAWN_DIST) {
        distAccum -= SPAWN_DIST;
        spawnPixel(x, y);
      }
    } else {
      spawnPixel(x, y);
    }

    lastX = x;
    lastY = y;
    startRender();
  });

  hero.addEventListener('mouseleave', () => {
    lastX = -1;
    lastY = -1;
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); }, 150);
  });

  resize();
})();

// ── Active nav on scroll ──────────────────────
const sections = document.querySelectorAll('.section');
const navLinks = document.querySelectorAll('.nav-link');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(l => l.classList.remove('active'));
      const link = document.querySelector(`.nav-link[href="#${entry.target.id}"]`);
      if (link) link.classList.add('active');
    }
  });
}, { rootMargin: '-20% 0px -70% 0px' });

sections.forEach(s => observer.observe(s));

// ── Nav click: scroll precisely to section top ─
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    const href = link.getAttribute('href');
    if (!href || !href.startsWith('#')) return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

// ── Copy to clipboard ─────────────────────────
const toast = document.getElementById('toast');
let toastTimer;

document.querySelectorAll('.color-card[data-copy], .scale-swatch[data-copy]').forEach(el => {
  el.addEventListener('click', () => {
    navigator.clipboard.writeText(el.dataset.copy).then(() => {
      clearTimeout(toastTimer);
      toast.textContent = `Copied ${el.dataset.copy}`;
      toast.classList.add('show');
      toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
    });
  });
});

document.querySelectorAll('.copy-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    navigator.clipboard.writeText(btn.dataset.copy).then(() => {
      clearTimeout(toastTimer);
      toast.textContent = 'Copied to clipboard';
      toast.classList.add('show');
      toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
    });
  });
});

// ── Mobile menu ───────────────────────────────
const menuBtn = document.getElementById('menuBtn');
const sidebar = document.getElementById('sidebar');

if (menuBtn) {
  menuBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
  navLinks.forEach(link => link.addEventListener('click', () => sidebar.classList.remove('open')));
}

// ── Icon Grid ─────────────────────────────────
(function () {
  // Local SVG files — Purple-600 icons
  const icons = [
    // Alerts & Status
    { name: 'alert', url: 'icn-alert.svg', category: 'Alerts & Status' },
    { name: 'alert-2', url: 'icn-alert-2.svg', category: 'Alerts & Status' },
    { name: 'alert-3', url: 'icn-alert-3.svg', category: 'Alerts & Status' },
    { name: 'alert-4', url: 'icn-alert-4.svg', category: 'Alerts & Status' },
    { name: 'alert-off', url: 'icn-alert-off.svg', category: 'Alerts & Status' },
    { name: 'information', url: 'icn-information.svg', category: 'Alerts & Status' },
    { name: 'checkmark', url: 'icn-checkmark.svg', category: 'Alerts & Status' },
    { name: 'checkmark-2', url: 'icn-checkmark-2.svg', category: 'Alerts & Status' },
    { name: 'block', url: 'icn-block.svg', category: 'Alerts & Status' },
    { name: 'shield', url: 'icn-shield.svg', category: 'Alerts & Status' },
    { name: 'lock', url: 'icn-lock.svg', category: 'Alerts & Status' },
    { name: 'firewall', url: 'icn-firewall.svg', category: 'Alerts & Status' },
    // Analytics & Data
    { name: 'analytics', url: 'icn-analytics.svg', category: 'Analytics & Data' },
    { name: 'analytics-2', url: 'icn-analytics-2.svg', category: 'Analytics & Data' },
    { name: 'analytics-3', url: 'icn-analytics-3.svg', category: 'Analytics & Data' },
    { name: 'analytics-4', url: 'icn-analytics-4.svg', category: 'Analytics & Data' },
    { name: 'analytics-5', url: 'icn-analytics-5.svg', category: 'Analytics & Data' },
    { name: 'data', url: 'icn-data.svg', category: 'Analytics & Data' },
    { name: 'data-2', url: 'icn-data-2.svg', category: 'Analytics & Data' },
    { name: 'data-3', url: 'icn-data-3.svg', category: 'Analytics & Data' },
    { name: 'data-4', url: 'icn-data-4.svg', category: 'Analytics & Data' },
    { name: 'presentation', url: 'icn-presentation.svg', category: 'Analytics & Data' },
    { name: 'strategy', url: 'icn-strategy.svg', category: 'Analytics & Data' },
    // Messaging
    { name: 'push', url: 'icn-push.svg', category: 'Messaging' },
    { name: 'sms', url: 'icn-sms.svg', category: 'Messaging' },
    { name: 'email', url: 'icn-email.svg', category: 'Messaging' },
    { name: 'email-2', url: 'icn-email-2.svg', category: 'Messaging' },
    { name: 'inapp-message',url: 'https://www.figma.com/api/mcp/asset/3a60adc1-e9bc-46fb-9483-693816b7f0e8', category: 'Messaging' },
    { name: 'mobile-push', url: 'icn-mobile-push.svg', category: 'Messaging' },
    { name: 'web-push', url: 'icn-web-push.svg', category: 'Messaging' },
    { name: 'live-activity',url: 'https://www.figma.com/api/mcp/asset/1e032102-deab-4e6c-870c-11da37682f73', category: 'Messaging' },
    { name: 'chat', url: 'icn-chat.svg', category: 'Messaging' },
    { name: 'chat-2', url: 'icn-chat-2.svg', category: 'Messaging' },
    { name: 'chat-3', url: 'icn-chat-3.svg', category: 'Messaging' },
    { name: 'chat-4', url: 'icn-chat-4.svg', category: 'Messaging' },
    { name: 'announce', url: 'icn-announce.svg', category: 'Messaging' },
    { name: 'announce-2', url: 'icn-announce-2.svg', category: 'Messaging' },
    { name: 'announce-3', url: 'icn-announce-3.svg', category: 'Messaging' },
    // Devices & Platforms
    { name: 'mobile', url: 'icn-mobile.svg', category: 'Devices' },
    { name: 'mobile-2', url: 'icn-mobile-2.svg', category: 'Devices' },
    { name: 'desktop', url: 'icn-desktop.svg', category: 'Devices' },
    { name: 'desktop-2', url: 'icn-desktop-2.svg', category: 'Devices' },
    { name: 'devices', url: 'icn-devices.svg', category: 'Devices' },
    { name: 'platform', url: 'icn-platform.svg', category: 'Devices' },
    { name: 'browser', url: 'icn-browser.svg', category: 'Devices' },
    { name: 'apps', url: 'icn-apps.svg', category: 'Devices' },
    { name: 'sdk', url: 'icn-sdk.svg', category: 'Devices' },
    { name: 'webhook', url: 'icn-webhook.svg', category: 'Devices' },
    // Navigation
    { name: 'arrow', url: 'icn-arrow.svg', category: 'Navigation' },
    { name: 'arrow-2', url: 'icn-arrow-2.svg', category: 'Navigation' },
    { name: 'arrow-3', url: 'icn-arrow-3.svg', category: 'Navigation' },
    { name: 'arrow-4', url: 'icn-arrow-4.svg', category: 'Navigation' },
    { name: 'arrow-5', url: 'icn-arrow-5.svg', category: 'Navigation' },
    { name: 'arrow-6', url: 'icn-arrow-6.svg', category: 'Navigation' },
    { name: 'arrow-right', url: 'icn-arrow-right.svg', category: 'Navigation' },
    { name: 'arrow-left', url: 'icn-arrow-left.svg', category: 'Navigation' },
    { name: 'arrow-up', url: 'icn-arrow-up.svg', category: 'Navigation' },
    { name: 'arrow-down', url: 'icn-arrow-down.svg', category: 'Navigation' },
    { name: 'arrow-right-2',url: 'https://www.figma.com/api/mcp/asset/c7fa3a1f-c966-4553-9937-3ee98ef81b12', category: 'Navigation' },
    { name: 'arrow-left-2', url: 'icn-arrow-left-2.svg', category: 'Navigation' },
    { name: 'close', url: 'icn-close.svg', category: 'Navigation' },
    { name: 'plus', url: 'icn-plus.svg', category: 'Navigation' },
    { name: 'plus-2', url: 'icn-plus-2.svg', category: 'Navigation' },
    { name: 'minus', url: 'icn-minus.svg', category: 'Navigation' },
    { name: 'hamburger', url: 'icn-hamburger.svg', category: 'Navigation' },
    { name: 'kebab', url: 'icn-kebab.svg', category: 'Navigation' },
    { name: 'search', url: 'icn-search.svg', category: 'Navigation' },
    { name: 'filter', url: 'icn-filter.svg', category: 'Navigation' },
    { name: 'home', url: 'icn-home.svg', category: 'Navigation' },
    // Users & People
    { name: 'people', url: 'icn-people.svg', category: 'Users' },
    { name: 'people-2', url: 'icn-people-2.svg', category: 'Users' },
    { name: 'personalize', url: 'icn-personalize.svg', category: 'Users' },
    { name: 'retargeting', url: 'icn-retargeting.svg', category: 'Users' },
    { name: 'attract', url: 'icn-attract.svg', category: 'Users' },
    { name: 'support', url: 'icn-support.svg', category: 'Users' },
    { name: 'help', url: 'icn-help.svg', category: 'Users' },
    { name: 'help-2', url: 'icn-help-2.svg', category: 'Users' },
    { name: 'id', url: 'icn-id.svg', category: 'Users' },
    { name: 'journey', url: 'icn-journey.svg', category: 'Users' },
    // Tools & Settings
    { name: 'gear', url: 'icn-gear.svg', category: 'Tools' },
    { name: 'tool-1', url: 'icn-tool-1.svg', category: 'Tools' },
    { name: 'tool-2', url: 'icn-tool-2.svg', category: 'Tools' },
    { name: 'tool-3', url: 'icn-tool-3.svg', category: 'Tools' },
    { name: 'sync', url: 'icn-sync.svg', category: 'Tools' },
    { name: 'refresh', url: 'icn-refresh.svg', category: 'Tools' },
    { name: 'copy', url: 'icn-copy.svg', category: 'Tools' },
    { name: 'save', url: 'icn-save.svg', category: 'Tools' },
    { name: 'import', url: 'icn-import.svg', category: 'Tools' },
    { name: 'export', url: 'icn-export.svg', category: 'Tools' },
    { name: 'shortcut', url: 'icn-shortcut.svg', category: 'Tools' },
    { name: 'code', url: 'icn-code.svg', category: 'Tools' },
    { name: 'code-2', url: 'icn-code-2.svg', category: 'Tools' },
    { name: 'reorder', url: 'icn-reorder.svg', category: 'Tools' },
    { name: 'cursor', url: 'icn-cursor.svg', category: 'Tools' },
    // Social
    { name: 'facebook', url: 'icn-facebook.svg', category: 'Social' },
    { name: 'instagram', url: 'icn-instagram.svg', category: 'Social' },
    { name: 'linkedin', url: 'icn-linkedin.svg', category: 'Social' },
    { name: 'twitter', url: 'icn-twitter.svg', category: 'Social' },
    // Misc
    { name: 'star', url: 'icn-star.svg', category: 'Misc' },
    { name: 'star-2', url: 'icn-star-2.svg', category: 'Misc' },
    { name: 'award', url: 'icn-award.svg', category: 'Misc' },
    { name: 'award-2', url: 'icn-award-2.svg', category: 'Misc' },
    { name: 'badge', url: 'icn-badge.svg', category: 'Misc' },
    { name: 'gem', url: 'icn-gem.svg', category: 'Misc' },
    { name: 'rocket', url: 'icn-rocket.svg', category: 'Misc' },
    { name: 'rocket-2', url: 'icn-rocket-2.svg', category: 'Misc' },
    { name: 'rocket-3', url: 'icn-rocket-3.svg', category: 'Misc' },
    { name: 'globe', url: 'icn-globe.svg', category: 'Misc' },
    { name: 'bolt', url: 'icn-bolt.svg', category: 'Misc' },
    { name: 'target', url: 'icn-target.svg', category: 'Misc' },
    { name: 'flag', url: 'icn-flag.svg', category: 'Misc' },
    { name: 'flag-2', url: 'icn-flag-2.svg', category: 'Misc' },
    { name: 'calendar', url: 'icn-calendar.svg', category: 'Misc' },
    { name: 'time', url: 'icn-time.svg', category: 'Misc' },
    { name: 'location', url: 'icn-location.svg', category: 'Misc' },
  ];

  const grid = document.getElementById('iconGrid');
  const searchInput = document.getElementById('iconSearch');
  const emptyMsg = document.getElementById('iconGridEmpty');
  const btnPurple = document.getElementById('btnPurple');
  const btnWhite = document.getElementById('btnWhite');

  if (!grid) return;

  let currentVariant = 'purple';

  function processSvg(svgText, variant) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');
    if (!svgEl) return null;

    // Expand viewBox by 2px on each side for breathing room
    const vb = svgEl.getAttribute('viewBox') || '0 0 24 24';
    const [minX, minY, w, h] = vb.split(' ').map(Number);
    const pad = 2;
    svgEl.setAttribute('viewBox', `${minX - pad} ${minY - pad} ${w + pad * 2} ${h + pad * 2}`);
    svgEl.setAttribute('width', '32');
    svgEl.setAttribute('height', '32');
    svgEl.removeAttribute('xmlns');

    // Swap fill/stroke color for white variant — skip fills inside <defs>
    if (variant === 'white') {
      // Remove defs section temporarily, swap colors, restore
      const defsMatch = svgEl.outerHTML.match(/<defs>[\s\S]*?<\/defs>/);
      let html = svgEl.outerHTML;
      // Only replace #4E50D1 fill (our brand purple)
      html = html.replace(/#4E50D1/gi, '#ffffff');
      // Restore defs unchanged if they existed
      if (defsMatch) {
        html = html.replace(/<defs>[\s\S]*?<\/defs>/, defsMatch[0].replace(/#ffffff/gi, '#4E50D1'));
      }
      return html;
    }

    return svgEl.outerHTML;
  }

  function renderGrid(filter = '') {
    const filtered = icons.filter(ic => ic.name.includes(filter.toLowerCase()));
    grid.innerHTML = '';
    emptyMsg.style.display = filtered.length === 0 ? 'block' : 'none';

    filtered.forEach(icon => {
      const card = document.createElement('div');
      card.className = 'icon-card';
      card.title = `Click to copy icn-${icon.name}`;

      const imgWrap = document.createElement('div');
      imgWrap.className = 'icon-card-img-wrap';

      // Load SVG inline so we can control viewBox padding and color
      fetch(icon.url)
        .then(r => r.text())
        .then(svgText => {
          const html = processSvg(svgText, currentVariant);
          if (html) imgWrap.innerHTML = html;
        })
        .catch(() => {
          const img = document.createElement('img');
          img.src = icon.url;
          img.alt = icon.name;
          img.width = 32;
          img.height = 32;
          imgWrap.appendChild(img);
        });

      const label = document.createElement('span');
      label.className = 'icon-card-name';
      label.textContent = `icn-${icon.name}`;

      imgWrap.appendChild(document.createTextNode('')); // placeholder
      card.appendChild(imgWrap);
      card.appendChild(label);

      // Click to copy as PNG — uses current variant color
      card.addEventListener('click', async () => {
        try {
          const SIZE = 256;
          const response = await fetch(icon.url);
          const svgText = await response.text();

          // Process SVG with correct color + padded viewBox
          let svgHtml = processSvg(svgText, currentVariant);
          // Set size for canvas rendering
          svgHtml = svgHtml.replace(/width="32"/, `width="${SIZE}"`).replace(/height="32"/, `height="${SIZE}"`);
          const blob = new Blob([svgHtml], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);

          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = SIZE;
            canvas.height = SIZE;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, SIZE, SIZE);
            URL.revokeObjectURL(url);

            canvas.toBlob(async (pngBlob) => {
              try {
                await navigator.clipboard.write([
                  new ClipboardItem({ 'image/png': pngBlob })
                ]);
                card.classList.add('copied');
                setTimeout(() => card.classList.remove('copied'), 1200);
                clearTimeout(toastTimer);
                toast.textContent = `Copied icn-${icon.name}`;
                toast.classList.add('show');
                toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
              } catch (e) {
                navigator.clipboard.writeText(`icn-${icon.name}`);
                clearTimeout(toastTimer);
                toast.textContent = `Copied name: icn-${icon.name}`;
                toast.classList.add('show');
                toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
              }
            }, 'image/png');
          };
          img.src = url;
        } catch (err) {
          navigator.clipboard.writeText(`icn-${icon.name}`);
          clearTimeout(toastTimer);
          toast.textContent = `Copied icn-${icon.name}`;
          toast.classList.add('show');
          toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
        }
      });

      grid.appendChild(card);
    });
  }

  searchInput.addEventListener('input', () => renderGrid(searchInput.value));

  btnPurple.addEventListener('click', () => {
    grid.dataset.variant = 'purple';
    currentVariant = 'purple';
    btnPurple.classList.add('active');
    btnWhite.classList.remove('active');
    renderGrid(searchInput.value);
  });

  btnWhite.addEventListener('click', () => {
    currentVariant = 'white';
    grid.dataset.variant = 'white';
    btnWhite.classList.add('active');
    btnPurple.classList.remove('active');
    renderGrid(searchInput.value);
  });

  renderGrid();
})();

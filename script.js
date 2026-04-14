// ── Hero Pixel Scatter Burst ───────────────────
// Pixels bloom randomly around cursor in brand colors, no grid lines.

(function () {
  const hero = document.getElementById('hero');
  const gridEl = document.getElementById('hero-grid');
  if (!hero || !gridEl) return;

  gridEl.innerHTML = '';

  const trailCanvas = document.createElement('canvas');
  trailCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;mix-blend-mode:screen;';
  gridEl.appendChild(trailCanvas);
  const tctx = trailCanvas.getContext('2d');

  const CELL        = 40;
  const LIFE        = 65;
  const SPAWN_EVERY = 4;
  const RADIUS      = 126;
  const MAX         = 80;
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
  let mouse = null;
  let rafId = null;
  let frame = 0;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = hero.offsetWidth;
    H = hero.offsetHeight;
    trailCanvas.width  = Math.round(W * dpr);
    trailCanvas.height = Math.round(H * dpr);
    trailCanvas.style.width  = W + 'px';
    trailCanvas.style.height = H + 'px';
  }

  function spawnAround(mx, my) {
    const angle = Math.random() * Math.PI * 2;
    const dist  = Math.sqrt(Math.random()) * RADIUS;
    const col   = Math.round((mx + Math.cos(angle) * dist) / CELL) * CELL;
    const row   = Math.round((my + Math.sin(angle) * dist) / CELL) * CELL;
    if (col < 0 || row < 0 || col > W || row > H) return;
    if (particles.some(p => p.col === col && p.row === row && p.life > LIFE * 0.25)) return;
    particles.push({
      col, row,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      life: LIFE,
      maxLife: LIFE,
    });
    if (particles.length > MAX) particles.splice(0, particles.length - MAX);
  }

  function render() {
    rafId = requestAnimationFrame(render);
    frame++;

    tctx.setTransform(1, 0, 0, 1, 0, 0);
    tctx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);

    if (mouse && frame % SPAWN_EVERY === 0) spawnAround(mouse.x, mouse.y);

    particles = particles.filter(p => p.life > 0);

    particles.forEach(p => {
      p.life--;
      const t = 1 - (p.life / p.maxLife);
      // Smooth sine bell: ease in then slow ease out
      const alpha = t < 0.15
        ? Math.sin((t / 0.15) * Math.PI * 0.5) * 0.65
        : Math.sin(((1 - t) / 0.85) * Math.PI * 0.5) * 0.65;
      if (alpha < 0.005) return;
      const [r, g, b] = p.color;
      tctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
      tctx.fillRect(Math.round(p.col * dpr), Math.round(p.row * dpr), Math.round(CELL * dpr), Math.round(CELL * dpr));
    });

    if (!mouse && particles.every(p => p.life <= 0)) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function startRender() {
    if (!rafId) rafId = requestAnimationFrame(render);
  }

  hero.addEventListener('mousemove', e => {
    const rect = hero.getBoundingClientRect();
    mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    startRender();
  });

  hero.addEventListener('mouseleave', () => { mouse = null; });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
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
    { name: 'alert', url: 'assets/icn-alert.svg', category: 'Alerts & Status' },
    { name: 'alert-2', url: 'assets/icn-alert-2.svg', category: 'Alerts & Status' },
    { name: 'alert-3', url: 'assets/icn-alert-3.svg', category: 'Alerts & Status' },
    { name: 'alert-4', url: 'assets/icn-alert-4.svg', category: 'Alerts & Status' },
    { name: 'alert-off', url: 'assets/icn-alert-off.svg', category: 'Alerts & Status' },
    { name: 'information', url: 'assets/icn-information.svg', category: 'Alerts & Status' },
    { name: 'checkmark', url: 'assets/icn-checkmark.svg', category: 'Alerts & Status' },
    { name: 'checkmark-2', url: 'assets/icn-checkmark-2.svg', category: 'Alerts & Status' },
    { name: 'block', url: 'assets/icn-block.svg', category: 'Alerts & Status' },
    { name: 'shield', url: 'assets/icn-shield.svg', category: 'Alerts & Status' },
    { name: 'lock', url: 'assets/icn-lock.svg', category: 'Alerts & Status' },
    { name: 'firewall', url: 'assets/icn-firewall.svg', category: 'Alerts & Status' },
    // Analytics & Data
    { name: 'analytics', url: 'assets/icn-analytics.svg', category: 'Analytics & Data' },
    { name: 'analytics-2', url: 'assets/icn-analytics-2.svg', category: 'Analytics & Data' },
    { name: 'analytics-3', url: 'assets/icn-analytics-3.svg', category: 'Analytics & Data' },
    { name: 'analytics-4', url: 'assets/icn-analytics-4.svg', category: 'Analytics & Data' },
    { name: 'analytics-5', url: 'assets/icn-analytics-5.svg', category: 'Analytics & Data' },
    { name: 'data', url: 'assets/icn-data.svg', category: 'Analytics & Data' },
    { name: 'data-2', url: 'assets/icn-data-2.svg', category: 'Analytics & Data' },
    { name: 'data-3', url: 'assets/icn-data-3.svg', category: 'Analytics & Data' },
    { name: 'data-4', url: 'assets/icn-data-4.svg', category: 'Analytics & Data' },
    { name: 'presentation', url: 'assets/icn-presentation.svg', category: 'Analytics & Data' },
    { name: 'strategy', url: 'assets/icn-strategy.svg', category: 'Analytics & Data' },
    // Messaging
    { name: 'push', url: 'assets/icn-push.svg', category: 'Messaging' },
    { name: 'sms', url: 'assets/icn-sms.svg', category: 'Messaging' },
    { name: 'email', url: 'assets/icn-email.svg', category: 'Messaging' },
    { name: 'email-2', url: 'assets/icn-email-2.svg', category: 'Messaging' },
    { name: 'inapp-message',url: 'assets/icn-inapp-message.svg', category: 'Messaging' },
    { name: 'mobile-push', url: 'assets/icn-mobile-push.svg', category: 'Messaging' },
    { name: 'web-push', url: 'assets/icn-web-push.svg', category: 'Messaging' },
    { name: 'live-activity',url: 'assets/icn-live-activity.svg', category: 'Messaging' },
    { name: 'chat', url: 'assets/icn-chat.svg', category: 'Messaging' },
    { name: 'chat-2', url: 'assets/icn-chat-2.svg', category: 'Messaging' },
    { name: 'chat-3', url: 'assets/icn-chat-3.svg', category: 'Messaging' },
    { name: 'chat-4', url: 'assets/icn-chat-4.svg', category: 'Messaging' },
    { name: 'announce', url: 'assets/icn-announce.svg', category: 'Messaging' },
    { name: 'announce-2', url: 'assets/icn-announce-2.svg', category: 'Messaging' },
    { name: 'announce-3', url: 'assets/icn-announce-3.svg', category: 'Messaging' },
    // Devices & Platforms
    { name: 'mobile', url: 'assets/icn-mobile.svg', category: 'Devices' },
    { name: 'mobile-2', url: 'assets/icn-mobile-2.svg', category: 'Devices' },
    { name: 'desktop', url: 'assets/icn-desktop.svg', category: 'Devices' },
    { name: 'desktop-2', url: 'assets/icn-desktop-2.svg', category: 'Devices' },
    { name: 'devices', url: 'assets/icn-devices.svg', category: 'Devices' },
    { name: 'platform', url: 'assets/icn-platform.svg', category: 'Devices' },
    { name: 'browser', url: 'assets/icn-browser.svg', category: 'Devices' },
    { name: 'apps', url: 'assets/icn-apps.svg', category: 'Devices' },
    { name: 'sdk', url: 'assets/icn-sdk.svg', category: 'Devices' },
    { name: 'webhook', url: 'assets/icn-webhook.svg', category: 'Devices' },
    { name: 'phone', url: 'assets/icn-phone.svg', category: 'Devices' },
    { name: 'cloud', url: 'assets/icn-cloud.svg', category: 'Devices' },
    // Navigation
    { name: 'arrow', url: 'assets/icn-arrow.svg', category: 'Navigation' },
    { name: 'arrow-2', url: 'assets/icn-arrow-2.svg', category: 'Navigation' },
    { name: 'arrow-3', url: 'assets/icn-arrow-3.svg', category: 'Navigation' },
    { name: 'arrow-4', url: 'assets/icn-arrow-4.svg', category: 'Navigation' },
    { name: 'arrow-5', url: 'assets/icn-arrow-5.svg', category: 'Navigation' },
    { name: 'arrow-6', url: 'assets/icn-arrow-6.svg', category: 'Navigation' },
    { name: 'arrow-right', url: 'assets/icn-arrow-right.svg', category: 'Navigation' },
    { name: 'arrow-left', url: 'assets/icn-arrow-left.svg', category: 'Navigation' },
    { name: 'arrow-up', url: 'assets/icn-arrow-up.svg', category: 'Navigation' },
    { name: 'arrow-down', url: 'assets/icn-arrow-down.svg', category: 'Navigation' },
    { name: 'arrow-right-2',url: 'assets/icn-arrow-right-2.svg', category: 'Navigation' },
    { name: 'arrow-left-2', url: 'assets/icn-arrow-left-2.svg', category: 'Navigation' },
    { name: 'up', url: 'assets/icn-up.svg', category: 'Navigation' },
    { name: 'close', url: 'assets/icn-close.svg', category: 'Navigation' },
    { name: 'plus', url: 'assets/icn-plus.svg', category: 'Navigation' },
    { name: 'plus-2', url: 'assets/icn-plus-2.svg', category: 'Navigation' },
    { name: 'minus', url: 'assets/icn-minus.svg', category: 'Navigation' },
    { name: 'hamburger', url: 'assets/icn-hamburger.svg', category: 'Navigation' },
    { name: 'kebab', url: 'assets/icn-kebab.svg', category: 'Navigation' },
    { name: 'search', url: 'assets/icn-search.svg', category: 'Navigation' },
    { name: 'filter', url: 'assets/icn-filter.svg', category: 'Navigation' },
    { name: 'home', url: 'assets/icn-home.svg', category: 'Navigation' },
    { name: 'enter', url: 'assets/icn-enter.svg', category: 'Navigation' },
    { name: 'exit', url: 'assets/icn-exit.svg', category: 'Navigation' },
    { name: 'return', url: 'assets/icn-return.svg', category: 'Navigation' },
    { name: 'link', url: 'assets/icn-link.svg', category: 'Navigation' },
    { name: 'link-2', url: 'assets/icn-link-2.svg', category: 'Navigation' },
    // Users & People
    { name: 'people', url: 'assets/icn-people.svg', category: 'Users' },
    { name: 'people-2', url: 'assets/icn-people-2.svg', category: 'Users' },
    { name: 'personalize', url: 'assets/icn-personalize.svg', category: 'Users' },
    { name: 'retargeting', url: 'assets/icn-retargeting.svg', category: 'Users' },
    { name: 'attract', url: 'assets/icn-attract.svg', category: 'Users' },
    { name: 'support', url: 'assets/icn-support.svg', category: 'Users' },
    { name: 'help', url: 'assets/icn-help.svg', category: 'Users' },
    { name: 'help-2', url: 'assets/icn-help-2.svg', category: 'Users' },
    { name: 'id', url: 'assets/icn-id.svg', category: 'Users' },
    { name: 'journey', url: 'assets/icn-journey.svg', category: 'Users' },
    { name: 'hand-wave', url: 'assets/icn-hand-wave.svg', category: 'Users' },
    { name: 'handshake', url: 'assets/icn-handshake.svg', category: 'Users' },
    { name: 'handshake-2', url: 'assets/icn-handshake-2.svg', category: 'Users' },
    { name: 'thumbs-up', url: 'assets/icn-thumbs-up.svg', category: 'Users' },
    { name: 'thumbs-down', url: 'assets/icn-thumbs-down.svg', category: 'Users' },
    // Tools & Settings
    { name: 'gear', url: 'assets/icn-gear.svg', category: 'Tools' },
    { name: 'tool-1', url: 'assets/icn-tool-1.svg', category: 'Tools' },
    { name: 'tool-2', url: 'assets/icn-tool-2.svg', category: 'Tools' },
    { name: 'tool-3', url: 'assets/icn-tool-3.svg', category: 'Tools' },
    { name: 'sync', url: 'assets/icn-sync.svg', category: 'Tools' },
    { name: 'refresh', url: 'assets/icn-refresh.svg', category: 'Tools' },
    { name: 'copy', url: 'assets/icn-copy.svg', category: 'Tools' },
    { name: 'save', url: 'assets/icn-save.svg', category: 'Tools' },
    { name: 'import', url: 'assets/icn-import.svg', category: 'Tools' },
    { name: 'export', url: 'assets/icn-export.svg', category: 'Tools' },
    { name: 'shortcut', url: 'assets/icn-shortcut.svg', category: 'Tools' },
    { name: 'code', url: 'assets/icn-code.svg', category: 'Tools' },
    { name: 'code-2', url: 'assets/icn-code-2.svg', category: 'Tools' },
    { name: 'reorder', url: 'assets/icn-reorder.svg', category: 'Tools' },
    { name: 'cursor', url: 'assets/icn-cursor.svg', category: 'Tools' },
    { name: 'key', url: 'assets/icn-key.svg', category: 'Tools' },
    { name: 'focus', url: 'assets/icn-focus.svg', category: 'Tools' },
    { name: 'preview', url: 'assets/icn-preview.svg', category: 'Tools' },
    { name: 'compare', url: 'assets/icn-compare.svg', category: 'Tools' },
    { name: 'connect', url: 'assets/icn-connect.svg', category: 'Tools' },
    { name: 'connection', url: 'assets/icn-connection.svg', category: 'Tools' },
    { name: 'click', url: 'assets/icn-click.svg', category: 'Tools' },
    { name: 'loading', url: 'assets/icn-loading.svg', category: 'Tools' },
    { name: 'record', url: 'assets/icn-record.svg', category: 'Tools' },
    { name: 'ruler', url: 'assets/icn-ruler.svg', category: 'Tools' },
    { name: 'blueprint', url: 'assets/icn-blueprint.svg', category: 'Tools' },
    { name: 'puzzle', url: 'assets/icn-puzzle.svg', category: 'Tools' },
    { name: 'question', url: 'assets/icn-question.svg', category: 'Tools' },
    { name: 'list', url: 'assets/icn-list.svg', category: 'Tools' },
    { name: 'list-2', url: 'assets/icn-list-2.svg', category: 'Tools' },
    { name: 'tags', url: 'assets/icn-tags.svg', category: 'Tools' },
    { name: 'documentation', url: 'assets/icn-documentation.svg', category: 'Tools' },
    { name: 'pencil', url: 'assets/icn-pencil.svg', category: 'Tools' },
    { name: 'test-tube', url: 'assets/icn-test-tube.svg', category: 'Tools' },
    // Social
    { name: 'facebook', url: 'assets/icn-facebook.svg', category: 'Social' },
    { name: 'instagram', url: 'assets/icn-instagram.svg', category: 'Social' },
    { name: 'linkedin', url: 'assets/icn-linkedin.svg', category: 'Social' },
    { name: 'twitter', url: 'assets/icn-twitter.svg', category: 'Social' },
    // Commerce & Finance
    { name: 'money', url: 'assets/icn-money.svg', category: 'Commerce' },
    { name: 'money-2', url: 'assets/icn-money-2.svg', category: 'Commerce' },
    { name: 'money-3', url: 'assets/icn-money-3.svg', category: 'Commerce' },
    { name: 'money-4', url: 'assets/icn-money-4.svg', category: 'Commerce' },
    { name: 'cart', url: 'assets/icn-cart.svg', category: 'Commerce' },
    { name: 'crypto', url: 'assets/icn-crypto.svg', category: 'Commerce' },
    { name: 'discount', url: 'assets/icn-discount.svg', category: 'Commerce' },
    // Travel & Transport
    { name: 'plane', url: 'assets/icn-plane.svg', category: 'Travel' },
    { name: 'plane-2', url: 'assets/icn-plane-2.svg', category: 'Travel' },
    { name: 'plane-3', url: 'assets/icn-plane-3.svg', category: 'Travel' },
    { name: 'car', url: 'assets/icn-car.svg', category: 'Travel' },
    { name: 'car-2', url: 'assets/icn-car-2.svg', category: 'Travel' },
    { name: 'ship', url: 'assets/icn-ship.svg', category: 'Travel' },
    { name: 'road', url: 'assets/icn-road.svg', category: 'Travel' },
    { name: 'travel', url: 'assets/icn-travel.svg', category: 'Travel' },
    { name: 'vacation', url: 'assets/icn-vacation.svg', category: 'Travel' },
    { name: 'traffic', url: 'assets/icn-traffic.svg', category: 'Travel' },
    // Lifestyle
    { name: 'food', url: 'assets/icn-food.svg', category: 'Lifestyle' },
    { name: 'drink', url: 'assets/icn-drink.svg', category: 'Lifestyle' },
    { name: 'wine', url: 'assets/icn-wine.svg', category: 'Lifestyle' },
    { name: 'cake', url: 'assets/icn-cake.svg', category: 'Lifestyle' },
    { name: 'fitness', url: 'assets/icn-fitness.svg', category: 'Lifestyle' },
    { name: 'sports', url: 'assets/icn-sports.svg', category: 'Lifestyle' },
    { name: 'sports-2', url: 'assets/icn-sports-2.svg', category: 'Lifestyle' },
    { name: 'sports-3', url: 'assets/icn-sports-3.svg', category: 'Lifestyle' },
    { name: 'medical', url: 'assets/icn-medical.svg', category: 'Lifestyle' },
    { name: 'clothing', url: 'assets/icn-clothing.svg', category: 'Lifestyle' },
    // Misc
    { name: 'star', url: 'assets/icn-star.svg', category: 'Misc' },
    { name: 'star-2', url: 'assets/icn-star-2.svg', category: 'Misc' },
    { name: 'award', url: 'assets/icn-award.svg', category: 'Misc' },
    { name: 'award-2', url: 'assets/icn-award-2.svg', category: 'Misc' },
    { name: 'badge', url: 'assets/icn-badge.svg', category: 'Misc' },
    { name: 'gem', url: 'assets/icn-gem.svg', category: 'Misc' },
    { name: 'rocket', url: 'assets/icn-rocket.svg', category: 'Misc' },
    { name: 'rocket-2', url: 'assets/icn-rocket-2.svg', category: 'Misc' },
    { name: 'rocket-3', url: 'assets/icn-rocket-3.svg', category: 'Misc' },
    { name: 'globe', url: 'assets/icn-globe.svg', category: 'Misc' },
    { name: 'bolt', url: 'assets/icn-bolt.svg', category: 'Misc' },
    { name: 'target', url: 'assets/icn-target.svg', category: 'Misc' },
    { name: 'flag', url: 'assets/icn-flag.svg', category: 'Misc' },
    { name: 'flag-2', url: 'assets/icn-flag-2.svg', category: 'Misc' },
    { name: 'calendar', url: 'assets/icn-calendar.svg', category: 'Misc' },
    { name: 'time', url: 'assets/icn-time.svg', category: 'Misc' },
    { name: 'time-2', url: 'assets/icn-time-2.svg', category: 'Misc' },
    { name: 'time-3', url: 'assets/icn-time-3.svg', category: 'Misc' },
    { name: 'time-4', url: 'assets/icn-time-4.svg', category: 'Misc' },
    { name: 'location', url: 'assets/icn-location.svg', category: 'Misc' },
    { name: 'building', url: 'assets/icn-building.svg', category: 'Misc' },
    { name: 'book', url: 'assets/icn-book.svg', category: 'Misc' },
    { name: 'book-2', url: 'assets/icn-book-2.svg', category: 'Misc' },
    { name: 'book-3', url: 'assets/icn-book-3.svg', category: 'Misc' },
    { name: 'lightbulb', url: 'assets/icn-lightbulb.svg', category: 'Misc' },
    { name: 'languages', url: 'assets/icn-languages.svg', category: 'Misc' },
    { name: 'news-media', url: 'assets/icn-news-media.svg', category: 'Misc' },
    { name: 'game', url: 'assets/icn-game.svg', category: 'Misc' },
    { name: 'party', url: 'assets/icn-party.svg', category: 'Misc' },
    { name: 'party-2', url: 'assets/icn-party-2.svg', category: 'Misc' },
    { name: 'party-3', url: 'assets/icn-party-3.svg', category: 'Misc' },
    { name: 'video', url: 'assets/icn-video.svg', category: 'Misc' },
    { name: 'video-2', url: 'assets/icn-video-2.svg', category: 'Misc' },
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
    svgEl.setAttribute('width', '20');
    svgEl.setAttribute('height', '20');
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
    emptyMsg.style.display = filtered.length === 0 ? 'flex' : 'none';
    if (filtered.length === 0) { grid.appendChild(emptyMsg); return; }

    filtered.forEach(icon => {
      const card = document.createElement('div');
      card.className = 'icon-card';
      card.title = `icn-${icon.name}`;

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
      label.style.display = 'none'; // hidden but kept for tooltip/accessibility

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

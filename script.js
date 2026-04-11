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

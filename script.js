// ── Hero Grid Line Glow ───────────────────────
(function () {
  const hero = document.getElementById('hero');
  const gridEl = document.getElementById('hero-grid');
  if (!hero || !gridEl) return;

  gridEl.innerHTML = '';

  // Single canvas — draw everything each frame
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
  gridEl.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const CELL        = 40;
  const RADIUS      = 180;
  const FADE        = 0.018;   // trail decay — lower = longer linger
  const BASE_ALPHA  = 0.14;
  const GLOW_ALPHA  = 0.92;
  const TRAIL       = 24;      // number of trail positions to remember

  let W = 0, H = 0, dpr = 1;
  let hLines = [], vLines = [];
  let mouseX = -9999, mouseY = -9999;
  let trail = [];              // past { x, y } positions
  let rafId = null;

  function snap(n) {
    // Convert logical px to physical px integer + 0.5 center, back to logical
    return (Math.round(n * dpr - 0.5) + 0.5) / dpr;
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = hero.offsetWidth;
    H = hero.offsetHeight;
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';

    // Work in RAW PHYSICAL pixels — no DPR transform scaling
    // This guarantees 1:1 pixel mapping with no anti-alias blur
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;

    // Store line positions in physical pixels
    hLines = [];
    for (let y = CELL; y < H; y += CELL) {
      hLines.push({ pos: Math.round(y * dpr) + 0.5, posL: y, glow: 0 });
    }
    vLines = [];
    for (let x = CELL; x < W; x += CELL) {
      vLines.push({ pos: Math.round(x * dpr) + 0.5, posL: x, glow: 0 });
    }
  }

  // (unused stub — kept for reference)
  function influence() {}

  function render() {
    rafId = requestAnimationFrame(render);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    const PW = canvas.width;
    const PH = canvas.height;

    // ── Update line glow values (using logical positions for distance math) ──
    hLines.forEach(line => {
      let peak = 0;
      if (mouseX > -8000) {
        const dy = Math.abs(line.posL - mouseY);
        if (dy < RADIUS) peak = Math.max(peak, 1 - dy / RADIUS);
      }
      trail.forEach((pt, ti) => {
        const age    = (trail.length - ti) / trail.length;
        const weight = Math.pow(1 - age, 0.5);
        const dy = Math.abs(line.posL - pt.y);
        if (dy < RADIUS) peak = Math.max(peak, (1 - dy / RADIUS) * weight);
      });
      line.glow = peak > line.glow ? peak : Math.max(0, line.glow - FADE);
    });

    vLines.forEach(line => {
      let peak = 0;
      if (mouseX > -8000) {
        const dx = Math.abs(line.posL - mouseX);
        if (dx < RADIUS) peak = Math.max(peak, 1 - dx / RADIUS);
      }
      trail.forEach((pt, ti) => {
        const age    = (trail.length - ti) / trail.length;
        const weight = Math.pow(1 - age, 0.5);
        const dx = Math.abs(line.posL - pt.x);
        if (dx < RADIUS) peak = Math.max(peak, (1 - dx / RADIUS) * weight);
      });
      line.glow = peak > line.glow ? peak : Math.max(0, line.glow - FADE);
    });

    // ── Draw lines at PHYSICAL pixel coords — 1px wide, integer + 0.5 offset ──
    ctx.lineWidth = 1;

    hLines.forEach(line => {
      const alpha = BASE_ALPHA + line.glow * (GLOW_ALPHA - BASE_ALPHA);
      ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(0, line.pos);
      ctx.lineTo(PW, line.pos);
      ctx.stroke();
    });

    vLines.forEach(line => {
      const alpha = BASE_ALPHA + line.glow * (GLOW_ALPHA - BASE_ALPHA);
      ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(line.pos, 0);
      ctx.lineTo(line.pos, PH);
      ctx.stroke();
    });

    // Stop loop when fully faded and cursor gone
    const anyLit = hLines.some(l => l.glow > 0.005) || vLines.some(l => l.glow > 0.005);
    if (!anyLit && mouseX < -8000) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function startRender() {
    if (!rafId) rafId = requestAnimationFrame(render);
  }

  hero.addEventListener('mousemove', e => {
    const rect = hero.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    trail.push({ x: mouseX, y: mouseY });
    if (trail.length > TRAIL) trail.shift();
    startRender();
  });

  hero.addEventListener('mouseleave', () => {
    mouseX = -9999;
    mouseY = -9999;
    // keep animating for trail to fade
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); startRender(); }, 150);
  });

  resize();
  startRender();
})();

// ── Nav click: scroll precisely to section top ─
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    const href = link.getAttribute('href');
    if (!href || !href.startsWith('#')) return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    // Scroll so the section top is exactly at the top of the viewport
    const top = target.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});


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

// ── Copy to clipboard ─────────────────────────
const toast = document.getElementById('toast');
let toastTimer;

document.querySelectorAll('.color-card[data-copy]').forEach(card => {
  card.addEventListener('click', () => {
    navigator.clipboard.writeText(card.dataset.copy).then(() => {
      clearTimeout(toastTimer);
      toast.textContent = `Copied ${card.dataset.copy}`;
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

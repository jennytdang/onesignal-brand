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
    // Snap to exact physical pixel center to avoid anti-alias blur
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
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    hLines = [];
    for (let y = CELL; y < H; y += CELL) hLines.push({ pos: snap(y), glow: 0 });
    vLines = [];
    for (let x = CELL; x < W; x += CELL) vLines.push({ pos: snap(x), glow: 0 });
  }

  // Compute influence at a line from all trail points + current cursor
  function influence(lineDist) {
    // lineDist = perpendicular distance from line to cursor
    let peak = mouseX > -8000 && lineDist < RADIUS
      ? (1 - lineDist / RADIUS) : 0;

    // Trail adds lingering glow — older points have less weight
    trail.forEach((pt, ti) => {
      const age    = (trail.length - ti) / trail.length;
      const weight = Math.pow(1 - age, 0.6); // non-linear falloff
      // compute the correct perpendicular distance for h vs v lines
      // (caller passes the right axis distance)
    });

    return peak;
  }

  function render() {
    rafId = requestAnimationFrame(render);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = false;

    // ── Update line glow values ──
    hLines.forEach(line => {
      let peak = 0;
      // Current cursor
      if (mouseX > -8000) {
        const dy = Math.abs(line.pos - mouseY);
        if (dy < RADIUS) peak = Math.max(peak, 1 - dy / RADIUS);
      }
      // Trail history
      trail.forEach((pt, ti) => {
        const age    = (trail.length - ti) / trail.length;
        const weight = Math.pow(1 - age, 0.5);
        const dy = Math.abs(line.pos - pt.y);
        if (dy < RADIUS) peak = Math.max(peak, (1 - dy / RADIUS) * weight);
      });
      line.glow = peak > line.glow ? peak : Math.max(0, line.glow - FADE);
    });

    vLines.forEach(line => {
      let peak = 0;
      if (mouseX > -8000) {
        const dx = Math.abs(line.pos - mouseX);
        if (dx < RADIUS) peak = Math.max(peak, 1 - dx / RADIUS);
      }
      trail.forEach((pt, ti) => {
        const age    = (trail.length - ti) / trail.length;
        const weight = Math.pow(1 - age, 0.5);
        const dx = Math.abs(line.pos - pt.x);
        if (dx < RADIUS) peak = Math.max(peak, (1 - dx / RADIUS) * weight);
      });
      line.glow = peak > line.glow ? peak : Math.max(0, line.glow - FADE);
    });

    // ── Draw lines — crisp, no mask, opacity encodes glow ──
    ctx.lineWidth = 1 / dpr;

    hLines.forEach(line => {
      const alpha = BASE_ALPHA + line.glow * (GLOW_ALPHA - BASE_ALPHA);
      ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(0, line.pos);
      ctx.lineTo(W, line.pos);
      ctx.stroke();
    });

    vLines.forEach(line => {
      const alpha = BASE_ALPHA + line.glow * (GLOW_ALPHA - BASE_ALPHA);
      ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(line.pos, 0);
      ctx.lineTo(line.pos, H);
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

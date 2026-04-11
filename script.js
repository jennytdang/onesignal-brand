// ── Hero Grid Line Glow ───────────────────────
// Draws a grid on a canvas overlay. Grid lines near the cursor
// glow brightly with a trail that lingers and fades out.

(function () {
  const hero = document.getElementById('hero');
  const gridEl = document.getElementById('hero-grid');
  if (!hero || !gridEl) return;

  // Replace the div grid with a canvas
  gridEl.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
  gridEl.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const CELL      = 40;       // grid cell size px
  const RADIUS    = 160;      // cursor influence radius px
  const FADE      = 0.03;     // decay per frame — lower = longer trail
  const MAX_GLOW  = 1.0;      // max line brightness (0–1)
  const BASE_ALPHA = 0.06;    // resting grid line opacity

  let W = 0, H = 0;
  let hLines = [], vLines = []; // each line has { pos, glow }
  let mouseX = -9999, mouseY = -9999;
  let rafId = null;

  function resize() {
    W = hero.offsetWidth;
    H = hero.offsetHeight;
    canvas.width  = W;
    canvas.height = H;

    // Build horizontal lines
    hLines = [];
    for (let y = CELL; y < H; y += CELL) hLines.push({ pos: y, glow: 0 });

    // Build vertical lines
    vLines = [];
    for (let x = CELL; x < W; x += CELL) vLines.push({ pos: x, glow: 0 });
  }

  function render() {
    rafId = requestAnimationFrame(render);

    ctx.clearRect(0, 0, W, H);

    let anyLit = false;

    // Update + draw horizontal lines
    hLines.forEach(line => {
      const dist = Math.abs(line.pos - mouseY);
      const target = dist < RADIUS ? MAX_GLOW * (1 - dist / RADIUS) : 0;
      line.glow = target > line.glow ? target : Math.max(0, line.glow - FADE);
      if (line.glow > 0.005) anyLit = true;

      const alpha = BASE_ALPHA + line.glow * (1 - BASE_ALPHA);
      // Glow: wide soft stroke + sharp center line
      if (line.glow > 0.01) {
        const blurSize = 12 * line.glow;
        ctx.save();
        ctx.filter = `blur(${blurSize}px)`;
        ctx.strokeStyle = `rgba(255,255,255,${(line.glow * 0.5).toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, line.pos);
        ctx.lineTo(W, line.pos);
        ctx.stroke();
        ctx.restore();
      }
      // Crisp line on top
      ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, line.pos);
      ctx.lineTo(W, line.pos);
      ctx.stroke();
    });

    // Update + draw vertical lines
    vLines.forEach(line => {
      const dist = Math.abs(line.pos - mouseX);
      const target = dist < RADIUS ? MAX_GLOW * (1 - dist / RADIUS) : 0;
      line.glow = target > line.glow ? target : Math.max(0, line.glow - FADE);
      if (line.glow > 0.005) anyLit = true;

      const alpha = BASE_ALPHA + line.glow * (1 - BASE_ALPHA);
      if (line.glow > 0.01) {
        const blurSize = 12 * line.glow;
        ctx.save();
        ctx.filter = `blur(${blurSize}px)`;
        ctx.strokeStyle = `rgba(255,255,255,${(line.glow * 0.5).toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(line.pos, 0);
        ctx.lineTo(line.pos, H);
        ctx.stroke();
        ctx.restore();
      }
      ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(line.pos, 0);
      ctx.lineTo(line.pos, H);
      ctx.stroke();
    });

    // Stop animating once everything fades out and cursor is gone
    if (!anyLit && mouseX < -8000) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function startRender() {
    if (!rafId) rafId = requestAnimationFrame(render);
  }

  hero.addEventListener('mousemove', e => {
    mouseX = e.clientX - hero.getBoundingClientRect().left;
    mouseY = e.clientY - hero.getBoundingClientRect().top;
    startRender();
  });

  hero.addEventListener('mouseleave', () => {
    mouseX = -9999;
    mouseY = -9999;
    // keep animating so trail fades naturally
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); startRender(); }, 150);
  });

  resize();
  startRender(); // draw resting state immediately
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

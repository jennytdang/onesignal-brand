// ── Hero Cursor-Reactive Grid ─────────────────
(function () {
  const hero = document.getElementById('hero');
  const grid = document.getElementById('hero-grid');
  if (!hero || !grid) return;

  const CELL_SIZE = 40;
  const RADIUS    = 180;
  const MAX_ALPHA = 0.18;

  let cols = 0, rows = 0, cells = [];
  let mouseX = -9999, mouseY = -9999;
  let rafId = null;

  function build() {
    const w = hero.offsetWidth;
    const h = hero.offsetHeight;
    cols = Math.ceil(w / CELL_SIZE);
    rows = Math.ceil(h / CELL_SIZE);
    grid.style.gridTemplateColumns = `repeat(${cols}, ${CELL_SIZE}px)`;
    grid.style.gridTemplateRows    = `repeat(${rows}, ${CELL_SIZE}px)`;
    grid.innerHTML = '';
    cells = [];
    for (let i = 0; i < cols * rows; i++) {
      const el = document.createElement('div');
      el.className = 'hero-grid-cell';
      grid.appendChild(el);
      cells.push({ el, lit: 0 });
    }
  }

  function render() {
    rafId = null;
    const rect = hero.getBoundingClientRect();
    const lx = mouseX - rect.left;
    const ly = mouseY - rect.top;
    cells.forEach((c, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx  = col * CELL_SIZE + CELL_SIZE / 2;
      const cy  = row * CELL_SIZE + CELL_SIZE / 2;
      const dist = Math.sqrt((cx - lx) ** 2 + (cy - ly) ** 2);
      const alpha = dist < RADIUS ? MAX_ALPHA * (1 - dist / RADIUS) : 0;
      if (Math.abs(alpha - c.lit) > 0.002) {
        c.lit = alpha;
        c.el.style.backgroundColor = alpha > 0
          ? `rgba(255,255,255,${alpha.toFixed(3)})` : 'transparent';
      }
    });
  }

  hero.addEventListener('mousemove', e => {
    mouseX = e.clientX; mouseY = e.clientY;
    if (!rafId) rafId = requestAnimationFrame(render);
  });
  hero.addEventListener('mouseleave', () => {
    mouseX = -9999; mouseY = -9999;
    if (!rafId) rafId = requestAnimationFrame(render);
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 150);
  });

  build();
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

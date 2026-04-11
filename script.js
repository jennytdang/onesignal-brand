// ── Hero Cursor-Reactive Grid ─────────────────
(function () {
  const hero = document.getElementById('hero');
  const grid = document.getElementById('hero-grid');
  if (!hero || !grid) return;

  const CELL_SIZE  = 40;
  const RADIUS     = 180;
  const MAX_ALPHA  = 0.22;
  const DECAY      = 0.015; // how fast the trail fades per frame
  const TRAIL_LEN  = 12;    // how many past positions to remember

  let cols = 0, rows = 0, cells = [];
  let mouseX = -9999, mouseY = -9999;
  let trail = [];           // ring buffer of recent { x, y }
  let rafId = null;
  let animating = false;

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
      cells.push({ el, alpha: 0 });
    }
    trail = [];
  }

  function render() {
    rafId = null;
    const rect = hero.getBoundingClientRect();

    // Build combined influence from current pos + trail history
    // Each trail point fades based on how old it is
    let anyLit = false;

    cells.forEach((c, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx  = col * CELL_SIZE + CELL_SIZE / 2;
      const cy  = row * CELL_SIZE + CELL_SIZE / 2;

      // Current cursor influence
      let peak = 0;
      if (mouseX > -9000) {
        const lx = mouseX - rect.left;
        const ly = mouseY - rect.top;
        const dist = Math.sqrt((cx - lx) ** 2 + (cy - ly) ** 2);
        if (dist < RADIUS) peak = MAX_ALPHA * (1 - dist / RADIUS);
      }

      // Trail influence — older points have less weight
      trail.forEach((pt, ti) => {
        const age    = (trail.length - ti) / trail.length; // 0=new, 1=oldest
        const weight = (1 - age) * 0.7;
        const lx = pt.x - rect.left;
        const ly = pt.y - rect.top;
        const dist = Math.sqrt((cx - lx) ** 2 + (cy - ly) ** 2);
        if (dist < RADIUS * 0.8) {
          peak = Math.max(peak, MAX_ALPHA * (1 - dist / (RADIUS * 0.8)) * weight);
        }
      });

      // Decay existing alpha toward peak — snap up fast, fade slowly
      if (peak > c.alpha) {
        c.alpha = peak; // instant on
      } else {
        c.alpha = Math.max(0, c.alpha - DECAY); // slow decay
      }

      if (c.alpha > 0.001) {
        anyLit = true;
        c.el.style.backgroundColor = `rgba(255,255,255,${c.alpha.toFixed(3)})`;
      } else if (c.alpha <= 0.001 && c.el.style.backgroundColor !== 'transparent') {
        c.alpha = 0;
        c.el.style.backgroundColor = 'transparent';
      }
    });

    // Keep animating while any cell is still glowing
    if (anyLit || mouseX > -9000) {
      rafId = requestAnimationFrame(render);
    } else {
      animating = false;
    }
  }

  function startRender() {
    if (!rafId) rafId = requestAnimationFrame(render);
    animating = true;
  }

  hero.addEventListener('mousemove', e => {
    // Push to trail ring buffer
    trail.push({ x: e.clientX, y: e.clientY });
    if (trail.length > TRAIL_LEN) trail.shift();
    mouseX = e.clientX;
    mouseY = e.clientY;
    startRender();
  });

  hero.addEventListener('mouseleave', () => {
    mouseX = -9999;
    mouseY = -9999;
    startRender(); // let decay animation finish
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

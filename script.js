// ── Hero Grid Line Glow ───────────────────────
(function () {
  const hero = document.getElementById('hero');
  const gridEl = document.getElementById('hero-grid');
  if (!hero || !gridEl) return;

  gridEl.innerHTML = '';

  // Two canvases: base grid (static) + glow layer (animated)
  const baseCanvas = document.createElement('canvas');
  const glowCanvas = document.createElement('canvas');
  [baseCanvas, glowCanvas].forEach(c => {
    c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
    gridEl.appendChild(c);
  });

  const base = baseCanvas.getContext('2d');
  const glow = glowCanvas.getContext('2d');

  const CELL       = 40;
  const RADIUS     = 180;   // glow radius
  const FADE       = 0.025; // trail decay per frame
  const BASE_ALPHA = 0.14;  // resting grid line opacity
  const GLOW_ALPHA = 0.85;  // peak glow line opacity

  let W = 0, H = 0;
  let hLines = [], vLines = [];
  let mouseX = -9999, mouseY = -9999;
  let rafId = null;

  function resize() {
    W = hero.offsetWidth;
    H = hero.offsetHeight;
    baseCanvas.width  = glowCanvas.width  = W;
    baseCanvas.height = glowCanvas.height = H;

    hLines = [];
    for (let y = CELL; y < H; y += CELL) hLines.push({ pos: y, glow: 0 });
    vLines = [];
    for (let x = CELL; x < W; x += CELL) vLines.push({ pos: x, glow: 0 });

    drawBase();
  }

  function drawBase() {
    base.clearRect(0, 0, W, H);
    base.strokeStyle = `rgba(255,255,255,${BASE_ALPHA})`;
    base.lineWidth = 0.5;
    hLines.forEach(l => {
      base.beginPath(); base.moveTo(0, l.pos); base.lineTo(W, l.pos); base.stroke();
    });
    vLines.forEach(l => {
      base.beginPath(); base.moveTo(l.pos, 0); base.lineTo(l.pos, H); base.stroke();
    });
  }

  function render() {
    rafId = requestAnimationFrame(render);
    glow.clearRect(0, 0, W, H);

    // Update glow values
    hLines.forEach(line => {
      const dy = Math.abs(line.pos - mouseY);
      const target = mouseX > -8000 && dy < RADIUS ? (1 - dy / RADIUS) : 0;
      line.glow = target > line.glow ? target : Math.max(0, line.glow - FADE);
    });
    vLines.forEach(line => {
      const dx = Math.abs(line.pos - mouseX);
      const target = mouseX > -8000 && dx < RADIUS ? (1 - dx / RADIUS) : 0;
      line.glow = target > line.glow ? target : Math.max(0, line.glow - FADE);
    });

    // Draw crisp glowing lines at full canvas width/height
    hLines.forEach(line => {
      if (line.glow < 0.005) return;
      glow.strokeStyle = `rgba(255,255,255,${(line.glow * GLOW_ALPHA).toFixed(3)})`;
      glow.lineWidth = 0.5;
      glow.beginPath();
      glow.moveTo(0, line.pos);
      glow.lineTo(W, line.pos);
      glow.stroke();
    });
    vLines.forEach(line => {
      if (line.glow < 0.005) return;
      glow.strokeStyle = `rgba(255,255,255,${(line.glow * GLOW_ALPHA).toFixed(3)})`;
      glow.lineWidth = 0.5;
      glow.beginPath();
      glow.moveTo(line.pos, 0);
      glow.lineTo(line.pos, H);
      glow.stroke();
    });

    // Apply radial gradient mask so glow softly fades at the edges
    // Use 'destination-in' to mask with a soft radial gradient
    if (mouseX > -8000) {
      const grad = glow.createRadialGradient(
        mouseX, mouseY, 0,
        mouseX, mouseY, RADIUS
      );
      grad.addColorStop(0,   'rgba(0,0,0,1)');
      grad.addColorStop(0.5, 'rgba(0,0,0,0.85)');
      grad.addColorStop(1,   'rgba(0,0,0,0)');
      glow.globalCompositeOperation = 'destination-in';
      glow.fillStyle = grad;
      glow.fillRect(0, 0, W, H);
      glow.globalCompositeOperation = 'source-over';
    } else {
      // Cursor gone — let trail fade with its own soft mask centered on last known pos
      glow.globalCompositeOperation = 'destination-in';
      const anyGlow = hLines.some(l => l.glow > 0.005) || vLines.some(l => l.glow > 0.005);
      if (!anyGlow) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      glow.globalCompositeOperation = 'source-over';
    }

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
    startRender();
  });

  hero.addEventListener('mouseleave', () => {
    mouseX = -9999;
    mouseY = -9999;
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); startRender(); }, 150);
  });

  resize();
  startRender();
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

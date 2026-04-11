// ── Hero Cursor-Reactive Grid ─────────────────
(function () {
  const hero = document.getElementById('hero');
  const grid = document.getElementById('hero-grid');
  if (!hero || !grid) return;

  // Config — tune these to taste
  const CONFIG = {
    cellSize:       40,
    glowIntensity:  0.9,    // max brightness of activated cells
    fadeSpeed:      0.03,   // lower = longer trail
    trailLength:    80,     // radius of cursor activation (px)
    gooeyEnabled:   true,   // liquid blending between neighbors
    gooeyStrength:  8,      // influence of neighbors
    pulseEnabled:   false,  // subtle pulse on active cells
    pulseSpeed:     2,      // pulse animation speed
  };

  let cols = 0, rows = 0, cells = [];
  let mouseX = -9999, mouseY = -9999;
  let rafId = null;
  let time = 0;

  function build() {
    const w = hero.offsetWidth;
    const h = hero.offsetHeight;
    cols = Math.ceil(w / CONFIG.cellSize);
    rows = Math.ceil(h / CONFIG.cellSize);
    grid.style.gridTemplateColumns = `repeat(${cols}, ${CONFIG.cellSize}px)`;
    grid.style.gridTemplateRows    = `repeat(${rows}, ${CONFIG.cellSize}px)`;
    grid.innerHTML = '';
    cells = [];
    for (let i = 0; i < cols * rows; i++) {
      const el = document.createElement('div');
      el.className = 'hero-grid-cell';
      grid.appendChild(el);
      cells.push({ el, alpha: 0, raw: 0 });
    }
  }

  function render() {
    rafId = requestAnimationFrame(render);
    time += 0.016;

    const rect = hero.getBoundingClientRect();
    const lx = mouseX - rect.left;
    const ly = mouseY - rect.top;
    const R  = CONFIG.trailLength;

    // Pass 1 — compute raw cursor influence
    cells.forEach((c, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx  = col * CONFIG.cellSize + CONFIG.cellSize / 2;
      const cy  = row * CONFIG.cellSize + CONFIG.cellSize / 2;
      const dist = Math.sqrt((cx - lx) ** 2 + (cy - ly) ** 2);
      const target = dist < R
        ? CONFIG.glowIntensity * (1 - dist / R)
        : 0;

      // Snap up instantly, decay slowly
      if (target > c.raw) {
        c.raw = target;
      } else {
        c.raw = Math.max(0, c.raw - CONFIG.fadeSpeed);
      }
    });

    // Pass 2 — gooey: blend each cell with its neighbors
    let anyLit = false;
    cells.forEach((c, i) => {
      let blended = c.raw;

      if (CONFIG.gooeyEnabled) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        let neighborSum = 0, neighborCount = 0;

        // Sample 4 cardinal neighbors
        const neighbors = [
          i - cols,       // up
          i + cols,       // down
          col > 0 ? i - 1 : -1,       // left
          col < cols - 1 ? i + 1 : -1 // right
        ];

        neighbors.forEach(ni => {
          if (ni >= 0 && ni < cells.length) {
            neighborSum += cells[ni].raw;
            neighborCount++;
          }
        });

        if (neighborCount > 0) {
          const neighborAvg = neighborSum / neighborCount;
          const gooeyInfluence = neighborAvg * (CONFIG.gooeyStrength / 100);
          blended = Math.min(CONFIG.glowIntensity, c.raw + gooeyInfluence);
        }
      }

      // Pulse modifier
      if (CONFIG.pulseEnabled && blended > 0.01) {
        const pulse = 1 + 0.15 * Math.sin(time * CONFIG.pulseSpeed * Math.PI * 2);
        blended = Math.min(CONFIG.glowIntensity, blended * pulse);
      }

      c.alpha = blended;

      if (c.alpha > 0.003) {
        anyLit = true;
        c.el.style.backgroundColor = `rgba(255,255,255,${c.alpha.toFixed(3)})`;
      } else if (c.el.style.backgroundColor !== 'transparent') {
        c.alpha = 0;
        c.el.style.backgroundColor = 'transparent';
      }
    });

    // Stop loop if nothing is lit and cursor is outside
    if (!anyLit && mouseX < -8000) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function startRender() {
    if (!rafId) rafId = requestAnimationFrame(render);
  }

  hero.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    startRender();
  });

  hero.addEventListener('mouseleave', () => {
    mouseX = -9999;
    mouseY = -9999;
    // keep animating so trail fades out naturally
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

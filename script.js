// ── Pixel Strip Transition ────────────────────
// Scroll-driven wipe: Purple 500 → accent colors → white.
// Uses requestAnimationFrame for buttery smoothness — no setTimeout timers.
// Each pixel has two thresholds: one for the accent flash, one for white.
// Progress is purely positional — scrubbing back reverses the effect.

(function () {
  const strip = document.getElementById('pixel-strip');
  if (!strip) return;

  const SIZE     = 24;
  const BG_COLOR = '#7274DA'; // Purple 500
  const WHITE    = '#ffffff';

  // Supplemental palette — every pixel gets one assigned at build time
  const ACCENTS = [
    '#4DA6EF', // Blue 400
    '#4DA6EF',
    '#31E1DE', // Cyan 300
    '#31E1DE',
    '#FFC072', // Yellow 300
    '#4E50D1', // Purple 600
  ];

  function pickAccent(i) {
    const h = (Math.imul(i ^ (i >>> 16), 0x45d9f3b) >>> 0);
    return ACCENTS[h % ACCENTS.length];
  }

  let pixels = [];
  let cols = 0, rows = 0;
  let rafId = null;
  let scrollY = window.scrollY;

  function build() {
    const w = strip.offsetWidth;
    const h = strip.offsetHeight;
    cols = Math.ceil(w / SIZE);
    rows = Math.ceil(h / SIZE);
    const needed = cols * rows;

    while (pixels.length < needed) {
      const i   = pixels.length;
      const row = Math.floor(i / cols);
      const el  = document.createElement('div');
      el.className = 'px';
      strip.appendChild(el);

      // Row bias: bottom rows flip first, top rows last
      const rowFrac = row / Math.max(rows - 1, 1); // 0=top, 1=bottom
      const base    = 1 - rowFrac;
      const jitter  = (Math.random() - 0.5) * 0.4;

      // t1 = when accent color appears, t2 = when white appears (slightly after)
      const t1 = Math.min(0.97, Math.max(0.03, base + jitter));
      const t2 = Math.min(0.99, t1 + 0.06 + Math.random() * 0.06);

      pixels.push({ el, t1, t2, accent: pickAccent(i), color: null });
    }

    while (pixels.length > needed) pixels.pop().el.remove();

    pixels.forEach(({ el }, i) => {
      el.style.left       = (i % cols) * SIZE + 'px';
      el.style.top        = Math.floor(i / cols) * SIZE + 'px';
      el.style.transition = 'none';
      el.style.backgroundColor = BG_COLOR;
    });

    // Render immediately at a starting progress so the pixelated edge
    // is visible on page load — no solid cutoff
    requestAnimationFrame(() => {
      const progress = getProgress();
      // If strip is already partially visible (e.g. short viewport), use real progress.
      // Otherwise seed with 0.18 so bottom rows are already pixelated on load.
      const initProgress = Math.max(progress, 0.18);
      pixels.forEach(p => {
        let target;
        if (initProgress < p.t1)      target = BG_COLOR;
        else if (initProgress < p.t2) target = p.accent;
        else                          target = WHITE;
        p.color = target;
        p.el.style.backgroundColor = target;
      });
    });
  }

  function getProgress() {
    const rect  = strip.getBoundingClientRect();
    const vh    = window.innerHeight;
    // Start when strip enters viewport from bottom, end when it exits at top
    // Compress to 70% of scroll range so transition feels snappy
    const traveled = vh - rect.top;
    const range    = strip.offsetHeight + vh * 0.7;
    return Math.min(1, Math.max(0, traveled / range));
  }

  function render() {
    rafId = null;
    const progress = getProgress();

    pixels.forEach(p => {
      let target;
      if (progress <= 0)         target = BG_COLOR;
      else if (progress < p.t1)  target = BG_COLOR;
      else if (progress < p.t2)  target = p.accent;
      else                       target = WHITE;

      if (p.color !== target) {
        p.color = target;
        // Smooth transition on change — ease-out feels closer to Framer
        p.el.style.transition    = 'background-color 200ms ease-out';
        p.el.style.backgroundColor = target;
      }
    });
  }

  function onScroll() {
    scrollY = window.scrollY;
    if (!rafId) rafId = requestAnimationFrame(render);
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 150);
  });

  build();
})();

// Active nav on scroll
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

// Copy to clipboard
const toast = document.getElementById('toast');
let toastTimer;

document.querySelectorAll('.copy-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    navigator.clipboard.writeText(btn.dataset.copy).then(() => {
      clearTimeout(toastTimer);
      toast.classList.add('show');
      toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
    });
  });
});

// Mobile menu
const menuBtn = document.getElementById('menuBtn');
const sidebar = document.getElementById('sidebar');

menuBtn.addEventListener('click', () => {
  sidebar.classList.toggle('open');
});

// Close sidebar when a nav link is clicked on mobile
navLinks.forEach(link => {
  link.addEventListener('click', () => {
    sidebar.classList.remove('open');
  });
});

// ── AI Microcopy Assistant ────────────────────

function formatAIResponse(text) {
  // Convert **bold** to <strong>
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Highlight copy suggestions that follow "Recommended copy:" or "Primary:" or similar
  text = text.replace(/Recommended copy:\s*\n?(.*?)(?=\n|Alternatives:|$)/gi, (match, suggestion) => {
    return `<p><strong>Recommended copy:</strong></p><div class="copy-suggestion">${suggestion.replace(/["'"]/g, '').trim()}</div>`;
  });

  text = text.replace(/Alternatives?:\s*\n?/gi, '<p><strong>Alternatives:</strong></p>');

  // Convert numbered lists
  text = text.replace(/^\d+\.\s+(.+)$/gm, (match, item) => {
    // If this looks like a copy alt option (short, quotey), style it
    if (item.length < 80 && (item.includes('"') || item.includes('\u2018') || item.startsWith('-'))) {
      return `<div class="copy-suggestion-alt">${item.replace(/["'""\u2018\u2019]/g, '').trim()}</div>`;
    }
    return `<p style="margin: 6px 0 6px 16px;">• ${item}</p>`;
  });

  // Bullet points
  text = text.replace(/^[-•]\s+(.+)$/gm, '<p style="margin: 6px 0 6px 16px;">• $1</p>');

  // Paragraphs
  text = text.split('\n\n').map(p => {
    p = p.trim();
    if (!p) return '';
    if (p.startsWith('<')) return p;
    return `<p style="margin-bottom: 10px;">${p}</p>`;
  }).join('');

  return text;
}

async function getAICopyRecommendation(elementType, currentCopy, context) {
  const response = await fetch('/api/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ elementType, currentCopy, context })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.text;
}

const aiSubmit = document.getElementById('aiSubmit');
const aiLoading = document.getElementById('aiLoading');
const aiResponse = document.getElementById('aiResponse');
const aiResponseBody = document.getElementById('aiResponseBody');
const aiClear = document.getElementById('aiClear');
const aiFormArea = document.querySelector('.ai-form-area');

aiSubmit.addEventListener('click', async () => {
  const elementType = document.getElementById('uiElementType').value;
  const currentCopy = document.getElementById('currentCopy').value.trim();
  const context = document.getElementById('context').value.trim();

  if (!context && !currentCopy) {
    document.getElementById('context').focus();
    document.getElementById('context').style.borderColor = '#E24B4A';
    setTimeout(() => document.getElementById('context').style.borderColor = '', 2000);
    return;
  }

  aiFormArea.style.display = 'none';
  aiResponse.style.display = 'none';
  aiLoading.style.display = 'flex';

  try {
    const result = await getAICopyRecommendation(elementType, currentCopy, context);
    aiResponseBody.innerHTML = formatAIResponse(result);
    aiLoading.style.display = 'none';
    aiResponse.style.display = 'block';
  } catch (err) {
    aiLoading.style.display = 'none';
    aiFormArea.style.display = 'flex';
    alert('Could not get a recommendation — check your connection and try again.');
    console.error(err);
  }
});

aiClear.addEventListener('click', () => {
  aiResponse.style.display = 'none';
  aiFormArea.style.display = 'flex';
  document.getElementById('context').value = '';
  document.getElementById('currentCopy').value = '';
  document.getElementById('uiElementType').value = '';
});

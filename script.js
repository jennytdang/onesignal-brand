// ── Pixel Strip Transition ────────────────────
// Matches the Framer PixelScrollTransition component exactly:
// - A fixed-height strip sits between the hero (gradient) and white page content
// - Strip background = hero gradient color (continues visually from hero)
// - Each pixel has a random threshold (0–1)
// - As the strip scrolls into view, pixels whose threshold < scroll progress
//   flip: first to a brand accent color, then immediately to white (#fff)
// - Bottom rows flip first (fills bottom-up), top rows last
// - Result: gradient "dissolves" into white pixel by pixel

(function () {
  const strip = document.getElementById('pixel-strip');
  if (!strip) return;

  const SIZE = 24;

  // OneSignal brand colors used as accent flashes (like Framer's "accent pixels")
  const BRAND_COLORS = [
    '#4E50D1', // Purple 600
    '#7274DA', // Purple 500
    '#4DA6EF', // Blue 400
    '#31E1DE', // Cyan 300
    '#FFC072', // Yellow 300
  ];
  const ACCENT_SHARE = 0.20; // 20% of pixels flash a brand color before going white

  let pixels = [];
  let cols = 0, rows = 0;
  let lastProgress = -1;

  // Each pixel gets a color: brand accent or white (determined once, deterministically)
  function pickColor(i) {
    const hash = Math.imul(i ^ (i >>> 16), 0x45d9f3b) >>> 0;
    if ((hash % 100) < (ACCENT_SHARE * 100)) {
      return BRAND_COLORS[hash % BRAND_COLORS.length];
    }
    return '#ffffff';
  }

  function build() {
    const w = strip.offsetWidth;
    const h = strip.offsetHeight;
    cols = Math.ceil(w / SIZE);
    rows = Math.ceil(h / SIZE);
    const needed = cols * rows;

    while (pixels.length < needed) {
      const i = pixels.length;
      const row = Math.floor(i / cols);
      const el = document.createElement('div');
      el.className = 'px';
      strip.appendChild(el);

      // Threshold: bottom rows flip first (threshold near 0), top rows last (near 1)
      // Add per-pixel randomness within each row so it scatters, not a clean line
      const rowFrac = row / Math.max(rows - 1, 1); // 0=top, 1=bottom
      const baseThreshold = 1 - rowFrac; // bottom=0, top=1
      const jitter = (Math.random() - 0.5) * 0.3;
      const threshold = Math.min(1, Math.max(0, baseThreshold + jitter));

      pixels.push({ el, threshold, color: pickColor(i), state: 'bg' });
    }

    while (pixels.length > needed) {
      pixels.pop().el.remove();
    }

    pixels.forEach(({ el }, i) => {
      el.style.left = (i % cols) * SIZE + 'px';
      el.style.top  = Math.floor(i / cols) * SIZE + 'px';
    });

    lastProgress = -1;
    update();
  }

  function getProgress() {
    // progress 0 = strip bottom just entering viewport
    // progress 1 = strip top at viewport top (fully scrolled through)
    const rect = strip.getBoundingClientRect();
    const vh = window.innerHeight;
    // Start when strip bottom enters viewport, end when strip top exits
    return Math.min(1, Math.max(0, (vh - rect.top) / (vh + strip.offsetHeight)));
  }

  function update() {
    const progress = getProgress();
    if (Math.abs(progress - lastProgress) < 0.002) return;
    lastProgress = progress;

    pixels.forEach(p => {
      if (progress >= p.threshold) {
        // Flipped — show accent color or white
        if (p.state !== 'flipped') {
          p.state = 'flipped';
          p.el.style.transition = 'background-color 120ms linear';
          p.el.style.backgroundColor = p.color;
          // If it's a brand accent, burn to white shortly after
          if (p.color !== '#ffffff') {
            setTimeout(() => {
              p.el.style.backgroundColor = '#ffffff';
            }, 140);
          }
        }
      } else {
        // Not yet flipped — transparent (strip background shows through)
        if (p.state !== 'bg') {
          p.state = 'bg';
          p.el.style.transition = 'background-color 120ms linear';
          p.el.style.backgroundColor = 'transparent';
        }
      }
    });
  }

  window.addEventListener('scroll', update, { passive: true });

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

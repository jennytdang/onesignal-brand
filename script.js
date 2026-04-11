// ── Pixel Strip — Framer-faithful scroll wipe ─────────────────────────────────
//
// How the Framer PixelScrollTransition actually works (from source HTML):
//
//   • The strip fills entirely with 24×24px divs, ALL starting as the bg color
//   • Each pixel gets a random "flip threshold" (0–1)
//   • As scroll progress rises, a tight BAND sweeps upward through the strip
//   • Pixels whose threshold falls inside the band get an ACCENT color
//   • Pixels whose threshold is BELOW the band (already swept) become WHITE
//   • Pixels whose threshold is ABOVE the band stay the BG color (Purple 500)
//   • Accent colors are SPARSE (~15% of pixels) — the rest go bg→white directly
//   • The band is narrow (~0.08 wide) so you see a crisp, scattered edge
//
// Progress is scroll-driven: 0 = strip bottom enters viewport, 1 = strip fully white

(function () {
  const strip = document.getElementById('pixel-strip');
  if (!strip) return;

  const SIZE = 24;
  const BG_COLOR     = '#7274DA'; // Purple 500 — matches hero exactly
  const WHITE        = '#ffffff';
  const BAND_WIDTH   = 0.08;      // tight band, like Framer

  // Supplemental colors — sparse accent flashes during the wipe
  // Weighted: mostly cyan/blue, occasional yellow, rare purple
  const ACCENTS = [
    '#31E1DE', // Cyan 300
    '#31E1DE',
    '#4DA6EF', // Blue 400
    '#4DA6EF',
    '#FFC072', // Yellow 300
    '#4E50D1', // Purple 600
  ];
  const ACCENT_PROB = 0.15; // 15% of pixels get an accent flash

  let pixels = [];
  let cols = 0, rows = 0;
  let lastProgress = -1;

  function buildPixels(count) {
    while (pixels.length < count) {
      const i = pixels.length;
      const el = document.createElement('div');
      el.className = 'px';
      strip.appendChild(el);

      // Pre-assign whether this pixel gets an accent or goes straight to white
      const isAccent = Math.random() < ACCENT_PROB;
      const accentColor = isAccent
        ? ACCENTS[Math.floor(Math.random() * ACCENTS.length)]
        : null;

      // Pure random threshold — no row bias. The Framer "Random" pattern is fully random.
      const threshold = Math.random();

      pixels.push({ el, threshold, accentColor, lastColor: null });
    }
    while (pixels.length > count) {
      pixels.pop().el.remove();
    }
  }

  function build() {
    const w = strip.offsetWidth;
    const h = strip.offsetHeight;
    cols = Math.ceil(w / SIZE);
    rows = Math.ceil(h / SIZE);
    const needed = cols * rows;

    buildPixels(needed);

    pixels.forEach(({ el }, i) => {
      el.style.left = (i % cols) * SIZE + 'px';
      el.style.top  = Math.floor(i / cols) * SIZE + 'px';
      el.style.transition = 'background-color 120ms linear';
    });

    lastProgress = -1;
    update();
  }

  function setColor(p, color) {
    if (p.lastColor === color) return;
    p.lastColor = color;
    p.el.style.backgroundColor = color;
  }

  function getProgress() {
    const rect = strip.getBoundingClientRect();
    const vh   = window.innerHeight;
    // Start when strip bottom enters viewport, complete when strip top exits
    // Tighten range so transition completes before strip scrolls past
    const traveled = vh - rect.top;
    const total    = vh + strip.offsetHeight;
    return Math.min(1, Math.max(0, traveled / total));
  }

  function update() {
    const p = getProgress();
    if (Math.abs(p - lastProgress) < 0.0005) return;
    lastProgress = p;

    const bandLo = p - BAND_WIDTH;
    const bandHi = p;

    pixels.forEach(px => {
      const t = px.threshold;

      if (t > bandHi) {
        // Above the band — not yet swept, still bg color
        setColor(px, BG_COLOR);
      } else if (t >= bandLo) {
        // Inside the band — accent flash or white
        setColor(px, px.accentColor || WHITE);
      } else {
        // Below the band — already swept, white
        setColor(px, WHITE);
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

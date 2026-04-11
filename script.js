// ── Pixel Strip Transition ────────────────────
// Purple 500 bg → supplemental colors scatter in randomly → burn to white
// Scroll-driven: transition starts when strip enters viewport (below the fold).
// Each pixel has a random threshold. As scroll progress rises, pixels flip:
//   transparent (showing Purple 500 bg) → supplemental color → white
// Bottom rows flip first for a natural bottom-up reveal.

(function () {
  const strip = document.getElementById('pixel-strip');
  if (!strip) return;

  const SIZE = 24;

  // OneSignal supplemental colors — these are what pop in before white
  const ACCENT_COLORS = [
    '#4DA6EF', // Blue 400
    '#31E1DE', // Cyan 300
    '#FFC072', // Yellow 300
    '#4E50D1', // Purple 600 (darker pop against Purple 500 bg)
  ];

  // Every pixel gets a supplemental color (not white yet — white is the final state)
  function pickColor(i) {
    const hash = Math.imul(i ^ (i >>> 16), 0x45d9f3b) >>> 0;
    return ACCENT_COLORS[hash % ACCENT_COLORS.length];
  }

  let pixels = [];
  let cols = 0, rows = 0;
  let lastProgress = -1;

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

      // Threshold: 0 = flips earliest (bottom rows), 1 = flips last (top rows)
      // rowFrac: 0 = top row, 1 = bottom row
      const rowFrac = row / Math.max(rows - 1, 1);
      // Bottom rows have lower threshold so they flip first
      const base = 1 - rowFrac;
      // Jitter per pixel so the edge is scattered, not a hard horizontal line
      const jitter = (Math.random() - 0.5) * 0.35;
      const threshold = Math.min(0.98, Math.max(0.02, base + jitter));

      pixels.push({
        el,
        threshold,
        accentColor: pickColor(i),
        state: 'bg',          // bg | accent | white
        accentTimer: null,
      });
    }

    while (pixels.length > needed) {
      const p = pixels.pop();
      clearTimeout(p.accentTimer);
      p.el.remove();
    }

    pixels.forEach(({ el }, i) => {
      el.style.left = (i % cols) * SIZE + 'px';
      el.style.top  = Math.floor(i / cols) * SIZE + 'px';
    });

    lastProgress = -1;
    update();
  }

  function getProgress() {
    // 0 = strip top is at bottom of viewport (just coming into view)
    // 1 = strip bottom has left the top of the viewport
    // We want the transition to drive through the strip as it scrolls up through the viewport.
    const rect = strip.getBoundingClientRect();
    const vh   = window.innerHeight;
    // Start: strip.top === vh  (strip entering viewport from bottom)
    // End:   strip.bottom === 0 (strip top about to leave viewport top)
    const start = rect.top - vh;   // negative once strip enters viewport
    const end   = rect.bottom;     // distance from strip bottom to viewport top
    const total = strip.offsetHeight + vh;
    return Math.min(1, Math.max(0, -start / total));
  }

  function setPixelState(p, newState) {
    if (p.state === newState) return;
    p.state = newState;

    clearTimeout(p.accentTimer);

    if (newState === 'bg') {
      p.el.style.transition = 'background-color 120ms linear';
      p.el.style.backgroundColor = 'transparent';
    } else if (newState === 'accent') {
      // Flash the supplemental color…
      p.el.style.transition = 'background-color 120ms linear';
      p.el.style.backgroundColor = p.accentColor;
      // …then burn to white after a short hold
      p.accentTimer = setTimeout(() => {
        if (p.state === 'accent') {
          p.state = 'white';
          p.el.style.transition = 'background-color 160ms linear';
          p.el.style.backgroundColor = '#ffffff';
        }
      }, 180);
    } else if (newState === 'white') {
      p.el.style.transition = 'background-color 120ms linear';
      p.el.style.backgroundColor = '#ffffff';
    }
  }

  function update() {
    const progress = getProgress();
    if (Math.abs(progress - lastProgress) < 0.001) return;
    lastProgress = progress;

    pixels.forEach(p => {
      if (progress <= 0) {
        // Strip not in view yet — all transparent (Purple 500 bg shows)
        setPixelState(p, 'bg');
      } else if (progress >= p.threshold) {
        // This pixel has crossed its threshold — trigger accent→white
        if (p.state === 'bg') setPixelState(p, 'accent');
      } else {
        // Not yet reached — keep transparent
        if (p.state !== 'bg' && p.state !== 'accent' && p.state !== 'white') {
          setPixelState(p, 'bg');
        }
        // If scrolling back up and pixel was white, reverse it
        if (p.state === 'white') setPixelState(p, 'bg');
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

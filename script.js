// ── Pixel Hero Canvas ─────────────────────────
// Scroll-driven pixel transition: brand colors → white as you scroll past the hero.
// Each pixel has a random threshold. When scroll progress passes that threshold,
// the pixel snaps to its brand color, then burns to white — exactly like the Framer component.

(function () {
  const canvas = document.getElementById('pixel-canvas');
  const hero   = canvas && canvas.closest('.hero');
  if (!canvas || !hero) return;

  const SIZE = 24;
  const TRANSITION_MS = 120; // matches Framer's 120ms linear

  // OneSignal brand palette used as accent colors in the transition band
  const BRAND_COLORS = [
    '#4E50D1', // Purple 600
    '#7274DA', // Purple 500
    '#4DA6EF', // Blue 400
    '#31E1DE', // Cyan 300
    '#FFC072', // Yellow 300
  ];

  // ~20% of pixels get a brand color accent; the rest go straight to white
  // This matches Framer's "accent share" concept
  const ACCENT_SHARE = 0.22;

  let pixels = [];    // { el, threshold, color, state }
  let cols = 0, rows = 0;
  let lastProgress = -1;

  function pickColor(i) {
    // Deterministically assign accent vs white per pixel based on index + salt
    const salt = (i * 2654435761) >>> 0; // cheap hash
    return (salt % 100) < (ACCENT_SHARE * 100)
      ? BRAND_COLORS[salt % BRAND_COLORS.length]
      : '#ffffff';
  }

  function build() {
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    cols = Math.ceil(w / SIZE);
    rows = Math.ceil(h / SIZE);
    const needed = cols * rows;

    // Add
    while (pixels.length < needed) {
      const i = pixels.length;
      const el = document.createElement('div');
      el.className = 'px';
      canvas.appendChild(el);
      pixels.push({
        el,
        threshold: Math.random(), // random flip point in 0–1 scroll range
        color: pickColor(i),
        state: 'off',  // off | accent | white
      });
    }
    // Remove
    while (pixels.length > needed) {
      pixels.pop().el.remove();
    }

    // Position
    pixels.forEach(({ el }, i) => {
      el.style.left = (i % cols) * SIZE + 'px';
      el.style.top  = Math.floor(i / cols) * SIZE + 'px';
      el.style.transition = `background-color ${TRANSITION_MS}ms linear`;
    });

    lastProgress = -1; // force redraw
    applyScroll();
  }

  function getProgress() {
    // 0 = hero top at viewport top
    // 1 = hero fully scrolled out (bottom of hero at top of viewport)
    const rect = hero.getBoundingClientRect();
    const heroH = hero.offsetHeight;
    // We want the effect to complete as the hero scrolls away.
    // progress goes from 0→1 as scroll goes from 0 → heroH
    return Math.min(1, Math.max(0, -rect.top / heroH));
  }

  // Band width: how wide (in progress units) the transition zone is.
  // A narrower band = sharper wipe. 0.25 gives a nice soft scatter.
  const BAND = 0.3;

  function applyScroll() {
    const progress = getProgress();
    if (Math.abs(progress - lastProgress) < 0.001) return;
    lastProgress = progress;

    pixels.forEach(p => {
      const t = p.threshold;

      if (progress <= 0) {
        // Fully at top — all pixels off (transparent, hero gradient shows through)
        if (p.state !== 'off') {
          p.state = 'off';
          p.el.style.backgroundColor = 'transparent';
        }
        return;
      }

      // localP: how far this pixel is through its own transition (0=not started, 1=fully white)
      // pixel starts turning when progress > threshold - BAND/2
      // pixel finishes (turns white) when progress > threshold + BAND/2
      const localP = Math.min(1, Math.max(0, (progress - (t - BAND / 2)) / BAND));

      if (localP <= 0) {
        // Not yet reached — transparent
        if (p.state !== 'off') {
          p.state = 'off';
          p.el.style.backgroundColor = 'transparent';
        }
      } else if (localP < 0.5) {
        // In first half of band — show brand/accent color
        if (p.state !== 'accent') {
          p.state = 'accent';
          p.el.style.backgroundColor = p.color;
        }
      } else {
        // Past midpoint — burn to white
        if (p.state !== 'white') {
          p.state = 'white';
          p.el.style.backgroundColor = '#ffffff';
        }
      }
    });
  }

  window.addEventListener('scroll', applyScroll, { passive: true });

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

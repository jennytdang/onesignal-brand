// ── Pixel Hero Canvas ─────────────────────────

(function () {
  const canvas = document.getElementById('pixel-canvas');
  if (!canvas) return;

  const SIZE = 24;
  // Colors pulled from the OneSignal brand palette + white/transparent for sparsity
  const COLORS = [
    'rgba(255,255,255,0.18)',
    'rgba(255,255,255,0.32)',
    'rgba(255,255,255,0.08)',
    'rgba(49,225,222,0.5)',   // Cyan 300
    'rgba(255,192,114,0.45)', // Yellow 300
    'rgba(78,80,209,0.6)',    // Purple 600
    'rgba(77,166,239,0.45)',  // Blue 400
    'transparent',
    'transparent',
    'transparent',
    'transparent',
    'transparent',
  ];

  let pixels = [];
  let cols = 0;
  let rows = 0;
  let intervalId = null;

  function build() {
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    cols = Math.ceil(w / SIZE);
    rows = Math.ceil(h / SIZE);
    const needed = cols * rows;

    // Add missing pixels
    while (pixels.length < needed) {
      const el = document.createElement('div');
      el.className = 'px';
      canvas.appendChild(el);
      pixels.push(el);
    }
    // Remove extras
    while (pixels.length > needed) {
      const el = pixels.pop();
      el.remove();
    }

    // Position all
    pixels.forEach((el, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      el.style.left = col * SIZE + 'px';
      el.style.top = row * SIZE + 'px';
    });
  }

  function flicker() {
    // Randomly light up ~3% of pixels each tick
    const count = Math.max(1, Math.floor(pixels.length * 0.03));
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * pixels.length);
      pixels[idx].style.backgroundColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    }
  }

  function start() {
    build();
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(flicker, 120);
  }

  // Rebuild on resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { build(); }, 150);
  });

  start();
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

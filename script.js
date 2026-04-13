// ── Hero Pixel Cursor Trail ───────────────────
// Spawns glowing pixel squares that follow the cursor and fade out.
// Grid lines stay as static background, trail is a separate canvas on top.

(function () {
  const hero = document.getElementById('hero');
  const gridEl = document.getElementById('hero-grid');
  if (!hero || !gridEl) return;

  gridEl.innerHTML = '';

  // Trail canvas only — no grid lines
  const trailCanvas = document.createElement('canvas');
  trailCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;mix-blend-mode:screen;';
  gridEl.appendChild(trailCanvas);
  const tctx = trailCanvas.getContext('2d');

  const CELL        = 40;
  const TRAIL_LIFE  = 55;
  const SPAWN_DIST  = 12;
  const MAX_PIXELS  = 120;
  const COLORS      = [
    [255, 255, 255],
    [255, 255, 255],
    [255, 255, 255],
    [77,  166, 239],  // Blue 400
    [49,  225, 222],  // Cyan 300
    [255, 192, 114],  // Yellow 300
  ];

  let W = 0, H = 0, dpr = 1;
  let particles = [];
  let lastX = -1, lastY = -1, distAccum = 0;
  let rafId = null;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = hero.offsetWidth;
    H = hero.offsetHeight;
    trailCanvas.width  = Math.round(W * dpr);
    trailCanvas.height = Math.round(H * dpr);
    trailCanvas.style.width  = W + 'px';
    trailCanvas.style.height = H + 'px';
  }

  function spawnPixel(x, y) {
    // Snap to nearest grid cell
    const col = Math.round(x / CELL) * CELL;
    const row = Math.round(y / CELL) * CELL;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    // Don't stack too many on same cell
    const existing = particles.filter(p => p.col === col && p.row === row);
    if (existing.length > 1) return;

    particles.push({
      col, row,
      color,
      life: TRAIL_LIFE,
      maxLife: TRAIL_LIFE,
    });

    if (particles.length > MAX_PIXELS) particles.shift();
  }

  function render() {
    rafId = requestAnimationFrame(render);

    tctx.setTransform(1, 0, 0, 1, 0, 0);
    tctx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);

    let anyAlive = false;

    particles = particles.filter(p => p.life > 0);

    particles.forEach(p => {
      p.life--;
      const progress = p.life / p.maxLife;  // 1 = fresh, 0 = dead

      // Ease out — bright flash then slow fade
      const alpha = Math.pow(progress, 0.6) * 0.75;

      if (alpha < 0.005) return;
      anyAlive = true;

      const [r, g, b] = p.color;

      // Physical pixel coords
      const px = Math.round(p.col * dpr);
      const py = Math.round(p.row * dpr);
      const ps = Math.round(CELL * dpr);

      // Crisp pixel square only — no glow
      tctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
      tctx.fillRect(px, py, ps, ps);
    });

    if (!anyAlive) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function startRender() {
    if (!rafId) rafId = requestAnimationFrame(render);
  }

  hero.addEventListener('mousemove', e => {
    const rect = hero.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (lastX >= 0) {
      const dx = x - lastX;
      const dy = y - lastY;
      distAccum += Math.sqrt(dx * dx + dy * dy);

      while (distAccum >= SPAWN_DIST) {
        distAccum -= SPAWN_DIST;
        spawnPixel(x, y);
      }
    } else {
      spawnPixel(x, y);
    }

    lastX = x;
    lastY = y;
    startRender();
  });

  hero.addEventListener('mouseleave', () => {
    lastX = -1;
    lastY = -1;
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); }, 150);
  });

  resize();
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

// ── Nav click: scroll precisely to section top ─
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    const href = link.getAttribute('href');
    if (!href || !href.startsWith('#')) return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

// ── Copy to clipboard ─────────────────────────
const toast = document.getElementById('toast');
let toastTimer;

document.querySelectorAll('.color-card[data-copy], .scale-swatch[data-copy]').forEach(el => {
  el.addEventListener('click', () => {
    navigator.clipboard.writeText(el.dataset.copy).then(() => {
      clearTimeout(toastTimer);
      toast.textContent = `Copied ${el.dataset.copy}`;
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

// ── Icon Grid ─────────────────────────────────
(function () {
  // Real Figma asset URLs — Purple-600 icons
  const icons = [
    // Alerts & Status
    { name: 'alert',        url: 'https://www.figma.com/api/mcp/asset/b4b1c7c3-a744-4ba0-9d10-d7c9b7c2da87', category: 'Alerts & Status' },
    { name: 'alert-2',      url: 'https://www.figma.com/api/mcp/asset/65648b8a-5939-4a7c-bf7b-19f64c3a26de', category: 'Alerts & Status' },
    { name: 'alert-3',      url: 'https://www.figma.com/api/mcp/asset/6df21557-d41d-49f2-b136-a600987bd055', category: 'Alerts & Status' },
    { name: 'alert-4',      url: 'https://www.figma.com/api/mcp/asset/2582a848-36d7-40ec-8502-2584ac55af2b', category: 'Alerts & Status' },
    { name: 'alert-off',    url: 'https://www.figma.com/api/mcp/asset/0926e700-d4e6-4159-8bd0-820d81ca3d13', category: 'Alerts & Status' },
    { name: 'information',  url: 'https://www.figma.com/api/mcp/asset/84f1c791-9595-44bc-9378-96da5d88bb0a', category: 'Alerts & Status' },
    { name: 'checkmark',    url: 'https://www.figma.com/api/mcp/asset/75f00398-e3f2-4780-a0aa-1d5f783c5a49', category: 'Alerts & Status' },
    { name: 'checkmark-2',  url: 'https://www.figma.com/api/mcp/asset/c226f40c-af2a-4896-88fd-228d960f1f89', category: 'Alerts & Status' },
    { name: 'block',        url: 'https://www.figma.com/api/mcp/asset/a1cc7bbd-536b-46ab-a795-f35890f05c0f', category: 'Alerts & Status' },
    { name: 'shield',       url: 'https://www.figma.com/api/mcp/asset/56e93ee8-5d7d-41eb-8ee5-1881efe119de', category: 'Alerts & Status' },
    { name: 'lock',         url: 'https://www.figma.com/api/mcp/asset/de8872ef-6234-42fe-858e-811ebaee6a1b', category: 'Alerts & Status' },
    { name: 'firewall',     url: 'https://www.figma.com/api/mcp/asset/4e7a5a36-eadd-470b-8d8c-8f4cbb7898f0', category: 'Alerts & Status' },
    // Analytics & Data
    { name: 'analytics',    url: 'https://www.figma.com/api/mcp/asset/e50ac26a-b863-416b-96e4-1dae5ceefe14', category: 'Analytics & Data' },
    { name: 'analytics-2',  url: 'https://www.figma.com/api/mcp/asset/14e03558-66c5-4bc5-bdd8-b00beadf9d49', category: 'Analytics & Data' },
    { name: 'analytics-3',  url: 'https://www.figma.com/api/mcp/asset/86ff2512-ac3d-45af-aefd-adeaca9ab676', category: 'Analytics & Data' },
    { name: 'analytics-4',  url: 'https://www.figma.com/api/mcp/asset/9bd98e35-09cc-424a-8368-41732c0c198a', category: 'Analytics & Data' },
    { name: 'analytics-5',  url: 'https://www.figma.com/api/mcp/asset/82a95653-5743-433a-8679-a1f90ecb81a4', category: 'Analytics & Data' },
    { name: 'data',         url: 'https://www.figma.com/api/mcp/asset/0f1a1dda-ade2-42eb-b781-f87f81652cab', category: 'Analytics & Data' },
    { name: 'data-2',       url: 'https://www.figma.com/api/mcp/asset/d262d9f5-3e5e-450c-a5bd-a66298630e7e', category: 'Analytics & Data' },
    { name: 'data-3',       url: 'https://www.figma.com/api/mcp/asset/c791c2f0-a7d0-46b7-8949-89ad62fc6642', category: 'Analytics & Data' },
    { name: 'data-4',       url: 'https://www.figma.com/api/mcp/asset/d6e3915c-1ceb-4e59-9413-9f7ff1b4beb9', category: 'Analytics & Data' },
    { name: 'presentation', url: 'https://www.figma.com/api/mcp/asset/60c9ec42-2f59-4495-ae4c-893501420fe7', category: 'Analytics & Data' },
    { name: 'strategy',     url: 'https://www.figma.com/api/mcp/asset/e3d497c5-be89-4092-8bc9-0cea9a1f5615', category: 'Analytics & Data' },
    // Messaging
    { name: 'push',         url: 'https://www.figma.com/api/mcp/asset/8ca4e9d7-5429-4de1-ad87-033d02aeb1b7', category: 'Messaging' },
    { name: 'sms',          url: 'https://www.figma.com/api/mcp/asset/5ed65b40-a83e-4c0f-aff8-ac4bcd8110ca', category: 'Messaging' },
    { name: 'email',        url: 'https://www.figma.com/api/mcp/asset/1b17e72e-3fcd-4b7c-94fe-2952b6faed28', category: 'Messaging' },
    { name: 'email-2',      url: 'https://www.figma.com/api/mcp/asset/44af18ef-6d27-4fbc-8197-50cd165ad5ed', category: 'Messaging' },
    { name: 'inapp-message',url: 'https://www.figma.com/api/mcp/asset/3a60adc1-e9bc-46fb-9483-693816b7f0e8', category: 'Messaging' },
    { name: 'mobile-push',  url: 'https://www.figma.com/api/mcp/asset/e96009e7-5db4-4ac6-a48a-fdbc2f79a59e', category: 'Messaging' },
    { name: 'web-push',     url: 'https://www.figma.com/api/mcp/asset/6ea75fc4-664d-46a6-8222-f9d765d040dc', category: 'Messaging' },
    { name: 'live-activity',url: 'https://www.figma.com/api/mcp/asset/1e032102-deab-4e6c-870c-11da37682f73', category: 'Messaging' },
    { name: 'chat',         url: 'https://www.figma.com/api/mcp/asset/01375096-6848-46c9-8b0f-db109ab37d6a', category: 'Messaging' },
    { name: 'chat-2',       url: 'https://www.figma.com/api/mcp/asset/5f46be02-a7ce-476d-9e40-87b10ca6581c', category: 'Messaging' },
    { name: 'chat-3',       url: 'https://www.figma.com/api/mcp/asset/bdb4178f-261c-49e0-b9ac-a85b332c0cdb', category: 'Messaging' },
    { name: 'chat-4',       url: 'https://www.figma.com/api/mcp/asset/03e29ac5-8f6f-42f8-ab40-eadad1e6037c', category: 'Messaging' },
    { name: 'announce',     url: 'https://www.figma.com/api/mcp/asset/9bd98e35-09cc-424a-8368-41732c0c198a', category: 'Messaging' },
    { name: 'announce-2',   url: 'https://www.figma.com/api/mcp/asset/92e4ffb0-246c-49cd-a443-bd50af1b278f', category: 'Messaging' },
    { name: 'announce-3',   url: 'https://www.figma.com/api/mcp/asset/639af5f1-d78b-4ac2-84d5-aecc2b35c9a2', category: 'Messaging' },
    // Devices & Platforms
    { name: 'mobile',       url: 'https://www.figma.com/api/mcp/asset/65d74fed-78ed-4194-8573-6bd774ddbaf3', category: 'Devices' },
    { name: 'mobile-2',     url: 'https://www.figma.com/api/mcp/asset/e1d18fa7-370d-4821-b9a1-81bb2eb6ea1d', category: 'Devices' },
    { name: 'desktop',      url: 'https://www.figma.com/api/mcp/asset/8465b906-2529-45b9-88b2-865f11c59c6f', category: 'Devices' },
    { name: 'desktop-2',    url: 'https://www.figma.com/api/mcp/asset/7d890484-e2a6-4b55-bd85-129cb70ae52f', category: 'Devices' },
    { name: 'devices',      url: 'https://www.figma.com/api/mcp/asset/73b0c9b0-700d-439d-bd0a-f083bd45315a', category: 'Devices' },
    { name: 'platform',     url: 'https://www.figma.com/api/mcp/asset/3e668ef6-e18d-4a9a-8f15-559abe90c4e7', category: 'Devices' },
    { name: 'browser',      url: 'https://www.figma.com/api/mcp/asset/a38afcdb-2133-4675-aade-b65ffa2bc245', category: 'Devices' },
    { name: 'apps',         url: 'https://www.figma.com/api/mcp/asset/4c4ff26e-85b0-42b8-9942-6c36a426892c', category: 'Devices' },
    { name: 'sdk',          url: 'https://www.figma.com/api/mcp/asset/ace0abf8-2f01-40bb-b399-f5e75387aa52', category: 'Devices' },
    { name: 'webhook',      url: 'https://www.figma.com/api/mcp/asset/b016eb77-87ca-4cfd-89c5-a4775c4daf9e', category: 'Devices' },
    // Navigation
    { name: 'arrow',        url: 'https://www.figma.com/api/mcp/asset/f5a05b94-04a7-44f0-8a18-8878381dcf48', category: 'Navigation' },
    { name: 'arrow-2',      url: 'https://www.figma.com/api/mcp/asset/a0027576-f3c3-4851-8500-d0146fbcc423', category: 'Navigation' },
    { name: 'arrow-3',      url: 'https://www.figma.com/api/mcp/asset/f5ddf57d-5b7e-4fa5-b86d-16da0e846f90', category: 'Navigation' },
    { name: 'arrow-4',      url: 'https://www.figma.com/api/mcp/asset/8f6b9713-4384-43a9-8a1f-9797565a126e', category: 'Navigation' },
    { name: 'arrow-5',      url: 'https://www.figma.com/api/mcp/asset/aa0d8062-e0b1-4ff9-8771-ace38ce4d20b', category: 'Navigation' },
    { name: 'arrow-6',      url: 'https://www.figma.com/api/mcp/asset/8495a89a-e36e-4a5c-9492-e6e10c22b8a5', category: 'Navigation' },
    { name: 'arrow-right',  url: 'https://www.figma.com/api/mcp/asset/c545a993-ca30-4ff5-a3dc-507384a49b26', category: 'Navigation' },
    { name: 'arrow-left',   url: 'https://www.figma.com/api/mcp/asset/3092e51f-7e23-45a9-9478-114cee846d86', category: 'Navigation' },
    { name: 'arrow-up',     url: 'https://www.figma.com/api/mcp/asset/1f5face3-76dc-432d-9eb8-92bb87479ed4', category: 'Navigation' },
    { name: 'arrow-down',   url: 'https://www.figma.com/api/mcp/asset/04e1c13d-fb67-4cb0-b8c7-a256d7205e29', category: 'Navigation' },
    { name: 'arrow-right-2',url: 'https://www.figma.com/api/mcp/asset/c7fa3a1f-c966-4553-9937-3ee98ef81b12', category: 'Navigation' },
    { name: 'arrow-left-2', url: 'https://www.figma.com/api/mcp/asset/c545a993-ca30-4ff5-a3dc-507384a49b26', category: 'Navigation' },
    { name: 'close',        url: 'https://www.figma.com/api/mcp/asset/e8f42b3e-c914-4062-b946-9dc5c8711430', category: 'Navigation' },
    { name: 'plus',         url: 'https://www.figma.com/api/mcp/asset/110f4630-bab7-42c9-b1a8-80596767e2c8', category: 'Navigation' },
    { name: 'plus-2',       url: 'https://www.figma.com/api/mcp/asset/4a553d17-54f3-4fb7-9ba5-be36b67ecfa1', category: 'Navigation' },
    { name: 'minus',        url: 'https://www.figma.com/api/mcp/asset/32ddc41a-19be-4d68-98d4-df678aeb1948', category: 'Navigation' },
    { name: 'hamburger',    url: 'https://www.figma.com/api/mcp/asset/487f11e4-094a-4dfc-aa9b-42332c1a2eaf', category: 'Navigation' },
    { name: 'kebab',        url: 'https://www.figma.com/api/mcp/asset/4090c986-7a21-45e9-b8a0-149be9c958cf', category: 'Navigation' },
    { name: 'search',       url: 'https://www.figma.com/api/mcp/asset/ecae4209-c05f-4f52-9a5b-cd3f7299c604', category: 'Navigation' },
    { name: 'filter',       url: 'https://www.figma.com/api/mcp/asset/16f2a86f-07a2-4824-afea-897f4c80fc81', category: 'Navigation' },
    { name: 'home',         url: 'https://www.figma.com/api/mcp/asset/5b65359b-fba0-4ded-bd02-2ef456b26c73', category: 'Navigation' },
    // Users & People
    { name: 'people',       url: 'https://www.figma.com/api/mcp/asset/2e845d2c-10f5-469c-821d-221500c441b4', category: 'Users' },
    { name: 'people-2',     url: 'https://www.figma.com/api/mcp/asset/2b5dc0d6-c99b-4c83-8edc-e3d1fe2bd8ef', category: 'Users' },
    { name: 'personalize',  url: 'https://www.figma.com/api/mcp/asset/faf75829-1036-46ae-b676-2831ebefd7bc', category: 'Users' },
    { name: 'retargeting',  url: 'https://www.figma.com/api/mcp/asset/a8e61955-b991-40cc-ae8c-0f34fa7917e1', category: 'Users' },
    { name: 'attract',      url: 'https://www.figma.com/api/mcp/asset/cd2b2c7f-6a7d-43ce-b33f-cea290a0ff15', category: 'Users' },
    { name: 'support',      url: 'https://www.figma.com/api/mcp/asset/ca092d4a-60ae-495e-8468-03cf1049d0b7', category: 'Users' },
    { name: 'help',         url: 'https://www.figma.com/api/mcp/asset/27b551b6-439e-4ef8-8b2c-9739660967ea', category: 'Users' },
    { name: 'help-2',       url: 'https://www.figma.com/api/mcp/asset/962e51e0-9802-4a9a-93e8-38ef5579579b', category: 'Users' },
    { name: 'id',           url: 'https://www.figma.com/api/mcp/asset/6e7cbadd-4a0f-4478-a968-fbb3d6141657', category: 'Users' },
    { name: 'journey',      url: 'https://www.figma.com/api/mcp/asset/ea44d0f0-5577-4f0b-a9a7-9bde7f902908', category: 'Users' },
    // Tools & Settings
    { name: 'gear',         url: 'https://www.figma.com/api/mcp/asset/1d028417-67b8-4649-83a9-360c6f0507d0', category: 'Tools' },
    { name: 'tool-1',       url: 'https://www.figma.com/api/mcp/asset/f220c9b1-b74d-4562-8b56-9e43e5805bb1', category: 'Tools' },
    { name: 'tool-2',       url: 'https://www.figma.com/api/mcp/asset/9baf3e85-33ac-477a-ad8c-e32349f46233', category: 'Tools' },
    { name: 'tool-3',       url: 'https://www.figma.com/api/mcp/asset/c802cc61-c639-46b0-9cd7-5f1724b3da38', category: 'Tools' },
    { name: 'sync',         url: 'https://www.figma.com/api/mcp/asset/1d8a2f8b-3698-4691-889c-9966c9a6d66d', category: 'Tools' },
    { name: 'refresh',      url: 'https://www.figma.com/api/mcp/asset/129839f2-d8bc-48d2-92ad-fec08e466933', category: 'Tools' },
    { name: 'copy',         url: 'https://www.figma.com/api/mcp/asset/6c0e9b94-5ae2-435b-862c-7de5d4f8e0fe', category: 'Tools' },
    { name: 'save',         url: 'https://www.figma.com/api/mcp/asset/68e41276-6ca0-4483-947e-e1f604f4c429', category: 'Tools' },
    { name: 'import',       url: 'https://www.figma.com/api/mcp/asset/74890aaa-cb92-494f-b62a-0b237d8115af', category: 'Tools' },
    { name: 'export',       url: 'https://www.figma.com/api/mcp/asset/6293e986-60f7-413d-8230-fa22276871c1', category: 'Tools' },
    { name: 'shortcut',     url: 'https://www.figma.com/api/mcp/asset/e79fc7cd-1e25-43ba-ba69-7c2f99a9caf0', category: 'Tools' },
    { name: 'code',         url: 'https://www.figma.com/api/mcp/asset/299b83c6-967a-40b0-a18d-c08feeeb1c60', category: 'Tools' },
    { name: 'code-2',       url: 'https://www.figma.com/api/mcp/asset/a285861d-bc0a-43cf-b529-1696da1025dd', category: 'Tools' },
    { name: 'reorder',      url: 'https://www.figma.com/api/mcp/asset/6f61c114-bb0c-4494-a7eb-febcedad3fe8', category: 'Tools' },
    { name: 'cursor',       url: 'https://www.figma.com/api/mcp/asset/d2f8965e-2253-4f30-80d2-95cc0ef26437', category: 'Tools' },
    // Social
    { name: 'facebook',     url: 'https://www.figma.com/api/mcp/asset/f2f297fd-7933-4403-80c6-359faeb48013', category: 'Social' },
    { name: 'instagram',    url: 'https://www.figma.com/api/mcp/asset/24722072-dacd-42f9-89cf-54e6b2c4e605', category: 'Social' },
    { name: 'linkedin',     url: 'https://www.figma.com/api/mcp/asset/ca7d1fbf-852c-4258-a76a-e90c90ddede2', category: 'Social' },
    { name: 'twitter',      url: 'https://www.figma.com/api/mcp/asset/6fa746cd-592d-4cd7-84d1-79625312b850', category: 'Social' },
    // Misc
    { name: 'star',         url: 'https://www.figma.com/api/mcp/asset/7ea3ad58-8189-450f-ba6f-97c9c09683f1', category: 'Misc' },
    { name: 'star-2',       url: 'https://www.figma.com/api/mcp/asset/f5c02ecb-4b25-44b0-bfd1-e536911e339d', category: 'Misc' },
    { name: 'award',        url: 'https://www.figma.com/api/mcp/asset/c65a6298-81df-4295-a0ba-fc3de50a2160', category: 'Misc' },
    { name: 'award-2',      url: 'https://www.figma.com/api/mcp/asset/5994513c-771a-47bf-907f-a3a0ddf2a559', category: 'Misc' },
    { name: 'badge',        url: 'https://www.figma.com/api/mcp/asset/97ab47db-4271-4cab-b036-18988548e538', category: 'Misc' },
    { name: 'gem',          url: 'https://www.figma.com/api/mcp/asset/41b17834-aac0-4a09-81c9-580a1b8a59bd', category: 'Misc' },
    { name: 'rocket',       url: 'https://www.figma.com/api/mcp/asset/9044385b-cc7e-4bd5-9a9b-54a793783a09', category: 'Misc' },
    { name: 'rocket-2',     url: 'https://www.figma.com/api/mcp/asset/6c504f93-821f-4cc1-997a-73cdf7cf0991', category: 'Misc' },
    { name: 'rocket-3',     url: 'https://www.figma.com/api/mcp/asset/39fd77b1-f749-434b-938e-8553e71f0f54', category: 'Misc' },
    { name: 'globe',        url: 'https://www.figma.com/api/mcp/asset/2d8d38ed-04af-4c77-a5f9-336b34923f98', category: 'Misc' },
    { name: 'bolt',         url: 'https://www.figma.com/api/mcp/asset/a1cc7bbd-536b-46ab-a795-f35890f05c0f', category: 'Misc' },
    { name: 'target',       url: 'https://www.figma.com/api/mcp/asset/a5222b66-a128-4e2e-9477-5c0026c3c188', category: 'Misc' },
    { name: 'flag',         url: 'https://www.figma.com/api/mcp/asset/09df108c-97f4-4622-8dee-1495d1fb8b1a', category: 'Misc' },
    { name: 'flag-2',       url: 'https://www.figma.com/api/mcp/asset/ee7a84b7-d2e4-4d17-8873-c8c27e82ad13', category: 'Misc' },
    { name: 'calendar',     url: 'https://www.figma.com/api/mcp/asset/236de93b-1c54-45df-a364-219af03fed42', category: 'Misc' },
    { name: 'time',         url: 'https://www.figma.com/api/mcp/asset/4e1cd558-6d99-4134-9a4c-24cd1b6211c3', category: 'Misc' },
    { name: 'location',     url: 'https://www.figma.com/api/mcp/asset/3fb7d69f-3a0c-446c-93f5-ffe972a863e7', category: 'Misc' },
  ];

  const grid = document.getElementById('iconGrid');
  const searchInput = document.getElementById('iconSearch');
  const emptyMsg = document.getElementById('iconGridEmpty');
  const btnPurple = document.getElementById('btnPurple');
  const btnWhite = document.getElementById('btnWhite');

  if (!grid) return;

  function renderGrid(filter = '') {
    const filtered = icons.filter(ic => ic.name.includes(filter.toLowerCase()));
    grid.innerHTML = '';
    emptyMsg.style.display = filtered.length === 0 ? 'block' : 'none';

    filtered.forEach(icon => {
      const card = document.createElement('div');
      card.className = 'icon-card';
      card.title = `Click to copy icn-${icon.name}`;

      const imgWrap = document.createElement('div');
      imgWrap.className = 'icon-card-img-wrap';

      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      img.src = icon.url;
      img.alt = icon.name;
      img.loading = 'lazy';
      img.width = 32;
      img.height = 32;

      const label = document.createElement('span');
      label.className = 'icon-card-name';
      label.textContent = `icn-${icon.name}`;

      imgWrap.appendChild(img);
      card.appendChild(imgWrap);
      card.appendChild(label);

      // Click to copy the image as PNG to clipboard via canvas
      card.addEventListener('click', async () => {
        try {
          // Draw to canvas and export as PNG blob
          const canvas = document.createElement('canvas');
          canvas.width = 24;
          canvas.height = 24;
          const ctx = canvas.getContext('2d');

          // Ensure image is loaded
          if (!img.complete || img.naturalWidth === 0) {
            await new Promise((res, rej) => {
              img.onload = res;
              img.onerror = rej;
            });
          }

          ctx.drawImage(img, 0, 0, 24, 24);

          canvas.toBlob(async (blob) => {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
              ]);
              card.classList.add('copied');
              setTimeout(() => card.classList.remove('copied'), 1200);
              clearTimeout(toastTimer);
              toast.textContent = `Copied icn-${icon.name}`;
              toast.classList.add('show');
              toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
            } catch (e) {
              // Fallback: copy name
              navigator.clipboard.writeText(`icn-${icon.name}`);
              clearTimeout(toastTimer);
              toast.textContent = `Copied name: icn-${icon.name}`;
              toast.classList.add('show');
              toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
            }
          }, 'image/png');
        } catch (err) {
          navigator.clipboard.writeText(`icn-${icon.name}`);
          clearTimeout(toastTimer);
          toast.textContent = `Copied icn-${icon.name}`;
          toast.classList.add('show');
          toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
        }
      });

      grid.appendChild(card);
    });
  }

  searchInput.addEventListener('input', () => renderGrid(searchInput.value));

  btnPurple.addEventListener('click', () => {
    grid.dataset.variant = 'purple';
    btnPurple.classList.add('active');
    btnWhite.classList.remove('active');
    renderGrid(searchInput.value);
  });

  btnWhite.addEventListener('click', () => {
    grid.dataset.variant = 'white';
    btnWhite.classList.add('active');
    btnPurple.classList.remove('active');
    renderGrid(searchInput.value);
  });

  renderGrid();
})();

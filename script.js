/* ============================================================
   OS 15 ANOS DE MARIANA — script.js v3
   Tema: A Noite Estrelada (Van Gogh)
   ============================================================ */
'use strict';

/* ══════════════════════════════════════════════════════════════
   CONFIGURAÇÕES GLOBAIS
══════════════════════════════════════════════════════════════ */
const CONFIG = {
  /*
   * DATA DO EVENTO: 20 de Junho de 2026, 22:00, fuso horário de Brasília (BRT = UTC-3).
   * Usamos o formato ISO com offset explícito "-03:00" para garantir
   * que o countdown seja correto em qualquer computador/celular do mundo.
   */
  eventDate:       new Date('2026-06-20T22:00:00-03:00'),
  maxCompanions:   5,
  rsvpStorageKey:  'mariana_guests',
  countStorageKey: 'mariana_count',
  attendKey:       'mgmt_attendance',
  giftsKey:        'mgmt_gifts',
  firebaseCollection: 'rsvp_confirmations',
  rsvpSpamWindowMs: 12000,
};

/* ══════════════════════════════════════════════════════════════
   ESTADO GLOBAL (carregado do localStorage)
══════════════════════════════════════════════════════════════ */
let guests      = JSON.parse(localStorage.getItem(CONFIG.rsvpStorageKey)  || '[]');
let guestCount  = parseInt(localStorage.getItem(CONFIG.countStorageKey)   || '0', 10);
let attendanceList = JSON.parse(localStorage.getItem(CONFIG.attendKey)    || '[]');
let giftsList      = JSON.parse(localStorage.getItem(CONFIG.giftsKey)     || '[]');
let audioPlaying   = false;
let firebaseDb     = null;
let adminGuests    = [];
let adminSearch    = '';

/* ══════════════════════════════════════════════════════════════
   LOADING SCREEN (IIFE — executa imediatamente)
══════════════════════════════════════════════════════════════ */
(function initLoading() {
  const canvas = document.getElementById('loadingCanvas');
  const ctx    = canvas.getContext('2d');
  const W = canvas.width = 200, H = canvas.height = 200;
  const cx = W / 2, cy = H / 2;
  let angle = 0;

  const particles = Array.from({ length: 60 }, (_, i) => ({
    angle: (Math.PI * 2 * i) / 60,
    radius: 30 + Math.random() * 60,
    speed:  0.003 + Math.random() * 0.006,
    size:   1 + Math.random() * 2.5,
    bright: Math.random(),
  }));

  function drawLoading() {
    ctx.clearRect(0, 0, W, H);
    angle += 0.005;
    // Aura dourada pulsante
    for (let r = 80; r > 10; r -= 5) {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, `rgba(200,168,75,${0.04 * (80/r)})`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
    // Partículas orbitando
    particles.forEach(p => {
      p.angle += p.speed;
      const x = cx + Math.cos(p.angle + angle) * p.radius;
      const y = cy + Math.sin(p.angle + angle * 0.7) * p.radius * 0.6;
      const a = 0.3 + p.bright * 0.7 * (0.5 + 0.5 * Math.sin(p.angle * 3));
      ctx.beginPath(); ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,168,75,${a})`; ctx.fill();
    });
    // Arcos decorativos
    ctx.strokeStyle = 'rgba(200,168,75,0.22)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, 20 + i * 10, angle + i * 0.4, angle + i * 0.4 + Math.PI * 1.4);
      ctx.stroke();
    }
    requestAnimationFrame(drawLoading);
  }
  drawLoading();

  // Barra de progresso simulada
  const bar = document.getElementById('loadingBar');
  let progress = 0;
  const iv = setInterval(() => {
    progress += Math.random() * 4 + 1;
    if (progress >= 100) {
      progress = 100;
      clearInterval(iv);
      setTimeout(() => {
        document.getElementById('loadingScreen').classList.add('hidden');
        initAll();
      }, 350);
    }
    bar.style.width = progress + '%';
  }, 60);
})();

/* ══════════════════════════════════════════════════════════════
   INIT ALL — ponto de entrada após loading
══════════════════════════════════════════════════════════════ */
function initAll() {
  initFirebase();
  initCursor();
  initStarryNight();
  initParticles();
  initScrollAnimations();
  initCountdown();
  initRSVP();
  renderGuests();
  initMapCanvas();
  initFooterCanvas();
  initAudio();
  initParallax();
  initDashboardTabs();
  initAttendanceUI();
  initGiftsUI();
  initGiftPixCopy();
  initAdminPanel();
}

function initFirebase() {
  const cfg = window.MARIANA_FIREBASE_CONFIG;
  const hasRealConfig = cfg && cfg.apiKey && !cfg.apiKey.includes('COLE_') && cfg.projectId && !cfg.projectId.includes('SEU_');

  if (!hasRealConfig || !window.firebase || !firebase.firestore) {
    firebaseDb = null;
    return;
  }

  try {
    if (!firebase.apps.length) firebase.initializeApp(cfg);
    firebaseDb = firebase.firestore();
  } catch (err) {
    firebaseDb = null;
    console.warn('Firebase nao inicializado:', err);
  }
}

function rsvpCollection() {
  return firebaseDb ? firebaseDb.collection(CONFIG.firebaseCollection) : null;
}

/* ══════════════════════════════════════════════════════════════
   CURSOR PERSONALIZADO
══════════════════════════════════════════════════════════════ */
function initCursor() {
  const cursor = document.getElementById('cursor');
  const trail  = document.getElementById('cursorTrail');
  let tx = 0, ty = 0, cx2 = 0, cy2 = 0;

  document.addEventListener('mousemove', e => {
    tx = e.clientX; ty = e.clientY;
    cursor.style.left = tx + 'px';
    cursor.style.top  = ty + 'px';
  });

  (function animTrail() {
    cx2 += (tx - cx2) * 0.12;
    cy2 += (ty - cy2) * 0.12;
    trail.style.left = cx2 + 'px';
    trail.style.top  = cy2 + 'px';
    requestAnimationFrame(animTrail);
  })();
}

/* ══════════════════════════════════════════════════════════════
   FUNDO VAN GOGH — Canvas da Noite Estrelada
══════════════════════════════════════════════════════════════ */
function initStarryNight() {
  const canvas = document.getElementById('starryCanvas');
  const ctx    = canvas.getContext('2d');
  let W, H;

  const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
  resize(); window.addEventListener('resize', resize);

  const swirls = Array.from({ length: 18 }, () => ({
    x: Math.random() * 1.2 - 0.1, y: Math.random() * 0.8,
    r: 80 + Math.random() * 200,
    speed: (Math.random() - 0.5) * 0.0004,
    phase: Math.random() * Math.PI * 2,
    color: [[10,30,100],[20,60,180],[30,80,200],[60,140,220],[150,120,30],[200,168,75]][Math.floor(Math.random()*6)],
    opacity: 0.04 + Math.random() * 0.08,
  }));

  const stars = Array.from({ length: 280 }, () => ({
    x: Math.random(), y: Math.random() * 0.85,
    r: Math.random() < 0.1 ? 2 + Math.random() * 2 : 0.5 + Math.random() * 1.2,
    glow: Math.random() < 0.2,
    phase: Math.random() * Math.PI * 2,
    speed: 0.5 + Math.random() * 1.5,
  }));

  const moon = { x: 0.88, y: 0.1, r: 38 };
  let t = 0;

  function draw() {
    ctx.clearRect(0, 0, W, H);
    // Gradiente de céu
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.85);
    sky.addColorStop(0, '#06091f'); sky.addColorStop(0.3, '#0a0e2a');
    sky.addColorStop(0.6, '#0d1b4b'); sky.addColorStop(1, '#0a1130');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    // Colinas
    ctx.fillStyle = '#04070f'; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, H * 0.88);
    for (let x = 0; x <= W; x += 30) ctx.lineTo(x, H * 0.88 - Math.sin(x * 0.005) * 30 - Math.cos(x * 0.012) * 15);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    drawVillage(ctx, W, H);
    drawCypress(ctx, W * 0.08, H * 0.55, H * 0.4);
    // Redemoinhos
    t += 0.003;
    swirls.forEach(s => {
      s.phase += s.speed;
      const sx = s.x * W + Math.cos(s.phase) * 40, sy = s.y * H + Math.sin(s.phase * 0.7) * 20;
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, s.r);
      const [r, gv, b] = s.color;
      g.addColorStop(0, `rgba(${r},${gv},${b},${s.opacity*1.5})`);
      g.addColorStop(0.5, `rgba(${r},${gv},${b},${s.opacity})`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(sx, sy, s.r * (1 + 0.3 * Math.sin(s.phase)), s.r * 0.6, s.phase * 0.3, 0, Math.PI * 2); ctx.fill();
    });
    // Lua
    const mx = moon.x * W, my = moon.y * H;
    const mg = ctx.createRadialGradient(mx, my, 0, mx, my, moon.r * 4);
    mg.addColorStop(0, 'rgba(230,201,100,0.6)'); mg.addColorStop(0.3, 'rgba(200,168,75,0.22)'); mg.addColorStop(1, 'transparent');
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, moon.r * 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx, my, moon.r, 0, Math.PI * 2); ctx.fillStyle = '#f5e08a'; ctx.fill();
    ctx.beginPath(); ctx.arc(mx - moon.r * 0.25, my - moon.r * 0.25, moon.r * 0.9, 0, Math.PI * 2); ctx.fillStyle = '#e8cf7a'; ctx.fill();
    // Estrelas
    stars.forEach(s => {
      const alpha = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
      const sx2 = s.x * W, sy2 = s.y * H;
      if (s.glow) {
        const sg = ctx.createRadialGradient(sx2, sy2, 0, sx2, sy2, s.r * 6);
        sg.addColorStop(0, `rgba(245,224,138,${alpha * 0.8})`); sg.addColorStop(1, 'transparent');
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx2, sy2, s.r * 6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.beginPath(); ctx.arc(sx2, sy2, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(245,224,138,${alpha})`; ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

function drawVillage(ctx, W, H) {
  const buildings = [[0.15,0.82,40,60],[0.18,0.80,25,75],[0.22,0.84,35,55],[0.25,0.79,20,80],[0.30,0.83,50,60],[0.35,0.81,30,70],[0.40,0.85,45,50],[0.72,0.83,40,55],[0.76,0.80,25,70],[0.80,0.84,35,50]];
  buildings.forEach(([rx,ry,rw,rh]) => {
    const x = rx*W, y = ry*H;
    ctx.fillStyle = '#030609'; ctx.fillRect(x-rw/2, y-rh, rw, rh);
    ctx.fillStyle = 'rgba(200,168,75,0.13)'; ctx.fillRect(x-5, y-rh*0.5, 6, 7);
  });
  const sx = W*0.27, sy = H*0.79;
  ctx.fillStyle = '#030609'; ctx.beginPath(); ctx.moveTo(sx, sy-90); ctx.lineTo(sx-12, sy); ctx.lineTo(sx+12, sy); ctx.closePath(); ctx.fill(); ctx.fillRect(sx-12, sy, 24, 50);
}

function drawCypress(ctx, x, y, h) {
  ctx.fillStyle = '#050a10'; ctx.beginPath(); ctx.moveTo(x, y-h);
  for (let i = 0; i <= 40; i++) {
    const t = i/40, w = 18*(1-t*0.6)*(1+0.15*Math.sin(t*12));
    ctx.lineTo(x + w*(i%2===0?1:-1), y-h+t*h);
  }
  ctx.closePath(); ctx.fill();
}

/* ══════════════════════════════════════════════════════════════
   PARTÍCULAS FLUTUANTES (poeira dourada)
══════════════════════════════════════════════════════════════ */
function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  const ctx    = canvas.getContext('2d');
  let W, H;

  const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
  resize(); window.addEventListener('resize', resize);

  const mkParticle = (fromBottom = false) => ({
    x: Math.random() * W, y: fromBottom ? H + 10 : Math.random() * H,
    vy: -(0.15 + Math.random() * 0.6), vx: (Math.random() - 0.5) * 0.3,
    r: 0.5 + Math.random() * 2, alpha: 0,
    maxAlpha: 0.2 + Math.random() * 0.6,
    phase: Math.random() * Math.PI * 2,
    speed: 0.5 + Math.random() * 2,
    gold: Math.random() < 0.35,
  });

  const particles = Array.from({ length: 90 }, () => mkParticle());
  let t = 0;

  function draw() {
    ctx.clearRect(0, 0, W, H); t += 0.016;
    particles.forEach((p, i) => {
      p.phase += 0.02; p.x += p.vx + Math.sin(p.phase*0.5)*0.2; p.y += p.vy;
      p.alpha = Math.min(p.alpha + 0.008, p.maxAlpha);
      if (p.y < -20) { particles[i] = mkParticle(true); return; }
      const pulse = 0.5 + 0.5 * Math.sin(t * p.speed + p.phase);
      const a = p.alpha * pulse;
      if (p.gold) {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r*4);
        g.addColorStop(0, `rgba(245,224,138,${a})`); g.addColorStop(1, 'transparent');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r*4, 0, Math.PI*2); ctx.fill();
      }
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = p.gold ? `rgba(245,224,138,${a*1.5})` : `rgba(200,200,255,${a})`; ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

/* ══════════════════════════════════════════════════════════════
   SCROLL ANIMATIONS (IntersectionObserver)
══════════════════════════════════════════════════════════════ */
function initScrollAnimations() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1 });
  document.querySelectorAll('.section-fade').forEach(el => io.observe(el));
}

/* ══════════════════════════════════════════════════════════════
   PARALLAX HERO
══════════════════════════════════════════════════════════════ */
function initParallax() {
  window.addEventListener('scroll', () => {
    const hero = document.querySelector('.hero-inner');
    if (hero) hero.style.transform = `translateY(${window.scrollY * 0.24}px)`;
  });
}

/* ══════════════════════════════════════════════════════════════
   CONTAGEM REGRESSIVA
   — Data: 20 Jun 2026 às 22h00 (BRT / UTC-3)
   — Quando diff <= 0: esconde blocos e exibe mensagem elegante
══════════════════════════════════════════════════════════════ */
function initCountdown() {
  const pad = n => String(n).padStart(2, '0');

  // Elementos da DOM
  const grid   = document.getElementById('countdownGrid');
  const ended  = document.getElementById('countdownEnded');
  const title  = document.getElementById('countdownTitle');

  // IDs dos dígitos
  const elDays    = document.getElementById('cdDays');
  const elHours   = document.getElementById('cdHours');
  const elMinutes = document.getElementById('cdMinutes');
  const elSeconds = document.getElementById('cdSeconds');

  function update() {
    /*
     * new Date() retorna o instante atual em UTC.
     * CONFIG.eventDate já foi criado com offset -03:00,
     * portanto a subtração é sempre correta independente
     * do fuso do visitante.
     */
    const diff = CONFIG.eventDate - new Date();

    if (diff <= 0) {
      // Evento já começou: esconde números e exibe mensagem
      if (grid)  grid.style.display  = 'none';
      if (ended) { ended.style.display = 'flex'; ended.classList.add('visible'); }
      if (title) title.textContent   = 'A Grande Noite Chegou';
      return; // para o intervalo abaixo
    }

    // Calcular parcelas
    const days    = Math.floor(diff / 86400000);
    const hours   = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000)  / 60000);
    const seconds = Math.floor((diff % 60000)    / 1000);

    elDays.textContent    = pad(days);
    elHours.textContent   = pad(hours);
    elMinutes.textContent = pad(minutes);
    elSeconds.textContent = pad(seconds);
  }

  // Roda uma vez imediatamente e depois a cada segundo
  update();
  const iv = setInterval(() => {
    const diff = CONFIG.eventDate - new Date();
    if (diff <= 0) { clearInterval(iv); update(); return; }
    update();
  }, 1000);
}

/* ══════════════════════════════════════════════════════════════
   UTILITÁRIOS COMPARTILHADOS
══════════════════════════════════════════════════════════════ */

/** Escapa HTML para evitar XSS */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/** Normaliza nome para comparação de duplicatas */
function normalizeName(str) {
  return str.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
}

function cleanText(str, max = 120) {
  return String(str || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function setRsvpFeedback(msg, type = 'info') {
  const el = document.getElementById('rsvpFeedback');
  if (!el) return;
  el.textContent = msg;
  el.className = `rsvp-feedback show ${type}`;
}

function clearRsvpFeedback(delay = 4200) {
  const el = document.getElementById('rsvpFeedback');
  if (!el) return;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), delay);
}

/** Gera ID único */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/**
 * Mostra mensagem de feedback transitória num elemento .mgmt-feedback.
 * @param {string} elId  — id do elemento
 * @param {string} msg   — texto
 * @param {'error'|'success'} type
 */
function showFeedback(elId, msg, type = 'error') {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = msg;
  el.className = `mgmt-feedback ${type}`;
  clearTimeout(el._fbTimer);
  el._fbTimer = setTimeout(() => el.classList.add('fade'), 3000);
}

/** Marca um input como inválido e remove o estilo após 2 s */
function markInputError(inputEl) {
  inputEl.classList.add('input-error');
  setTimeout(() => inputEl.classList.remove('input-error'), 2000);
  inputEl.focus();
}

/* ══════════════════════════════════════════════════════════════
   RSVP — CONFIRMAÇÃO DE PRESENÇA COM ACOMPANHANTES NOMEADOS
══════════════════════════════════════════════════════════════ */
function initRSVP() {
  const addBtn    = document.getElementById('addCompanionBtn');
  const listEl    = document.getElementById('companionsList');
  const emptyHint = document.getElementById('companionsEmptyHint');
  const limitHint = document.getElementById('companionsLimitHint');
  let companionCount = 0;

  /** Atualiza visibilidade do hint vazio e do botão */
  function syncCompanionUI() {
    emptyHint.style.display = companionCount === 0 ? 'block' : 'none';
    addBtn.disabled = companionCount >= CONFIG.maxCompanions;
    limitHint.textContent = `(máx. ${CONFIG.maxCompanions})`;
  }
  syncCompanionUI();

  /** Adiciona um campo de acompanhante dinamicamente */
  function addCompanionField(prefillValue = '') {
    if (companionCount >= CONFIG.maxCompanions) return;
    companionCount++;
    syncCompanionUI();

    const row   = document.createElement('div');
    row.className = 'companion-row';

    const idx   = uid();
    const input = document.createElement('input');
    input.type        = 'text';
    input.placeholder = `Nome do acompanhante ${companionCount}`;
    input.dataset.cid = idx;
    input.value       = prefillValue;

    const removeBtn = document.createElement('button');
    removeBtn.type      = 'button';
    removeBtn.className = 'companion-remove-btn';
    removeBtn.innerHTML = '&#10005;';
    removeBtn.title     = 'Remover acompanhante';
    removeBtn.setAttribute('aria-label', 'Remover acompanhante');

    removeBtn.addEventListener('click', () => {
      row.classList.add('removing');
      // aguarda animação antes de remover do DOM
      setTimeout(() => { row.remove(); companionCount--; syncCompanionUI(); }, 260);
    });

    row.appendChild(input);
    row.appendChild(removeBtn);
    listEl.appendChild(row);
  }

  addBtn.addEventListener('click', () => addCompanionField());

  /** Coleta os nomes dos acompanhantes digitados */
  function collectCompanionNames() {
    return Array.from(listEl.querySelectorAll('input'))
      .map(i => i.value.trim())
      .filter(v => v !== '');
  }

  let lastSubmitAt = 0;

  // Submit do RSVP com Firebase + validacoes premium
  document.getElementById('rsvpSubmit').addEventListener('click', async () => {
    const submitBtn = document.getElementById('rsvpSubmit');
    const nameInput = document.getElementById('guestName');
    const name      = cleanText(nameInput.value, 90);
    const now       = Date.now();

    if (now - lastSubmitAt < CONFIG.rsvpSpamWindowMs) {
      setRsvpFeedback('Aguarde alguns segundos antes de tentar novamente.', 'error');
      clearRsvpFeedback();
      return;
    }

    if (!name || name.length < 3) {
      markInputError(nameInput);
      setRsvpFeedback('Digite seu nome completo para confirmar presença.', 'error');
      clearRsvpFeedback();
      return;
    }

    // Valida campos de acompanhantes: impede campos vazios se existirem
    const allInputs = Array.from(listEl.querySelectorAll('input'));
    let hasBlank = false;
    allInputs.forEach(inp => { if (!inp.value.trim()) { markInputError(inp); hasBlank = true; } });
    if (hasBlank) {
      setRsvpFeedback('Preencha ou remova os campos vazios de acompanhantes.', 'error');
      clearRsvpFeedback();
      return;
    }

    const companionNames = collectCompanionNames()
      .map(item => cleanText(item, 90))
      .filter(Boolean)
      .slice(0, CONFIG.maxCompanions);
    const message = cleanText(document.getElementById('guestMessage').value, 360);

    if (!rsvpCollection()) {
      setRsvpFeedback('Firebase ainda não configurado. Preencha firebase-config.js para salvar confirmações reais.', 'error');
      clearRsvpFeedback(7000);
      return;
    }

    lastSubmitAt = now;
    submitBtn.disabled = true;
    submitBtn.classList.add('is-loading');
    submitBtn.querySelector('span').textContent = 'Salvando...';
    setRsvpFeedback('Salvando sua confirmação nas estrelas...', 'loading');

    try {
      const normalizedName = normalizeName(name);
      const duplicate = await rsvpCollection().where('normalizedName', '==', normalizedName).limit(1).get();

      if (!duplicate.empty) {
        setRsvpFeedback('Esta presença já foi confirmada anteriormente.', 'error');
        clearRsvpFeedback();
        return;
      }

      const guest = {
        name,
        companions: companionNames.length,
        companionNames,
        message,
        status: 'confirmed',
        normalizedName,
        time: new Date().toLocaleString('pt-BR'),
        createdAtMs: Date.now(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

 const docRef = rsvpCollection().doc(normalizedName);

await docRef.set({
  name,
  companionNames,
  message,
  time: new Date().toLocaleString('pt-BR'),
});

guests.push({ ...guest, id: docRef.id });

      guests.push({ ...guest, id: docRef.id });
      guestCount = guests.reduce((sum, g) => sum + 1 + (g.companionNames || []).length, 0);
      localStorage.setItem(CONFIG.rsvpStorageKey, JSON.stringify(guests));
      localStorage.setItem(CONFIG.countStorageKey, guestCount.toString());

    // Limpar formulário
      nameInput.value = '';
      document.getElementById('guestMessage').value = '';
      listEl.innerHTML = '';
      companionCount = 0;
      syncCompanionUI();

    // Feedback de sucesso
      const succ = document.getElementById('rsvpSuccess');
      succ.classList.add('show');
      setTimeout(() => succ.classList.remove('show'), 4000);
      setRsvpFeedback('Presença salva com sucesso no Firebase.', 'success');
      clearRsvpFeedback();

      renderGuests();
    } catch (err) {
      console.error('Erro ao confirmar RSVP:', err);
      setRsvpFeedback('Não foi possível salvar agora. Verifique sua conexão e tente novamente.', 'error');
      clearRsvpFeedback(6000);
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('is-loading');
      submitBtn.querySelector('span').textContent = 'Confirmar Presença';
    }
  });
}

/* ══════════════════════════════════════════════════════════════
   RENDER GUEST LIST (seção pública de confirmados do RSVP)
══════════════════════════════════════════════════════════════ */
function renderGuests() {
  const grid    = document.getElementById('guestsGrid');
  const emptyEl = document.getElementById('guestsEmpty');
  const countEl = document.getElementById('guestsCount');
  const totalEl = document.getElementById('totalGuests');
  if (!grid || !emptyEl || !countEl || !totalEl) return;

  if (guests.length === 0) {
    emptyEl.style.display = 'block';
    countEl.style.display = 'none';
    return;
  }

  emptyEl.style.display = 'none';
  countEl.style.display = 'block';
  grid.querySelectorAll('.guest-card').forEach(el => el.remove());

  guests.forEach(g => {
    const card = document.createElement('div');
    card.className = 'guest-card glass-card';

    // Acompanhantes nomeados (suporte a dados antigos com apenas número)
    let companionsHTML = '';
    if (Array.isArray(g.companionNames) && g.companionNames.length > 0) {
      const items = g.companionNames.map(n => `<span class="guest-card-companion">${escapeHtml(n)}</span>`).join('');
      companionsHTML = `<div class="guest-card-companions">${items}</div>`;
    } else if (g.companions > 0) {
      companionsHTML = `<div class="guest-card-count">+${g.companions} acompanhante${g.companions>1?'s':''}</div>`;
    }

    card.innerHTML = `
      <div class="guest-card-star">&#10022;</div>
      <div class="guest-card-name">${escapeHtml(g.name)}</div>
      <div class="guest-card-count">${g.companions > 0 ? `+${g.companions} acompanhante${g.companions>1?'s':''}` : 'Apenas você'} &middot; ${g.time}</div>
      ${companionsHTML}
      ${g.message ? `<div class="guest-card-message">"${escapeHtml(g.message)}"</div>` : ''}
    `;
    grid.appendChild(card);
  });

  totalEl.textContent = guestCount;
}

/* ══════════════════════════════════════════════════════════════
   MAP CANVAS
══════════════════════════════════════════════════════════════ */
function initMapCanvas() {
  const canvas    = document.getElementById('mapCanvas');
  if (!canvas) return;
  const container = canvas.parentElement;
  const ctx       = canvas.getContext('2d');

  function resize() {
    canvas.width  = container.offsetWidth || 400;
    canvas.height = container.offsetHeight || 420;
    drawMap();
  }

  function drawMap() {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#06091f'); sky.addColorStop(1, '#0d1b4b');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    // Grid
    ctx.strokeStyle = 'rgba(200,168,75,0.055)'; ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    // Ruas
    ctx.strokeStyle = 'rgba(200,168,75,0.16)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    [[0,H*0.5,W*0.5,H*0.5],[W,H*0.5,W*0.5,H*0.5],[W*0.5,0,W*0.5,H*0.5],[W*0.5,H,W*0.5,H*0.5],[0,0,W*0.5,H*0.5],[W,H,W*0.5,H*0.5]].forEach(([x1,y1,x2,y2]) => {
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    });
    // Blocos de quarteirão
    ctx.fillStyle = 'rgba(26,58,143,0.12)'; ctx.strokeStyle = 'rgba(74,144,217,0.09)'; ctx.lineWidth = 1;
    [[0.15,0.2,0.18,0.22],[0.62,0.1,0.2,0.18],[0.1,0.65,0.15,0.18],[0.65,0.65,0.2,0.2]].forEach(([rx,ry,rw,rh]) => {
      ctx.fillRect(rx*W,ry*H,rw*W,rh*H); ctx.strokeRect(rx*W,ry*H,rw*W,rh*H);
    });
    // Estrelas no fundo
    for (let i = 0; i < 28; i++) {
      ctx.beginPath(); ctx.arc(Math.random()*W, Math.random()*H*0.4, 0.5+Math.random(), 0, Math.PI*2);
      ctx.fillStyle = `rgba(245,224,138,${0.3+Math.random()*0.5})`; ctx.fill();
    }
  }

  resize(); window.addEventListener('resize', resize);
}

/* ══════════════════════════════════════════════════════════════
   FOOTER CANVAS
══════════════════════════════════════════════════════════════ */
function initFooterCanvas() {
  const canvas = document.getElementById('footerCanvas');
  const ctx    = canvas.getContext('2d');
  const stars  = Array.from({ length: 120 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random()*1.4+0.3, phase: Math.random()*Math.PI*2, speed: 0.3+Math.random()*1.5 }));
  let t = 0;

  function resize() { canvas.width = canvas.parentElement.offsetWidth; canvas.height = canvas.parentElement.offsetHeight; }
  resize(); window.addEventListener('resize', resize);

  function draw() {
    const W = canvas.width, H = canvas.height; ctx.clearRect(0,0,W,H); t += 0.016;
    stars.forEach(s => {
      const a = 0.18 + 0.5 * Math.sin(t*s.speed+s.phase);
      ctx.beginPath(); ctx.arc(s.x*W, s.y*H, s.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(245,224,138,${a})`; ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

/* ══════════════════════════════════════════════════════════════
   ÁUDIO AMBIENTE (Web Audio API — sem arquivo externo)
══════════════════════════════════════════════════════════════ */
function initAudio() {
  const btn       = document.getElementById('audioBtn');
  const playIcon  = btn.querySelector('.audio-icon-play');
  const pauseIcon = btn.querySelector('.audio-icon-pause');
  let audioCtx = null, nodes = [], gainNode = null;

  function startAmbient() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.07, audioCtx.currentTime + 3);
    gainNode.connect(audioCtx.destination);

    [130.81,164.81,195.998,246.942,293.665,329.628].forEach((f, i) => {
      const osc = audioCtx.createOscillator();
      const og  = audioCtx.createGain();
      const lfo = audioCtx.createOscillator();
      const lg  = audioCtx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(f, audioCtx.currentTime);
      lfo.type = 'sine'; lfo.frequency.setValueAtTime(0.12 + i * 0.03, audioCtx.currentTime);
      lg.gain.setValueAtTime(0.4, audioCtx.currentTime);
      lfo.connect(lg); lg.connect(og.gain); og.gain.setValueAtTime(0.5, audioCtx.currentTime);
      osc.connect(og); og.connect(gainNode);
      lfo.start(); osc.start();
      nodes.push(osc, lfo);
    });
  }

  function stopAmbient() {
    if (!audioCtx) return;
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.5);
    setTimeout(() => { nodes.forEach(n => { try { n.stop(); } catch(e){} }); nodes = []; audioCtx.close(); audioCtx = null; }, 2000);
  }

  btn.addEventListener('click', () => {
    if (!audioPlaying) {
      startAmbient(); playIcon.style.display = 'none'; pauseIcon.style.display = 'block'; audioPlaying = true;
    } else {
      stopAmbient(); playIcon.style.display = 'block'; pauseIcon.style.display = 'none'; audioPlaying = false;
    }
  });
}

/* ══════════════════════════════════════════════════════════════
   SMOOTH ANCHOR SCROLL
══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const t = document.querySelector(a.getAttribute('href'));
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });
});

/* ══════════════════════════════════════════════════════════════
   DASHBOARD — Alternância de Painéis (Presença / Presentes)
══════════════════════════════════════════════════════════════ */
function initDashboardTabs() {
  document.querySelectorAll('.dashboard-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const panelId = 'panel-' + btn.dataset.panel;
      // Atualizar tabs
      document.querySelectorAll('.dashboard-tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      // Atualizar painéis
      document.querySelectorAll('.dashboard-panel').forEach(p => p.classList.remove('active'));
      document.getElementById(panelId).classList.add('active');
    });
  });
}

/* ══════════════════════════════════════════════════════════════
   MÓDULO: LISTA DE PRESENÇA (Painel Administrativo)
══════════════════════════════════════════════════════════════ */

/* Metadados de status */
const STATUS_META = {
  confirmed: { label: 'Confirmado', cls: 'confirmed' },
  maybe:     { label: 'Talvez',     cls: 'maybe'     },
  declined:  { label: 'Não vai',    cls: 'declined'  },
};

let attendFilter  = 'all';
let attendSearch  = '';

/** Persiste attendanceList */
function saveAttendance() { localStorage.setItem(CONFIG.attendKey, JSON.stringify(attendanceList)); }

/**
 * Adiciona convidado à lista administrativa.
 * attendanceList items: { id, name, status, companions:[], addedAt }
 */
function addAttendee(name, status) {
  const norm = normalizeName(name);
  if (!norm) { showFeedback('attendFeedback', '✕ Insira um nome.', 'error'); return false; }
  if (attendanceList.some(p => normalizeName(p.name) === norm)) {
    showFeedback('attendFeedback', `✕ "${name.trim()}" já está na lista.`, 'error'); return false;
  }
  attendanceList.push({ id: uid(), name: name.trim(), status, companions: [], addedAt: new Date().toLocaleDateString('pt-BR') });
  saveAttendance();
  showFeedback('attendFeedback', `✦ ${name.trim()} — "${STATUS_META[status].label}"`, 'success');
  renderAttendance();
  return true;
}

function removeAttendee(id) {
  const idx = attendanceList.findIndex(p => p.id === id);
  if (idx === -1) return;
  const name = attendanceList[idx].name;
  attendanceList.splice(idx, 1);
  saveAttendance();
  showFeedback('attendFeedback', `✦ ${name} removido.`, 'success');
  renderAttendance();
}

function changeAttendeeStatus(id, newStatus) {
  const p = attendanceList.find(p => p.id === id);
  if (p) { p.status = newStatus; saveAttendance(); renderAttendance(); }
}

/** Re-renderiza lista com filtro + busca */
function renderAttendance() {
  const list  = document.getElementById('attendList');
  const empty = document.getElementById('attendEmpty');
  if (!list) return;

  // Contadores (inclui acompanhantes da lista administrativa)
  const counts = { confirmed: 0, maybe: 0, declined: 0 };
  let totalCompanions = 0;
  attendanceList.forEach(p => {
    if (counts[p.status] !== undefined) counts[p.status]++;
    totalCompanions += (p.companions || []).length;
  });
  document.getElementById('statConfirmed').textContent  = counts.confirmed;
  document.getElementById('statMaybe').textContent      = counts.maybe;
  document.getElementById('statDeclined').textContent   = counts.declined;
  document.getElementById('statCompanions').textContent = totalCompanions;
  document.getElementById('statTotal').textContent      = attendanceList.length + totalCompanions;

  // Filtrar por status + busca textual
  let visible = attendFilter === 'all' ? [...attendanceList] : attendanceList.filter(p => p.status === attendFilter);
  if (attendSearch) {
    const q = attendSearch.toLowerCase();
    visible = visible.filter(p => p.name.toLowerCase().includes(q));
  }

  list.querySelectorAll('.mgmt-item-card').forEach(el => el.remove());

  if (visible.length === 0) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  visible.forEach(person => {
    const meta = STATUS_META[person.status] || STATUS_META.confirmed;
    const companions = person.companions || [];

    const companionsHTML = companions.length > 0
      ? `<div class="mgmt-card-companions">${companions.map(c=>`<span class="mgmt-card-companion">${escapeHtml(c)}</span>`).join('')}</div>`
      : '';

    const card = document.createElement('div');
    card.className = 'mgmt-item-card glass-card';
    card.dataset.status = person.status;
    card.dataset.id     = person.id;
    card.innerHTML = `
      <div class="mgmt-card-header">
        <span class="mgmt-card-name">${escapeHtml(person.name)}</span>
        <span class="mgmt-card-badge mgmt-card-badge--${meta.cls}">${meta.label}</span>
      </div>
      ${companionsHTML}
      <span class="mgmt-card-meta">Adicionado em ${person.addedAt}</span>
      <div class="mgmt-card-actions">
        <select class="mgmt-status-btn" data-id="${person.id}" aria-label="Alterar status">
          <option value="confirmed" ${person.status==='confirmed'?'selected':''}>&#10022; Confirmado</option>
          <option value="maybe"     ${person.status==='maybe'    ?'selected':''}>&#9672; Talvez</option>
          <option value="declined"  ${person.status==='declined' ?'selected':''}>&#10005; Não vai</option>
        </select>
        <button class="mgmt-action-btn mgmt-action-btn--remove" data-id="${person.id}">Remover</button>
      </div>
    `;
    list.appendChild(card);
  });

  list.querySelectorAll('.mgmt-action-btn--remove').forEach(b => b.addEventListener('click', () => removeAttendee(b.dataset.id)));
  list.querySelectorAll('.mgmt-status-btn').forEach(s => s.addEventListener('change', () => changeAttendeeStatus(s.dataset.id, s.value)));
}

function initAttendanceUI() {
  if (!document.getElementById('attendAddBtn')) return;
  document.getElementById('attendAddBtn').addEventListener('click', () => {
    const inp = document.getElementById('attendName');
    const sel = document.getElementById('attendStatus');
    if (addAttendee(inp.value, sel.value)) { inp.value = ''; inp.focus(); }
  });
  document.getElementById('attendName').addEventListener('keydown', e => { if (e.key==='Enter') document.getElementById('attendAddBtn').click(); });

  // Busca em tempo real
  document.getElementById('attendSearch').addEventListener('input', e => {
    attendSearch = e.target.value;
    renderAttendance();
  });

  // Abas de filtro
  document.getElementById('attendTabs').addEventListener('click', e => {
    const btn = e.target.closest('.mgmt-tab');
    if (!btn) return;
    document.querySelectorAll('#attendTabs .mgmt-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    attendFilter = btn.dataset.filter;
    renderAttendance();
  });

  renderAttendance();
}

/* ══════════════════════════════════════════════════════════════
   MÓDULO: LISTA DE PRESENTES
══════════════════════════════════════════════════════════════ */

const GIFT_META = {
  available: { label: 'Disponível', cls: 'available' },
  reserved:  { label: 'Reservado',  cls: 'reserved'  },
  delivered: { label: 'Entregue',   cls: 'delivered' },
};

const DEFAULT_GIFTS = [
  { name: 'Perfume', category: 'Beleza', icon: '&#10022;' },
  { name: 'Flores', category: 'Decora\u00e7\u00e3o', icon: '&#10048;' },
  { name: 'Livro', category: 'Cultura', icon: '&#9671;' },
  { name: 'Bolsa', category: 'Acess\u00f3rios', icon: '&#10070;' },
  { name: 'Kit maquiagem', category: 'Beleza', icon: '&#10022;' },
  { name: 'Joias', category: 'Acess\u00f3rios', icon: '&#10023;' },
  { name: 'Caixa de chocolates', category: 'Del\u00edcias', icon: '&#9672;' },
  { name: 'Fone Bluetooth', category: 'Tecnologia', icon: '&#9711;' },
  { name: '\u00c1lbum de fotos', category: 'Mem\u00f3rias', icon: '&#10022;' },
  { name: 'Velas arom\u00e1ticas', category: 'Casa', icon: '&#10038;' },
  { name: 'Kit skincare', category: 'Beleza', icon: '&#10023;' },
  { name: 'Urso de pel\u00facia', category: 'Afeto', icon: '&#10022;' },
  { name: 'Porta-retratos', category: 'Mem\u00f3rias', icon: '&#9711;' },
  { name: 'Necessaire', category: 'Acess\u00f3rios', icon: '&#9671;' },
  { name: 'Caneca personalizada', category: 'Personalizado', icon: '&#10070;' },
  { name: 'Smartwatch', category: 'Tecnologia', icon: '&#9672;' },
  { name: 'Alexa', category: 'Tecnologia', icon: '&#10023;' },
  { name: 'Polaroid', category: 'Mem\u00f3rias', icon: '&#10022;' },
  { name: 'Caixa organizadora', category: 'Casa', icon: '&#9671;' },
  { name: 'Espelho camarim', category: 'Beleza', icon: '&#10038;' },
];

GIFT_META.available.label = 'Dispon\u00edvel';

let giftFilter  = 'all';
let giftSearch  = '';
let _modalGiftId = null, _modalAction = null;

function saveGifts() { localStorage.setItem(CONFIG.giftsKey, JSON.stringify(giftsList)); }

function seedDefaultGifts() {
  let changed = false;
  DEFAULT_GIFTS.forEach(item => {
    const exists = giftsList.some(g => normalizeName(g.name) === normalizeName(item.name));
    if (!exists) {
      giftsList.push({
        id: uid(),
        name: item.name,
        category: item.category,
        icon: item.icon,
        status: 'available',
        reservedBy: null,
        addedAt: new Date().toLocaleDateString('pt-BR'),
      });
      changed = true;
    }
  });
  if (changed) saveGifts();
}

function getGiftIcon(gift) {
  const found = DEFAULT_GIFTS.find(item => normalizeName(item.name) === normalizeName(gift.name));
  return gift.icon || (found && found.icon) || '&#10022;';
}

function addGift(name, category) {
  const norm = normalizeName(name);
  if (!norm) { showFeedback('giftFeedback', '✕ Insira o nome do presente.', 'error'); return false; }
  if (giftsList.some(g => normalizeName(g.name) === norm)) {
    showFeedback('giftFeedback', `✕ "${name.trim()}" já está na lista.`, 'error'); return false;
  }
  giftsList.push({ id: uid(), name: name.trim(), category: category.trim(), icon: '&#10022;', status: 'available', reservedBy: null, addedAt: new Date().toLocaleDateString('pt-BR') });
  saveGifts();
  showFeedback('giftFeedback', `✦ "${name.trim()}" adicionado.`, 'success');
  renderGifts();
  return true;
}

function removeGift(id) {
  const idx = giftsList.findIndex(g => g.id === id);
  if (idx === -1) return;
  const name = giftsList[idx].name;
  giftsList.splice(idx, 1);
  saveGifts(); showFeedback('giftFeedback', `✦ "${name}" removido.`, 'success'); renderGifts();
}

function unreserveGift(id) {
  const g = giftsList.find(g => g.id === id);
  if (g) { g.status = 'available'; g.reservedBy = null; saveGifts(); renderGifts(); }
}

function openGiftModal(giftId, action) {
  _modalGiftId = giftId; _modalAction = action;
  const g = giftsList.find(g => g.id === giftId);
  if (!g) return;
  document.getElementById('giftModalTitle').textContent    = action==='reserve' ? 'Reservar Presente' : 'Marcar como Entregue';
  document.getElementById('giftModalGiftName').textContent = g.name;
  document.getElementById('giftModalBtnLabel').textContent = action==='reserve' ? 'Confirmar Reserva' : 'Confirmar Entrega';
  document.getElementById('giftModalPerson').value = '';
  document.getElementById('giftModal').classList.add('open');
}

function closeGiftModal() { document.getElementById('giftModal').classList.remove('open'); _modalGiftId = null; _modalAction = null; }

function applyGiftModal(person) {
  if (!_modalGiftId || !person.trim()) { markInputError(document.getElementById('giftModalPerson')); return; }
  const g = giftsList.find(g => g.id === _modalGiftId);
  if (!g) return;
  g.reservedBy = person.trim();
  g.status = _modalAction === 'reserve' ? 'reserved' : 'delivered';
  saveGifts(); closeGiftModal(); renderGifts();
}

function renderGifts() {
  const list  = document.getElementById('giftList');
  const empty = document.getElementById('giftEmpty');
  if (!list) return;

  // Stats
  const c = { available: 0, reserved: 0, delivered: 0 };
  giftsList.forEach(g => { if (c[g.status]!==undefined) c[g.status]++; });
  document.getElementById('giftStatAvail').textContent    = c.available;
  document.getElementById('giftStatReserved').textContent = c.reserved;
  document.getElementById('giftStatDelivered').textContent= c.delivered;
  document.getElementById('giftStatTotal').textContent    = giftsList.length;

  // Filtrar
  let visible = giftFilter==='all' ? [...giftsList] : giftsList.filter(g => g.status===giftFilter);
  if (giftSearch) { const q = giftSearch.toLowerCase(); visible = visible.filter(g => g.name.toLowerCase().includes(q) || (g.category||'').toLowerCase().includes(q)); }

  list.querySelectorAll('.mgmt-item-card').forEach(el => el.remove());
  if (visible.length === 0) { empty.style.display='block'; return; }
  empty.style.display = 'none';

  visible.forEach(gift => {
    const meta = GIFT_META[gift.status] || GIFT_META.available;

    let actions = '';
    if (gift.status==='available') {
      actions = `<button class="mgmt-action-btn gift-reserve-btn" data-action="reserve" data-id="${gift.id}">Reservar</button>`;
    } else if (gift.status==='reserved') {
      actions = `<button class="mgmt-action-btn mgmt-action-btn--confirm" data-action="deliver" data-id="${gift.id}">Confirmar Entrega</button>
                 <button class="mgmt-action-btn" data-action="unreserve" data-id="${gift.id}">Liberar</button>`;
    } else {
      actions = `<button class="mgmt-action-btn gift-disabled-btn" type="button" disabled>Presente Entregue</button>`;
    }

    const reservedLine = gift.reservedBy
      ? `<span class="mgmt-card-meta">${gift.status==='delivered'?'Entregue':'Reservado'} por <strong style="color:var(--gold-light)">${escapeHtml(gift.reservedBy)}</strong></span>` : '';
    const catLine = gift.category ? `<span class="mgmt-card-category">${escapeHtml(gift.category)}</span>` : '';

    const card = document.createElement('div');
    card.className = 'mgmt-item-card glass-card';
    card.dataset.status = gift.status; card.dataset.id = gift.id;
    card.innerHTML = `
      <div class="mgmt-card-header">
        <span class="gift-card-icon" aria-hidden="true">${getGiftIcon(gift)}</span>
        <span class="mgmt-card-name">${escapeHtml(gift.name)}</span>
        <span class="mgmt-card-badge mgmt-card-badge--${meta.cls}">${meta.label}</span>
      </div>
      ${catLine}${reservedLine}
      <span class="mgmt-card-meta">Adicionado em ${gift.addedAt}</span>
      <div class="mgmt-card-actions">${actions}</div>
    `;
    list.appendChild(card);
  });

  list.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const { action, id } = btn.dataset;
      if (action==='reserve')   openGiftModal(id,'reserve');
      if (action==='deliver')   openGiftModal(id,'deliver');
      if (action==='unreserve') unreserveGift(id);
      if (action==='remove')    removeGift(id);
    });
  });
}

function initGiftsUI() {
  const legacyGiftPanel = document.getElementById('panel-gifts');
  if (legacyGiftPanel && legacyGiftPanel.getAttribute('aria-hidden') === 'true') return;
  if (!document.getElementById('giftAddBtn')) return;
  seedDefaultGifts();
  document.getElementById('giftAddBtn').addEventListener('click', () => {
    const ni = document.getElementById('giftName'), ci = document.getElementById('giftCategory');
    if (addGift(ni.value, ci.value)) { ni.value=''; ci.value=''; ni.focus(); }
  });
  document.getElementById('giftName').addEventListener('keydown', e => { if(e.key==='Enter') document.getElementById('giftAddBtn').click(); });

  // Busca
  document.getElementById('giftSearch').addEventListener('input', e => { giftSearch = e.target.value; renderGifts(); });

  // Abas
  document.getElementById('giftTabs').addEventListener('click', e => {
    const btn = e.target.closest('.mgmt-tab'); if (!btn) return;
    document.querySelectorAll('#giftTabs .mgmt-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active'); giftFilter = btn.dataset.filter; renderGifts();
  });

  // Modal
  document.getElementById('giftModalConfirm').addEventListener('click', () => applyGiftModal(document.getElementById('giftModalPerson').value));
  document.getElementById('giftModalClose').addEventListener('click', closeGiftModal);
  document.getElementById('giftModal').addEventListener('click', e => { if (e.target===document.getElementById('giftModal')) closeGiftModal(); });
  document.getElementById('giftModalPerson').addEventListener('keydown', e => { if(e.key==='Enter') document.getElementById('giftModalConfirm').click(); });

  renderGifts();
}

function initGiftPixCopy() {
  const btn = document.getElementById('copyPixBtn');
  const feedback = document.getElementById('copyPixFeedback');
  if (!btn || !feedback) return;

  const showCopyFeedback = (message) => {
    feedback.textContent = message;
    feedback.classList.add('show');
    btn.classList.add('copied');
    window.setTimeout(() => {
      feedback.classList.remove('show');
      btn.classList.remove('copied');
    }, 2200);
  };

  const fallbackCopy = (text) => {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(field);
    return copied;
  };

  btn.addEventListener('click', async () => {
    const pix = btn.dataset.pix || '156.434.786.92';
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(pix);
      } else if (!fallbackCopy(pix)) {
        throw new Error('copy-failed');
      }
      showCopyFeedback('PIX copiado com sucesso ✨');
    } catch (err) {
      showCopyFeedback('Copie: ' + pix);
    }
  });
}

function initAdminPanel() {
  const panel = document.getElementById('adminPanel');
  if (!panel) return;

  const openAdminIfNeeded = () => {
    const shouldOpen = window.location.hash === '#admin-mariana';
    panel.hidden = !shouldOpen;
    if (shouldOpen) {
      panel.classList.add('visible');
      initAdminRealtime();
    }
  };

  window.addEventListener('hashchange', openAdminIfNeeded);
  openAdminIfNeeded();

  const search = document.getElementById('adminSearch');
  if (search) search.addEventListener('input', e => {
    adminSearch = e.target.value.toLowerCase().trim();
    renderAdminGuests();
  });

  const exportBtn = document.getElementById('adminExportCsv');
  if (exportBtn) exportBtn.addEventListener('click', exportAdminCsv);
}

let adminUnsubscribe = null;

function initAdminRealtime() {
  const status = document.getElementById('adminStatus');
  if (!rsvpCollection()) {
    if (status) status.textContent = 'Firebase não configurado. Preencha firebase-config.js para carregar o painel.';
    return;
  }
  if (adminUnsubscribe) return;

  if (status) status.textContent = 'Sincronizando confirmações em tempo real...';
  adminUnsubscribe = rsvpCollection().orderBy('createdAtMs', 'desc').onSnapshot(snapshot => {
    adminGuests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (status) status.textContent = '';
    renderAdminGuests();
  }, err => {
    console.error('Erro no painel admin:', err);
    if (status) status.textContent = 'Não foi possível carregar as confirmações.';
  });
}

function renderAdminGuests() {
  const list = document.getElementById('adminGuestList');
  const empty = document.getElementById('adminEmpty');
  const total = document.getElementById('adminTotalGuests');
  if (!list || !empty || !total) return;

  const filtered = adminGuests.filter(g => {
    const haystack = [g.name, g.message, ...(g.companionNames || [])].join(' ').toLowerCase();
    return !adminSearch || haystack.includes(adminSearch);
  });

  const totalPeople = filtered.reduce((sum, g) => sum + 1 + (g.companionNames || []).length, 0);
  total.textContent = totalPeople;
  list.querySelectorAll('.admin-guest-card').forEach(el => el.remove());
  empty.style.display = filtered.length ? 'none' : 'block';

  filtered.forEach(guest => {
    const card = document.createElement('article');
    card.className = 'admin-guest-card glass-card';
    const companions = (guest.companionNames || []).map(name => `<span>${escapeHtml(name)}</span>`).join('');
    const statusLabel = guest.status === 'confirmed' ? 'Confirmado' : 'Pendente';
    card.innerHTML = `
      <div class="admin-card-head">
        <div>
          <span class="admin-card-kicker">${escapeHtml(statusLabel)}</span>
          <h3>${escapeHtml(guest.name || '')}</h3>
        </div>
        <span class="admin-card-count">${1 + (guest.companionNames || []).length}</span>
      </div>
      ${companions ? `<div class="admin-companions">${companions}</div>` : ''}
      ${guest.message ? `<p class="admin-message">"${escapeHtml(guest.message)}"</p>` : ''}
      <div class="admin-card-foot">
        <span>${escapeHtml(guest.time || 'Sem data')}</span>
        <div class="admin-card-actions">
          <button type="button" class="mgmt-action-btn mgmt-action-btn--confirm" data-admin-action="confirm" data-id="${guest.id}">Confirmar</button>
          <button type="button" class="mgmt-action-btn mgmt-action-btn--remove" data-admin-action="delete" data-id="${guest.id}">Excluir</button>
        </div>
      </div>
    `;
    list.appendChild(card);
  });

  list.querySelectorAll('[data-admin-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (!id || !rsvpCollection()) return;
      try {
        if (btn.dataset.adminAction === 'delete') await rsvpCollection().doc(id).delete();
        if (btn.dataset.adminAction === 'confirm') await rsvpCollection().doc(id).update({ status: 'confirmed' });
      } catch (err) {
        const status = document.getElementById('adminStatus');
        if (status) status.textContent = 'Ação não concluída. Verifique permissões do Firestore.';
      }
    });
  });
}

function exportAdminCsv() {
  const rows = [['Nome', 'Acompanhantes', 'Mensagem', 'Status', 'Horario']];
  adminGuests.forEach(g => {
    rows.push([
      g.name || '',
      (g.companionNames || []).join(' | '),
      g.message || '',
      g.status || '',
      g.time || '',
    ]);
  });
  const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'confirmacoes-mariana.csv';
  link.click();
  URL.revokeObjectURL(url);
}

// The First Step — official website
// The design is a storyboard of 16 frames (1728 × 1265), each one the same page at a later scroll
// position. In "stage" mode this script pins that canvas to the window and interpolates every
// layer between the frames as the page scrolls, so each layer travels at its own rate (parallax).
// On phones, tablets and portrait windows the page falls back to a stacked layout (see styles.css).

const DW = 1728;            // design width
const FIT_H = 1080;         // the canvas is scaled so at least this much design height is visible
const root = document.documentElement;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const canvas = $('#canvas');
const track = $('#track');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const stageQuery = matchMedia('(min-width: 900px) and (min-aspect-ratio: 23/20)');

/* ---------- Scroll positions of the storyboard frames (design px of scroll) ---------- */
const STEP = 900;           // scroll per "How it works" step
const HOLD = .6;            // share of each step's scroll where the screen sits still and sharp
const S = {};
S.H = 0;                    // frame 1   hero
S.A = 980;                  // frame 11  about
S.A2 = S.A + 500;           //           about text finishes revealing (held)
S.W1 = S.A2 + 1182;         // frame 2   how it works, step 1
S.W7 = S.W1 + STEP * 6;     // frame 8   step 7
S.E = S.W7 + STEP;          // frame 9   panel folds into "Every room teaches the next one."
S.T = S.E + 980;            // frame 10  statement + stacked cards
S.F = S.T + 600;            // frame 12  cards fanned out
S.K = S.F + 1036;           // frame 13  kit of parts
S.M = S.K + 1156;           // frame 14  team
S.Z = S.M + 720;            // frame 16  footer
const TOTAL = S.Z;

const io = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const out = t => 1 - Math.pow(1 - t, 3);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/* ---------- Layers: [scroll, props] keyframes. Props carry forward; values may be v => number
   where v = { V: visible design height, m: side margin beyond the 1728 canvas }.
   x/y are translations, s scale, r rotation (deg), o opacity, w/h size. ax: -1/1 pins a layer
   to the left/right window edge. ---------- */
const footerZ = v => v.V - 652;
const panelFit = v => Math.min(1, (v.V - 175) / 1063);
// Statement + kit cards (design y 327…1040): lifted so the block sits centred between the navbar and the window's bottom edge
const compShift = v => clamp(109 + (v.V - 109 - 713) / 2 - 327, -170, 0);
const panelW = v => (1688 + 2 * v.m) / panelFit(v);      // edge to edge once the fit scale is applied

const LAYERS = {
  leafL:      { ax: -1, keys: [[S.H, { x: -490, y: -92, o: 1 }], [S.A, { y: -760, o: 0 }]] },
  leafR:      { ax: 1,  keys: [[S.H, { x: 1459, y: 701, o: 1 }], [S.A, { y: -250, o: 0 }]] },
  hero:       { keys: [[S.H, { x: 110, y: 350 }], [S.A, { y: -1022 }], [S.A2, { y: -1700 }]] },
  // the booklet and plant card drift away from the laptop as the hero scrolls off
  heroBook:   { keys: [[S.H, { x: 0, y: 0, r: 0 }], [S.A * .75, { x: -460, y: 150, r: -12, e: out }]] },
  heroCard:   { keys: [[S.H, { x: 0, y: 0, r: 0 }], [S.A * .75, { x: 380, y: -170, r: 11, e: out }]] },

  aboutText:  { keys: [[S.H, { x: 110, y: 1307 }], [S.A, { y: 327 }], [S.A2, { y: 327 }], [S.W1, { y: -1313 }]] },
  aboutLeaves:{ ax: -1, keys: [[S.H, { x: -114, y: v => v.V + 1032 }], [S.A, { y: v => v.V - 528 }], [S.A2, { y: v => v.V - 590 }], [S.W1, { y: -903 }]] },
  flSwatch:   { keys: [[S.H, { x: 103, y: 1929, r: -14 }], [S.A, { y: 578.93, r: 0 }], [S.A2, { y: 540, r: 4 }], [S.W1, { y: -320, r: 14 }]] },
  flPlant:    { keys: [[S.H, { x: 268, y: 2134 }], [S.A, { y: 634 }], [S.A2, { y: 566 }], [S.W1, { y: -265 }]] },
  flLight:    { keys: [[S.H, { x: 460.08, y: 1721, r: 16 }], [S.A, { y: 471.08, r: 0 }], [S.A2, { y: 362, r: -5 }], [S.W1, { y: -528, r: -16 }]] },

  fadeBottom: { keys: [[S.H, { y: v => v.V - 138, o: 0 }], [S.A, { o: 1 }]] },
  fadeTop:    { keys: [[S.A2, { o: 0 }], [S.W1, { o: 1 }]] },

  panel:      { origin: 'center', keys: [
                [S.H,  { x: v => 864 - panelW(v) / 2, y: v => v.V + 9, w: panelW, h: 1063, s: 1 }],
                [S.A,  { y: v => v.V + 72 }],
                [S.A2, { y: v => v.V + 72 }],
                [S.W1, { y: v => 155 - 1063 * (1 - panelFit(v)) / 2, s: panelFit }],
                [S.W7, {}],
                [S.E,  { x: 243, y: v => Math.max(180, (v.V - 645) / 2), w: 1243, h: 645, s: 1, e: io }],
                [S.T,  { s: 0, e: io }]] },
  howInner:   { keys: [[S.W7, { x: 0, y: 0, o: 1 }], [S.W7 + STEP * .45, { o: 0 }], [S.E, { x: -222, y: -1222, o: 0, e: io }]] },
  everyHead:  { keys: [[S.W7 + STEP * .35, { y: 110, o: 0 }], [S.E, { y: 0, o: 1, e: out }]] },
  everyLeafTR:{ keys: [[S.W7, { x: 240, y: -230 }], [S.E, { x: 0, y: 0, e: io }]] },
  everyLeafBL:{ keys: [[S.W7, { x: -260, y: 265 }], [S.E, { x: 0, y: 0, e: io }]] },

  statement:  { keys: [[S.E, { x: 429, y: v => v.V + 42 }], [S.T, { y: v => 327 + compShift(v) }], [S.F, {}], [S.K, { y: -709 }]] },
  cardL:      { origin: 'center', keys: [[S.E, { x: 559, y: v => v.V + 296, r: 0 }], [S.T, { y: v => 581 + compShift(v) }], [S.F, { x: 219.8, y: v => 581.3 + compShift(v), r: -11.9, e: io }], [S.K, { y: -455 }]] },
  cardR:      { origin: 'center', keys: [[S.E, { x: 812, y: v => v.V + 296, r: 0 }], [S.T, { y: v => 581 + compShift(v) }], [S.F, { x: 1144.7, y: v => 575 + compShift(v), r: 15, e: io }], [S.K, { y: -461 }]] },
  cardM:      { keys: [[S.E, { x: 677.78, y: v => v.V + 296 }], [S.T, { y: v => 581 + compShift(v) }], [S.F, {}], [S.K, { y: -455 }]] },
  pendant:    { ax: 1,  keys: [[S.E, { x: 1396, y: -319, s: .788 }], [S.T, { x: 1349, y: 0, s: 1 }], [S.F, {}], [S.K, { x: 1679, y: -330 }]] },
  branch:     { ax: -1, keys: [[S.E, { x: -5, y: v => v.V + 13, s: .68 }], [S.T, { x: 0, y: v => v.V - 328, s: 1 }], [S.F, {}], [S.K, { x: -414, y: v => v.V - 18 }]] },

  kitHead:    { keys: [[S.F, { x: 110, y: 382, s: .137, o: 0 }], [S.F + (S.K - S.F) * .6, { y: 350, s: .55, o: 0 }], [S.K, { y: 303, s: 1, o: 1, e: out }], [S.M, { y: -853 }]] },
  kitNote:    { keys: [[S.F, { x: 110, y: v => v.V + 28 }], [S.K, { y: 695 }], [S.M, { y: -461 }]] },
  kitBook:    { origin: 'center', keys: [[S.F, { x: 1216, y: v => v.V + 23, s: 1, r: 0 }], [S.K, { x: 1089.5, y: v => 851.5 - (1265 - v.V) * .45, s: 2.031, r: -15, e: out }], [S.M, { y: -1150 }]] },

  campus:     { keys: [[S.K, { x: -387, y: v => v.V + 1102 }], [S.M, { y: v => v.V - 404 }], [S.Z, { y: v => v.V + 6 }]] },
  team:       { keys: [[S.K, { x: 317, y: v => v.V + 96 }], [S.M, { y: 205 }], [S.Z, { y: v => footerZ(v) - 958 }]] },
  fadeBottom2:{ keys: [[S.K, { y: v => v.V - 98, o: 0 }], [S.M, { o: 1 }]] },
  footer:     { keys: [[S.K, { x: v => 20 - v.m, w: v => 1688 + 2 * v.m, y: v => v.V + 1224 }], [S.M, { y: v => v.V + 68 }], [S.Z, { y: footerZ }]] },
  footBig:    { keys: [[S.M, { y: 170 }], [S.Z, { y: 0, e: out }]] },
};

const DEFAULTS = { x: 0, y: 0, s: 1, r: 0, o: 1 };
const HOW_FILL = [39, 66, 95, 122, 143, 164, 192];

/* ---------- State ---------- */
let stage = false;
let k = 1, V = 1265, m = 0;
let cur = 0, target = 0, raf = 0;
const layers = [];

for (const [name, def] of Object.entries(LAYERS)) {
  const el = $(`[data-l="${name}"]`);
  if (!el) continue;
  if (def.origin) el.style.transformOrigin = def.origin;
  layers.push({ name, el, def, resolved: [], last: '' });
}

const steps = $$('.step').map(el => ({ el, text: $('.step-text', el), shot: $('.step-shot', el) }));
const howFill = $('.how-bar-fill');

/* Nav buttons reserve their bold width so hover never shifts the row */
$$('.btn-nav').forEach(a => { a.dataset.label = a.textContent.trim(); a.innerHTML = `<span>${a.textContent.trim()}</span>`; });

/* Word-by-word text reveal */
const words = {};
$$('[data-words]').forEach(box => {
  const list = [];
  $$('.dim', box).forEach(span => {
    const frag = document.createDocumentFragment();
    span.textContent.split(/(\s+)/).forEach(tok => {
      if (!tok.trim()) { frag.append(tok); return; }
      const w = document.createElement('span');
      w.className = 'w'; w.textContent = tok;
      frag.append(w); list.push(w);
    });
    span.classList.remove('dim');
    span.replaceChildren(frag);
  });
  words[box.dataset.words] = { list, n: -1 };
});
function revealWords(key, p) {
  const g = words[key]; if (!g) return;
  const n = Math.round(clamp(p) * g.list.length);
  if (n === g.n) return;
  g.list.forEach((w, i) => w.classList.toggle('on', i < n));
  g.n = n;
}

/* ---------- Keyframe resolution + sampling ---------- */
function resolve() {
  const ctx = { V, m };
  for (const L of layers) {
    let prev = { ...DEFAULTS };
    L.resolved = L.def.keys.map(([at, props]) => {
      const p = { ...prev };
      for (const [key, val] of Object.entries(props)) if (key !== 'e') p[key] = typeof val === 'function' ? val(ctx) : val;
      prev = p;
      return { at, p, e: props.e };
    });
    L.last = '';
  }
}

function sample(L, s) {
  const ks = L.resolved;
  if (s <= ks[0].at) return ks[0].p;
  const last = ks[ks.length - 1];
  if (s >= last.at) return last.p;
  let i = 1;
  while (ks[i].at < s) i++;
  const a = ks[i - 1], b = ks[i];
  let t = (s - a.at) / (b.at - a.at);
  if (b.e) t = b.e(t);
  const r = {};
  for (const key in b.p) r[key] = a.p[key] + (b.p[key] - a.p[key]) * t;
  return r;
}

function render(s) {
  for (const L of layers) {
    const p = sample(L, s);
    const x = p.x + (L.def.ax ? L.def.ax * m : 0);
    let css = `translate3d(${x.toFixed(2)}px,${p.y.toFixed(2)}px,0)`;
    if (p.r) css += ` rotate(${p.r.toFixed(3)}deg)`;
    if (p.s !== 1) css += ` scale(${p.s.toFixed(4)})`;
    const sig = css + '|' + p.o.toFixed(3) + '|' + (p.w || 0).toFixed(1) + '|' + (p.h || 0).toFixed(1);
    if (sig === L.last) continue;
    L.last = sig;
    const st = L.el.style;
    st.transform = css;
    st.opacity = p.o.toFixed(3);
    st.visibility = p.o < .004 || p.s < .004 ? 'hidden' : 'visible';
    if (p.w) st.width = p.w.toFixed(1) + 'px';
    if (p.h) st.height = p.h.toFixed(1) + 'px';
  }

  // How it works: the seven steps cross-fade inside the pinned panel
  // Each step holds still for HOLD of its scroll, then hands over to the next in the remainder
  const raw = clamp((s - S.W1) / STEP, 0, 6);
  const ri = Math.min(5, Math.floor(raw));
  const f = raw >= 6 ? 6 : ri + io(clamp((raw - ri - HOLD) / (1 - HOLD)));
  steps.forEach((st, i) => {
    const d = f - i;                                   // 0 = this step is centred
    const o = clamp((.5 - Math.abs(d)) / .22 + .5);
    st.text.style.opacity = o.toFixed(3);
    st.text.style.transform = `translate3d(0,${(-d * 46).toFixed(1)}px,0)`;
    st.shot.style.opacity = o.toFixed(3);
    st.shot.style.transform = `translate3d(0,${(-d * 70).toFixed(1)}px,0) scale(${(1 - Math.min(.04, Math.abs(d) * .06)).toFixed(4)})`;
    st.shot.style.zIndex = Math.round(10 - Math.abs(d) * 4);
    const blur = Math.min(14, Math.abs(d) * 30);          // the screenshot blurs as it travels, sharp when settled
    st.shot.style.filter = blur > .4 ? `blur(${blur.toFixed(1)}px)` : 'none';
  });
  const i0 = Math.floor(f), t = f - i0;
  const h = HOW_FILL[i0] + ((HOW_FILL[Math.min(6, i0 + 1)] - HOW_FILL[i0]) * t);
  howFill.style.height = h.toFixed(1) + 'px';

  revealWords('about', (s - S.A + 30) / (S.A2 - S.A - 60));
  revealWords('statement', (s - S.T + 80) / (S.F - S.T - 120));

  setCurrent(s < S.A - 400 ? 'home' : s < S.W1 - 500 ? 'about' : s < S.T - 400 ? 'how' : s < S.M - 500 ? 'components' : 'team');
}

let currentNav = '';
function setCurrent(id) {
  if (id === currentNav) return;
  currentNav = id;
  $$('.menu .btn-nav').forEach(a => a.classList.toggle('is-current', a.dataset.go === id));
}

/* ---------- Scroll loop (eased so the layers glide rather than step with the wheel) ---------- */
let lastT = 0;
function tick(now) {
  const dt = Math.min(250, lastT ? now - lastT : 16);   // time-based, so the glide is the same at any frame rate
  lastT = now;
  const d = target - cur;
  if (Math.abs(d) < .3 || reduced.matches) cur = target; else cur += d * (1 - Math.exp(-dt / 130));
  render(cur);
  if (cur === target) { raf = 0; lastT = 0; } else raf = requestAnimationFrame(tick);
}
/* Navbar: full width at the top and whenever the page is scrolled upward, compact while scrolling down */
const nav = $('.nav');
let navWide = null, lastY = 0;
function setNav(wide) {
  if (wide === navWide) return;
  navWide = wide;
  nav.style.transform = `translate3d(${wide ? 110 : 365}px,0,0)`;
  nav.style.width = (wide ? 1508 : 998) + 'px';
}
function onScroll() {
  const y = scrollY;
  if (y < 80 * k || y < lastY - 2) setNav(true); else if (y > lastY + 2) setNav(false);
  lastY = y;
  target = clamp(scrollY / k, 0, TOTAL);
  if (!raf) raf = requestAnimationFrame(tick);
}

/* ---------- Stacked layout: the three kit cards are a carousel that loops forever ---------- */
const cardsBox = $('.cards');
const cardEls = $$('.card-slot', cardsBox);
let cardClones = null, cardsTimer = 0;
const cardsSetW = () => cardClones[cardEls.length].offsetLeft - cardEls[0].offsetLeft;   // one full set of cards
function centreCard(el) { cardsBox.scrollLeft = el.offsetLeft - (cardsBox.clientWidth - el.offsetWidth) / 2; }
function setupCards() {
  if (cardClones) return;
  const copy = () => cardEls.map(c => {
    const n = c.cloneNode(true);
    n.removeAttribute('data-l'); n.removeAttribute('style');
    n.classList.add('card-clone'); n.setAttribute('aria-hidden', 'true');
    return n;
  });
  const before = copy(), after = copy();
  cardsBox.prepend(...before); cardsBox.append(...after);
  cardClones = [...before, ...after];
  requestAnimationFrame(() => centreCard(cardEls[cardEls.length - 1]));      // start on the plant card
  cardsBox.addEventListener('scroll', () => {
    clearTimeout(cardsTimer);
    cardsTimer = setTimeout(() => {                    // once the swipe settles, hop back into the middle set
      if (stage) return;
      const w = cardsSetW(), base = cardEls[0].offsetLeft, mid = cardsBox.scrollLeft + cardsBox.clientWidth / 2;
      if (mid < base) cardsBox.scrollLeft += w; else if (mid > base + w) cardsBox.scrollLeft -= w;
    }, 120);
  }, { passive: true });
}

/* Auto-advance: the carousel moves on by one card every few seconds; touching it pauses it for a while */
let cardsPausedUntil = 0, cardsOnScreen = false;
const pauseCards = () => { cardsPausedUntil = performance.now() + 5000; };
['pointerdown', 'touchstart', 'wheel'].forEach(t => cardsBox.addEventListener(t, pauseCards, { passive: true }));
new IntersectionObserver(es => { cardsOnScreen = es[0].isIntersecting; }, { threshold: .3 }).observe(cardsBox);
setInterval(() => {
  if (stage || !cardClones || !cardsOnScreen || document.hidden || reduced.matches || performance.now() < cardsPausedUntil) return;
  const mid = cardsBox.scrollLeft + cardsBox.clientWidth / 2;
  const all = [...cardsBox.children];
  let cur = 0, best = Infinity;
  all.forEach((el, i) => { const d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid); if (d < best) { best = d; cur = i; } });
  const next = all[cur + 1];
  if (next) cardsBox.scrollTo({ left: next.offsetLeft - (cardsBox.clientWidth - next.offsetWidth) / 2, behavior: 'smooth' });
}, 2800);

/* 3D hover on the kit cards: grow a little and lean toward the cursor (same feel as the contact page's team cards) */
const canHover = matchMedia('(hover: hover) and (pointer: fine)');
$$('.cards .card').forEach(card => {
  let tiltRaf = 0, last = null;
  const apply = () => {
    tiltRaf = 0;
    if (!last) return;
    const r = card.getBoundingClientRect();
    const px = (last.x - r.left) / r.width - .5, py = (last.y - r.top) / r.height - .5;
    card.style.setProperty('--ry', (px * 18).toFixed(2) + 'deg');
    card.style.setProperty('--rx', (-py * 18).toFixed(2) + 'deg');
  };
  card.addEventListener('pointerenter', ev => {
    if (!canHover.matches || reduced.matches) return;
    card.style.setProperty('--sc', '1.05');
    last = { x: ev.clientX, y: ev.clientY };
    apply();
    setTimeout(() => { if (last) card.classList.add('is-tilting'); }, 180);
  });
  card.addEventListener('pointermove', ev => {
    if (!canHover.matches || reduced.matches) return;
    last = { x: ev.clientX, y: ev.clientY };
    if (!tiltRaf) tiltRaf = requestAnimationFrame(apply);
  });
  card.addEventListener('pointerleave', () => {
    last = null;
    card.classList.remove('is-tilting');
    ['--rx', '--ry', '--sc'].forEach(p => card.style.removeProperty(p));
  });
});

/* ---------- "Best viewed on a laptop or desktop" notice for the stacked layout ---------- */
const notice = $('#notice');
let noticeDone = false;
try { noticeDone = sessionStorage.getItem('fs-notice') === '1'; } catch {}
function showNotice(want) {
  const on = want && !noticeDone;
  notice.hidden = !on;
  root.classList.toggle('notice-open', on);
}
$('#notice-go').addEventListener('click', () => {
  noticeDone = true;
  try { sessionStorage.setItem('fs-notice', '1'); } catch {}
  showNotice(false);
});

/* ---------- Layout ---------- */
function measure() {
  const vw = root.clientWidth, vh = innerHeight;
  k = Math.min(vw / DW, vh / FIT_H);
  V = vh / k;
  m = Math.max(0, (vw / k - DW) / 2);
  canvas.style.transform = `translate(${((vw - DW * k) / 2).toFixed(2)}px,0) scale(${k.toFixed(5)})`;
  canvas.style.setProperty('--m', m.toFixed(2) + 'px');
  track.style.height = Math.round(TOTAL * k + vh) + 'px';
  root.style.setProperty('--k', k.toFixed(4));
  resolve();
  const wide = navWide ?? scrollY < 80 * k; navWide = null; setNav(wide); lastY = scrollY;
  target = cur = clamp(scrollY / k, 0, TOTAL);
  render(cur);
}

function clearStage() {
  canvas.style.transform = '';
  for (const L of layers) { L.el.style.cssText = ''; if (L.def.origin) L.el.style.transformOrigin = ''; L.last = ''; }
  steps.forEach(st => { st.text.style.cssText = ''; st.shot.style.cssText = ''; });
  howFill.style.height = '';
  nav.style.transform = ''; nav.style.width = ''; navWide = null;
  Object.keys(words).forEach(key => revealWords(key, 1));
  track.style.height = '';
}

function setMode() {
  const want = stageQuery.matches;
  if (want && !stage) {
    stage = true;
    root.classList.add('stage');
    for (const L of layers) if (L.def.origin) L.el.style.transformOrigin = L.def.origin;
    addEventListener('scroll', onScroll, { passive: true });
  } else if (!want && stage) {
    stage = false;
    root.classList.remove('stage');
    removeEventListener('scroll', onScroll);
    clearStage();
  }
  if (stage) measure(); else { root.style.setProperty('--k', Math.min(1, root.clientWidth / 520).toFixed(3)); Object.keys(words).forEach(key => revealWords(key, 1)); setupCards(); }
  showNotice(!stage);
}

/* ---------- Navigation ---------- */
const GOTO = { home: S.H, about: S.A + 250, how: S.W1, components: S.F, team: S.M, contact: S.Z };
const SECTION = { home: '#home', about: '#about', how: '#how', components: '#components', team: '#team', contact: '#contact' };
document.addEventListener('click', ev => {
  const a = ev.target.closest('[data-go]');
  if (!a) return;
  ev.preventDefault();
  const id = a.dataset.go;
  const behavior = reduced.matches ? 'auto' : 'smooth';
  if (stage) scrollTo({ top: Math.round(GOTO[id] * k), behavior });
  else $(SECTION[id])?.scrollIntoView({ behavior, block: 'start' });
});

/* ---------- Stacked layout: reveal blocks as they enter ---------- */
const riseEls = $$('.hero-copy, .hero-mac, .about-text, .how-head, .how-steps, .every, .statement, .cards, .kit-head, .kit-note, .kit-book, .team-head, .team-photo, .foot-brand, .foot-col');
riseEls.forEach(el => el.classList.add('rise'));
const riseIO = new IntersectionObserver(entries => {
  entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); riseIO.unobserve(en.target); } });
}, { rootMargin: '0px 0px -10% 0px' });
riseEls.forEach(el => riseIO.observe(el));

/* ---------- Stacked layout: "How it works" is a swipeable carousel with dots ---------- */
const howList = $('.how-steps');
const dots = document.createElement('div');
dots.className = 'how-dots';
steps.forEach((st, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.setAttribute('aria-label', `Step ${i + 1}: ${$('h3', st.el).textContent}`);
  b.addEventListener('click', () => howList.scrollTo({ left: st.el.offsetLeft - howList.offsetLeft - (howList.clientWidth - st.el.offsetWidth) / 2, behavior: reduced.matches ? 'auto' : 'smooth' }));
  dots.append(b);
});
howList.after(dots);
function syncDots() {
  const box = howList.getBoundingClientRect(), mid = box.left + box.width / 2;
  let best = 0, bestD = Infinity;
  steps.forEach((st, i) => { const r = st.el.getBoundingClientRect(); const d = Math.abs(r.left + r.width / 2 - mid); if (d < bestD) { bestD = d; best = i; } });
  [...dots.children].forEach((b, i) => b.classList.toggle('is-on', i === best));
}
howList.addEventListener('scroll', syncDots, { passive: true });
syncDots();

/* ---------- Boot ---------- */
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
scrollTo(0, 0);
setMode();
stageQuery.addEventListener('change', setMode);
addEventListener('resize', () => { if (stage) measure(); else setMode(); });

const minLoader = new Promise(r => setTimeout(r, reduced.matches ? 150 : 3500));
const assetsReady = Promise.race([
  Promise.all([document.fonts?.ready, ...['macbook.png', 'leaves.png', 'grid.png'].map(n => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = `./assets/${n}`; }))]),
  new Promise(r => setTimeout(r, 7000)),
]);
Promise.all([minLoader, assetsReady]).then(() => {
  root.classList.add('loaded');
  // Arriving from another page with a section in the address (index.html#about): go straight there
  const startId = location.hash.slice(1);
  if (startId && startId !== 'home' && GOTO[startId] !== undefined) {
    if (stage) scrollTo(0, Math.round(GOTO[startId] * k)); else $(SECTION[startId])?.scrollIntoView();
  }
  // Anything already on screen shows straight away rather than waiting on the observer
  riseEls.forEach(el => { const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add('in'); });
  setTimeout(() => $('#loader')?.remove(), 1400);
});

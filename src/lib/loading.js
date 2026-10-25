// Loading + motion utilities: route progress bar, skeleton screens, lazy images,
// scroll reveal, lazy sections, number count-up, button spinners, toasts, lazy CSS.
import { html, raw } from './dom.js';
import { icon } from '../components/icons.js';

export const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- Route progress bar ---------- */
let progressTimer;
export const progress = {
  start() { const b = document.getElementById('progress'); if (!b) return; clearTimeout(progressTimer); b.classList.remove('is-done'); void b.offsetWidth; b.classList.add('is-active'); },
  done() { const b = document.getElementById('progress'); if (!b) return; b.classList.add('is-done'); progressTimer = setTimeout(() => b.classList.remove('is-active', 'is-done'), 320); }
};

/* ---------- Skeletons ---------- */
export const sk = (w, h, r = 10, extra = '') => `<span class="skeleton" style="width:${w};height:${h};border-radius:${r}px;${extra}" aria-hidden="true"></span>`;
const skIntro = (cta = true) => `<div class="page-intro"><div class="page-intro__text">${sk('min(420px,90%)', '44px')}${sk('min(560px,100%)', '16px')}</div>${cta ? sk('200px', '48px', 999) : ''}</div>`;
const skChips = (n = 4) => `<div class="row wrap gap-8">${Array.from({ length: n }, (_, i) => sk((70 + i * 12) + 'px', '40px', 999)).join('')}</div>`;
const skTile = () => `<div class="tile">${sk('100%', 'auto', 0, 'aspect-ratio:16/10;border-radius:0')}<div class="tile__body">${sk('55%', '18px')}${sk('85%', '12px')}<div class="row between" style="margin-top:4px">${sk('100px', '30px', 999)}${sk('120px', '12px')}</div></div></div>`;
const skRow = () => `<div class="tile tile--row">${sk('72px', '72px', 12)}<div class="stack gap-8 grow">${sk('45%', '16px')}${sk('60%', '12px')}${sk('80%', '12px')}</div></div>`;
const skCard = (h = '140px', lines = 2) => `<div class="card stack gap-12">${sk('50%', '18px')}${Array.from({ length: lines }, () => sk('90%', '12px')).join('')}${sk('100%', h, 12)}</div>`;
const skStat = () => `<div class="card stack gap-10">${sk('40%', '12px')}${sk('60%', '36px')}${sk('70%', '12px')}</div>`;
const skBanner = () => sk('100%', '240px', 20);
const skTable = (rows = 5) => `<div class="card stack gap-14">${sk('40%', '18px')}${Array.from({ length: rows }, () => `<div class="row gap-16">${sk('30%', '14px')}${sk('20%', '14px')}${sk('20%', '14px')}${sk('15%', '14px')}</div>`).join('')}</div>`;
const grid = (cls, items) => `<div class="grid ${cls}">${items.join('')}</div>`;

const VARIANTS = {
  library: () => skIntro() + skChips(4) + grid('grid--tiles', Array.from({ length: 6 }, skTile)),
  studio: () => `<div class="row wrap gap-8">${Array.from({ length: 4 }, () => sk('160px', '40px', 999)).join('')}</div>` + skIntro(false) + grid('grid--2', [skCard('200px'), skCard('200px')]),
  guideline: () => skBanner() + skIntro(false) + grid('grid--2', Array.from({ length: 4 }, () => skCard('120px'))),
  energy: () => skIntro() + grid('grid--3', Array.from({ length: 3 }, skStat)) + skCard('260px', 1) + skTable(5),
  impact: () => skIntro() + grid('grid--4', Array.from({ length: 4 }, skStat)) + grid('grid--3', Array.from({ length: 3 }, () => skCard('120px', 3))),
  reports: () => skIntro() + grid('grid--2', [skCard('420px', 3), `<div class="stack gap-20">${skCard('80px', 1)}${skCard('120px', 2)}</div>`]) + skTable(4),
  settings: () => skIntro(false) + grid('grid--3', Array.from({ length: 3 }, () => skCard('60px', 1))) + skTable(4) + skTable(3),
  generic: () => skIntro() + grid('grid--tiles', Array.from({ length: 3 }, skTile))
};
export function skeleton(variant = 'generic') {
  const body = (VARIANTS[variant] || VARIANTS.generic)();
  return html`<div class="page sk-page" aria-busy="true" aria-live="polite"><span class="sr-only">Loading…</span>${raw(body)}</div>`;
}
export function skeletonBlock(variant = 'generic') { return html`<div class="stack gap-20" aria-busy="true">${raw((VARIANTS[variant] || VARIANTS.generic)())}</div>`; }

/* ---------- Lazy images (shimmer placeholder, fade in when decoded) ---------- */
export function lazyImage({ src, alt = '', width, height, className = '', style = '', ratio, eager = false, hidden = false, contain = false }) {
  const el = html`<span class="lazy-img ${contain ? 'lazy-img--contain' : ''} ${className}" style="${ratio ? `aspect-ratio:${ratio};` : ''}${style}"><img src="${src}" alt="${alt}" ${width ? raw(`width="${width}"`) : ''} ${height ? raw(`height="${height}"`) : ''} loading="${eager ? 'eager' : 'lazy'}" decoding="async" ${hidden ? raw('aria-hidden="true"') : ''}></span>`;
  const img = el.querySelector('img');
  const done = () => el.classList.add('is-loaded');
  if (img.complete && img.naturalWidth) done();
  else { img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); }
  return el;
}

/* ---------- Scroll reveal for [data-reveal] (stagger with style="--i:n") ---------- */
let revealIO;
export function observeReveal(root) {
  const els = root.querySelectorAll ? root.querySelectorAll('[data-reveal]') : [];
  if (!els.length) return;
  if (reducedMotion() || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('is-visible')); return; }
  revealIO ??= new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-visible'); revealIO.unobserve(en.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: 0.04 });
  els.forEach((e) => { if (!e.classList.contains('is-visible')) revealIO.observe(e); });
  // Safety: anything still hidden after 2s becomes visible (e.g. tall viewports).
  setTimeout(() => els.forEach((e) => { const r = e.getBoundingClientRect(); if (r.top < window.innerHeight) e.classList.add('is-visible'); }), 2000);
}

/* ---------- Lazy section: run `loader` when `el` nears the viewport ---------- */
export function whenVisible(el, loader, { rootMargin = '240px' } = {}) {
  if (!('IntersectionObserver' in window)) { loader(); return () => {}; }
  const o = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { o.disconnect(); loader(); } }, { rootMargin });
  o.observe(el);
  return () => o.disconnect();
}

/* ---------- Count-up numbers ---------- */
export function countUp(el, to, { from = 0, duration = 900, delay = 0, format = (n) => Math.round(n).toLocaleString('en-AU') } = {}) {
  if (!el) return;
  if (reducedMotion()) { el.textContent = format(to); return; }
  const start = performance.now() + delay;
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  el.textContent = format(from);
  const tick = (now) => { const t = Math.min(1, Math.max(0, (now - start) / duration)); el.textContent = format(from + (to - from) * ease(t)); if (t < 1) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}

/* ---------- Button busy state ---------- */
export async function withSpinner(btn, task, { busyLabel = '', doneLabel = '', doneMs = 1100 } = {}) {
  if (!btn || btn.getAttribute('aria-busy') === 'true') return undefined;
  const orig = btn.innerHTML; const w = btn.getBoundingClientRect().width; btn.style.minWidth = w + 'px';
  btn.setAttribute('aria-busy', 'true'); btn.disabled = true;
  btn.innerHTML = `<span class="spinner" aria-hidden="true"></span>${busyLabel ? `<span>${busyLabel}</span>` : ''}`;
  try {
    const result = await task();
    if (doneLabel) { btn.innerHTML = `<span class="check-pop" style="display:inline-flex">${icon('check', { size: 16, stroke: 2.2 })}</span><span>${doneLabel}</span>`; await sleep(doneMs); }
    return result;
  } finally {
    if (btn.isConnected) { btn.innerHTML = orig; btn.removeAttribute('aria-busy'); btn.disabled = false; btn.style.minWidth = ''; }
  }
}

/* ---------- Toasts ---------- */
export function toast(message, { kind = 'success', timeout = 3200, action } = {}) {
  const host = document.getElementById('toasts'); if (!host) return;
  const name = kind === 'error' ? 'alert' : kind === 'info' ? 'info' : 'check-circle';
  const el = html`<div class="toast toast--${kind}" role="status"><span class="toast__icon">${icon(name, { size: 16, stroke: 2 })}</span><span>${message}</span>${action ? html`<button type="button" class="btn btn--text" style="color:#fff;text-decoration:underline">${action.label}</button>` : ''}</div>`;
  if (action) el.querySelector('button').addEventListener('click', () => { action.onClick(); remove(); });
  host.appendChild(el);
  let removed = false;
  const remove = () => { if (removed) return; removed = true; el.classList.add('is-leaving'); setTimeout(() => el.remove(), 260); };
  setTimeout(remove, timeout);
  return remove;
}

/* ---------- Lazy stylesheet (per-page CSS loaded with the page module) ---------- */
const styles = new Map();
export function loadStyle(href) {
  const key = String(href);
  if (styles.has(key)) return styles.get(key);
  const p = new Promise((resolve) => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = key; l.onload = () => resolve(); l.onerror = () => resolve(); document.head.appendChild(l); });
  styles.set(key, p);
  return p;
}

/* ---------- Simple dialog helper (native <dialog>) ---------- */
export function openDialog(content, { onClose } = {}) {
  const dlg = html`<dialog class="dialog"><div class="dialog__body"></div></dialog>`;
  dlg.querySelector('.dialog__body').append(content);
  document.body.appendChild(dlg);
  const close = () => { if (dlg.open) dlg.close(); };
  dlg.addEventListener('close', () => { dlg.remove(); if (onClose) onClose(); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  dlg.showModal();
  return { dlg, close };
}

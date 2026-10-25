// Shared builders for the three Design Guidelines pages (Lighting, Plants, Colour & Material).
// Each page supplies its data — banner copy, the numbered guideline tiles, the relevance
// rules and any page-specific sections — and guidelinePage() assembles the common template
// and wires the shared behaviour: the "Relevance" context select, tile → detail-card
// toggling, and the detail-card actions (withSpinner + toast).
import { html, raw, $, $$, on, patch } from '../lib/dom.js';
import { api } from '../lib/api.js';
import { store } from '../lib/store.js';
import { lazyImage, loadStyle, observeReveal, withSpinner, toast, sleep } from '../lib/loading.js';
import { icon } from '../components/icons.js';

/* ---------- Inline SVGs copied verbatim from the design (not in components/icons.js) ---------- */
export const ICON = {
  info: '<circle cx="12" cy="12" r="9"></circle><path d="M12 11v5M12 8h.01"></path>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"></path>',
  check: '<path d="M5 12l4 4 10-10"></path>',
  list: '<path d="M4 7h16M4 12h16M4 17h10"></path>',
  book: '<path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z"></path><path d="M20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z"></path>',
  upload: '<path d="M12 16V4M6 10l6-6 6 6M4 20h16"></path>',
  smile: '<circle cx="12" cy="12" r="9"></circle><path d="M8 10c.6-.8 1.6-.8 2.2 0M13.8 10c.6-.8 1.6-.8 2.2 0M8.5 14.5c1.8 1.8 5.2 1.8 7 0"></path>',
  alert: '<path d="M12 3l10 18H2z"></path><path d="M12 10v4M12 18h.01"></path>',
  sun: '<circle cx="12" cy="12" r="3.5"></circle><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4"></path>',
  drop: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"></path>',
  leaf: '<path d="M5 19C5 9 11 4 20 4c0 9-5 15-15 15z"></path><path d="M5 19l8-8"></path>'
};

// Trusted inline SVG on the design's 24-unit grid. `body` is verbatim design markup.
export const svg = (body, { size = 20, stroke = 1.6, style = '' } = {}) =>
  raw(`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${style ? ` style="${style}"` : ''}>${body}</svg>`);

/* ---------- Relevance dots ---------- */
export const STATUS = {
  rec: { cls: 'gl-dot--rec', label: 'Recommended for' },
  verify: { cls: 'gl-dot--verify', label: 'Verify on site for' },
  not: { cls: 'gl-dot--not', label: 'Not required for' }
};

/* ---------- Banner (image, gradient shade, floating hero image, copy, pills) ---------- */
export function banner({ variant, label, kicker, title, lead, leadMax = 520, pills = [], bg, hero }) {
  return html`<section class="banner gl-banner gl-banner--${variant}" aria-label="${label}" data-reveal style="--i:0">
    ${lazyImage({ src: bg.src, alt: '', width: bg.width, height: bg.height, hidden: true, eager: true, className: 'gl-banner__bg' })}
    <span class="gl-banner__shade" aria-hidden="true"></span>
    ${lazyImage({ src: hero.src, alt: hero.alt, width: hero.width, height: hero.height, ratio: `${hero.width} / ${hero.height}`, eager: true, className: 'gl-banner__hero', style: hero.style })}
    <div class="gl-banner__body">
      <span class="gl-banner__kicker">${kicker}</span>
      <h2 class="display">${title}</h2>
      <p class="gl-banner__lead" style="max-width:${leadMax}px">${lead}</p>
      <div class="gl-banner__pills">${pills.map((p) => html`<span class="gl-banner__pill">${p}</span>`)}</div>
    </div>
  </section>`;
}

/* ---------- Context: "Relevance: <room>" select + legend ---------- */
export function contextBlock({ rooms }) {
  return html`<section class="gl-context" aria-label="Context" data-reveal style="--i:1">
    <div class="row gap-10">
      <label for="g-context" class="sr-only">Show relevance for</label>
      <select id="g-context" class="gl-select" data-context>
        ${rooms.map((r) => html`<option value="${r.id}">Relevance: ${r.name}</option>`)}
        <option value="">No classroom context</option>
      </select>
    </div>
    <span class="gl-legend">
      <span class="gl-legend__item"><span class="gl-dot gl-dot--rec"></span>Recommended</span>
      <span class="gl-legend__item"><span class="gl-dot gl-dot--verify"></span>Verify</span>
      <span class="gl-legend__item"><span class="gl-dot gl-dot--not"></span>Not required</span>
    </span>
  </section>`;
}

/* ---------- Numbered guideline tile (L1 …, P1 …, C1 …) ---------- */
export function guidelineTile(g, i = 0) {
  return html`<button type="button" class="tile gl-tile" data-code="${g.code}" aria-expanded="false" aria-controls="gl-detail" data-reveal style="--i:${i}"><span class="gl-tile__head"><span class="dot-icon dot-icon--lg${g.disc === 'review' ? ' gl-tile__icon--review' : ''}">${svg(g.icon)}</span><span class="gl-dot" role="img" data-dot hidden></span></span><span class="gl-tile__body"><span class="gl-tile__code">${g.code}</span><span class="gl-tile__title">${g.title}</span><span class="gl-tile__sub">${g.sub}</span></span></button>`;
}

// Colour + label every tile's dot for the chosen room; no room → dots hidden.
export function applyRelevance(grid, statuses, roomName) {
  $$('.gl-tile', grid).forEach((t) => {
    const dot = $('[data-dot]', t);
    const s = statuses ? STATUS[statuses[t.dataset.code]] : null;
    dot.className = 'gl-dot' + (s ? ' ' + s.cls : '');
    if (s && roomName) { dot.hidden = false; dot.setAttribute('aria-label', `${s.label} ${roomName}`); }
    else { dot.hidden = true; dot.removeAttribute('aria-label'); }
  });
}

/* ---------- Open guideline detail card (the "L2 · OPEN · APPROVED v1.2" card) ---------- */
export function detailCard(g, version) {
  const d = g.detail || {};
  const fact = (variant, body, stroke, label, value) => html`<div class="gl-fact"><span class="gl-disc gl-disc--${variant}">${svg(body, { size: 18, stroke })}</span><span class="gl-fact__text"><span class="gl-fact__label">${label}</span><span class="gl-fact__value">${value}</span></span></div>`;
  return html`<div class="gl-detail" id="gl-detail" role="region" aria-label="${g.code} ${d.title || g.title}" data-reveal style="--i:1">
    <div class="gl-detail__head"><span class="gl-detail__eyebrow">${g.code} · OPEN · APPROVED v${version}</span><span class="h-block">${d.title || g.title}</span></div>
    ${fact('accent', ICON.check, 2.2, 'Default', d.default)}
    ${fact('neutral', ICON.list, 1.8, 'Alternatives', d.alternatives)}
    ${fact('review', ICON.info, 1.8, 'Consider', d.consider)}
    ${fact('neutral', ICON.book, 1.8, 'Evidence', d.evidence)}
    <div class="gl-detail__foot">
      <button type="button" class="btn gl-btn--xs" data-action="add-image">${svg(ICON.upload, { size: 14, stroke: 2 })}Add research image</button>
      <button type="button" class="btn gl-btn--xs" data-action="source">Source reference</button>
      <span class="tiny muted">Tap any tile to open it like this.</span>
    </div>
  </div>`;
}

/* ---------- Image card (species cards: photo, name, safety badge, trait chips) ---------- */
export function imageCard({ img, alt, width = 1026, height = 570, ratio = '9 / 5', title, sub, badge, traits = [] }, i = 0) {
  const warn = badge && badge.kind === 'warn';
  return html`<article class="gl-species" data-reveal style="--i:${i}">
    ${lazyImage({ src: img, alt, width, height, ratio, className: 'gl-species__img' })}
    <div class="gl-species__head"><div class="gl-species__name"><span class="h-block">${title}</span><span class="gl-species__latin">${sub}</span></div>${badge ? html`<span class="gl-safety ${warn ? 'gl-safety--warn' : 'gl-safety--ok'}">${svg(warn ? ICON.alert : ICON.smile, { size: 18, stroke: warn ? 2 : 1.8 })}${badge.label}</span>` : ''}</div>
    ${traits.length ? html`<div class="gl-traits">${traits.map(([kind, text]) => html`<span class="gl-trait">${svg(ICON[kind], { size: 18, stroke: 1.8 })}<span>${text}</span></span>`)}</div>` : ''}
  </article>`;
}

/* ---------- Small shared pieces ---------- */
export const blockHead = (title, aside, { baseline = false, size = 'h-block' } = {}) =>
  html`<div class="gl-block__head${baseline ? ' gl-block__head--baseline' : ''}" data-reveal><span class="${size}">${title}</span>${aside || ''}</div>`;

export const infoNote = (text) => html`<span class="gl-note" data-reveal>${svg(ICON.info, { size: 14, stroke: 1.8 })}<span>${text}</span></span>`;

export function pager({ prev, next }) {
  return html`<nav class="gl-pager" aria-label="Guideline pages" data-reveal>
    ${prev ? html`<a class="btn gl-pager__link" href="${prev.href}">${icon('arrow-left', { size: 16, stroke: 2 })}${prev.label}</a>` : html`<span></span>`}
    <a class="btn btn--primary" href="${next.href}">${next.label}${icon('arrow-right', { size: 16, stroke: 2 })}</a>
  </nav>`;
}

export const footnote = () => html`<p class="tiny muted" data-reveal>Planning guidance, not compliance. Lighting, electrical, horticultural and fire items need a qualified professional before implementation.</p>`;

/* ---------- Page assembly + behaviour ----------
   spec = { label, version, banner, guidelines: [{ code, title, sub, icon, disc?, detail }],
            relevance(cond) → { code: 'rec'|'verify'|'not' }, openCode?, sections?: Element[], nav: { prev?, next } } */
export async function guidelinePage(ctx, spec) {
  await loadStyle(new URL('./guidelines.css', import.meta.url));
  await api.getSettings(); // tiny async read so the router's skeleton shows honestly
  const version = spec.version || '1.2';
  const { rooms, ui } = store.get();

  // Which classroom the relevance dots describe: ?room=<id> → last choice → the active room.
  const fromQuery = ctx.query.get('room');
  let roomId = fromQuery != null ? fromQuery : ui.guidelineRoomId !== undefined ? ui.guidelineRoomId : ui.activeRoomId;
  if (roomId && !rooms.some((r) => r.id === roomId)) roomId = rooms.some((r) => r.id === ui.activeRoomId) ? ui.activeRoomId : rooms[0] ? rooms[0].id : '';
  let openCode = spec.openCode || null;

  const grid = html`<div class="gl-grid">${spec.guidelines.map((g, i) => guidelineTile(g, i))}</div>`;
  const slot = html`<div class="gl-detail-slot"></div>`;
  const picker = html`<input type="file" accept="image/*" hidden aria-hidden="true" tabindex="-1">`;
  const el = html`<div class="page gl-page">
    ${banner(spec.banner)}
    ${contextBlock({ rooms })}
    <section class="gl-section" aria-label="${spec.label}">${grid}${slot}${spec.sections || ''}</section>
    ${pager(spec.nav)}
    ${footnote()}
    ${picker}
  </div>`;

  // Relevance select
  const room = () => rooms.find((r) => r.id === roomId) || null;
  const applyContext = () => { const r = room(); applyRelevance(grid, r ? spec.relevance(r.cond) : null, r ? r.name : ''); };
  const select = $('[data-context]', el);
  select.value = roomId || '';
  select.addEventListener('change', () => { roomId = select.value; api.setUi({ guidelineRoomId: roomId }); applyContext(); });
  applyContext();

  // Tile → detail card
  const current = () => spec.guidelines.find((g) => g.code === openCode) || null;
  const renderDetail = () => {
    const g = current();
    patch(slot, g ? detailCard(g, version) : document.createDocumentFragment());
    $$('.gl-tile', grid).forEach((t) => t.setAttribute('aria-expanded', String(t.dataset.code === openCode)));
    if (el.isConnected) observeReveal(slot);
  };
  renderDetail();
  on(grid, 'click', '.gl-tile', (e, t) => {
    openCode = openCode === t.dataset.code ? null : t.dataset.code;
    renderDetail();
    if (openCode && slot.firstElementChild) slot.firstElementChild.scrollIntoView({ block: 'nearest' });
  });

  // Detail actions
  on(slot, 'click', '[data-action="add-image"]', (e, btn) => {
    picker.value = '';
    picker.onchange = async () => {
      const file = picker.files && picker.files[0];
      if (!file || !btn.isConnected) return;
      const code = openCode;
      await withSpinner(btn, () => sleep(700), { busyLabel: 'Uploading…', doneLabel: 'Added' });
      toast(`${file.name} added to ${code} as research evidence`);
    };
    picker.click();
  });
  on(slot, 'click', '[data-action="source"]', async (e, btn) => {
    const g = current(); if (!g) return;
    const text = `${g.code} ${g.detail.title || g.title} — ${g.detail.evidence} (${spec.banner.title}, v${version})`;
    const copied = await withSpinner(btn, async () => {
      await sleep(400);
      try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
    }, { busyLabel: 'Copying…', doneLabel: 'Copied' });
    if (copied) toast(`Reference copied: ${g.detail.evidence}`, { kind: 'info' });
    else toast(`Reference: ${text}`, { kind: 'info', timeout: 5000 });
  });

  return el;
}

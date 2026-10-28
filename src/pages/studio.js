// Design Studio — the four-step planner (choose a classroom → conditions → recommendations
// → plan & impact). The page shell (title, stepper, banner slot, step slot) renders once;
// each slot is re-rendered with patch() when state changes. All numbers come from
// src/lib/plan.js (recsFor / computePlan) so they agree with Energy, Impact and Reports.
import { html, raw, esc, $, $$, on, patch, fmt } from '../lib/dom.js';
import { icon } from '../components/icons.js';
import { statusPill } from '../components/ui.js';
import { api } from '../lib/api.js';
import { store } from '../lib/store.js';
import { loadStyle, lazyImage, observeReveal, countUp, withSpinner, toast, openDialog } from '../lib/loading.js';
import { recsFor, computePlan, COND_FIELDS, SPECIES, DEFAULT_HOURS, DEFAULT_TARIFF } from '../lib/plan.js';
import { typeById } from '../data/types.js';
import { photoUrlsFor } from '../lib/photos.js';

/* ---------- Copy from the design ---------- */
const TITLES = ['Which classroom?', 'What is the room like?', 'Here is the recommended plan', 'Plan and impact'];
const HINTS = ['Pick a classroom record, or start from a type in the library.', 'Six quick choices. Everything else can be refined later.', 'Three interventions, tuned to the room. Adjust within the guardrails.'];
const STEP_LABELS = ['Classroom', 'Conditions', 'Recommendations', 'Plan & impact'];
const PLAN_KEYS = ['cct', 'dimming', 'zones', 'plantCount', 'sp', 'palette', 'finish', 'noChange'];
const CCT_MIN = 2200, CCT_MAX = 5500, PLANT_MAX = 14;

/* ---------- Inline SVGs copied verbatim from design/Studio.dc.html ---------- */
const SVG = {
  // step-1 room tiles (26px, stroke 1.6)
  seminar: '<ellipse cx="12" cy="12" rx="7" ry="4"></ellipse><circle cx="12" cy="4.5" r="1.5"></circle><circle cx="12" cy="19.5" r="1.5"></circle><circle cx="4" cy="8" r="1.5"></circle><circle cx="20" cy="8" r="1.5"></circle><circle cx="4" cy="16" r="1.5"></circle><circle cx="20" cy="16" r="1.5"></circle>',
  lab: '<rect x="3" y="4" width="18" height="12" rx="2"></rect><path d="M8 20h8M12 16v4"></path>',
  studio: '<rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M12 4v16M3 12h18"></path><circle cx="16.5" cy="8" r="1.8"></circle>',
  leaf: '<path d="M5 19C5 9 11 4 20 4c0 9-5 15-15 15z"></path><path d="M5 19l8-8"></path>',
  compact: '<rect x="6" y="5" width="12" height="14" rx="1.5"></rect><path d="M2 12h3M19 12h3"></path>',
  lecture: '<rect x="2" y="5" width="20" height="14" rx="2"></rect><path d="M8.5 5v14M15.5 5v14"></path>',
  check: '<path d="M5 12l4 4 10-10"></path>',
  // step-2 row labels (20px) and option glyphs (18px)
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"></path>',
  glare: '<path d="M3 18L15 6M8 18L20 6" stroke-dasharray="3 3"></path><circle cx="18" cy="6" r="2.5"></circle>',
  'sun-dot': '<circle cx="12" cy="12" r="4"></circle>',
  'sun-low': '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M2 12h2M20 12h2"></path>',
  'square-dim': '<rect x="4" y="4" width="16" height="16" rx="2"></rect><path d="M8 16l8-8"></path>',
  // step-3 card discs (26px, stroke 1.4)
  'disc-sun': '<circle cx="12" cy="12" r="3.5"></circle><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"></path>',
  'disc-leaf': '<path d="M6 18c0-8 5-12 12-12 0 7-4 12-12 12z"></path><path d="M6 18c3-4 6-7 9-9"></path>',
  'disc-palette': '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-2 0-3 3 0 4-1 1-3 1-5a9 9 0 0 0-7-7z"></path><circle cx="7.5" cy="11.5" r="1.2"></circle><circle cx="10" cy="7.5" r="1.2"></circle><circle cx="15" cy="7.5" r="1.2"></circle>',
  warn: '<path d="M12 3l10 18H2z"></path><path d="M12 10v4M12 18h.01"></path>',
  'glare-lines': '<path d="M3 18L15 6M8 18L20 6"></path>',
  dimming: '<path d="M4 7h8M18 7h2M4 12h2M11 12h9M4 17h10M19 17h1"></path><circle cx="15" cy="7" r="2.2" fill="#FFFFFF"></circle><circle cx="8" cy="12" r="2.2" fill="#FFFFFF"></circle><circle cx="16.5" cy="17" r="2.2" fill="#FFFFFF"></circle>',
  zones: '<rect x="3" y="4" width="18" height="16" rx="3"></rect><path d="M9 4v16M15 4v16"></path>',
  pot: '<path d="M6 11h12l-1.5 10h-9z"></path><path d="M12 11V8"></path><path d="M12 8c-3 0-5-1.8-5-4 3 0 5 1.8 5 4zM12 8c3 0 5-1.8 5-4-3 0-5 1.8-5 4z"></path>',
  coverage: '<rect x="3" y="3" width="18" height="18" rx="1"></rect><path d="M3 12h18M12 3v9M12 12v4h5v5"></path>',
  nochange: '<rect x="3" y="4" width="13" height="6" rx="1.5"></rect><path d="M16 7h3v4h-8v3"></path><path d="M9 14h4v6H9z"></path><circle cx="18.5" cy="18.5" r="3.5" fill="currentColor" stroke="none"></circle><path d="M16.5 18.5h4" stroke="#FFFFFF" stroke-width="1.6"></path>',
  // step-4
  upload: '<path d="M12 16V4M6 10l6-6 6 6M4 20h16"></path>',
  cash: '<rect x="3" y="6" width="18" height="12" rx="2"></rect><circle cx="12" cy="12" r="2.5"></circle>',
  save: '<path d="M5 4h11l3 3v13H5z"></path><path d="M8 4v5h7V4M8 20v-6h8v6"></path>',
  export: '<path d="M12 4v12M6 10l6 6 6-6M4 20h16"></path>',
  restart: '<path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 4v5h5"></path>'
};
const svg = (name, size = 18, stroke = 1.6, attrs = '') => raw(`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${attrs ? ' ' + attrs : ''}>${SVG[name]}</svg>`);

// Status-pill glyphs: filled check (within), filled minus (not required), warning (anything else)
const STATUS_GLYPH = {
  within: '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"></circle><path d="M7.5 12.5l3 3 6-6" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
  notreq: '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="var(--status-notreq-icon)"></circle><path d="M8 12h8" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"></path></svg>',
  warn: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l10 18H2z"></path><path d="M12 10v4M12 18h.01"></path></svg>'
};
function cardStatus(status, key) {
  const pill = statusPill(status, 'st-status');
  pill.insertAdjacentHTML('afterbegin', STATUS_GLYPH[status.kind === 'within' ? 'within' : status.kind === 'notreq' ? 'notreq' : 'warn']);
  pill.setAttribute('aria-live', 'polite');
  if (key) pill.dataset.status = key;
  return pill;
}

/* ---------- Step 1: room tiles (design copy for the seeded rooms; derived for new ones) ---------- */
const ROOM_SUBS = {
  sr01: 'Teaching Block A · 58 m² · fluorescent, low daylight',
  clb04: 'Science Building · 92 m² · LED, screen glare',
  st214: 'Design Building · 120 m² · LED, strong daylight',
  gs07: 'Library Annex · 45 m² · LED dimmable, good daylight',
  tr305: 'Teaching Block A · 32 m² · compact, fluorescent',
  lt110: 'Science Building · 180 m² · large, mixed lighting'
};
const ROOM_ICONS = { sr01: 'seminar', clb04: 'lab', st214: 'studio', gs07: 'leaf', tr305: 'compact', lt110: 'lecture' };
const TYPE_ICONS = { 'computer-lab': 'lab', 'glare-prone': 'studio', 'high-sensory': 'studio', 'plant-ready': 'leaf', compact: 'compact', large: 'lecture', fluorescent: 'lecture' };
const roomIcon = (r) => ROOM_ICONS[r.id] || TYPE_ICONS[r.type] || 'seminar';
function roomSub(r) {
  if (ROOM_SUBS[r.id]) return ROOM_SUBS[r.id];
  const c = r.cond || {};
  const light = (r.lightingLabel || 'LED').toLowerCase().replace('led', 'LED');
  const tail = c.size === 'compact' ? 'compact' : c.glare === 'strong' ? 'strong glare' : c.daylight === 'low' ? 'low daylight' : c.daylight === 'strong' ? 'strong daylight' : 'good daylight';
  return `${r.building} · ${r.area} m² · ${light}, ${tail}`;
}

/* ---------- Step 2: the six condition rows (keys/options from plan.js, copy from the design) ---------- */
const COND_LABELS = { daylight: 'Daylight', lighting: 'Lighting', glare: 'Glare', plants: 'Plants', walls: 'Walls', size: 'Size' };
const COND_OPTION_COPY = { plants_some: 'A few' };
const COND_ROW_ICON = { daylight: () => icon('sun', { size: 20 }), lighting: () => svg('bulb', 20), glare: () => svg('glare', 20), plants: () => icon('leaf', { size: 20 }), walls: () => icon('palette', { size: 20 }), size: () => icon('expand', { size: 20 }) };
const COND_OPT_ICON = {
  daylight_low: () => svg('sun-dot', 18), daylight_medium: () => svg('sun-low', 18), daylight_strong: () => icon('sun', { size: 18 }),
  lighting_fluorescent: () => icon('tube', { size: 18 }), lighting_ledfixed: () => icon('square', { size: 18 }), lighting_leddim: () => svg('square-dim', 18)
};
const COND_ROWS = COND_FIELDS.map((f) => ({ key: f.key, label: COND_LABELS[f.key] || f.label, options: f.options.map(([v, l]) => [v, COND_OPTION_COPY[f.key + '_' + v] || l]) }));

/* ---------- Step 3: species and palette copy ---------- */
const SPECIES_ORDER = ['zz', 'cast', 'pothos', 'pep', 'spider', 'peace'];
const SPECIES_COPY = { zz: 'ZZ Plant', cast: 'Cast-iron', pothos: 'Pothos', pep: 'Peperomia', spider: 'Spider plant', peace: 'Peace lily' };
const PALETTE_ORDER = [['calm', 'Calm Study'], ['warm', 'Warm Neutral'], ['horizon', 'Soft Horizon']];
const FINISH_ORDER = [['lowsheen', 'Low sheen'], ['matt', 'Matt'], ['eggshell', 'Eggshell'], ['semigloss', 'Semi-Gloss']];

/* ---------- Plan helpers ---------- */
// A saved plan carries savedAt/submittedAt; keep only the choice fields on top of the recommendations.
function planFrom(saved, cond) {
  const base = recsFor(cond);
  const out = { ...base };
  if (saved) PLAN_KEYS.forEach((k) => { if (saved[k] !== undefined && saved[k] !== null) out[k] = k === 'sp' ? { ...base.sp, ...saved.sp } : saved[k]; });
  out.cct = Math.min(CCT_MAX, Math.max(CCT_MIN, Number(out.cct) || 3000));
  return out;
}
const choices = (plan) => Object.fromEntries(PLAN_KEYS.map((k) => [k, k === 'sp' ? { ...plan.sp } : plan[k]]));
function savedTextFor(plan, room) {
  if (plan && plan.submitted && room && room.status === 'in-review') return 'Submitted for review';
  if (plan && plan.savedAt) return 'Draft saved ' + fmt.ago(plan.savedAt);
  return 'Draft · not yet saved';
}

/* ======================================================================
   Renderers. Pure functions of the state (S) and the computed plan (P);
   interaction is delegated from the page root via data-action attributes.
   ====================================================================== */

function renderIntro(S, P) {
  const hint = S.step === 4 && S.room ? `${S.room.name} · A$${fmt.money0(P.total)} illustrative estimate` : HINTS[S.step - 1];
  return html`<div class="st-intro">
    <div class="st-intro__text"><h2 class="display" tabindex="-1" data-step-title>${TITLES[S.step - 1]}</h2><p class="lead">${hint}</p></div>
    <span class="st-saved" aria-live="polite" data-saved>${S.savedText}</span>
  </div>`;
}

function renderStepper(S) {
  return html`<ol class="st-stepper" aria-label="Steps">${STEP_LABELS.map((label, i) => {
    const n = i + 1;
    if (n < S.step) return html`<li><button type="button" class="step st-step is-done" data-action="goto" data-arg="${n}" data-key="step-${n}" aria-label="Back to step ${n}: ${label}"><span class="step__dot" aria-hidden="true">✓</span><span>${label}</span></button></li>`;
    if (n === S.step) return html`<li><span class="step st-step is-current" aria-current="step"><span class="step__dot" aria-hidden="true">${n}</span><span>${label}</span></span></li>`;
    return html`<li><span class="step st-step"><span class="step__dot" aria-hidden="true">${n}</span><span>${label}</span></span></li>`;
  })}</ol>`;
}

function renderBanner(S, P) {
  if (S.submitted && S.room) {
    return html`<div class="st-banner fade-swap" role="status">
      <span class="st-banner__dot">${svg('check', 16, 2.4)}</span>
      <span class="st-banner__text"><strong>Submitted for review</strong> · ${P.exceptionCount} item(s) for a reviewer · <a href="#/reports">Track it in Reports</a> · <a href="#/energy">See the energy case</a></span>
    </div>`;
  }
  if (S.step === 1 && S.type) {
    return html`<div class="st-banner st-banner--type fade-swap" role="status">
      <span class="st-banner__dot">${icon('grid', { size: 16, stroke: 1.8 })}</span>
      <span class="st-banner__text"><strong>Starting point: ${S.type.name}</strong> · ${S.type.sub}</span>
      <button type="button" class="btn btn--sm" data-action="add-room">${icon('plus', { size: 14, stroke: 2 })}<span>Add a classroom from this type</span></button>
    </div>`;
  }
  return html``;
}

/* ---------- Step 1: Which classroom? ---------- */
function renderStep1(S) {
  return html`<section class="st-section" aria-label="Choose a classroom">
    <div class="st-rooms">${S.rooms.map((r, i) => {
      const on = r.id === S.roomId;
      const busy = S.loadingRoomId === r.id;
      return html`<button type="button" class="opt st-room" aria-pressed="${on}" aria-busy="${busy}" data-action="pick-room" data-arg="${r.id}" data-key="room-${r.id}" data-reveal style="--i:${i}">
        ${S.photos && S.photos[r.id] ? html`<span class="st-room__icon st-room__icon--photo">${lazyImage({ src: S.photos[r.id], alt: '', hidden: true })}</span>` : html`<span class="st-room__icon">${svg(roomIcon(r), 26)}</span>`}
        <span class="st-room__text"><span class="st-room__name">${r.name}</span><span class="st-room__sub">${roomSub(r)}</span></span>
        ${busy
          ? html`<span class="st-room__dot st-room__dot--busy"><span class="spinner" aria-hidden="true"></span><span class="sr-only">Loading…</span></span>`
          : html`<span class="st-room__dot" aria-hidden="true">${svg('check', 14, 3)}</span>`}
      </button>`;
    })}</div>
    <div class="st-foot">
      <a class="btn" href="#/">${icon('grid', { size: 16, stroke: 1.8 })}Start from a classroom type instead</a>
      <button type="button" class="btn btn--primary" data-action="next" data-key="next" ${S.room ? '' : raw('aria-disabled="true"')}>Next: conditions${icon('arrow-right', { size: 18, stroke: 2 })}</button>
    </div>
  </section>`;
}

/* ---------- Step 2: What is the room like? ---------- */
function renderStep2(S) {
  return html`<section class="st-section st-section--cond" aria-label="Room conditions">
    ${COND_ROWS.map((row) => html`<div class="st-cond-row" role="group" aria-label="${row.label}">
      <span class="st-cond-row__label">${COND_ROW_ICON[row.key]()}${row.label}</span>
      ${row.options.map(([v, label]) => {
        const glyph = COND_OPT_ICON[row.key + '_' + v];
        return html`<button type="button" class="opt st-cond" aria-pressed="${S.cond[row.key] === v}" data-action="cond" data-field="${row.key}" data-arg="${v}" data-key="cond-${row.key}-${v}">${glyph ? glyph() : ''}${label}</button>`;
      })}
      ${row.options.length < 3 ? html`<span></span>` : ''}
    </div>`)}
    <div class="st-foot st-foot--pad">
      <button type="button" class="btn" data-action="back" data-key="back">${icon('chevron-left', { size: 16, stroke: 1.8 })}Back</button>
      <span class="st-hint">Pre-filled from the classroom record · tap to change · a photograph can be added later</span>
      <button type="button" class="btn btn--primary" data-action="next" data-key="next">Generate recommendations${icon('arrow-right', { size: 18, stroke: 2 })}</button>
    </div>
  </section>`;
}

/* ---------- Step 3: Here is the recommended plan ---------- */
function speciesChip(k, on) {
  const sp = SPECIES[k];
  const thumb = sp && sp.thumb
    ? lazyImage({ src: sp.thumb, alt: '', width: 68, height: 68, className: 'st-sp__img', hidden: true })
    : html`<span class="st-sp__disc" aria-hidden="true">${icon('leaf', { size: 18, stroke: 1.8 })}</span>`;
  return html`<label class="st-sp" data-species="${k}">${thumb}<span class="st-sp__name">${SPECIES_COPY[k] || (sp ? sp.name : k)}</span><input type="checkbox" class="tick" data-action="species" data-arg="${k}" data-key="sp-${k}" ${on ? raw('checked') : ''} aria-label="${SPECIES_COPY[k] || k}${sp && sp.light ? ' · ' + sp.light : ''}"></label>`;
}

function renderStep3(S, P) {
  const p = P.plan;
  return html`<section class="st-section" aria-label="Recommendations">
    <div class="st-recs">

      <article class="st-card" aria-labelledby="light-h" data-reveal style="--i:0">
        <div class="st-card__head"><span class="st-card__disc">${svg('disc-sun', 26, 1.4)}</span>${cardStatus(P.lightStatus, 'light')}</div>
        <div class="st-card__body">
          <h3 id="light-h" class="eyebrow">Lighting</h3>
          <span class="st-card__headline st-card__headline--light">${P.lightHeadline}</span>
          <span class="st-card__why">${P.lightWhy}</span>
          <a class="st-card__link" href="#/guidelines/lighting">Check lighting guidelines <span class="st-card__refs">· ${P.lightRefs}</span></a>
          ${lazyImage({ src: './assets/img/studio/led-pendant.png', alt: 'Rectangular LED pendant fitting with a diffused light panel', width: 255, height: 241, className: 'st-card__img st-card__img--light st-img-plain', contain: true })}
        </div>
        ${P.glareFirst ? html`<span class="st-glare">${svg('glare-lines', 14, 2)}Glare first · diffusers and blinds</span>` : ''}
        <div class="st-panel">
          <label for="s-cct" class="st-cct__label"><span>Default colour temperature</span><strong class="st-cct__value" data-cct-value>${p.cct}K</strong></label>
          <input id="s-cct" class="cct" type="range" min="${CCT_MIN}" max="${CCT_MAX}" step="100" value="${p.cct}" data-action="cct" aria-valuetext="${p.cct} kelvin, ${P.cctHint}">
          <div class="st-cct__scale"><span>2700–3000K • calm</span><span>3500–4000K • task</span></div>
          <span class="st-cct__hint" data-kind="${P.cctHintKind}" data-cct-hint aria-live="polite">${P.cctHint}</span>
        </div>
        <div class="st-ctl st-ctl--dim">
          ${svg('dimming', 20, 1.6)}
          <span class="st-ctl__text"><span id="s-dim-label" class="st-ctl__title">Dimming &amp; Scenes</span><span class="st-ctl__sub">Adjustable lighting with preset scenes</span></span>
          <input id="s-dim" type="checkbox" class="switch" role="switch" aria-labelledby="s-dim-label" data-action="dimming" data-key="dimming" ${p.dimming ? raw('checked') : ''}>
        </div>
        <div class="st-ctl">
          ${svg('zones', 20, 1.8)}
          <span class="st-ctl__text"><span class="st-ctl__title">Lighting Zones</span><span class="st-ctl__sub">Separate control for different activities</span></span>
          <div class="seg st-seg" role="group" aria-label="Lighting zones">${[1, 2, 3].map((n) => html`<button type="button" class="seg__btn" aria-pressed="${p.zones === n}" data-action="zones" data-arg="${n}" data-key="zone-${n}">${n}</button>`)}</div>
        </div>
      </article>

      <article class="st-card" aria-labelledby="plant-h" data-reveal style="--i:1">
        <div class="st-card__head"><span class="st-card__disc">${svg('disc-leaf', 26, 1.4)}</span>${cardStatus(P.plantStatus, 'plant')}</div>
        <div class="st-card__body st-card__body--plants">
          <div class="st-plants-left">
            <h3 id="plant-h" class="eyebrow">Plants</h3>
            <div class="st-plants-head">
              <span class="st-card__headline st-card__headline--plants"><span>${P.plantHeadline1}</span><span>${P.plantHeadline2}</span></span>
              <span class="st-card__why">${P.plantWhy}</span>
              <a class="st-card__link" href="#/guidelines/plants">Check plant guidelines</a>
            </div>
          </div>
          ${lazyImage({ src: './assets/img/studio/plant-group.png', alt: 'Group of potted indoor plants', width: 206, height: 238, className: 'st-card__img--plants st-img-plain' })}
        </div>
        <div class="st-plant-panel">
          <div class="st-plant-panel__col">
            <span class="st-plant-panel__label">${svg('pot', 22, 1.6)}Number of Plants</span>
            <div class="st-counter">
              <button type="button" class="st-counter__btn" aria-label="Fewer plants" data-action="fewer" data-key="fewer" ${p.plantCount <= 0 ? raw('disabled') : ''}>${icon('minus', { size: 16, stroke: 2.2 })}</button>
              <span class="st-counter__n" aria-live="polite">${p.plantCount}</span>
              <button type="button" class="st-counter__btn" aria-label="More plants" data-action="more" data-key="more" ${p.plantCount >= PLANT_MAX ? raw('disabled') : ''}>${icon('plus', { size: 16, stroke: 2.2 })}</button>
            </div>
          </div>
          <div class="st-plant-panel__sep" aria-hidden="true"></div>
          <div class="st-plant-panel__col">
            <span class="st-plant-panel__label">${svg('coverage', 22, 1.6)}Floor Coverage</span>
            <span class="st-coverage"><strong class="st-coverage__pct">${P.coverage.toFixed(1)}%</strong><span class="st-coverage__of">of ${S.room.area} m²</span></span>
            <div class="bar" role="img" aria-label="${P.coverageText}, target 2%"><div class="bar__fill" style="width:${P.coverageBar}%"></div></div>
          </div>
        </div>
        <div class="st-divider"></div>
        <div class="st-species" role="group" aria-label="Species">${SPECIES_ORDER.map((k) => speciesChip(k, !!p.sp[k]))}</div>
        <span class="st-note" aria-live="polite">${P.speciesNote}</span>
      </article>

      <article class="st-card" aria-labelledby="colour-h" data-reveal style="--i:2">
        <div class="st-card__head"><span class="st-card__disc">${svg('disc-palette', 26, 1.4)}</span>${cardStatus(P.colourStatus, 'colour')}</div>
        <div class="st-card__body st-card__body--colour">
          <h3 id="colour-h" class="eyebrow">Colour &amp; Finish</h3>
          <span class="st-card__headline st-card__headline--colour">${P.colourHeadline}</span>
          <span class="st-card__why">${P.colourWhy}</span>
          <a class="st-card__link" href="#/guidelines/colour">Check colour guidelines</a>
          ${lazyImage({ src: './assets/img/studio/classroom-iso.png', alt: 'Isometric illustration of a classroom with desks, a whiteboard and a window', width: 222, height: 226, className: 'st-card__img st-card__img--colour st-img-plain', contain: true })}
        </div>
        <div class="st-palettes" role="group" aria-label="Palette">${PALETTE_ORDER.map(([k, label]) => html`<button type="button" class="st-pal" aria-pressed="${p.palette === k && !p.noChange}" data-action="palette" data-arg="${k}" data-key="pal-${k}"><span class="st-sw st-sw--${k}" aria-hidden="true"><span></span><span></span><span></span></span><span>${label}</span></button>`)}</div>
        <label class="st-nochange">${svg('nochange', 22, 1.6)}<span class="st-nochange__label">No Changes Required</span><input type="checkbox" class="tick" data-action="nochange" data-key="nochange" ${p.noChange ? raw('checked') : ''} aria-label="No changes required"></label>
        <div class="st-divider"></div>
        <div class="st-finishes" role="group" aria-label="Wall finish" data-dim="${!!p.noChange}">${FINISH_ORDER.map(([k, label]) => html`<button type="button" class="st-finish" aria-pressed="${p.finish === k}" data-action="finish" data-arg="${k}" data-key="fin-${k}">${label}</button>`)}</div>
        <span class="st-note" aria-live="polite">${P.finishNote}</span>
      </article>
    </div>
    <div class="st-foot">
      <button type="button" class="btn st-h48" data-action="back" data-key="back">${icon('chevron-left', { size: 16, stroke: 1.8 })}Back</button>
      <div class="st-foot__group st-foot__group--12">
        <button type="button" class="btn st-h48 st-reset" data-action="reset" data-key="reset">Reset to recommended</button>
        <button type="button" class="btn btn--primary" data-action="next" data-key="next">See plan and impact${icon('arrow-right', { size: 18, stroke: 2 })}</button>
      </div>
    </div>
  </section>`;
}

/* ---------- Step 4: Plan and impact ---------- */
const DESKS = [[120, 96], [250, 96], [120, 176], [250, 176], [120, 256], [250, 256]];
function renderStep4(S, P) {
  const tariff = Number(P.tariff) || DEFAULT_TARIFF;
  const stat = (name, label, value, sub, i, count) => html`<div class="st-stat" data-reveal style="--i:${i}">
    <span class="st-stat__label">${name === 'cash' ? svg('cash', 16) : icon(name, { size: 16 })}${label}</span>
    <span class="st-stat__value" ${count ? raw(`data-count="${count.to}" data-prefix="${esc(count.prefix || '')}"`) : ''}>${value}</span>
    <span class="st-stat__sub">${sub}</span>
  </div>`;
  return html`<section class="st-section" aria-label="Plan and impact">
    <div class="st-plan">
      <div class="st-plan__left" data-reveal style="--i:0">
        <div class="st-plan__head">
          <span class="st-plan__title">${S.room.name} · plan view</span>
          <div class="st-plan__tools">
            <button type="button" class="btn" data-action="soon" data-arg="Photo upload">${svg('upload', 14, 2)}Photo</button>
            <button type="button" class="btn" data-action="soon" data-arg="Floor plan upload">${svg('upload', 14, 2)}Floor plan</button>
          </div>
        </div>
        <div class="st-diagram-wrap">
          <div class="st-diagram">
            <div class="st-room-plan" role="img" aria-label="Plan view: whiteboard wall at top, window on the left, door bottom right, desks, ${P.fittingsN} proposed LED fittings and ${P.plantDots.length} plant positions">
              <div class="st-plan-board"></div>
              <div class="st-plan-window"></div>
              <div class="st-plan-door"></div>
              <div class="st-plan-doorgap"></div>
              ${DESKS.map(([x, y]) => html`<div class="st-plan-desk" style="left:${x}px;top:${y}px"></div>`)}
              ${P.fittings.map((f, i) => html`<div class="st-plan-fit ${f.zoneA ? 'st-plan-fit--a' : ''}" style="left:${f.x}px;top:${f.y}px;--i:${i}"></div>`)}
              ${P.plantDots.map((d, i) => html`<div class="st-plan-dot" style="left:${d.x}px;top:${d.y}px;--i:${i}"></div>`)}
            </div>
          </div>
        </div>
        <div class="st-legend">
          <span class="st-legend__item"><span class="st-legend__sw st-legend__sw--a"></span>${P.fittingLegend}</span>
          <span class="st-legend__item"><span class="st-legend__sw st-legend__sw--soft"></span>Other zones</span>
          <span class="st-legend__item"><span class="st-legend__sw st-legend__sw--plant"></span>Plant · ${P.plantDots.length}</span>
          <span class="st-legend__item"><span class="st-legend__sw st-legend__sw--desk"></span>Desk</span>
        </div>
      </div>

      <div class="st-plan__right">
        <div class="st-stats">
          ${stat('cash', 'Investment', 'A$' + fmt.money0(P.total), 'Illustrative estimate', 1, { to: P.total, prefix: 'A$' })}
          ${stat('bolt', 'Energy saved', fmt.int(P.savingKwh), 'kWh per year · modelled', 2, { to: P.savingKwh })}
          ${stat('trend', 'Cost saved', 'A$' + fmt.money0(P.savingCost), `per year at A$${tariff.toFixed(2)}/kWh`, 3, { to: P.savingCost, prefix: 'A$' })}
          ${stat('clock', 'Payback', P.paybackText, P.paybackNote, 4)}
        </div>
        <div class="st-summary" data-reveal style="--i:5">
          <div class="st-summary__head"><span>Plan summary</span>${statusPill(P.planStatus, 'st-plan-status')}</div>
          <dl class="st-summary__list">
            <div class="st-summary__row"><dt>${svg('sun-low', 14)}${P.lightLine}</dt><dd>A$${fmt.money0(P.lightCost)}</dd></div>
            <div class="st-summary__row"><dt>${icon('leaf', { size: 14 })}${P.plantLine}</dt><dd>A$${fmt.money0(P.plantCost)}</dd></div>
            <div class="st-summary__row"><dt>${icon('palette-plain', { size: 14 })}${P.colourLine}</dt><dd>A$${fmt.money0(P.paintCost)}</dd></div>
          </dl>
          <span class="st-verify">${P.verifyLine}</span>
        </div>
      </div>
    </div>
    <div class="st-foot">
      <div class="st-foot__group">
        <button type="button" class="btn" data-action="back" data-key="back">${icon('chevron-left', { size: 16, stroke: 1.8 })}Back</button>
        <button type="button" class="btn btn--ghost" data-action="restart" data-key="restart">${svg('restart', 16, 1.8)}Start again</button>
      </div>
      <div class="st-foot__group">
        <button type="button" class="btn" data-action="save" data-key="save">${svg('save', 16, 1.8)}Save draft</button>
        <a class="btn" href="#/reports">${svg('export', 16, 1.8)}Export</a>
        <button type="button" class="btn btn--primary" data-action="submit" data-key="submit">Submit for review${icon('arrow-right', { size: 18, stroke: 2 })}</button>
      </div>
    </div>
  </section>`;
}

/* ---------- "Add a classroom from this type" dialog ---------- */
function openAddRoom(type, rooms, onAdded) {
  const buildings = Array.from(new Set(rooms.map((r) => r.building).filter(Boolean)));
  const form = html`<form class="stack gap-18" novalidate>
    <div class="stack gap-4">
      <h2 class="h-sub" id="st-add-title">Add a classroom</h2>
      <p class="small muted">Starting from <strong>${type.num} · ${type.name}</strong>. Its typical conditions are pre-filled; you can change them in the next step.</p>
    </div>
    <div class="st-form__grid">
      <label class="field st-form__wide"><span class="field__label">Name</span><input class="input" name="name" required maxlength="60" placeholder="e.g. Seminar Room 02" autocomplete="off"></label>
      <label class="field"><span class="field__label">Building</span><input class="input" name="building" required maxlength="60" list="st-buildings" placeholder="e.g. Teaching Block A" autocomplete="off"></label>
      <datalist id="st-buildings">${buildings.map((b) => html`<option value="${b}"></option>`)}</datalist>
      <label class="field"><span class="field__label">Level</span><input class="input" name="level" required maxlength="12" placeholder="e.g. L2" autocomplete="off"></label>
      <label class="field"><span class="field__label">Area (m²)</span><input class="input" name="area" type="number" inputmode="numeric" min="10" max="600" step="1" required placeholder="e.g. 58"></label>
      <div class="field"><span class="field__label">Typical size</span><span class="input" style="display:flex;align-items:center;background:var(--surface-2)">${type.size}</span></div>
    </div>
    <div class="dialog__actions">
      <button type="button" class="btn" data-cancel>Cancel</button>
      <button type="submit" class="btn btn--primary btn--md">${icon('plus', { size: 16, stroke: 2 })}<span>Add and continue</span></button>
    </div>
  </form>`;
  const { dlg, close } = openDialog(form);
  dlg.setAttribute('aria-labelledby', 'st-add-title');
  $('[data-cancel]', form).addEventListener('click', close);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const fd = new FormData(form);
    const payload = { name: String(fd.get('name') || '').trim(), building: String(fd.get('building') || '').trim(), level: String(fd.get('level') || '').trim(), area: Number(fd.get('area')), typeId: type.id };
    const btn = $('button[type="submit"]', form);
    try {
      const room = await withSpinner(btn, () => api.addRoom(payload), { busyLabel: 'Adding…' });
      if (!room) return;
      close();
      onAdded(room);
    } catch (err) {
      console.error(err);
      toast('Could not add the classroom. Please try again.', { kind: 'error' });
    }
  });
  return { dlg, close };
}

/* ======================================================================
   Page
   ====================================================================== */
export default async function page(ctx) {
  await loadStyle(new URL('./studio.css', import.meta.url));

  const S = { step: 1, rooms: [], roomId: null, room: null, cond: null, plan: null, submitted: false, savedText: 'Draft · not yet saved', type: null, loadingRoomId: null };
  let settings = { hours: DEFAULT_HOURS, tariff: DEFAULT_TARIFF };
  let dialog = null;
  let condTimer = null;
  let condDirty = false;

  const adopt = (room, saved) => {
    S.room = room; S.roomId = room.id; S.cond = { ...room.cond };
    S.plan = planFrom(saved, S.cond);
    S.submitted = !!(saved && saved.submitted && room.status === 'in-review');
    S.savedText = savedTextFor(saved, room);
    api.setUi({ activeRoomId: room.id });
  };
  const loadRoom = async (id) => {
    const [room, saved] = await Promise.all([api.getRoom(id), api.getPlan(id)]);
    if (!room) throw new Error('Classroom not found');
    adopt(room, saved);
    return room;
  };

  /* ---- Entry: ?room= (handover → step 2), ?type= (step 1 + banner), ?step= (forced), none (store's active room) ---- */
  const q = ctx.query;
  const [rooms, loadedSettings] = await Promise.all([api.getRooms(), api.getSettings().catch(() => null)]);
  S.rooms = rooms;
  S.photos = await photoUrlsFor(rooms);
  if (loadedSettings) settings = { hours: Number(loadedSettings.hours) || DEFAULT_HOURS, tariff: Number(loadedSettings.tariff) || DEFAULT_TARIFF };
  const wantRoom = q.get('room');
  const wantType = q.get('type');
  const stepParam = parseInt(q.get('step') || '', 10);
  const wantStep = stepParam >= 1 && stepParam <= 4 ? stepParam : 0;
  if (wantRoom && rooms.some((r) => r.id === wantRoom)) { await loadRoom(wantRoom); S.step = 2; }
  else {
    if (wantType) S.type = typeById(wantType) || null;
    const active = (store.get().ui || {}).activeRoomId;
    const preset = rooms.find((r) => r.id === active) || rooms[0];
    if (preset) await loadRoom(preset.id);
  }
  if (wantStep) S.step = S.room ? wantStep : 1;
  if (wantRoom && !S.room) toast('That classroom could not be found — pick one below.', { kind: 'info' });

  const calc = () => computePlan({ ...S.room, cond: S.cond }, S.plan, settings);

  /* ---- Page shell ---- */
  const el = html`<div class="page st-page">
    <div data-intro></div>
    <div data-stepper></div>
    <div data-banner></div>
    <div data-step></div>
  </div>`;
  const intro = $('[data-intro]', el), stepper = $('[data-stepper]', el), banner = $('[data-banner]', el), stepHost = $('[data-step]', el);

  const RENDER = { 1: renderStep1, 2: renderStep2, 3: renderStep3, 4: renderStep4 };
  let painted = false;
  function render({ anim = null, focusTitle = false } = {}) {
    const P = S.room ? calc() : null;
    patch(intro, renderIntro(S, P));
    patch(stepper, renderStepper(S));
    patch(banner, renderBanner(S, P));
    const section = RENDER[S.step](S, P);
    if (anim) section.classList.add(anim);
    patch(stepHost, section);
    // Scroll-reveal only when a step first appears; same-step re-renders (a choice changed) show at once.
    if (anim || !painted) observeReveal(stepHost);
    else $$('[data-reveal]', stepHost).forEach((n) => n.classList.add('is-visible'));
    painted = true;
    if (S.step === 4) $$('[data-count]', stepHost).forEach((n, i) => countUp(n, Number(n.dataset.count), { delay: 120 + i * 90, format: (v) => (n.dataset.prefix || '') + Math.round(v).toLocaleString('en-AU') }));
    if (focusTitle) { const h = $('[data-step-title]', intro); if (h) h.focus({ preventScroll: true }); }
  }
  const renderStep = () => render();

  function go(n) {
    const next = Math.min(4, Math.max(1, n));
    if (next === S.step) return;
    if (next > 1 && !S.room) { toast('Pick a classroom first.', { kind: 'info' }); return; }
    const forward = next > S.step;
    S.step = next;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    render({ anim: forward ? 'slide-in' : 'fade-swap', focusTitle: true });
  }

  /* ---- Conditions: persist (debounced) so the library reflects them ---- */
  const flushCond = () => {
    clearTimeout(condTimer); condTimer = null;
    if (!condDirty || !S.roomId) return;
    condDirty = false;
    api.updateRoomConditions(S.roomId, S.cond).then((room) => { if (room) { S.room = { ...S.room, ...room, cond: S.cond }; S.rooms = S.rooms.map((r) => r.id === room.id ? room : r); } }).catch((err) => console.error(err));
  };
  const scheduleCond = () => { condDirty = true; clearTimeout(condTimer); condTimer = setTimeout(flushCond, 450); };

  function setCond(key, val) {
    if (S.cond[key] === val) return;
    S.cond = { ...S.cond, [key]: val };
    S.plan = recsFor(S.cond);        // like the design's setCond: recommendations follow the conditions
    S.submitted = false;
    scheduleCond();
    renderStep();
  }
  function setPlan(patchObj) { S.plan = { ...S.plan, ...patchObj }; renderStep(); }

  /* ---- Step 1: pick a room (inline spinner on the tile while it loads) ---- */
  async function pickRoom(id) {
    if (S.loadingRoomId) return;
    if (S.roomId === id && S.room) return;
    flushCond();
    S.loadingRoomId = id;
    renderStep();
    try {
      await loadRoom(id);
    } catch (err) {
      console.error(err);
      toast('Could not load that classroom.', { kind: 'error' });
    } finally {
      S.loadingRoomId = null;
      if (ctx.isCurrent()) renderStep();
    }
  }

  /* ---- CCT slider: readout, hint and the lighting status pill update in place on input ---- */
  function onCct(input) {
    S.plan.cct = Number(input.value);
    const P = calc();
    const v = $('[data-cct-value]', stepHost); if (v) v.textContent = P.plan.cct + 'K';
    const h = $('[data-cct-hint]', stepHost); if (h) { h.textContent = P.cctHint; h.dataset.kind = P.cctHintKind; }
    input.setAttribute('aria-valuetext', `${P.plan.cct} kelvin, ${P.cctHint}`);
    const old = $('[data-status="light"]', stepHost); if (old) old.replaceWith(cardStatus(P.lightStatus, 'light'));
  }

  /* ---- Step 4 actions ---- */
  async function saveDraft(btn) {
    flushCond();
    const res = await withSpinner(btn, () => api.saveDraft(S.roomId, choices(S.plan)), { busyLabel: 'Saving…', doneLabel: 'Saved' });
    if (!res || !ctx.isCurrent()) return;
    S.savedText = 'Draft saved just now';
    const saved = $('[data-saved]', intro); if (saved) saved.textContent = S.savedText;
    S.room = { ...S.room, status: S.room.status === 'not-assessed' || S.room.status === 'changes' ? 'draft' : S.room.status };
    toast('Draft saved', { action: { label: 'Open library', onClick: () => ctx.navigate('/') } });
  }
  async function submitPlan(btn) {
    flushCond();
    const review = await withSpinner(btn, () => api.submitForReview(S.roomId, choices(S.plan)), { busyLabel: 'Submitting…', doneLabel: 'Submitted' });
    if (!review || !ctx.isCurrent()) return;
    S.submitted = true; S.savedText = 'Submitted for review';
    S.room = { ...S.room, status: 'in-review' };
    const saved = $('[data-saved]', intro); if (saved) saved.textContent = S.savedText;
    patch(banner, renderBanner(S, calc()));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast(`${S.room.name} submitted for review`, { action: { label: 'Track in Reports', onClick: () => ctx.navigate('/reports') } });
  }
  function restart() {
    flushCond();
    S.step = 1; S.submitted = false; S.type = null;
    if (S.room) { S.cond = { ...S.room.cond }; S.plan = planFrom(store.get().plans[S.roomId], S.cond); S.savedText = savedTextFor(store.get().plans[S.roomId], S.room); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    render({ anim: 'fade-swap', focusTitle: true });
  }

  /* ---- Event delegation ---- */
  const CLICK = {
    goto: (b) => go(Number(b.dataset.arg)),
    next: () => go(S.step + 1),
    back: () => go(S.step - 1),
    'pick-room': (b) => pickRoom(b.dataset.arg),
    cond: (b) => setCond(b.dataset.field, b.dataset.arg),
    zones: (b) => setPlan({ zones: Number(b.dataset.arg) }),
    fewer: () => setPlan({ plantCount: Math.max(0, S.plan.plantCount - 1) }),
    more: () => setPlan({ plantCount: Math.min(PLANT_MAX, S.plan.plantCount + 1) }),
    palette: (b) => setPlan({ palette: b.dataset.arg, noChange: false }),
    finish: (b) => setPlan({ finish: b.dataset.arg }),
    reset: () => { S.plan = recsFor(S.cond); renderStep(); toast('Reset to the recommended plan', { kind: 'info', timeout: 2200 }); },
    save: (b) => saveDraft(b).catch((err) => { console.error(err); toast('Could not save the draft.', { kind: 'error' }); }),
    submit: (b) => submitPlan(b).catch((err) => { console.error(err); toast('Could not submit for review.', { kind: 'error' }); }),
    restart: () => restart(),
    soon: (b) => toast(`${b.dataset.arg} is not available in this demo.`, { kind: 'info', timeout: 2400 }),
    'add-room': () => {
      if (dialog || !S.type) return;
      dialog = openAddRoom(S.type, S.rooms, (room) => {
        S.rooms = [...S.rooms, room];
        adopt(room, null);
        S.type = null;
        toast(`${room.name} added`);
        S.step = 2;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        render({ anim: 'slide-in', focusTitle: true });
      });
      dialog.dlg.addEventListener('close', () => { dialog = null; }, { once: true });
    }
  };
  on(el, 'click', 'button[data-action]', (e, btn) => { const fn = CLICK[btn.dataset.action]; if (fn) fn(btn, e); });
  on(el, 'change', 'input[data-action]', (e, input) => {
    const a = input.dataset.action;
    if (a === 'dimming') setPlan({ dimming: input.checked });
    else if (a === 'species') setPlan({ sp: { ...S.plan.sp, [input.dataset.arg]: input.checked } });
    else if (a === 'nochange') setPlan({ noChange: input.checked });
    else if (a === 'cct') onCct(input);
  });
  on(el, 'input', 'input[data-action="cct"]', (e, input) => onCct(input));

  render();

  ctx.onCleanup(() => {
    flushCond();
    if (dialog) dialog.close();
  });
  return el;
}

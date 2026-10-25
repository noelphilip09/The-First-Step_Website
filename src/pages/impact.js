// Impact & Outcomes — what the selected plan (or the whole portfolio) delivers, who
// benefits, and a side-by-side comparison of the plans still to prioritise.
// Figures come from computePlan so they agree with the Studio, Energy and Reports pages.
import { html, raw, $, $$, on, patch, fmt } from '../lib/dom.js';
import { api } from '../lib/api.js';
import { store } from '../lib/store.js';
import { loadStyle, countUp } from '../lib/loading.js';
import { computePlan, PALETTES } from '../lib/plan.js';
import { ROOM_STATUS } from '../lib/constants.js';
import { roomStatusPill, emptyState } from '../components/ui.js';

/* ---------- Inline SVGs copied from the design ---------- */
const svg = (size, body, stroke = 1.6) => raw(`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`);
const P = {
  card: '<rect x="3" y="6" width="18" height="12" rx="2"></rect><circle cx="12" cy="12" r="2.5"></circle>',
  cardRect: '<rect x="3" y="6" width="18" height="12" rx="2"></rect>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"></path>',
  wrench: '<path d="M14 7l3-3 3 3-3 3zM3 21l9-9"></path><path d="M12 12l3 3"></path>',
  wrench2: '<path d="M14 7l3-3 3 3-3 3zM3 21l9-9"></path>',
  drop: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"></path>',
  clock: '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
  bars: '<path d="M4 20h16M6 16V9M10 16V5M14 16v-6M18 16V8"></path>',
  users: '<circle cx="9" cy="8" r="3.5"></circle><path d="M2.5 20a6.5 6.5 0 0 1 13 0"></path><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-5-6.3"></path>',
  check: '<path d="M5 12l4 4 10-10"></path>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"></path>',
  grad: '<path d="M22 10L12 5 2 10l10 5 10-5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path>',
  person: '<circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path>',
  building: '<rect x="4" y="3" width="16" height="18" rx="1.5"></rect><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3"></path>',
  sliders: '<path d="M4 12h16M4 6h10M4 18h7"></path>',
  wave: '<path d="M3 12h4l3-7 4 14 3-7h4"></path>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"></path><circle cx="12" cy="12" r="3"></circle>',
  leaf: '<path d="M5 19C5 9 11 4 20 4c0 9-5 15-15 15z"></path><path d="M5 19l8-8"></path>',
  sun: '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M2 12h2M20 12h2"></path>',
  layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"></path><path d="M3 13l9 5 9-5"></path>',
  columns: '<rect x="3" y="4" width="8" height="16" rx="1.5"></rect><rect x="13" y="4" width="8" height="16" rx="1.5"></rect>',
  trend: '<path d="M3 17l6-6 4 4 8-8"></path><path d="M14 7h7v7"></path>',
  clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"></rect><path d="M9 11h6M9 15h4"></path>',
  warn: '<path d="M12 3l10 18H2z"></path><path d="M12 10v4M12 18h.01"></path>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-2 0-3 3 0 4-1 1-3 1-5a9 9 0 0 0-7-7z"></path>'
};

/* ---------- Derived figures ---------- */
// A controls-only retrofit (existing LEDs + dimming) has no modelled saving in computePlan;
// the design shows an *assumed* 20% dimming saving for it, flagged "assumed" everywhere.
const CONTROLS_SAVING = 0.2;
const ALL = { lighting: true, plants: true, colour: true };
const DOT_LABEL = { verified: 'Verified', modelled: 'Modelled', potential: 'Potential' };
const STATUS_ORDER = { 'not-assessed': 0, draft: 1, changes: 2, 'in-review': 3, approved: 4 };

function sensoryOf(room) {
  const c = room.cond;
  if (c.glare === 'strong') return { label: 'Strong glare', kind: 'outside', severity: 3 };
  if (c.lighting === 'fluorescent') return { label: 'Flicker reported', kind: 'review', severity: 2 };
  if (c.glare === 'some') return { label: 'Screen glare', kind: 'review', severity: 1 };
  return { label: 'None reported', kind: 'none', severity: 0 };
}
function assumptionsOf(pc) {
  const a = ['Electricity tariff · entered, not USYD’s'];
  if (pc.replace) a.push('Ballast wattage · electrician');
  if (pc.plan.plantCount > 0 && !pc.plantNotRequired) a.push('Water access · facilities');
  if (pc.glareFirst) a.push('Glare measurement · lighting designer');
  return a;
}
function figuresFor(room, plan, inc = ALL) {
  const pc = computePlan(room, plan);
  const c = room.cond;
  const controlsOnly = !pc.replace && c.lighting === 'ledfixed' && !!pc.plan.dimming;
  const assumedKwh = inc.lighting && controlsOnly ? pc.existingKwh * CONTROLS_SAVING : 0;
  const savingKwh = inc.lighting ? pc.savingKwh : 0;
  const savingCost = inc.lighting ? pc.savingCost : 0;
  const assumedCost = assumedKwh * pc.tariff;
  const proposedKwh = (inc.lighting ? pc.proposedKwh : pc.existingKwh) - assumedKwh;
  const total = (inc.lighting ? pc.lightCost : 0) + (inc.plants ? pc.plantCost : 0) + (inc.colour ? pc.paintCost : 0);
  let complexity = inc.lighting ? (pc.replace ? 3 : controlsOnly ? 2 : pc.glareCost ? 1 : 0) : 0;
  if (inc.colour && pc.doPaint && pc.paintArea >= 100) complexity += 1;
  complexity = Math.min(4, Math.max(1, complexity));
  return { pc, controlsOnly, assumedKwh, assumedCost, savingKwh, savingCost, proposedKwh, existingKwh: pc.existingKwh, total, complexity, sensory: sensoryOf(room), assumptions: assumptionsOf(pc) };
}
const assessed = (rooms) => rooms.filter((r) => r.status !== 'not-assessed');
const portfolioRooms = (rooms) => { const a = assessed(rooms); return a.length ? a : rooms; };
// The comparison shows the plans still to prioritise; falls back to every assessed plan.
function compareRooms(rooms) {
  const open = rooms.filter((r) => r.status === 'draft' || r.status === 'in-review' || r.status === 'changes');
  return open.length >= 2 ? open : assessed(rooms);
}

/* ---------- Copy derived from the plan ---------- */
function approachOf(f, c) {
  const pc = f.pc; const parts = [];
  if (pc.replace) parts.push('Fluorescent → LED');
  else { if (f.controlsOnly) parts.push('Controls'); if (pc.glareCost) parts.push('glare'); }
  if (!pc.replace && pc.plan.plantCount > 0 && !pc.plantNotRequired) parts.push('plants');
  if (!pc.replace && pc.doPaint) parts.push('colour');
  if (!parts.length) parts.push(c.lighting === 'leddim' ? 'Scenes only' : 'Keep as is');
  const s = parts.join(' + ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function lightingCell(f, c) {
  const pc = f.pc;
  if (pc.replace) return `${pc.fittingsN} × 32 W LED · ${pc.plan.zones} zone${pc.plan.zones === 1 ? '' : 's'} · ${pc.plan.cct} K`;
  if (c.lighting === 'leddim') return 'Keep fittings · warm default scene';
  const parts = ['Keep LEDs'];
  if (f.controlsOnly) parts.push('add dimming');
  if (c.glare === 'strong') parts.push('diffusers, blinds'); else if (c.glare === 'some') parts.push('glare treatment');
  return parts.join(' · ');
}
function plantsCell(f, c) {
  const pc = f.pc; const n = pc.plan.plantCount;
  if (pc.plantNotRequired) return 'Already planted · maintain';
  if (!n) return 'None proposed';
  if (c.size === 'compact') return `${n} desk plants`;
  if (c.daylight === 'low') return `${n} low-light, wicking pots`;
  return `${n} plants, window wall`;
}
function colourCell(f) {
  const pc = f.pc;
  if (!pc.doPaint) return pc.repaint ? 'Repaint recommended' : 'Not required';
  return html`<span class="im-inline"><span class="im-swatch im-swatch--${pc.plan.palette}" aria-hidden="true"></span>${PALETTES[pc.plan.palette]} · ${pc.paintArea} m²</span>`;
}
const dots = (n, of = 4, label = 'Complexity') => html`<span class="im-dots" role="img" aria-label="${label} ${n} of ${of}">${Array.from({ length: of }, (_, i) => raw(`<span class="${i < n ? 'is-on' : ''}"></span>`))}</span>`;
const pill = (s) => html`<span class="pill pill--${s.kind}">${s.label}</span>`;

const SORTS = {
  energy: { label: 'Energy saving', icon: P.bolt, cmp: (a, b) => (b.f.savingCost + b.f.assumedCost) - (a.f.savingCost + a.f.assumedCost) },
  cost: { label: 'Lowest cost', icon: P.cardRect, cmp: (a, b) => a.f.total - b.f.total },
  ease: { label: 'Ease', icon: P.check, cmp: (a, b) => a.f.complexity - b.f.complexity },
  sensory: { label: 'Sensory issue', icon: P.warn, cmp: (a, b) => b.f.sensory.severity - a.f.sensory.severity },
  assess: { label: 'Assess first', icon: P.clock, cmp: (a, b) => (b.f.assumptions.length - a.f.assumptions.length) || (STATUS_ORDER[a.room.status] - STATUS_ORDER[b.room.status]) }
};
const FMT = { money: fmt.money, kwh: (n) => fmt.int(n) + ' kWh', int: fmt.int };

/* ---------- Impact summary ---------- */
function nextAction(room, list) {
  if (!room) return list.some((r) => r.status === 'in-review') ? { title: 'Reviewer decision', href: '#/reports' } : { title: 'Export the reports', href: '#/reports' };
  switch (room.status) {
    case 'in-review': return { title: 'Reviewer decision', href: '#/reports' };
    case 'approved': return { title: 'Export the report', href: '#/reports' };
    case 'draft': return { title: 'Submit for review', href: '#/studio?room=' + room.id };
    case 'changes': return { title: 'Revise the plan', href: '#/studio?room=' + room.id };
    default: return { title: 'Start in the Studio', href: '#/studio?room=' + room.id };
  }
}
const STATUS_TONE = { approved: 'within', 'in-review': 'review', changes: 'outside', draft: 'neutral', 'not-assessed': 'neutral' };

function renderSummary(S, { reveal = false } = {}) {
  const list = S.selection === 'all' ? portfolioRooms(S.rooms) : S.rooms.filter((r) => r.id === S.selection);
  const figs = list.map((r) => figuresFor(r, S.plans[r.id]));
  const sum = (k) => figs.reduce((t, f) => t + f[k], 0);
  const total = sum('total'), kwh = sum('savingKwh'), cost = sum('savingCost');
  const open = S.selection === 'all' ? new Set(figs.flatMap((f) => f.assumptions)).size : (figs[0] ? figs[0].assumptions.length : 0);
  const filled = open <= 1 ? 3 : open <= 3 ? 2 : 1;
  const room = list.length === 1 ? list[0] : null;
  const rv = (i) => reveal ? raw(`data-reveal style="--i:${i}"`) : '';
  const dot = (kind) => kind ? html`<span class="im-dot im-dot--${kind}" role="img" aria-label="${DOT_LABEL[kind]}"></span>` : '';
  const kpi = (i, { icon, tone = 'accent', kind, value, label, count, key }) => html`<div class="im-kpi" ${rv(i)}><span class="im-kpi__top"><span class="im-kpi__icon im-kpi__icon--${tone}">${icon}</span>${dot(kind)}</span><span class="im-kpi__value" ${count ? raw(`data-count="${count.to}" data-fmt="${count.fmt}" data-key="${key}"`) : ''}>${value}</span><span class="im-kpi__label">${label}</span></div>`;

  let statusValue, statusLabel, statusTone;
  if (room) { statusValue = ROOM_STATUS[room.status].label; statusLabel = 'Implementation status'; statusTone = STATUS_TONE[room.status] || 'neutral'; }
  else {
    const n = (s) => list.filter((r) => r.status === s).length;
    statusValue = `${n('in-review')} in review`; statusLabel = `Implementation status · ${n('approved')} approved, ${n('draft') + n('changes')} in draft`;
    statusTone = n('in-review') ? 'review' : n('approved') ? 'within' : 'neutral';
  }
  const next = nextAction(room, list);
  const hasSaving = kwh > 0;
  return html`<section class="im-summary" aria-label="Impact summary">
    ${kpi(0, { icon: svg(20, P.card), kind: 'modelled', value: fmt.money(total), label: room ? 'Proposed investment' : `Proposed investment · ${list.length} plans`, count: { to: total, fmt: 'money' }, key: 'investment' })}
    ${kpi(1, { icon: svg(20, P.bolt), tone: hasSaving ? 'accent' : 'neutral', kind: hasSaving ? 'modelled' : 'potential', value: hasSaving ? FMT.kwh(kwh) : 'Not modelled', label: hasSaving ? `Annual reduction · ${fmt.money(cost)}` : 'Annual reduction · no fitting change', count: hasSaving ? { to: kwh, fmt: 'kwh' } : null, key: 'kwh' })}
    ${kpi(2, { icon: svg(20, P.wrench), tone: 'neutral', kind: 'potential', value: 'Needs data', label: 'Maintenance saving' })}
    ${kpi(3, { icon: svg(20, P.drop), tone: 'neutral', kind: 'potential', value: 'Needs baseline', label: 'Water saving' })}
    ${kpi(4, { icon: svg(20, P.clock), tone: statusTone, value: statusValue, label: statusLabel })}
    <div class="im-kpi" ${rv(5)}><span class="im-kpi__top"><span class="im-kpi__icon">${svg(20, P.bars)}</span></span><span class="im-bars" role="img" aria-label="Data confidence ${filled} of 3">${Array.from({ length: 3 }, (_, i) => raw(`<span class="${i < filled ? 'is-on' : ''}"></span>`))}</span><span class="im-kpi__label">Data confidence · ${open} assumption${open === 1 ? '' : 's'} open</span></div>
    ${kpi(6, { icon: svg(20, P.users), kind: 'potential', value: 'Pre / post', label: 'Student and staff evaluation' })}
    <a href="${next.href}" class="im-kpi im-kpi--dark" ${rv(7)}><span class="im-kpi__top"><span class="im-kpi__icon">${svg(20, P.check)}</span>${svg(20, P.arrow, 2)}</span><span class="im-kpi__value">${next.title}</span><span class="im-kpi__label">Recommended next action</span></a>
  </section>`;
}
function animateCounts(root, S, delay = 0) {
  $$('[data-count]', root).forEach((el) => {
    const to = Number(el.dataset.count); const key = el.dataset.key; const from = S.lastCounts[key] ?? 0;
    countUp(el, to, { from, duration: 900, delay, format: FMT[el.dataset.fmt] || FMT.int });
    S.lastCounts[key] = to;
  });
}

/* ---------- Benefits by stakeholder (static copy from the design) ---------- */
const BENEFITS = [
  { icon: P.grad, title: 'Students', items: [[P.sliders, 'Choice and control over lighting'], [P.wave, 'Less avoidable glare and flicker'], [P.eye, 'A calmer visual environment'], [P.leaf, 'Nature in the room']], foot: 'Measured by feedback, accessibility review, pre/post evaluation' },
  { icon: P.person, title: 'Teaching staff', items: [[P.sun, 'Lighting that fits the activity'], [P.layers, 'One standard way to request upgrades'], [P.clock, 'No plan starts from scratch'], [P.wrench2, 'A room that is easier to manage']], foot: 'Measured by staff feedback, maintenance requests, planning time' },
  { icon: P.building, title: 'USYD', items: [[P.bolt, 'Lower lighting electricity, where achieved'], [P.columns, 'Consistent upgrades, less duplication'], [P.eye, 'Visible investment needs'], [P.trend, 'Evidence for funding and sustainability goals']], foot: 'Measured by metered kWh, maintenance and water records' }
];
const renderBenefits = () => html`<section class="im-benefits" aria-label="Benefits by stakeholder">${BENEFITS.map((b, i) => html`<article class="im-benefit" data-reveal style="--i:${i}">
  <div class="im-benefit__head"><span class="im-benefit__icon">${svg(24, b.icon)}</span><span class="im-benefit__title">${b.title}</span></div>
  <ul class="im-benefit__list">${b.items.map(([ic, text]) => html`<li><span class="im-benefit__bullet">${svg(16, ic)}</span>${text}</li>`)}</ul>
  <span class="im-benefit__foot">${svg(14, P.clipboard, 1.8)}${b.foot}</span>
</article>`)}</section>`;

/* ---------- Compare and prioritise ---------- */
function renderTable(S) {
  const cols = compareRooms(S.rooms).map((room) => ({ room, f: figuresFor(room, S.plans[room.id], S.include) })).sort(SORTS[S.sort].cmp);
  if (!cols.length) return emptyState('Nothing to compare yet', 'Assess a classroom in the Design Studio and its plan appears here.', html`<a class="btn btn--sm" href="#/studio">Open the Studio</a>`);
  const maxSaving = Math.max(1, ...cols.map((c) => c.f.savingCost + c.f.assumedCost));
  const toggle = (key, icon, label) => html`<button type="button" class="im-rowtoggle" data-toggle="${key}" data-key="toggle-${key}" aria-pressed="${S.include[key]}" title="${S.include[key] ? 'Exclude' : 'Include'} ${label.toLowerCase()} in the totals">${svg(16, icon)}${label}</button>`;
  const row = (label, cells, cls = '') => html`<tr class="${cls}"><td>${label}</td>${cells}</tr>`;
  const inc = S.include;
  return html`<table class="im-table">
    <thead><tr><th></th>${cols.map((c) => html`<th><span class="im-table__room"><strong>${c.room.name}</strong><span>${approachOf(c.f, c.room.cond)}</span></span></th>`)}</tr></thead>
    <tbody>
      ${row(toggle('lighting', P.sun, 'Lighting'), cols.map((c) => html`<td>${lightingCell(c.f, c.room.cond)}</td>`), inc.lighting ? '' : 'is-off')}
      ${row(toggle('plants', P.leaf, 'Plants'), cols.map((c) => html`<td>${plantsCell(c.f, c.room.cond)}</td>`), inc.plants ? '' : 'is-off')}
      ${row(toggle('colour', P.palette, 'Colour'), cols.map((c) => html`<td>${colourCell(c.f)}</td>`), inc.colour ? '' : 'is-off')}
      ${row('Investment', cols.map((c) => html`<td class="num"><strong data-count="${c.f.total}" data-fmt="money" data-key="total-${c.room.id}">${fmt.money(c.f.total)}</strong></td>`))}
      ${row('Energy · kWh/yr', cols.map((c) => html`<td class="num">${fmt.int(c.f.existingKwh)} → ${fmt.int(c.f.proposedKwh)}</td>`))}
      ${row('Saving · A$/yr', cols.map((c) => { const v = c.f.savingCost + c.f.assumedCost; return v > 0
        ? html`<td><span class="im-savebar"><span class="im-savebar__bar" style="width:${Math.max(6, Math.round(v / maxSaving * 90))}px"></span><span class="num">${fmt.money0(v)}${c.f.assumedCost ? ' · assumed' : ''}</span></span></td>`
        : html`<td class="muted">Not modelled</td>`; }))}
      ${row('Complexity', cols.map((c) => html`<td>${dots(c.f.complexity)}</td>`))}
      ${row('Main sensory issue', cols.map((c) => html`<td>${pill(c.f.sensory)}</td>`))}
      ${row('Status', cols.map((c) => html`<td>${roomStatusPill(c.room)}</td>`))}
    </tbody>
  </table>`;
}
const renderSorts = (S) => Object.entries(SORTS).map(([key, s]) => html`<button type="button" class="im-sort" data-sort="${key}" data-key="sort-${key}" aria-pressed="${S.sort === key}">${svg(14, s.icon, 1.8)}${s.label}</button>`);

/* ---------- Page ---------- */
export default async function page(ctx) {
  await loadStyle(new URL('./impact.css', import.meta.url));
  const rooms = await api.getRooms();
  const plans = Object.fromEntries(await Promise.all(rooms.map(async (r) => [r.id, await api.getPlan(r.id)])));
  const wanted = ctx.query.get('room') || store.get().ui.activeRoomId;
  const S = { rooms, plans, selection: wanted === 'all' ? 'all' : rooms.some((r) => r.id === wanted) ? wanted : (rooms[0] && rooms[0].id), sort: 'energy', include: { ...ALL }, lastCounts: {} };

  const el = html`<div class="page im-page">
    <section class="page-intro" aria-label="Introduction" data-reveal>
      <div class="page-intro__text"><h2 class="display">What this plan delivers</h2><p class="lead">For students, teaching staff and the university — measured, not assumed.</p></div>
      <div class="im-controls">
        <label for="i-room" class="sr-only">Classroom</label>
        <select id="i-room" class="im-select" data-room>${rooms.map((r) => html`<option value="${r.id}" ${S.selection === r.id ? raw('selected') : ''}>${r.name}</option>`)}<option value="all" ${S.selection === 'all' ? raw('selected') : ''}>Portfolio · all plans</option></select>
        <span class="im-legend"><span class="im-legend__item"><span class="im-dot im-dot--verified"></span>Verified</span><span class="im-legend__item"><span class="im-dot im-dot--modelled"></span>Modelled</span><span class="im-legend__item"><span class="im-dot im-dot--potential"></span>Potential</span></span>
      </div>
    </section>
    <div data-summary>${renderSummary(S, { reveal: true })}</div>
    ${renderBenefits()}
    <section class="im-compare" aria-label="Compare and prioritise" data-reveal>
      <div class="im-compare__head">
        <div class="im-compare__titles"><h3 class="im-compare__title">Compare and prioritise</h3><span class="im-compare__sub">Sort by one thing at a time — no hidden score</span></div>
        <div class="im-sorts" role="group" aria-label="Sort by" data-sorts>${renderSorts(S)}</div>
      </div>
      <div class="im-table-wrap" data-table aria-live="polite">${renderTable(S)}</div>
      <span class="im-hint">Click a row heading to include or exclude that intervention from the totals.</span>
    </section>
    <p class="im-foot" data-reveal>No dollar value is put on wellbeing, inclusion, retention or staff satisfaction. Illustrative demonstration data.</p>
  </div>`;

  const summaryHost = $('[data-summary]', el);
  const tableHost = $('[data-table]', el);
  animateCounts(summaryHost, S, 200);
  $$('[data-count]', tableHost).forEach((n) => { S.lastCounts[n.dataset.key] = Number(n.dataset.count); });

  // Room / portfolio selection drives the summary cards.
  $('[data-room]', el).addEventListener('change', (e) => {
    S.selection = e.target.value;
    if (S.selection !== 'all') api.setUi({ activeRoomId: S.selection });
    const next = renderSummary(S); next.classList.add('fade-swap');
    patch(summaryHost, next);
    animateCounts(summaryHost, S);
  });
  // Sort chips re-order the compared plans.
  on(el, 'click', '[data-sort]', (e, btn) => {
    if (S.sort === btn.dataset.sort) return;
    S.sort = btn.dataset.sort;
    $$('[data-sort]', el).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sort === S.sort)));
    const t = renderTable(S); t.classList.add('fade-swap'); patch(tableHost, t);
  });
  // Row headings toggle an intervention; totals, energy, saving and complexity update in place.
  on(el, 'click', '[data-toggle]', (e, btn) => {
    const key = btn.dataset.toggle; S.include[key] = !S.include[key];
    patch(tableHost, renderTable(S));
    animateCounts(tableHost, S);
  });
  return el;
}

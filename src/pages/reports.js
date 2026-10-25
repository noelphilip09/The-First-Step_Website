// Reports & Review — a stakeholder-ready preview of the selected plan, export actions
// (download / print / share), the reviewer's decision, and the review queue.
import { html, raw, esc, $, $$, on, patch, fmt } from '../lib/dom.js';
import { api } from '../lib/api.js';
import { store } from '../lib/store.js';
import { loadStyle, withSpinner, toast, lazyImage } from '../lib/loading.js';
import { computePlan, COND_FIELDS, COND_LABEL } from '../lib/plan.js';
import { ROOM_STATUS, REVIEW_STATUS, CURRENT_USER } from '../lib/constants.js';
import { emptyState } from '../components/ui.js';

/* ---------- Inline SVGs copied from the design ---------- */
const svg = (size, body, stroke = 1.6) => raw(`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`);
const P = {
  image: '<rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="9" cy="10" r="2"></circle><path d="M21 16l-5-5-8 8"></path>',
  docFull: '<rect x="5" y="3" width="14" height="18" rx="2"></rect><path d="M9 8h6M9 12h6M9 16h4"></path>',
  docShort: '<rect x="5" y="3" width="14" height="18" rx="2"></rect><path d="M9 9h6M9 13h3"></path>',
  download: '<path d="M12 4v12M6 10l6 6 6-6M4 20h16"></path>',
  print: '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="7"></rect>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"></path><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"></path>',
  check: '<path d="M5 12l4 4 10-10"></path>',
  warn: '<path d="M12 3l10 18H2z"></path><path d="M12 10v4M12 18h.01"></path>',
  clock: '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
  pencil: '<path d="M4 20h4l10-10-4-4L4 16z"></path><path d="M13 7l4 4"></path>'
};

const SECTIONS = ['Classroom and existing conditions', 'Design challenges', 'Before photographs', 'Lighting', 'Planting and species', 'Colours and finishes', 'Visualisation and moodboard', 'Itemised costs', 'Energy and savings', 'Maintenance and operation', 'Student, staff and USYD impact', 'Assumptions, limits, sources', 'Implementation steps', 'Review and approval'];
const SCOPES = { detailed: { title: 'Detailed report', sub: '14 sections', icon: P.docFull }, summary: { title: 'Executive summary', sub: '2 pages', icon: P.docShort } };
const STEP_INDEX = { 'not-assessed': 0, draft: 0, 'in-review': 2, changes: 2, approved: 4 };

/* ---------- Selectors + derived copy ---------- */
const roomById = (S, id) => S.rooms.find((r) => r.id === id) || null;
const pendingReview = (S, id) => S.reviews.find((v) => v.roomId === id && v.status === 'pending') || null;
const latestReview = (S, id) => S.reviews.filter((v) => v.roomId === id).sort((a, b) => b.submittedAt - a.submittedAt)[0] || null;
const versionOf = (S, room) => room.status === 'approved' ? 'approved' : 'v' + (S.reviews.filter((v) => v.roomId === room.id).length + 1);
const levelLabel = (l) => l === 'G' ? 'Ground' : l === 'LG' ? 'Lower ground' : 'Level ' + String(l).replace(/^L/, '');
const previewStatus = (room) => room.status === 'in-review' ? { ...ROOM_STATUS['in-review'], label: 'Submitted for review' } : (ROOM_STATUS[room.status] || ROOM_STATUS['not-assessed']);
const preparedAt = (S, room) => { const p = S.plans[room.id]; return (p && (p.submittedAt || p.savedAt)) || room.updatedAt; };

function exceptionsOf(pc) {
  const bad = (s) => s.kind === 'review' || s.kind === 'outside';
  const out = [];
  if (bad(pc.lightStatus)) out.push({ code: 'L1', title: 'Guideline exception · L1', sub: 'Lighting · ' + pc.cctStatus.label });
  if (bad(pc.plantStatus)) out.push({ code: 'P8', title: 'Guideline exception · P8', sub: pc.plan.sp && pc.plan.sp.peace ? 'Peace lily · toxic if ingested' : 'Planting · ' + pc.plantStatus.label });
  if (bad(pc.colourStatus)) out.push({ code: 'C3', title: 'Guideline exception · C3', sub: 'Colour · ' + pc.colourStatus.label });
  return out;
}
function checksOf(pc) {
  const line = (name, s) => (s.kind === 'within' || s.kind === 'accent') ? { tone: 'ok', text: `${name} within guideline` }
    : (s.kind === 'notreq' || s.kind === 'none') ? { tone: 'ok', text: `${name} · ${s.label.toLowerCase()}` }
    : { tone: s.kind === 'outside' ? 'bad' : 'warn', text: `${name} · ${s.label}` };
  const rows = [line('Lighting', pc.lightStatus), line('Planting', pc.plantStatus), line('Colour', pc.colourStatus)];
  if (pc.replace) rows.push({ tone: 'warn', text: 'Ballast wattage · electrician to confirm' });
  if (pc.plan.plantCount > 0 && !pc.plantNotRequired) rows.push({ tone: 'warn', text: 'Water access · facilities to confirm' });
  if (pc.glareFirst) rows.push({ tone: 'warn', text: 'Glare measurement · lighting designer to confirm' });
  return rows;
}

/* ---------- Download helpers (local: nothing shared offers them) ---------- */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
const fmtBytes = (n) => n < 1024 ? n + ' B' : n < 1048576 ? Math.round(n / 1024) + ' KB' : (n / 1048576).toFixed(1) + ' MB';

// A self-contained, printable HTML version of the plan (what the "PDF" download carries).
function reportHtml(S, room, pc) {
  const e = esc;
  const detailed = S.scope === 'detailed';
  const latest = latestReview(S, room.id);
  const st = previewStatus(room);
  const rows = [['Lighting', pc.lightHeadline, pc.lightLine, pc.lightCost, pc.lightStatus.label], ['Planting', pc.plantHeadline, pc.plantLine, pc.plantCost, pc.plantStatus.label], ['Colour', pc.colourHeadline, pc.colourLine, pc.paintCost, pc.colourStatus.label]];
  const cond = COND_FIELDS.map((f) => `<tr><td>${e(f.label)}</td><td>${e(COND_LABEL[f.key][room.cond[f.key]] || '—')}</td></tr>`).join('');
  const fig = (l, v) => `<div class="fig"><span>${e(l)}</span><b>${e(v)}</b></div>`;
  const reviewPara = latest && latest.status !== 'pending'
    ? `${latest.status === 'approved' ? 'Approved' : 'Returned with notes'} by ${e(latest.reviewer)} on ${e(fmt.date(latest.decidedAt))}.${latest.note ? ' Rationale: “' + e(latest.note) + '”' : ''}`
    : latest ? `Submitted by ${e(latest.by)} on ${e(fmt.date(latest.submittedAt))} · awaiting the reviewer's decision.` : 'Not yet submitted for review.';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${e(room.name)} — Classroom proposal</title>
<style>body{font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;color:#1C2420;max-width:760px;margin:40px auto;padding:0 24px;line-height:1.5;font-size:14px}h1{font-weight:300;font-size:34px;letter-spacing:-.02em;margin:0 0 4px}h2{font-size:18px;margin:28px 0 8px;border-bottom:1px solid #E7E4DC;padding-bottom:6px}.eyebrow{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#5B645F;margin:0}.meta{color:#5B645F;margin:0 0 20px}table{width:100%;border-collapse:collapse;font-size:13px}th{text-align:left;font-weight:400;color:#5B645F;border-bottom:1px solid #E7E4DC;padding:8px 6px}td{padding:8px 6px;border-bottom:1px solid #EDEAE3;vertical-align:top}.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.figs{display:flex;gap:28px;flex-wrap:wrap;margin:16px 0 4px}.fig b{display:block;font-size:22px;font-weight:700}.fig span{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#5B645F}.note{font-size:12px;color:#5B645F}ol{padding-left:20px}@media print{body{margin:0;max-width:none}}</style></head><body>
<p class="eyebrow">Classroom proposal · Guideline v${e(S.settings.guidelineVersion)} · ${e(SCOPES[S.scope].title)}</p>
<h1>${e(room.name)}</h1>
<p class="meta">${e(room.building)} · ${e(levelLabel(room.level))} · ${room.area} m² · prepared ${e(fmt.date(preparedAt(S, room)))} by ${e(CURRENT_USER.name)} · ${e(st.label)}</p>
<div class="figs">${fig('Investment', fmt.money(pc.total))}${fig('Energy', (pc.savingKwh ? '−' : '') + fmt.int(pc.savingKwh) + ' kWh/yr')}${fig('Saving', 'A$' + fmt.money0(pc.savingCost) + '/yr')}${fig('Payback', pc.paybackText)}${fig('Exceptions', String(pc.exceptionCount))}</div>
<h2>Classroom and existing conditions</h2><table>${cond}</table>
<h2>Recommendations and itemised costs</h2><table><tr><th>Intervention</th><th>Recommendation</th><th>Scope</th><th class="num">Cost</th><th>Guideline</th></tr>${rows.map((r) => `<tr><td>${e(r[0])}</td><td>${e(r[1])}</td><td>${e(r[2])}</td><td class="num">${e(fmt.money(r[3]))}</td><td>${e(r[4])}</td></tr>`).join('')}<tr><td colspan="3"><b>Total</b></td><td class="num"><b>${e(fmt.money(pc.total))}</b></td><td>${e(pc.planStatus.label)}</td></tr></table>
<h2>Energy and savings</h2><p>${pc.fittingsN} existing fittings at ${pc.existingPer} W use ${e(fmt.int(pc.existingKwh))} kWh/yr over ${e(fmt.int(pc.hours))} hours; the proposal uses ${e(fmt.int(pc.proposedKwh))} kWh/yr. Saving ${e(fmt.int(pc.savingKwh))} kWh/yr, ${e(fmt.money(pc.savingCost))}/yr at A$${pc.tariff.toFixed(2)}/kWh. Payback ${e(pc.paybackText)} (${e(pc.paybackNote)}).</p>
<h2>Review and approval</h2><p>${reviewPara}</p>
${detailed ? `<h2>Full report contents</h2><ol>${SECTIONS.map((s) => `<li>${e(s)}</li>`).join('')}</ol>` : ''}
<p class="note">${e(pc.verifyLine)}. Illustrative values · modelled, not verified · not a supplier quotation.</p>
</body></html>`;
}

/* ---------- Report preview ---------- */
function renderPreview(S) {
  const room = roomById(S, S.roomId);
  const pc = computePlan(room, S.plans[room.id]);
  const st = previewStatus(room);
  const photos = S.photos[room.id] || {};
  const photo = (slot, label) => html`<div class="rp-photo">${photos[slot] ? lazyImage({ src: photos[slot], alt: `${label} photograph of ${room.name}`, eager: true }) : ''}<span class="rp-photo__tag">${label}</span>${photos[slot] ? '' : svg(26, P.image, 1.4)}<button type="button" class="rp-photo__btn" data-photo="${slot}">${photos[slot] ? 'Replace' : 'Upload'}</button></div>`;
  const share = (v) => pc.total ? Math.max(8, Math.round(v / pc.total * 100)) : 8;
  const costRow = (head, line, cost, status, cls = '') => html`<div class="rp-plan__row ${cls}"><span class="rp-plan__text"><span class="rp-plan__head">${head}</span>${line ? html`<span class="rp-plan__line">${line}</span>` : ''}</span><span class="rp-plan__cost">${fmt.money(cost)}</span><span class="pill pill--${status.kind}">${status.label}</span></div>`;
  const figure = (label, value) => html`<div class="rp-figure"><span class="rp-figure__label">${label}</span><span class="rp-figure__value">${value}</span></div>`;
  return html`<section class="rp-preview" aria-label="Report preview">
    <div class="rp-preview__head">
      <div class="rp-preview__titles"><span class="rp-preview__eyebrow">Classroom proposal · Guideline v${S.settings.guidelineVersion}</span><span class="rp-preview__title">${room.name}</span><span class="rp-preview__meta">${room.building} · ${levelLabel(room.level)} · ${room.area} m² · prepared ${fmt.date(preparedAt(S, room))}</span></div>
      <span class="${st.pill} pill--lg">${st.label}</span>
    </div>
    <div class="rp-media">
      ${photo('before', 'Before')}
      ${photo('proposed', 'Proposed')}
      <div class="rp-chart" role="img" aria-label="Cost breakdown: lighting ${fmt.money(pc.lightCost)}, planting ${fmt.money(pc.plantCost)}, colour ${fmt.money(pc.paintCost)} of ${fmt.money(pc.total)}"><span class="rp-chart__total"></span><span class="rp-chart__light" style="height:${share(pc.lightCost)}%"></span><span class="rp-chart__plant" style="height:${share(pc.plantCost)}%"></span><span class="rp-chart__paint" style="height:${share(pc.paintCost)}%"></span></div>
    </div>
    <ol class="rp-sections">${SECTIONS.map((s, i) => html`<li><span class="rp-sections__num">${i + 1}</span>${s}</li>`)}</ol>
    <div class="rp-plan">
      ${costRow(pc.lightHeadline, pc.lightLine, pc.lightCost, pc.lightStatus)}
      ${costRow(pc.plantHeadline, pc.plantLine, pc.plantCost, pc.plantStatus)}
      ${costRow(pc.colourHeadline, pc.colourLine, pc.paintCost, pc.colourStatus)}
      ${costRow('Total investment', pc.verifyLine, pc.total, pc.planStatus, 'rp-plan__row--total')}
    </div>
    <div class="rp-figures">
      ${figure('Investment', fmt.money(pc.total))}
      ${figure('Energy', (pc.savingKwh ? '−' : '') + fmt.int(pc.savingKwh) + ' kWh/yr')}
      ${figure('Saving', 'A$' + fmt.money0(pc.savingCost) + '/yr')}
      ${figure('Payback', pc.paybackText)}
      ${figure('Exceptions', String(pc.exceptionCount))}
    </div>
    <span class="rp-note">Illustrative values · modelled, not verified · not a supplier quotation</span>
  </section>`;
}

/* ---------- Aside: export + review ---------- */
function renderSteps(room) {
  const cur = STEP_INDEX[room.status] ?? 0;
  const labels = ['Draft', 'Submitted', room.status === 'changes' ? 'Returned' : 'In review', 'Approved'];
  const items = [];
  labels.forEach((label, i) => {
    const done = i < cur, current = i === cur;
    const cls = done ? 'is-done' : current ? (room.status === 'changes' ? 'is-current is-changes' : 'is-current') : '';
    items.push(html`<li class="rp-step ${cls}" ${current ? raw('aria-current="step"') : ''}><span class="rp-step__dot">${done ? svg(14, P.check, 3) : String(i + 1)}</span><span class="rp-step__label">${label}</span></li>`);
    if (i < labels.length - 1) items.push(html`<li class="rp-step__line ${i < cur - 1 ? 'is-done' : ''}" aria-hidden="true"></li>`);
  });
  return items;
}
function decisionBlock(S, room, latest) {
  if (room.status === 'approved' && latest && latest.status === 'approved') return html`<div class="rp-decision"><span class="rp-check rp-check--ok">${svg(16, P.check, 2.4)}Approved by ${latest.reviewer} · ${fmt.date(latest.decidedAt)}</span>${latest.note ? html`<span class="rp-decision__note">“${latest.note}”</span>` : ''}</div>`;
  if (room.status === 'changes' && latest && latest.status === 'changes') return html`<div class="rp-decision"><span class="rp-check rp-check--bad">${svg(16, P.warn, 2.2)}Returned by ${latest.reviewer} · ${fmt.date(latest.decidedAt)}</span>${latest.note ? html`<span class="rp-decision__note">“${latest.note}”</span>` : ''}<span class="rp-hint"><a href="#/studio?room=${room.id}">Revise the plan in the Design Studio</a> and submit it again.</span></div>`;
  return html`<div class="stack gap-8"><div class="rp-actions"><button type="button" class="btn btn--primary rp-btn rp-btn--lg" disabled>${svg(16, P.check, 2.4)}Approve plan</button><button type="button" class="btn rp-btn rp-btn--lg" disabled>Return with notes</button></div><span class="rp-hint">Nothing to review yet — <a href="#/studio?room=${room.id}">submit the plan from the Design Studio</a> to start a review.</span></div>`;
}
function renderAside(S) {
  const room = roomById(S, S.roomId);
  const pc = computePlan(room, S.plans[room.id]);
  const pending = pendingReview(S, room.id);
  const latest = latestReview(S, room.id);
  const exc = exceptionsOf(pc);
  const who = pending ? `Reviewer · ${CURRENT_USER.name}` : latest && latest.reviewer ? `Reviewer · ${latest.reviewer}` : 'Reviewer · not yet assigned';
  const noted = S.acknowledged.has(room.id);
  return html`<aside class="rp-aside">
    <section class="rp-card" aria-label="Export">
      <span class="rp-eyebrow">Export</span>
      <div class="rp-scopes" role="group" aria-label="Report scope">${Object.entries(SCOPES).map(([key, s]) => html`<button type="button" class="rp-scope" data-scope="${key}" data-key="scope-${key}" aria-pressed="${S.scope === key}">${svg(22, s.icon)}<span class="rp-scope__title">${s.title}</span><span class="rp-scope__sub">${s.sub}</span></button>`)}</div>
      <div class="rp-export">
        <button type="button" class="btn btn--primary rp-btn rp-btn--lg" data-export="pdf" data-key="export-pdf">${svg(16, P.download, 2)}Download PDF</button>
        <div class="rp-grid2"><button type="button" class="btn rp-btn rp-btn--secondary" data-print data-key="print">${svg(16, P.print, 1.8)}Print</button><button type="button" class="btn rp-btn rp-btn--secondary" data-export="link" data-key="export-link">${svg(16, P.link, 1.8)}Share link</button></div>
      </div>
    </section>
    <section class="rp-card rp-card--review" aria-label="Review and approval">
      <div class="rp-review__head"><span class="rp-eyebrow">Review</span><span class="rp-review__who">${who}</span></div>
      <ol class="rp-steps" aria-label="Review progress">${renderSteps(room)}</ol>
      <div class="rp-exception ${exc.length ? '' : 'rp-exception--clear'}">
        ${exc.length
          ? exc.map((x) => html`<div class="rp-exception__item">${svg(18, P.warn, 2)}<span class="rp-exception__text"><span class="rp-exception__title">${x.title}</span><span class="rp-exception__sub">${x.sub}</span></span></div>`)
          : html`<div class="rp-exception__item">${svg(18, P.check, 2)}<span class="rp-exception__text"><span class="rp-exception__title">No guideline exceptions</span><span class="rp-exception__sub">Every recommendation sits within the current guideline</span></span></div>`}
        <label for="rv-note" class="sr-only">Rationale</label>
        <textarea id="rv-note" rows="2" placeholder="Rationale for the decision (recorded with the plan)" ${pending ? '' : raw('disabled')}>${S.note}</textarea>
        ${exc.length ? html`<div class="rp-grid2"><button type="button" class="btn rp-btn rp-btn--xs is-bold" data-ack data-key="ack" ${pending && !noted ? '' : raw('disabled')}>${noted ? 'Exception noted' : 'Approve exception'}</button><a class="btn rp-btn rp-btn--xs" href="#/studio?room=${room.id}">${exc.some((x) => x.code === 'P8') ? 'Swap species' : 'Revise in Studio'}</a></div>` : ''}
      </div>
      <div class="rp-checks">${checksOf(pc).map((c) => html`<span class="rp-check rp-check--${c.tone}">${c.tone === 'ok' ? svg(16, P.check, 2.4) : c.tone === 'warn' ? svg(16, P.clock, 2.2) : svg(16, P.warn, 2.2)}${c.text}</span>`)}</div>
      ${pending
        ? html`<div class="rp-actions"><button type="button" class="btn btn--primary rp-btn rp-btn--lg" data-decide="approved" data-key="approve">${svg(16, P.check, 2.4)}Approve plan</button><button type="button" class="btn rp-btn rp-btn--lg" data-decide="changes" data-key="return">Return with notes</button></div>`
        : decisionBlock(S, room, latest)}
    </section>
  </aside>`;
}

/* ---------- Queue ---------- */
function queueItems(S) {
  const items = [];
  S.reviews.forEach((v) => { const room = roomById(S, v.roomId); if (room) items.push({ kind: v.status, room, review: v, at: v.decidedAt || v.submittedAt }); });
  S.rooms.filter((r) => r.status === 'draft' && !S.reviews.some((v) => v.roomId === r.id && v.status === 'pending')).forEach((r) => items.push({ kind: 'draft', room: r, review: null, at: r.updatedAt }));
  const order = { pending: 0, draft: 1, changes: 2, approved: 3 };
  return items.sort((a, b) => ((order[a.kind] ?? 9) - (order[b.kind] ?? 9)) || (b.at - a.at));
}
function renderQueue(S, { reveal = false } = {}) {
  const items = queueItems(S);
  if (!items.length) return emptyState('Nothing in the queue', 'Plans submitted from the Design Studio appear here for review.', html`<a class="btn btn--sm" href="#/studio">Open the Studio</a>`);
  return html`<div class="rp-queue__grid">${items.map((it, i) => {
    const pc = computePlan(it.room, S.plans[it.room.id]);
    const n = pc.exceptionCount; const exc = n ? `${n} exception${n === 1 ? '' : 's'}` : 'No exceptions';
    const sub = it.kind === 'pending' ? `${exc} · submitted ${fmt.date(it.review.submittedAt)}`
      : it.kind === 'approved' ? `Approved ${fmt.date(it.review.decidedAt)} · scheduled`
      : it.kind === 'changes' ? `Returned ${fmt.date(it.review.decidedAt)}${it.review.note ? ' · ' + it.review.note : ''}`
      : `${exc} · not yet submitted · edited ${fmt.ago(it.room.updatedAt)}`;
    const st = it.review ? (REVIEW_STATUS[it.review.status] || REVIEW_STATUS.pending) : ROOM_STATUS.draft;
    const ic = it.kind === 'pending' ? svg(18, P.clock, 1.8) : it.kind === 'approved' ? svg(18, P.check, 2.4) : svg(18, P.pencil, 1.8);
    return html`<button type="button" class="rp-qitem" data-queue="${it.room.id}" data-key="queue-${it.room.id}-${it.kind}" aria-current="${it.room.id === S.roomId}" title="Preview ${it.room.name}" ${reveal ? raw(`data-reveal style="--i:${i}"`) : ''}><span class="rp-qitem__icon rp-qitem__icon--${it.kind}">${ic}</span><span class="rp-qitem__text"><span class="rp-qitem__name">${it.room.name} · ${versionOf(S, it.room)}</span><span class="rp-qitem__sub">${sub}</span></span><span class="${st.pill}">${st.label}</span></button>`;
  })}</div>`;
}

/* ---------- Page ---------- */
export default async function page(ctx) {
  await loadStyle(new URL('./reports.css', import.meta.url));
  const [rooms, reviews, settings] = await Promise.all([api.getRooms(), api.getReviews(), api.getSettings()]);
  const plans = Object.fromEntries(await Promise.all(rooms.map(async (r) => [r.id, await api.getPlan(r.id)])));
  if (!rooms.length) return html`<div class="page">${emptyState('No classrooms yet', 'Add a classroom in the library to start a plan.', html`<a class="btn btn--sm" href="#/">Classroom Library</a>`)}</div>`;
  const wanted = ctx.query.get('room') || store.get().ui.activeRoomId;
  const S = { rooms, reviews, plans, settings, roomId: rooms.some((r) => r.id === wanted) ? wanted : rooms[0].id, scope: 'detailed', note: '', photos: {}, acknowledged: new Set() };

  const el = html`<div class="page rp-page">
    <section class="page-intro" aria-label="Introduction" data-reveal>
      <div class="page-intro__text"><h2 class="display">Share the case. Record the decision.</h2><p class="lead">A stakeholder-ready proposal, and the review that approves it.</p></div>
      <div class="rp-controls"><label for="r-room" class="sr-only">Classroom plan</label><select id="r-room" class="rp-select" data-room></select></div>
    </section>
    <div class="rp-layout" data-reveal style="--i:1"><div style="display:contents" data-preview></div><div style="display:contents" data-aside></div></div>
    <section class="rp-queue" aria-label="Review queue" data-reveal style="--i:2"><h3 class="rp-queue__title">Queue</h3><div data-queue></div></section>
    <input type="file" accept="image/*" hidden data-file>
  </div>`;

  const selectEl = $('[data-room]', el), previewHost = $('[data-preview]', el), asideHost = $('[data-aside]', el), queueHost = $('[data-queue]', el), fileInput = $('[data-file]', el);
  const fillSelect = () => selectEl.replaceChildren(...S.rooms.map((r) => html`<option value="${r.id}" ${r.id === S.roomId ? raw('selected') : ''}>${r.name} · ${versionOf(S, r)}</option>`));
  const refresh = () => { const s = store.get(); S.rooms = s.rooms; S.reviews = s.reviews; S.settings = s.settings; S.plans = { ...S.plans, ...s.plans }; };
  const renderMain = (swap = true) => {
    const p = renderPreview(S), a = renderAside(S);
    if (swap) { p.classList.add('fade-swap'); a.classList.add('fade-swap'); }
    patch(previewHost, p); patch(asideHost, a);
  };
  const renderAll = (first = false) => { renderMain(!first); patch(queueHost, renderQueue(S, { reveal: first })); fillSelect(); };
  renderAll(true);

  const selectRoom = (id) => { if (!roomById(S, id) || id === S.roomId) return; S.roomId = id; S.note = ''; api.setUi({ activeRoomId: id }); renderAll(); };
  selectEl.addEventListener('change', () => selectRoom(selectEl.value));
  on(el, 'click', '[data-queue]', (e, btn) => { selectRoom(btn.dataset.queue); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  on(el, 'click', '[data-scope]', (e, btn) => { S.scope = btn.dataset.scope; $$('[data-scope]', el).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.scope === S.scope))); });
  on(el, 'input', '#rv-note', (e, ta) => { S.note = ta.value; });
  on(el, 'click', '[data-ack]', () => { S.acknowledged.add(S.roomId); toast('Exception noted — record the rationale, then approve or return the plan', { kind: 'info' }); renderMain(false); });
  on(el, 'click', '[data-print]', () => window.print());

  // Photo slots: a local preview only (nothing is uploaded).
  on(el, 'click', '[data-photo]', (e, btn) => { fileInput.dataset.slot = btn.dataset.photo; fileInput.value = ''; fileInput.click(); });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0]; if (!file) return;
    const url = URL.createObjectURL(file);
    S.photos[S.roomId] = { ...(S.photos[S.roomId] || {}), [fileInput.dataset.slot]: url };
    patch(previewHost, renderPreview(S));
    toast(`${fileInput.dataset.slot === 'before' ? 'Before' : 'Proposed'} photo added to the preview (this session only)`);
  });
  ctx.onCleanup(() => Object.values(S.photos).forEach((p) => Object.values(p).forEach((u) => URL.revokeObjectURL(u))));

  // Export: the "PDF" is a printable HTML summary of the plan, downloaded under the export's filename.
  on(el, 'click', '[data-export="pdf"]', async (e, btn) => {
    const room = roomById(S, S.roomId); const pc = computePlan(room, S.plans[room.id]);
    try {
      const res = await withSpinner(btn, async () => {
        const r = await api.exportReport(room.id, 'pdf');
        const blob = new Blob([reportHtml(S, room, pc)], { type: 'text/html;charset=utf-8' });
        const filename = r.filename.replace(/\.pdf$/i, '.html');
        downloadBlob(blob, filename);
        return { filename, size: fmtBytes(blob.size) };
      }, { busyLabel: 'Preparing…', doneLabel: 'Ready' });
      if (res) toast(`${SCOPES[S.scope].title} downloaded · ${res.filename} (${res.size}) — open it and print to PDF`);
    } catch (err) { console.error(err); toast('The report could not be prepared', { kind: 'error' }); }
  });
  on(el, 'click', '[data-export="link"]', async (e, btn) => {
    const room = roomById(S, S.roomId);
    const url = `${location.origin}${location.pathname}#/reports?room=${encodeURIComponent(room.id)}`;
    try {
      const copied = await withSpinner(btn, async () => { await api.exportReport(room.id, 'link'); try { await navigator.clipboard.writeText(url); return true; } catch { return false; } }, { busyLabel: 'Preparing…', doneLabel: 'Ready' });
      if (copied) toast('Share link copied to the clipboard');
      else if (copied === false) toast('Share link ready', { kind: 'info', action: { label: 'Copy', onClick: () => window.prompt('Copy the share link', url) } });
    } catch (err) { console.error(err); toast('The link could not be prepared', { kind: 'error' }); }
  });

  // Reviewer decision on the pending review of the previewed room.
  on(el, 'click', '[data-decide]', async (e, btn) => {
    const decision = btn.dataset.decide;
    const review = pendingReview(S, S.roomId); const room = roomById(S, S.roomId);
    if (!review) return;
    const note = S.note.trim();
    if (decision === 'changes' && !note) { toast('Add a note for the designer before returning the plan', { kind: 'info' }); const ta = $('#rv-note', el); if (ta) ta.focus(); return; }
    try {
      await withSpinner(btn, () => api.decideReview(review.id, decision, note), { busyLabel: decision === 'approved' ? 'Approving…' : 'Returning…', doneLabel: decision === 'approved' ? 'Approved' : 'Returned' });
      refresh(); S.note = ''; S.acknowledged.delete(S.roomId);
      toast(decision === 'approved' ? `${room.name} approved — recorded with the plan` : `${room.name} returned with notes`, { kind: decision === 'approved' ? 'success' : 'info' });
      renderAll();
    } catch (err) { console.error(err); toast(err && err.message ? err.message : 'The decision could not be saved', { kind: 'error' }); }
  });
  return el;
}

// Energy & Savings — "The financial case". Ports the calculator from design/Energy.dc.html.
// The active classroom's saved plan seeds the lighting / planting assumptions (so at the
// defaults `invest === computePlan().lightCost` and the numbers agree with the Studio); every
// input is live and updates the bound output nodes in place; hours and tariff persist to
// settings so Studio / Reports reuse them. Other classrooms are modelled with computePlan.
import { html, raw, $, $$, on, fmt } from '../lib/dom.js';
import { api } from '../lib/api.js';
import { store } from '../lib/store.js';
import { computePlan, DEFAULT_HOURS, DEFAULT_TARIFF } from '../lib/plan.js';
import { loadStyle, whenVisible, countUp, withSpinner, toast, sk } from '../lib/loading.js';
import { emptyState } from '../components/ui.js';

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const word = (n) => WORDS[n] ?? String(n);
// 'sr01' → 'SR-01', 'clb04' → 'CL-B04', 'rm-abc123' → 'RM-ABC123'
const code = (id) => id.slice(0, 2).toUpperCase() + '-' + id.slice(2).replace(/^-/, '').toUpperCase();
const money = (n) => (n < 0 ? '−A$' : 'A$') + fmt.int(Math.abs(n));
const pb = (y) => (y === null ? 'Not reached' : y > 50 ? 'Over 50 years' : y.toFixed(1) + ' years');
const signedPct = (x) => (x >= 0 ? '−' : '+') + Math.abs(x).toFixed(0) + '%';
const sum = (arr, k) => arr.reduce((a, r) => a + r[k], 0);

const OPTIONAL = new Set(['baseline', 'tubeCost', 'tubeLife']);     // 0 = "not known": show the placeholder
const SETTINGS_KEYS = new Set(['hDay', 'dWeek', 'weeks', 'tariff']); // persisted via api.updateSettings
const FORMATS = { headPaybackText: (v) => v.toFixed(1) + ' years', portfolioReductionText: (v) => signedPct(v) };
const GLOBAL_DEFAULTS = { esc: 0, ctrlPct: 0, tubeCost: 0, tubeLife: 0, period: 10, waterFreq: 2, litres: 2, waterTariff: 2.5, maintHours: 1, maintRate: 45, replaceCost: 120, baseline: 0 };

// Split annual operating hours into the artboard's h/day × days/wk × weeks (2000 → 10 × 5 × 40).
function splitHours(hours) {
  const h = Math.max(0, Number(hours) || 0);
  for (const hDay of [10, 8, 9, 11, 12, 7, 6, 13, 14]) {
    const weeks = h / (hDay * 5);
    if (Number.isInteger(weeks) && weeks <= 52) return { hDay, dWeek: 5, weeks };
  }
  return { hDay: Math.round(h / 200 * 10) / 10, dWeek: 5, weeks: 40 };
}

// Room-specific assumptions derived from the saved plan. Chosen so the lighting investment
// equals computePlan().lightCost (12 × 180 + 1,200 + 600 = 12 × 280 + 400 + 200 for SR-01).
function roomDefaults(room, plan) {
  const cp = computePlan(room, plan);
  const c = room.cond; const fluorescent = c.lighting === 'fluorescent';
  return {
    lampW: fluorescent ? 36 : cp.existingPer, ballastW: fluorescent ? 10 : 0, fittings: cp.fittingsN, lamps: fluorescent ? 2 : 1,
    ledW: cp.replace ? 32 : cp.existingPer, ledQty: cp.fittingsN, ledUnit: cp.replace ? 180 : 0,
    install: (cp.replace ? cp.fittingsN * 100 : 0) + cp.glareCost,
    controls: cp.replace ? (cp.plan.dimming ? 400 : 0) + (cp.plan.zones > 1 ? 200 : 0) : (c.lighting === 'ledfixed' && cp.plan.dimming ? 1900 : 0),
    plants: cp.plan.plantCount
  };
}

const rowLabel = (fluorescent, ctrlRoom, pct) => fluorescent ? 'Fluorescent → LED' : ctrlRoom ? 'LED + controls · ' + (pct > 0 ? pct + '% assumed' : 'no reduction entered') : 'Existing LED retained';

export default async function page(ctx) {
  await loadStyle(new URL('./energy.css', import.meta.url));
  const [rooms, settings] = await Promise.all([api.getRooms(), api.getSettings()]);
  if (!rooms.length) {
    return html`<div class="page en-page">${emptyState('No classrooms yet', 'Add a classroom in the library to model its energy case.', html`<a class="btn btn--primary btn--md" href="#/">Go to the library</a>`)}</div>`;
  }
  const plans = {};
  await Promise.all(rooms.map(async (r) => { plans[r.id] = await api.getPlan(r.id); }));

  const wanted = ctx.query.get('room') || store.get().ui.activeRoomId;
  let activeId = rooms.some((r) => r.id === wanted) ? wanted : rooms[0].id;
  if (activeId !== store.get().ui.activeRoomId) api.setUi({ activeRoomId: activeId });
  const active = () => rooms.find((r) => r.id === activeId);

  // ---------- state (flat, like the artboard's component state) ----------
  const S = { ...GLOBAL_DEFAULTS, ...splitHours(settings.hours ?? DEFAULT_HOURS), tariff: Number(settings.tariff ?? DEFAULT_TARIFF), scope: 'room', ...roomDefaults(active(), plans[activeId]) };
  const inputVal = (k) => (OPTIONAL.has(k) && !S[k] ? '' : String(S[k]));

  // ---------- model: port of the artboard's renderVals(), generalised to every room ----------
  function calc() {
    const s = S; const room = active(); const cp = computePlan(room, plans[room.id], { tariff: s.tariff });
    const fluorescent = room.cond.lighting === 'fluorescent';
    const hours = s.hDay * s.dWeek * s.weeks;
    const existingW = s.fittings * (s.lamps * s.lampW + s.ballastW);
    const ledWTotal = s.ledQty * s.ledW;
    const existingKwh = existingW / 1000 * hours;
    const ledKwh = ledWTotal / 1000 * hours;
    const ctrlKwh = ledKwh * (1 - s.ctrlPct / 100);
    const existingCost = existingKwh * s.tariff, ledCost = ledKwh * s.tariff, ctrlCost = ctrlKwh * s.tariff;
    const savingKwh = existingKwh - ledKwh, savingCost = existingCost - ledCost, ctrlSaving = existingCost - ctrlCost;
    const reduction = existingKwh > 0 ? savingKwh / existingKwh * 100 : 0;
    const ctrlReduction = existingKwh > 0 ? (existingKwh - ctrlKwh) / existingKwh * 100 : 0;
    const useCtrl = s.ctrlPct > 0;
    const annualEnergySaving = useCtrl ? ctrlSaving : savingCost;

    const invest = s.ledQty * s.ledUnit + s.install + s.controls;
    const plantsInvest = s.plants * 120;
    const paintInvest = cp.paintCost;                       // artboard: 60 m² × A$18 for SR-01
    const totalInvest = invest + plantsInvest + paintInvest;

    const maintModelled = s.tubeCost > 0 && s.tubeLife > 0;
    const maintSaving = maintModelled ? s.fittings * s.lamps * s.tubeCost / s.tubeLife : 0;

    const waterL = s.plants * s.litres * s.waterFreq * 12;
    const waterCost = waterL / 1000 * s.waterTariff;
    const upkeep = s.maintHours * 12 * s.maintRate + s.replaceCost + waterCost;
    const waterSavingL = s.baseline > 0 ? s.baseline - waterL : null;

    const netAnnual = annualEnergySaving + maintSaving - upkeep;
    const period = Number(s.period) || 10;
    const e = s.esc / 100;
    let cum = 0, netCum = 0, cumFactor = 0;
    const years = [];
    for (let y = 1; y <= period; y++) {
      const f = Math.pow(1 + e, y - 1);
      cumFactor += f;
      cum += annualEnergySaving * f;
      netCum += (annualEnergySaving + maintSaving) * f - upkeep;
      years.push({ n: y, value: cum });
    }
    const maxY = Math.max(cum, invest, 1);
    years.forEach((yr) => { yr.pct = Math.max(2, yr.value / maxY * 100); yr.label = yr.value >= 1000 ? (yr.value / 1000).toFixed(1) + 'K' : fmt.int(yr.value); });
    const investLinePct = Math.min(98, invest / maxY * 100);
    const payback = annualEnergySaving > 0 ? invest / annualEnergySaving : null;
    const paybackAll = netAnnual > 0 ? totalInvest / netAnnual : null;
    const crossYear = years.find((yr) => yr.value >= invest);
    const netBenefit = netCum - totalInvest;
    const escText = s.esc > 0 ? s.esc + '% annual tariff escalation' : 'no tariff escalation';

    // Portfolio: the active room comes from the calculator above; every other room from its
    // saved plan (or the defaults) at this page's hours and tariff. A controls-retrofit room
    // gets only the control saving % entered here — nothing is added automatically.
    const rows = rooms.map((r) => {
      if (r.id === room.id) {
        const ctrlRoom = !fluorescent && (useCtrl || (room.cond.lighting === 'ledfixed' && cp.plan.dimming));
        return { id: r.id, name: r.name, existingKwh, proposedKwh: useCtrl ? ctrlKwh : ledKwh, existingCost, proposedCost: useCtrl ? ctrlCost : ledCost, saving: annualEnergySaving, total: totalInvest, lightInvest: invest, label: rowLabel(fluorescent, ctrlRoom, s.ctrlPct) };
      }
      const c = computePlan(r, plans[r.id], { hours, tariff: s.tariff });
      const ctrlRoom = !c.replace && r.cond.lighting === 'ledfixed' && c.plan.dimming;
      const proposedKwh = ctrlRoom ? c.proposedKwh * (1 - s.ctrlPct / 100) : c.proposedKwh;
      const eCost = c.existingKwh * s.tariff, pCost = proposedKwh * s.tariff;
      return { id: r.id, name: r.name, existingKwh: c.existingKwh, proposedKwh, existingCost: eCost, proposedCost: pCost, saving: eCost - pCost, total: c.total, lightInvest: c.lightCost, label: rowLabel(c.replace, ctrlRoom, s.ctrlPct) };
    });
    const maxClass = Math.max(1, ...rows.map((r) => r.existingKwh));
    const pExisting = sum(rows, 'existingKwh');
    const pSavingKwh = rows.reduce((a, r) => a + r.existingKwh - r.proposedKwh, 0);
    const pSavingCost = sum(rows, 'saving');
    const pInvest = sum(rows, 'total');
    const pLight = sum(rows, 'lightInvest');
    const pCum = pSavingCost * cumFactor;
    const pReduction = pExisting > 0 ? pSavingKwh / pExisting * 100 : 0;

    // Headline figures follow the Scope select: this classroom, or the whole portfolio.
    const h = s.scope === 'portfolio'
      ? { kwh: pSavingKwh, red: pReduction, cost: pSavingCost, cum: pCum, invest: pLight, payback: pSavingCost > 0 ? pLight / pSavingCost : null }
      : { kwh: useCtrl ? existingKwh - ctrlKwh : savingKwh, red: useCtrl ? ctrlReduction : reduction, cost: annualEnergySaving, cum, invest, payback };
    const rc = code(room.id);

    const v = {
      years, investLinePct, rows,
      // headline
      headSavingKwhText: fmt.int(h.kwh), headSavingKwhTextN: h.kwh,
      headReductionText: signedPct(h.red),
      headSavingCostText: fmt.int(h.cost), headSavingCostTextN: h.cost,
      tariffText: String(s.tariff),
      periodLabel: period + '-year projected energy saving',
      headCumText: fmt.int(h.cum), headCumTextN: h.cum,
      escText,
      headPaybackText: pb(h.payback), headPaybackTextN: h.payback !== null && h.payback <= 50 ? h.payback : undefined,
      headInvestText: fmt.int(h.invest),
      headPaybackNote: h.payback === null ? 'no saving modelled' : h.payback > period ? 'beyond the ' + period + '-year period' : 'within the period',
      verifiedFor: 'none yet for ' + rc,
      // calculator
      hoursText: fmt.int(hours),
      existingLabel: fluorescent ? 'Existing fluorescent' : 'Existing LED',
      existingRow: (fluorescent ? 'Existing fluorescent' : 'Existing LED') + ' · ' + s.fittings + ' × ' + s.lamps + ' × ' + s.lampW + ' W + ' + s.ballastW + ' W ballast',
      ledRow: 'Proposed LED · ' + s.ledQty + ' × ' + s.ledW + ' W',
      ctrlRow: 'Proposed LED + controls · ' + (useCtrl ? s.ctrlPct + '% assumed reduction' : 'no reduction entered'),
      existingWText: fmt.int(existingW), ledWText: fmt.int(ledWTotal),
      existingKwhText: fmt.int(existingKwh), ledKwhText: fmt.int(ledKwh), ctrlKwhText: useCtrl ? fmt.int(ctrlKwh) + ' kWh' : 'Not modelled',
      existingCostText: fmt.int(existingCost), ledCostText: fmt.int(ledCost), ctrlCostText: useCtrl ? 'A$' + fmt.int(ctrlCost) : 'Not modelled',
      fullPct: 100,
      ledPct: existingKwh > 0 ? Math.max(0, Math.min(100, ledKwh / existingKwh * 100)) : 0,
      ctrlPctBar: useCtrl && existingKwh > 0 ? Math.max(0, Math.min(100, ctrlKwh / existingKwh * 100)) : 0,
      savingCostText: fmt.int(annualEnergySaving),
      reductionText: signedPct(reduction),
      ctrlReductionText: useCtrl ? '−' + ctrlReduction.toFixed(0) + '%' : '—',
      ctrlSavingText: useCtrl ? 'A$' + fmt.int(ctrlSaving) : '—',
      // chart
      chartSub: 'Proposed LED scenario · ' + period + ' years · ' + escText,
      investText: fmt.int(invest),
      crossNote: crossYear
        ? 'Cumulative energy savings pass the lighting investment in year ' + crossYear.n + '. Plants and colour are not included in this chart because they produce no modelled energy saving.'
        : 'Cumulative energy savings do not reach the lighting investment of A$' + fmt.int(invest) + ' within ' + period + ' years. This is shown as modelled; the plan’s case rests on lighting quality, inclusion and maintenance benefits that are not monetised here.',
      // classrooms
      roomsSub: 'Portfolio of the ' + word(rows.length) + ' current plans · ' + rc + ' updates with this page’s assumptions',
      portfolioReductionText: signedPct(pReduction), portfolioReductionTextN: pReduction,
      portfolioSavingKwhText: fmt.int(pSavingKwh), portfolioExistingText: fmt.int(pExisting),
      portfolioInvestText: fmt.int(pInvest), portfolioInvestTextN: pInvest,
      portfolioPlansText: rows.length + ' plans · lighting, plants and colour',
      portfolioCumLabel: 'Portfolio ' + period + '-year energy saving',
      portfolioCumText: fmt.int(pCum), portfolioCumTextN: pCum,
      portfolioCumNote: pCum >= pInvest ? 'Recovers the investment on energy alone' : 'Does not recover the investment on energy alone',
      // plants, water, maintenance
      waterLText: fmt.int(waterL), waterCostText: waterCost.toFixed(2), upkeepText: fmt.int(upkeep),
      waterSavingText: waterSavingL === null ? 'Not claimed' : (waterSavingL >= 0 ? '−' : '+') + fmt.int(Math.abs(waterSavingL)) + ' L/yr',
      waterSavingNote: waterSavingL === null ? 'no existing baseline recorded' : 'against the recorded baseline · modelled',
      // assumptions + ROI
      assumptionsTitle: 'Assumptions · ' + room.name,
      roiTitle: 'ROI and payback · ' + period + ' years',
      totalInvestText: fmt.int(totalInvest),
      maintSavingText: maintModelled ? 'A$' + fmt.int(maintSaving) : 'Not modelled',
      netAnnualText: money(netAnnual),
      cumLabel: 'Cumulative over ' + period + ' years',
      netCumText: money(netCum), netBenefitText: money(netBenefit), paybackAllText: pb(paybackAll),
      roiNote: netBenefit >= 0
        ? 'The plan recovers its cost within the period on the modelled figures.'
        : 'On the modelled figures the plan does not recover its A$' + fmt.int(totalInvest) + ' cost within ' + period + ' years. The shortfall is shown rather than offset by unmeasured wellbeing or retention benefits.'
    };
    rows.forEach((r) => {
      v['row.' + r.id + '.label'] = r.label;
      v['row.' + r.id + '.ePct'] = r.existingKwh / maxClass * 100;
      v['row.' + r.id + '.pPct'] = Math.min(100, r.proposedKwh / maxClass * 100);
      v['row.' + r.id + '.kwh'] = fmt.int(r.existingKwh) + ' → ' + fmt.int(r.proposedKwh) + ' kWh';
      v['row.' + r.id + '.cost'] = Math.abs(r.existingKwh - r.proposedKwh) < 0.5 ? 'No lighting change modelled' : 'A$' + fmt.int(r.existingCost) + ' → A$' + fmt.int(r.proposedCost);
    });
    return v;
  }

  // ---------- markup ----------
  const field = (id, k, label, o = {}) => html`<div class="en-field"><label for="${id}" class="en-field__label ${o.tag ? 'en-field__label--split' : ''}">${o.tag ? html`<span>${label}</span><span class="en-minitag ${o.tag === 'Assumed' ? 'en-minitag--assumed' : 'en-minitag--entered'}">${o.tag}</span>` : label}</label><input id="${id}" class="en-input ${o.assumed ? 'en-input--assumed' : ''}" type="number" min="0" ${o.max != null ? raw(`max="${o.max}"`) : ''} ${o.step ? raw(`step="${o.step}"`) : ''} placeholder="${o.placeholder || ''}" inputmode="decimal" data-k="${k}" value="${inputVal(k)}"></div>`;

  const el = html`<div class="page en-page">
    <div class="en-intro">
      <div class="en-intro__text"><h2 class="display">The financial case</h2><p class="lead">Change an assumption on the right; everything recalculates.</p></div>
      <div class="en-controls">
        <div class="en-field"><label for="e-scope" class="en-field__label">Scope</label><select id="e-scope" class="en-select en-select--bold" data-scope>${rooms.map((r) => html`<option value="${r.id}">${r.name} · ${code(r.id)}</option>`)}<option value="portfolio">Portfolio · all plans</option></select></div>
        <div class="en-field"><label for="e-period" class="en-field__label">Projection period</label><select id="e-period" class="en-select" data-period><option value="5">5 years</option><option value="10">10 years</option><option value="15">15 years</option></select></div>
        <button type="button" class="btn en-reset" data-reset>Reset assumptions</button>
      </div>
    </div>

    <div class="en-legend">
      <span class="en-legend__pill"><span class="en-dot en-c-deep"></span><span><strong>Verified</strong> · measured with actual data · <span data-out="verifiedFor"></span></span></span>
      <span class="en-legend__pill"><span class="en-dot en-c-accent"></span><span><strong>Modelled</strong> · calculated from the recorded assumptions below</span></span>
      <span class="en-legend__pill"><span class="en-dot en-c-potential"></span><span><strong>Potential</strong> · qualitative, not monetised or measured</span></span>
    </div>

    <section class="en-stats" aria-label="Headline figures" data-reveal>
      <div class="en-stat"><span class="en-stat__label">Annual consumption reduction</span><span class="en-stat__value"><span data-out="headSavingKwhText" data-count></span> kWh</span><span class="en-stat__sub"><span data-out="headReductionText"></span> · modelled</span></div>
      <div class="en-stat"><span class="en-stat__label">Annual energy-cost saving</span><span class="en-stat__value">A$<span data-out="headSavingCostText" data-count></span></span><span class="en-stat__sub">at A$<span data-out="tariffText"></span>/kWh · modelled</span></div>
      <div class="en-stat"><span class="en-stat__label" data-out="periodLabel"></span><span class="en-stat__value">A$<span data-out="headCumText" data-count></span></span><span class="en-stat__sub"><span data-out="escText"></span> · modelled</span></div>
      <div class="en-stat"><span class="en-stat__label">Payback on lighting investment</span><span class="en-stat__value" data-out="headPaybackText" data-count></span><span class="en-stat__sub">A$<span data-out="headInvestText"></span> lighting cost · <span data-out="headPaybackNote"></span></span></div>
    </section>

    <div class="en-cols">
      <div class="en-main">

        <section class="en-card en-card--calc" aria-label="Lighting energy calculator" data-reveal style="--i:1">
          <div class="en-head">
            <div class="en-head__text"><h3 class="en-h3">Lighting energy calculator</h3><span class="en-sub">Annual kWh = installed watts ÷ 1000 × annual operating hours · <span data-out="hoursText"></span> h/yr</span></div>
            <div class="en-keys"><span class="en-key"><span class="en-sq en-c-primary"></span><span data-out="existingLabel"></span></span><span class="en-key"><span class="en-sq en-c-accent"></span>Proposed LED</span><span class="en-key"><span class="en-sq en-c-soft"></span>LED + controls</span></div>
          </div>
          <div class="en-bars">
            <div class="en-bars__group">
              <span class="en-bars__title">Annual electricity consumption</span>
              <div class="en-brow"><span class="en-brow__label">Existing</span><div class="en-track"><div class="en-fill en-fill--existing" data-w="fullPct" style="width:0%"></div></div><span class="en-brow__val"><span data-out="existingKwhText"></span> kWh</span></div>
              <div class="en-brow"><span class="en-brow__label">Proposed LED</span><div class="en-track"><div class="en-fill en-fill--led" data-w="ledPct" style="width:0%"></div></div><span class="en-brow__val"><span data-out="ledKwhText"></span> kWh</span></div>
              <div class="en-brow"><span class="en-brow__label">LED + controls</span><div class="en-track"><div class="en-fill en-fill--ctrl" data-w="ctrlPctBar" style="width:0%"></div></div><span class="en-brow__val" data-out="ctrlKwhText"></span></div>
            </div>
            <div class="en-bars__group">
              <span class="en-bars__title">Annual electricity cost</span>
              <div class="en-brow"><span class="en-brow__label">Existing</span><div class="en-track"><div class="en-fill en-fill--existing" data-w="fullPct" style="width:0%"></div></div><span class="en-brow__val">A$<span data-out="existingCostText"></span></span></div>
              <div class="en-brow"><span class="en-brow__label">Proposed LED</span><div class="en-track"><div class="en-fill en-fill--led" data-w="ledPct" style="width:0%"></div></div><span class="en-brow__val">A$<span data-out="ledCostText"></span></span></div>
              <div class="en-brow"><span class="en-brow__label">LED + controls</span><div class="en-track"><div class="en-fill en-fill--ctrl" data-w="ctrlPctBar" style="width:0%"></div></div><span class="en-brow__val" data-out="ctrlCostText"></span></div>
            </div>
          </div>
          <div class="en-table-wrap">
            <table class="en-table">
              <thead><tr><th>Scenario</th><th>Installed power</th><th>Annual kWh</th><th>Annual cost</th><th>Reduction</th><th>Saving / yr</th></tr></thead>
              <tbody>
                <tr><td data-out="existingRow"></td><td><span data-out="existingWText"></span> W</td><td data-out="existingKwhText"></td><td>A$<span data-out="existingCostText"></span></td><td>—</td><td>—</td></tr>
                <tr><td data-out="ledRow"></td><td><span data-out="ledWText"></span> W</td><td data-out="ledKwhText"></td><td>A$<span data-out="ledCostText"></span></td><td data-out="reductionText"></td><td><strong>A$<span data-out="savingCostText"></span></strong></td></tr>
                <tr><td data-out="ctrlRow"></td><td><span data-out="ledWText"></span> W</td><td data-out="ctrlKwhText"></td><td data-out="ctrlCostText"></td><td data-out="ctrlReductionText"></td><td data-out="ctrlSavingText"></td></tr>
              </tbody>
            </table>
          </div>
          <p class="en-note">Controls saving is only what you enter — nothing is added automatically.</p>
        </section>

        <section class="en-card" aria-label="Savings over time" data-reveal style="--i:2" data-chart-section>
          <div class="en-head">
            <div class="en-head__text"><h3 class="en-h3">Cumulative energy-cost savings against lighting investment</h3><span class="en-sub" data-out="chartSub"></span></div>
            <div class="en-keys"><span class="en-key"><span class="en-sq en-c-accent"></span>Cumulative saving</span><span class="en-key"><span class="en-line"></span><span>Lighting investment A$<span data-out="investText"></span></span></span></div>
          </div>
          <div class="en-chart-host" data-chart-host>${raw(sk('100%', '200px', 12))}${raw(sk('100%', '16px', 6))}</div>
          <p class="en-note" data-out="crossNote"></p>
        </section>

        <section class="en-card" aria-label="Consumption and cost by classroom" data-reveal style="--i:3" data-rooms-section>
          <div class="en-head">
            <div class="en-head__text"><h3 class="en-h3">Consumption and cost by classroom</h3><span class="en-sub" data-out="roomsSub"></span></div>
            <div class="en-keys"><span class="en-key"><span class="en-sq en-c-primary"></span>Existing kWh/yr</span><span class="en-key"><span class="en-sq en-c-accent"></span>Proposed kWh/yr</span></div>
          </div>
          <div class="en-chips" role="group" aria-label="Classroom to model">${rooms.map((r) => html`<button type="button" class="chip chip--sm" data-chip="${r.id}" aria-pressed="${r.id === activeId}">${r.name}</button>`)}</div>
          <div class="en-rooms" data-rooms aria-busy="true">${raw(rooms.map(() => sk('100%', '30px', 6)).join(''))}</div>
          <div class="en-foot">
            <div class="en-foot__item"><span class="en-foot__label">Portfolio projected reduction</span><span class="en-foot__value" data-out="portfolioReductionText" data-count></span><span class="en-foot__sub"><span data-out="portfolioSavingKwhText"></span> kWh of <span data-out="portfolioExistingText"></span> kWh · modelled</span></div>
            <div class="en-foot__item"><span class="en-foot__label">Portfolio investment</span><span class="en-foot__value">A$<span data-out="portfolioInvestText" data-count></span></span><span class="en-foot__sub" data-out="portfolioPlansText"></span></div>
            <div class="en-foot__item"><span class="en-foot__label" data-out="portfolioCumLabel"></span><span class="en-foot__value">A$<span data-out="portfolioCumText" data-count></span></span><span class="en-foot__sub" data-out="portfolioCumNote"></span></div>
          </div>
        </section>

        <section class="en-card" aria-label="Plants and water" data-reveal style="--i:4">
          <div class="en-head__text"><h3 class="en-h3">Plants, water and maintenance</h3><span class="en-sub">Operating costs of the proposed planting · savings are shown only against a recorded baseline</span></div>
          <div class="en-inputs">
            ${field('w-plants', 'plants', 'Plants')}
            ${field('w-freq', 'waterFreq', 'Top-ups per month')}
            ${field('w-litres', 'litres', 'Litres per plant per top-up', { step: '0.5' })}
            ${field('w-tariff', 'waterTariff', 'Water tariff A$/kL', { step: '0.1' })}
            ${field('w-hours', 'maintHours', 'Maintenance h/month', { step: '0.5' })}
            ${field('w-rate', 'maintRate', 'Labour A$/h')}
            ${field('w-replace', 'replaceCost', 'Plant replacement A$/yr')}
            ${field('w-base', 'baseline', 'Existing watering baseline L/yr', { placeholder: 'Not recorded' })}
          </div>
          <div class="en-foot">
            <div class="en-foot__item"><span class="en-foot__label">Estimated water use</span><span class="en-foot__value"><span data-out="waterLText"></span> L/yr</span><span class="en-foot__sub">A$<span data-out="waterCostText"></span>/yr · modelled</span></div>
            <div class="en-foot__item"><span class="en-foot__label">Plant upkeep cost</span><span class="en-foot__value">A$<span data-out="upkeepText"></span>/yr</span><span class="en-foot__sub">labour and replacement · modelled</span></div>
            <div class="en-foot__item"><span class="en-foot__label">Water saving</span><span class="en-foot__value" data-out="waterSavingText"></span><span class="en-foot__sub" data-out="waterSavingNote"></span></div>
          </div>
        </section>
      </div>

      <aside class="en-aside" aria-label="Assumptions">
        <form class="en-form" data-form data-reveal style="--i:1">
          <div class="en-form__head"><span class="en-form__title" data-out="assumptionsTitle"></span><span class="en-tag">Illustrative</span></div>
          <span class="en-form__h">Existing lighting</span>
          <div class="en-grid2">
            ${field('a-lampw', 'lampW', 'Lamp W')}
            ${field('a-ballast', 'ballastW', 'Ballast W', { tag: 'Assumed', assumed: true })}
            ${field('a-fittings', 'fittings', 'Fittings')}
            ${field('a-lamps', 'lamps', 'Lamps per fitting')}
          </div>
          <span class="en-form__h">Operating hours and tariff</span>
          <div class="en-grid3">
            ${field('a-hday', 'hDay', 'h/day', { max: 24, assumed: true })}
            ${field('a-dweek', 'dWeek', 'days/wk', { max: 7, assumed: true })}
            ${field('a-weeks', 'weeks', 'weeks', { max: 52, assumed: true })}
          </div>
          <div class="en-grid2">
            ${field('a-tariff', 'tariff', 'Tariff A$/kWh', { step: '0.01', tag: 'Entered' })}
            ${field('a-esc', 'esc', 'Escalation %/yr', { max: 20, step: '0.5' })}
          </div>
          <span class="en-note-sm">Enter the rate your energy team provides; the toolkit does not hold USYD’s actual tariff.</span>
          <span class="en-form__h">Proposed LED</span>
          <div class="en-grid2">
            ${field('a-ledw', 'ledW', 'Fitting W')}
            ${field('a-ledqty', 'ledQty', 'Quantity')}
            ${field('a-unit', 'ledUnit', 'Unit cost A$', { assumed: true })}
            ${field('a-install', 'install', 'Installation A$', { assumed: true })}
            ${field('a-controls', 'controls', 'Controls A$', { assumed: true })}
            ${field('a-ctrlpct', 'ctrlPct', 'Control saving %', { max: 60 })}
          </div>
          <span class="en-form__h">Maintenance · optional</span>
          <div class="en-grid2">
            ${field('a-tube', 'tubeCost', 'Tube replacement A$ each', { placeholder: 'Not known' })}
            ${field('a-life', 'tubeLife', 'Tube life · years', { step: '0.5', placeholder: 'Not known' })}
          </div>
          <span class="en-note-sm">Maintenance savings appear in the ROI panel only when both fields are filled.</span>
        </form>

        <section class="en-roi" aria-label="Return on investment and payback" data-reveal style="--i:2">
          <span class="en-roi__eyebrow" data-out="roiTitle"></span>
          <dl class="en-roi__list">
            <div class="en-roi__row"><dt>Initial intervention cost</dt><dd>A$<span data-out="totalInvestText"></span></dd></div>
            <div class="en-roi__row"><dt>Energy saving / yr · modelled</dt><dd>A$<span data-out="savingCostText"></span></dd></div>
            <div class="en-roi__row"><dt>Maintenance saving / yr</dt><dd data-out="maintSavingText"></dd></div>
            <div class="en-roi__row"><dt>Plant upkeep / yr · modelled cost</dt><dd>−A$<span data-out="upkeepText"></span></dd></div>
            <div class="en-roi__row en-roi__row--total"><dt>Net operating saving / yr</dt><dd class="bold" data-out="netAnnualText"></dd></div>
            <div class="en-roi__row"><dt data-out="cumLabel"></dt><dd data-out="netCumText"></dd></div>
            <div class="en-roi__row"><dt>Net financial benefit</dt><dd class="bold" data-out="netBenefitText"></dd></div>
            <div class="en-roi__row"><dt>Payback · whole plan</dt><dd class="bold" data-out="paybackAllText"></dd></div>
          </dl>
          <p class="en-roi__note" data-out="roiNote"></p>
        </section>
      </aside>
    </div>

    <p class="en-disclaimer">Modelled from the assumptions shown — not verified USYD savings or supplier quotes. Wellbeing is never given a dollar value.</p>
  </div>`;

  // ---------- bindings: outputs update in place, inputs are never re-rendered ----------
  const scopeSel = $('[data-scope]', el), periodSel = $('[data-period]', el);
  const host = $('[data-chart-host]', el), rowsEl = $('[data-rooms]', el);
  scopeSel.value = activeId; periodSel.value = String(S.period);
  let chart = null, yearsRow = null, line = null, lineLabel = null;
  let last = calc();
  let animUntil = 0, reapplyT = null;

  function applyText(v, animate = false) {
    $$('[data-out]', el).forEach((n) => {
      const key = n.dataset.out; if (!(key in v)) return;
      const num = v[key + 'N'];
      if (animate && n.hasAttribute('data-count') && typeof num === 'number') countUp(n, num, { format: FORMATS[key] || fmt.int });
      else if (n.textContent !== String(v[key])) n.textContent = v[key];
    });
  }
  function applyWidths(v) { $$('[data-w]', el).forEach((n) => { const key = n.dataset.w; if (key in v) n.style.width = v[key] + '%'; }); }
  function apply(v, animate = false) {
    applyText(v, animate); applyWidths(v); renderChart(v);
    if (animate) animUntil = performance.now() + 950;
  }
  function update(animate = false) {
    last = calc(); apply(last, animate);
    // A count-up still running would overwrite a live edit — re-apply once it has finished.
    if (!animate && performance.now() < animUntil) { clearTimeout(reapplyT); reapplyT = setTimeout(() => apply(last), animUntil - performance.now() + 30); }
  }

  // Chart: year columns are generated from the data; bars grow in on build and animate on change.
  function renderChart(v, grow = false) {
    if (!chart) return;
    let cols = $$('.en-chart__col', chart);
    if (cols.length !== v.years.length) {
      cols.forEach((c) => c.remove());
      cols = v.years.map((y) => html`<div class="en-chart__col"><span class="en-chart__val">${y.label}</span><div class="en-chart__bar" style="height:0%"></div></div>`);
      chart.append(...cols);
      yearsRow.replaceChildren(...v.years.map((y) => html`<span class="en-chart__yr">Yr ${y.n}</span>`));
      grow = true;
    }
    const paint = () => {
      const cur = last;
      if (cur.years.length !== cols.length) { renderChart(cur); return; }
      cols.forEach((c, i) => { c.firstElementChild.textContent = cur.years[i].label; c.lastElementChild.style.height = cur.years[i].pct + '%'; });
      line.style.bottom = cur.investLinePct + '%';
      lineLabel.style.bottom = 'calc(' + cur.investLinePct + '% + 4px)';
      lineLabel.textContent = 'A$' + cur.investText;
    };
    if (grow) requestAnimationFrame(() => requestAnimationFrame(paint)); else paint();
  }
  function buildChart() {
    chart = html`<div class="en-chart"><div class="en-chart__line" style="bottom:0%"></div><span class="en-chart__linelabel" style="bottom:4px"></span></div>`;
    line = chart.firstElementChild; lineLabel = chart.lastElementChild;
    yearsRow = html`<div class="en-chart__years"></div>`;
    host.replaceChildren(chart, yearsRow);
    renderChart(last, true);
  }

  // Classroom rows: one per room, built when the section nears the viewport.
  function buildRows() {
    rowsEl.replaceChildren(...last.rows.map((r) => html`<div class="en-room ${r.id === activeId ? 'is-active' : ''}" data-room="${r.id}">
      <div class="stack"><span class="en-room__name">${r.name}</span><span class="en-room__sub" data-out="row.${r.id}.label"></span></div>
      <div class="en-room__bars"><div class="en-track en-track--sm"><div class="en-fill en-fill--existing" data-w="row.${r.id}.ePct" style="width:0%"></div></div><div class="en-track en-track--sm"><div class="en-fill en-fill--led" data-w="row.${r.id}.pPct" style="width:0%"></div></div></div>
      <div class="en-room__vals"><span data-out="row.${r.id}.kwh"></span><span class="muted" data-out="row.${r.id}.cost"></span></div>
    </div>`));
    rowsEl.removeAttribute('aria-busy');
    applyText(last);
    requestAnimationFrame(() => requestAnimationFrame(() => applyWidths(last)));
  }

  function syncInputs() {
    $$('input[data-k]', el).forEach((i) => { i.value = inputVal(i.dataset.k); });
    periodSel.value = String(S.period);
  }

  // Hours and tariff are shared with Studio / Reports: persist them, debounced.
  let persistT = null;
  let persisted = { hours: Number(settings.hours ?? DEFAULT_HOURS), tariff: Number(settings.tariff ?? DEFAULT_TARIFF) };
  function flushPersist() {
    clearTimeout(persistT); persistT = null;
    const hours = Math.round(S.hDay * S.dWeek * S.weeks), tariff = S.tariff;
    if (hours === persisted.hours && tariff === persisted.tariff) return;
    persisted = { hours, tariff };
    api.updateSettings({ hours, tariff }).catch(() => {});
  }
  function schedulePersist() { clearTimeout(persistT); persistT = setTimeout(flushPersist, 500); }

  function switchRoom(id) {
    const room = rooms.find((r) => r.id === id); if (!room) return;
    const changed = id !== activeId;
    if (changed) {
      activeId = id; api.setUi({ activeRoomId: id });
      Object.assign(S, roomDefaults(room, plans[id]));
      syncInputs();
    }
    $$('[data-chip]', el).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.chip === id)));
    $$('.en-room', rowsEl).forEach((r) => r.classList.toggle('is-active', r.dataset.room === id));
    scopeSel.value = id;
    update(true);
    if (changed) toast('Modelling ' + room.name, { kind: 'info' });
  }

  // ---------- events ----------
  on(el, 'input', 'input[data-k]', (e, inp) => {
    const k = inp.dataset.k;
    let n = Number(inp.value);
    if (!Number.isFinite(n)) n = 0;
    if (inp.min !== '' && n < Number(inp.min)) n = Number(inp.min);
    if (inp.max !== '' && n > Number(inp.max)) n = Number(inp.max);
    S[k] = n;
    if (SETTINGS_KEYS.has(k)) schedulePersist();
    update();
  });
  periodSel.addEventListener('change', () => { S.period = Number(periodSel.value) || 10; update(); });
  scopeSel.addEventListener('change', () => {
    if (scopeSel.value === 'portfolio') { S.scope = 'portfolio'; update(true); }
    else { S.scope = 'room'; switchRoom(scopeSel.value); }
  });
  on(el, 'click', '[data-chip]', (e, b) => { S.scope = 'room'; switchRoom(b.dataset.chip); });
  $('[data-form]', el).addEventListener('submit', (e) => e.preventDefault());
  on(el, 'click', '[data-reset]', (e, btn) => withSpinner(btn, async () => {
    Object.assign(S, GLOBAL_DEFAULTS, splitHours(DEFAULT_HOURS), { tariff: DEFAULT_TARIFF }, roomDefaults(active(), plans[activeId]));
    syncInputs();
    clearTimeout(persistT); persistT = null;
    persisted = { hours: DEFAULT_HOURS, tariff: DEFAULT_TARIFF };
    await api.updateSettings({ hours: DEFAULT_HOURS, tariff: DEFAULT_TARIFF });
    update(true);
    toast('Assumptions reset to the toolkit defaults');
  }, { busyLabel: 'Resetting…', doneLabel: 'Reset' }));

  // ---------- first paint + deferred sections ----------
  applyText(last);                                           // text is right before mount; bars grow in on mount
  const stops = [
    whenVisible(el, () => apply(last, true), { rootMargin: '0px' }),
    whenVisible($('[data-chart-section]', el), buildChart),
    whenVisible($('[data-rooms-section]', el), buildRows)
  ];
  ctx.onCleanup(() => { stops.forEach((stop) => stop()); clearTimeout(reapplyT); flushPersist(); });
  return el;
}

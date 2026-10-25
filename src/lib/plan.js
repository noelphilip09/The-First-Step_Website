// Plan logic ported from the Design Studio artboard. Pure functions: given a room's
// conditions and the user's plan choices, derive statuses, headlines and costs.
// Every page (Studio, Energy, Impact, Reports) uses this so numbers agree everywhere.

export const COND_FIELDS = [
  { key: 'daylight', label: 'Daylight', options: [['low', 'Low', 'Little natural light'], ['medium', 'Medium', 'Some windows'], ['strong', 'Strong', 'Large windows, direct sun']] },
  { key: 'lighting', label: 'Existing lighting', options: [['fluorescent', 'Fluorescent', 'Tubes, ageing'], ['ledfixed', 'LED, fixed', 'No dimming'], ['leddim', 'LED, dimmable', 'Controls in place']] },
  { key: 'glare', label: 'Glare', options: [['none', 'None', ''], ['some', 'Some', 'At certain times'], ['strong', 'Strong', 'Blinds always down']] },
  { key: 'plants', label: 'Plants today', options: [['none', 'None', ''], ['some', 'Some', 'A few pots'], ['plenty', 'Plenty', 'Already well planted']] },
  { key: 'walls', label: 'Wall finish', options: [['glossy', 'Glossy', 'Reflective paint'], ['matt', 'Matt', 'Low sheen']] },
  { key: 'size', label: 'Room size', options: [['compact', 'Compact', 'Under 40 m²'], ['standard', 'Standard', '40–100 m²'], ['large', 'Large', 'Over 100 m²']] }
];
export const COND_LABEL = Object.fromEntries(COND_FIELDS.map((f) => [f.key, Object.fromEntries(f.options.map(([v, l]) => [v, l]))]));

export const SPECIES = {
  zz: { name: 'ZZ plant', light: 'Low light', thumb: './assets/img/plants/thumb-zz.png' },
  cast: { name: 'Cast iron plant', light: 'Low light', thumb: './assets/img/plants/thumb-cast-iron.png' },
  pothos: { name: 'Pothos', light: 'Low–medium light', thumb: './assets/img/plants/thumb-pothos.png' },
  pep: { name: 'Peperomia', light: 'Medium light', thumb: './assets/img/plants/thumb-peperomia.png' },
  spider: { name: 'Spider plant', light: 'Medium light', thumb: './assets/img/plants/thumb-spider.png' },
  peace: { name: 'Peace lily', light: 'Medium light · toxic if ingested', thumb: null }
};
export const PALETTES = { calm: 'Calm Study', warm: 'Warm Neutral', horizon: 'Soft Horizon' };
export const FINISHES = { lowsheen: 'low sheen', matt: 'matt', eggshell: 'eggshell', semigloss: 'semi-gloss' };
export const DEFAULT_HOURS = 2000;
export const DEFAULT_TARIFF = 0.30;

export function recsFor(c) {
  const count = c.plants === 'plenty' ? 0 : c.size === 'compact' ? 4 : c.size === 'large' ? 14 : 8;
  const low = c.daylight === 'low';
  return {
    cct: 3000, dimming: true, zones: c.size === 'compact' ? 1 : c.size === 'large' ? 3 : 2,
    plantCount: count,
    sp: { zz: true, cast: low, pothos: true, pep: true, spider: !low, peace: false },
    palette: c.glare === 'strong' || (c.lighting === 'ledfixed' && c.daylight === 'low') ? 'horizon' : 'calm',
    finish: 'lowsheen', noChange: c.walls === 'matt'
  };
}

export function defaultPlan(room) { return { ...recsFor(room.cond), submitted: false }; }

const st = (label, kind) => ({ label, kind });

export function computePlan(room, plan, opts = {}) {
  const c = room.cond; const s = { ...recsFor(c), ...(plan || {}) };
  const hours = opts.hours ?? DEFAULT_HOURS; const tariff = opts.tariff ?? DEFAULT_TARIFF;
  const fittingsN = c.size === 'compact' ? 6 : c.size === 'large' ? 24 : 12;
  const existingPer = c.lighting === 'fluorescent' ? 82 : c.lighting === 'ledfixed' ? 40 : 36;
  const replace = c.lighting === 'fluorescent';
  const existingW = fittingsN * existingPer;
  const proposedW = replace ? fittingsN * 32 : existingW;
  const savingKwh = (existingW - proposedW) / 1000 * hours;
  const savingCost = savingKwh * tariff;
  const existingKwh = existingW / 1000 * hours;
  const proposedKwh = proposedW / 1000 * hours;
  const glareCost = c.glare === 'strong' ? 900 : c.glare === 'some' ? 500 : 0;
  const lightCost = (replace ? fittingsN * 280 + (s.dimming ? 400 : 0) + (s.zones > 1 ? 200 : 0) : c.lighting === 'ledfixed' && s.dimming ? 1900 : 0) + glareCost;
  const plantCost = s.plantCount * 120;
  const paintArea = c.size === 'compact' ? 40 : c.size === 'large' ? 120 : 60;
  const repaint = c.walls === 'glossy';
  const doPaint = !s.noChange;
  const paintCost = doPaint ? paintArea * 18 : 0;
  const total = lightCost + plantCost + paintCost;
  const payback = savingCost > 0 ? total / savingCost : null;

  let cctStatus;
  if (s.cct >= 2700 && s.cct <= 3000) cctStatus = st('Within guideline · calm range', 'accent');
  else if (s.cct > 3000 && s.cct <= 4000) cctStatus = st('Within guideline · task range', 'accent');
  else if (s.cct < 2700) cctStatus = st('Needs review · below 2700 K', 'review');
  else cctStatus = st('Outside guideline · above 4000 K, try 3500–4000 K', 'outside');
  const lightStatus = cctStatus.kind === 'outside' ? st('Outside guideline', 'outside') : cctStatus.kind === 'review' ? st('Needs review', 'review') : st('Within guideline', 'within');
  let cctHint, cctHintKind = 'ok';
  if (s.cct < 2700) { cctHint = 'Below the calm range · needs review'; cctHintKind = 'review'; }
  else if (s.cct <= 3000) cctHint = 'Suitable for calm, warm use';
  else if (s.cct < 3400) cctHint = 'Suitable for general use';
  else if (s.cct <= 4000) cctHint = 'Suitable for task-focused use';
  else { cctHint = 'Above the task range · outside guideline'; cctHintKind = 'outside'; }
  const lightHeadline = replace ? 'Replace fluorescent lighting with flicker-free ' + (s.dimming ? 'Smart LEDs' : 'LEDs') : c.lighting === 'ledfixed' ? 'Keep the LED fittings · add dimming and scenes' : 'Keep the fittings · add a warm default scene';
  const lightWhy = replace ? (c.daylight === 'low' ? 'Low daylight, ageing tubes' : 'Ageing tubes') : c.lighting === 'ledfixed' ? 'Existing LEDs are sound; only controls are justified' : 'Already dimmable';
  const lightRefs = replace ? 'L1, L2, L5, L9' : 'L2, L5, L6';
  const glareFirst = c.glare !== 'none';

  const selectedSpecies = Object.keys(s.sp).filter((k) => s.sp[k]);
  const plantNotRequired = c.plants === 'plenty';
  let plantStatus;
  if (plantNotRequired) plantStatus = st('Not required', 'none');
  else if (s.sp.peace) plantStatus = st('Needs review · toxicity', 'review');
  else if (c.daylight === 'low' && s.sp.spider && !s.sp.zz && !s.sp.cast) plantStatus = st('Needs review · light', 'review');
  else if (s.plantCount === 0) plantStatus = st('None proposed', 'none');
  else plantStatus = st('Within guideline', 'within');
  const plantHeadline1 = plantNotRequired ? 'Planting already in place' : s.plantCount + ' ' + (c.daylight === 'low' ? 'low-light' : 'easy-care') + ' plants in';
  const plantHeadline2 = plantNotRequired ? 'keep and maintain' : 'self-watering pots';
  const plantHeadline = plantHeadline1 + (plantNotRequired ? ' · ' : ' ') + plantHeadline2;
  const plantWhy = plantNotRequired ? 'Coverage above 1% of floor area' : c.size === 'compact' ? 'Small room: keep paths clear' : c.daylight === 'low' ? 'Low daylight limits species' : 'Window wall and rear bench';
  const coverage = s.plantCount * 0.07 / room.area * 100;
  const speciesNote = s.sp.peace ? 'Peace lily is toxic if ingested — a reviewer must approve it.' : selectedSpecies.length ? 'Low shedding • Low odour' : 'Pick at least one species.';

  let colourStatus;
  if (!doPaint) colourStatus = repaint ? st('Needs review · glossy walls kept', 'review') : st('Not required', 'notreq');
  else if (s.finish === 'semigloss') colourStatus = st('Outside guideline · reflective', 'outside');
  else if (s.finish === 'eggshell') colourStatus = st('Needs review', 'review');
  else colourStatus = st('Within guideline', 'within');
  const colourHeadline = doPaint ? 'Repaint ' + paintArea + ' m² in ' + PALETTES[s.palette] + ', ' + FINISHES[s.finish] : repaint ? 'Existing glossy walls kept. Repaint recommended' : 'Existing matt walls are fine. No repaint proposed';
  const colourWhy = repaint ? 'Glossy walls reflect fittings and projector' : 'Finish already low-glare';
  const finishNote = s.finish === 'semigloss' ? 'Semi-gloss reflects glare — choose low sheen or matt' : s.finish === 'eggshell' ? 'Eggshell needs a check on the projector wall' : 'Low-sheen finishes reduce glare & visual noise';

  const all = [lightStatus, plantStatus, colourStatus];
  const exceptionCount = all.filter((x) => x.kind === 'review' || x.kind === 'outside').length;
  const planStatus = all.some((x) => x.kind === 'outside') ? st('Outside guideline', 'outside') : exceptionCount ? st(exceptionCount + ' for review', 'review') : st('Within guideline', 'accent');

  const cols = fittingsN > 12 ? 6 : 4;
  const rows = Math.max(1, Math.ceil(fittingsN / cols));
  const fittings = [];
  for (let i = 0; i < fittingsN; i++) {
    const col = i % cols, rw = Math.floor(i / cols);
    fittings.push({ x: 48 + col * (344 / (cols - 1)), y: 36 + rw * (300 / rows), zoneA: rw === 0 || s.zones === 1 });
  }
  const spots = [[14, 92], [14, 146], [14, 200], [14, 254], [60, 322], [120, 322], [180, 322], [240, 322], [300, 322], [402, 92], [402, 146], [402, 200], [402, 254], [40, 40]];
  const plantDots = spots.slice(0, Math.min(s.plantCount, spots.length)).map(([x, y]) => ({ x, y }));

  return {
    plan: s, hours, tariff, fittingsN, existingPer, existingW, proposedW, existingKwh, proposedKwh, replace,
    savingKwh, savingCost, glareCost, lightCost, plantCost, paintArea, repaint, doPaint, paintCost, total, payback,
    paybackText: payback === null ? 'Not reached' : payback > 25 ? 'Over 25 years' : payback.toFixed(1) + ' years',
    paybackNote: payback === null ? 'No energy saving modelled' : 'Energy savings only',
    cctStatus, lightStatus, lightWithin: lightStatus.kind === 'within', cctHint, cctHintKind, lightHeadline, lightWhy, lightRefs, glareFirst,
    plantStatus, plantNotRequired, plantHeadline, plantHeadline1, plantHeadline2, plantWhy, coverage,
    coverageText: coverage.toFixed(1) + '% of ' + room.area + ' m²', coverageBar: Math.min(100, coverage / 2 * 100), speciesNote, selectedSpecies,
    colourStatus, colourNone: colourStatus.kind === 'notreq', colourWithin: colourStatus.kind === 'within', colourHeadline, colourWhy, finishNote,
    planStatus, exceptionCount, fittings, plantDots, cols, rows,
    fittingLegend: replace ? 'New LED · zone A' : 'Existing fitting · zone A',
    lightLine: replace ? fittingsN + ' LED fittings, install, controls' : c.lighting === 'ledfixed' ? 'Controls retrofit' + (glareCost ? ', glare treatment' : '') : glareCost ? 'Glare treatment only' : 'No lighting work',
    plantLine: s.plantCount ? s.plantCount + ' plants, pots and media' : 'No planting',
    colourLine: doPaint ? paintArea + ' m² repaint, ' + FINISHES[s.finish] : 'No repaint required',
    verifyLine: 'To verify: ballast wattage (electrician), water access (facilities)' + (glareFirst ? ', glare measurement (lighting designer)' : '')
  };
}

// Map a status kind to the pill modifier class.
export const pillClass = (kind) => 'pill pill--' + (kind || 'none');

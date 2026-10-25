// Colour & Material Guidelines — design/Colour.dc.html. Data + the "Colour combinations" and
// "All colours by category" sections; the template and behaviour live in _guideline.js.
// Swatch hexes are content and stay literal. Detail copy (opened by tapping a tile) is
// authored — the design shows no open colour guideline.
import { html, raw, on } from '../lib/dom.js';
import { toast } from '../lib/loading.js';
import { guidelinePage, blockHead, infoNote, svg, ICON } from './_guideline.js';

const GUIDELINES = [
  { code: 'C1', title: 'Wall finishes', sub: 'Muted, low sheen or matt', icon: '<rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M3 12h18"></path>',
    detail: { default: 'Muted guide colours in low sheen or matt', alternatives: 'Keep existing matt walls and repaint one wall', consider: 'Test a sample panel under the room’s own lighting', evidence: 'Supplied colour reference · confidence moderate' } },
  { code: 'C2', title: 'Flooring', sub: 'Matt, mid-tone, quiet pattern', icon: '<path d="M3 20h18M3 14l9-4 9 4M3 8l9-4 9 4"></path>',
    detail: { default: 'Matt, mid-tone flooring with a quiet pattern', alternatives: 'Keep existing flooring where it is in good condition', consider: 'Avoid high-contrast borders and busy patterns', evidence: 'Supplied colour reference · confidence low' } },
  { code: 'C3', title: 'Ceilings', sub: 'Matt white, even reflection', icon: '<path d="M3 6h18M3 10h18M7 6v4M12 6v4M17 6v4"></path>',
    detail: { default: 'Matt white for even reflection', alternatives: 'Off-white where the walls are very pale', consider: 'Gloss ceilings mirror fittings and glare', evidence: 'Supplied colour reference · confidence moderate' } },
  { code: 'C4', title: 'Daylight and glazing', sub: 'Diffuse, do not block', icon: '<rect x="4" y="4" width="16" height="16" rx="1"></rect><path d="M12 4v16M4 12h16"></path>',
    detail: { default: 'Diffuse daylight with blinds or film; do not block it', alternatives: 'External shading where glare is strong', consider: 'Measure glare at the worst time of day', evidence: 'Site measurement required · confidence low' } },
  { code: 'C5', title: 'Low sheen and glare', sub: 'Fix reflections before fittings', icon: '<path d="M3 18L15 6M8 18L20 6" stroke-dasharray="3 3"></path>',
    detail: { default: 'Fix reflective surfaces before changing any fittings', alternatives: 'Matt film on glossy furniture', consider: 'The projector wall and screens come first', evidence: 'Supplied colour reference · confidence moderate' } },
  { code: 'C6', title: 'Clutter and contrast', sub: 'Display zones, quiet surfaces', icon: '<rect x="3" y="3" width="7" height="7"></rect><circle cx="17" cy="7" r="3.5"></circle><path d="M3 21l7-7M14 14l7 7M21 14l-7 7"></path>',
    detail: { default: 'Defined display zones with quiet surfaces elsewhere', alternatives: 'Rotate displays rather than adding more', consider: 'Check the wall behind the teacher', evidence: 'Supplied colour reference · confidence moderate' } },
  { code: 'C7', title: 'Natural materials', sub: 'Timber, cork, textile, matt', icon: '<path d="M4 20V8l8-5 8 5v12"></path><path d="M9 20v-6h6v6"></path>',
    detail: { default: 'Timber, cork and textile in matt finishes', alternatives: 'Timber-look laminate where budget is tight', consider: 'Fire ratings apply to wall-mounted materials', evidence: 'Supplied colour reference · confidence moderate' } },
  { code: 'C8', title: 'Sensory choice', sub: 'A calmer zone, not one setting', icon: '<circle cx="9" cy="8" r="3.5"></circle><path d="M2.5 20a6.5 6.5 0 0 1 13 0"></path><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-5-6.3"></path>',
    detail: { default: 'A calmer zone in the room, not one setting for everyone', alternatives: 'A movable screen or a corner nook', consider: 'Ask staff where quiet work happens today', evidence: 'Supplied colour reference · confidence moderate' } }
];

// Relevance for a room's conditions (reproduces the design's dots for Seminar Room 01).
const relevance = (c) => ({
  C1: c.walls === 'glossy' ? 'rec' : 'not',
  C2: c.size === 'large' ? 'verify' : 'not',
  C3: c.glare === 'strong' ? 'verify' : 'not',
  C4: c.daylight === 'strong' ? 'rec' : 'verify',
  C5: c.walls === 'glossy' || c.glare !== 'none' ? 'rec' : 'not',
  C6: 'verify',
  C7: 'rec',
  C8: 'rec'
});

/* ---------- Colour combinations ---------- */
const PALETTES = [
  { name: 'Calm Study', family: 'Greens', where: 'Seminar rooms and study spaces', benefit: 'Aids concentration and focus', colours: ['#F0F1E0', '#BFC4AE', '#98ACA1', '#7DA48F'] },
  { name: 'Warm Neutral', family: 'Neutrals & Beiges', where: 'Studios and shared rooms', benefit: 'Comfort and belonging', colours: ['#F7E9DD', '#E6DACA', '#EDCF9E', '#D5A78B'] },
  { name: 'Soft Horizon', family: 'Blues', where: 'Screen-heavy labs and quiet rooms', benefit: 'Encourages calm and quiet', colours: ['#C4DBDD', '#B0CDE0', '#A2CFD9', '#98B2C6'] },
  { name: 'Gentle Nurture', family: 'Pinks & Lilacs', where: 'Wellbeing and early-years rooms', benefit: 'Safe, loving, nurturing', colours: ['#F9F2FF', '#F2E9ED', '#D5CBB9', '#AA9DA8'] }
];
const STRIP_FLEX = [5, 2, 2, 1.5];

const paletteCard = (p, i) => html`<article class="gl-palette" data-reveal style="--i:${i}">
  <span class="gl-palette__strip" aria-hidden="true">${p.colours.map((hex, j) => raw(`<span style="flex:${STRIP_FLEX[j]} ${STRIP_FLEX[j]} 0;background:${hex}"></span>`))}</span>
  <span class="gl-palette__body">
    <span class="gl-palette__row"><span class="gl-palette__name">${p.name}</span><span class="gl-palette__tag">${p.family}</span></span>
    <span class="gl-block__desc">${p.where}</span>
    <span class="gl-benefit">${svg(ICON.heart, { size: 16, stroke: 1.8 })}${p.benefit}</span>
  </span>
</article>`;

const combinationsSection = () => html`<div class="gl-block">
  ${blockHead('Colour combinations', html`<span class="gl-block__desc">Four starting palettes built from the guide colours. Pick one in the Design Studio.</span>`, { baseline: true })}
  <div class="gl-palettes">${PALETTES.map(paletteCard)}</div>
</div>`;

/* ---------- All colours by category ---------- */
const FAMILIES = [
  { name: 'Blues', benefit: 'Encourages calm, creates a quiet and relaxing space.', colours: [['B1', 'Slate Blue', '#98B2C6'], ['B2', 'Powder Blue', '#B0CDE0'], ['B3', 'Sky Aqua', '#A2CFD9'], ['B4', 'Pale Teal', '#C4DBDD']] },
  { name: 'Greens', benefit: 'Aids concentration and focus, reduces overstimulation.', colours: [['G1', 'Fern', '#7DA48F'], ['G2', 'Sage Grey', '#98ACA1'], ['G3', 'Olive Moss', '#A1AA80'], ['G4', 'Pale Sage', '#BFC4AE']] },
  { name: 'Pinks & Lilacs', benefit: 'Safe, loving, nurturing.', colours: [['P1', 'Dusty Mauve', '#AA9DA8'], ['P2', 'Blush Mist', '#F2E9ED'], ['P3', 'Pale Pink', '#FFEBFF'], ['P4', 'Lilac White', '#F9F2FF']] },
  { name: 'Neutrals & Beiges', benefit: 'Create a sense of comfort, belonging and calming.', colours: [['N1', 'Terracotta', '#D5A78B'], ['N2', 'Peach', '#F3C2A1'], ['N3', 'Wheat', '#EDCF9E'], ['N4', 'Sand', '#E6DACA'], ['N5', 'Ivory', '#F7E9DD'], ['N6', 'Linen', '#F0F1E0'], ['N7', 'Stone', '#D5CBB9'], ['N8', 'Oat', '#EEDFC2']] }
];
const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(' · '); };

const swatch = ([code, name, hex], j) => html`<button type="button" class="gl-swatch" style="background:${hex};--i:${j}" data-hex="${hex}" data-name="${name}" title="Copy ${hex}" data-reveal>
  <span class="gl-swatch__top"><span class="gl-swatch__code">${code}</span><span class="gl-swatch__name">${name}</span></span>
  <span class="gl-swatch__meta"><span><b>HEX</b>&nbsp;&nbsp;${hex}</span><span><b>RGB</b>&nbsp;&nbsp;${rgb(hex)}</span></span>
</button>`;

const familyBlock = (f) => html`<div class="gl-family">
  <div class="gl-family__head" data-reveal><span class="h-card">${f.name}</span><span class="gl-family__benefit">${svg(ICON.heart, { size: 16, stroke: 1.8 })}<span><b>Psychological benefit</b> · ${f.benefit}</span></span></div>
  <div class="gl-swatches">${f.colours.map(swatch)}</div>
</div>`;

function categoriesSection() {
  const el = html`<div class="gl-block gl-block--loose">
    ${blockHead('All colours by category', html`<span class="gl-block__desc">Muted, neutral and pastel tones only. 20 colours in four families.</span>`, { baseline: true })}
    ${FAMILIES.map(familyBlock)}
    ${infoNote('Colour tone swatches are recommendations only. Avoid bright accent colours on interior surfaces; use the toolkit accent for interface elements, not walls.')}
  </div>`;
  // Tapping a swatch copies its HEX for use in the Studio / paint spec.
  on(el, 'click', '.gl-swatch', async (e, btn) => {
    const { hex, name } = btn.dataset;
    try { await navigator.clipboard.writeText(hex); toast(`Copied ${hex} · ${name}`); }
    catch { toast(`${name} is ${hex}`, { kind: 'info' }); }
  });
  return el;
}

export default function page(ctx) {
  return guidelinePage(ctx, {
    label: 'Colour and Material Guidelines',
    version: '1.2',
    banner: {
      variant: 'colour', label: 'Colour and Material Guidelines banner',
      kicker: 'Design guidelines · 03 of 03', title: 'Colour & Material Guidelines',
      lead: 'Warm neutrals, muted greens and low-sheen finishes that keep walls calm and daylight soft.', leadMax: 540,
      pills: ['8 guidelines', 'Version 1.2'],
      bg: { src: './assets/img/colour/banner.png', width: 1112, height: 312 },
      hero: { src: './assets/img/colour/paint-samples.png', alt: 'Fan of paint sample cards in terracotta, clay, sand, sage, mist, stone blue, lavender, taupe and pale blush', width: 994, height: 830, style: 'top:0;right:-56px;width:504px' }
    },
    guidelines: GUIDELINES,
    relevance,
    sections: [combinationsSection(), categoriesSection()],
    nav: { prev: { label: 'Plant Guidelines', href: '#/guidelines/plants' }, next: { label: 'Energy & Savings', href: '#/energy' } }
  });
}

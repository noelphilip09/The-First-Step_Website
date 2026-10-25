// Plant Guidelines — design/Plants.dc.html. Data + the Species section; the template and
// behaviour live in _guideline.js. Detail copy (opened by tapping a tile) is authored —
// the design shows no open plant guideline.
import { html } from '../lib/dom.js';
import { guidelinePage, imageCard, blockHead, infoNote } from './_guideline.js';

const GUIDELINES = [
  { code: 'P1', title: 'Floor and desk plants', sub: 'Pots that keep paths clear', icon: '<path d="M7 14h10l-1 7H8z"></path><path d="M12 14V8"></path><path d="M12 11c-3 0-5-2-5-5 3 0 5 2 5 5zM12 9c3 0 5-2 5-5-3 0-5 2-5 5z"></path>',
    detail: { default: 'Self-watering floor and desk pots that keep paths clear', alternatives: 'Grouped planters along the window wall', consider: 'Keep one metre clear of every door and exit', evidence: 'Supplied plant reference · confidence moderate' } },
  { code: 'P2', title: 'Wicking beds', sub: 'Sealed reservoir, overflow', icon: '<rect x="3" y="11" width="18" height="8" rx="2"></rect><path d="M3 15h18M8 11V7M12 11V5M16 11V8"></path>',
    detail: { default: 'Sealed reservoir with a visible overflow', alternatives: 'Large self-watering troughs where beds are not possible', consider: 'Floor loading and water access must be checked', evidence: 'Supplied plant reference · confidence low' } },
  { code: 'P3', title: 'Wall planting', sub: 'Irrigation, fixing, fire rating', icon: '<rect x="4" y="3" width="16" height="18" rx="2"></rect><path d="M8 7h.01M12 7h.01M16 7h.01M8 12h.01M12 12h.01M16 12h.01M8 17h.01M12 17h.01M16 17h.01"></path>',
    detail: { default: 'Only with irrigation, a rated fixing and fire approval', alternatives: 'Framed preserved-moss panels', consider: 'Living walls need a maintenance contract', evidence: 'Supplied plant reference · confidence low' } },
  { code: 'P4', title: 'Light and water', sub: 'Match species to the room', icon: '<circle cx="8" cy="9" r="4"></circle><path d="M8 2v1M8 15v1M1 9h1M14 9h1"></path><path d="M17 12s3 3.5 3 6a3 3 0 0 1-6 0c0-2.5 3-6 3-6z"></path>',
    detail: { default: 'Match species to measured daylight and the watering routine', alternatives: 'Low-light species where the room has little daylight', consider: 'Most failures come from over-watering', evidence: 'Supplied plant reference · confidence moderate' } },
  { code: 'P5', title: 'Placement', sub: 'Never exits, boards, projector lines', icon: '<path d="M12 21s-7-5-7-11a7 7 0 0 1 14 0c0 6-7 11-7 11z"></path><circle cx="12" cy="10" r="2.5"></circle>',
    detail: { default: 'Where plants are seen from the seats; never at exits, boards or projector lines', alternatives: 'Rear bench and window sill', consider: 'Check sightlines from the back row', evidence: 'Supplied plant reference · confidence moderate' } },
  { code: 'P6', title: 'Irrigation and reservoir', sub: '2 L self-watering by default', icon: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"></path>',
    detail: { default: '2 L self-watering pots by default', alternatives: 'Drip irrigation for larger groups', consider: 'Confirm water access with facilities', evidence: 'Supplied plant reference · confidence moderate' } },
  { code: 'P7', title: 'Maintenance', sub: 'Named maintainer, fortnightly', icon: '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
    detail: { default: 'A named maintainer and a fortnightly check', alternatives: 'A plant-care contract for larger installs', consider: 'Record checks in the reports log', evidence: 'Supplied plant reference · confidence moderate' } },
  { code: 'P8', title: 'Safety and fire', sub: 'Toxicity, leaks, egress, rated finishes', disc: 'review', icon: '<path d="M12 3l10 18H2z"></path><path d="M12 10v4M12 18h.01"></path>',
    detail: { default: 'Non-toxic species, leak trays, clear egress, rated finishes', alternatives: 'Irritant species only out of reach, with a placement note', consider: 'Fire items need a qualified professional', evidence: 'Supplied plant reference · confidence high' } }
];

// Relevance for a room's conditions (reproduces the design's dots for Seminar Room 01).
const relevance = (c) => ({
  P1: c.plants === 'plenty' ? 'not' : 'rec',
  P2: c.size === 'large' ? (c.daylight === 'low' ? 'verify' : 'rec') : 'not',
  P3: c.daylight === 'strong' && c.size !== 'compact' ? 'verify' : 'not',
  P4: c.plants === 'plenty' ? 'verify' : 'rec',
  P5: c.plants === 'plenty' ? 'verify' : 'rec',
  P6: 'verify',
  P7: 'verify',
  P8: 'rec'
});

const SPECIES = [
  { img: './assets/img/plants/cast-iron.png', alt: 'Cast iron plant in a white pot', title: 'Cast iron Plant', sub: 'Aspidistra elatior', badge: { kind: 'ok', label: 'Non-toxic' }, traits: [['sun', 'Low light tolerant'], ['drop', 'Minimal watering'], ['leaf', 'Very hardy']] },
  { img: './assets/img/plants/peperomia.png', alt: 'Peperomia in a white pot', title: 'Peperomia', sub: 'Peperomia spp.', badge: { kind: 'ok', label: 'Non-toxic' }, traits: [['sun', 'Low–moderate light'], ['drop', 'Low water needs'], ['leaf', 'Compact growth']] },
  { img: './assets/img/plants/spider.png', alt: 'Spider plant in a white pot', title: 'Spider Plant', sub: 'Chlorophytum comosum', badge: { kind: 'ok', label: 'Non-toxic' }, traits: [['sun', 'Low–moderate light'], ['drop', 'Moderate watering'], ['leaf', 'Easy to propagate']] },
  { img: './assets/img/plants/zz.png', alt: 'ZZ plant in a white pot', title: 'ZZ Plant', sub: 'Zamioculcas zamiifolia', badge: { kind: 'warn', label: 'Irritant • Placement note' }, traits: [['sun', 'Low light tolerant'], ['drop', 'Low water needs'], ['leaf', 'Low maintenance']] },
  { img: './assets/img/plants/pothos.png', alt: 'Pothos in a white pot', title: 'Pothos', sub: 'Epipremnum aureum', badge: { kind: 'warn', label: 'Irritant • Placement note' }, traits: [['sun', 'Low–moderate light'], ['drop', 'Moderate watering'], ['leaf', 'Easy to maintain']] }
];

const speciesSection = () => html`<div class="gl-block">
  ${blockHead('Species', html`<a class="gl-block__link" href="#/settings">Manage species and safety notes</a>`)}
  <div class="gl-species-grid">${SPECIES.map((s, i) => imageCard(s, i))}</div>
  ${infoNote('Minimum from the supplied reference: plants over 1% of floor area, plant walls at least 2% of wall area (stated as WELL v2) — verify against the current standard before treating it as a requirement.')}
</div>`;

export default function page(ctx) {
  return guidelinePage(ctx, {
    label: 'Plant Guidelines',
    version: '1.2',
    banner: {
      variant: 'plants', label: 'Plant Guidelines banner',
      kicker: 'Design guidelines · 02 of 03', title: 'Plant Guidelines',
      lead: 'Low-light, low-shedding species in self-watering pots, placed where they are seen and kept clear of paths.', leadMax: 500,
      pills: ['8 guidelines', '5 species', 'Version 1.2'],
      bg: { src: './assets/img/plants/banner.png', width: 1112, height: 312 },
      hero: { src: './assets/img/plants/pothos-self-watering.png', alt: 'Pothos trailing from a white self-watering pot', width: 1160, height: 644, style: 'top:15px;right:-83px;width:588px' }
    },
    guidelines: GUIDELINES,
    relevance,
    sections: [speciesSection()],
    nav: { prev: { label: 'Lighting Guidelines', href: '#/guidelines/lighting' }, next: { label: 'Colour & Material Guidelines', href: '#/guidelines/colour' } }
  });
}

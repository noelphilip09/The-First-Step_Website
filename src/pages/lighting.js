// Lighting Guidelines — design/Lighting.dc.html. Data only; the template and behaviour
// live in _guideline.js. Detail copy for L2 is from the design; the other details are
// authored so that "Tap any tile to open it like this" works for every tile.
import { guidelinePage } from './_guideline.js';

const GUIDELINES = [
  { code: 'L1', title: 'Flicker-free', sub: 'Low-flicker LED drivers', icon: '<path d="M3 12h4l3-7 4 14 3-7h4"></path>',
    detail: { title: 'Flicker-free lighting', default: 'Low-flicker LED drivers on every new fitting', alternatives: 'Keep existing LEDs only where the drivers test flicker-free', consider: 'Flicker is invisible in a photo — measure it with a meter', evidence: 'Supplied lighting research · confidence high' } },
  { code: 'L2', title: 'Warm, adjustable', sub: '2700–3000 K default', icon: '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M2 12h2M20 12h2"></path>',
    detail: { title: 'Warm, adjustable lighting', default: '2700–3000 K calm scene, adjustable by staff', alternatives: '3000–3500 K where measured conditions justify it', consider: 'Colour temperature alone does not fix flicker or glare', evidence: 'Supplied lighting research · confidence moderate' } },
  { code: 'L3', title: 'Task colour temperature', sub: '3500–4000 K per zone', icon: '<path d="M4 20h4l10-10-4-4L4 16z"></path><path d="M13 7l4 4"></path>',
    detail: { default: '3500–4000 K for task zones, switched separately', alternatives: 'A single 3000 K scene where no close work happens', consider: 'Keep task and calm zones off the same circuit', evidence: 'Supplied lighting research · confidence moderate' } },
  { code: 'L4', title: 'Glare and uniformity', sub: 'Diffuse before adding light', icon: '<path d="M3 18L15 6M8 18L20 6" stroke-dasharray="3 3"></path><circle cx="18" cy="6" r="2.5"></circle>',
    detail: { default: 'Diffuse existing sources before adding any light', alternatives: 'Blinds or baffles where diffusers are not possible', consider: 'Check the projector wall and screens at the worst time of day', evidence: 'Site measurement required · confidence low' } },
  { code: 'L5', title: 'Dimming and override', sub: 'Room control, local switch', icon: '<path d="M4 12h16M4 6h10M4 18h7"></path>',
    detail: { default: 'Room-level dimming with a local switch at the door', alternatives: 'Preset scenes where full dimming is not affordable', consider: 'Staff must be able to override any automation', evidence: 'Supplied lighting research · confidence moderate' } },
  { code: 'L6', title: 'Lighting zones', sub: 'Teaching wall and seating', icon: '<rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M9 4v16M15 4v16"></path>',
    detail: { default: 'Teaching wall and seating area on separate zones', alternatives: 'A third zone for group work in large rooms', consider: 'Zones follow how the room is used, not the ceiling grid', evidence: 'Supplied lighting research · confidence moderate' } },
  { code: 'L7', title: 'Gradual transitions', sub: 'Fade, never snap', icon: '<path d="M3 17c6 0 6-10 12-10h6"></path><path d="M17 4l4 3-4 3"></path>',
    detail: { default: 'Fade between scenes over two to three seconds', alternatives: 'Longer fades for wind-down routines', consider: 'Never snap to full brightness on entry', evidence: 'Supplied lighting research · confidence moderate' } },
  { code: 'L8', title: 'Light for plants', sub: 'Only if species need it', icon: '<path d="M5 19C5 9 11 4 20 4c0 9-5 15-15 15z"></path><path d="M5 19l8-8"></path>',
    detail: { default: 'No grow lighting unless the chosen species need it', alternatives: 'A single warm-white grow lamp for a feature plant', consider: 'Every listed species tolerates low light', evidence: 'Plant guidelines P4 · confidence moderate' } },
  { code: 'L9', title: 'Fluorescent to LED', sub: 'From real wattage and hours', icon: '<rect x="3" y="9" width="18" height="6" rx="3"></rect><path d="M12 15v5"></path>',
    detail: { default: 'Replace tubes with flicker-free LED, sized from real wattage and hours', alternatives: 'Retrofit LED tubes where the fittings are sound', consider: 'Ballast wattage must be read on site by an electrician', evidence: 'Energy model · confidence moderate' } },
  { code: 'L10', title: 'Energy and upkeep', sub: 'Quality and efficiency, separately', icon: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"></path>',
    detail: { default: 'Report light quality and efficiency as separate outcomes', alternatives: 'A lamp-life schedule in the maintenance plan', consider: 'Savings depend on the hours actually lit', evidence: 'Energy model · confidence moderate' } }
];

// Relevance of each guideline for a room's conditions (reproduces the design's dots for Seminar Room 01).
const relevance = (c) => ({
  L1: c.lighting === 'fluorescent' ? 'rec' : 'verify',
  L2: 'rec',
  L3: c.size === 'compact' ? 'verify' : 'rec',
  L4: c.glare === 'none' ? 'verify' : 'rec',
  L5: c.lighting === 'leddim' ? 'not' : 'rec',
  L6: c.size === 'compact' ? 'not' : 'rec',
  L7: 'rec',
  L8: c.plants === 'none' ? 'not' : c.daylight === 'low' ? 'rec' : 'verify',
  L9: c.lighting === 'fluorescent' ? 'rec' : 'not',
  L10: 'rec'
});

export default function page(ctx) {
  return guidelinePage(ctx, {
    label: 'Lighting Guidelines',
    version: '1.2',
    banner: {
      variant: 'lighting', label: 'Lighting Guidelines banner',
      kicker: 'Design guidelines · 01 of 03', title: 'Lighting Guidelines',
      lead: 'Flicker-free, warm and adjustable light, zoned for the teaching wall and the seating area.', leadMax: 520,
      pills: ['10 guidelines', 'Version 1.2'],
      bg: { src: './assets/img/lighting/banner.png', width: 1112, height: 312 },
      hero: { src: './assets/img/lighting/copper-pendants.png', alt: 'Five copper pendant lights hanging at different heights', width: 740, height: 1110, style: 'top:-104px;right:-4px;width:394px' }
    },
    guidelines: GUIDELINES,
    relevance,
    openCode: 'L2',
    nav: { next: { label: 'Plant Guidelines', href: '#/guidelines/plants' } }
  });
}

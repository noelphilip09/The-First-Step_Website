// The ten classroom starting points shown in the Classroom Library.
// `focus` marks which interventions the type concentrates on.
// `image`: optional picture for the card (a path under assets/img/types/); when null the
// card shows the design's line illustration instead.
export const TYPES = [
  { id: 'low-light', num: '01', name: 'Low Natural Light', sub: 'Little daylight · lighting and low-light plants', size: '30–80 m²', focus: { lighting: true, plants: true, colour: false }, illo: 'Room with one small window and a pendant light',
    image: './assets/img/types/low-light.jpg',
    cond: { daylight: 'low', lighting: 'fluorescent', glare: 'none', plants: 'none', walls: 'matt', size: 'standard' } },
  { id: 'glare-prone', num: '02', name: 'Glare-Prone', sub: 'Too much daylight · glare before more light', size: '40–120 m²', focus: { lighting: true, plants: false, colour: true }, illo: 'Large window with strong sun',
    image: './assets/img/types/glare-prone.jpg',
    cond: { daylight: 'strong', lighting: 'ledfixed', glare: 'strong', plants: 'none', walls: 'glossy', size: 'standard' } },
  { id: 'fluorescent', num: '03', name: 'Fluorescent Lighting', sub: 'Ageing tubes · flicker-free LED assessment', size: '30–120 m²', focus: { lighting: true, plants: false, colour: false }, illo: 'Ceiling with three fluorescent tube fittings',
    image: './assets/img/types/fluorescent.jpg',
    cond: { daylight: 'medium', lighting: 'fluorescent', glare: 'none', plants: 'none', walls: 'matt', size: 'standard' } },
  { id: 'high-sensory', num: '04', name: 'High-Sensory', sub: 'Visually busy · calmer colour and controlled light', size: '30–80 m²', focus: { lighting: true, plants: false, colour: true }, illo: 'Busy wall of shapes and posters',
    image: './assets/img/types/high-sensory.jpg',
    cond: { daylight: 'medium', lighting: 'ledfixed', glare: 'some', plants: 'none', walls: 'glossy', size: 'standard' } },
  { id: 'plant-ready', num: '05', name: 'Plant-Ready', sub: 'Good light and space · pots or wicking beds', size: '40–120 m²', focus: { lighting: false, plants: true, colour: false }, illo: 'Potted plant beside a window',
    image: './assets/img/types/plant-ready.jpg',
    cond: { daylight: 'medium', lighting: 'leddim', glare: 'none', plants: 'some', walls: 'matt', size: 'standard' } },
  { id: 'compact', num: '06', name: 'Compact Classroom', sub: 'Little floor space · planting that keeps paths clear', size: 'Under 35 m²', focus: { lighting: false, plants: true, colour: true }, illo: 'Small room with tightly placed desks',
    image: './assets/img/types/compact.jpg',
    cond: { daylight: 'medium', lighting: 'ledfixed', glare: 'none', plants: 'none', walls: 'glossy', size: 'compact' } },
  { id: 'large', num: '07', name: 'Large Teaching Space', sub: 'Big floor area · zones, uniformity, planting at scale', size: '120–250 m²', focus: { lighting: true, plants: true, colour: false }, illo: 'Wide room divided into three lighting zones',
    image: './assets/img/types/large.jpg',
    cond: { daylight: 'low', lighting: 'fluorescent', glare: 'none', plants: 'none', walls: 'matt', size: 'large' } },
  { id: 'computer-lab', num: '08', name: 'Computer Lab', sub: 'Screen reflections · uniform, controllable light', size: '60–120 m²', focus: { lighting: true, plants: false, colour: true }, illo: 'Row of computer monitors on desks',
    image: './assets/img/types/computer-lab.jpg',
    cond: { daylight: 'low', lighting: 'ledfixed', glare: 'some', plants: 'none', walls: 'glossy', size: 'large' } },
  { id: 'seminar', num: '09', name: 'Seminar & Tutorial', sub: 'Many activities · adaptable scenes, calm finishes', size: '30–70 m²', focus: { lighting: true, plants: true, colour: true }, illo: 'Round seminar table with six chairs',
    image: './assets/img/types/seminar.jpg',
    cond: { daylight: 'medium', lighting: 'fluorescent', glare: 'none', plants: 'none', walls: 'glossy', size: 'standard' } },
  { id: 'mixed', num: '10', name: 'Mixed-Condition', sub: 'Several challenges · one prioritised plan', size: '30–180 m²', focus: { lighting: true, plants: true, colour: true }, illo: 'Room combining a glare window, old tube lighting and a plant',
    image: './assets/img/types/mixed.jpg',
    cond: { daylight: 'strong', lighting: 'fluorescent', glare: 'strong', plants: 'none', walls: 'glossy', size: 'large' } }
];
export const typeById = (id) => TYPES.find((t) => t.id === id);

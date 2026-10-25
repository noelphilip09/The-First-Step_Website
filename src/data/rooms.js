// Seed classroom records (illustrative example data from the design).
export const ROOMS = [
  { id: 'sr01', name: 'Seminar Room 01', building: 'Teaching Block A', level: 'L2', area: 58, status: 'in-review', type: 'low-light',
    lightingLabel: 'Fluorescent', cond: { daylight: 'low', lighting: 'fluorescent', glare: 'none', plants: 'none', walls: 'glossy', size: 'standard' } },
  { id: 'clb04', name: 'Computer Lab B04', building: 'Science Building', level: 'LG', area: 92, status: 'draft', type: 'computer-lab',
    lightingLabel: 'LED, fixed', cond: { daylight: 'low', lighting: 'ledfixed', glare: 'some', plants: 'none', walls: 'matt', size: 'large' } },
  { id: 'st214', name: 'Studio 2.14', building: 'Design Building', level: 'L2', area: 120, status: 'draft', type: 'glare-prone',
    lightingLabel: 'LED', cond: { daylight: 'strong', lighting: 'ledfixed', glare: 'strong', plants: 'some', walls: 'glossy', size: 'large' } },
  { id: 'gs07', name: 'Group Study 07', building: 'Library Annex', level: 'G', area: 45, status: 'approved', type: 'plant-ready',
    lightingLabel: 'LED, dimmable', cond: { daylight: 'medium', lighting: 'leddim', glare: 'none', plants: 'some', walls: 'matt', size: 'standard' } },
  { id: 'tr305', name: 'Tutorial Room 3.05', building: 'Teaching Block A', level: 'L3', area: 32, status: 'not-assessed', type: 'compact',
    lightingLabel: 'Fluorescent', cond: { daylight: 'medium', lighting: 'fluorescent', glare: 'none', plants: 'none', walls: 'matt', size: 'compact' } },
  { id: 'lt110', name: 'Lecture Room 1.10', building: 'Science Building', level: 'L1', area: 180, status: 'not-assessed', type: 'large',
    lightingLabel: 'Mixed lighting', cond: { daylight: 'low', lighting: 'fluorescent', glare: 'none', plants: 'none', walls: 'matt', size: 'large' } }
];
export const roomMeta = (r) => `${r.building} · ${r.level} · ${r.area} m²`;

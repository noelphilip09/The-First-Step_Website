// Route table. Each page module is loaded on demand with a dynamic import() —
// that is the app's code-splitting. `skeleton` picks the placeholder shown meanwhile.
export const routes = [
  { path: '/', nav: 'library', title: 'Classroom Library', skeleton: 'library', page: () => import('./pages/library.js') },
  { path: '/studio', nav: 'studio', title: 'Design Studio', skeleton: 'studio', page: () => import('./pages/studio.js') },
  { path: '/guidelines/lighting', nav: 'lighting', title: 'Lighting Guidelines', skeleton: 'guideline', page: () => import('./pages/lighting.js') },
  { path: '/guidelines/plants', nav: 'plants', title: 'Plant Guidelines', skeleton: 'guideline', page: () => import('./pages/plants.js') },
  { path: '/guidelines/colour', nav: 'colour', title: 'Colour & Material Guidelines', skeleton: 'guideline', page: () => import('./pages/colour.js') },
  { path: '/energy', nav: 'energy', title: 'Energy & Savings', skeleton: 'energy', page: () => import('./pages/energy.js') },
  { path: '/impact', nav: 'impact', title: 'Impact & Outcomes', skeleton: 'impact', page: () => import('./pages/impact.js') },
  { path: '/reports', nav: 'reports', title: 'Reports & Review', skeleton: 'reports', page: () => import('./pages/reports.js') },
  { path: '/settings', nav: 'settings', title: 'Settings & Assets', skeleton: 'settings', page: () => import('./pages/settings.js') }
];

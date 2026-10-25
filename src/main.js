import { createShell } from './components/shell.js';
import { startRouter } from './router.js';
import { store } from './lib/store.js';

try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch { /* ignore */ }
const app = document.getElementById('app');
const applyTheme = (s) => { document.documentElement.dataset.accent = (s.settings && s.settings.accent) || 'teal'; };
applyTheme(store.get());
store.subscribe(applyTheme);

const shell = createShell(app);
startRouter(shell);

// Warm the most likely next page once the first one has settled.
window.addEventListener('load', () => { setTimeout(() => import('./pages/studio.js').catch(() => {}), 1500); });

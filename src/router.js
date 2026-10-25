// Hash router with lazy page modules, skeleton placeholders, a progress bar and
// enter animations. Pages are `export default async function (ctx) => Element`.
import { routes } from './routes.js';
import { html, mount } from './lib/dom.js';
import { skeleton, progress, observeReveal } from './lib/loading.js';
import { icon } from './components/icons.js';

let shell = null;
let navToken = 0;
let cleanups = [];

export function parseHash(h = location.hash) {
  const s = h.replace(/^#/, '') || '/';
  const [p, q = ''] = s.split('?');
  const path = (p.startsWith('/') ? p : '/' + p).replace(/\/+$/, '') || '/';
  return { path, query: new URLSearchParams(q) };
}
export const href = (path, params) => '#' + path + (params ? '?' + new URLSearchParams(params).toString() : '');
export function navigate(path, params) { location.hash = href(path, params).slice(1); }
export function replace(path, params) { try { history.replaceState(null, '', href(path, params)); } catch { location.hash = href(path, params).slice(1); return; } run(); }
export const matchRoute = (path) => routes.find((r) => r.path === path) || null;
export function prefetch(path) { const r = matchRoute(parseHash('#' + path).path); if (r) r.page().catch(() => {}); }
export const current = () => parseHash();

export function startRouter(s) {
  shell = s;
  window.addEventListener('hashchange', run);
  // Content added later (lazy sections, re-rendered regions) joins the scroll-reveal observer automatically.
  if ('MutationObserver' in window) {
    let queued = false;
    new MutationObserver(() => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; observeReveal(shell.outlet); }); })
      .observe(shell.outlet, { childList: true, subtree: true });
  }
  // Prefetch page code on link hover / focus — the chunk is usually ready before the click.
  document.addEventListener('mouseover', (e) => { const a = e.target.closest && e.target.closest('a[href^="#/"]'); if (a) prefetch(a.getAttribute('href').slice(1)); }, { passive: true });
  document.addEventListener('focusin', (e) => { const a = e.target.closest && e.target.closest('a[href^="#/"]'); if (a) prefetch(a.getAttribute('href').slice(1)); });
  run();
}

// Jump (not smooth-scroll) to the top; the document has `scroll-behavior: smooth` for in-page anchors.
function scrollTop() {
  const prev = document.documentElement.style.scrollBehavior;
  document.documentElement.style.scrollBehavior = 'auto';
  window.scrollTo(0, 0);
  document.documentElement.style.scrollBehavior = prev;
}

function errorView(err, retry) {
  const el = html`<div class="page"><div class="error-view card card--xl"><span class="dot-icon dot-icon--lg pill--outside" style="background:var(--status-outside-bg);color:var(--status-outside-fg)">${icon('alert-circle', { size: 20 })}</span><h2 class="h-sub">This page could not load</h2><p class="muted small">${err && err.message ? err.message : 'Something went wrong while loading the page.'}</p><div class="row gap-10"><button type="button" class="btn btn--primary btn--md" data-retry>Try again</button><a class="btn" href="#/">Back to library</a></div></div></div>`;
  el.querySelector('[data-retry]').addEventListener('click', retry);
  return el;
}

async function run() {
  const { path, query } = parseHash();
  let route = matchRoute(path);
  if (!route) { try { history.replaceState(null, '', '#/'); } catch { /* sandboxed origins may refuse */ } route = routes[0]; }
  const token = ++navToken;
  cleanups.splice(0).forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
  shell.setActive(route.nav);
  shell.setTitle(route.title);
  shell.closeNav();
  document.title = route.title + ' — The First Step';
  progress.start();
  const outlet = shell.outlet;
  mount(outlet, skeleton(route.skeleton));
  scrollTop();
  const ctx = {
    path, query, navigate, href, replace,
    onCleanup: (fn) => cleanups.push(fn),
    setTitle: (t) => shell.setTitle(t),
    isCurrent: () => token === navToken
  };
  try {
    const started = performance.now();
    const mod = await route.page();
    if (token !== navToken) return;
    const el = await mod.default(ctx);
    if (token !== navToken) return;
    // Keep the skeleton on screen long enough not to flash when a page resolves instantly.
    const elapsed = performance.now() - started;
    if (elapsed < 180) await new Promise((r) => setTimeout(r, 180 - elapsed));
    if (token !== navToken) return;
    mount(outlet, el);
    el.classList.add('page-enter');
    scrollTop();
    observeReveal(el);
    progress.done();
    const heading = outlet.querySelector('h2');
    if (heading && !heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
  } catch (err) {
    console.error(err);
    if (token !== navToken) return;
    progress.done();
    mount(outlet, errorView(err, () => run()));
  }
}

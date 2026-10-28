// Settings & Assets — administration shortcuts, role permissions, guideline versions and
// the image assets the toolkit ships with. Changes persist through api.updateSettings.
import { html, raw, $, $$, on, patch, fmt } from '../lib/dom.js';
import { api } from '../lib/api.js';
import { store } from '../lib/store.js';
import { loadStyle, withSpinner, toast, lazyImage, whenVisible, observeReveal, openDialog, sk } from '../lib/loading.js';
import { SPECIES, PALETTES } from '../lib/plan.js';

/* ---------- Inline SVGs copied from the design ---------- */
const svg = (size, body, stroke = 1.6, join = true) => raw(`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round"${join ? ' stroke-linejoin="round"' : ''} aria-hidden="true">${body}</svg>`);
const P = {
  grid4: '<rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect>',
  sun8: '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path>',
  sun: '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M2 12h2M20 12h2"></path>',
  leaf: '<path d="M5 19C5 9 11 4 20 4c0 9-5 15-15 15z"></path><path d="M5 19l8-8"></path>',
  palette3: '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-2 0-3 3 0 4-1 1-3 1-5a9 9 0 0 0-7-7z"></path><circle cx="7.5" cy="11.5" r="1"></circle><circle cx="10" cy="7.5" r="1"></circle><circle cx="15" cy="7.5" r="1"></circle>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-2 0-3 3 0 4-1 1-3 1-5a9 9 0 0 0-7-7z"></path>',
  card: '<rect x="3" y="6" width="18" height="12" rx="2"></rect><circle cx="12" cy="12" r="2.5"></circle>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"></path>',
  box: '<path d="M3 7l9-4 9 4-9 4z"></path><path d="M3 7v10l9 4 9-4V7M12 11v10"></path>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="9" cy="10" r="2"></circle><path d="M21 16l-5-5-8 8"></path>',
  book: '<path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z"></path><path d="M20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z"></path>',
  branch: '<circle cx="6" cy="6" r="2.5"></circle><circle cx="6" cy="18" r="2.5"></circle><circle cx="18" cy="12" r="2.5"></circle><path d="M6 8.5v7M8 7l8 4M8 17l8-4"></path>',
  shield: '<path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"></path><path d="M9 12l2 2 4-4"></path>',
  chevron: '<path d="M9 6l6 6-6 6"></path>',
  plus: '<path d="M12 5v14M5 12h14"></path>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"></path><circle cx="12" cy="12" r="3"></circle>',
  pencil: '<path d="M4 20h4l10-10-4-4L4 16z"></path><path d="M13 7l4 4"></path>',
  check: '<path d="M5 12l4 4 10-10"></path>',
  sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"></path><circle cx="16" cy="7" r="2"></circle><circle cx="10" cy="17" r="2"></circle>',
  upload: '<path d="M12 16V4M6 10l6-6 6 6M4 20h16"></path>',
  floor: '<rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M3 12h18M12 3v18"></path>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"></path><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"></path>',
  refresh: '<path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 4v5h5"></path>'
};

/* ---------- Static data ---------- */
// The image files shipped under ./assets/img, grouped under the design's asset categories.
const IMG = './assets/img/';
const ASSETS = [
  ['logo.png', 'Brand'],
  ['studio/classroom-iso.png', 'Classroom photos'],
  ['studio/led-pendant.png', 'Lighting products'], ['lighting/banner.png', 'Lighting products'], ['lighting/copper-pendants.png', 'Lighting products'],
  ['studio/plant-group.png', 'Plant species'], ['plants/banner.png', 'Plant species'], ['plants/pothos-self-watering.png', 'Plant species'], ['plants/cast-iron.png', 'Plant species'], ['plants/peperomia.png', 'Plant species'], ['plants/spider.png', 'Plant species'], ['plants/zz.png', 'Plant species'], ['plants/pothos.png', 'Plant species'], ['plants/thumb-zz.png', 'Plant species'], ['plants/thumb-cast-iron.png', 'Plant species'], ['plants/thumb-pothos.png', 'Plant species'], ['plants/thumb-peperomia.png', 'Plant species'], ['plants/thumb-spider.png', 'Plant species'],
  ['colour/banner.png', 'Materials, furniture'], ['colour/paint-samples.png', 'Materials, furniture']
].map(([name, cat]) => ({ src: IMG + name, name, cat }));
const CATEGORIES = [
  { name: 'Classroom photos', icon: P.image }, { name: 'Floor plans', icon: P.floor }, { name: 'Lighting products', icon: P.sun },
  { name: 'Plant species', icon: P.leaf }, { name: 'Materials, furniture', icon: P.palette }, { name: 'Brand', icon: P.grid4 }
];
const ROLES = [{ key: 'viewer', name: 'Viewer', count: '12 people' }, { key: 'designer', name: 'Designer', count: '4 people · you' }, { key: 'reviewer', name: 'Reviewer', count: '2 people' }, { key: 'admin', name: 'Administrator', count: '1 person' }];
const CAPS = [{ key: 'view', label: 'View', icon: P.eye }, { key: 'design', label: 'Design', icon: P.pencil }, { key: 'review', label: 'Review', icon: P.check }, { key: 'admin', label: 'Administer', icon: P.sliders }];
const DEFAULT_PERMISSIONS = {
  viewer: { view: true, design: false, review: false, admin: false },
  designer: { view: true, design: true, review: false, admin: false },
  reviewer: { view: true, design: true, review: true, admin: false },
  admin: { view: true, design: true, review: true, admin: true }
};
// Viewing is always allowed and the administrator keeps every right: those switches are locked.
const locked = (role, cap) => role === 'admin' || cap === 'view';
// Brand accent options from the design's "Brand" prop (main.js applies the choice as data-accent).
const ACCENTS = [{ key: 'teal', label: 'Teal', hex: '#579B96' }, { key: 'sage', label: 'Sage', hex: '#91A989' }, { key: 'gold', label: 'Gold', hex: '#E5C96C' }];

/* ---------- Derived data ---------- */
function versionHistory(S) {
  const cur = String(S.settings.guidelineVersion || '1.0');
  const [maj, min] = cur.split('.').map((n) => Number(n) || 0);
  const uses = S.rooms.filter((r) => r.status !== 'not-assessed').length;
  const drafted = S.settings.guidelineDraftedAt;
  const list = [{ v: cur, current: true, date: drafted ? fmt.date(drafted) : '6 Oct 2026', note: drafted ? 'new draft version' : 'added L7 transitions, P8 safety', uses: `${uses} plan${uses === 1 ? '' : 's'} use it` }];
  if (min >= 1) list.push({ v: `${maj}.${min - 1}`, date: '14 Aug 2026', note: 'species toxicity notes', uses: '1 plan uses it' });
  if (min >= 2) list.push({ v: `${maj}.${min - 2}`, date: '2 Jun 2026', note: 'first release', uses: '' });
  return list;
}
function adminTiles(S) {
  const ver = S.settings.guidelineVersion;
  const speciesN = Object.keys(SPECIES).length;
  const exceptionN = Object.values(SPECIES).filter((s) => /toxic/i.test(s.light)).length;
  const uploaded = S.assets.filter((a) => a.local).length;
  return [
    { href: '#/', icon: P.grid4, title: 'Classroom templates', sub: `${S.types.length} active · 0 archived` },
    { href: '#/guidelines/lighting', icon: P.sun8, title: 'Lighting guidelines', sub: `10 items · v${ver}` },
    { href: '#/guidelines/plants', icon: P.leaf, title: 'Species and safety', sub: `${speciesN} species · ${exceptionN} need${exceptionN === 1 ? 's' : ''} exception` },
    { href: '#/guidelines/colour', icon: P.palette3, title: 'Colour palettes', sub: `8 colours · ${Object.keys(PALETTES).length} palettes` },
    { href: '#/energy', icon: P.card, title: 'Cost assumptions', sub: 'LED A$180 · install A$100 · paint A$18/m²' },
    { href: '#/energy', icon: P.bolt, title: 'Electricity tariff', sub: `A$${Number(S.settings.tariff || 0).toFixed(2)}/kWh · entered, not USYD’s` },
    { action: 'suppliers', icon: P.box, title: 'Products and suppliers', sub: '4 approved fittings · [SUPPLIERS TO ADD]' },
    { scroll: 'assets', icon: P.image, title: 'Image assets', sub: `${S.assets.length - uploaded} bundled · ${uploaded} uploaded · API not configured` },
    { action: 'evidence', icon: P.book, title: 'Evidence references', sub: '3 supplied sources · WELL threshold to verify' },
    { scroll: 'versions', icon: P.branch, title: 'Guideline versions', sub: `v${ver} current · ${versionHistory(S).length - 1} earlier` },
    { href: '#/reports', icon: P.shield, title: 'Review rules', sub: 'Safety items can never be bypassed' }
  ];
}

/* ---------- Renderers ---------- */
function renderAdmin(S, { reveal = false } = {}) {
  return html`<div class="se-admin__grid">${adminTiles(S).map((t, i) => {
    const inner = html`<span class="se-tile__icon">${svg(20, t.icon)}</span><span class="se-tile__text"><span class="se-tile__title">${t.title}</span><span class="se-tile__sub">${t.sub}</span></span>${svg(18, P.chevron, 2)}`;
    const rv = reveal ? raw(`data-reveal style="--i:${i}"`) : '';
    if (t.action) return html`<button type="button" class="se-tile" data-action="${t.action}" ${rv}>${inner}</button>`;
    if (t.scroll) return html`<a class="se-tile" href="#/settings?section=${t.scroll}" data-scroll="${t.scroll}" ${rv}>${inner}</a>`;
    return html`<a class="se-tile" href="${t.href}" ${rv}>${inner}</a>`;
  })}</div>`;
}
function renderPermissions(S) {
  return html`<div class="se-perm"><table>
    <thead><tr><th>Role</th>${CAPS.map((c) => html`<th><span>${svg(16, c.icon)}${c.label}</span></th>`)}</tr></thead>
    <tbody>${ROLES.map((r) => html`<tr><td><span class="se-perm__role"><strong>${r.name}</strong><span class="se-perm__count">${r.count}</span></span></td>${CAPS.map((c) => {
      const onState = !!(S.permissions[r.key] && S.permissions[r.key][c.key]);
      return html`<td><input type="checkbox" class="switch" data-role="${r.key}" data-cap="${c.key}" data-key="perm-${r.key}-${c.key}" aria-label="${r.name} can ${c.label.toLowerCase()}" ${onState ? raw('checked') : ''} ${locked(r.key, c.key) ? raw('disabled') : ''}></td>`;
    })}</tr>`)}</tbody>
  </table></div>`;
}
function renderVersions(S) {
  const list = versionHistory(S);
  return html`<ol class="se-versions">${list.map((v, i) => html`<li class="se-ver ${v.current ? 'is-current' : ''}"><span class="se-ver__rail"><span class="se-ver__dot">${v.current ? svg(14, P.check, 3) : v.v}</span>${i < list.length - 1 ? raw('<span class="se-ver__line"></span>') : ''}</span><span class="se-ver__text"><span class="se-ver__name">v${v.v}${v.current ? ' · current' : ''}</span><span class="se-ver__meta">${[v.date, v.note, v.uses].filter(Boolean).join(' · ')}</span></span></li>`)}</ol>`;
}
function renderFilters(S) {
  const count = (name) => S.assets.filter((a) => a.cat === name).length;
  const chip = (key, label, n) => html`<button type="button" class="chip chip--sm" data-filter="${key}" data-key="filter-${key}" aria-pressed="${S.filter === key}">${label}${n ? html`<span class="muted-2">${n}</span>` : ''}</button>`;
  return html`<div class="se-filters" role="group" aria-label="Filter assets">${chip('all', 'All', S.assets.length)}${CATEGORIES.map((c) => chip(c.name, c.name, count(c.name)))}</div>`;
}
function renderGrid(S) {
  const list = S.filter === 'all' ? S.assets : S.assets.filter((a) => a.cat === S.filter);
  const cats = S.filter === 'all' ? CATEGORIES : CATEGORIES.filter((c) => c.name === S.filter);
  const tiles = list.map((a, i) => html`<figure class="se-asset" data-reveal style="--i:${i % 10}"><div class="se-asset__img">${lazyImage({ src: a.src, alt: a.name, ratio: '4 / 3', contain: /logo\.png$/.test(a.src) })}</div><figcaption class="se-asset__cap"><span class="se-asset__name" title="${a.name}">${a.name}</span><span class="se-asset__cat">${a.cat}${a.local ? ' · this session' : ''}</span></figcaption></figure>`);
  // Categories without a file keep the design's placeholder tile.
  cats.filter((c) => !S.assets.some((a) => a.cat === c.name)).forEach((c, i) => tiles.push(html`<div class="se-placeholder" data-reveal style="--i:${(list.length + i) % 10}">${svg(22, c.icon, 1.5)}${c.name}</div>`));
  if (S.filter === 'all') tiles.push(html`<div class="se-connect" data-reveal style="--i:${(tiles.length) % 10}">${svg(22, P.link, 1.5)}Image API · not configured<button type="button" class="btn se-btn-xs" data-action="connect">Connect</button></div>`);
  return html`<div class="se-grid">${tiles}</div>`;
}
const gridSkeleton = () => html`<div class="se-grid" aria-busy="true">${raw(Array.from({ length: 6 }, () => sk('100%', 'auto', 14, 'aspect-ratio:4/3')).join(''))}</div>`;

/* ---------- Page ---------- */
export default async function page(ctx) {
  await loadStyle(new URL('./settings.css', import.meta.url));
  const [settings, types, rooms] = await Promise.all([api.getSettings(), api.getTypes(), api.getRooms()]);
  const S = {
    settings, types, rooms,
    permissions: Object.fromEntries(ROLES.map((r) => [r.key, { ...DEFAULT_PERMISSIONS[r.key], ...((settings.permissions || {})[r.key] || {}) }])),
    assets: ASSETS.map((a) => ({ ...a })),
    filter: 'all'
  };

  const el = html`<div class="page se-page">
    <section class="page-intro__text" aria-label="Introduction" data-reveal><h2 class="display">Guidelines, assumptions and assets</h2><p class="lead">Everything the toolkit calculates from, in one place. Changes are versioned.</p></section>

    <section class="se-admin" aria-label="Administration">
      <div data-admin>${renderAdmin(S, { reveal: true })}</div>
      <div class="se-admin__foot" data-reveal style="--i:11">
        <div class="se-brand"><span>Brand accent</span><span class="se-brand__swatches" role="group" aria-label="Brand accent">${ACCENTS.map((a) => html`<button type="button" class="se-swatch" data-accent="${a.key}" data-key="accent-${a.key}" style="--sw:${a.hex}" aria-pressed="${(settings.accent || 'teal') === a.key}" aria-label="${a.label} accent" title="${a.label}"></button>`)}</span></div>
        <button type="button" class="btn se-btn-sm" data-reset>${svg(14, P.refresh, 2)}Reset demo data</button>
      </div>
    </section>

    <section class="se-card se-options" aria-label="Classrooms" data-reveal>
      <div class="se-card__head"><h3 class="se-card__title">Classrooms</h3></div>
      <p class="small muted">Off by default: a classroom type opens the Design Studio at its conditions straight away. Switch these on to keep a list of individual classroom records as well.</p>
      <div class="se-toggles">
        <label class="se-toggle"><span class="se-toggle__text"><strong>“Your classrooms” in the Library</strong><span class="tiny muted">The list of classroom records under the type cards, with photos, status and the Add classroom button.</span></span><input type="checkbox" class="switch" data-opt="showLibraryClassrooms" data-key="opt-library" ${settings.showLibraryClassrooms ? raw('checked') : ''}></label>
        <label class="se-toggle"><span class="se-toggle__text"><strong>“Classroom” step in the Design Studio</strong><span class="tiny muted">A first step to pick a classroom record before the conditions. When off, the Studio starts at Conditions.</span></span><input type="checkbox" class="switch" data-opt="showStudioClassroomStep" data-key="opt-studio" ${settings.showStudioClassroomStep ? raw('checked') : ''}></label>
      </div>
    </section>

    <div class="se-two">
      <section class="se-card" aria-label="Permissions" data-reveal>
        <div class="se-card__head"><h3 class="se-card__title">Permissions</h3><div class="se-card__actions"><span class="inline-loading" data-saving hidden><span class="spinner" aria-hidden="true"></span>Saving…</span><button type="button" class="btn se-btn-sm" data-action="invite">${svg(14, P.plus, 2, false)}Invite</button></div></div>
        <div data-permissions>${renderPermissions(S)}</div>
      </section>
      <section id="versions" class="se-card" aria-label="Guideline versions" data-reveal style="--i:1">
        <div class="se-card__head"><h3 class="se-card__title">Versions</h3><button type="button" class="btn se-btn-sm" data-new-version>${svg(14, P.plus, 2, false)}New draft version</button></div>
        <div data-versions>${renderVersions(S)}</div>
        <span class="se-foot-note">A plan keeps the version it was generated from.</span>
      </section>
    </div>

    <section id="assets" class="se-assets" aria-label="Image assets" data-reveal>
      <div class="se-assets__head"><h3 class="se-assets__title">Image assets</h3><div class="se-assets__btns"><button type="button" class="btn btn--primary se-btn-md" data-action="upload">${svg(14, P.upload, 2)}Upload</button><button type="button" class="btn se-btn-md" data-action="add-url">Add URL</button></div></div>
      <div data-filters>${renderFilters(S)}</div>
      <div data-grid>${gridSkeleton()}</div>
      <input type="file" accept="image/*" multiple hidden data-file>
    </section>

    <p class="se-foot" data-reveal>Items marked for verification need a lighting designer, electrician, horticultural specialist, facilities manager or fire-safety professional.</p>
  </div>`;

  const adminHost = $('[data-admin]', el), permHost = $('[data-permissions]', el), verHost = $('[data-versions]', el), filterHost = $('[data-filters]', el), gridHost = $('[data-grid]', el), fileInput = $('[data-file]', el), saving = $('[data-saving]', el);
  const refreshSettings = () => { S.settings = store.get().settings; };
  const redrawAssets = () => { patch(filterHost, renderFilters(S)); const g = renderGrid(S); patch(gridHost, g); observeReveal(g); patch(adminHost, renderAdmin(S)); };

  // The assets grid renders when it nears the viewport.
  let gridReady = false;
  const stopWatch = whenVisible(gridHost, () => { gridReady = true; const g = renderGrid(S); patch(gridHost, g); observeReveal(g); });
  ctx.onCleanup(stopWatch);

  // Section links from the administration tiles (and ?section= from other pages).
  const scrollTo = (id) => { const target = $('#' + id, el); if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  on(el, 'click', '[data-scroll]', (e, a) => { e.preventDefault(); scrollTo(a.dataset.scroll); });
  const wanted = ctx.query.get('section');
  if (wanted) setTimeout(() => { if (ctx.isCurrent()) scrollTo(wanted); }, 420);

  // Classroom options: each switch saves at once.
  on(el, 'change', 'input.switch[data-opt]', async (e, input) => {
    const key = input.dataset.opt; const value = input.checked;
    input.disabled = true;
    try { await api.updateSettings({ [key]: value }); refreshSettings(); toast(value ? 'Switched on' : 'Switched off', { timeout: 2000 }); }
    catch (err) { console.error(err); input.checked = !value; toast('Could not save that option', { kind: 'error' }); }
    finally { input.disabled = false; }
  });

  // Permissions: switches persist (debounced) to settings.permissions.
  let saveTimer = null;
  const flushSave = async () => { saveTimer = null; try { await api.updateSettings({ permissions: S.permissions }); refreshSettings(); toast('Saved'); } catch (err) { console.error(err); toast('Permissions could not be saved', { kind: 'error' }); } finally { saving.hidden = true; } };
  on(el, 'change', 'input.switch[data-role]', (e, input) => {
    const role = input.dataset.role, cap = input.dataset.cap;
    if (locked(role, cap)) return;
    S.permissions = { ...S.permissions, [role]: { ...S.permissions[role], [cap]: input.checked } };
    saving.hidden = false;
    clearTimeout(saveTimer); saveTimer = setTimeout(flushSave, 600);
  });
  ctx.onCleanup(() => { if (saveTimer) { clearTimeout(saveTimer); api.updateSettings({ permissions: S.permissions }).catch(() => {}); } });

  // Brand accent: applied instantly by main.js once the setting is stored.
  on(el, 'click', '[data-accent]', async (e, btn) => {
    const key = btn.dataset.accent; const a = ACCENTS.find((x) => x.key === key); if (!a) return;
    $$('[data-accent]', el).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.accent === key)));
    try { await api.updateSettings({ accent: key }); refreshSettings(); toast(`${a.label} accent applied`); }
    catch (err) { console.error(err); toast('The accent could not be saved', { kind: 'error' }); }
  });

  // New draft version: bumps the minor version and marks it as the current draft.
  on(el, 'click', '[data-new-version]', async (e, btn) => {
    const [maj, min] = String(S.settings.guidelineVersion || '1.0').split('.').map((n) => Number(n) || 0);
    const next = `${maj}.${min + 1}`;
    try {
      await withSpinner(btn, () => api.updateSettings({ guidelineVersion: next, guidelineDraftedAt: Date.now() }), { busyLabel: 'Creating…', doneLabel: 'Created' });
      refreshSettings(); patch(verHost, renderVersions(S)); patch(adminHost, renderAdmin(S));
      toast(`Draft v${next} created — plans keep the version they were generated from`);
    } catch (err) { console.error(err); toast('The draft could not be created', { kind: 'error' }); }
  });

  // Reset demo data (confirmed in a dialog), then reload the page from the seed.
  on(el, 'click', '[data-reset]', () => {
    const body = html`<div class="stack gap-12"><h3 class="h-sub">Reset demo data?</h3><p class="muted small">Classrooms, plans, reviews, notifications and settings go back to the seed. This cannot be undone.</p><div class="dialog__actions"><button type="button" class="btn" data-cancel>Cancel</button><button type="button" class="btn btn--primary btn--md" data-confirm>Reset demo data</button></div></div>`;
    const { close } = openDialog(body);
    $('[data-cancel]', body).addEventListener('click', close);
    $('[data-confirm]', body).addEventListener('click', async (e) => {
      try { await withSpinner(e.currentTarget, () => api.resetDemoData(), { busyLabel: 'Resetting…', doneLabel: 'Reset', doneMs: 500 }); close(); toast('Demo data reset to the seed'); ctx.replace('/settings'); }
      catch (err) { console.error(err); toast('The demo data could not be reset', { kind: 'error' }); }
    });
  });

  // Assets: filter chips, uploads (local previews for this session), add by URL.
  on(el, 'click', '[data-filter]', (e, btn) => { S.filter = btn.dataset.filter; if (!gridReady) return; redrawAssets(); });
  on(el, 'click', '[data-action="upload"]', () => { fileInput.value = ''; fileInput.click(); });
  fileInput.addEventListener('change', () => {
    const files = Array.from(fileInput.files || []); if (!files.length) return;
    files.forEach((f) => S.assets.push({ src: URL.createObjectURL(f), name: f.name, cat: 'Classroom photos', local: true }));
    gridReady = true; redrawAssets();
    toast(`${files.length} image${files.length === 1 ? '' : 's'} added to Classroom photos (this session only)`);
  });
  ctx.onCleanup(() => S.assets.filter((a) => a.local && a.src.startsWith('blob:')).forEach((a) => URL.revokeObjectURL(a.src)));
  on(el, 'click', '[data-action="add-url"]', () => {
    const body = html`<form class="stack gap-16"><h3 class="h-sub">Add an image by URL</h3><label class="field"><span class="field__label">Image URL</span><input class="input" type="url" name="url" placeholder="https://…" required></label><label class="field"><span class="field__label">Category</span><select class="select" name="cat">${CATEGORIES.map((c) => html`<option value="${c.name}">${c.name}</option>`)}</select></label><div class="dialog__actions"><button type="button" class="btn" data-cancel>Cancel</button><button type="submit" class="btn btn--primary btn--md">Add image</button></div></form>`;
    const { close } = openDialog(body);
    $('[data-cancel]', body).addEventListener('click', close);
    body.addEventListener('submit', (e) => {
      e.preventDefault();
      const url = body.elements.url.value.trim(); const cat = body.elements.cat.value;
      if (!/^https?:\/\//i.test(url)) { toast('Enter a full http(s) image URL', { kind: 'info' }); return; }
      S.assets.push({ src: url, name: (url.split('/').pop() || url).split('?')[0] || url, cat, local: true });
      close(); gridReady = true; redrawAssets(); toast(`Image added to ${cat} (this session only)`);
    });
  });
  on(el, 'click', '[data-action="connect"]', () => toast('The image API is not configured in this demo', { kind: 'info' }));
  on(el, 'click', '[data-action="invite"]', () => toast('Invitations are sent from the university directory — not enabled in this demo', { kind: 'info' }));
  on(el, 'click', '[data-action="suppliers"]', () => toast('Supplier list not configured yet — 4 approved fittings on file', { kind: 'info' }));
  on(el, 'click', '[data-action="evidence"]', () => toast('3 supplied sources on file · WELL threshold still to verify', { kind: 'info' }));
  return el;
}

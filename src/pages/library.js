// Classroom Library — the landing screen. Ten classroom types to start from (filterable
// by intervention and by the header search), a dashed "add" tile, and the user's own
// classrooms. Both grids re-render in place with patch(); everything else is static.
import { html, raw, esc, $, $$, on, patch } from '../lib/dom.js';
import { icon } from '../components/icons.js';
import { button, dotIcon, roomStatusPill, emptyState, roomThumb } from '../components/ui.js';
import { api } from '../lib/api.js';
import { loadStyle, openDialog, withSpinner, toast } from '../lib/loading.js';
import { TYPES } from '../data/types.js';
import { roomMeta } from '../data/rooms.js';
import { COND_LABEL } from '../lib/plan.js';
import { photoUrlsFor, setPhoto, pickImage } from '../lib/photos.js';

/* ---------- Filter chips (copy from the design) ---------- */
const FILTERS = [
  { key: 'all', label: 'All types' },
  { key: 'lighting', label: 'Lighting', icon: 'sun' },
  { key: 'plants', label: 'Plants', icon: 'leaf' },
  { key: 'colour', label: 'Colour', icon: 'palette' }
];

/* ---------- Tile illustrations, copied verbatim from design/Main.dc.html ----------
   Keyed by type id (01 → low-light … 10 → mixed). The <svg> wrapper (160×100 viewBox,
   stroke 1.6, round caps) is built by illo(); its stroke colour is var(--primary). */
const ILLOS = {
  'low-light': '<rect x="18" y="18" width="124" height="68" rx="3"></rect><rect x="28" y="30" width="18" height="16" rx="1"></rect><path d="M37 30v16M28 38h18"></path><path d="M80 18v12"></path><path d="M66 30h28l5 10H61z"></path><path d="M72 46l-6 12M88 46l6 12"></path><rect x="58" y="62" width="44" height="12" rx="2"></rect><path d="M64 74v12M96 74v12"></path>',
  'glare-prone': '<rect x="30" y="18" width="100" height="64" rx="3"></rect><path d="M80 18v64M30 50h100"></path><circle cx="108" cy="36" r="9"></circle><path d="M108 22v4M108 46v4M94 36h4M118 36h4M98 26l3 3M115 43l3 3M98 46l3-3M115 29l3-3"></path><path d="M32 82l36-36" stroke-dasharray="3 4"></path><path d="M46 82l36-36" stroke-dasharray="3 4"></path>',
  fluorescent: '<rect x="24" y="22" width="112" height="12" rx="6"></rect><rect x="24" y="44" width="112" height="12" rx="6"></rect><rect x="24" y="66" width="112" height="12" rx="6"></rect><path d="M40 28h80M40 50h80M40 72h80" stroke-dasharray="2 5"></path><path d="M142 20l4 6-4 6 4 6" stroke-width="1.4"></path>',
  'high-sensory': '<rect x="18" y="18" width="124" height="68" rx="3"></rect><rect x="26" y="26" width="26" height="20"></rect><path d="M60 46l10-20 10 20z"></path><circle cx="104" cy="36" r="10"></circle><path d="M120 26l6 8-6 8 6 8"></path><rect x="26" y="54" width="36" height="24"></rect><path d="M70 56h40M70 64h40M70 72h28"></path><path d="M118 56l16 16M134 56l-16 16"></path>',
  'plant-ready': '<rect x="96" y="22" width="40" height="34" rx="2"></rect><path d="M116 22v34M96 39h40"></path><path d="M44 64h40l-5 22H49z"></path><path d="M64 64V40"></path><path d="M64 52c-14-2-20-10-22-20 10 1 18 7 22 20z"></path><path d="M64 46c14-2 20-10 22-20-10 1-18 7-22 20z"></path><path d="M64 40c-2-8 0-14 6-18"></path><path d="M20 86h120"></path>',
  compact: '<rect x="50" y="22" width="60" height="58" rx="3"></rect><rect x="58" y="32" width="18" height="10" rx="1"></rect><rect x="84" y="32" width="18" height="10" rx="1"></rect><rect x="58" y="50" width="18" height="10" rx="1"></rect><rect x="84" y="50" width="18" height="10" rx="1"></rect><path d="M28 51h14M38 46l4 5-4 5M132 51h-14M122 46l-4 5 4 5"></path><path d="M70 80v-8h20v8"></path>',
  large: '<rect x="14" y="20" width="132" height="62" rx="3"></rect><path d="M58 20v62M102 20v62" stroke-dasharray="3 4"></path><rect x="22" y="32" width="26" height="8" rx="1"></rect><rect x="22" y="48" width="26" height="8" rx="1"></rect><rect x="22" y="64" width="26" height="8" rx="1"></rect><rect x="66" y="32" width="26" height="8" rx="1"></rect><rect x="66" y="48" width="26" height="8" rx="1"></rect><rect x="66" y="64" width="26" height="8" rx="1"></rect><rect x="110" y="32" width="26" height="8" rx="1"></rect><rect x="110" y="48" width="26" height="8" rx="1"></rect><rect x="110" y="64" width="26" height="8" rx="1"></rect>',
  'computer-lab': '<rect x="22" y="34" width="32" height="22" rx="2"></rect><path d="M38 56v8M30 64h16"></path><rect x="64" y="34" width="32" height="22" rx="2"></rect><path d="M80 56v8M72 64h16"></path><rect x="106" y="34" width="32" height="22" rx="2"></rect><path d="M122 56v8M114 64h16"></path><path d="M14 72h132"></path><path d="M28 40l8 10M70 40l8 10M112 40l8 10" stroke-width="1.2"></path>',
  seminar: '<ellipse cx="80" cy="52" rx="34" ry="20"></ellipse><circle cx="80" cy="22" r="6"></circle><circle cx="80" cy="82" r="6"></circle><circle cx="42" cy="36" r="6"></circle><circle cx="118" cy="36" r="6"></circle><circle cx="42" cy="68" r="6"></circle><circle cx="118" cy="68" r="6"></circle>',
  mixed: '<rect x="18" y="18" width="124" height="68" rx="3"></rect><rect x="30" y="20" width="60" height="9" rx="4.5"></rect><rect x="100" y="28" width="32" height="26" rx="1"></rect><path d="M116 28v26M100 41h32"></path><circle cx="124" cy="36" r="4"></circle><path d="M40 78h20l-3 8H43z"></path><path d="M50 78V62"></path><path d="M50 70c-8-1-12-6-13-12 6 1 11 5 13 12zM50 66c8-1 12-6 13-12-6 1-11 5-13 12z"></path><path d="M70 60l6 6-6 6 6 6" stroke-width="1.3"></path>'
};
const illo = (t) => raw(`<svg class="lib-illo" width="200" height="125" viewBox="0 0 160 100" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="${esc(t.illo)}">${ILLOS[t.id] || ''}</svg>`);

/* ---------- Small chip icons the shared icon set does not have (from the design) ---------- */
const LOCAL_ICONS = {
  'sun-low': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>',
  screen: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8"/>',
  'clock-start': '<circle cx="12" cy="12" r="9"/><path d="M12 8v4l2 2"/>'
};
const chipIcon = (name, size = 14, stroke = 1.8) => LOCAL_ICONS[name]
  ? raw(`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${LOCAL_ICONS[name]}</svg>`)
  : icon(name, { size, stroke });

/* ---------- "Your classrooms" chips: exact copy for the seeded rooms, derived otherwise ---------- */
const ROOM_CHIPS = {
  sr01: [['tube', 'Fluorescent'], ['sun-low', 'Low daylight'], ['leaf', 'No plants']],
  clb04: [['square', 'LED, fixed'], ['sun-low', 'No daylight'], ['screen', 'Screen glare']],
  st214: [['square', 'LED'], ['sun', 'Strong daylight'], ['leaf', '2 plants']],
  gs07: [['square', 'LED, dimmable'], ['sun', 'Good daylight'], ['leaf', 'Plants planned']],
  tr305: [['tube', 'Fluorescent'], ['clock-start', 'Start in Studio']],
  lt110: [['tube', 'Mixed lighting'], ['clock-start', 'Start in Studio']]
};
function chipsFor(r) {
  if (ROOM_CHIPS[r.id]) return ROOM_CHIPS[r.id];
  const c = r.cond || {};
  const lighting = [c.lighting === 'fluorescent' ? 'tube' : 'square', r.lightingLabel || (COND_LABEL.lighting && COND_LABEL.lighting[c.lighting]) || 'Lighting'];
  if (r.status === 'not-assessed' || !r.status) return [lighting, ['clock-start', 'Start in Studio']];
  const daylight = c.daylight === 'low' ? ['sun-low', 'Low daylight'] : c.daylight === 'strong' ? ['sun', 'Strong daylight'] : ['sun', 'Good daylight'];
  const third = c.glare === 'strong' ? ['screen', 'Strong glare']
    : c.plants === 'plenty' ? ['leaf', 'Well planted']
    : c.plants === 'some' ? ['leaf', 'Some plants']
    : c.walls === 'glossy' ? ['square', 'Glossy walls']
    : ['leaf', 'No plants'];
  return [lighting, daylight, third];
}

/* ---------- Search helpers ---------- */
const norm = (s) => String(s == null ? '' : s).toLowerCase().trim();
const matches = (q, ...fields) => !q || fields.some((f) => norm(f).includes(q));

/* ---------- Tile builders. `swap` = re-render (fade-swap) vs first paint (data-reveal) ---------- */
const cell = (i, swap, extra = '') => raw(`class="lib-cell ${extra} ${swap ? 'fade-swap' : ''}" ${swap ? '' : 'data-reveal'} style="--i:${Number(i) || 0}"`);

function typeTile(ctx, t, i, swap) {
  const f = t.focus || {};
  return html`<div ${cell(i, swap)}>
    <a class="tile" href="${ctx.href('/studio', { type: t.id })}" data-key="type-${t.id}">
      <div class="tile__media">${illo(t)}<span class="tile__num">${t.num}</span></div>
      <div class="tile__body">
        <div class="row between gap-10"><span class="tile__title">${t.name}</span>${icon('arrow-right', { size: 20, stroke: 2 })}</div>
        <span class="tile__sub">${t.sub}</span>
        <div class="tile__foot">
          <div class="row gap-6">${dotIcon('sun', !!f.lighting, f.lighting ? 'Lighting intervention' : 'Lighting not a focus')}${dotIcon('leaf', !!f.plants, f.plants ? 'Plant intervention' : 'Plants not a focus')}${dotIcon('palette', !!f.colour, f.colour ? 'Colour intervention' : 'Colour not a focus')}</div>
          <span class="lib-size"><span class="dot-icon dot-icon--sm">${icon('expand', { size: 14, stroke: 1.8 })}</span>Typical size ${t.size}</span>
        </div>
        <span class="link">Recommended Changes</span>
      </div>
    </a>
  </div>`;
}

const addTile = (i, swap) => html`<div ${cell(i, swap)}><button type="button" class="dash-tile" data-add><span class="dash-tile__plus">${icon('plus', { size: 20, stroke: 1.8 })}</span>Add a classroom type</button></div>`;

function roomTile(ctx, r, i, swap, photo) {
  return html`<div ${cell(i, swap, 'lib-room')}>
    <a class="tile tile--row" href="${ctx.href('/studio', { room: r.id })}" data-key="room-${r.id}">
      ${roomThumb(r, photo)}
      <span class="stack gap-6 grow">
        <span class="row between gap-8"><span class="h-item">${r.name}</span>${roomStatusPill(r)}</span>
        <span class="tiny muted">${roomMeta(r)}</span>
        <span class="lib-chips">${chipsFor(r).map(([name, text]) => html`<span class="lib-chip">${chipIcon(name)}${text}</span>`)}</span>
      </span>
    </a>
    <button type="button" class="lib-photo-btn" data-photo="${r.id}" data-key="photo-${r.id}" aria-label="${photo ? 'Change photo for' : 'Add photo for'} ${r.name}" title="${photo ? 'Change photo' : 'Add photo'}">${icon(photo ? 'pencil' : 'plus', { size: 13, stroke: 2.2 })}</button>
  </div>`;
}

const spanCell = (swap, node) => html`<div class="lib-cell lib-cell--span ${swap ? 'fade-swap' : ''}">${node}</div>`;

/* ---------- "New classroom" dialog ---------- */
function openNewRoom(ctx, { rooms, typeId, onClose }) {
  const buildings = Array.from(new Set(rooms.map((r) => r.building).filter(Boolean)));
  const form = html`<form class="stack gap-18 lib-form">
    <div class="stack gap-4">
      <h2 class="h-sub" id="lib-new-title">New classroom</h2>
      <p class="small muted">Add a room to your list, then refine its conditions and plan in the Design Studio.</p>
    </div>
    <div class="lib-form__grid">
      <label class="field lib-form__wide"><span class="field__label">Name</span><input class="input" name="name" required maxlength="60" placeholder="e.g. Seminar Room 02" autocomplete="off"></label>
      <label class="field"><span class="field__label">Building</span><input class="input" name="building" required maxlength="60" list="lib-buildings" placeholder="e.g. Teaching Block A" autocomplete="off"></label>
      <datalist id="lib-buildings">${buildings.map((b) => html`<option value="${b}"></option>`)}</datalist>
      <label class="field"><span class="field__label">Level</span><input class="input" name="level" required maxlength="12" placeholder="e.g. L2" autocomplete="off"></label>
      <label class="field"><span class="field__label">Area (m²)</span><input class="input" name="area" type="number" inputmode="numeric" min="10" max="600" step="1" required placeholder="e.g. 58"></label>
      <label class="field"><span class="field__label">Starting type</span><select class="select" name="type">${TYPES.map((t) => html`<option value="${t.id}" ${t.id === typeId ? raw('selected') : ''}>${t.num} · ${t.name}</option>`)}</select></label>
      <label class="field lib-form__wide"><span class="field__label">Photo (optional)</span><input class="input lib-file" type="file" name="photo" accept="image/*"></label>
    </div>
    <div class="dialog__actions">
      <button type="button" class="btn" data-cancel>Cancel</button>
      <button type="submit" class="btn btn--primary btn--md">${icon('plus', { size: 16, stroke: 2 })}<span>Add classroom</span></button>
    </div>
  </form>`;
  const { dlg, close } = openDialog(form, { onClose });
  dlg.setAttribute('aria-labelledby', 'lib-new-title');
  $('[data-cancel]', form).addEventListener('click', close);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const fd = new FormData(form);
    const payload = {
      name: String(fd.get('name') || '').trim(),
      building: String(fd.get('building') || '').trim(),
      level: String(fd.get('level') || '').trim(),
      area: Number(fd.get('area')),
      typeId: String(fd.get('type') || TYPES[0].id)
    };
    const btn = $('button[type="submit"]', form);
    try {
      const photoFile = fd.get('photo');
      const room = await withSpinner(btn, async () => {
        const added = await api.addRoom(payload);
        if (photoFile && photoFile.size) { try { await setPhoto(added.id, photoFile); } catch (err) { console.error(err); toast('The classroom was added, but its photo could not be saved.', { kind: 'error' }); } }
        return added;
      }, { busyLabel: 'Adding…' });
      if (!room) return; // the button was already busy
      close();
      toast('Classroom added');
      ctx.navigate('/studio', { room: room.id });
    } catch (err) {
      console.error(err);
      toast('Could not add the classroom. Please try again.', { kind: 'error' });
    }
  });
  return { dlg, close };
}

/* ---------- Page ---------- */
export default async function page(ctx) {
  await loadStyle(new URL('./library.css', import.meta.url));
  const rooms = await api.getRooms();
  const photos = await photoUrlsFor(rooms);

  let filter = 'all';
  let queryRaw = String(ctx.query.get('q') || '').trim();
  let query = norm(queryRaw);
  let dialog = null;

  // Arriving with ?q= (e.g. from another page's search submit): mirror it in the header box.
  const headerInput = document.getElementById('app-search');
  if (headerInput && query && norm(headerInput.value) !== query) headerInput.value = queryRaw;

  const el = html`<div class="page lib">
    <section class="page-intro" aria-label="Introduction">
      <div class="page-intro__text">
        <h2 class="display">Choose a classroom type to start</h2>
        <p class="lead">Ten adaptable starting points. Pick the closest match, then tailor lighting, plants and colour in the Design Studio.</p>
      </div>
      ${button({ label: 'Open Design Studio', icon: 'arrow-right', variant: 'btn--primary', href: '#/studio', iconRight: true, size: 18 })}
    </section>

    <div class="row wrap gap-8 lib-filters" role="group" aria-label="Filter by intervention">
      ${FILTERS.map((f) => html`<button type="button" class="chip" data-filter="${f.key}" aria-pressed="${f.key === filter}">${f.icon ? icon(f.icon, { size: 16, stroke: 1.6 }) : ''}${f.label}</button>`)}
      <span class="note ml-auto">${icon('info', { size: 14, stroke: 1.8 })}Illustrative example data</span>
    </div>
    <p class="sr-only" role="status" data-status></p>

    <section class="grid grid--tiles lib-tiles" aria-label="Classroom types" data-types></section>

    <section class="section lib-rooms" aria-label="Your classrooms">
      <div class="section-head" data-reveal style="--i:0">
        <h2 class="h-section">Your classrooms</h2>
        <button type="button" class="btn lib-add" data-add>${icon('plus', { size: 16, stroke: 1.8 })}Add classroom</button>
      </div>
      <div class="grid grid--tiles lib-rooms__grid" data-rooms></div>
    </section>
  </div>`;

  const typesHost = $('[data-types]', el);
  const roomsHost = $('[data-rooms]', el);
  const status = $('[data-status]', el);

  const visibleTypes = () => TYPES.filter((t) => (filter === 'all' || (t.focus && t.focus[filter])) && matches(query, t.name, t.sub, t.num));
  const visibleRooms = () => rooms.filter((r) => matches(query, r.name, r.building));

  function renderTypes(swap = false) {
    const list = visibleTypes();
    const nodes = list.map((t, i) => typeTile(ctx, t, i, swap));
    if (list.length) nodes.push(addTile(list.length, swap));
    else nodes.push(spanCell(swap, emptyState(
      'No classroom types match',
      query ? `Nothing matches “${queryRaw}” here. Try another word or show all types.` : 'Try a different filter.',
      html`<button type="button" class="btn btn--sm" data-reset>Show all types</button>`
    )));
    patch(typesHost, html`${nodes}`);
    status.textContent = `${list.length} of ${TYPES.length} classroom types shown`;
  }

  function renderRooms(swap = false) {
    const list = visibleRooms();
    const nodes = list.length
      ? list.map((r, i) => roomTile(ctx, r, i + 1, swap, photos[r.id]))
      : [spanCell(swap, emptyState(
        rooms.length ? 'No classrooms match' : 'No classrooms yet',
        rooms.length ? `Nothing in your list matches “${queryRaw}”.` : 'Add a classroom to start planning it in the Design Studio.',
        html`<button type="button" class="btn btn--sm lib-add" data-add>${icon('plus', { size: 14, stroke: 1.8 })}Add classroom</button>`
      ))];
    patch(roomsHost, html`${nodes}`);
  }

  // Apply a filter and/or query change and re-render only what it affects.
  function update({ filter: nextFilter = filter, query: nextRaw = queryRaw } = {}) {
    nextRaw = String(nextRaw == null ? '' : nextRaw).trim();
    const nextQuery = norm(nextRaw);
    const typesChanged = nextFilter !== filter || nextQuery !== query;
    const roomsChanged = nextQuery !== query;
    filter = nextFilter; queryRaw = nextRaw; query = nextQuery;
    $$('[data-filter]', el).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
    if (typesChanged) renderTypes(true);
    if (roomsChanged) renderRooms(true);
  }

  renderTypes(false);
  renderRooms(false);

  on(el, 'click', '[data-filter]', (e, btn) => update({ filter: btn.dataset.filter }));
  on(el, 'click', '[data-reset]', () => { if (headerInput) headerInput.value = ''; update({ filter: 'all', query: '' }); });
  on(el, 'click', '[data-add]', () => {
    if (dialog) return;
    const first = visibleTypes()[0];
    dialog = openNewRoom(ctx, { rooms, typeId: filter !== 'all' && first ? first.id : TYPES[0].id, onClose: () => { dialog = null; } });
  });

  // Add or change a classroom photo from its card (stored on this device, resized on the way in).
  on(el, 'click', '[data-photo]', async (e, btn) => {
    e.preventDefault();
    const id = btn.dataset.photo;
    const room = rooms.find((r) => r.id === id);
    const file = await pickImage();
    if (!file || !room) return;
    btn.disabled = true; btn.innerHTML = '<span class="spinner" aria-hidden="true" style="width:12px;height:12px;flex-basis:12px"></span>';
    try {
      photos[id] = await setPhoto(id, file);
      renderRooms(true);
      toast(`Photo added to ${room.name}`);
    } catch (err) {
      console.error(err);
      renderRooms(true);
      toast(err && err.message ? err.message : 'That photo could not be saved.', { kind: 'error' });
    }
  });
  const onPhoto = (e) => { if (e.detail && e.detail.roomId in photos) { photos[e.detail.roomId] = e.detail.url || rooms.find((r) => r.id === e.detail.roomId)?.photo || null; renderRooms(true); } };
  window.addEventListener('app:photo', onPhoto);

  // Live search from the header (debounced by the shell).
  const onSearch = (e) => { if (e.detail && typeof e.detail.query === 'string') update({ query: e.detail.query }); };
  window.addEventListener('app:search', onSearch);
  ctx.onCleanup(() => {
    window.removeEventListener('app:search', onSearch);
    window.removeEventListener('app:photo', onPhoto);
    if (dialog) dialog.close();
  });

  return el;
}

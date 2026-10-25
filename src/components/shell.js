// App shell: sidebar navigation, header (title, search, notifications, account) and the
// page outlet. Matches the chrome shared by every artboard in the design.
import { html, $, $$, on, fmt } from '../lib/dom.js';
import { icon } from './icons.js';
import { store, unreadCount } from '../lib/store.js';
import { api } from '../lib/api.js';
import { CURRENT_USER } from '../lib/constants.js';

export const NAV = [
  { key: 'library', label: 'Classroom Library', path: '/', icon: 'grid' },
  { key: 'studio', label: 'Design Studio', path: '/studio', icon: 'layers' },
  { key: 'guidelines', label: 'Design Guidelines', path: '/guidelines/lighting', icon: 'doc', children: [
    { key: 'lighting', label: 'Lighting', path: '/guidelines/lighting', icon: 'sun' },
    { key: 'plants', label: 'Plants', path: '/guidelines/plants', icon: 'leaf' },
    { key: 'colour', label: 'Colour & Material', path: '/guidelines/colour', icon: 'palette' }
  ] },
  { key: 'impact', label: 'Impact & Outcomes', path: '/impact', icon: 'trend' }
];
export const NAV_BOTTOM = [
  { key: 'energy', label: 'Energy & Savings', path: '/energy', icon: 'bolt' },
  { key: 'reports', label: 'Reports', path: '/reports', icon: 'clipboard' }
];

const link = (item, sub = false) => html`<a class="nav__link ${sub ? 'nav__link--sub' : ''}" href="#${item.path}" data-nav="${item.key}" title="${item.label}">${icon(item.icon, { size: sub ? 16 : 18, stroke: sub ? 1.7 : 1.6 })}<span class="nav__label">${item.label}</span></a>`;

export function createShell(app) {
  const collapsed = !!store.get().ui.navCollapsed;
  const el = html`
    <div class="app-inner" style="display:contents">
      <div class="scrim" data-scrim></div>
      <nav class="nav ${collapsed ? 'is-collapsed' : ''}" aria-label="Main navigation">
        <a href="#/" class="nav__logo" aria-label="The First Step, home"><img src="./assets/img/logo.png" alt="The First Step — Strategy Initiative" width="188" height="65"></a>
        <a href="#/" class="nav__mark" aria-label="The First Step, home"><svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><rect x="2" y="12" width="7" height="7" fill="#E89C8E"/><rect x="9" y="5" width="7" height="14" fill="#E89C8E"/><circle cx="30" cy="12" r="8" fill="#EA8571"/><path d="M4 36c0-8 6-13 14-13-1 8-6 13-14 13z" fill="#5CA39B"/><circle cx="30" cy="30" r="4" fill="#E9C84A"/><path d="M30 20v4M30 36v4M20 30h4M36 30h4M23 23l3 3M34 34l3 3M23 37l3-3M34 26l3-3" stroke="#E9C84A" stroke-width="2.4" stroke-linecap="round"/></svg></a>
        <div class="nav__group" data-nav-top></div>
        <div class="nav__group nav__bottom">
          <span class="nav__sep" aria-hidden="true"></span>
          <div class="nav__group" data-nav-bottom></div>
          <button type="button" class="nav__link nav__collapse" data-collapse aria-pressed="${collapsed}">${icon('chevron-left', { size: 16 })}<span class="nav__label">Collapse</span></button>
        </div>
      </nav>
      <main class="main">
        <header class="header">
          <button type="button" class="btn btn--icon menu-btn" aria-label="Open navigation" data-menu>${icon('menu', { size: 18 })}</button>
          <h1 class="header__title" data-title>Classroom Library</h1>
          <form class="search" role="search" data-search>
            ${icon('search', { size: 16, stroke: 1.8, className: 'search__icon' })}
            <label for="app-search" class="sr-only">Search</label>
            <input id="app-search" type="search" placeholder="Search" autocomplete="off">
          </form>
          <div class="header__actions">
            <span class="header__bell">
              <button type="button" class="btn btn--icon" aria-label="Notifications" aria-haspopup="true" aria-expanded="false" data-bell>${icon('bell', { size: 18 })}</button>
              <span class="badge" data-badge hidden>0</span>
            </span>
            <a class="avatar" href="#/settings" aria-label="Account, ${CURRENT_USER.name}. Open settings">${CURRENT_USER.initials}</a>
          </div>
        </header>
        <div class="outlet" data-outlet></div>
      </main>
    </div>`;
  app.replaceChildren(el);

  const nav = $('.nav', app);
  const top = $('[data-nav-top]', app);
  const bottom = $('[data-nav-bottom]', app);
  NAV.forEach((item) => { top.append(link(item)); (item.children || []).forEach((c) => top.append(link(c, true))); });
  NAV_BOTTOM.forEach((item) => bottom.append(link(item)));

  const outlet = $('[data-outlet]', app);
  const titleEl = $('[data-title]', app);
  const badge = $('[data-badge]', app);
  const bell = $('[data-bell]', app);
  const bellWrap = $('.header__bell', app);
  const searchInput = $('#app-search', app);
  const scrim = $('[data-scrim]', app);

  // Collapse / mobile open
  $('[data-collapse]', app).addEventListener('click', () => {
    const next = !nav.classList.contains('is-collapsed');
    nav.classList.toggle('is-collapsed', next);
    $('[data-collapse]', app).setAttribute('aria-pressed', String(next));
    api.setUi({ navCollapsed: next });
  });
  const openNav = (open) => { nav.classList.toggle('is-open', open); scrim.classList.toggle('is-open', open); $('[data-menu]', app).setAttribute('aria-expanded', String(open)); };
  $('[data-menu]', app).addEventListener('click', () => openNav(!nav.classList.contains('is-open')));
  scrim.addEventListener('click', () => openNav(false));

  // Search: live filter event for the current page; Enter jumps to the library.
  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => window.dispatchEvent(new CustomEvent('app:search', { detail: { query: searchInput.value.trim() } })), 120);
  });
  $('[data-search]', app).addEventListener('submit', (e) => {
    e.preventDefault();
    const q = searchInput.value.trim();
    if (!location.hash.startsWith('#/?') && location.hash !== '#/' && location.hash !== '') location.hash = '/?q=' + encodeURIComponent(q);
    else window.dispatchEvent(new CustomEvent('app:search', { detail: { query: q } }));
  });

  // Notifications popover
  let pop = null;
  const closePop = () => { if (pop) { pop.remove(); pop = null; bell.setAttribute('aria-expanded', 'false'); } };
  const renderBadge = (s) => { const n = unreadCount(s); badge.hidden = n === 0; badge.textContent = String(n); };
  renderBadge(store.get());
  bell.addEventListener('click', async () => {
    if (pop) return closePop();
    const items = store.get().notifications;
    pop = html`<div class="popover" role="dialog" aria-label="Notifications">
      <div class="popover__head"><span>Notifications</span><button type="button" class="btn btn--text" data-mark>Mark all read</button></div>
      <div class="stack gap-2" data-list>
        ${items.length ? items.slice(0, 6).map((n) => html`<a class="popover__item ${n.read ? '' : 'is-unread'}" href="${n.href || '#/'}"><span class="dot-icon" style="width:26px;height:26px">${icon('bell', { size: 13 })}</span><span class="stack gap-2"><span>${n.text}</span><span class="tiny muted">${fmt.ago(n.at)}</span></span></a>`) : html`<div class="popover__item muted">You're all caught up.</div>`}
      </div></div>`;
    bellWrap.append(pop);
    bell.setAttribute('aria-expanded', 'true');
    $('[data-mark]', pop).addEventListener('click', async () => { await api.markNotificationsRead(); $$('.popover__item', pop).forEach((i) => i.classList.remove('is-unread')); });
    on(pop, 'click', 'a', () => closePop());
    const away = (e) => { if (pop && !bellWrap.contains(e.target)) { closePop(); document.removeEventListener('click', away); } };
    setTimeout(() => document.addEventListener('click', away), 0);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closePop(); openNav(false); } });
  store.subscribe(renderBadge);

  return {
    outlet,
    setTitle(t) { titleEl.textContent = t; },
    setActive(key) {
      $$('.nav__link[data-nav]', nav).forEach((a) => { a.classList.remove('is-parent-active'); if (a.dataset.nav === key) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
      const parent = NAV.find((n) => (n.children || []).some((c) => c.key === key));
      if (parent) $(`.nav__link[data-nav="${parent.key}"]`, nav).classList.add('is-parent-active');
    },
    closeNav() { openNav(false); closePop(); },
    get searchValue() { return searchInput.value.trim(); },
    set searchValue(v) { searchInput.value = v; }
  };
}

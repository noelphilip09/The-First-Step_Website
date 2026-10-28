// Small shared UI builders. Everything returns an Element from html`` so it can be
// interpolated into page templates: ${roomStatusPill(room)}
import { html, raw } from '../lib/dom.js';
import { icon } from './icons.js';
import { ROOM_STATUS } from '../lib/constants.js';
import { pillClass } from '../lib/plan.js';
import { lazyImage } from '../lib/loading.js';

export const statusPill = (status, extra = '') => html`<span class="${pillClass(status.kind)} ${extra}">${status.label}</span>`;
export const roomStatusPill = (room, extra = '') => { const s = ROOM_STATUS[room.status] || ROOM_STATUS['not-assessed']; return html`<span class="${s.pill} ${extra}">${s.label}</span>`; };
export const roomStatusLabel = (room) => (ROOM_STATUS[room.status] || ROOM_STATUS['not-assessed']).label;

// Intervention marker: a 30px disc with an icon; muted when the intervention is not a focus.
export const dotIcon = (name, on = true, label = '', size = 15) => html`<span class="dot-icon ${on ? '' : 'dot-icon--off'}" ${label ? raw(`aria-label="${label}"`) : raw('aria-hidden="true"')}>${icon(on ? name : name === 'palette' ? 'palette-plain' : name, { size, stroke: 1.8 })}</span>`;

export const infoNote = (text, name = 'info') => html`<span class="note">${icon(name, { size: 14, stroke: 1.8 })}${text}</span>`;

export const eyebrow = (text, id) => html`<h3 ${id ? raw(`id="${id}"`) : ''} class="eyebrow">${text}</h3>`;

export function sectionHead(title, { actions = [], level = 'h2', size = 'h-section', sub } = {}) {
  return html`<div class="section-head"><div class="stack gap-4">${raw(`<${level} class="${size}">${title}</${level}>`)}${sub ? html`<p class="small muted">${sub}</p>` : ''}</div>${actions.length ? html`<div class="row wrap gap-8">${actions}</div>` : ''}</div>`;
}

export function button({ label, icon: name, variant = '', href, type = 'button', attrs = '', iconRight = false, size = 16 } = {}) {
  const ic = name ? icon(name, { size, stroke: variant.includes('primary') ? 2 : 1.8 }) : '';
  const inner = iconRight ? html`<span>${label}</span>${ic}` : html`${ic}<span>${label}</span>`;
  return href
    ? html`<a class="btn ${variant}" href="${href}" ${raw(attrs)}>${inner}</a>`
    : html`<button class="btn ${variant}" type="${type}" ${raw(attrs)}>${inner}</button>`;
}

export const backLink = (href, label = 'Back') => html`<a class="btn btn--text" href="${href}">${icon('arrow-left', { size: 16, stroke: 1.8 })}${label}</a>`;

export function emptyState(title, text, action) {
  return html`<div class="empty"><span class="dot-icon dot-icon--xl">${icon('image', { size: 20 })}</span><span class="h-item">${title}</span><span class="small">${text}</span>${action || ''}</div>`;
}

// Inline "status row" used on recommendation cards: label + pill
export const statusRow = (label, status) => html`<div class="row between gap-10"><span class="eyebrow">${label}</span>${statusPill(status)}</div>`;

// Classroom thumbnail: the photo when one is available, else the design's placeholder icon.
export function roomThumb(room, src, { size = 72, className = '' } = {}) {
  const dim = size !== 72 ? `width:${size}px;height:${size}px;flex-basis:${size}px;` : '';
  const el = html`<span class="thumb ${src ? 'thumb--photo' : ''} ${className}" style="${dim}"></span>`;
  if (src) {
    const img = lazyImage({ src, alt: `${room.name} photo`, className: 'thumb__img' });
    img.querySelector('img').addEventListener('error', () => { el.classList.remove('thumb--photo'); el.replaceChildren(html`<span>${icon('image', { size: 22, stroke: 1.5 })}</span>`); }, { once: true });
    el.append(img);
  } else {
    el.append(html`<span>${icon('image', { size: 22, stroke: 1.5 })}</span>`);
  }
  return el;
}

// Tiny DOM helpers. `html` is a tagged template that returns a real Element (or a
// DocumentFragment when the template has several roots). Interpolated strings are
// escaped; use raw() for trusted markup (icons), and interpolate Nodes / arrays of
// Nodes directly.
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

export class Raw { constructor(s) { this.s = String(s); } toString() { return this.s; } }
export const raw = (s) => new Raw(s);

function part(v, nodes) {
  if (v == null || v === false) return '';
  if (v instanceof Raw) return v.s;
  if (v instanceof Node) { nodes.push(v); return `<!--h:${nodes.length - 1}-->`; }
  if (Array.isArray(v)) return v.map((x) => part(x, nodes)).join('');
  return esc(v);
}

export function html(strings, ...values) {
  const nodes = [];
  let out = '';
  strings.forEach((str, i) => { out += str; if (i < values.length) out += part(values[i], nodes); });
  const tpl = document.createElement('template');
  tpl.innerHTML = out.trim();
  if (nodes.length) {
    const walker = document.createTreeWalker(tpl.content, NodeFilter.SHOW_COMMENT);
    const found = [];
    while (walker.nextNode()) {
      const m = /^h:(\d+)$/.exec(walker.currentNode.data);
      if (m) found.push([walker.currentNode, nodes[Number(m[1])]]);
    }
    found.forEach(([c, n]) => c.replaceWith(n));
  }
  const frag = tpl.content;
  return frag.childNodes.length === 1 && frag.firstElementChild ? frag.firstElementChild : frag;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// Event delegation: on(root, 'click', '[data-action]', (event, matchedEl) => …)
export function on(root, event, selector, handler, opts) {
  const fn = (e) => { const t = e.target.closest(selector); if (t && root.contains(t)) handler(e, t); };
  root.addEventListener(event, fn, opts);
  return () => root.removeEventListener(event, fn, opts);
}

export function mount(container, node) { container.replaceChildren(node); return node; }

// Replace a container's children while keeping keyboard focus on the "same" control
// (matched by id or data-key) — used by pages that re-render on state change.
export function patch(container, node) {
  const active = document.activeElement;
  const inside = active && container.contains(active);
  const key = inside ? (active.id ? `#${CSS.escape(active.id)}` : active.dataset.key ? `[data-key="${CSS.escape(active.dataset.key)}"]` : null) : null;
  container.replaceChildren(node);
  if (key) { const next = container.querySelector(key); if (next) next.focus({ preventScroll: true }); }
  return node;
}

export const fmt = {
  int: (n) => Math.round(Number(n) || 0).toLocaleString('en-AU'),
  money: (n) => 'A$' + Math.round(Number(n) || 0).toLocaleString('en-AU'),
  money0: (n) => Math.round(Number(n) || 0).toLocaleString('en-AU'),
  dec: (n, d = 1) => (Number(n) || 0).toFixed(d),
  pct: (n, d = 1) => (Number(n) || 0).toFixed(d) + '%',
  date: (ts) => new Date(ts).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }),
  time: (ts) => new Date(ts).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }),
  ago(ts) {
    const s = Math.max(0, (Date.now() - ts) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    const d = Math.floor(s / 86400);
    return d === 1 ? 'yesterday' : d + ' days ago';
  }
};

export const cls = (...xs) => xs.filter(Boolean).join(' ');

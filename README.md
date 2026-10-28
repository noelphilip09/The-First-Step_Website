# The First Step — USYD Biophilic Classroom Toolkit

A dependency-free web app (native ES modules, no build step) implementing the nine-screen
design canvas "The First Step". Run it with any static server:

```bash
python3 scripts/serve.py 5173
```

(`scripts/serve.py` is a stock `http.server` that adds `Cache-Control: no-store`; any static server works.)

then open http://127.0.0.1:5173/.

## Flow

Classroom Library → Design Studio (choose → conditions → recommendations → plan & impact)
→ save draft / submit for review → Energy & Savings → Impact & Outcomes → Reports & Review
(export, approve / request changes) → Settings & Assets. Guideline pages (Lighting, Plants,
Colour & Material) are referenced from the Studio's recommendations.

## Layout

```
index.html               entry; loads global CSS and src/main.js
src/main.js              boots the shell + router
src/routes.js            route table; each page is a dynamic import() (code-split)
src/router.js            hash router: skeleton → lazy module → page element, progress bar, enter animation
src/components/shell.js  sidebar nav, header (title, search, notifications, account), outlet
src/components/icons.js  icon(name, {size, stroke}) → inline SVG (all icons from the design)
src/components/ui.js     statusPill, roomStatusPill, dotIcon, sectionHead, button, emptyState…
src/lib/dom.js           html`` tagged template → Element; raw(), $, $$, on(), mount(), patch(), fmt
src/lib/store.js         persisted app state + subscribe
src/lib/api.js           async data layer with simulated latency (rooms, plans, reviews, export…)
src/lib/plan.js          plan logic ported from the design (recsFor, computePlan, labels)
src/lib/loading.js       skeleton(), lazyImage(), observeReveal(), whenVisible(), countUp(), withSpinner(), toast(), loadStyle(), openDialog()
src/lib/constants.js     room/review status labels + pill classes, current user
src/lib/photos.js        classroom photos: user uploads kept in IndexedDB (resized), plus static room.photo paths
src/data/rooms.js        seed classrooms;  src/data/types.js  the ten classroom types
src/pages/<name>.js      one module per screen (+ optional <name>.css loaded lazily with loadStyle)
src/styles/tokens.css    every colour / radius / size as a CSS variable (do not hard-code hex in pages)
assets/                  fonts (Helvetica Toolkit 300/400/700) and the design's images
design/                  the original .dc.html artboards, for reference only
```

## Page module contract

```js
import { html } from '../lib/dom.js';
import { api } from '../lib/api.js';
import { loadStyle } from '../lib/loading.js';

export default async function page(ctx) {
  await loadStyle(new URL('./library.css', import.meta.url));   // optional page CSS
  const rooms = await api.getRooms();                            // skeleton shows meanwhile
  const el = html`<div class="page">…</div>`;
  ctx.onCleanup(() => { /* remove window listeners, timers */ });
  return el;                                                     // router mounts + animates it
}
```

`ctx` = `{ path, query (URLSearchParams), navigate(path, params), href(path, params), replace, onCleanup(fn), setTitle(t), isCurrent() }`.

Conventions
- Markup goes through `html``; interpolated strings are escaped, `raw()` for trusted markup, Nodes and arrays of Nodes interpolate directly.
- Use the classes in `components.css` (`.btn`, `.chip`, `.pill`, `.card`, `.tile`, `.opt`, `.stat`, `.table`…) and the typography classes in `base.css` (`.display`, `.lead`, `.h-section`, `.eyebrow`…). Page-specific styles live in `src/pages/<name>.css`.
- Links are hash links: `#/studio?room=sr01`. Nav highlighting and titles come from `routes.js`.
- Every async action uses `withSpinner(button, task, {busyLabel, doneLabel})` and `toast()`.
- Lists / sections reveal on scroll with `data-reveal` (+ `style="--i:n"` to stagger). Images use `lazyImage()`.
- Numbers that change animate with `countUp()`; big sections (charts, tables) can defer work with `whenVisible()`.
- State changes go through `api.*` (async) → `store`; pages re-render their own regions with `patch()`.
- Respect `prefers-reduced-motion` (handled centrally in animations.css / loading.js).

## Classroom photos

Each classroom card can show a photo. Two ways to add one:

- In the app: hover a card in "Your classrooms" and click the small + button (or pick a photo when adding a classroom). The image is resized and stored in the browser on that device.
- In the code: put a file under `assets/img/classrooms/` and set `photo: './assets/img/classrooms/<file>'` on the room in `src/data/rooms.js` (or on a room created in `src/lib/api.js`). Static photos show everywhere, for everyone.

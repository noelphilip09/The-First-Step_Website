// Contact us page: scales the designed frame to the window, plays the entrance, and tilts the
// team cards toward the cursor.

const root = document.documentElement;
const page = document.getElementById('cpage');
const DW = 1728;
const desk = matchMedia('(min-width: 900px)');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

/* Wide windows show the Figma frame, zoomed so 1728 design px fill the window width */
function layout() {
  const on = desk.matches;
  page.classList.toggle('is-desk', on);
  page.style.zoom = on ? (root.clientWidth / DW).toFixed(5) : '';
}
layout();
addEventListener('resize', layout);
desk.addEventListener('change', layout);

/* Entrance: wait for the fonts and the first card photo so nothing pops in mid-flight */
const firstPhoto = page.querySelector('.tcard-photo img');
Promise.race([
  Promise.all([document.fonts?.ready, firstPhoto?.decode?.().catch(() => {})]),
  new Promise(r => setTimeout(r, 1500)),
]).then(() => requestAnimationFrame(() => requestAnimationFrame(() => page.classList.add('is-in'))));

/* 3D hover: the card grows a little and leans toward whichever side the cursor is on */
const MAX_TILT = 9;     // degrees
const canHover = matchMedia('(hover: hover) and (pointer: fine)');
document.querySelectorAll('.tcard').forEach(card => {
  let raf = 0, last = null;
  const apply = () => {
    raf = 0;
    if (!last) return;
    const r = card.getBoundingClientRect();
    const px = (last.x - r.left) / r.width - .5;      // -0.5 (left edge) … 0.5 (right edge)
    const py = (last.y - r.top) / r.height - .5;
    card.style.setProperty('--ry', (px * 2 * MAX_TILT).toFixed(2) + 'deg');
    card.style.setProperty('--rx', (-py * 2 * MAX_TILT).toFixed(2) + 'deg');
  };
  card.addEventListener('pointerenter', ev => {
    if (!canHover.matches || reduced.matches) return;
    card.style.setProperty('--sc', '1.05');
    last = { x: ev.clientX, y: ev.clientY };
    apply();
    setTimeout(() => { if (last) card.classList.add('is-tilting'); }, 180);   // ease into the first tilt, then track closely
  });
  card.addEventListener('pointermove', ev => {
    if (!canHover.matches || reduced.matches) return;
    last = { x: ev.clientX, y: ev.clientY };
    if (!raf) raf = requestAnimationFrame(apply);
  });
  const reset = () => {
    last = null;
    card.classList.remove('is-tilting');
    ['--rx', '--ry', '--sc'].forEach(p => card.style.removeProperty(p));
  };
  card.addEventListener('pointerleave', reset);
  card.addEventListener('blur', reset);
  card.addEventListener('focus', () => { if (card.matches(':focus-visible')) card.style.setProperty('--sc', '1.05'); });
});

// Classroom photos. A room can have a static photo (room.photo, a path under assets/) or a
// photo the user adds in the app, which is resized and kept in IndexedDB on this device.
// Resolution order: user photo → room.photo → none (the card shows its placeholder icon).
const DB = 'firststep-photos';
const STORE = 'photos';
const MAX_EDGE = 1200;
let dbPromise = null;

function openDb() {
  dbPromise ??= new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('Photo storage is not available in this browser')); return; }
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}
function run(mode, op) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = op(t.objectStore(STORE));
    t.oncomplete = () => resolve(req ? req.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

const urls = new Map(); // roomId → object URL (or null when checked and absent)

export async function getUserPhotoUrl(roomId) {
  if (urls.has(roomId)) return urls.get(roomId);
  try {
    const blob = await run('readonly', (s) => s.get(roomId));
    const url = blob ? URL.createObjectURL(blob) : null;
    urls.set(roomId, url);
    return url;
  } catch { return null; }
}

// { roomId: url | null } for a list of rooms, honouring the resolution order above.
export async function photoUrlsFor(rooms) {
  const out = {};
  await Promise.all(rooms.map(async (r) => { out[r.id] = (await getUserPhotoUrl(r.id)) || r.photo || null; }));
  return out;
}

export async function setPhoto(roomId, file) {
  if (!file || !/^image\//.test(file.type)) throw new Error('Choose an image file (JPG, PNG, HEIC or WebP)');
  const blob = await shrink(file);
  await run('readwrite', (s) => s.put(blob, roomId));
  const old = urls.get(roomId); if (old) URL.revokeObjectURL(old);
  const url = URL.createObjectURL(blob);
  urls.set(roomId, url);
  window.dispatchEvent(new CustomEvent('app:photo', { detail: { roomId, url } }));
  return url;
}

export async function removePhoto(roomId) {
  await run('readwrite', (s) => s.delete(roomId));
  const old = urls.get(roomId); if (old) URL.revokeObjectURL(old);
  urls.set(roomId, null);
  window.dispatchEvent(new CustomEvent('app:photo', { detail: { roomId, url: null } }));
}

export async function countUserPhotos() {
  try { return (await run('readonly', (s) => s.count())) || 0; } catch { return 0; }
}

// Downscale to MAX_EDGE px on the long side and re-encode as JPEG so storage stays small.
async function shrink(file) {
  let bmp = null;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { try { bmp = await createImageBitmap(file); } catch { return file; } }
  const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale)), h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
  if (bmp.close) bmp.close();
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b || file), 'image/jpeg', 0.86));
}

// Open the native file picker; resolves with the chosen File, or null when cancelled.
export function pickImage() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.style.display = 'none';
    document.body.append(input);
    let done = false;
    const finish = (f) => { if (done) return; done = true; input.remove(); resolve(f || null); };
    input.addEventListener('change', () => finish(input.files && input.files[0]));
    input.addEventListener('cancel', () => finish(null));
    window.addEventListener('focus', () => setTimeout(() => finish(null), 1200), { once: true });
    input.click();
  });
}

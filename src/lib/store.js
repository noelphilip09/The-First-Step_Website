// App state: a single persisted object with pub/sub. Pages read through `api` (async,
// simulates a network) and write through `api` too; the store itself is synchronous.
import { ROOMS } from '../data/rooms.js';
import { TYPES } from '../data/types.js';

const KEY = 'firststep.v1';
const DAY = 86400000, HOUR = 3600000;

export function initialState() {
  const now = Date.now();
  return {
    version: 1,
    rooms: ROOMS.map((r) => ({ ...r, cond: { ...r.cond }, updatedAt: now - DAY * 2 })),
    types: TYPES,
    plans: {},            // roomId -> { ...plan choices, savedAt, submittedAt }
    reviews: [
      { id: 'rv-gs07', roomId: 'gs07', by: 'Noel P.', submittedAt: now - DAY * 9, status: 'approved', reviewer: 'A. Mendes (Facilities)', decidedAt: now - DAY * 3, note: 'Approved as submitted. Schedule install for the mid-semester break.' },
      { id: 'rv-sr01', roomId: 'sr01', by: 'Noel P.', submittedAt: now - DAY * 2, status: 'pending', reviewer: null, decidedAt: null, note: '' }
    ],
    notifications: [
      { id: 'n1', text: 'Seminar Room 01 is waiting for review', at: now - HOUR * 5, read: false, href: '#/reports' },
      { id: 'n2', text: 'Group Study 07 was approved by Facilities', at: now - DAY * 3, read: true, href: '#/reports' },
      { id: 'n3', text: 'Lighting Guidelines updated to v2.3', at: now - DAY * 6, read: true, href: '#/settings' }
    ],
    settings: { accent: 'teal', hours: 2000, tariff: 0.30, currency: 'AUD', guidelineVersion: '2.3', showLibraryClassrooms: false, showStudioClassroomStep: false },
    ui: { navCollapsed: false, activeRoomId: 'sr01' }
  };
}

function load() {
  try { const raw = localStorage.getItem(KEY); if (!raw) return null; const s = JSON.parse(raw); return s && s.version === 1 ? s : null; } catch { return null; }
}
function persist(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage may be unavailable */ } }

let state = load() ?? initialState();
const listeners = new Set();

export const store = {
  get: () => state,
  set(patch) {
    state = typeof patch === 'function' ? patch(state) : { ...state, ...patch };
    persist(state);
    listeners.forEach((fn) => { try { fn(state); } catch (e) { console.error(e); } });
  },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  reset() { state = initialState(); persist(state); listeners.forEach((fn) => fn(state)); }
};

// Convenience selectors
export const getRoom = (id, s = state) => s.rooms.find((r) => r.id === id) || null;
export const getPlan = (id, s = state) => s.plans[id] || null;
export const unreadCount = (s = state) => s.notifications.filter((n) => !n.read).length;

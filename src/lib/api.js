// Fake data layer. Every call is async with a little latency so pages show their
// loading states honestly; writes go through the store and persist to localStorage.
import { store, getRoom } from './store.js';
import { defaultPlan } from './plan.js';
import { CURRENT_USER } from './constants.js';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const latency = (base = 380, spread = 320) => sleep(base + Math.random() * spread);
const uid = (p) => p + '-' + Math.random().toString(36).slice(2, 8);

function notify(text, href) {
  store.set((s) => ({ ...s, notifications: [{ id: uid('n'), text, at: Date.now(), read: false, href }, ...s.notifications].slice(0, 20) }));
}

export const api = {
  async getRooms() { await latency(); return store.get().rooms; },
  async getRoom(id) { await latency(220, 200); return getRoom(id); },
  async getTypes() { await latency(300, 200); return store.get().types; },
  async getPlan(roomId) { await latency(200, 200); const room = getRoom(roomId); if (!room) return null; return store.get().plans[roomId] || defaultPlan(room); },
  async getReviews() { await latency(); return store.get().reviews; },
  async getNotifications() { await latency(120, 120); return store.get().notifications; },
  async getSettings() { await latency(220, 200); return store.get().settings; },

  async addRoom({ name, building, level, area, typeId }) {
    await latency(500, 300);
    const type = store.get().types.find((t) => t.id === typeId) || store.get().types[0];
    const room = { id: uid('rm'), name, building, level, area: Number(area) || 50, status: 'not-assessed', type: type.id, lightingLabel: type.cond.lighting === 'fluorescent' ? 'Fluorescent' : type.cond.lighting === 'ledfixed' ? 'LED, fixed' : 'LED, dimmable', cond: { ...type.cond }, updatedAt: Date.now() };
    store.set((s) => ({ ...s, rooms: [...s.rooms, room], ui: { ...s.ui, activeRoomId: room.id } }));
    return room;
  },
  // One working classroom per classroom type, created on first use, so a plan can start straight
  // from a type card. Name and typical area come from the type; conditions are the type's.
  async getOrCreateTypeRoom(typeId) {
    await latency(250, 200);
    const s = store.get();
    const type = s.types.find((t) => t.id === typeId);
    if (!type) return null;
    const existing = s.rooms.find((r) => r.fromType === type.id);
    if (existing) { store.set((st) => ({ ...st, ui: { ...st.ui, activeRoomId: existing.id } })); return existing; }
    const nums = (String(type.size || '').match(/\d+/g) || []).map(Number);
    const area = /under/i.test(type.size || '') ? Math.round((nums[0] || 40) * 0.85) : nums.length >= 2 ? Math.round((nums[0] + nums[1]) / 2) : nums[0] || 60;
    const lighting = type.cond.lighting === 'fluorescent' ? 'Fluorescent' : type.cond.lighting === 'ledfixed' ? 'LED, fixed' : 'LED, dimmable';
    const room = { id: 'type-' + type.id, name: type.name, building: 'Classroom type', level: type.num, area, status: 'not-assessed', type: type.id, fromType: type.id, lightingLabel: lighting, cond: { ...type.cond }, updatedAt: Date.now() };
    store.set((st) => ({ ...st, rooms: [...st.rooms, room], ui: { ...st.ui, activeRoomId: room.id } }));
    return room;
  },
  async updateRoomConditions(roomId, cond) {
    await latency(150, 100);
    store.set((s) => ({ ...s, rooms: s.rooms.map((r) => r.id === roomId ? { ...r, cond: { ...r.cond, ...cond }, updatedAt: Date.now() } : r) }));
    return getRoom(roomId);
  },
  async saveDraft(roomId, plan) {
    await latency(550, 300);
    const savedAt = Date.now();
    store.set((s) => ({
      ...s,
      plans: { ...s.plans, [roomId]: { ...plan, savedAt } },
      rooms: s.rooms.map((r) => r.id === roomId && (r.status === 'not-assessed' || r.status === 'changes') ? { ...r, status: 'draft', updatedAt: savedAt } : r.id === roomId ? { ...r, updatedAt: savedAt } : r),
      ui: { ...s.ui, activeRoomId: roomId }
    }));
    return { savedAt };
  },
  async submitForReview(roomId, plan) {
    await latency(900, 400);
    const now = Date.now();
    const room = getRoom(roomId);
    const review = { id: uid('rv'), roomId, by: CURRENT_USER.name, submittedAt: now, status: 'pending', reviewer: null, decidedAt: null, note: '' };
    store.set((s) => ({
      ...s,
      plans: { ...s.plans, [roomId]: { ...plan, savedAt: now, submittedAt: now, submitted: true } },
      rooms: s.rooms.map((r) => r.id === roomId ? { ...r, status: 'in-review', updatedAt: now } : r),
      reviews: [review, ...s.reviews.filter((v) => !(v.roomId === roomId && v.status === 'pending'))],
      ui: { ...s.ui, activeRoomId: roomId }
    }));
    notify(`${room ? room.name : 'A classroom'} was submitted for review`, '#/reports');
    return review;
  },
  async decideReview(reviewId, decision, note = '') {
    await latency(700, 400);
    const now = Date.now();
    const review = store.get().reviews.find((r) => r.id === reviewId);
    if (!review) throw new Error('Review not found');
    const roomStatus = decision === 'approved' ? 'approved' : 'changes';
    store.set((s) => ({
      ...s,
      reviews: s.reviews.map((r) => r.id === reviewId ? { ...r, status: decision, reviewer: `${CURRENT_USER.name} (Facilities)`, decidedAt: now, note } : r),
      rooms: s.rooms.map((r) => r.id === review.roomId ? { ...r, status: roomStatus, updatedAt: now } : r)
    }));
    const room = getRoom(review.roomId);
    notify(`${room ? room.name : 'A classroom'} ${decision === 'approved' ? 'was approved' : 'needs changes'}`, '#/reports');
    return store.get().reviews.find((r) => r.id === reviewId);
  },
  async exportReport(roomId, format = 'pdf') {
    await latency(1200, 600);
    const room = getRoom(roomId);
    const stamp = new Date().toISOString().slice(0, 10);
    return { filename: `${(room ? room.name : 'classroom').replace(/[^\w]+/g, '-').toLowerCase()}-plan-${stamp}.${format}`, size: format === 'pdf' ? '1.2 MB' : '84 KB', at: Date.now() };
  },
  async markNotificationsRead() {
    store.set((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
  },
  async updateSettings(patch) {
    await latency(300, 200);
    store.set((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
    return store.get().settings;
  },
  setUi(patch) { store.set((s) => ({ ...s, ui: { ...s.ui, ...patch } })); },
  async resetDemoData() { await latency(400, 200); store.reset(); }
};

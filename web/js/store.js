import { createSampleData } from './data.js';
import { stamp } from './time-util.js';

const KEY = 'chinhchu-demo-v1';
let memory = null; // fallback khi localStorage lỗi hoặc không có

function storage() {
  try {
    const s = globalThis.localStorage;
    if (!s) return null;
    s.setItem('__t', '1'); s.removeItem('__t');
    return s;
  } catch { return null; }
}

export function load() {
  const s = storage();
  if (s) {
    try {
      const raw = s.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const ok = parsed.filter((w) => w && typeof w === 'object' && w.id);
          if (ok.length) return ok;
        }
      }
    } catch { /* dữ liệu hỏng: dùng mẫu */ }
  }
  if (!memory) memory = createSampleData();
  return memory;
}

export function save(list) {
  memory = list;
  const s = storage();
  if (s) { try { s.setItem(KEY, JSON.stringify(list)); } catch { /* bỏ qua, đã giữ trong bộ nhớ */ } }
  return list;
}

export function reset() {
  const fresh = createSampleData();
  memory = fresh;
  const s = storage();
  if (s) { try { s.removeItem(KEY); } catch { /* bỏ qua */ } }
  return fresh;
}

export function getAll() { return load(); }
export function getById(id) { return load().find((w) => w.id === id) || null; }

export function update(id, fn) {
  const list = load();
  const wf = list.find((w) => w.id === id);
  if (!wf) return null;
  fn(wf);
  save(list);
  return wf;
}

export function addLog(wf, text) {
  wf.log = wf.log || [];
  wf.log.push({ at: stamp(), text });
}

export function add(wf) {
  const list = load();
  list.push(wf);
  save(list);
  return wf;
}

// Hồ sơ doanh nghiệp đang chọn (chỉ là id, lưu riêng; mất khi id không còn trong dữ liệu).
const SEL_KEY = 'chinhchu-demo-biz-sel';
let selMemory = '';
export function getSelectedId() {
  const s = storage();
  let id = selMemory;
  if (s) { try { id = s.getItem(SEL_KEY) || id; } catch { /* dùng bộ nhớ */ } }
  return id;
}
export function setSelectedId(id) {
  selMemory = id || '';
  const s = storage();
  if (s) { try { if (id) s.setItem(SEL_KEY, id); else s.removeItem(SEL_KEY); } catch { /* bỏ qua */ } }
}

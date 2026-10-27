// Hàm thuần cho tra cứu: chuẩn hóa chuỗi, khớp WF, gợi ý, escape HTML.
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Bỏ dấu tiếng Việt, hạ chữ thường, gộp khoảng trắng.
export function normalize(s) {
  return String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

// Đưa địa chỉ web về dạng domain: bỏ http(s)://, www., đường dẫn, cổng.
export function normalizeDomain(s) {
  return String(s ?? '').trim().toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '').replace(/^www\./, '')
    .replace(/[/?#].*$/, '').replace(/:\d+$/, '');
}

const lower = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
const digits = (s) => String(s ?? '').replace(/\D/g, '');

function haystacks(wf) {
  return [normalize(wf.name), normalizeDomain(wf.domain), normalize(wf.mst), digits(wf.phone), normalize(wf.id)];
}

// Gợi ý khi gõ: WF có tên/domain/MST/SĐT chứa chuỗi (không phân biệt dấu/hoa thường).
export function suggest(list, query, limit = 6) {
  const q = normalize(query);
  const d = normalizeDomain(query);
  if (!q) return [];
  const qd = digits(query);
  return list.filter((wf) => {
    const [n, dom, mst, ph] = haystacks(wf);
    return n.includes(q) || dom.includes(d) || dom.includes(q) || (qd.length >= 4 && (mst.includes(qd) || ph.includes(qd)));
  }).slice(0, limit);
}

// Kết quả tra cứu: exact (1 WF) | multiple | none | empty.
export function resolve(list, query) {
  const raw = lower(query);
  if (!normalize(query)) return { type: 'empty', wf: null, matches: [] };
  const d = normalizeDomain(query);
  const byId = list.find((w) => w.id.toLowerCase() === raw);
  if (byId) return { type: 'exact', wf: byId, matches: [byId] };
  const byDomain = list.find((w) => normalizeDomain(w.domain) === d);
  if (byDomain) return { type: 'exact', wf: byDomain, matches: [byDomain] };
  // Khớp tên đúng dấu trước, rồi mới khớp không dấu (tránh nhầm "Hoa Nắng" với "Hoa Nâng").
  const strict = list.filter((w) => lower(w.name) === raw);
  if (strict.length === 1) return { type: 'exact', wf: strict[0], matches: strict };
  const loose = list.filter((w) => normalize(w.name) === normalize(query));
  if (loose.length === 1) return { type: 'exact', wf: loose[0], matches: loose };
  const matches = suggest(list, query, 20);
  if (matches.length === 1) return { type: 'exact', wf: matches[0], matches };
  if (matches.length > 1) return { type: 'multiple', wf: null, matches };
  return { type: 'none', wf: null, matches: [] };
}

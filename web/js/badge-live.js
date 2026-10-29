// Huy hiệu động (giả lập): mã nhúng = ID hồ sơ + chữ ký giả (HMAC-giả) đổi theo chu kỳ 5 phút.
// Hàm thuần, không phụ thuộc DOM. Hệ thống thật: script ký số, máy chủ kiểm origin/referrer.
import { computeStatus } from './scoring.js';
import { normalizeDomain } from './search-util.js';

export const PERIOD_MS = 5 * 60 * 1000;     // chu kỳ đổi chữ ký
export const CONFIRM_MS = 30 * 1000;        // "xác nhận X giây trước" quay vòng mỗi 30 giây
const SECRET = 'chinhchu-demo-khoa-gia'; // khóa giả lập, KHÔNG phải bí mật thật

export const VERDICT = {
  real: 'Tick thật',
  fake: 'Tick giả hoặc ảnh sao chép',
  revoked: 'Tick đã thu hồi',
  none: 'Không có tick',
};

// Băm FNV-1a 32 bit, ghép 2 lần thành 16 ký tự hex. Chỉ để giả lập chữ ký.
function fakeHmac(message) {
  let out = '';
  for (const salt of ['a', 'b']) {
    let h = 0x811c9dc5;
    for (const ch of `${salt}|${SECRET}|${message}`) {
      h ^= ch.codePointAt(0);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    out += h.toString(16).padStart(8, '0');
  }
  return out;
}

export const periodOf = (now) => Math.floor(Number(now) / PERIOD_MS);
export const secondsToNextPeriod = (now) => Math.max(0, Math.ceil(((periodOf(now) + 1) * PERIOD_MS - now) / 1000));
export const confirmAgeSec = (now) => Math.floor((((Number(now) % CONFIRM_MS) + CONFIRM_MS) % CONFIRM_MS) / 1000);

function sign(id, domain, period) {
  return fakeHmac(`${id}|${normalizeDomain(domain)}|${period}`);
}

// Mã dạng: cc1.<id>.<chu kỳ>.<chữ ký>
export function makeEmbedCode(wf, now = Date.now()) {
  const p = periodOf(now);
  return `cc1.${encodeURIComponent(String(wf?.id ?? ''))}.${p}.${sign(wf?.id, wf?.domain, p)}`;
}

// Đoạn HTML dán vào trang (script tải huy hiệu; địa chỉ .example vì chỉ là demo).
export function makeEmbedSnippet(wf, now = Date.now()) {
  const code = makeEmbedCode(wf, now).replace(/[^A-Za-z0-9._%-]/g, '');
  return `<script async src="https://badge.chinhchu.example/v1/badge.js" data-code="${code}"></script>`;
}

function parseCode(code) {
  const m = /^cc1\.([^.]+)\.(\d+)\.([0-9a-f]{16})$/.exec(String(code ?? '').trim());
  if (!m) return null;
  let id;
  try { id = decodeURIComponent(m[1]); } catch { return null; }
  return { id, period: Number(m[2]), sig: m[3] };
}

// reason: valid | domain-mismatch | revoked | no-code | expired | unknown
export function verifyEmbed({ code, hostDomain, wfs, now = Date.now() } = {}) {
  if (code == null || String(code).trim() === '') return { ok: false, reason: 'no-code' };
  const c = parseCode(code);
  if (!c) return { ok: false, reason: 'unknown' };
  const wf = (wfs || []).find((w) => w && w.id === c.id);
  if (!wf) return { ok: false, reason: 'unknown' };
  if (sign(wf.id, wf.domain, c.period) !== c.sig) return { ok: false, reason: 'unknown', wfId: wf.id };
  const status = computeStatus(wf);
  if (status !== 'low' && status !== 'high') return { ok: false, reason: 'revoked', wfId: wf.id };
  if (normalizeDomain(hostDomain) !== normalizeDomain(wf.domain)) return { ok: false, reason: 'domain-mismatch', wfId: wf.id };
  const cur = periodOf(now);
  if (c.period > cur || cur - c.period > 1) return { ok: false, reason: 'expired', wfId: wf.id };
  return { ok: true, reason: 'valid', wfId: wf.id, status };
}

// Trang giả lập dùng cho demo "quét trang" (tên miền hư cấu).
export const COPY_PAGES = {
  // Chép ảnh tick tĩnh: không có mã.
  'hoanang-shop-sao-chep.example': { kind: 'static-image', copiesId: 'wf-1' },
  // Chép cả mã nhúng của trang thật sang tên miền khác.
  'hoa-nang-khuyen-mai.example': { kind: 'copied-code', copiesId: 'wf-1' },
};

function hadBadge(wf) {
  if (!wf) return false;
  if ((wf.grant || 'none') !== 'none') return true;
  const status = computeStatus(wf);
  if (status === 'suspect') return true;
  return (wf.log || []).some((l) => /thu hồi/i.test(String(l?.text || '')));
}

// Giả lập "quét trang": trả {verdict, reason, domain, wfId?, detail}.
export function scanPage(url, wfs, now = Date.now()) {
  const domain = normalizeDomain(url);
  const list = wfs || [];
  const mk = (verdict, reason, detail, wfId) => ({ verdict, reason, domain, wfId, detail });
  if (!domain) return mk(VERDICT.none, 'empty', 'Chưa nhập địa chỉ trang.');
  const copy = COPY_PAGES[domain];
  if (copy) {
    const src = list.find((w) => w.id === copy.copiesId);
    if (copy.kind === 'static-image' || !src) {
      return mk(VERDICT.fake, 'no-code', 'Trang có hình tick nhưng không có mã nhúng ChínhChủ: đây chỉ là ảnh tĩnh.');
    }
    const r = verifyEmbed({ code: makeEmbedCode(src, now), hostDomain: domain, wfs: list, now });
    return mk(VERDICT.fake, r.reason, 'Trang dùng mã của một tên miền khác. Mã chỉ hợp lệ trên đúng tên miền đã đăng ký.', src.id);
  }
  const wf = list.find((w) => normalizeDomain(w.domain) === domain);
  if (wf && hadBadge(wf)) {
    const r = verifyEmbed({ code: makeEmbedCode(wf, now), hostDomain: domain, wfs: list, now });
    if (r.ok) return mk(VERDICT.real, 'valid', 'Mã nhúng hợp lệ, đúng tên miền, chữ ký còn hạn.', wf.id);
    if (r.reason === 'revoked') return mk(VERDICT.revoked, 'revoked', 'Hồ sơ đã bị thu hồi hoặc ở trạng thái nghi ngờ; tick không còn hiệu lực.', wf.id);
    return mk(VERDICT.fake, r.reason, 'Mã nhúng không hợp lệ.', wf.id);
  }
  return mk(VERDICT.none, 'no-badge', 'Không tìm thấy mã huy hiệu ChínhChủ trên trang này.', wf?.id);
}

// Trạng thái hiển thị của huy hiệu động trên trang có tên miền hostDomain.
export function liveBadgeModel(wf, hostDomain, wfs, now = Date.now()) {
  const r = verifyEmbed({ code: makeEmbedCode(wf, now), hostDomain, wfs, now });
  return { ok: r.ok, reason: r.reason, status: r.status || computeStatus(wf), ageSec: confirmAgeSec(now) };
}

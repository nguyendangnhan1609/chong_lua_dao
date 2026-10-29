// Thông tin bổ sung GIẢ LẬP cho tra cứu (WHOIS, danh tiếng, SĐT, kiểm tra thêm). Thuần, không gọi mạng.
import { normalizeDomain, normalize } from './search-util.js';

// Hồ sơ cố định cho 6 WF mẫu (khóa: tên miền). rep = [tốt, xấu, trung tính].
const FIXED = {
  'hoanang-shop.example': { owner: 'Hộ kinh doanh Hoa Nắng', reg: 'Nhà đăng ký Mẫu A', created: '2023-03-14', expires: '2027-03-14', country: 'VN', ssl: 'Hợp lệ đến 2027-01-10', rep: [5, 0, 2], phone: [true, true, true] },
  'minhan-clinic.test': { owner: 'Công ty Minh An', reg: 'Nhà đăng ký Mẫu A', created: '2022-08-02', expires: '2027-08-02', country: 'VN', ssl: 'Hợp lệ đến 2027-02-20', rep: [6, 0, 1], phone: [true, true, true] },
  'giobien-cafe.example': { owner: 'Ẩn danh (bảo vệ riêng tư)', reg: 'Nhà đăng ký Mẫu B', created: '2024-05-20', expires: '2026-12-20', country: 'SG', ssl: 'Hợp lệ đến 2026-12-01', rep: [3, 1, 3], phone: [true, false, true] },
  'laxanh-books.test': { owner: 'Ẩn danh (bảo vệ riêng tư)', reg: 'Nhà đăng ký Mẫu B', created: '2025-09-01', expires: '2026-11-30', country: 'US', ssl: 'Chứng chỉ tự ký', rep: [1, 1, 3], phone: [false, false, false] },
  'hoanang-shop-vn.example': { owner: 'Ẩn danh (bảo vệ riêng tư)', reg: 'Nhà đăng ký Mẫu C', created: '2026-09-28', expires: '2027-09-28', country: 'US', ssl: 'Hợp lệ đến 2026-12-28', rep: [0, 6, 1], phone: [false, false, false] },
  'binhtam-pharmacy.test': { owner: 'Nhà thuốc Bình Tâm', reg: 'Nhà đăng ký Mẫu A', created: '2021-11-11', expires: '2026-11-11', country: 'VN', ssl: 'Hợp lệ đến 2026-11-05', rep: [4, 1, 2], phone: [true, true, false] },
};

const SOURCES = ['Diễn đàn Người Dùng Mẫu', 'Báo Mạng Giả Lập', 'Cộng đồng Review Mẫu', 'Nhóm Mua Sắm Thử Nghiệm', 'Blog Tiêu Dùng Mẫu'];
const TEMPLATES = {
  good: [['Trải nghiệm mua hàng tốt', 'Giao đúng hẹn, hàng giống mô tả, nhân viên trả lời nhanh.'], ['Đánh giá dịch vụ ổn định', 'Nhiều người dùng cho biết được hỗ trợ đổi trả rõ ràng.']],
  bad: [['Phản ánh của người dùng về giao hàng', 'Một người dùng phản ánh chờ lâu và khó liên hệ sau khi chuyển tiền.'], ['Phản ánh của người dùng về giá và đặt cọc', 'Có phản ánh bị yêu cầu đặt cọc gấp, thông tin thanh toán không khớp tên trang.']],
  neutral: [['Bàn luận chung về cửa hàng', 'Bài viết nhắc tên trang nhưng chưa có đánh giá cụ thể.'], ['Hỏi đáp: có ai từng mua chưa?', 'Chưa có câu trả lời rõ ràng, cần thêm thông tin.']],
};

export function hash(str) { // FNV-1a 32-bit
  let h = 2166136261;
  for (const ch of String(str)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function rng(seed) { let s = seed || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const pad = (n) => String(n).padStart(2, '0');
const dateFrom = (r, y0, span) => `${y0 + Math.floor(r() * span)}-${pad(1 + Math.floor(r() * 12))}-${pad(1 + Math.floor(r() * 28))}`;

export function looksLikeQuery(s) {
  const t = String(s ?? '').trim();
  if (t.length < 2 || t.length > 100) return false;
  if (/^[\p{L}\p{N}][\p{L}\p{N}.-]*\.[a-z]{2,}$/iu.test(normalizeDomain(t)) && !/\s/.test(normalizeDomain(t))) return true;
  return /\p{L}/u.test(t) && /^[\p{L}\p{N}\s.,'&()-]+$/u.test(t);
}

function verdictText(g, b) {
  if (b === 0 && g >= 3) return 'Phần lớn bài viết tích cực, chưa thấy phản ánh xấu.';
  if (b === 0) return 'Chưa thấy phản ánh xấu, nhưng có ít thông tin để đánh giá.';
  if (b > g) return 'Có nhiều phản ánh tiêu cực của người dùng hơn bài tích cực, nên cẩn trọng.';
  return 'Ý kiến trái chiều, có một số phản ánh của người dùng cần kiểm chứng.';
}

function buildEvidence(key, counts, r) {
  const ev = [];
  [['good', counts[0]], ['bad', counts[1]], ['neutral', counts[2]]].forEach(([tone, n]) => {
    for (let i = 0; i < n; i++) {
      const t = TEMPLATES[tone][i % 2];
      ev.push({ title: t[0], source: SOURCES[Math.floor(r() * SOURCES.length)], date: dateFrom(r, 2025, 2), snippet: t[1], tone, url: '#' });
    }
  });
  return ev.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
}

function checks(key, r, bad, phoneInfo) {
  const pick = (a) => a[Math.floor(r() * a.length)];
  const clean = bad < 2;
  const D = () => dateFrom(r, 2026, 1);
  return [
    { key: 'ssl', label: 'Chứng chỉ SSL và chuỗi chuyển hướng', result: clean ? '✓' : pick(['!', '–']), detail: clean ? 'Chứng chỉ hợp lệ, không chuyển hướng lạ.' : 'Có chuyển hướng qua tên miền khác trước khi tới trang.', source: 'Trình quét giả lập', date: D() },
    { key: 'mail', label: 'Email tên miền (SPF/DMARC)', result: clean ? pick(['✓', '✓', '–']) : '!', detail: clean ? 'Có bản ghi SPF và DMARC.' : 'Thiếu DMARC hoặc SPF.', source: 'Tra cứu DNS giả lập', date: D() },
    { key: 'link', label: 'Liên kết hai chiều website và fanpage', result: clean ? '✓' : '–', detail: clean ? 'Website và fanpage trỏ tới nhau.' : 'Không tìm thấy liên kết hai chiều.', source: 'Trình quét giả lập', date: D() },
    { key: 'lookalike', label: 'Tên giống thương hiệu đã xác thực', result: key.includes('-vn.') ? '!' : (clean ? '✓' : pick(['!', '–'])), detail: key.includes('-vn.') ? 'Tên gần giống một hồ sơ đã xác thực.' : 'Không thấy tên gần giống đáng chú ý.', source: 'So khớp danh sách ChínhChủ (giả lập)', date: D() },
    { key: 'bank', label: 'Tài khoản ngân hàng/ví nhận tiền', result: bad >= 3 ? '!' : (phoneInfo ? '✓' : '–'), detail: bad >= 3 ? 'Có phản ánh của người dùng về tài khoản nhận tiền.' : 'Chưa có phản ánh về tài khoản nhận tiền.', source: 'Cơ sở phản ánh giả lập', date: D() },
    { key: 'risk', label: 'Quét trang tìm biểu hiện rủi ro', result: bad >= 2 ? '!' : '✓', detail: bad >= 2 ? 'Phát hiện nội dung đòi đặt cọc gấp hoặc giá thấp bất thường.' : 'Không thấy biểu hiện đòi đặt cọc gấp hay giá quá rẻ.', source: 'Trình quét giả lập', date: D() },
  ];
}

export function getIntel(input) {
  const dom = normalizeDomain(input);
  const isDomain = /^[^\s]+\.[a-z]{2,}$/.test(dom);
  const key = isDomain ? dom : normalize(input);
  const fixed = FIXED[key];
  const r = rng(hash(key));
  const owners = ['Ẩn danh (bảo vệ riêng tư)', 'Cá nhân (ẩn một phần thông tin)', 'Công ty TNHH Mẫu ' + (1 + Math.floor(r() * 90))];
  const regs = ['Nhà đăng ký Mẫu A', 'Nhà đăng ký Mẫu B', 'Nhà đăng ký Mẫu C'];
  const countries = ['VN', 'SG', 'US', 'DE'];
  const created = dateFrom(r, 2019, 7);
  const ownerPick = owners[Math.floor(r() * owners.length)], regPick = regs[Math.floor(r() * 3)], cPick = countries[Math.floor(r() * 4)];
  const sslPick = ['Hợp lệ đến 2027-02-15', 'Hợp lệ đến 2026-12-30', 'Chứng chỉ tự ký', 'Hết hạn'][Math.floor(r() * 4)];
  const roll = r();
  const rep0 = roll < 0.4 ? [3 + Math.floor(r() * 4), 0, Math.floor(r() * 3)] : roll < 0.7 ? [1 + Math.floor(r() * 3), 1 + Math.floor(r() * 2), 1 + Math.floor(r() * 3)] : [Math.floor(r() * 2), 3 + Math.floor(r() * 4), Math.floor(r() * 3)];
  const ph0 = [r() < 0.6, r() < 0.5, r() < 0.5];
  const f = fixed || {};
  const repN = f.rep || rep0, ph = f.phone || ph0;
  const evidence = buildEvidence(key, repN, rng(hash(key + '#ev')));
  const created2 = f.created || created;
  const cy = Number(created2.slice(0, 4));
  const whois = {
    owner: f.owner || ownerPick, registrar: f.reg || regPick, created: created2,
    expires: f.expires || `${cy + 1 + Math.floor(r() * 4)}${created2.slice(4)}`,
    country: f.country || cPick, ssl: f.ssl || sslPick, simulated: true,
  };
  const reputation = { good: repN[0], bad: repN[1], neutral: repN[2], verdict: verdictText(repN[0], repN[1]), evidence, simulated: true };
  const phone = { published: ph[0], verified: ph[0] && ph[1], matchesProfile: ph[0] && ph[2], simulated: true };
  return { key, whois, reputation, phone, extraChecks: checks(key, rng(hash(key + '#chk')), repN[1], phone.published) };
}

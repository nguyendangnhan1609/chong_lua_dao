// Hàm thuần cho luồng Doanh nghiệp: validate, tạo WF mới, chứng minh sở hữu, việc cần làm, mã nhúng.
import { CHECK_LABELS, MAX_POINTS, computeScore, computeStatus, canUpgrade, isSuspect } from './scoring.js';
import { esc, normalizeDomain } from './search-util.js';
import { createSampleData } from './data.js';

export const OWNERSHIP_METHODS = {
  page: 'Chèn mã vào trang web',
  file: 'Tải file xác nhận lên website',
  email: 'Nhận mã qua email',
};

const strip = (s) => String(s ?? '').replace(/[\s.\-]/g, '');
const today = (now = new Date()) => now.toISOString().slice(0, 10);

export function isValidPhone(s) {
  return /^(0|\+84)\d{9}$/.test(strip(s));
}
export function isValidMst(s) {
  return /^\d{10}(\d{3})?$/.test(strip(s));
}
export function isValidEmail(s) {
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(String(s ?? '').trim());
}
export function isValidDomain(s) {
  const d = normalizeDomain(s);
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(d);
}

// Danh sách giả mạo giả lập: lấy từ các WF mẫu bị khớp danh sách.
export function blacklistDomains() {
  return createSampleData().filter((w) => w.blacklistMatch).map((w) => normalizeDomain(w.domain));
}

// Trả { ok, errors: {field: message}, values } – lỗi bằng tiếng Việt.
export function validateRegistration(input = {}, existingList = []) {
  const v = {
    name: String(input.name ?? '').trim(),
    domain: String(input.domain ?? '').trim(),
    mst: strip(input.mst),
    phone: String(input.phone ?? '').trim(),
    email: String(input.email ?? '').trim(),
  };
  const errors = {};
  if (!v.name) errors.name = 'Vui lòng nhập tên doanh nghiệp / thương hiệu.';
  else if (v.name.length > 120) errors.name = 'Tên quá dài (tối đa 120 ký tự).';
  if (!v.domain) errors.domain = 'Vui lòng nhập địa chỉ website/fanpage.';
  else if (!isValidDomain(v.domain)) errors.domain = 'Địa chỉ chưa đúng, ví dụ: cua-hang.example';
  else if (existingList.some((w) => normalizeDomain(w?.domain) === normalizeDomain(v.domain))) errors.domain = 'Địa chỉ này đã có trong hệ thống.';
  if (!v.mst) errors.mst = 'Vui lòng nhập mã số thuế.';
  else if (!isValidMst(v.mst)) errors.mst = 'Mã số thuế phải gồm 10 hoặc 13 chữ số.';
  if (!v.phone) errors.phone = 'Vui lòng nhập số điện thoại.';
  else if (!isValidPhone(v.phone)) errors.phone = 'Số điện thoại chưa đúng (10 số, bắt đầu bằng 0 hoặc +84).';
  if (!v.email) errors.email = 'Vui lòng nhập email.';
  else if (!isValidEmail(v.email)) errors.email = 'Email chưa đúng định dạng.';
  return { ok: Object.keys(errors).length === 0, errors, values: v };
}

export function hashString(s) {
  let h = 5381;
  for (const ch of String(s)) h = ((h * 33) ^ ch.codePointAt(0)) >>> 0;
  return h;
}

const HISTORY_TIERS = [
  { years: 1, points: 5 }, { years: 2, points: 8 }, { years: 4, points: 12 }, { years: 6, points: 15 },
];

// Tra cứu giả lập, kết quả xác định theo dữ liệu nhập.
export function initialChecks(values, now = new Date()) {
  const date = today(now);
  const domain = normalizeDomain(values.domain);
  const gov = isValidMst(values.mst);
  const phone = isValidPhone(values.phone);
  const tier = HISTORY_TIERS[hashString(domain) % HISTORY_TIERS.length];
  const black = blacklistDomains().includes(domain);
  return {
    gov: {
      source: 'Cổng đăng ký doanh nghiệp (giả lập)', date,
      result: gov ? `Khớp MST ${strip(values.mst)} (tra cứu giả lập)` : 'MST không hợp lệ',
      points: gov ? MAX_POINTS.gov : 0,
    },
    phone: {
      source: 'Xác minh SĐT (giả lập)', date,
      result: phone ? 'SĐT hợp lệ và khớp hồ sơ đăng ký (giả lập)' : 'SĐT không hợp lệ',
      points: phone ? MAX_POINTS.phone : 0,
    },
    ownership: {
      source: 'Chứng minh quyền sở hữu (giả lập)', date,
      result: 'Chưa chứng minh quyền sở hữu',
      points: 0,
    },
    history: {
      source: 'Tra cứu ngày tạo tên miền (giả lập)', date,
      result: `Tên miền tạo khoảng ${tier.years} năm trước (giả lập)`,
      points: tier.points,
    },
    blacklist: {
      source: 'Danh sách website giả mạo (giả lập)', date,
      result: black ? 'Trùng danh sách giả mạo' : 'Không trùng danh sách',
      points: black ? 0 : MAX_POINTS.blacklist,
    },
  };
}

export function nextId(list) {
  let n = 1;
  const ids = new Set(list.map((w) => w?.id));
  while (ids.has(`wf-u${n}`)) n += 1;
  return `wf-u${n}`;
}

// Tạo WF mới từ giá trị đã validate. Không ghi store (view tự gọi store.add).
export function createWf(values, list = [], now = new Date()) {
  const domain = normalizeDomain(values.domain);
  const checks = initialChecks(values, now);
  const black = checks.blacklist.points === 0;
  return {
    id: nextId(list),
    name: values.name,
    domain,
    owner: values.name,
    mst: strip(values.mst),
    phone: values.phone,
    email: values.email,
    createdAt: today(now),
    checks,
    ownershipProven: false,
    blacklistMatch: black,
    grant: 'none',
    pending: true,
    userCreated: true,
    complaints: { count: 0, accepted: 0 },
    adminConfirmedSuspect: false,
    suspectReason: black ? 'Địa chỉ trùng danh sách website giả mạo.' : '',
    inspection: { call: false, meet: false, evidence: false, note: '' },
    ai: 'Gợi ý AI (soạn sẵn, chỉ tham khảo): hồ sơ mới đăng ký, chưa đủ dữ liệu để nhận định.',
    log: [
      { at: today(now), text: 'Doanh nghiệp gửi hồ sơ đăng ký (gói demo 0đ, thanh toán giả lập)' },
    ],
  };
}

// Mã giả lập hiển thị cho từng cách chứng minh.
export function generateProofCode(method, rng = Math.random) {
  const part = Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(rng() * 32)]).join('');
  if (method === 'file') return `chinhchu-${part.toLowerCase()}.txt`;
  if (method === 'email') return part;
  return `<meta name="chinhchu-verify" content="${part}">`;
}

// Chứng minh quyền sở hữu giả lập thành công: +20 điểm mục quyền sở hữu, ghi nhật ký.
export function proveOwnership(wf, method, now = new Date()) {
  if (!OWNERSHIP_METHODS[method]) throw new Error('Cách chứng minh không hợp lệ');
  if (wf.ownershipProven) return wf;
  wf.ownershipProven = true;
  wf.checks = wf.checks || {};
  wf.checks.ownership = {
    source: `Chứng minh quyền sở hữu – ${OWNERSHIP_METHODS[method]} (giả lập)`,
    date: today(now),
    result: 'Xác nhận thành công (giả lập)',
    points: MAX_POINTS.ownership,
  };
  wf.log = wf.log || [];
  wf.log.push({ at: today(now), text: `Chứng minh quyền sở hữu thành công: ${OWNERSHIP_METHODS[method]} (giả lập)` });
  return wf;
}

// Danh sách "Việc cần làm để lên mức cao" theo trạng thái hiện tại.
export function todoList(wf) {
  const status = computeStatus(wf);
  if (status === 'high') return [];
  if (isSuspect(wf)) {
    return [`Hồ sơ đang ở trạng thái nghi ngờ${wf.suspectReason ? ` (${wf.suspectReason})` : ''}: gửi giải trình và chờ quản trị viên xem xét.`];
  }
  const todo = [];
  if (!wf.ownershipProven) todo.push(`Chứng minh quyền sở hữu website/fanpage (+${MAX_POINTS.ownership} điểm, bắt buộc để lên mức thấp).`);
  for (const k of ['gov', 'phone', 'history', 'blacklist']) {
    const got = Number(wf.checks?.[k]?.points) || 0;
    if (got < MAX_POINTS[k] && k !== 'history') todo.push(`Bổ sung thông tin cho mục "${CHECK_LABELS[k]}" (đang ${got}/${MAX_POINTS[k]}).`);
  }
  const score = computeScore(wf);
  if (score < 60) todo.push(`Đạt tối thiểu 60 điểm để lên mức thấp (hiện ${score}).`);
  if (wf.ownershipProven && canUpgrade(wf, 'low').ok && status === 'unverified') todo.push('Hồ sơ đủ điều kiện mức thấp: chờ quản trị viên duyệt và cấp.');
  if (score < 80) todo.push(`Đạt tối thiểu 80 điểm để lên mức cao (hiện ${score}).`);
  const i = wf.inspection || {};
  if (!i.call) todo.push('Chờ thẩm định bằng cuộc gọi điện của quản trị viên.');
  if (!(i.meet || i.evidence)) todo.push('Chờ gặp trực tiếp hoặc nộp minh chứng (giấy phép, hóa đơn…) để thẩm định.');
  if (status === 'low') todo.push('Khi đủ các điều kiện trên, quản trị viên sẽ nâng lên mức cao.');
  return todo;
}

// Huy hiệu chỉ có khi đã ở mức thấp/cao.
export function badgeAvailability(wf) {
  const status = computeStatus(wf);
  if (status === 'low' || status === 'high') return { ok: true, status, reason: '' };
  if (status === 'suspect') return { ok: false, status, reason: 'Hồ sơ đang ở trạng thái nghi ngờ nên chưa có huy hiệu.' };
  const low = canUpgrade(wf, 'low');
  return { ok: false, status, reason: low.ok ? 'Hồ sơ đủ điều kiện nhưng chờ quản trị viên cấp mức thấp.' : `Chưa có huy hiệu: ${low.reason}` };
}

// Đoạn mã nhúng (đã escape giá trị), baseUrl là địa chỉ gốc có dấu / ở cuối.
export function embedCode(baseUrl, wf, status) {
  const label = status === 'high' ? 'Đã xác thực thực tế' : 'Đã xác thực từ xa';
  const href = `${String(baseUrl).replace(/#.*$/, '')}#/tra-cuu/${encodeURIComponent(wf.id)}`;
  return `<a href="${esc(href)}" target="_blank" rel="noopener" title="${esc(label)} – ChínhChủ">${esc(label)} – ChínhChủ</a>`;
}

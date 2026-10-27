// Hàm thuần: tính điểm và trạng thái theo thang điểm cố định (SPEC).
export const CHECK_KEYS = ['gov', 'phone', 'ownership', 'history', 'blacklist'];
export const MAX_POINTS = { gov: 30, phone: 20, ownership: 20, history: 15, blacklist: 15 };
export const CHECK_LABELS = {
  gov: 'Nguồn chính phủ',
  phone: 'Số điện thoại khớp',
  ownership: 'Quyền sở hữu website/fanpage',
  history: 'Lịch sử tạo / tuổi',
  blacklist: 'Không trong danh sách giả mạo',
};
export const STATUS_LABELS = {
  unverified: 'Chưa xác thực',
  low: 'Mức thấp – xác thực từ xa',
  high: 'Mức cao – xác thực thực tế',
  suspect: 'Nghi ngờ',
};

export function computeScore(wf) {
  let total = 0;
  for (const k of CHECK_KEYS) {
    const p = Number(wf?.checks?.[k]?.points) || 0;
    total += Math.max(0, Math.min(MAX_POINTS[k], p));
  }
  return total;
}

export function inspectionPassed(wf) {
  const i = wf?.inspection || {};
  return Boolean(i.call && (i.meet || i.evidence));
}

export function isSuspect(wf) {
  if (wf?.blacklistMatch) return true;
  const c = wf?.complaints || {};
  return (Number(c.accepted) || 0) >= 3 && Boolean(wf?.adminConfirmedSuspect);
}

export function canUpgrade(wf, target = 'high') {
  const score = computeScore(wf);
  if (isSuspect(wf)) return { ok: false, reason: 'Hồ sơ đang ở trạng thái nghi ngờ, cần gỡ cờ trước.' };
  if (target === 'low') {
    if (!wf?.ownershipProven) return { ok: false, reason: 'Chưa chứng minh quyền sở hữu.' };
    if (score < 60) return { ok: false, reason: `Điểm ${score} < 60 (cần tối thiểu 60).` };
    return { ok: true, reason: '' };
  }
  const low = canUpgrade(wf, 'low');
  if (!low.ok) return low;
  if (score < 80) return { ok: false, reason: `Điểm ${score} < 80 (cần tối thiểu 80 cho mức cao).` };
  const i = wf?.inspection || {};
  if (!i.call) return { ok: false, reason: 'Thiếu thẩm định thực tế: chưa gọi điện.' };
  if (!(i.meet || i.evidence)) return { ok: false, reason: 'Thiếu thẩm định thực tế: chưa gặp trực tiếp hoặc chưa có minh chứng.' };
  return { ok: true, reason: '' };
}

// wf.grant: 'none' | 'low' | 'high' là mức quản trị đã cấp; mức hiển thị chỉ giữ khi vẫn đủ điều kiện.
export function computeStatus(wf) {
  if (isSuspect(wf)) return 'suspect';
  const grant = wf?.grant || 'none';
  if (grant === 'high' && canUpgrade(wf, 'high').ok) return 'high';
  if ((grant === 'high' || grant === 'low') && canUpgrade(wf, 'low').ok) return 'low';
  return 'unverified';
}

// Hàm thuần cho màn Quản trị: lọc hàng đợi, kiểm tra quy tắc và áp dụng hành động lên hồ sơ.
// applyAction KHÔNG sửa wf gốc: trả {ok, reason, wf} với wf là bản sao đã cập nhật (hoặc wf gốc khi bị từ chối).
import { MAX_POINTS, computeStatus, canUpgrade, isSuspect, inspectionPassed } from './scoring.js';
import { stamp, dateOnly } from './time-util.js';

export const FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ duyệt' },
  { key: 'unverified', label: 'Chưa xác thực' },
  { key: 'low', label: 'Mức thấp' },
  { key: 'high', label: 'Mức cao' },
  { key: 'suspect', label: 'Nghi ngờ' },
];

// Danh sách tên file minh chứng mẫu (tải giả lập, không upload thật).
export const SAMPLE_EVIDENCE_FILES = [
  'giay-phep-kinh-doanh-mau.pdf',
  'hoa-don-mua-hang-mau.pdf',
  'anh-cua-hang-mau.jpg',
  'hop-dong-thue-mat-bang-mau.pdf',
];

export const ACTIONS = {
  grantLow: 'Cấp mức thấp',
  upgradeHigh: 'Nâng mức cao',
  downgrade: 'Hạ xuống mức thấp',
  revoke: 'Thu hồi',
  markSuspect: 'Đánh dấu nghi ngờ',
  clearSuspect: 'Gỡ nghi ngờ',
  saveInspection: 'Lưu thẩm định',
};

export function matchesFilter(wf, key) {
  if (key === 'all') return true;
  if (key === 'pending') return Boolean(wf?.pending);
  return computeStatus(wf) === key;
}

export function filterQueue(list, key = 'all') {
  const rows = (list || []).filter((w) => matchesFilter(w, key));
  // Chờ duyệt lên trước, sau đó theo tên.
  return rows.sort((a, b) => (Number(Boolean(b.pending)) - Number(Boolean(a.pending)))
    || String(a.name || '').localeCompare(String(b.name || ''), 'vi'));
}

export function countByFilter(list) {
  const out = {};
  for (const f of FILTERS) out[f.key] = (list || []).filter((w) => matchesFilter(w, f.key)).length;
  return out;
}

export { stamp } from './time-util.js';
const validDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && !Number.isNaN(Date.parse(s));

// Trạng thái từng nút: {enabled, reason} – dùng chung cho UI và applyAction.
export function actionState(wf, action) {
  const grant = wf?.grant || 'none';
  const suspect = isSuspect(wf);
  switch (action) {
    case 'grantLow': {
      if (grant !== 'none') return { enabled: false, reason: grant === 'low' ? 'Hồ sơ đã ở mức thấp.' : 'Hồ sơ đang ở mức cao; dùng "Hạ" nếu muốn xuống mức thấp.' };
      const c = canUpgrade(wf, 'low');
      return { enabled: c.ok, reason: c.reason };
    }
    case 'upgradeHigh': {
      if (grant === 'high') return { enabled: false, reason: 'Hồ sơ đã ở mức cao.' };
      if (grant !== 'low') return { enabled: false, reason: 'Cần cấp mức thấp trước khi nâng mức cao.' };
      const c = canUpgrade(wf, 'high');
      return { enabled: c.ok, reason: c.reason };
    }
    case 'downgrade':
      return grant === 'high' ? { enabled: true, reason: '' } : { enabled: false, reason: 'Chỉ hạ được hồ sơ đang ở mức cao.' };
    case 'revoke':
      return grant !== 'none' ? { enabled: true, reason: '' } : { enabled: false, reason: 'Hồ sơ chưa được cấp mức nào để thu hồi.' };
    case 'markSuspect': {
      if (wf?.adminConfirmedSuspect) return { enabled: false, reason: 'Quản trị đã xác nhận nghi ngờ cho hồ sơ này.' };
      const acc = Number(wf?.complaints?.accepted) || 0;
      if (wf?.blacklistMatch || acc >= 3) return { enabled: true, reason: '' };
      return { enabled: false, reason: `Chưa đủ căn cứ: cần trùng danh sách giả mạo hoặc từ 3 khiếu nại đã tiếp nhận (hiện ${acc}).` };
    }
    case 'clearSuspect':
      return suspect ? { enabled: true, reason: '' } : { enabled: false, reason: 'Hồ sơ không ở trạng thái nghi ngờ.' };
    case 'saveInspection':
      return { enabled: true, reason: '' };
    default:
      return { enabled: false, reason: 'Hành động không hợp lệ.' };
  }
}

export function allActionStates(wf) {
  const out = {};
  for (const k of Object.keys(ACTIONS)) out[k] = actionState(wf, k);
  return out;
}

function pushLog(wf, action, text, reason, now) {
  wf.log = Array.isArray(wf.log) ? wf.log : [];
  const entry = { at: stamp(now), action, text: reason ? `${text} – Lý do: ${reason}` : text };
  if (reason) entry.reason = reason;
  wf.log.push(entry);
}

function inspectionSummary(i) {
  const parts = [];
  parts.push(i.call ? `gọi điện ${i.callDate || ''}`.trim() : 'chưa gọi điện');
  parts.push(i.meet ? 'đã gặp trực tiếp' : 'chưa gặp trực tiếp');
  parts.push(i.evidence ? `minh chứng: ${i.evidenceFile}` : 'chưa có minh chứng');
  return parts.join('; ');
}

// payload: { reason } cho mọi hành động; saveInspection: { call, callDate, callNote, meet, evidence, evidenceFile, note }.
export function applyAction(wf, action, payload = {}, now = new Date()) {
  const deny = (reason) => ({ ok: false, reason, wf });
  if (!wf || typeof wf !== 'object') return deny('Hồ sơ không hợp lệ.');
  if (!ACTIONS[action]) return deny('Hành động không hợp lệ.');
  const reason = String(payload?.reason ?? '').trim();
  const st = actionState(wf, action);
  if (!st.enabled) return deny(st.reason);
  const w = structuredClone(wf);

  switch (action) {
    case 'grantLow':
      w.grant = 'low'; w.pending = false;
      pushLog(w, action, 'Quản trị cấp mức thấp', reason, now);
      break;
    case 'upgradeHigh':
      w.grant = 'high'; w.pending = false;
      pushLog(w, action, 'Quản trị nâng mức cao', reason, now);
      break;
    case 'downgrade':
      w.grant = 'low'; w.pending = false;
      pushLog(w, action, 'Quản trị hạ từ mức cao xuống mức thấp', reason, now);
      break;
    case 'revoke':
      w.grant = 'none'; w.pending = false;
      w.revokedAt = new Date(now).toISOString();
      pushLog(w, action, 'Quản trị thu hồi mức xác thực (về Chưa xác thực)', reason, now);
      break;
    case 'markSuspect':
      if (!reason) return deny('Bắt buộc nhập lý do khi đánh dấu nghi ngờ.');
      w.grantBeforeSuspect = w.grant || 'none';
      w.grant = 'none';
      w.adminConfirmedSuspect = true;
      w.suspectReason = reason;
      w.pending = false;
      pushLog(w, action, 'Quản trị đánh dấu nghi ngờ', reason, now);
      break;
    case 'clearSuspect': {
      if (!reason) return deny('Bắt buộc nhập lý do khi gỡ nghi ngờ.');
      w.adminConfirmedSuspect = false;
      w.suspectReason = '';
      let extra = '';
      if (w.blacklistMatch) {
        // Quản trị đã rà soát và xác định trùng danh sách là nhầm: bỏ khớp và khôi phục mục danh sách.
        w.blacklistMatch = false;
        w.checks = w.checks || {};
        w.checks.blacklist = {
          source: 'Quản trị rà soát danh sách giả mạo', date: dateOnly(now),
          result: 'Quản trị xác nhận không phải trùng danh sách', points: MAX_POINTS.blacklist,
        };
        extra = ' (đã bỏ khớp danh sách giả mạo)';
      }
      w.grant = w.grantBeforeSuspect || 'none';
      delete w.grantBeforeSuspect;
      pushLog(w, action, `Quản trị gỡ nghi ngờ${extra}`, reason, now);
      break;
    }
    case 'saveInspection': {
      const p = payload || {};
      const prev = w.inspection || {};
      const i = {
        call: Boolean(p.call), meet: Boolean(p.meet), evidence: Boolean(p.evidence),
        callDate: '', callNote: '', evidenceFile: '', note: String(p.note ?? '').trim().slice(0, 500),
      };
      if (i.call) {
        i.callDate = String(p.callDate || dateOnly(now));
        if (!validDate(i.callDate)) return deny('Ngày gọi điện không hợp lệ (định dạng AAAA-TT-NN).');
        i.callNote = String(p.callNote ?? '').trim().slice(0, 300);
      }
      if (i.evidence) {
        if (!SAMPLE_EVIDENCE_FILES.includes(p.evidenceFile)) return deny('Hãy chọn một tên file minh chứng trong danh sách mẫu.');
        i.evidenceFile = p.evidenceFile;
      }
      w.inspection = { ...prev, ...i };
      pushLog(w, action, `Lưu thẩm định thực tế: ${inspectionSummary(i)}`, '', now);
      // Mất điều kiện thẩm định thì không giữ mức cao.
      if (w.grant === 'high' && !inspectionPassed(w)) {
        w.grant = 'low';
        pushLog(w, 'downgrade', 'Tự động hạ xuống mức thấp vì thẩm định không còn đủ điều kiện', '', now);
      }
      break;
    }
    default: return deny('Hành động không hợp lệ.');
  }
  return { ok: true, reason: '', wf: w };
}


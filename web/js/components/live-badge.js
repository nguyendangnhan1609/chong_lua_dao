// Huy hiệu động: tick + dòng "xác nhận N giây trước". Bấm luôn mở báo cáo của chính hồ sơ.
import { esc } from '../search-util.js';
import { getAll, getById } from '../store.js';
import { badgeSvg } from './badge.js';
import { liveBadgeModel } from '../badge-live.js';

const timers = new Set();
export function stopLiveBadges() { timers.forEach((t) => clearInterval(t)); timers.clear(); }

function inner(model) {
  if (!model.ok) {
    return `<span class="lb-ico lb-gray">${badgeSvg('unverified', 28)}</span><span class="lb-text"><b>Tick không còn hiệu lực</b></span>`;
  }
  return `<span class="lb-ico">${badgeSvg(model.status, 28)}</span><span class="lb-text"><b>Đã xác nhận đúng tên miền</b><small>cập nhật <span data-sec>${model.ageSec}</span> giây trước</small></span>`;
}

// Chuỗi HTML của huy hiệu động; hostDomain là tên miền của trang đang hiển thị huy hiệu.
export function liveBadgeHtml(wf, hostDomain, now = Date.now()) {
  const m = liveBadgeModel(wf, hostDomain, getAll(), now);
  return `<a class="lbadge ${m.ok ? 'lb-ok' : 'lb-off'}" data-live="${esc(wf.id)}" data-host="${esc(hostDomain)}" href="#/tra-cuu/${encodeURIComponent(wf.id)}" aria-label="${m.ok ? 'Tick đã xác nhận – xem báo cáo ChínhChủ' : 'Tick không còn hiệu lực – xem báo cáo ChínhChủ'}">${inner(m)}</a>`;
}

// Bật đồng hồ cho các huy hiệu trong root. Tự dừng khi root rời khỏi trang; router gọi stopLiveBadges khi đổi route.
export function mountLiveBadges(root) {
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tick = () => {
    if (!root.isConnected) { clearInterval(t); timers.delete(t); return; }
    const now = Date.now();
    root.querySelectorAll('[data-live]').forEach((a) => {
      const wf = getById(a.dataset.live);
      if (!wf) return;
      const m = liveBadgeModel(wf, a.dataset.host, getAll(), now);
      const was = a.classList.contains('lb-ok');
      if (m.ok === was) {
        const s = a.querySelector('[data-sec]');
        if (s) s.textContent = String(m.ageSec);
        return;
      }
      a.className = `lbadge ${m.ok ? 'lb-ok' : 'lb-off'}`;
      a.innerHTML = inner(m);
    });
  };
  const t = setInterval(tick, reduce ? 10000 : 1000);
  timers.add(t);
  return t;
}

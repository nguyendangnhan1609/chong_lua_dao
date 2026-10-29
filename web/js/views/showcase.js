// Màn "Trang web mẫu": 3 ca rõ ràng về huy hiệu động (trang thật, trang chép ảnh tick, trang bị thu hồi).
import { getById } from '../store.js';
import { computeStatus } from '../scoring.js';
import { badgeSvg, BADGE_TEXT } from '../components/badge.js';
import { liveBadgeHtml, mountLiveBadges } from '../components/live-badge.js';
import { COPY_PAGES } from '../badge-live.js';
import { esc } from '../search-util.js';

const CASES = [
  { key: 'real', wfId: 'wf-1', host: null, title: 'Ca 1. Trang thật dùng tick động',
    tagline: 'Hoa tươi giao tận nơi, mỗi ngày một sắc nắng.', items: ['Bó hướng dương', 'Lẵng hoa mini', 'Hoa cưới'],
    why: 'Khó giả vì: tick chỉ hiện khi tải từ đúng tên miền đã đăng ký, chữ ký đổi mỗi 5 phút, và bấm vào luôn mở báo cáo trên ChínhChủ.' },
  { key: 'copy', wfId: 'wf-1', host: 'hoanang-shop-sao-chep.example', title: 'Ca 2. Trang sao chép ảnh tick tĩnh',
    tagline: 'Giảm giá sâu hôm nay, chuyển khoản trước nhận hàng.', items: ['Khuyến mãi', 'Giỏ hàng', 'Liên hệ'],
    why: 'Khó giả vì: ảnh chép về không có mã ký, không có giờ xác nhận chạy theo thời gian và không dẫn tới báo cáo thật. Dùng "Kiểm tra tick" để xác nhận.' },
  { key: 'revoked', wfId: 'wf-5', host: null, title: 'Ca 3. Trang đã bị thu hồi tick',
    tagline: 'Giảm giá sốc hôm nay, chuyển khoản trước nhận hàng.', items: ['Khuyến mãi', 'Giỏ hàng', 'Liên hệ'],
    why: 'Khó giả vì: thu hồi có hiệu lực ngay ở máy chủ nên tick tự chuyển xám, dù trang vẫn còn giữ mã cũ.' },
];

function frame(url, name, tickHtml, tagline, items, note, extra = '') {
  return `<div class="mock-bar" aria-hidden="true"><i></i><i></i><i></i><span>${esc(url)}</span></div>
    <div class="mock-body">
      <div class="mock-head">
        <div class="mock-logo" aria-hidden="true">${esc(String(name).charAt(0))}</div>
        <div class="mock-title"><strong>${esc(name)}</strong></div>
      </div>
      <div class="mock-tick">${tickHtml}</div>
      ${extra}
      <p>${esc(tagline)}</p>
      <ul class="mock-nav">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
    </div>
    <p class="mock-note">${note}</p>`;
}

export function renderCase(c, wf) {
  const dom = String(wf.domain || '');
  const name = String(wf.name || dom || wf.id || '?');
  const host = c.host || dom;
  const status = computeStatus(wf);
  let tick = '', extra = '', note = '';
  if (c.key === 'copy') {
    tick = `<span class="static-tick">${badgeSvg('high', 28)}<span>Tick xanh (ảnh)</span></span>`;
    extra = `<div class="tick-warn" role="alert"><b>Đây là ảnh tĩnh, không có xác nhận từ ChínhChủ.</b>
      <a class="btn" href="#/kiem-tra-tick/${encodeURIComponent(host)}">Kiểm tra tick</a></div>`;
    note = `Trang chép ảnh tick (tên miền ${esc(host)} không phải ${esc(dom)}).`;
  } else {
    tick = liveBadgeHtml(wf, host);
    note = c.key === 'real'
      ? `Trạng thái hiện tại: <b>${esc(BADGE_TEXT[status])}</b>. Bấm tick để xem báo cáo.`
      : `Trạng thái hiện tại: <b>${esc(BADGE_TEXT[status])}</b>. Tick xám vì hồ sơ không còn hiệu lực.`;
  }
  return `<article class="card mock mock-${c.key}" data-case="${c.key}"><h2 class="mock-case">${esc(c.title)}</h2>
    ${frame(host, name, tick, c.tagline, c.items, note, extra)}
    <p class="mock-why">${esc(c.why)}</p></article>`;
}

export function render(container) {
  const cards = CASES.map((c) => { const wf = getById(c.wfId); return wf && typeof wf === 'object' ? renderCase(c, wf) : ''; }).join('');
  const legend = Object.keys(BADGE_TEXT).map((s) => `<li>${badgeSvg(s, 22)}<span>${esc(BADGE_TEXT[s])}</span></li>`).join('');
  const wrap = document.createElement('section');
  wrap.innerHTML = `<h1>Trang web mẫu</h1>
    <p>Giả lập cách huy hiệu động hiển thị trên website/fanpage. Thay đổi ở góc nhìn Quản trị (ví dụ thu hồi) sẽ phản ánh ngay tại đây.</p>
    <ul class="legend">${legend}</ul>${cards}
    <p><a class="btn" href="#/kiem-tra-tick">Mở công cụ Kiểm tra tick</a></p>`;
  container.append(wrap);
  mountLiveBadges(wrap);
}

// Màn "Trang web mẫu": mockup website/fanpage có huy hiệu phản ánh trạng thái hiện tại trong store.
import { getById } from '../store.js';
import { computeStatus } from '../scoring.js';
import { badgeLink, badgeSvg, BADGE_TEXT } from '../components/badge.js';
import { esc } from '../search-util.js';

const MOCKS = [
  { id: 'wf-1', kind: 'site', tagline: 'Hoa tươi giao tận nơi, mỗi ngày một sắc nắng.', items: ['Bó hướng dương', 'Lẵng hoa mini', 'Hoa cưới'] },
  { id: 'wf-3', kind: 'fanpage', tagline: 'Cà phê nhìn ra biển – mở cửa 7h đến 22h.', items: ['Bài viết', 'Ảnh', 'Đánh giá'] },
  { id: 'wf-5', kind: 'site', tagline: 'Giảm giá sốc hôm nay, chuyển khoản trước nhận hàng.', items: ['Khuyến mãi', 'Giỏ hàng', 'Liên hệ'] },
];

export function renderMock(m, wf) {
  const status = computeStatus(wf);
  const dom = String(wf.domain || '');
  const url = m.kind === 'fanpage' ? `social.example/${dom.split('.')[0]}` : dom;
  const name = String(wf.name || dom || wf.id || '?');
  return `<article class="card mock" data-wf="${esc(wf.id)}">
    <div class="mock-bar" aria-hidden="true"><i></i><i></i><i></i><span>${esc(url)}</span></div>
    <div class="mock-body">
      <div class="mock-head">
        <div class="mock-logo" aria-hidden="true">${esc(name.charAt(0))}</div>
        <div class="mock-title"><strong>${esc(name)}</strong>${badgeLink(status, wf.id, { label: false })}</div>
      </div>
      <p>${esc(m.tagline)}</p>
      <ul class="mock-nav">${m.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
    </div>
    <p class="mock-note">${m.kind === 'fanpage' ? 'Fanpage mẫu' : 'Website mẫu'} · trạng thái hiện tại: <b>${esc(BADGE_TEXT[status])}</b>. Bấm huy hiệu để xem báo cáo.</p>
  </article>`;
}

export function render(container) {
  const cards = MOCKS.map((m) => { const wf = getById(m.id); return wf && typeof wf === 'object' ? renderMock(m, wf) : ''; }).join('');
  const legend = Object.keys(BADGE_TEXT).map((s) => `<li>${badgeSvg(s, 22)}<span>${esc(BADGE_TEXT[s])}</span></li>`).join('');
  const wrap = document.createElement('section');
  wrap.innerHTML = `<h1>Trang web mẫu</h1>
    <p>Giả lập cách huy hiệu hiển thị trên website/fanpage của doanh nghiệp. Huy hiệu đổi theo trạng thái hiện tại (thay đổi ở góc nhìn Quản trị sẽ phản ánh tại đây).</p>
    <ul class="legend">${legend}</ul>${cards}`;
  container.append(wrap);
}

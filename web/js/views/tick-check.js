// Công cụ "Kiểm tra tick" (#/kiem-tra-tick): dán địa chỉ trang đang thấy tick, hệ thống (giả lập) quét mã huy hiệu.
import { getAll } from '../store.js';
import { esc } from '../search-util.js';
import { scanPage, VERDICT } from '../badge-live.js';
import { badgeSvg } from '../components/badge.js';

const EXAMPLES = [
  ['Trang chính chủ', 'hoanang-shop.example'],
  ['Trang chép ảnh tick', 'hoanang-shop-sao-chep.example'],
  ['Trang đã thu hồi', 'hoanang-shop-vn.example'],
];
const CLS = { [VERDICT.real]: 'tc-real', [VERDICT.fake]: 'tc-fake', [VERDICT.revoked]: 'tc-revoked', [VERDICT.none]: 'tc-none' };
const ICON = { [VERDICT.real]: 'high', [VERDICT.fake]: 'suspect', [VERDICT.revoked]: 'unverified', [VERDICT.none]: 'unverified' };

export function resultHtml(r) {
  const link = r.wfId ? `<p><a class="quick-link" href="#/tra-cuu/${encodeURIComponent(r.wfId)}">Mở báo cáo ChínhChủ của hồ sơ này</a></p>` : '';
  return `<section class="card tc-result ${CLS[r.verdict] || ''}" role="status">
    <div class="tc-head">${badgeSvg(ICON[r.verdict] || 'unverified', 32)}<h2>${esc(r.verdict)}</h2></div>
    <p class="muted">Trang: ${esc(r.domain)}</p><p>${esc(r.detail)}</p>${link}
    <p class="note">Kết quả giả lập từ trang mẫu. Bản thật quét trang bằng máy chủ và extension trình duyệt.</p></section>`;
}

export function render(container, params = []) {
  const sec = document.createElement('section');
  sec.innerHTML = `<h1>Kiểm tra tick</h1>
    <p>Đang thấy tick xanh trên một trang? Dán địa chỉ trang đó để kiểm tra tick có phải của ChínhChủ và đúng tên miền hay không.</p>
    <form class="card sform" novalidate>
      <label for="tc-url">Địa chỉ trang đang thấy tick</label>
      <div class="srow"><input id="tc-url" type="text" autocomplete="off" inputmode="url" maxlength="200" placeholder="vd: hoanang-shop.example">
      <button type="submit">Kiểm tra tick</button></div>
    </form>
    <div data-result aria-live="polite"></div>
    <section class="card quick"><h2>Thử nhanh</h2><ul class="pick">${EXAMPLES.map(([t, d]) =>
      `<li><a href="#/kiem-tra-tick/${encodeURIComponent(d)}"><b>${esc(t)}</b><span>${esc(d)}</span></a></li>`).join('')}</ul></section>`;
  container.append(sec);
  const input = sec.querySelector('#tc-url');
  const box = sec.querySelector('[data-result]');
  const run = (v) => { box.innerHTML = String(v || '').trim() ? resultHtml(scanPage(v, getAll())) : ''; };
  sec.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); run(input.value); });
  if (params[0]) { input.value = params[0]; run(params[0]); }
}

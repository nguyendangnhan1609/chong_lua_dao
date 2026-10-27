// Màn "Tra cứu" (người dùng): ô nhập có gợi ý, báo cáo WF, khiếu nại giả lập.
import { getAll, getById, update, addLog } from '../store.js';
import { CHECK_KEYS, CHECK_LABELS, MAX_POINTS, STATUS_LABELS, computeScore, computeStatus } from '../scoring.js';
import { esc, suggest, resolve } from '../search-util.js';
import { badgeSvg } from '../components/badge.js';

const REASONS = ['Giả mạo thương hiệu / tên gần giống', 'Thông tin liên hệ không đúng', 'Yêu cầu chuyển tiền bất thường', 'Lý do khác'];

function statusPill(status) {
  return `<span class="status-pill st-${status}">${badgeSvg(status, 22)}<span>${esc(STATUS_LABELS[status])}</span></span>`;
}

export function reportHtml(wf) {
  const status = computeStatus(wf);
  const score = computeScore(wf);
  const rows = CHECK_KEYS.map((k) => {
    const c = wf.checks[k] || {};
    return `<li class="check"><div class="check-head"><b>${esc(CHECK_LABELS[k])}</b><span class="pts">${esc(c.points ?? 0)}/${MAX_POINTS[k]}</span></div>
      <div class="check-meta">Nguồn: ${esc(c.source)} · Ngày: ${esc(c.date)}</div>
      <div>${esc(c.result)}</div></li>`;
  }).join('');
  const i = wf.inspection || {};
  const hasInsp = i.call || i.meet || i.evidence || i.note;
  const insp = hasInsp ? `<section class="card"><h2>Thẩm định thực tế</h2><ul>
      <li>Gọi điện: ${i.call ? 'đã thực hiện' : 'chưa'}</li><li>Gặp trực tiếp: ${i.meet ? 'đã thực hiện' : 'chưa'}</li><li>Minh chứng: ${i.evidence ? 'có' : 'chưa có'}</li></ul>
      ${i.note ? `<p>${esc(i.note)}</p>` : ''}</section>` : '';
  const acc = Number(wf.complaints?.accepted) || 0;
  const suspect = status === 'suspect' ? `<section class="card warn"><h2>Lý do nghi ngờ</h2><p>${esc(wf.suspectReason || 'Trùng danh sách website giả mạo.')}</p>
      <p>Số khiếu nại đã tiếp nhận: <b data-complaints>${acc}</b></p></section>` : '';
  const pending = wf.pending ? `<p class="note">Hồ sơ đang chờ duyệt: kết quả có thể thay đổi sau khi quản trị viên xử lý.</p>` : '';
  return `<article class="report" data-wf="${esc(wf.id)}">
    <section class="card">
      ${statusPill(status)}
      <h1>${esc(wf.name)}</h1>
      <p class="muted">${esc(wf.domain)}${wf.owner ? ' · ' + esc(wf.owner) : ''}</p>
      <div class="score"><b>${score}</b>/100</div>
      <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${score}"><i style="width:${score}%"></i></div>
      ${pending}
    </section>
    ${suspect}
    <section class="card"><h2>5 mục kiểm tra</h2><ul class="checks">${rows}</ul></section>
    ${insp}
    <section class="card ai"><h2>Gợi ý AI</h2><p>${esc(wf.ai)}</p>
      <p class="note">Chỉ tham khảo, không cộng điểm, không đổi mức.</p></section>
    <section class="card"><h2>Khiếu nại</h2>
      <p>Nếu thấy thông tin chưa đúng, bạn có thể gửi khiếu nại. Quản trị viên sẽ xem xét và quyết định; khiếu nại không tự đổi trạng thái.</p>
      <button type="button" data-open-complaint>Gửi khiếu nại</button>
      <div data-complaint-slot></div></section>
  </article>`;
}

export function unknownHtml(query) {
  return `<article class="report"><section class="card">
    ${statusPill('unverified')}
    <h1>${esc(query)}</h1>
    <p>Chưa có trong dữ liệu ChínhChủ nên được xem là <b>Chưa xác thực</b>. Điều này không có nghĩa là không đáng tin; chỉ là chưa được kiểm tra.</p>
    <h2>Dành cho doanh nghiệp</h2>
    <p>Nếu đây là website/fanpage của bạn, hãy đăng ký để được xác thực và nhận huy hiệu.</p>
    <a class="btn" href="#/doanh-nghiep">Đăng ký xác thực</a></section></article>`;
}

function complaintForm(slot, wf, article) {
  slot.innerHTML = `<form class="cform" novalidate>
    <label>Lý do<select name="reason">${REASONS.map((r) => `<option>${esc(r)}</option>`).join('')}</select></label>
    <label>Mô tả<textarea name="desc" rows="3" maxlength="500" placeholder="Mô tả ngắn điều bạn thấy"></textarea></label>
    <p class="note">Giả lập: không gửi đi đâu, chỉ ghi nhận trong trình duyệt này.</p>
    <button type="submit">Gửi</button></form>`;
  slot.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const reason = f.reason.value;
    const updated = update(wf.id, (w) => {
      w.complaints = w.complaints || { count: 0, accepted: 0 };
      w.complaints.count = (Number(w.complaints.count) || 0) + 1;
      w.complaints.accepted = (Number(w.complaints.accepted) || 0) + 1;
      addLog(w, `Tiếp nhận khiếu nại: ${reason}`);
    });
    slot.innerHTML = `<p class="thanks" role="status">Cảm ơn bạn. Khiếu nại đã được tiếp nhận (hiện có ${esc(updated?.complaints?.accepted ?? '')} khiếu nại). Trạng thái chỉ thay đổi khi quản trị viên xác nhận.</p>`;
    const c = article.querySelector('[data-complaints]');
    if (c && updated) c.textContent = String(updated.complaints.accepted);
  });
}

function showReport(box, query) {
  const r = resolve(getAll(), query);
  if (r.type === 'empty') { box.innerHTML = ''; return; }
  if (r.type === 'none') { box.innerHTML = unknownHtml(query); return; }
  if (r.type === 'multiple') {
    box.innerHTML = `<section class="card"><h2>Có nhiều kết quả, hãy chọn một</h2><ul class="pick">${r.matches.map((w) =>
      `<li><a href="#/tra-cuu/${encodeURIComponent(w.id)}"><b>${esc(w.name)}</b><span>${esc(w.domain)}</span></a></li>`).join('')}</ul></section>`;
    return;
  }
  box.innerHTML = reportHtml(r.wf);
  const article = box.querySelector('.report');
  const slot = box.querySelector('[data-complaint-slot]');
  box.querySelector('[data-open-complaint]').addEventListener('click', () => complaintForm(slot, getById(r.wf.id), article));
}

export function render(container, params = []) {
  const list = getAll();
  const initial = params[0] || '';
  const sec = document.createElement('section');
  sec.innerHTML = `<h1>Tra cứu website / fanpage</h1>
    <form class="card sform" role="search" novalidate>
      <label for="q">Nhập địa chỉ hoặc tên (gõ có dấu hoặc không dấu đều được)</label>
      <div class="srow"><input id="q" name="q" type="text" autocomplete="off" inputmode="url" maxlength="200" placeholder="vd: hoanang-shop.example hoặc Hoa Nang" aria-controls="sug">
      <button type="submit">Tra cứu</button></div>
      <ul id="sug" class="sug" role="listbox" hidden></ul>
    </form>
    <div data-result></div>
    <section class="card quick"><h2>Thử nhanh</h2><ul class="pick">${list.slice(0, 6).map((w) =>
      `<li><a href="#/tra-cuu/${encodeURIComponent(w.id)}"><b>${esc(w.name)}</b><span>${esc(w.domain)}</span></a></li>`).join('')}</ul></section>`;
  container.append(sec);
  const input = sec.querySelector('#q');
  const sug = sec.querySelector('#sug');
  const box = sec.querySelector('[data-result]');
  const hide = () => { sug.hidden = true; sug.replaceChildren(); };
  input.addEventListener('input', () => {
    const items = suggest(getAll(), input.value);
    if (!items.length) { hide(); return; }
    sug.innerHTML = items.map((w) => `<li role="option"><button type="button" data-id="${esc(w.id)}"><b>${esc(w.name)}</b><span>${esc(w.domain)}</span></button></li>`).join('');
    sug.hidden = false;
  });
  sug.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-id]');
    if (!b) return;
    hide();
    location.hash = '#/tra-cuu/' + encodeURIComponent(b.dataset.id);
  });
  sec.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    hide();
    const v = input.value.trim();
    if (!v) { box.innerHTML = ''; return; }
    const r = resolve(getAll(), v);
    if (r.type === 'exact' && location.hash !== '#/tra-cuu/' + encodeURIComponent(r.wf.id)) location.hash = '#/tra-cuu/' + encodeURIComponent(r.wf.id);
    else showReport(box, v);
  });
  if (initial) { input.value = initial; showReport(box, initial); }
}

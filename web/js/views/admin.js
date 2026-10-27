// Màn "Quản trị": hàng đợi hồ sơ (#/quan-tri) và chi tiết/thẩm định (#/quan-tri/<id>).
import { getAll, getById, update, reset } from '../store.js';
import { CHECK_KEYS, CHECK_LABELS, MAX_POINTS, STATUS_LABELS, computeScore, computeStatus } from '../scoring.js';
import { esc } from '../search-util.js';
import { badgeSvg } from '../components/badge.js';
import {
  FILTERS, ACTIONS, SAMPLE_EVIDENCE_FILES, filterQueue, countByFilter, actionState, applyAction,
} from '../admin-util.js';

let filter = 'all';
let root = null;
let toastTimer = 0;

function toast(msg, ok = true) {
  let t = document.querySelector('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'status');
    t.setAttribute('aria-live', 'polite');
    document.body.append(t);
  }
  t.textContent = msg;
  t.classList.toggle('bad', !ok);
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

const pill = (status) => `<span class="status-pill st-${status}">${badgeSvg(status, 20)}<span>${esc(STATUS_LABELS[status])}</span></span>`;

function queue() {
  const list = getAll();
  const counts = countByFilter(list);
  const rows = filterQueue(list, filter);
  root.innerHTML = `<h1>Quản trị</h1>
    <section class="card"><h2>Hàng đợi hồ sơ</h2>
      <div class="chips" role="group" aria-label="Lọc theo trạng thái">
        ${FILTERS.map((f) => `<button type="button" class="chip" data-filter="${esc(f.key)}" aria-pressed="${f.key === filter}">${esc(f.label)} <b>${counts[f.key]}</b></button>`).join('')}
      </div>
      <ul class="queue">${rows.length ? rows.map((w) => {
        const st = computeStatus(w);
        return `<li><a class="qcard" href="#/quan-tri/${encodeURIComponent(w.id)}">
          <span class="qtop"><b>${esc(w.name)}</b>${w.pending ? '<span class="flag">Chờ duyệt</span>' : ''}</span>
          <span class="muted">${esc(w.domain)}</span>
          <span class="qbot">${pill(st)}<span class="qscore"><b>${computeScore(w)}</b>/100</span></span></a></li>`;
      }).join('') : '<li class="muted">Không có hồ sơ nào trong nhóm này.</li>'}</ul>
      <button type="button" class="secondary" data-reset>Đặt lại dữ liệu mẫu</button>
    </section>`;
  root.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => { filter = b.dataset.filter; queue(); }));
  root.querySelector('[data-reset]').addEventListener('click', () => {
    if (!confirm('Đặt lại toàn bộ dữ liệu về bộ mẫu ban đầu? Mọi thay đổi trong phiên này sẽ mất.')) return;
    reset();
    filter = 'all';
    queue();
    toast('Đã đặt lại dữ liệu mẫu.');
  });
}

function checksHtml(wf) {
  return `<ul class="checks tight">${CHECK_KEYS.map((k) => {
    const c = wf.checks?.[k] || {};
    return `<li class="check"><div class="check-head"><b>${esc(CHECK_LABELS[k])}</b><span class="pts">${Number(c.points) || 0}/${MAX_POINTS[k]}</span></div>
      <div class="check-meta muted">Nguồn: ${esc(c.source || '—')} · Ngày: ${esc(c.date || '—')}</div>
      <div>Kết quả: ${esc(c.result || '—')}</div></li>`;
  }).join('')}</ul>`;
}

function actionBtn(wf, action, cls = '') {
  const s = actionState(wf, action);
  return `<div class="abtn"><button type="button" class="${cls}" data-action="${action}" ${s.enabled ? '' : 'disabled aria-disabled="true"'} aria-describedby="why-${action}">${esc(ACTIONS[action])}</button>
    <p class="why" id="why-${action}">${s.enabled ? '' : `Khóa: ${esc(s.reason)}`}</p></div>`;
}

function detail(id) {
  const wf = getById(id);
  if (!wf) {
    root.innerHTML = `<h1>Quản trị</h1><section class="card"><p class="warnmsg">Không tìm thấy hồ sơ này.</p><a class="btn" href="#/quan-tri">Về hàng đợi</a></section>`;
    return;
  }
  const st = computeStatus(wf);
  const i = wf.inspection || {};
  const log = [...(wf.log || [])].reverse();
  const cmp = wf.complaints || {};
  root.innerHTML = `<p><a href="#/quan-tri" class="back">← Về hàng đợi</a></p>
    <h1>${esc(wf.name)}</h1>
    <section class="card">
      <p class="muted">${esc(wf.domain)} · MST ${esc(wf.mst || '—')}${wf.pending ? ' · <span class="flag">Chờ duyệt</span>' : ''}</p>
      ${pill(st)}
      <div class="score"><b>${computeScore(wf)}</b>/100</div>
      ${st === 'suspect' ? `<p class="warnmsg">Lý do nghi ngờ: ${esc(wf.suspectReason || 'chưa ghi')} · Khiếu nại đã tiếp nhận: ${Number(cmp.accepted) || 0}</p>` : ''}
    </section>
    <section class="card"><h2>Kết quả kiểm tra tự động</h2>${checksHtml(wf)}</section>
    <section class="card"><h2>Gợi ý AI</h2><p class="note">Chỉ tham khảo, không cộng điểm và không đổi mức.</p><p>${esc(wf.ai || 'Chưa có gợi ý.')}</p></section>
    <section class="card"><h2>Khiếu nại</h2><p>Tổng số: <b>${Number(cmp.count) || 0}</b> · Đã tiếp nhận: <b>${Number(cmp.accepted) || 0}</b></p></section>
    <section class="card"><h2>Thẩm định thực tế</h2>
      <form class="iform" novalidate>
        <label class="radio"><input type="checkbox" name="call" ${i.call ? 'checked' : ''}><span>Đã gọi điện</span></label>
        <label for="i-calldate">Ngày gọi</label><input id="i-calldate" name="callDate" type="date" value="${esc(i.callDate || '')}">
        <label for="i-callnote">Ghi chú cuộc gọi</label><input id="i-callnote" name="callNote" type="text" maxlength="300" value="${esc(i.callNote || '')}">
        <label class="radio"><input type="checkbox" name="meet" ${i.meet ? 'checked' : ''}><span>Đã gặp trực tiếp</span></label>
        <label class="radio"><input type="checkbox" name="evidence" ${i.evidence ? 'checked' : ''}><span>Có minh chứng (tải giả lập)</span></label>
        <label for="i-file">Tên file minh chứng mẫu</label>
        <select id="i-file" name="evidenceFile"><option value="">– Chọn file mẫu –</option>${SAMPLE_EVIDENCE_FILES.map((f) => `<option value="${esc(f)}" ${f === i.evidenceFile ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select>
        <label for="i-note">Ghi chú chung</label><textarea id="i-note" name="note" rows="3" maxlength="500">${esc(i.note || '')}</textarea>
        <p class="err" data-ierr role="alert"></p>
        <button type="submit">Lưu thẩm định</button>
      </form></section>
    <section class="card"><h2>Hành động</h2>
      <label for="a-reason">Lý do (bắt buộc khi đánh dấu / gỡ nghi ngờ)</label>
      <input id="a-reason" type="text" maxlength="300" autocomplete="off">
      <p class="err" data-aerr role="alert"></p>
      <div class="actions">${['grantLow', 'upgradeHigh', 'downgrade', 'revoke', 'markSuspect', 'clearSuspect'].map((a) => actionBtn(wf, a, a === 'markSuspect' ? 'warn' : '')).join('')}</div>
    </section>
    <section class="card"><h2>Nhật ký hồ sơ</h2>
      <ul class="logs">${log.length ? log.map((l) => `<li><span class="muted">${esc(l.at)}</span> ${esc(l.text)}</li>`).join('') : '<li class="muted">Chưa có nhật ký.</li>'}</ul></section>`;

  const run = (action, payload, errBox) => {
    const cur = getById(id);
    const r = applyAction(cur, action, payload);
    if (!r.ok) {
      errBox.textContent = r.reason;
      toast(r.reason, false);
      return;
    }
    update(id, (w) => { for (const k of Object.keys(w)) delete w[k]; Object.assign(w, r.wf); });
    detail(id);
    toast(`Đã thực hiện: ${ACTIONS[action]}.`);
  };
  const form = root.querySelector('.iform');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const g = (n) => form.elements.namedItem(n);
    run('saveInspection', {
      call: g('call').checked, callDate: g('callDate').value, callNote: g('callNote').value,
      meet: g('meet').checked, evidence: g('evidence').checked, evidenceFile: g('evidenceFile').value, note: g('note').value,
    }, root.querySelector('[data-ierr]'));
  });
  root.querySelectorAll('[data-action]').forEach((b) => b.addEventListener('click', () => {
    const errBox = root.querySelector('[data-aerr]');
    errBox.textContent = '';
    run(b.dataset.action, { reason: root.querySelector('#a-reason').value }, errBox);
  }));
}

export function render(container, params = []) {
  const sec = document.createElement('section');
  container.append(sec);
  root = sec;
  if (params[0]) detail(params[0]); else queue();
}

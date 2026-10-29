// Màn "Doanh nghiệp": luồng 4 bước (đăng ký → chứng minh sở hữu → theo dõi điểm → huy hiệu).
import { getAll, getById, add, update, addLog, getSelectedId, setSelectedId } from '../store.js';
import { CHECK_KEYS, CHECK_LABELS, MAX_POINTS, STATUS_LABELS, computeScore, computeStatus } from '../scoring.js';
import { esc } from '../search-util.js';
import { badgeSvg } from '../components/badge.js';
import { liveBadgeHtml, mountLiveBadges } from '../components/live-badge.js';
import { makeEmbedSnippet, makeEmbedCode, periodOf, secondsToNextPeriod } from '../badge-live.js';
import {
  OWNERSHIP_METHODS, validateRegistration, createWf, generateProofCode, proveOwnership, todoList, badgeAvailability,
} from '../business-util.js';

const STEPS = ['Đăng ký', 'Chứng minh sở hữu', 'Theo dõi điểm', 'Huy hiệu'];
let step = 0;        // 0-based
let started = false; // đã tự chọn bước đầu tiên chưa
const proofState = { method: 'page', code: '' };

const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function current() {
  const id = getSelectedId();
  return (id && getById(id)) || null;
}

function stepBar() {
  const wf = current();
  return `<ol class="steps" aria-label="Các bước">${STEPS.map((t, i) => {
    const locked = i > 0 && !wf;
    const cls = i === step ? 'on' : i < step ? 'done' : '';
    return `<li class="${cls}"><button type="button" data-step="${i}" ${locked ? 'disabled' : ''} ${i === step ? 'aria-current="step"' : ''}><span class="n">${i + 1}</span><span class="t">${esc(t)}</span></button></li>`;
  }).join('')}</ol>`;
}

function profilePicker() {
  const list = getAll();
  const mine = list.filter((w) => w.userCreated);
  const samples = list.filter((w) => !w.userCreated);
  const sel = getSelectedId();
  const opt = (w) => `<option value="${esc(w.id)}" ${w.id === sel ? 'selected' : ''}>${esc(w.name || w.domain || w.id)} (${esc(w.domain)})</option>`;
  return `<div class="card"><label for="wfsel">WF đang đăng ký / theo dõi</label>
    <select id="wfsel"><option value="">– Chưa chọn –</option>
      ${mine.length ? `<optgroup label="Hồ sơ của bạn">${mine.map(opt).join('')}</optgroup>` : ''}
      <optgroup label="WF mẫu (xem giả lập)">${samples.map(opt).join('')}</optgroup></select></div>`;
}

function field(name, label, type, ph, errors, vals, extra = '') {
  const err = errors[name];
  return `<label for="f-${name}">${esc(label)}</label>
    <input id="f-${name}" name="${name}" type="${type}" ${extra} placeholder="${esc(ph)}" value="${esc(vals[name] || '')}" ${err ? `aria-invalid="true" aria-describedby="e-${name}"` : ''}>
    ${err ? `<p class="err" id="e-${name}" role="alert">${esc(err)}</p>` : ''}`;
}

function step1(box, errors = {}, vals = {}) {
  box.innerHTML = `<section class="card"><h2>1. Đăng ký website/fanpage</h2>
    <form class="bform" novalidate>
      ${field('name', 'Tên doanh nghiệp / thương hiệu', 'text', 'vd: Cửa hàng Hoa Mai', errors, vals, 'maxlength="120" autocomplete="organization"')}
      ${field('domain', 'Địa chỉ website/fanpage (WF)', 'text', 'vd: hoamai-shop.example', errors, vals, 'inputmode="url" autocapitalize="none" maxlength="200"')}
      ${field('mst', 'Mã số thuế (10 hoặc 13 số)', 'text', 'vd: 0100000099', errors, vals, 'inputmode="numeric" maxlength="20"')}
      ${field('phone', 'Số điện thoại', 'tel', 'vd: 0900 000 099', errors, vals, 'autocomplete="tel" maxlength="20"')}
      ${field('email', 'Email', 'email', 'vd: lienhe@hoamai.example', errors, vals, 'autocomplete="email" maxlength="120"')}
      <p class="note plan">Gói demo – 0đ, thanh toán giả lập (không thu tiền thật).</p>
      <button type="submit">Thanh toán giả lập và gửi hồ sơ</button>
    </form></section>`;
  box.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const g = (n) => f.elements.namedItem(n).value;
    const input = { name: g('name'), domain: g('domain'), mst: g('mst'), phone: g('phone'), email: g('email') };
    const r = validateRegistration(input, getAll());
    if (!r.ok) {
      step1(box, r.errors, input);
      const first = box.querySelector('[aria-invalid="true"]');
      if (first) first.focus();
      return;
    }
    const wf = add(createWf(r.values, getAll()));
    setSelectedId(wf.id);
    proofState.code = '';
    step = 1;
    draw();
  });
}

function step2(box) {
  const wf = current();
  if (wf.ownershipProven) {
    box.innerHTML = `<section class="card"><h2>2. Chứng minh quyền sở hữu</h2>
      <p class="okmsg" role="status">Đã chứng minh quyền sở hữu <b>${esc(wf.domain)}</b> (+${MAX_POINTS.ownership} điểm).</p>
      <button type="button" data-goto="2">Xem điểm của tôi</button></section>`;
    return;
  }
  if (!proofState.code) proofState.code = generateProofCode(proofState.method);
  const how = {
    page: 'Dán dòng sau vào phần &lt;head&gt; trang chủ của bạn:',
    file: 'Tạo file có tên sau ở thư mục gốc website (nội dung tùy ý):',
    email: 'Mã đã được gửi về email đăng ký (giả lập). Nhập/giữ mã sau:',
  };
  box.innerHTML = `<section class="card"><h2>2. Chứng minh quyền sở hữu</h2>
    <p>Hồ sơ: <b>${esc(wf.name)}</b> (${esc(wf.domain)}). Chọn một cách:</p>
    <fieldset class="methods"><legend class="sr">Cách chứng minh</legend>
      ${Object.entries(OWNERSHIP_METHODS).map(([k, t]) => `<label class="radio"><input type="radio" name="method" value="${esc(k)}" ${k === proofState.method ? 'checked' : ''}><span>${esc(t)}</span></label>`).join('')}
    </fieldset>
    <p>${how[proofState.method]}</p>
    <pre class="code" tabindex="0">${esc(proofState.code)}</pre>
    <p class="note">Mã giả lập, chỉ để minh họa; không kiểm tra website thật.</p>
    <button type="button" data-check>Kiểm tra</button>
    <div data-proof-out aria-live="polite"></div></section>`;
  box.querySelectorAll('input[name=method]').forEach((r) => r.addEventListener('change', () => {
    proofState.method = r.value;
    proofState.code = generateProofCode(r.value);
    step2(box);
  }));
  const btn = box.querySelector('[data-check]');
  const out = box.querySelector('[data-proof-out]');
  btn.addEventListener('click', () => {
    btn.disabled = true;
    out.innerHTML = `<p class="spin"><span class="spinner" aria-hidden="true"></span> Đang kiểm tra…</p>`;
    const method = proofState.method;
    setTimeout(() => {
      if (!box.isConnected) return;
      update(wf.id, (w) => proveOwnership(w, method));
      proofState.code = '';
      step = 2;
      draw();
    }, 1000 + Math.floor(Math.random() * 1000));
  });
}

function step3(box) {
  const wf = current();
  const status = computeStatus(wf);
  const score = computeScore(wf);
  const todo = todoList(wf);
  const rows = CHECK_KEYS.map((k) => {
    const p = Number(wf.checks?.[k]?.points) || 0;
    const pct = Math.round((p / MAX_POINTS[k]) * 100);
    return `<li class="check"><div class="check-head"><b>${esc(CHECK_LABELS[k])}</b><span class="pts">${p}/${MAX_POINTS[k]}</span></div>
      <div class="bar" role="progressbar" aria-label="${esc(CHECK_LABELS[k])}" aria-valuemin="0" aria-valuemax="${MAX_POINTS[k]}" aria-valuenow="${p}"><i style="width:${pct}%"></i></div></li>`;
  }).join('');
  box.innerHTML = `<section class="card"><h2>3. Theo dõi điểm</h2>
    <span class="status-pill st-${status}">${badgeSvg(status, 22)}<span>${esc(STATUS_LABELS[status])}</span></span>
    <p class="muted">${esc(wf.name)} · ${esc(wf.domain)}</p>
    <div class="score"><b>${score}</b>/100</div>
    <div class="bar" role="progressbar" aria-label="Tổng điểm" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${score}"><i style="width:${score}%"></i></div>
    <ul class="checks tight">${rows}</ul>
    <button type="button" data-refresh>Làm mới</button></section>
    <section class="card"><h2>Việc cần làm để lên mức cao</h2>
      ${todo.length ? `<ul class="todo">${todo.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '<p class="okmsg">Bạn đã đạt mức cao. Không còn việc cần làm.</p>'}
      ${!wf.ownershipProven ? '<button type="button" data-goto="1">Chứng minh sở hữu ngay</button>' : ''}</section>`;
}

function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  return new Promise((resolve, reject) => {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.append(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    ok ? resolve() : reject(new Error('copy failed'));
  });
}

function step4(box) {
  const wf = current();
  const av = badgeAvailability(wf);
  if (!av.ok) {
    box.innerHTML = `<section class="card"><h2>4. Huy hiệu</h2><p class="warnmsg">${esc(av.reason)}</p>
      <button type="button" data-goto="2">Xem việc cần làm</button></section>`;
    return;
  }
  const now = Date.now();
  const code = makeEmbedSnippet(wf, now);
  box.innerHTML = `<section class="card"><h2>4. Huy hiệu động</h2>
    <p>Huy hiệu hiện tại của bạn trên trang ${esc(wf.domain)} (bấm để xem báo cáo ChínhChủ):</p>
    <p>${liveBadgeHtml(wf, wf.domain, now)}</p>
    <p>Dán đoạn mã sau vào website/fanpage:</p>
    <pre class="code" tabindex="0" data-embed>${esc(code)}</pre>
    <button type="button" data-copy>Sao chép</button>
    <p class="note" data-copy-msg role="status"></p>
    <p class="note">Mã ký chu kỳ ${periodOf(now)} (${esc(makeEmbedCode(wf, now).split('.').pop())}), đổi sau khoảng ${Math.ceil(secondsToNextPeriod(now) / 60)} phút. Script tự lấy mã mới, bạn không cần dán lại.</p></section>
    <section class="card"><h2>Cơ chế chống giả</h2><ul class="todo">
      <li>Kiểm tra tên miền: tick chỉ hiện khi trang tải từ đúng tên miền đã đăng ký; chép sang trang khác sẽ không hiện.</li>
      <li>Chữ ký đổi định kỳ (5 phút) và thu hồi có hiệu lực ngay: tick tự chuyển xám.</li>
      <li>Bấm vào tick luôn mở báo cáo trên ChínhChủ, không thể trỏ sang đích giả.</li></ul>
    <p class="note">Bản demo giả lập chữ ký; bản thật dùng script ký số và máy chủ kiểm origin.</p></section>`;
  mountLiveBadges(box);
  box.querySelector('[data-copy]').addEventListener('click', () => {
    const msg = box.querySelector('[data-copy-msg]');
    copyText(code).then(() => { msg.textContent = 'Đã sao chép.'; }, () => { msg.textContent = 'Không sao chép được, hãy chọn đoạn mã và sao chép thủ công.'; });
  });
}

let root = null;
function draw() {
  if (!root) return;
  const wf = current();
  if (!wf && step > 0) step = 0;
  root.innerHTML = `<h1>Doanh nghiệp</h1>${stepBar()}${profilePicker()}<div data-step-box></div>`;
  const box = root.querySelector('[data-step-box]');
  [step1, step2, step3, step4][step](box);
  root.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => { step = Number(b.dataset.step); draw(); }));
  root.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => { step = Number(b.dataset.goto); draw(); }));
  const r = root.querySelector('[data-refresh]');
  if (r) r.addEventListener('click', draw);
  root.querySelector('#wfsel').addEventListener('change', (e) => {
    setSelectedId(e.target.value);
    proofState.code = '';
    const w = current();
    step = !w ? 0 : !w.ownershipProven ? 1 : 2;
    draw();
  });
}

export function render(container) {
  const sec = document.createElement('section');
  container.append(sec);
  root = sec;
  const w = current();
  if (!w) { setSelectedId(''); step = 0; } else if (!started) step = w.ownershipProven ? 2 : 1;
  started = true;
  draw();
}

// Màn "Giới thiệu demo" (#/gioi-thieu): giải thích dễ hiểu cho người không chuyên.
import { SIMULATED } from '../simulated.js';
import { badgeSvg } from '../components/badge.js';
import { STATUS_LABELS } from '../scoring.js';

const STATUS_DESC = {
  unverified: 'Chưa đủ thông tin để xác nhận. Không có nghĩa là xấu, chỉ là chưa được kiểm tra.',
  low: 'Đã kiểm tra từ xa (giấy tờ, số điện thoại, quyền sở hữu trang) và đạt từ 60 điểm.',
  high: 'Ngoài kiểm tra từ xa, quản trị viên đã gọi điện và gặp trực tiếp hoặc xem minh chứng; đạt từ 80 điểm.',
  suspect: 'Có dấu hiệu cần thận trọng (trùng danh sách giả mạo hoặc từ 3 khiếu nại). Đây là cảnh báo để bạn kiểm tra kỹ hơn, chưa phải kết luận.',
};
const SCORES = [
  ['Nguồn chính phủ', 30], ['Số điện thoại khớp', 20], ['Quyền sở hữu website/fanpage', 20],
  ['Lịch sử tạo / tuổi', 15], ['Không nằm trong danh sách giả mạo', 15],
];
const STEPS = [
  ['Tra cứu một trang đã có', '#/tra-cuu', 'Gõ tên hoặc địa chỉ của một website mẫu để xem báo cáo.'],
  ['Đăng ký doanh nghiệp', '#/doanh-nghiep', 'Nhập thông tin một website/fanpage mới và gửi hồ sơ.'],
  ['Chứng minh quyền sở hữu', '#/doanh-nghiep', 'Chọn một cách chứng minh rồi bấm "Kiểm tra" (giả lập, chờ 1–2 giây).'],
  ['Quản trị cấp mức và thẩm định', '#/quan-tri', 'Mở hồ sơ, cấp mức thấp, nhập thẩm định rồi nâng mức cao.'],
  ['Xem kết quả và thử thu hồi', '#/tra-cuu', 'Tra cứu lại để thấy mức cao; thu hồi ở màn Quản trị sẽ về "Chưa xác thực".'],
];

function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text != null) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}
function card(title, ...nodes) {
  const s = el('section', null, 'card');
  s.append(el('h2', title), ...nodes);
  return s;
}
function list(items, tag = 'ul', cls) {
  const l = el(tag, null, cls);
  items.forEach((i) => { const li = el('li'); if (typeof i === 'string') li.textContent = i; else li.append(i); l.append(li); });
  return l;
}

export function render(container) {
  container.append(el('h1', 'Giới thiệu demo'));

  container.append(card('ChínhChủ là gì?',
    el('p', 'ChínhChủ giúp bạn biết một website hoặc fanpage có đúng là của doanh nghiệp thật hay không. Trang đạt yêu cầu sẽ được gắn huy hiệu tick xanh, bấm vào tick để xem báo cáo kiểm tra.'),
    el('p', 'Bản này chỉ để trình bày ý tưởng và xin ý kiến. Mọi dữ liệu đều là minh họa.', 'note')));

  const roles = list([
    'Người dùng: tra cứu miễn phí một website/fanpage và xem báo cáo, có thể gửi khiếu nại.',
    'Doanh nghiệp: đăng ký, chứng minh quyền sở hữu, theo dõi điểm và lấy huy hiệu tick để gắn lên trang của mình.',
    'Quản trị: xem hàng đợi hồ sơ, thẩm định thực tế, cấp, nâng, hạ, thu hồi tick hoặc đánh dấu nghi ngờ (phải ghi lý do).',
  ]);
  container.append(card('3 góc nhìn', roles, el('p', 'Chuyển nhanh bằng thanh menu phía trên.', 'note')));

  const states = el('ul', null, 'legend');
  states.style.flexDirection = 'column';
  for (const k of ['unverified', 'low', 'high', 'suspect']) {
    const li = el('li');
    li.style.alignItems = 'flex-start';
    const ic = el('span'); ic.innerHTML = badgeSvg(k, 28); // chuỗi SVG tĩnh từ badge.js
    const tx = el('span'); tx.append(el('b', STATUS_LABELS[k]), document.createElement('br'), STATUS_DESC[k]);
    li.append(ic, tx); states.append(li);
  }
  container.append(card('4 trạng thái', states));

  container.append(card('Thang điểm 100',
    list(SCORES.map(([n, p]) => `${n}: ${p} điểm`)),
    el('p', 'Quy tắc ngưỡng: từ 60 điểm và đã chứng minh sở hữu thì được Mức thấp. Từ 80 điểm và có thẩm định thực tế đạt (gọi điện cùng gặp trực tiếp hoặc minh chứng) thì được Mức cao. Trùng danh sách giả mạo hoặc từ 3 khiếu nại đã tiếp nhận thì chuyển Nghi ngờ sau khi quản trị xác nhận. Còn lại là Chưa xác thực.')));

  container.append(card('AI chỉ gợi ý, thang điểm quyết định',
    el('p', 'Phần "Gợi ý AI" trong báo cáo chỉ để tham khảo. Nó không cộng điểm và không làm đổi trạng thái. Điểm và trạng thái luôn tính theo thang điểm cố định ở trên.')));

  container.append(card('Nghi ngờ không phải là kết luận',
    el('p', 'Nhãn "Nghi ngờ" nghĩa là cần thận trọng và tự kiểm tra thêm. Nhãn này chưa khẳng định ai đó có hành vi sai trái. Báo cáo luôn nêu lý do và số khiếu nại để bạn tự cân nhắc.')));

  container.append(card('Tick cần gia hạn hằng năm',
    el('p', 'Trong hệ thống thật, tick sẽ cần được gia hạn mỗi năm để thông tin luôn mới. Bản demo chưa có hạn tick.')));

  const quick = list(STEPS.map(([t, href, d]) => {
    const w = el('span');
    const a = el('a', t, 'quick-link'); a.href = href; a.style.fontWeight = '600';
    w.append(a, document.createElement('br'), d);
    return w;
  }), 'ol', 'todo');
  container.append(card('Thử nhanh luồng đầu-cuối', quick));

  const sim = list(SIMULATED, 'ul', 'todo');
  sim.id = 'simulated-list';
  container.append(card('Phần được giả lập trong bản demo', el('p', 'Các phần sau không chạy thật, chỉ mô phỏng để bạn hình dung:'), sim));
}

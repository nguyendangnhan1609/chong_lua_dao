import test from 'node:test';
import assert from 'node:assert/strict';
import { createSampleData } from '../web/js/data.js';
import { getIntel, looksLikeQuery } from '../web/js/intel.js';
import { reportHtml, unknownHtml, intelHtml } from '../web/js/views/search.js';

const samples = createSampleData();
const inputs = [...samples.map((w) => w.domain), 'abc.example', 'zzz-shop.test', 'Tiệm Hoa Lạ', 'x1.example', 'q.test', 'foo-bar.example'];

test('ổn định theo hash: cùng input cùng output', () => {
  for (const i of inputs) assert.deepEqual(getIntel(i), getIntel(i));
  assert.deepEqual(getIntel('https://www.ABC.example/x'), getIntel('abc.example'));
});

test('đủ trường, không có chữ "lừa đảo", miền hư cấu', () => {
  for (const i of inputs) {
    const t = getIntel(i);
    for (const k of ['owner', 'registrar', 'created', 'expires', 'country', 'ssl']) assert.ok(t.whois[k], k);
    const r = t.reputation;
    assert.equal(typeof r.good + typeof r.bad + typeof r.neutral, 'numbernumbernumber');
    assert.ok(r.verdict.length > 5);
    assert.equal(r.evidence.length, Math.min(8, r.good + r.bad + r.neutral));
    for (const e of r.evidence) { assert.ok(e.title && e.source && e.date && e.snippet && e.url === '#'); assert.ok(['good', 'bad', 'neutral'].includes(e.tone)); }
    assert.equal(typeof t.phone.published, 'boolean');
    assert.equal(t.extraChecks.length, 6);
    assert.doesNotMatch(JSON.stringify(t), /lừa đảo/i);
  }
  assert.doesNotMatch(intelHtml('abc.example'), /lừa đảo/i);
});

test('đa dạng: có miền sạch và có miền nhiều phản ánh xấu', () => {
  const many = Array.from({ length: 60 }, (_, n) => getIntel(`site${n}.example`).reputation);
  assert.ok(many.some((r) => r.bad === 0));
  assert.ok(many.some((r) => r.bad > r.good));
  assert.equal(getIntel('hoanang-shop-vn.example').reputation.bad, 6);
});

test('tên miền lạ vẫn ra báo cáo Chưa xác thực + các khối', () => {
  const h = unknownHtml('abc.example');
  assert.match(h, /Chưa xác thực/);
  for (const s of ['Thông tin sở hữu tên miền', 'Danh tiếng trên mạng', 'Giả lập', 'chỉ tham khảo|Chỉ tham khảo', 'Số điện thoại liên hệ', 'Kiểm tra bổ sung']) assert.match(h, new RegExp(s));
});

test('6 WF mẫu cũng hiện khối intel', () => {
  for (const w of samples) assert.match(reportHtml(w), /Danh tiếng trên mạng/);
});

test('XSS: input được escape, input rác không sinh intel', () => {
  const x = '<script>alert(1)</script>';
  assert.doesNotMatch(unknownHtml(x), /<script>/);
  assert.doesNotMatch(intelHtml('"><img src=x onerror=1>.example'), /<img/);
  assert.equal(looksLikeQuery(x), false);
  assert.equal(looksLikeQuery(''), false);
  assert.equal(looksLikeQuery('abc.example'), true);
  assert.equal(looksLikeQuery('Hoa Lạ'), true);
});

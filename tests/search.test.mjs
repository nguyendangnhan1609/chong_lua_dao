import test from 'node:test';
import assert from 'node:assert/strict';
import { createSampleData } from '../web/js/data.js';
import { esc, normalize, normalizeDomain, suggest, resolve } from '../web/js/search-util.js';
import { reportHtml, unknownHtml } from '../web/js/views/search.js';
import { badgeLink } from '../web/js/components/badge.js';

const list = createSampleData();

test('normalize bỏ dấu, hoa-thường, đ', () => {
  assert.equal(normalize('  Cửa  hàng HOA Nắng '), 'cua hang hoa nang');
  assert.equal(normalize('Đường'), 'duong');
});

test('normalizeDomain', () => {
  assert.equal(normalizeDomain('https://www.HoaNang-Shop.example/abc?x=1'), 'hoanang-shop.example');
});

test('suggest không dấu / hoa thường / domain', () => {
  assert.ok(suggest(list, 'GIO BIEN').some((w) => w.id === 'wf-3'));
  assert.ok(suggest(list, 'minhan').some((w) => w.id === 'wf-2'));
  assert.deepEqual(suggest(list, ''), []);
  assert.deepEqual(suggest(list, 'zzzz'), []);
});

test('resolve: id, domain, tên đúng dấu phân biệt Nắng/Nâng', () => {
  assert.equal(resolve(list, 'wf-1').wf.id, 'wf-1');
  assert.equal(resolve(list, 'https://minhan-clinic.test/').wf.id, 'wf-2');
  assert.equal(resolve(list, 'Cửa hàng Hoa Nắng').wf.id, 'wf-1');
  assert.equal(resolve(list, 'cửa hàng hoa nâng').wf.id, 'wf-5');
  assert.equal(resolve(list, 'cua hang hoa nang').type, 'multiple');
  assert.equal(resolve(list, 'khong-co.example').type, 'none');
  assert.equal(resolve(list, '   ').type, 'empty');
});

test('báo cáo: đủ 5 mục, AI tách riêng, nghi ngờ không có chữ lừa đảo', () => {
  for (const wf of list) {
    const h = reportHtml(wf);
    assert.equal((h.match(/class="check"/g) || []).length, 5, wf.id);
    assert.match(h, /Chỉ tham khảo, không cộng điểm, không đổi mức/);
    assert.doesNotMatch(h.toLowerCase(), /lừa đảo/);
  }
  assert.match(reportHtml(list[4]), /Lý do nghi ngờ/);
  assert.match(reportHtml(list[5]), /chờ duyệt/);
});

test('escape XSS', () => {
  assert.equal(esc('<img src=x onerror="a">'), '&lt;img src=x onerror=&quot;a&quot;&gt;');
  const h = unknownHtml('<script>alert(1)</script>');
  assert.doesNotMatch(h, /<script>/);
  assert.match(h, /#\/doanh-nghiep/);
  assert.doesNotMatch(badgeLink('high', '"><script>'), /<script>/);
});

test('badge theo trạng thái dẫn đúng báo cáo', () => {
  assert.match(badgeLink('high', 'wf-1'), /href="#\/tra-cuu\/wf-1"/);
  assert.match(badgeLink('bogus', 'wf-1'), /vb-unverified/);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSampleData } from '../web/js/data.js';
import { applyAction } from '../web/js/admin-util.js';
import { makeEmbedCode, verifyEmbed, scanPage, VERDICT, liveBadgeModel } from '../web/js/badge-live.js';
import { getIntel } from '../web/js/intel.js';

const T0 = 1_800_000_000_000;
const get = (wfs, id) => wfs.find((w) => w.id === id);

test('thu hồi wf-1: tick xám, kiểm tra tick báo đã thu hồi, trang sao chép vẫn giả', () => {
  const wfs = createSampleData();
  const r = applyAction(get(wfs, 'wf-1'), 'revoke', { reason: 'kiểm thử' });
  assert.equal(r.ok, true);
  wfs[wfs.findIndex((w) => w.id === 'wf-1')] = r.wf;
  assert.equal(liveBadgeModel(r.wf, r.wf.domain, wfs, T0).ok, false);
  assert.equal(scanPage('hoanang-shop.example', wfs, T0).verdict, VERDICT.revoked);
  assert.equal(scanPage('hoanang-shop-sao-chep.example', wfs, T0).verdict, VERDICT.fake);
  assert.equal(scanPage('hoa-nang-khuyen-mai.example', wfs, T0).verdict, VERDICT.fake);
});

test('chữ ký bị sửa một ký tự -> không hợp lệ; chuẩn hóa host hoa/thường, www, cổng', () => {
  const wfs = createSampleData(); const wf = get(wfs, 'wf-3');
  const code = makeEmbedCode(wf, T0);
  const bad = code.slice(0, -1) + (code.endsWith('0') ? '1' : '0');
  assert.equal(verifyEmbed({ code: bad, hostDomain: wf.domain, wfs, now: T0 }).ok, false);
  assert.equal(verifyEmbed({ code, hostDomain: 'HTTPS://WWW.' + wf.domain.toUpperCase() + ':8080/x?y', wfs, now: T0 }).ok, true);
});

test('scanPage: đầu vào rỗng / lạ không ném lỗi', () => {
  const wfs = createSampleData();
  for (const u of ['', '   ', 'unknown.example', '<script>alert(1)</script>']) {
    assert.doesNotThrow(() => scanPage(u, wfs, T0));
  }
  assert.equal(scanPage('unknown.example', wfs, T0).verdict, VERDICT.none);
});

test('intel: không phân biệt hoa thường/schema và ổn định', () => {
  assert.deepEqual(getIntel('ABC-Shop.example'), getIntel('https://abc-shop.example/x'));
});

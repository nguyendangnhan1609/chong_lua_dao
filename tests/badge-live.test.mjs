import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSampleData } from '../web/js/data.js';
import { applyAction } from '../web/js/admin-util.js';
import { makeEmbedCode, verifyEmbed, scanPage, VERDICT, PERIOD_MS, liveBadgeModel, confirmAgeSec } from '../web/js/badge-live.js';

const T0 = 1_800_000_000_000;
const fresh = () => createSampleData();
const get = (wfs, id) => wfs.find((w) => w.id === id);

test('mã hợp lệ trên đúng tên miền', () => {
  const wfs = fresh(); const wf = get(wfs, 'wf-1');
  const r = verifyEmbed({ code: makeEmbedCode(wf, T0), hostDomain: 'https://www.' + wf.domain + '/trang', wfs, now: T0 });
  assert.equal(r.ok, true); assert.equal(r.reason, 'valid');
});

test('sai tên miền -> domain-mismatch', () => {
  const wfs = fresh();
  const r = verifyEmbed({ code: makeEmbedCode(get(wfs, 'wf-1'), T0), hostDomain: 'khac.example', wfs, now: T0 });
  assert.deepEqual([r.ok, r.reason], [false, 'domain-mismatch']);
});

test('thu hồi phản ánh ngay', () => {
  const wfs = fresh(); const wf = get(wfs, 'wf-1');
  const code = makeEmbedCode(wf, T0);
  assert.equal(verifyEmbed({ code, hostDomain: wf.domain, wfs, now: T0 }).ok, true);
  const r = applyAction(wf, 'revoke', { reason: 'Kiểm thử thu hồi' });
  assert.equal(r.ok, true);
  wfs[wfs.indexOf(wf)] = r.wf;
  assert.equal(verifyEmbed({ code, hostDomain: wf.domain, wfs, now: T0 }).reason, 'revoked');
  assert.equal(liveBadgeModel(r.wf, wf.domain, wfs, T0).ok, false);
  assert.equal(scanPage(wf.domain, wfs, T0).verdict, VERDICT.revoked);
});

test('không có mã / mã sai / hồ sơ lạ', () => {
  const wfs = fresh(); const wf = get(wfs, 'wf-1');
  for (const code of [undefined, null, '', '   ']) assert.equal(verifyEmbed({ code, hostDomain: wf.domain, wfs, now: T0 }).reason, 'no-code');
  assert.equal(verifyEmbed({ code: 'rác', hostDomain: wf.domain, wfs, now: T0 }).reason, 'unknown');
  const forged = makeEmbedCode(wf, T0).replace(/.$/, (c) => (c === '0' ? '1' : '0'));
  assert.equal(verifyEmbed({ code: forged, hostDomain: wf.domain, wfs, now: T0 }).reason, 'unknown');
  const ghost = makeEmbedCode({ id: 'wf-999', domain: 'x.example' }, T0);
  assert.equal(verifyEmbed({ code: ghost, hostDomain: 'x.example', wfs, now: T0 }).reason, 'unknown');
});

test('mã cũ quá hạn -> expired; chu kỳ liền trước vẫn được chấp nhận', () => {
  const wfs = fresh(); const wf = get(wfs, 'wf-1');
  const code = makeEmbedCode(wf, T0);
  assert.equal(verifyEmbed({ code, hostDomain: wf.domain, wfs, now: T0 + PERIOD_MS }).ok, true);
  assert.equal(verifyEmbed({ code, hostDomain: wf.domain, wfs, now: T0 + 3 * PERIOD_MS }).reason, 'expired');
});

test('chữ ký đổi theo chu kỳ, ổn định trong cùng chu kỳ', () => {
  const wf = get(fresh(), 'wf-1');
  const base = Math.floor(T0 / PERIOD_MS) * PERIOD_MS;
  assert.equal(makeEmbedCode(wf, base), makeEmbedCode(wf, base + PERIOD_MS - 1));
  assert.notEqual(makeEmbedCode(wf, base), makeEmbedCode(wf, base + PERIOD_MS));
  assert.notEqual(makeEmbedCode(wf, base), makeEmbedCode(get(fresh(), 'wf-2'), base));
});

test('scanPage: 4 kết luận', () => {
  const wfs = fresh();
  assert.equal(scanPage('hoanang-shop.example', wfs, T0).verdict, VERDICT.real);
  assert.equal(scanPage('hoanang-shop-sao-chep.example', wfs, T0).verdict, VERDICT.fake);
  const cc = scanPage('https://hoa-nang-khuyen-mai.example/', wfs, T0);
  assert.equal(cc.verdict, VERDICT.fake); assert.equal(cc.reason, 'domain-mismatch');
  assert.equal(scanPage('hoanang-shop-vn.example', wfs, T0).verdict, VERDICT.revoked);
  assert.equal(scanPage('laxanh-books.test', wfs, T0).verdict, VERDICT.none);
  assert.equal(scanPage('khong-biet.example', wfs, T0).verdict, VERDICT.none);
  assert.equal(scanPage('', wfs, T0).verdict, VERDICT.none);
});

test('confirmAgeSec nằm trong 0..29', () => {
  for (const n of [0, 1500, 29999, 30000, T0]) { const s = confirmAgeSec(n); assert.ok(s >= 0 && s < 30); }
});

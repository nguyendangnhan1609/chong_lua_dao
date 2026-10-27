import test from 'node:test';
import assert from 'node:assert/strict';
import { createSampleData } from '../web/js/data.js';
import { computeScore, computeStatus, canUpgrade, MAX_POINTS, CHECK_KEYS } from '../web/js/scoring.js';

const byId = (id) => createSampleData().find((w) => w.id === id);
const EXPECTED = { 'wf-1': [100, 'high'], 'wf-2': [95, 'low'], 'wf-3': [75, 'low'], 'wf-4': [20, 'unverified'], 'wf-5': [3, 'suspect'], 'wf-6': [75, 'unverified'] };

test('thang điểm tối đa là 100', () => {
  assert.equal(CHECK_KEYS.reduce((s, k) => s + MAX_POINTS[k], 0), 100);
});

test('6 WF mẫu: điểm khớp công thức và trạng thái đúng', () => {
  const list = createSampleData();
  assert.equal(list.length, 6);
  for (const wf of list) {
    const sum = CHECK_KEYS.reduce((s, k) => s + wf.checks[k].points, 0);
    assert.equal(computeScore(wf), sum, wf.id);
    assert.deepEqual([computeScore(wf), computeStatus(wf)], EXPECTED[wf.id], wf.id);
  }
});

test('mỗi WF đủ 5 mục có nguồn, ngày, kết quả; domain .example/.test', () => {
  for (const wf of createSampleData()) {
    assert.equal(CHECK_KEYS.length, 5);
    for (const k of CHECK_KEYS) {
      const c = wf.checks[k];
      assert.ok(c.source && c.date && c.result, `${wf.id}.${k}`);
      assert.ok(c.points <= MAX_POINTS[k]);
    }
    assert.match(wf.domain, /\.(example|test)$/);
    assert.ok(wf.ai && 'inspection' in wf && 'complaints' in wf && Array.isArray(wf.log));
  }
});

test('WF nghi ngờ có lý do và >= 3 khiếu nại; 1 WF chờ duyệt', () => {
  const s = byId('wf-5');
  assert.ok(s.suspectReason.length > 0);
  assert.ok(s.complaints.accepted >= 3);
  assert.equal(createSampleData().filter((w) => w.pending).length, 1);
});

test('dữ liệu không chứa chữ "lừa đảo"', () => {
  assert.ok(!/lừa đảo/i.test(JSON.stringify(createSampleData())));
});

function withScore(total, extra = {}) {
  const wf = byId('wf-2');
  wf.checks.gov.points = 30; wf.checks.phone.points = 20; wf.checks.ownership.points = 20;
  wf.checks.history.points = 15; wf.checks.blacklist.points = 15;
  let drop = 100 - total;
  for (const k of ['blacklist', 'history', 'gov']) { const d = Math.min(drop, wf.checks[k].points); wf.checks[k].points -= d; drop -= d; }
  Object.assign(wf, extra);
  return wf;
}

test('ca biên 59/60: mức thấp', () => {
  assert.equal(computeScore(withScore(59)), 59);
  assert.equal(computeStatus(withScore(59, { grant: 'low' })), 'unverified');
  assert.equal(canUpgrade(withScore(59), 'low').ok, false);
  assert.equal(computeStatus(withScore(60, { grant: 'low' })), 'low');
  assert.equal(canUpgrade(withScore(60), 'low').ok, true);
});

test('ca biên 79/80: mức cao', () => {
  const insp = { call: true, meet: true, evidence: false, note: '' };
  assert.equal(canUpgrade(withScore(79, { inspection: insp }), 'high').ok, false);
  assert.equal(computeStatus(withScore(79, { grant: 'high', inspection: insp })), 'low');
  assert.equal(canUpgrade(withScore(80, { inspection: insp }), 'high').ok, true);
  assert.equal(computeStatus(withScore(80, { grant: 'high', inspection: insp })), 'high');
});

test('thiếu chứng minh sở hữu thì không lên mức thấp dù điểm cao', () => {
  const wf = withScore(100, { ownershipProven: false, grant: 'low' });
  assert.equal(computeStatus(wf), 'unverified');
  const r = canUpgrade(wf, 'low');
  assert.equal(r.ok, false);
  assert.match(r.reason, /sở hữu/);
});

test('thiếu thẩm định thực tế thì không lên mức cao', () => {
  const none = withScore(100, { grant: 'high', inspection: { call: false, meet: true, evidence: true } });
  assert.equal(computeStatus(none), 'low');
  assert.match(canUpgrade(none).reason, /gọi điện/);
  const noMeet = withScore(100, { grant: 'high', inspection: { call: true, meet: false, evidence: false } });
  assert.equal(computeStatus(noMeet), 'low');
  assert.match(canUpgrade(noMeet).reason, /gặp trực tiếp|minh chứng/);
  const evOnly = withScore(100, { grant: 'high', inspection: { call: true, meet: false, evidence: true } });
  assert.equal(computeStatus(evOnly), 'high');
});

test('nghi ngờ: trùng danh sách, hoặc >=3 khiếu nại VÀ quản trị xác nhận', () => {
  assert.equal(computeStatus(withScore(100, { blacklistMatch: true, grant: 'low' })), 'suspect');
  assert.equal(computeStatus(withScore(100, { grant: 'low', complaints: { count: 3, accepted: 3 } })), 'low');
  assert.equal(computeStatus(withScore(100, { grant: 'low', complaints: { count: 3, accepted: 3 }, adminConfirmedSuspect: true })), 'suspect');
  assert.equal(computeStatus(withScore(100, { grant: 'low', complaints: { count: 2, accepted: 2 }, adminConfirmedSuspect: true })), 'low');
});

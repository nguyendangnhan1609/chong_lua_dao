import test from 'node:test';
import assert from 'node:assert/strict';
import { createSampleData } from '../web/js/data.js';
import { computeScore, computeStatus } from '../web/js/scoring.js';
import { validateRegistration, createWf, proveOwnership } from '../web/js/business-util.js';
import {
  applyAction, actionState, filterQueue, countByFilter, SAMPLE_EVIDENCE_FILES, FILTERS,
} from '../web/js/admin-util.js';

const pts = (score, own = true) => ({
  ownershipProven: own, blacklistMatch: false, grant: 'none', pending: true,
  checks: { gov: { points: Math.min(30, score) }, phone: { points: Math.max(0, Math.min(20, score - 30)) },
    ownership: { points: Math.max(0, Math.min(20, score - 50)) }, history: { points: Math.max(0, Math.min(15, score - 70)) },
    blacklist: { points: Math.max(0, Math.min(15, score - 85)) } },
  complaints: { count: 0, accepted: 0 }, adminConfirmedSuspect: false, suspectReason: '',
  inspection: { call: false, meet: false, evidence: false, note: '' }, log: [],
});
const inspected = (w, o = {}) => { w.inspection = { call: true, meet: true, evidence: false, ...o }; return w; };
const NOW = new Date(2026, 9, 28, 14, 5);

test('score helper builds exact scores', () => {
  for (const s of [59, 60, 79, 80]) assert.equal(computeScore(pts(s)), s);
});

test('grantLow: boundary 59/60 and ownership', () => {
  assert.equal(applyAction(pts(59), 'grantLow').ok, false);
  assert.match(applyAction(pts(59), 'grantLow').reason, /59/);
  const r = applyAction(pts(60), 'grantLow', {}, NOW);
  assert.equal(r.ok, true);
  assert.equal(r.wf.grant, 'low');
  assert.equal(r.wf.pending, false);
  assert.equal(computeStatus(r.wf), 'low');
  const noOwn = applyAction(pts(90, false), 'grantLow');
  assert.equal(noOwn.ok, false);
  assert.match(noOwn.reason, /quyền sở hữu/);
  assert.equal(noOwn.wf.grant, 'none');
});

test('grantLow rejected when already granted', () => {
  const w = pts(90); w.grant = 'low';
  assert.equal(applyAction(w, 'grantLow').ok, false);
});

test('upgradeHigh: score 79 and 80, missing call, missing meet/evidence, missing ownership', () => {
  const low = (s) => { const w = pts(s); w.grant = 'low'; return w; };
  assert.equal(applyAction(inspected(low(79)), 'upgradeHigh').ok, false);
  assert.match(applyAction(inspected(low(79)), 'upgradeHigh').reason, /79/);
  assert.equal(applyAction(inspected(low(80)), 'upgradeHigh', {}, NOW).ok, true);
  const noCall = applyAction(inspected(low(90), { call: false }), 'upgradeHigh');
  assert.equal(noCall.ok, false); assert.match(noCall.reason, /gọi điện/);
  const noMeet = applyAction(inspected(low(90), { meet: false }), 'upgradeHigh');
  assert.equal(noMeet.ok, false); assert.match(noMeet.reason, /gặp trực tiếp|minh chứng/);
  assert.equal(applyAction(inspected(low(90), { meet: false, evidence: true }), 'upgradeHigh').ok, true);
  const noOwn = low(90); noOwn.ownershipProven = false; inspected(noOwn);
  assert.equal(applyAction(noOwn, 'upgradeHigh').ok, false);
});

test('upgradeHigh requires low grant first and never mutates input', () => {
  const w = inspected(pts(95));
  const r = applyAction(w, 'upgradeHigh');
  assert.equal(r.ok, false); assert.match(r.reason, /mức thấp trước/);
  const l = applyAction(w, 'grantLow', {}, NOW);
  assert.equal(w.grant, 'none');
  assert.equal(w.log.length, 0);
  assert.equal(l.wf.log.length, 1);
});

test('downgrade, revoke', () => {
  const h = inspected(pts(95)); h.grant = 'high';
  const d = applyAction(h, 'downgrade', { reason: 'xem xét lại' }, NOW);
  assert.equal(d.ok, true); assert.equal(d.wf.grant, 'low'); assert.equal(computeStatus(d.wf), 'low');
  assert.match(d.wf.log.at(-1).text, /xem xét lại/);
  assert.equal(applyAction(d.wf, 'downgrade').ok, false);
  const r = applyAction(d.wf, 'revoke', {}, NOW);
  assert.equal(r.ok, true); assert.equal(computeStatus(r.wf), 'unverified');
  assert.equal(applyAction(r.wf, 'revoke').ok, false);
});

test('markSuspect: requires reason and grounds', () => {
  const w = pts(90); w.complaints = { count: 5, accepted: 3 };
  const noReason = applyAction(w, 'markSuspect', { reason: '   ' });
  assert.equal(noReason.ok, false); assert.match(noReason.reason, /lý do/);
  const ok = applyAction(w, 'markSuspect', { reason: 'Nhiều khiếu nại hợp lệ' }, NOW);
  assert.equal(ok.ok, true);
  assert.equal(ok.wf.adminConfirmedSuspect, true);
  assert.equal(ok.wf.suspectReason, 'Nhiều khiếu nại hợp lệ');
  assert.equal(computeStatus(ok.wf), 'suspect');
  const few = pts(90); few.complaints = { count: 9, accepted: 2 };
  const denied = applyAction(few, 'markSuspect', { reason: 'x' });
  assert.equal(denied.ok, false); assert.match(denied.reason, /3 khiếu nại/);
  const bl = pts(90); bl.blacklistMatch = true;
  assert.equal(applyAction(bl, 'markSuspect', { reason: 'Trùng danh sách' }, NOW).ok, true);
});

test('markSuspect on granted WF remembers grant; clearSuspect restores it and needs reason', () => {
  const w = inspected(pts(95)); w.grant = 'high'; w.complaints = { count: 4, accepted: 3 };
  const m = applyAction(w, 'markSuspect', { reason: 'Khiếu nại' }, NOW).wf;
  assert.equal(m.grant, 'none');
  assert.equal(applyAction(m, 'upgradeHigh').ok, false);
  assert.equal(applyAction(m, 'clearSuspect', {}).ok, false);
  const c = applyAction(m, 'clearSuspect', { reason: 'Đã giải trình' }, NOW);
  assert.equal(c.ok, true);
  assert.equal(c.wf.adminConfirmedSuspect, false);
  assert.equal(computeStatus(c.wf), 'high');
  assert.equal(applyAction(c.wf, 'clearSuspect', { reason: 'x' }).ok, false);
});

test('clearSuspect on blacklist match clears the match and restores the list check', () => {
  const s5 = createSampleData().find((w) => w.id === 'wf-5');
  assert.equal(computeStatus(s5), 'suspect');
  const c = applyAction(s5, 'clearSuspect', { reason: 'Rà soát: không liên quan' }, NOW);
  assert.equal(c.ok, true);
  assert.equal(c.wf.blacklistMatch, false);
  assert.equal(c.wf.checks.blacklist.points, 15);
  assert.notEqual(computeStatus(c.wf), 'suspect');
});

test('saveInspection validates and logs; losing inspection drops high to low', () => {
  const w = pts(95);
  const bad = applyAction(w, 'saveInspection', { evidence: true, evidenceFile: 'virus.exe' });
  assert.equal(bad.ok, false);
  const badDate = applyAction(w, 'saveInspection', { call: true, callDate: 'hôm qua' });
  assert.equal(badDate.ok, false);
  const ok = applyAction(w, 'saveInspection', {
    call: true, callDate: '2026-10-27', callNote: '<b>ok</b>', meet: false, evidence: true, evidenceFile: SAMPLE_EVIDENCE_FILES[0], note: 'tốt',
  }, NOW);
  assert.equal(ok.ok, true);
  assert.deepEqual([ok.wf.inspection.call, ok.wf.inspection.evidence], [true, true]);
  assert.equal(ok.wf.log.at(-1).at, '2026-10-28 14:05');
  assert.match(ok.wf.log.at(-1).text, /Lưu thẩm định/);
  const h = { ...ok.wf, grant: 'high' };
  const lost = applyAction(h, 'saveInspection', { call: false }, NOW);
  assert.equal(lost.wf.grant, 'low');
});

test('invalid action / wf rejected', () => {
  assert.equal(applyAction(pts(90), 'nuke').ok, false);
  assert.equal(applyAction(null, 'grantLow').ok, false);
  assert.equal(actionState(pts(90), 'zzz').enabled, false);
});

test('queue filter and counts on sample data', () => {
  const list = createSampleData();
  const c = countByFilter(list);
  assert.equal(c.all, 6);
  assert.equal(c.pending, 1);
  assert.equal(c.high, 1); assert.equal(c.low, 2); assert.equal(c.suspect, 1); assert.equal(c.unverified, 2);
  assert.equal(filterQueue(list, 'all')[0].pending, true);
  assert.equal(filterQueue(list, 'suspect').length, 1);
  assert.equal(FILTERS.length, 6);
});

test('end-to-end pure flow: register -> prove -> low -> inspect -> high -> revoke', () => {
  // WF mới hợp lệ: gov 30 + SĐT 20 + lịch sử 5..15 + không trùng danh sách 15 = 70..80 trước khi chứng minh sở hữu,
  // sau khi chứng minh sở hữu (+20) là 90..100, nên luôn >= 80 mà không cần cơ chế điều chỉnh điểm thủ công.
  for (const domain of ['cua-a.example', 'cua-b.example', 'cua-c.test', 'cua-d.test', 'cua-e.example', 'cua-f.example']) {
    const v = validateRegistration({ name: 'Cửa hàng', domain, mst: '0100000123', phone: '0900000123', email: 'a@b.example' }, []);
    assert.ok(v.ok);
    const wf = createWf(v.values, [], NOW);
    assert.equal(computeStatus(wf), 'unverified');
    assert.equal(applyAction(wf, 'grantLow').ok, false); // chưa chứng minh sở hữu
    proveOwnership(wf, 'page', NOW);
    assert.ok(computeScore(wf) >= 90, `score ${computeScore(wf)}`);
    let r = applyAction(wf, 'grantLow', {}, NOW);
    assert.ok(r.ok); assert.equal(computeStatus(r.wf), 'low');
    assert.equal(applyAction(r.wf, 'upgradeHigh').ok, false); // chưa thẩm định
    r = applyAction(r.wf, 'saveInspection', { call: true, callDate: '2026-10-28', meet: true }, NOW);
    assert.ok(r.ok);
    r = applyAction(r.wf, 'upgradeHigh', {}, NOW);
    assert.ok(r.ok); assert.equal(computeStatus(r.wf), 'high');
    r = applyAction(r.wf, 'revoke', { reason: 'Hết hạn' }, NOW);
    assert.ok(r.ok); assert.equal(computeStatus(r.wf), 'unverified');
    assert.ok(r.wf.log.length >= 5);
  }
});

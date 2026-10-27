import test from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, actionState, filterQueue } from '../web/js/admin-util.js';
import { createSampleData } from '../web/js/data.js';
import { computeStatus, computeScore } from '../web/js/scoring.js';
import { validateRegistration, createWf, proveOwnership } from '../web/js/business-util.js';

const NOW = new Date('2026-10-28T08:00:00');
const fresh = () => {
  const v = validateRegistration({ name: 'Tiệm Biên', domain: 'tiembien.example', mst: '0100000555', phone: '0900000555', email: 'a@b.example' }, []).values;
  const w = createWf(v, [], NOW);
  proveOwnership(w, 'page', NOW);
  return w;
};

test('edge: lý do chỉ có khoảng trắng bị từ chối, hồ sơ không đổi', () => {
  const w = fresh(); w.complaints = { count: 3, accepted: 3 };
  const r = applyAction(w, 'markSuspect', { reason: '   \t ' }, NOW);
  assert.equal(r.ok, false);
  assert.equal(r.wf, w);
  assert.equal(computeStatus(w), 'unverified');
});

test('edge: đủ 2 khiếu nại thì nút nghi ngờ khóa kèm lý do nêu số hiện tại', () => {
  const w = fresh(); w.complaints = { count: 2, accepted: 2 };
  const s = actionState(w, 'markSuspect');
  assert.equal(s.enabled, false);
  assert.match(s.reason, /hiện 2/);
});

test('edge: nâng mức cao khi chỉ có minh chứng nhưng không gọi điện bị khóa', () => {
  let w = applyAction(fresh(), 'grantLow', {}, NOW).wf;
  const r0 = applyAction(w, 'saveInspection', { call: false, meet: true, evidence: true, evidenceFile: 'anh-cua-hang-mau.jpg' }, NOW);
  assert.equal(r0.ok, true);
  assert.equal(actionState(r0.wf, 'upgradeHigh').enabled, false);
  assert.match(actionState(r0.wf, 'upgradeHigh').reason, /gọi điện/);
});

test('edge: thu hồi rồi tra cứu về Chưa xác thực, cấp lại được; điểm giữ nguyên', () => {
  let w = applyAction(fresh(), 'grantLow', {}, NOW).wf;
  const score = computeScore(w);
  w = applyAction(w, 'revoke', {}, NOW).wf;
  assert.equal(computeStatus(w), 'unverified');
  assert.equal(computeScore(w), score);
  assert.equal(actionState(w, 'revoke').enabled, false);
  assert.equal(actionState(w, 'grantLow').enabled, true);
});

test('edge: hồ sơ khai tên miền trùng danh sách giả mạo không cấp được mức thấp', () => {
  const black = createSampleData().find((x) => x.blacklistMatch);
  const v = validateRegistration({ name: 'X', domain: black.domain, mst: '0100000555', phone: '0900000555', email: 'a@b.example' }, []).values;
  const w = createWf(v, [], NOW);
  proveOwnership(w, 'page', NOW);
  assert.equal(computeStatus(w), 'suspect');
  assert.equal(actionState(w, 'grantLow').enabled, false);
});

test('edge: lọc hàng đợi theo trạng thái không trả hồ sơ lệch nhóm', () => {
  const list = createSampleData();
  for (const k of ['unverified', 'low', 'high', 'suspect']) {
    for (const w of filterQueue(list, k)) assert.equal(computeStatus(w), k);
  }
});

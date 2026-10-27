import test from 'node:test';
import assert from 'node:assert/strict';
import { createSampleData } from '../web/js/data.js';
import { computeScore, computeStatus, canUpgrade } from '../web/js/scoring.js';
import {
  validateRegistration, isValidPhone, isValidMst, isValidEmail, createWf, proveOwnership,
  todoList, badgeAvailability, embedCode, initialChecks, nextId, generateProofCode,
} from '../web/js/business-util.js';
import { parseHash } from '../web/js/router.js';
import { BADGE_TEXT } from '../web/js/components/badge.js';
import { STATUS_LABELS } from '../web/js/scoring.js';

const good = { name: 'Hoa Mai', domain: 'hoamai-shop.example', mst: '0100000099', phone: '0900 000 099', email: 'a@hoamai.example' };
const NOW = new Date('2026-10-28T00:00:00Z');

test('validate: dữ liệu đúng', () => {
  const r = validateRegistration(good, createSampleData());
  assert.equal(r.ok, true);
  assert.deepEqual(r.errors, {});
});

test('validate: bắt buộc và định dạng sai, thông báo tiếng Việt', () => {
  const r = validateRegistration({}, []);
  assert.equal(r.ok, false);
  for (const k of ['name', 'domain', 'mst', 'phone', 'email']) assert.match(r.errors[k], /Vui lòng/);
  const bad = validateRegistration({ ...good, mst: '12345', phone: '123', email: 'abc', domain: 'khong hop le' }, []);
  assert.match(bad.errors.mst, /10 hoặc 13/);
  assert.match(bad.errors.phone, /Số điện thoại/);
  assert.match(bad.errors.email, /Email/);
  assert.match(bad.errors.domain, /Địa chỉ/);
});

test('validate: MST 10/13 số, SĐT, email, domain trùng', () => {
  assert.ok(isValidMst('0100000001') && isValidMst('0100000001-001') && !isValidMst('01000000011'));
  assert.ok(isValidPhone('+84 900 000 001') && isValidPhone('0900.000.001') && !isValidPhone('900000001'));
  assert.ok(isValidEmail('a@b.example') && !isValidEmail('a@b') && !isValidEmail('a b@c.d'));
  const dup = validateRegistration({ ...good, domain: 'https://www.hoanang-shop.example/x' }, createSampleData());
  assert.match(dup.errors.domain, /đã có/);
});

test('WF mới: điểm khởi tạo đúng công thức, quyền sở hữu 0', () => {
  const list = createSampleData();
  const wf = createWf(validateRegistration(good, list).values, list, NOW);
  assert.equal(wf.id, 'wf-u1');
  assert.equal(wf.pending, true);
  assert.equal(wf.userCreated, true);
  assert.equal(wf.ownershipProven, false);
  assert.equal(wf.grant, 'none');
  assert.equal(computeStatus(wf), 'unverified');
  assert.equal(wf.checks.gov.points, 30);
  assert.equal(wf.checks.phone.points, 20);
  assert.equal(wf.checks.ownership.points, 0);
  assert.equal(wf.checks.blacklist.points, 15);
  const h = wf.checks.history.points;
  assert.ok([5, 8, 12, 15].includes(h));
  assert.equal(computeScore(wf), 30 + 20 + 0 + h + 15);
  for (const c of Object.values(wf.checks)) assert.ok(c.source && c.date && c.result);
  assert.equal(nextId([...list, wf]), 'wf-u2');
});

test('WF mới: lịch sử xác định theo domain; MST/SĐT sai không có điểm; trùng danh sách giả mạo', () => {
  const a = initialChecks(good, NOW).history.points;
  assert.equal(initialChecks({ ...good }, NOW).history.points, a);
  const c = initialChecks({ ...good, mst: '1', phone: 'x' }, NOW);
  assert.equal(c.gov.points, 0);
  assert.equal(c.phone.points, 0);
  const fake = createSampleData().find((w) => w.blacklistMatch);
  const wf = createWf({ ...good, domain: fake.domain }, [], NOW);
  assert.equal(wf.checks.blacklist.points, 0);
  assert.equal(computeStatus(wf), 'suspect');
});

test('chứng minh sở hữu: +20 điểm, ghi nhật ký, không cộng hai lần', () => {
  const wf = createWf(good, [], NOW);
  const before = computeScore(wf);
  proveOwnership(wf, 'email', NOW);
  assert.equal(wf.ownershipProven, true);
  assert.equal(computeScore(wf), before + 20);
  assert.equal(wf.log.length, 2);
  proveOwnership(wf, 'page', NOW);
  assert.equal(computeScore(wf), before + 20);
  assert.equal(wf.log.length, 2);
  assert.throws(() => proveOwnership(createWf(good, [], NOW), 'xyz'));
});

test('không cho cấp mức thấp khi chưa chứng minh sở hữu', () => {
  const wf = createWf({ ...good, domain: 'hoamai.example' }, [], NOW);
  assert.equal(canUpgrade(wf, 'low').ok, false);
  assert.match(canUpgrade(wf, 'low').reason, /quyền sở hữu/);
  wf.grant = 'low';
  assert.equal(computeStatus(wf), 'unverified');
  proveOwnership(wf, 'file', NOW);
  assert.equal(canUpgrade(wf, 'low').ok, true);
  assert.equal(computeStatus(wf), 'low');
});

test('việc cần làm theo trạng thái', () => {
  const wf = createWf(good, [], NOW);
  assert.ok(todoList(wf).some((t) => /Chứng minh quyền sở hữu/.test(t)));
  proveOwnership(wf, 'page', NOW);
  let t = todoList(wf);
  assert.ok(!t.some((x) => /Chứng minh quyền sở hữu/.test(x)));
  assert.ok(t.some((x) => /cấp/.test(x)));
  assert.ok(t.some((x) => /gọi điện/.test(x)));
  assert.ok(t.some((x) => /gặp trực tiếp|minh chứng/.test(x)));
  wf.grant = 'low';
  assert.ok(todoList(wf).some((x) => /nâng lên mức cao/.test(x)));
  Object.assign(wf.inspection, { call: true, evidence: true });
  wf.checks.history.points = 15;
  assert.equal(computeStatus({ ...wf, grant: 'high' }), 'high');
  assert.deepEqual(todoList({ ...wf, grant: 'high' }), []);
  const sus = createSampleData().find((w) => computeStatus(w) === 'suspect');
  assert.equal(todoList(sus).length, 1);
});

test('huy hiệu và mã nhúng', () => {
  const wf = createWf(good, [], NOW);
  assert.equal(badgeAvailability(wf).ok, false);
  assert.match(badgeAvailability(wf).reason, /quyền sở hữu/);
  proveOwnership(wf, 'page', NOW);
  assert.equal(badgeAvailability(wf).ok, false);
  assert.match(badgeAvailability(wf).reason, /chờ quản trị/);
  wf.grant = 'low';
  const av = badgeAvailability(wf);
  assert.ok(av.ok && av.status === 'low');
  const code = embedCode('http://localhost:8080/', { id: 'wf-u1' }, av.status);
  assert.match(code, /^<a href="http:\/\/localhost:8080\/#\/tra-cuu\/wf-u1"/);
  assert.ok(!embedCode('http://x/"><script>', { id: '"><b>' }, 'low').includes('"><script>'));
  assert.match(generateProofCode('page', () => 0.5), /chinhchu-verify/);
});

test('router/badge: decode lỗi không ném, nhãn dùng chung', () => {
  assert.deepEqual(parseHash('#/tra-cuu/%E0%A4%A').params, ['%E0%A4%A']);
  assert.deepEqual(parseHash('#/tra-cuu/a%20b').params, ['a b']);
  assert.equal(BADGE_TEXT, STATUS_LABELS);
});

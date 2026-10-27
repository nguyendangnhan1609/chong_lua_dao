import test from 'node:test';
import assert from 'node:assert/strict';
import { stamp, dateOnly } from '../web/js/time-util.js';
import { addLog } from '../web/js/store.js';
import { stamp as adminStamp } from '../web/js/admin-util.js';

const FMT = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

test('stamp dùng giờ địa phương, dạng AAAA-TT-NN HH:MM', () => {
  const d = new Date(2026, 9, 28, 9, 5); // giờ địa phương, không phụ thuộc múi giờ máy
  assert.equal(stamp(d), '2026-10-28 09:05');
  assert.equal(dateOnly(new Date(2026, 0, 1, 0, 30)), '2026-01-01');
});

test('admin-util và time-util dùng cùng một hàm stamp', () => {
  assert.equal(adminStamp, stamp);
});

test('addLog ghi nhật ký cùng định dạng stamp (không còn chỉ ngày UTC)', () => {
  const wf = { id: 'x', log: [] };
  addLog(wf, 'Thử nghiệm');
  assert.equal(wf.log.length, 1);
  assert.match(wf.log[0].at, FMT);
  assert.equal(wf.log[0].text, 'Thử nghiệm');
});

test('addLog tạo mảng log khi chưa có', () => {
  const wf = { id: 'y' };
  addLog(wf, 'a');
  assert.ok(Array.isArray(wf.log));
});

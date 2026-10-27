import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SIMULATED } from '../web/js/simulated.js';

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..', 'web');
function walk(d) {
  return readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const files = walk(WEB);

test('SIMULATED liệt kê đủ 13 mục theo SPEC', () => {
  assert.equal(SIMULATED.length, 13);
  const keys = ['6 website', 'nguồn chính phủ', 'số điện thoại', 'whois', 'danh sách giả mạo', 'gợi ý ai',
    'chứng minh quyền sở hữu', 'thanh toán', 'thẩm định', 'khiếu nại', 'đăng nhập', 'huy hiệu tick', 'localstorage'];
  keys.forEach((k, i) => assert.ok(SIMULATED[i].toLowerCase().includes(k), `mục ${i + 1} thiếu "${k}": ${SIMULATED[i]}`));
});

test('không file nào dưới web/ chứa cụm "lừa đảo"', () => {
  assert.ok(files.length > 5);
  for (const f of files) assert.ok(!/lừa đảo/i.test(readFileSync(f, 'utf8')), f);
});

test('không file web/ nào tham chiếu http(s):// ngoài', () => {
  for (const f of files) {
    const txt = readFileSync(f, 'utf8');
    for (const m of txt.matchAll(/https?:\/\/[^\s"'<>)]*/g)) {
      const u = m[0];
      const ok = u === 'http://www.w3.org/2000/svg' || /^https?:\/\/[^/]*\.(example|test)(\/|$)/.test(u);
      assert.ok(ok, `${f}: ${u}`);
    }
  }
});

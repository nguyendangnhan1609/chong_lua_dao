import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const { mountLiveBadges, stopLiveBadges } = await import('../web/js/components/live-badge.js');

test('mountLiveBadges idempotent theo root: gọi lại không rò interval', () => {
  const calls = { set: 0, clear: 0 };
  const realSet = globalThis.setInterval, realClear = globalThis.clearInterval;
  const live = new Set();
  globalThis.setInterval = (f, ms) => { calls.set++; const t = realSet(f, 1e9); live.add(t); return t; };
  globalThis.clearInterval = (t) => { calls.clear++; live.delete(t); realClear(t); };
  try {
    const root = { isConnected: true, querySelectorAll: () => [] };
    mountLiveBadges(root); mountLiveBadges(root); mountLiveBadges(root);
    assert.equal(live.size, 1);
    assert.equal(calls.set, 3); assert.equal(calls.clear, 2);
    stopLiveBadges();
    assert.equal(live.size, 0);
  } finally { globalThis.setInterval = realSet; globalThis.clearInterval = realClear; }
});

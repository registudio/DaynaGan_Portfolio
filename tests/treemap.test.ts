import assert from 'node:assert/strict';
import test from 'node:test';
import { squarify } from '../lib/treemap.ts';

test('treemap tiles fill the rectangle with areas proportional to value', () => {
  const items = [6, 6, 4, 3, 2, 2, 1].map((v, i) => ({ id: `s${i}`, value: v }));
  const W = 800;
  const H = 500;
  const rects = squarify(items, W, H);
  assert.equal(rects.length, items.length);
  const total = items.reduce((a, i) => a + i.value, 0);
  let area = 0;
  for (const r of rects) {
    const item = items.find((i) => i.id === r.id)!;
    assert.ok(Math.abs(r.w * r.h - (item.value / total) * W * H) < 1e-6, `area of ${r.id}`);
    assert.ok(r.x >= -1e-9 && r.y >= -1e-9 && r.x + r.w <= W + 1e-6 && r.y + r.h <= H + 1e-6, `${r.id} inside`);
    area += r.w * r.h;
  }
  assert.ok(Math.abs(area - W * H) < 1e-6);
});

test('treemap tiles do not overlap and stay reasonably square', () => {
  const items = [5, 4, 4, 3, 3, 3, 2, 2, 2, 1, 1, 1].map((v, i) => ({ id: `s${i}`, value: v }));
  const rects = squarify(items, 1000, 560);
  for (const a of rects)
    for (const b of rects) {
      if (a === b) continue;
      const overlap = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
      assert.ok(overlap < 1e-6, `${a.id} overlaps ${b.id}`);
    }
  for (const r of rects) assert.ok(Math.max(r.w / r.h, r.h / r.w) < 4.5, `${r.id} aspect`);
});

test('treemap handles empty input', () => {
  assert.deepEqual(squarify([], 100, 100), []);
});

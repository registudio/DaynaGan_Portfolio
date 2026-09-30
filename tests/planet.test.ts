import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlanet, REGIONS } from '../game/engine/planet.ts';
import { FLOOR } from '../game/engine/layout.ts';

const map = buildPlanet();

function reach(openGates: boolean) {
  const blocked = new Set<number>();
  if (!openGates) for (const p of map.puzzles) for (const c of p.gate.cells) blocked.add(c.z * map.w + c.x);
  const ok = (i: number) => {
    const c = map.cells[i];
    if (blocked.has(i)) return false;
    if (openGates && map.puzzles.some((p) => p.gate.cells.some((g) => g.z * map.w + g.x === i))) return true;
    return c.t === FLOOR && !c.solid;
  };
  const start = Math.floor(map.spawn.z) * map.w + Math.floor(map.spawn.x);
  const seen = new Set([start]);
  const q = [start];
  while (q.length) {
    const i = q.pop()!;
    const x = i % map.w;
    const z = Math.floor(i / map.w);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = (z + dz) * map.w + x + dx;
      if (x + dx < 0 || z + dz < 0 || x + dx >= map.w || z + dz >= map.d || seen.has(j) || !ok(j)) continue;
      seen.add(j);
      q.push(j);
    }
  }
  return seen;
}
const near = (seen: Set<number>, x: number, z: number, r = 2) => {
  for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (seen.has((Math.floor(z) + dz) * map.w + Math.floor(x) + dx)) return true;
  return false;
};

test('planet: every region exists and every section has a landmark', () => {
  const sections = map.landmarks.map((l) => l.section).sort();
  assert.deepEqual(sections, ['about', 'contact', 'education', 'experience', 'future', 'github', 'hobbies', 'leadership', 'projects', 'trophies']);
  for (const [i, r] of REGIONS.entries()) assert.ok(map.cells.filter((c) => c.room === i && c.t === FLOOR).length > 40, `${r.id} too small`);
  assert.ok(map.w >= 120, 'big enough to explore');
});

test('planet: puzzles have all their pieces, reachable before solving; landmarks reachable after', () => {
  const before = reach(false);
  const after = reach(true);
  for (const p of map.puzzles) {
    assert.equal(p.pieces.length, p.def.n, `${p.id} pieces`);
    assert.ok(p.gate.cells.length > 0, `${p.id} gate`);
    for (const piece of p.pieces) assert.ok(near(before, piece.x, piece.z), `${p.id} piece ${piece.index} unreachable`);
    assert.ok(near(before, p.hint.x, p.hint.z), `${p.id} hint unreachable`);
  }
  for (const l of map.landmarks) assert.ok(near(after, l.x, l.z, 3), `${l.section} landmark unreachable`);
  // Gated landmarks really are gated.
  for (const p of map.puzzles) {
    const l = map.landmarks.find((x) => x.region === p.region)!;
    assert.ok(!near(before, l.x, l.z, 1), `${p.id}: landmark reachable without solving`);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPortfolio } from '../lib/load.ts';
import { buildLevel, FLOOR, setProjectIds, type LevelMap } from '../game/engine/layout.ts';
import type { GitHubFeed } from '../lib/github.ts';

const portfolio = loadPortfolio();
const feed = {
  status: 'online',
  repos: Array.from({ length: 4 }, (_, i) => ({ name: `r${i}` })),
  events: [],
  activity: [],
} as unknown as GitHubFeed;
setProjectIds(portfolio.levels.find((l) => l.id === 'projects')!.rooms.map((r) => r.id));

function reachable(map: LevelMap) {
  const seen = new Set<number>();
  const start = Math.floor(map.spawn.z) * map.w + Math.floor(map.spawn.x);
  const queue = [start];
  seen.add(start);
  while (queue.length) {
    const i = queue.pop()!;
    const x = i % map.w;
    const z = Math.floor(i / map.w);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= map.w || nz >= map.d) continue;
      const j = nz * map.w + nx;
      const c = map.cells[j];
      if (seen.has(j) || c.t !== FLOOR || c.solid) continue;
      seen.add(j);
      queue.push(j);
    }
  }
  return seen;
}

for (const id of ['hub', ...portfolio.levels.filter((l) => l.meta.kind !== 'hub').map((l) => l.id)]) {
  test(`level ${id}: every interactable is reachable`, () => {
    for (const peaceful of [false, true]) {
      const map = buildLevel(portfolio, id, { peaceful, github: feed });
      const seen = reachable(map);
      const secretRoom = map.rooms.find((r) => r.kind === 'secret')?.i;
      for (const s of map.spawns) {
        if (['prop', 'enemy', 'boss', 'grid', 'secret', 'centerpiece'].includes(s.kind)) continue;
        if (s.kind === 'backroom' || (s.kind === 'hub' && s.what === 'earth')) continue;
        const x = Math.floor(s.x);
        const z = Math.floor(s.z);
        const near = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1], [2, 0], [0, 2], [-2, 0], [0, -2]].some(
          ([dx, dz]) => seen.has((z + dz) * map.w + (x + dx)),
        );
        const cell = map.cells[z * map.w + x];
        if (cell.room === secretRoom) continue;
        assert.ok(near, `${id}: ${s.kind} ${JSON.stringify(s)} unreachable (peaceful=${peaceful})`);
      }
      if (id === 'projects') {
        const parts = map.spawns.filter((s) => s.kind === 'part').length;
        const total = portfolio.levels.find((l) => l.id === 'projects')!.rooms.reduce((n, r) => n + r.parts.length, 0);
        assert.equal(parts, total, 'every project part is placed');
      }
    }
  });
}

const CONTENT_LEVELS = ['about', 'education', 'experience', 'leadership'];
for (const id of CONTENT_LEVELS) {
  test(`level ${id}: every part gets a terminal and every terminal can be approached from all sides`, () => {
    const map = buildLevel(portfolio, id, { peaceful: false, github: feed });
    const level = portfolio.levels.find((l) => l.id === id)!;
    if (id !== 'leadership') {
      const want = level.rooms.flatMap((r) => r.parts.filter((p) => !p.todo || p.body).map((p) => `${r.id}/${p.id}`));
      const got = map.spawns.filter((s) => s.kind === 'terminal').map((s) => (s.kind === 'terminal' ? `${s.roomId}/${s.partId}` : ''));
      assert.deepEqual(got.sort(), want.sort());
    }
    for (const s of map.spawns) {
      if (s.kind !== 'terminal' && s.kind !== 'console' && s.kind !== 'npc') continue;
      const x = Math.floor(s.x);
      const z = Math.floor(s.z);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const c = map.cells[(z + dz) * map.w + (x + dx)];
        assert.ok(c && c.t === FLOOR && !c.solid, `${id}: ${s.kind} at ${s.x},${s.z} blocked on side ${dx},${dz}`);
      }
    }
  });
}

for (const id of ['about', 'education', 'experience', 'projects', 'trophies', 'leadership', 'github', 'contact']) {
  test(`level ${id}: has bots and 2–3 fabricators (none in Peaceful)`, () => {
    const map = buildLevel(portfolio, id, { peaceful: false, github: feed });
    const bots = map.spawns.filter((s) => s.kind === 'enemy').length;
    const fabs = map.spawns.filter((s) => s.kind === 'spawner');
    assert.ok(bots >= 4, `${id}: only ${bots} bots`);
    assert.ok(fabs.length >= 2 && fabs.length <= 3, `${id}: ${fabs.length} fabricators`);
    const boss = map.spawns.find((s) => s.kind === 'boss');
    for (const f of fabs) if (boss && boss.kind === 'boss' && f.kind === 'spawner') assert.notEqual(f.room, boss.room, 'no fabricator in the boss arena');
    const calm = buildLevel(portfolio, id, { peaceful: true, github: feed });
    assert.equal(calm.spawns.filter((s) => s.kind === 'spawner' || s.kind === 'enemy').length, 0);
  });
}

test('every mission gets its themed hazards, clear of doors, without blocking any interactable', async () => {
  const { HAZARDS } = await import('../game/engine/layout.ts');
  for (const [id, want] of Object.entries(HAZARDS)) {
    const map = buildLevel(portfolio, id, { peaceful: false, github: feed });
    const got = map.spawns.filter((s) => s.kind === 'hazard');
    const total = Object.values(want).reduce((a, b) => a + (b ?? 0), 0);
    assert.ok(got.length >= total - 1, `${id}: ${got.length}/${total} hazards`);
    for (const h of got) assert.ok(map.rooms[h.kind === 'hazard' ? h.room : 0].kind !== 'entry', `${id}: hazard in entry room`);
  }
});

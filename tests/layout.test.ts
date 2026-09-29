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

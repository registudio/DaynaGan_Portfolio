import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPortfolio } from '../lib/load.ts';
import { buildLevel, FLOOR, setProjectIds } from '../game/engine/layout.ts';
import { trialType } from '../game/engine/trials.ts';
import type { GitHubFeed } from '../lib/github.ts';

const portfolio = loadPortfolio();
const feed = { status: 'online', repos: Array.from({ length: 4 }, (_, i) => ({ name: `r${i}` })), events: [], activity: [] } as unknown as GitHubFeed;
setProjectIds(portfolio.levels.find((l) => l.id === 'projects')!.rooms.map((r) => r.id));

const NEED: Record<string, Record<string, number>> = {
  button: { button: 1 },
  push: { plate: 1, crate: 1 },
  lasers: { breaker: 3 },
  battery: { cell: 1, socket: 1 },
  arena: {},
};

for (const id of ['about', 'education', 'experience', 'projects', 'trophies', 'leadership', 'github', 'contact']) {
  test(`${id}: trial rooms have a gate, their task pieces and a gauntlet`, () => {
    for (const peaceful of [false, true]) {
      const map = buildLevel(portfolio, id, { peaceful, github: feed });
      const trials = map.spawns.filter((s) => s.kind === 'trial');
      const rooms = map.rooms.filter((r) => r.kind === 'trial');
      assert.equal(trials.length, rooms.length, `${id}: every trial room is set up`);
      for (const t of trials) {
        if (t.kind !== 'trial') continue;
        assert.ok(t.gate.cells.length > 0);
        if (peaceful) assert.notEqual(t.type, 'arena');
        const counts: Record<string, number> = {};
        for (const p of t.points) counts[p.role] = (counts[p.role] ?? 0) + 1;
        for (const [role, n] of Object.entries(NEED[t.type])) assert.ok((counts[role] ?? 0) >= n, `${t.id} (${t.type}) missing ${role}: ${JSON.stringify(counts)}`);
        for (const p of t.points) {
          if (p.role === 'cover' || p.role === 'breaker') continue;
          const c = map.cells[Math.floor(p.z) * map.w + Math.floor(p.x)];
          assert.ok(c && c.t === FLOOR && !c.solid, `${t.id}: ${p.role} not on open floor`);
        }
        const lasers = map.spawns.filter((s) => s.kind === 'hazard' && s.type === 'laser' && s.room === t.room);
        assert.ok(lasers.length >= 1, `${t.id}: no laser sweep`);
      }
    }
  });
}

test('trial types are deterministic', () => {
  assert.equal(trialType('about', 0, false), trialType('about', 0, false));
});

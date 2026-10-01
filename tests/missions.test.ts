import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPortfolio } from '../lib/load.ts';
import { roomKey } from '../lib/skills.ts';
import { BOSSES, isCleared, objective, PUZZLES } from '../game/engine/missions.ts';
import { emptySave } from '../game/engine/store.ts';
import { buildLevel, setProjectIds } from '../game/engine/layout.ts';
import type { GitHubFeed } from '../lib/github.ts';

const portfolio = loadPortfolio();
const feed = { status: 'online', repos: [], events: [], activity: [] } as unknown as GitHubFeed;
setProjectIds(portfolio.levels.find((l) => l.id === 'projects')!.rooms.map((r) => r.id));

function scannedAll(levelId: string) {
  const save = emptySave();
  for (const r of portfolio.levels.find((l) => l.id === levelId)!.rooms) save.scanned.push(roomKey(levelId, r.id));
  return save;
}

test('required mini-bosses gate a clear, except in Peaceful mode', () => {
  const save = scannedAll('about');
  assert.equal(isCleared(portfolio, save, 'about', false), false);
  assert.match(objective(portfolio, save, 'about', false).text, /Overloaded Core/);
  assert.equal(isCleared(portfolio, save, 'about', true), true);
  save.bosses.push('about');
  assert.equal(isCleared(portfolio, save, 'about', false), true);
});

test('the Comms Core boss is optional — the contact form is never locked behind a fight', () => {
  assert.equal(BOSSES.contact.required, false);
  const save = emptySave();
  save.sent = true;
  assert.equal(isCleared(portfolio, save, 'contact', false), true);
});

test('non-combat missions have no boss', () => {
  const save = scannedAll('leadership');
  assert.equal(isCleared(portfolio, save, 'leadership', false), true);
});

for (const id of Object.keys(PUZZLES)) {
  test(`${id}: puzzle has a barrier, ${PUZZLES[id].nodes} nodes and a hint console`, () => {
    const map = buildLevel(portfolio, id, { peaceful: false, github: feed });
    const barrier = map.spawns.find((s) => s.kind === 'barrier');
    assert.ok(barrier && barrier.kind === 'barrier' && barrier.cells.length > 0);
    assert.equal(map.spawns.filter((s) => s.kind === 'pnode').length, PUZZLES[id].nodes);
    assert.ok(map.spawns.some((s) => s.kind === 'phint'));
  });
}

for (const id of Object.keys(BOSSES)) {
  test(`${id}: mini-boss spawns (and not in Peaceful mode)`, () => {
    assert.ok(buildLevel(portfolio, id, { peaceful: false, github: feed }).spawns.some((s) => s.kind === 'boss'));
    assert.ok(!buildLevel(portfolio, id, { peaceful: true, github: feed }).spawns.some((s) => s.kind === 'boss'));
  });
}

test('Xiao Hu learns tricks as missions are cleared', async () => {
  const { catTricks, CAT_TRICKS } = await import('../game/engine/missions.ts');
  const { emptySave } = await import('../game/engine/store.ts');
  const save = emptySave();
  assert.deepEqual(catTricks(portfolio, save), { hiss: false, 'long-fetch': false, 'nine-lives': false });
  const ids = ['about', 'education', 'experience', 'projects', 'trophies', 'leadership'];
  for (const [k, id] of ids.entries()) {
    save.cleared.push(id);
    const t = catTricks(portfolio, save);
    for (const trick of CAT_TRICKS) assert.equal(t[trick.id], k + 1 >= trick.need, `${trick.id} after ${k + 1}`);
  }
});

test('mission stars: clear, clean sweep (trials + fabricators), all screws', async () => {
  const { missionStars } = await import('../game/engine/missions.ts');
  const counts = { fabs: ['about-fab-0', 'about-fab-1'], trials: ['about-trial-0'], screws: ['about-screw-0', 'about-screw-1', 'about-screw-2'] };
  const save = emptySave();
  assert.equal(missionStars(save, 'about', counts, false).got, 0);
  save.cleared.push('about');
  save.trials = ['about-trial-0'];
  assert.equal(missionStars(save, 'about', counts, false).sweep, false, 'fabricators still standing');
  assert.equal(missionStars(save, 'about', counts, true).sweep, true, 'Peaceful mode has no fabricators');
  save.spawners = ['about-fab-0', 'about-fab-1'];
  save.screws = ['about-screw-0', 'about-screw-2'];
  const s = missionStars(save, 'about', counts, false);
  assert.deepEqual([s.got, s.screwCount, s.screws], [2, 2, false]);
  save.screws.push('about-screw-1');
  assert.equal(missionStars(save, 'about', counts, false).got, 3);
});

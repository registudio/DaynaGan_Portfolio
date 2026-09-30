import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPortfolio } from '../lib/load.ts';
import { levelFragments, roomIntro, summarize } from '../game/engine/lore.ts';

const portfolio = loadPortfolio();

test('summaries strip markdown and stay short', () => {
  const s = summarize('**Bold** start. Second [link](https://x.y) sentence here! Third one that is long enough to be cut off eventually.', 60);
  assert.ok(!/[*[\]()]/.test(s), s);
  assert.ok(s.length <= 60, s);
  assert.ok(s.startsWith('Bold start.'));
});

test('every content room has a title card and narration line', () => {
  for (const level of portfolio.levels) {
    for (const room of level.rooms) {
      const a = roomIntro(room);
      assert.ok(a.title && a.line.length > 5, `${level.id}/${room.id}`);
      assert.ok(!a.eyebrow.includes('TODO') && !a.sub.includes('TODO'), `${level.id}/${room.id}: ${a.eyebrow} ${a.sub}`);
    }
  }
});

test('combat missions have lore fragments with unique ids', () => {
  for (const id of ['about', 'education', 'experience', 'leadership']) {
    const level = portfolio.levels.find((l) => l.id === id)!;
    const f = levelFragments(level);
    assert.ok(f.length >= 3, `${id}: ${f.length} fragments`);
    assert.equal(new Set(f.map((x) => x.id)).size, f.length);
    for (const x of f) assert.ok(x.text.length >= 20 && x.text.length <= 180, x.text);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPortfolio, parsePortfolio } from '../lib/load.ts';
import { parseBody, sectionLevels } from '../lib/portfolio.ts';
import { checkBuild, computeSkills, unbuildableProjects } from '../lib/skills.ts';

const portfolio = loadPortfolio();

test('portfolio.md parses and validates', () => {
  assert.equal(portfolio.site.displayName, 'Dayna Gan');
  assert.deepEqual(
    sectionLevels(portfolio).map((l) => l.id),
    ['about', 'education', 'experience', 'projects', 'trophies', 'leadership', 'github', 'contact'],
  );
});

test('every level has a biome and light colour', () => {
  for (const level of portfolio.levels) {
    assert.ok(level.meta.biome, `${level.id} biome`);
    assert.match(level.meta.light, /^#[0-9a-f]{6}$/i, `${level.id} light`);
  }
});

test('heading hierarchy: metadata, prose and TODO stripping', () => {
  const [level] = parseBody(
    '# Level A\nid: a\nlight: #ffffff\n\nIntro.\n\n## Room\nperiod: 2024\n\nText.\n\nTODO: hidden\n\n### Part\nPart text.',
  );
  assert.equal(level.id, 'a');
  assert.equal(level.meta.light, '#ffffff');
  assert.equal(level.body, 'Intro.');
  assert.equal(level.rooms[0].id, 'room');
  assert.equal(level.rooms[0].body, 'Text.');
  assert.equal(level.rooms[0].todo, true);
  // A prose line directly under a heading is metadata only if it looks like `key: value`.
  assert.equal(level.rooms[0].parts[0].body, 'Part text.');
});

test('headings must nest one level at a time', () => {
  assert.throws(() => parseBody('# L\n### Orphan part'));
});

test('invalid content is rejected', () => {
  const bad = `---\nname: x\ndisplayName: x\ntitle: x\ndescription: x\ntagline: x\nlocation: x\nemail: a@b.co\nlinkedin: https://a.b\ngithub: https://a.b\ngithubUsername: x\nresume: /r.pdf\ncompanion: { name: Cat }\nskills: []\n---\n# L\nid: l\n\n## R\ngrants: nope +1\n`;
  assert.throws(() => parsePortfolio(bad), /Unknown skill "nope"/);
});

test('every project can be built by playing through', () => {
  assert.deepEqual(unbuildableProjects(portfolio), []);
});

test('drone needs soldering 3 and the claw + Euna Air first', () => {
  const none = computeSkills(portfolio, { scanned: [], built: [] });
  const check = checkBuild(portfolio, 'drone', none, []);
  assert.equal(check.ok, false);
  assert.ok(check.missingSkills.some((m) => m.skill === 'soldering' && m.level === 3));
  assert.deepEqual(
    check.missingProjects.map((m) => m.id).sort(),
    ['air-quality-sensor', 'robot-claw'],
  );
});

test('skills are capped at their max', () => {
  const full = computeSkills(portfolio, null);
  for (const s of portfolio.site.skills) assert.ok(full[s.id] <= s.max, s.id);
  assert.equal(full.python, 5);
});

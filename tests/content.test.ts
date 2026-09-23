import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  getSite,
  getSections,
  getExperience,
  getProjects,
  getPosts,
  getTour,
  projectSchema,
} from '../lib/content.ts';
import {
  beamCount,
  blueprintBlend,
  beamOrigins,
  beamFocus,
  dishCenter,
  chapterPose,
  combatDestroyed,
  moduleMap,
  sectionIds,
} from '../lib/tour.ts';

test('all navigation destinations and scene modules map to real sections', () => {
  const site = getSite();
  const sections = getSections();
  const ids = ['blueprint', ...sections.map((s) => s.id)];
  assert.deepEqual(
    site.navigation.map((n) => n.id),
    ids,
  );
  for (const target of Object.values(moduleMap)) assert.ok(ids.includes(target));
  assert.deepEqual(ids, sectionIds);
  assert.equal(new Set(sections.map((s) => s.order)).size, 8);
  assert.equal(getTour().education[0].qualification, 'Elective: Computing+');
});
test('canonical experience and contact details are intact', () => {
  const jobs = getExperience();
  assert.equal(jobs.length, 4);
  assert.ok(jobs.find((j) => j.slug === 'dso')?.body.includes('55.6%'));
  assert.ok(jobs.find((j) => j.slug === 'astar')?.body.includes('100 simulation runs'));
  assert.equal(getSite().email, 'daynagsr@gmail.com');
  assert.ok(fs.existsSync(`public${getSite().resume}`));
});
test('draft projects and blog posts are never published', () => {
  assert.ok(getProjects().every((p) => !p.draft));
  assert.ok(getPosts().every((p) => !p.draft));
  assert.ok(!getProjects().some((p) => p.slug === 'first-project'));
  assert.ok(!getPosts().some((p) => p.slug === 'first-field-note'));
});
test('invalid content slugs and links fail validation', () => {
  const valid = { title: 'Test', slug: 'test', summary: 'Test', technologies: [] };
  assert.ok(projectSchema.safeParse(valid).success);
  assert.ok(!projectSchema.safeParse({ ...valid, slug: '../unsafe' }).success);
  assert.ok(!projectSchema.safeParse({ ...valid, github: 'not a URL' }).success);
});
test('eight separate emitters ignite in order before the main beam', () => {
  assert.equal(beamCount(0), 0);
  for (let i = 0; i < 8; i++) assert.equal(beamCount(0.121 + i * 0.085), i + 1);
  assert.equal(beamCount(0.83), 8);
  assert.equal(new Set(beamOrigins.map((p) => p.join(','))).size, 8);
  for (const origin of beamOrigins) {
    assert.ok(Math.abs(Math.hypot(...origin.map((v, i) => v - dishCenter[i])) - 0.68) < 0.002);
    assert.ok(Math.hypot(...origin.map((v, i) => v - beamFocus[i])) > 1.8);
  }
  assert.equal(combatDestroyed(0), 0);
  assert.equal(combatDestroyed(0.82), 6);
  assert.equal(combatDestroyed(0.3), 0);
});
test('blueprint, solid model and space use the same reversible fade', () => {
  assert.equal(blueprintBlend(0), 0);
  assert.ok(Math.abs(blueprintBlend(0.31) - 0.5) < 0.0001);
  assert.equal(blueprintBlend(0.6), 1);
  assert.equal(blueprintBlend(1), 1);
  assert.equal(blueprintBlend(-1), 0);
});
test('every destination has valid desktop and mobile camera poses', () => {
  for (let stage = 0; stage < sectionIds.length; stage++)
    for (const mobile of [true, false])
      for (const local of [0, 0.5, 1]) {
        const pose = chapterPose(stage, local, mobile);
        assert.ok([...pose.position, ...pose.target, pose.fov].every(Number.isFinite));
        assert.ok(pose.fov > 20 && pose.fov < 100);
        assert.notDeepEqual(pose.position, pose.target);
      }
});
test('optimized uploaded station models retain all named tour sectors', () => {
  for (const file of ['blueprint', 'station', 'station-mobile']) {
    const glb = fs.readFileSync(`public/models/tour/${file}.glb`);
    assert.equal(glb.readUInt32LE(0), 0x46546c67);
    const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString());
    for (const name of Object.keys(moduleMap))
      assert.ok(
        json.nodes.some((n: { name: string }) => n.name === name),
        name,
      );
    assert.ok(glb.length < 16_000_000);
  }
});

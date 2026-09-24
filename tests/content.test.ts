import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  getSite,
  getSections,
  getExperience,
  getProjects,
  getPosts,
  getProfile,
  projectSchema,
} from '../lib/content.ts';

test('every navigation destination maps to a real section', () => {
  const site = getSite();
  const ids = ['hero', ...getSections().map((s) => s.id)];
  assert.deepEqual(
    site.navigation.map((n) => n.id),
    ids,
  );
  assert.equal(new Set(getSections().map((s) => s.order)).size, getSections().length);
});

test('canonical experience, education and contact details are intact', () => {
  const jobs = getExperience();
  assert.equal(jobs.length, 4);
  assert.ok(jobs.find((j) => j.slug === 'dso')?.body.includes('55.6%'));
  assert.ok(jobs.find((j) => j.slug === 'astar')?.body.includes('100 simulation runs'));
  assert.equal(getSite().email, 'daynagsr@gmail.com');
  assert.ok(fs.existsSync(`public${getSite().resume}`));
  const profile = getProfile();
  assert.deepEqual(
    profile.education.map((e) => e.short),
    ['SST', 'SP', 'NUS'],
  );
  assert.ok(profile.education.find((e) => e.id === 'sp')?.details.includes('GPA: 3.97 / 4.00'));
});

test('all six projects publish in order with explodable parts', () => {
  const projects = getProjects();
  assert.deepEqual(
    projects.map((p) => p.slug),
    ['rosa-ros2', 'isaac-nav2', 'dreamer-smaclite', 'air-quality-sensor', 'robot-claw', 'drone'],
  );
  for (const p of projects) {
    assert.ok(p.parts.length >= 3, `${p.slug} needs parts`);
    assert.equal(new Set(p.parts.map((part) => part.id)).size, p.parts.length, p.slug);
    assert.ok(
      p.parts.some((part) => part.explode.some((v) => v !== 0)),
      `${p.slug} never explodes`,
    );
  }
  assert.equal(projects.find((p) => p.slug === 'drone')?.status, 'in-progress');
});

test('draft projects and blog posts are never published', () => {
  assert.ok(getProjects().every((p) => !p.draft));
  assert.ok(getPosts().every((p) => !p.draft));
  assert.ok(!getProjects().some((p) => p.slug === 'first-project'));
  assert.ok(!getPosts().some((p) => p.slug === 'first-field-note'));
});

test('invalid project content fails validation', () => {
  const valid = { title: 'Test', slug: 'test', summary: 'Test', technologies: [] };
  assert.ok(projectSchema.safeParse(valid).success);
  assert.ok(!projectSchema.safeParse({ ...valid, slug: '../unsafe' }).success);
  assert.ok(!projectSchema.safeParse({ ...valid, github: 'not a URL' }).success);
  assert.ok(!projectSchema.safeParse({ ...valid, status: 'someday' }).success);
  assert.ok(
    !projectSchema.safeParse({
      ...valid,
      parts: [{ id: 'a', label: 'A', summary: 'A', shape: 'blob' }],
    }).success,
  );
});

/** Run against a local DEVELOPMENT server. The temporary fixture is removed in finally. */
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
const base = process.env.TEST_URL || 'http://localhost:3000';
const fixture = 'content/projects/route-verification.mdx';
assert.ok(!existsSync(fixture), `Refusing to replace existing content: ${fixture}`);
try {
  writeFileSync(
    fixture,
    '---\ntitle: Temporary project verification\nslug: route-verification\nsummary: Temporary test fixture\norder: 999\nfeatured: false\ndraft: false\ntechnologies: [TypeScript]\nparts:\n  - { id: a, label: Part A, summary: Test part, explode: [0, 1, 0] }\n---\n## Rendered project body\n\nVerified **Markdown** content.\n',
  );
  for (const [path, text] of [
    ['/projects/route-verification/', 'Rendered project body'],
    ['/', 'Temporary project verification'],
  ]) {
    const res = await fetch(`${base}${path}`);
    assert.equal(res.status, 200, path);
    assert.ok((await res.text()).includes(text), text);
    console.log(`PASS ${path}`);
  }
  for (const path of ['/projects/first-project/', '/projects/does-not-exist/']) {
    const res = await fetch(`${base}${path}`);
    const body = await res.text();
    assert.ok(res.status === 404 || body.includes('Nothing to see here.'), path);
    console.log(`PASS draft/missing route ${path}`);
  }
  for (const path of [
    '/resume/DaynaGan_Resume.pdf',
    '/images/og.png',
    '/robots.txt',
    '/sitemap.xml',
  ]) {
    assert.equal((await fetch(`${base}${path}`)).status, 200, path);
    console.log(`PASS asset ${path}`);
  }
} finally {
  if (existsSync(fixture)) unlinkSync(fixture);
}

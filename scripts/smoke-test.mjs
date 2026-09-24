/** Run against a local DEVELOPMENT server. Temporary fixtures are removed in finally. */
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
const base = process.env.TEST_URL || 'http://localhost:3000';
const fixtures = ['content/projects/route-verification.mdx', 'content/blog/route-verification.mdx'];
for (const file of fixtures)
  assert.ok(!existsSync(file), `Refusing to replace existing content: ${file}`);
try {
  writeFileSync(
    fixtures[0],
    '---\ntitle: Temporary project verification\nslug: route-verification\nsummary: Temporary test fixture\nfeatured: false\ndraft: false\ntechnologies: [TypeScript]\n---\n## Rendered project body\n\nVerified **Markdown** content.\n',
  );
  writeFileSync(
    fixtures[1],
    '---\ntitle: Temporary log verification\nslug: route-verification\nsummary: Temporary test fixture\ndate: "2026-09-23"\nfeatured: false\ndraft: false\ntags: [testing]\n---\n## Rendered blog body\n\n```python\nprint("verified")\n```\n',
  );
  for (const [path, text] of [
    ['/projects/route-verification', 'Rendered project body'],
    ['/blog/route-verification', 'Rendered blog body'],
    ['/', 'Temporary project verification'],
  ]) {
    const res = await fetch(`${base}${path}`);
    assert.equal(res.status, 200, path);
    assert.ok((await res.text()).includes(text), text);
    console.log(`PASS ${path}`);
  }
  writeFileSync(
    fixtures[0],
    '---\ntitle: Changed project heading\nslug: route-verification\nsummary: Changed on refresh\ndraft: false\n---\nUpdated content from Markdown.\n',
  );
  assert.ok(
    (await (await fetch(`${base}/projects/route-verification`)).text()).includes(
      'Changed project heading',
    ),
  );
  console.log('PASS Markdown edits update route output');
  for (const path of [
    '/projects/first-project',
    '/blog/first-field-note',
    '/blog/does-not-exist',
  ]) {
    const res = await fetch(`${base}${path}`);
    const body = await res.text();
    assert.ok(res.status === 404 || body.includes('Nothing to see here.'), path);
    assert.ok(!body.includes('This is an unpublished authoring template'), path);
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
  const api = await fetch(`${base}/api/github`);
  assert.equal(api.status, 200);
  const data = await api.json();
  assert.ok(['online', 'offline'].includes(data.status));
  assert.ok(api.headers.get('cache-control').includes('s-maxage=3600'));
  console.log(`PASS GitHub API ${data.status} with caching`);
} finally {
  for (const file of fixtures) if (existsSync(file)) unlinkSync(file);
}

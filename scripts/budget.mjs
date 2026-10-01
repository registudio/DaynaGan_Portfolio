// Performance budget, run in CI after `next build`: the JavaScript the home page loads up
// front (gzip) and the largest lazily-loaded chunk (the 3D engine). Fails when either grows
// past its limit, so regressions are caught before they ship.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const LIMITS = { initialKb: 220, largestLazyKb: 130 };
const html = readFileSync('.next/server/app/index.html', 'utf8');
const initial = [...new Set(html.match(/\/_next\/static\/chunks\/[^"']+\.js/g) ?? [])];
const gz = (f) => gzipSync(readFileSync(f)).length / 1024;
const initialKb = initial.reduce((a, src) => a + gz(join('.next', src.replace('/_next/', ''))), 0);

const dir = '.next/static/chunks';
const loaded = new Set(initial.map((s) => s.split('/').pop()));
let largest = { name: '', kb: 0 };
for (const f of readdirSync(dir)) {
  const p = join(dir, f);
  if (!f.endsWith('.js') || loaded.has(f) || !statSync(p).isFile()) continue;
  const kb = gz(p);
  if (kb > largest.kb) largest = { name: f, kb };
}

const rows = [
  ['Initial JS (gzip)', initialKb, LIMITS.initialKb],
  [`Largest lazy chunk (${largest.name})`, largest.kb, LIMITS.largestLazyKb],
];
let failed = false;
for (const [label, kb, limit] of rows) {
  const ok = kb <= limit;
  failed ||= !ok;
  console.log(`${ok ? '✓' : '✗'} ${label}: ${kb.toFixed(1)} kB (limit ${limit} kB)`);
}
process.exit(failed ? 1 : 0);

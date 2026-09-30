import * as THREE from 'three';

/**
 * Procedural pixel-art textures (16×16, nearest-filtered) so every block reads as
 * chunky Minecraft-Dungeons-style voxels without shipping image assets.
 */

export type Pattern =
  | 'noise'
  | 'panel'
  | 'grate'
  | 'circuit'
  | 'stone'
  | 'hex'
  | 'server'
  | 'grass'
  | 'tile'
  | 'hazard'
  | 'tabby'
  | 'metal'
  | 'plate'
  | 'screen'
  | 'tread'
  | 'vent';

const cache = new Map<string, THREE.CanvasTexture>();

import { rng } from './rng.ts';
import { AUTHORED } from './authored.ts';
export { rng };

const clamp = (v: number) => Math.max(0, Math.min(255, v));

function shade(hex: string, amount: number): string {
  const c = new THREE.Color(hex);
  const r = clamp(c.r * 255 + amount);
  const g = clamp(c.g * 255 + amount);
  const b = clamp(c.b * 255 + amount);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function draw(pattern: Pattern, base: string, accent: string, ctx: CanvasRenderingContext2D, n: number) {
  const r = rng(pattern.length * 997 + base.length * 31 + n);
  const px = (x: number, y: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
  };
  // Hand-authored tiles (see authored.ts) take priority at 16×16.
  const art = n === 16 ? AUTHORED[pattern] : undefined;
  if (art) {
    const SHADE: Record<string, number> = { '#': -55, '-': -26, '.': 0, '+': 20, '*': 42 };
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const ch = art[y]?.[x] ?? '.';
        if (ch === 'a') px(x, y, accent);
        else if (ch === 'A') px(x, y, shade(accent, 70));
        else px(x, y, shade(base, (SHADE[ch] ?? 0) + (r() - 0.5) * 10));
      }
    return;
  }
  // Base noise on every pattern.
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) px(x, y, shade(base, (r() - 0.5) * 18));

  switch (pattern) {
    case 'panel':
      for (let i = 0; i < n; i++) {
        px(i, 0, shade(base, 22));
        px(0, i, shade(base, 22));
        px(i, n - 1, shade(base, -26));
        px(n - 1, i, shade(base, -26));
      }
      [
        [2, 2],
        [n - 3, 2],
        [2, n - 3],
        [n - 3, n - 3],
      ].forEach(([x, y]) => px(x, y, shade(base, 40)));
      break;
    case 'metal':
      for (let y = 0; y < n; y += 4) for (let x = 0; x < n; x++) px(x, y, shade(base, 14));
      break;
    case 'grate':
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) if (x % 4 === 0 || y % 4 === 0) px(x, y, shade(base, -30));
      break;
    case 'circuit': {
      ctx.fillStyle = accent;
      const traces = [
        [1, 3, 9, 3],
        [9, 3, 9, 11],
        [4, 7, 4, 14],
        [4, 14, 14, 14],
        [12, 1, 12, 8],
      ];
      for (const [x1, y1, x2, y2] of traces)
        ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1) + 1, Math.abs(y2 - y1) + 1);
      ctx.fillStyle = shade(accent, 60);
      [
        [9, 11],
        [12, 8],
        [1, 3],
        [14, 14],
      ].forEach(([x, y]) => ctx.fillRect(x - 1, y - 1, 2, 2));
      break;
    }
    case 'stone':
      for (let i = 0; i < 10; i++) {
        const x = (r() * n) | 0;
        const y = (r() * n) | 0;
        px(x, y, shade(base, -35));
        px((x + 1) % n, y, shade(base, -20));
      }
      break;
    case 'hex':
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) if ((x + (y % 8 < 4 ? 0 : 4)) % 8 === 0) px(x, y, shade(base, 24));
      break;
    case 'server':
      for (let y = 1; y < n; y += 3) {
        for (let x = 1; x < n - 1; x++) px(x, y, shade(base, -30));
        px(2, y + 1, r() > 0.4 ? accent : shade(accent, -80));
        px(4, y + 1, r() > 0.6 ? accent : shade(accent, -80));
      }
      break;
    case 'grass':
      for (let i = 0; i < 40; i++) px((r() * n) | 0, (r() * n) | 0, shade(base, r() > 0.5 ? 26 : -22));
      break;
    case 'tile':
      for (let i = 0; i < n; i++) {
        px(i, 0, shade(base, -22));
        px(0, i, shade(base, -22));
        px(i, n / 2, shade(base, -14));
        px(n / 2, i, shade(base, -14));
      }
      break;
    case 'hazard':
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) px(x, y, (x + y) % 8 < 4 ? accent : '#15151a');
      break;
    case 'tabby':
      // Mackerel tabby: vertical dark stripes over warm grey-brown.
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          const stripe = (x + Math.round(Math.sin(y * 0.8) * 1.2)) % 4 === 0;
          if (stripe) px(x, y, shade(base, -58));
          else if (r() > 0.8) px(x, y, shade(base, 18));
        }
      break;
    case 'plate': {
      // Armour plating: bevelled edge (light top-left, dark bottom-right), one seam, corner bolts.
      const m = Math.max(1, n >> 3);
      for (let i = 0; i < n; i++)
        for (let k = 0; k < m; k++) {
          px(i, k, shade(base, 26 - k * 8));
          px(k, i, shade(base, 18 - k * 6));
          px(i, n - 1 - k, shade(base, -34 + k * 8));
          px(n - 1 - k, i, shade(base, -28 + k * 6));
        }
      const seam = Math.round(n * 0.55);
      for (let x = m + 1; x < n - m - 1; x++) {
        px(x, seam, shade(base, -24));
        px(x, seam + 1, shade(base, 10));
      }
      for (const [x, y] of [
        [m + 1, m + 1],
        [n - m - 2, m + 1],
        [m + 1, n - m - 2],
        [n - m - 2, n - m - 2],
      ]) {
        px(x, y, shade(base, 48));
        if (n >= 16) px(x + 1, y + 1, shade(base, -30));
      }
      break;
    }
    case 'screen': {
      // Dim UI readout: dark glass, header bar, lines of "text", faint scanlines.
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) px(x, y, shade('#070a12', (y % 2 ? -3 : 3) + (r() - 0.5) * 6));
      const a = (v: number) => shade(accent, v);
      for (let x = 1; x < n - 1; x++) px(x, 1, a(-60));
      for (let y = 3; y < n - 1; y += 2) {
        const len = 2 + ((r() * (n - 6)) | 0);
        const x0 = y % 4 === 1 ? 3 : 1;
        for (let x = x0; x < Math.min(n - 1, x0 + len); x++) px(x, y, a(y < 6 ? -40 : -95 + ((r() * 20) | 0)));
      }
      px(n - 3, 1, a(40));
      break;
    }
    case 'tread':
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) px(x, y, y % 4 < 2 ? shade(base, -36) : shade(base, x % 4 === 0 ? -10 : 12));
      break;
    case 'vent':
      for (let y = 0; y < n; y++) if (y % 3 === 1) for (let x = 1; x < n - 1; x++) px(x, y, shade(base, -46));
      for (let i = 0; i < n; i++) {
        px(i, 0, shade(base, 20));
        px(i, n - 1, shade(base, -30));
      }
      break;
    case 'noise':
    default:
      break;
  }
}

export function pixelTexture(pattern: Pattern, base: string, accent = '#ffffff', size = 16) {
  const key = `${pattern}|${base}|${accent}|${size}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  draw(pattern, base, accent, ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  cache.set(key, tex);
  return tex;
}

/** Emissive-only map for patterns whose accent should glow (circuit traces, server LEDs). */
export function glowTexture(pattern: Pattern, accent: string, size = 16) {
  const key = `glow|${pattern}|${accent}|${size}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  const tmp = document.createElement('canvas');
  tmp.width = tmp.height = size;
  const t = tmp.getContext('2d')!;
  draw(pattern, '#000000', accent, t, size);
  // Keep only bright (accent) pixels.
  const img = t.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const lum = img.data[i] + img.data[i + 1] + img.data[i + 2];
    if (lum < 200) img.data[i] = img.data[i + 1] = img.data[i + 2] = 0;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

import * as THREE from 'three';
import type { Biome, PropKind } from './biomes.ts';
import { blobShadow, box, disc, glow, group, mat, ring } from './voxels.ts';

/** Decorative props and interactable machines, built from voxel boxes. */

export function buildProp(kind: PropKind, biome: Biome): THREE.Group {
  const g = new THREE.Group();
  const accent = biome.rail;
  const metal = mat(biome.wall.color, { pattern: 'metal', metal: 0.4, rough: 0.6 });
  const dark = mat('#1f2330');
  switch (kind) {
    case 'crate':
      box(0.8, 0.7, 0.8, mat('#6b5b4a', { pattern: 'panel' }), 0, 0.35, 0, g);
      box(0.82, 0.08, 0.1, glow(accent, 1.2), 0, 0.5, 0.41, g);
      break;
    case 'pipe':
      box(0.3, 1.8, 0.3, metal, 0, 0.9, 0, g);
      box(0.4, 0.12, 0.4, dark, 0, 0.4, 0, g);
      box(0.4, 0.12, 0.4, dark, 0, 1.4, 0, g);
      box(0.08, 0.3, 0.08, glow(accent, 2), 0.16, 1.0, 0, g);
      break;
    case 'desk':
      box(0.9, 0.08, 0.6, metal, 0, 0.7, 0, g);
      box(0.08, 0.7, 0.5, dark, -0.38, 0.35, 0, g);
      box(0.08, 0.7, 0.5, dark, 0.38, 0.35, 0, g);
      box(0.5, 0.34, 0.04, dark, 0, 0.95, -0.15, g);
      box(0.44, 0.26, 0.02, glow(accent, 1.4), 0, 0.95, -0.12, g);
      break;
    case 'rack':
      box(0.8, 2.0, 0.7, mat('#1b2320', { pattern: 'server', accent }), 0, 1.0, 0, g);
      box(0.82, 0.06, 0.72, glow(accent, 1.2), 0, 2.0, 0, g);
      break;
    case 'arm': {
      box(0.6, 0.3, 0.6, mat('#3b3b40'), 0, 0.15, 0, g);
      const a = group(g, 0, 0.3, 0);
      box(0.18, 0.9, 0.18, mat('#f59e0b', { pattern: 'metal' }), 0, 0.45, 0, a);
      const b = group(a, 0, 0.9, 0);
      box(0.14, 0.14, 0.7, mat('#f59e0b', { pattern: 'metal' }), 0, 0, 0.3, b);
      box(0.12, 0.12, 0.12, glow('#fde68a', 4), 0, 0, 0.66, b);
      a.userData.spin = 0.6;
      break;
    }
    case 'conveyor':
      box(0.95, 0.35, 0.95, mat('#26262b', { pattern: 'grate' }), 0, 0.18, 0, g);
      box(0.4, 0.3, 0.4, mat('#8a6a4a', { pattern: 'panel' }), 0, 0.5, 0, g);
      break;
    case 'coil':
      box(0.5, 1.4, 0.5, mat('#3a2446', { pattern: 'metal' }), 0, 0.7, 0, g);
      for (let i = 0; i < 4; i++) box(0.62, 0.08, 0.62, glow(accent, 2), 0, 0.35 + i * 0.3, 0, g);
      break;
    case 'books':
      box(0.9, 1.8, 0.4, mat('#40506e', { pattern: 'panel' }), 0, 0.9, 0, g);
      for (let i = 0; i < 3; i++)
        box(0.8, 0.3, 0.1, glow(['#93c5fd', '#fde68a', '#c4b5fd'][i], 1.3), 0, 0.5 + i * 0.5, 0.18, g);
      break;
    case 'lamp':
      box(0.1, 1.6, 0.1, dark, 0, 0.8, 0, g);
      box(0.3, 0.2, 0.3, glow(accent, 2.6), 0, 1.65, 0, g);
      g.userData.light = { y: 1.6, color: accent, intensity: 3, distance: 5 };
      break;
    case 'plant':
      box(0.4, 0.35, 0.4, mat('#6b4f3a'), 0, 0.18, 0, g);
      box(0.5, 0.5, 0.5, mat('#3f8f4f', { pattern: 'grass' }), 0, 0.62, 0, g);
      box(0.3, 0.3, 0.3, mat('#4fae5f', { pattern: 'grass' }), 0.1, 0.95, 0.05, g);
      break;
    case 'tree':
      box(0.25, 1.4, 0.25, mat('#6b4f3a'), 0, 0.7, 0, g);
      box(1.1, 0.8, 1.1, mat('#2f8a47', { pattern: 'grass' }), 0, 1.6, 0, g);
      box(0.7, 0.5, 0.7, mat('#3fa55a', { pattern: 'grass' }), 0, 2.15, 0, g);
      box(0.1, 0.1, 0.1, glow('#fde68a', 3), 0.3, 1.9, 0.5, g);
      break;
    case 'bench':
      box(0.9, 0.1, 0.4, mat('#8a6a4a'), 0, 0.4, 0, g);
      box(0.08, 0.4, 0.35, dark, -0.38, 0.2, 0, g);
      box(0.08, 0.4, 0.35, dark, 0.38, 0.2, 0, g);
      break;
    case 'trophy-case':
      box(0.8, 1.6, 0.5, mat('#4a3b2a', { pattern: 'panel' }), 0, 0.8, 0, g);
      box(0.7, 1.3, 0.04, mat('#fde68a', { transparent: 0.25 }), 0, 0.85, 0.26, g);
      box(0.2, 0.3, 0.2, glow('#fbbf24', 1.6), 0, 0.9, 0.1, g);
      break;
    case 'antenna':
      box(0.12, 2.2, 0.12, metal, 0, 1.1, 0, g);
      box(0.6, 0.06, 0.06, metal, 0, 1.8, 0, g);
      box(0.12, 0.12, 0.12, glow('#f43f5e', 3), 0, 2.25, 0, g);
      g.userData.blink = true;
      break;
    case 'crystal':
      box(0.3, 0.9, 0.3, glow(accent, 1.6), 0, 0.45, 0, g).rotation.set(0.1, 0.4, 0.15);
      box(0.2, 0.5, 0.2, glow(accent, 1.2), 0.22, 0.25, 0.1, g).rotation.set(-0.2, 0.2, -0.3);
      break;
    case 'cable':
      box(0.9, 0.1, 0.14, dark, 0, 0.05, 0, g);
      box(0.14, 0.1, 0.9, dark, 0.2, 0.05, 0, g);
      box(0.06, 0.06, 0.06, glow(accent, 3), 0.2, 0.12, 0.3, g);
      break;
    case 'capacitor':
      for (const [x, z] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) {
        box(0.3, 1.0, 0.3, mat('#3b2a47', { pattern: 'metal' }), x, 0.5, z, g);
        box(0.32, 0.08, 0.32, glow(accent, 2), x, 1.02, z, g);
      }
      box(0.9, 0.12, 0.9, dark, 0, 0.06, 0, g);
      break;
    case 'conduit': {
      box(0.24, 0.24, 0.95, metal, 0, 0.5, 0, g);
      box(0.3, 0.3, 0.12, dark, 0, 0.5, -0.3, g);
      box(0.3, 0.3, 0.12, dark, 0, 0.5, 0.3, g);
      const pulse = box(0.1, 0.1, 0.96, glow(accent, 3), 0, 0.64, 0, g);
      pulse.userData.hover = true;
      box(0.1, 0.5, 0.1, dark, 0, 0.25, 0, g);
      break;
    }
    case 'globe': {
      box(0.12, 0.8, 0.12, dark, 0, 0.4, 0, g);
      box(0.5, 0.06, 0.5, metal, 0, 0.04, 0, g);
      const orb = group(g, 0, 1.15, 0);
      box(0.5, 0.5, 0.5, mat('#1d4ed8', { emissive: '#1d4ed8', intensity: 0.8 }), 0, 0, 0, orb);
      box(0.3, 0.2, 0.52, mat('#16a34a'), 0.08, 0.06, 0, orb);
      box(0.52, 0.12, 0.2, mat('#16a34a'), 0, -0.12, 0.1, orb);
      orb.userData.spin = 0.6;
      break;
    }
    case 'holoboard':
      box(0.1, 1.2, 0.1, dark, -0.4, 0.6, 0, g);
      box(0.1, 1.2, 0.1, dark, 0.4, 0.6, 0, g);
      box(0.9, 0.6, 0.04, mat(accent, { emissive: accent, intensity: 0.9, transparent: 0.5 }), 0, 1.0, 0, g);
      box(0.6, 0.04, 0.05, glow('#ffffff', 2), -0.05, 1.15, 0.01, g);
      box(0.4, 0.04, 0.05, glow('#ffffff', 1.5), -0.15, 1.0, 0.01, g);
      box(0.5, 0.04, 0.05, glow('#ffffff', 1.5), -0.1, 0.85, 0.01, g);
      break;
    case 'press': {
      box(0.9, 0.3, 0.9, mat('#3b3b40', { pattern: 'panel' }), 0, 0.15, 0, g);
      box(0.12, 1.6, 0.12, metal, -0.38, 0.8, -0.38, g);
      box(0.12, 1.6, 0.12, metal, 0.38, 0.8, -0.38, g);
      box(0.12, 1.6, 0.12, metal, -0.38, 0.8, 0.38, g);
      box(0.12, 1.6, 0.12, metal, 0.38, 0.8, 0.38, g);
      box(0.95, 0.15, 0.95, dark, 0, 1.6, 0, g);
      const ram = box(0.6, 0.3, 0.6, mat('#f59e0b', { pattern: 'metal' }), 0, 1.1, 0, g);
      ram.userData.hover = true;
      box(0.5, 0.06, 0.5, glow('#fb923c', 3), 0, 0.33, 0, g);
      break;
    }
    case 'robot-shell':
      box(0.7, 0.2, 0.7, dark, 0, 0.1, 0, g);
      box(0.1, 1.4, 0.1, metal, 0, 0.8, -0.3, g);
      box(0.5, 0.55, 0.35, mat('#8a93a6', { pattern: 'panel' }), 0, 0.95, 0, g);
      box(0.36, 0.3, 0.3, mat('#6b7280', { pattern: 'panel' }), 0, 1.4, 0, g);
      box(0.24, 0.06, 0.02, glow(accent, 2), 0, 1.42, 0.16, g);
      box(0.14, 0.4, 0.14, mat('#6b7280'), 0.34, 0.9, 0, g);
      box(0.06, 0.06, 0.3, glow('#fde68a', 2.5), -0.3, 0.9, 0.1, g);
      break;
    case 'chip':
      box(0.9, 0.18, 0.9, mat('#111827', { pattern: 'noise' }), 0, 0.09, 0, g);
      for (let i = -3; i <= 3; i++) {
        box(0.06, 0.04, 0.16, mat('#d1d5db', { metal: 0.8 }), i * 0.12, 0.04, 0.52, g);
        box(0.06, 0.04, 0.16, mat('#d1d5db', { metal: 0.8 }), i * 0.12, 0.04, -0.52, g);
      }
      box(0.3, 0.02, 0.3, glow(accent, 1.4), 0, 0.19, 0, g);
      box(0.08, 0.02, 0.08, mat('#e5e7eb'), -0.34, 0.19, -0.34, g);
      break;
    case 'resistor':
      box(0.08, 0.08, 1.0, mat('#d1d5db', { metal: 0.8 }), 0, 0.3, 0, g);
      box(0.3, 0.3, 0.55, mat('#d6b48a'), 0, 0.3, 0, g);
      for (const [z, c] of [[-0.18, '#dc2626'], [-0.06, '#7c3aed'], [0.06, '#f59e0b'], [0.18, '#fbbf24']] as const) box(0.32, 0.32, 0.05, mat(c), 0, 0.3, z, g);
      box(0.08, 0.3, 0.08, dark, 0, 0.1, 0.45, g);
      box(0.08, 0.3, 0.08, dark, 0, 0.1, -0.45, g);
      break;
    case 'banner':
      box(0.08, 2.0, 0.08, mat('#fbbf24', { metal: 0.6 }), 0, 1.0, 0, g);
      box(0.6, 0.06, 0.06, mat('#fbbf24', { metal: 0.6 }), 0.28, 1.95, 0, g);
      box(0.5, 1.0, 0.03, mat('#6d28d9'), 0.3, 1.4, 0, g);
      box(0.2, 0.2, 0.04, glow('#fbbf24', 2), 0.3, 1.5, 0.01, g);
      break;
    case 'cup':
      box(0.7, 0.6, 0.7, mat('#4a3b2a', { pattern: 'panel' }), 0, 0.3, 0, g);
      box(0.3, 0.1, 0.3, mat('#fbbf24', { metal: 0.8, rough: 0.2 }), 0, 0.65, 0, g);
      box(0.12, 0.2, 0.12, mat('#fbbf24', { metal: 0.8, rough: 0.2 }), 0, 0.8, 0, g);
      box(0.4, 0.35, 0.4, glow('#fbbf24', 1.6), 0, 1.05, 0, g);
      box(0.08, 0.2, 0.08, mat('#fbbf24', { metal: 0.8 }), -0.26, 1.08, 0, g);
      box(0.08, 0.2, 0.08, mat('#fbbf24', { metal: 0.8 }), 0.26, 1.08, 0, g);
      break;
    case 'planter':
      box(0.9, 0.4, 0.9, mat('#9fb7ad', { pattern: 'panel' }), 0, 0.2, 0, g);
      box(0.8, 0.1, 0.8, mat('#5b4332'), 0, 0.42, 0, g);
      for (let i = 0; i < 5; i++) box(0.14, 0.3 + (i % 3) * 0.12, 0.14, mat('#4fae5f', { pattern: 'grass' }), -0.3 + i * 0.15, 0.6, (i % 2) * 0.2 - 0.1, g);
      box(0.08, 0.08, 0.08, glow('#f472b6', 2), 0.1, 0.9, 0.1, g);
      break;
    case 'tent':
      box(0.9, 0.08, 0.9, mat('#b9a98a'), 0, 0.04, 0, g);
      box(0.8, 0.7, 0.8, mat('#e5e7eb', { transparent: 0.35 }), 0, 0.45, 0, g);
      box(0.9, 0.08, 0.9, mat('#34d399', { emissive: '#34d399', intensity: 0.6 }), 0, 0.85, 0, g);
      break;
    case 'fan': {
      box(0.9, 0.9, 0.3, mat('#1d2b22', { pattern: 'panel' }), 0, 0.45, 0, g);
      const blades = group(g, 0, 0.45, 0.18);
      box(0.7, 0.12, 0.04, mat('#4b5563'), 0, 0, 0, blades);
      box(0.12, 0.7, 0.04, mat('#4b5563'), 0, 0, 0, blades);
      blades.userData.dynamic = true;
      blades.userData.roll = 8;
      box(0.12, 0.12, 0.06, glow(accent, 2), 0, 0.45, 0.21, g);
      break;
    }
    case 'terminal-bank':
      box(0.95, 0.9, 0.5, mat('#15201a', { pattern: 'server', accent }), 0, 0.45, 0, g);
      box(0.8, 0.4, 0.04, glow(accent, 1.2), 0, 0.72, 0.26, g);
      box(0.9, 0.08, 0.3, dark, 0, 0.92, 0.1, g);
      break;
    case 'satellite': {
      box(0.5, 0.4, 0.5, metal, 0, 0.2, 0, g);
      const head = group(g, 0, 0.9, 0);
      box(0.12, 0.5, 0.12, dark, 0, -0.25, 0, head);
      box(0.9, 0.06, 0.9, mat('#d6d3e6', { pattern: 'panel', metal: 0.5 }), 0, 0.1, 0, head).rotation.x = -0.6;
      box(0.08, 0.08, 0.08, glow('#c4b5fd', 3), 0, 0.3, 0.2, head);
      head.userData.spin = 0.3;
      break;
    }
    case 'radar': {
      box(0.6, 0.5, 0.6, mat('#3d3a52', { pattern: 'panel' }), 0, 0.25, 0, g);
      box(0.5, 0.04, 0.5, glow('#4ade80', 0.6), 0, 0.52, 0, g);
      const sweep = box(0.24, 0.05, 0.03, glow('#4ade80', 3), 0.12, 0.55, 0, g);
      sweep.userData.spin = 3;
      break;
    }
    case 'holo-station': {
      box(0.7, 0.6, 0.7, mat('#3a3f50', { pattern: 'panel' }), 0, 0.3, 0, g);
      const holo = box(0.4, 0.4, 0.4, mat('#a78bfa', { emissive: '#a78bfa', intensity: 1.4, transparent: 0.5 }), 0, 1.0, 0, g);
      holo.userData.spin = 1;
      holo.userData.hover = true;
      break;
    }
  }
  return g;
}

// ── Interactables ────────────────────────────────────────────────────────────

/** Common "you can use me" glow ring shown under every interactable. */
export function interactRing(parent: THREE.Object3D, color = '#67e8f9', r = 0.75) {
  const m = ring(r, 0.04, glow(color, 2.2), parent);
  m.position.y = 0.04;
  m.userData.interactRing = true;
  return m;
}

export function buildConsole(accent: string) {
  const g = new THREE.Group();
  box(1.1, 0.8, 0.6, mat('#2b3040', { pattern: 'panel' }), 0, 0.4, 0, g);
  box(1.0, 0.1, 0.6, mat('#1a1d27'), 0, 0.85, 0.05, g).rotation.x = -0.3;
  const screen = group(g, 0, 1.35, -0.18);
  box(1.2, 0.8, 0.08, mat('#11141c'), 0, 0, 0, screen);
  box(1.06, 0.66, 0.02, glow(accent, 1.3), 0, 0, 0.05, screen);
  box(0.5, 0.06, 0.02, glow('#ffffff', 2), -0.2, 0.18, 0.065, screen);
  box(0.7, 0.04, 0.02, glow('#ffffff', 1.2), -0.1, 0.05, 0.065, screen);
  box(0.4, 0.04, 0.02, glow('#ffffff', 1.2), -0.25, -0.07, 0.065, screen);
  interactRing(g, accent, 0.9);
  g.userData.light = { y: 1.4, color: accent, intensity: 3, distance: 4.5 };
  return g;
}

export function buildTerminal(accent: string) {
  const g = new THREE.Group();
  box(0.36, 0.8, 0.36, mat('#262b38', { pattern: 'panel' }), 0, 0.4, 0, g);
  box(0.46, 0.08, 0.46, glow(accent, 1.4), 0, 0.82, 0, g);
  const holo = box(0.3, 0.3, 0.3, mat(accent, { emissive: accent, intensity: 1.6, transparent: 0.55 }), 0, 1.25, 0, g);
  holo.userData.spin = 1.2;
  holo.userData.hover = true;
  interactRing(g, accent, 0.6);
  return g;
}

/** Lore fragment dropped by a bot: a small spinning data shard over a glow disc. */
export function buildFragment(accent: string) {
  const g = new THREE.Group();
  const shard = group(g, 0, 0.55, 0);
  box(0.22, 0.3, 0.06, glow('#e0f2fe', 2.6), 0, 0, 0, shard);
  box(0.26, 0.05, 0.08, glow(accent, 3), 0, 0.1, 0, shard);
  shard.userData.spin = 2.4;
  shard.userData.hover = true;
  blobShadow(0.22, g);
  return g;
}

export function buildPartPickup(accent: string) {
  const g = new THREE.Group();
  blobShadow(0.3, g);
  const crate = group(g, 0, 0.45, 0);
  box(0.36, 0.36, 0.36, mat('#1e293b', { pattern: 'panel' }), 0, 0, 0, crate);
  box(0.38, 0.06, 0.38, glow(accent, 2.4), 0, 0, 0, crate);
  box(0.06, 0.38, 0.38, glow(accent, 1.4), 0, 0, 0, crate);
  crate.userData.spin = 1.5;
  crate.userData.hover = true;
  interactRing(g, accent, 0.5);
  g.userData.light = { y: 0.6, color: accent, intensity: 1.6, distance: 3 };
  return g;
}

export function buildAssembly(accent: string, wip: boolean) {
  const g = new THREE.Group();
  box(2.2, 0.3, 2.2, mat('#1b2330', { pattern: 'grate' }), 0, 0.15, 0, g);
  box(2.3, 0.06, 2.3, glow(accent, 1.4), 0, 0.3, 0, g);
  const r = ring(1.3, 0.03, glow(accent, 2), g);
  r.position.y = 0.34;
  r.userData.spin = 0.4;
  for (const [x, z] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    box(0.14, 1.4, 0.14, mat('#2b3345'), x, 0.7, z, g);
    box(0.16, 0.12, 0.16, glow(wip ? '#f59e0b' : accent, 2.4), x, 1.42, z, g);
  }
  if (wip) {
    // Hazard tape: case file incomplete.
    box(2.2, 0.12, 0.04, mat('#15151a', { pattern: 'hazard', accent: '#f59e0b' }), 0, 0.9, 1.05, g);
  }
  g.userData.light = { y: 1.8, color: accent, intensity: 4, distance: 6 };
  return g;
}

export function buildPlinth(accent: string) {
  const g = new THREE.Group();
  box(1.0, 0.8, 1.0, mat('#3a2f22', { pattern: 'panel' }), 0, 0.4, 0, g);
  box(1.06, 0.06, 1.06, glow(accent, 1.4), 0, 0.82, 0, g);
  interactRing(g, accent, 0.8);
  return g;
}

export function buildMatrix(accent: string) {
  const g = new THREE.Group();
  box(1.6, 0.3, 1.6, mat('#3a2f22', { pattern: 'panel' }), 0, 0.15, 0, g);
  const orb = group(g, 0, 1.8, 0);
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2 * 3.1;
    const y = (i / 40) * 2 - 1;
    const r = Math.sqrt(1 - y * y);
    box(0.1, 0.1, 0.1, glow(i % 5 ? accent : '#ffffff', 2.4), Math.cos(a) * r * 0.9, y * 0.9, Math.sin(a) * r * 0.9, orb);
  }
  orb.userData.spin = 0.35;
  interactRing(g, accent, 1.2);
  g.userData.light = { y: 1.8, color: accent, intensity: 5, distance: 7 };
  return g;
}

export function buildRepoRack(accent: string) {
  const g = new THREE.Group();
  box(0.9, 2.1, 0.8, mat('#15201a', { pattern: 'server', accent }), 0, 1.05, 0, g);
  box(0.7, 0.2, 0.02, glow(accent, 2), 0, 1.7, 0.41, g);
  interactRing(g, accent, 0.8);
  return g;
}

export function buildRelay(on: boolean) {
  const g = new THREE.Group();
  box(0.8, 0.4, 0.8, mat('#3d3a52', { pattern: 'panel' }), 0, 0.2, 0, g);
  box(0.3, 1.6, 0.3, mat('#5a5670', { pattern: 'metal' }), 0, 1.2, 0, g);
  const core = box(0.45, 0.45, 0.45, on ? glow('#a78bfa', 3) : mat('#2a2838'), 0, 2.1, 0, g);
  core.userData.core = true;
  core.userData.spin = on ? 1.4 : 0;
  interactRing(g, on ? '#a78bfa' : '#f59e0b', 0.8);
  return g;
}

export function buildDish() {
  const g = new THREE.Group();
  box(1.6, 0.6, 1.6, mat('#4a4660', { pattern: 'panel' }), 0, 0.3, 0, g);
  box(0.4, 1.8, 0.4, mat('#77738c', { pattern: 'metal' }), 0, 1.5, 0, g);
  const head = group(g, 0, 2.6, 0);
  const dishMat = mat('#d6d3e6', { pattern: 'panel', metal: 0.5 });
  for (let i = 0; i < 5; i++) {
    const r = 0.4 + i * 0.34;
    box(r * 2, 0.12, r * 2, dishMat, 0, i * 0.14, 0, head);
  }
  box(0.12, 1.0, 0.12, mat('#77738c'), 0, 0.9, 0, head);
  const emitter = box(0.26, 0.26, 0.26, glow('#c4b5fd', 3), 0, 1.45, 0, head);
  emitter.userData.emitter = true;
  head.rotation.x = -0.9;
  head.userData.dynamic = true;
  g.userData.head = head;
  return g;
}

export function buildTransmitter(active: boolean) {
  const g = buildConsole(active ? '#a78bfa' : '#475569');
  return g;
}

export function buildExitPad(color: string) {
  const g = new THREE.Group();
  box(1.6, 0.14, 1.6, mat('#232838', { pattern: 'panel' }), 0, 0.07, 0, g);
  const r1 = ring(0.7, 0.05, glow(color, 2.4), g);
  r1.position.y = 0.16;
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.7, 2.4, 12, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }),
  );
  beam.position.y = 1.3;
  g.add(beam);
  g.userData.beam = beam;
  g.userData.light = { y: 0.8, color, intensity: 3, distance: 4 };
  return g;
}

export function buildStarMap() {
  const g = new THREE.Group();
  box(2.6, 0.9, 2.0, mat('#3a3f50', { pattern: 'panel' }), 0, 0.45, 0, g);
  box(2.4, 0.06, 1.8, glow('#312e81', 1.2), 0, 0.92, 0, g);
  const holo = group(g, 0, 1.5, 0);
  const cols = ['#c026d3', '#60a5fa', '#f59e0b', '#22d3ee', '#fbbf24', '#34d399', '#4ade80', '#a78bfa'];
  cols.forEach((c, i) => {
    const a = (i / cols.length) * Math.PI * 2;
    box(0.22, 0.12, 0.22, glow(c, 2.4), Math.cos(a) * 0.8, Math.sin(i) * 0.1, Math.sin(a) * 0.55, holo);
  });
  box(0.3, 0.3, 0.3, glow('#e0e7ff', 2), 0, 0, 0, holo);
  holo.userData.spin = 0.3;
  interactRing(g, '#a78bfa', 1.6);
  g.userData.light = { y: 1.6, color: '#a78bfa', intensity: 5, distance: 7 };
  return g;
}

export function buildBunk() {
  const g = new THREE.Group();
  box(1.2, 0.4, 2.0, mat('#3f4556'), 0, 0.2, 0, g);
  box(1.1, 0.16, 1.8, mat('#6d28d9'), 0, 0.46, 0.05, g);
  box(0.8, 0.14, 0.4, mat('#e5e7eb'), 0, 0.6, -0.7, g);
  box(0.9, 0.5, 0.5, mat('#2b3040'), 1.1, 0.25, -0.6, g); // desk
  box(0.3, 0.02, 0.4, mat('#f8fafc'), 1.1, 0.51, -0.6, g); // résumé on desk
  box(0.18, 0.02, 0.02, mat('#6d28d9'), 1.1, 0.53, -0.7, g);
  interactRing(g, '#a78bfa', 1.1);
  return g;
}

export function buildCatBed() {
  const g = new THREE.Group();
  box(0.9, 0.16, 0.9, mat('#7c3aed'), 0, 0.08, 0, g);
  box(0.7, 0.1, 0.7, mat('#ddd6fe'), 0, 0.16, 0, g);
  return g;
}

export function buildLocker() {
  const g = new THREE.Group();
  box(1.4, 2.0, 0.7, mat('#4a5063', { pattern: 'panel' }), 0, 1.0, 0, g);
  box(0.04, 1.8, 0.02, mat('#1f2330'), 0, 1.0, 0.36, g);
  box(0.3, 0.08, 0.02, glow('#22d3ee', 2), -0.3, 1.4, 0.36, g);
  box(0.3, 0.08, 0.02, glow('#22d3ee', 2), 0.3, 1.4, 0.36, g);
  interactRing(g, '#22d3ee', 1);
  return g;
}

export function buildVendor() {
  const g = new THREE.Group();
  box(1.4, 1.0, 1.0, mat('#3a3f50', { pattern: 'panel' }), 0, 0.5, 0, g);
  box(1.5, 0.12, 1.1, mat('#15151a', { pattern: 'hazard', accent: '#f59e0b' }), 0, 2.1, 0, g);
  box(0.1, 1.1, 0.1, mat('#2b3040'), -0.65, 1.55, 0.45, g);
  box(0.1, 1.1, 0.1, mat('#2b3040'), 0.65, 1.55, 0.45, g);
  box(0.9, 0.3, 0.04, glow('#f59e0b', 1.6), 0, 1.3, 0.5, g); // CLOSED sign
  interactRing(g, '#f59e0b', 1);
  return g;
}

export function buildEarth() {
  const g = new THREE.Group();
  const earth = new THREE.Mesh(
    new THREE.IcosahedronGeometry(9, 2),
    new THREE.MeshStandardMaterial({ color: '#2563eb', emissive: '#1d4ed8', emissiveIntensity: 0.5, flatShading: true, roughness: 0.9 }),
  );
  g.add(earth);
  const land = new THREE.Mesh(
    new THREE.IcosahedronGeometry(9.1, 1),
    new THREE.MeshStandardMaterial({ color: '#16a34a', emissive: '#14532d', emissiveIntensity: 0.4, flatShading: true, transparent: true, opacity: 0.55 }),
  );
  g.add(land);
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(9.8, 24, 16),
    new THREE.MeshBasicMaterial({ color: '#93c5fd', transparent: true, opacity: 0.12, depthWrite: false }),
  );
  g.add(atmo);
  g.userData.spin = 0.02;
  return g;
}

/** Biome centrepiece in each mission's entry room. */
export function buildCenterpiece(biome: Biome): THREE.Group {
  const g = new THREE.Group();
  const c = biome.light;
  switch (biome.id) {
    case 'core-reactor': {
      box(1.8, 0.4, 1.8, mat('#2f2138', { pattern: 'panel' }), 0, 0.2, 0, g);
      const core = group(g, 0, 1.6, 0);
      box(0.9, 1.6, 0.9, glow(c, 2.6), 0, 0, 0, core);
      for (let i = 0; i < 3; i++) box(1.3, 0.12, 1.3, mat('#3b2a47', { pattern: 'metal' }), 0, -0.6 + i * 0.6, 0, core);
      core.userData.spin = 0.5;
      break;
    }
    case 'academy-spires':
      box(1.2, 0.3, 1.2, mat('#aebcd6', { pattern: 'tile' }), 0, 0.15, 0, g);
      box(0.6, 2.6, 0.6, mat('#c8d3e6', { pattern: 'stone' }), 0, 1.6, 0, g);
      box(0.3, 0.6, 0.3, glow(c, 2.4), 0, 3.2, 0, g);
      break;
    case 'robot-forge':
      box(1.8, 1.6, 1.4, mat('#4a2f25', { pattern: 'panel' }), 0, 0.8, 0, g);
      box(1.0, 0.6, 0.04, glow('#f97316', 3), 0, 0.7, 0.71, g);
      box(0.4, 1.2, 0.4, mat('#3a2a22'), 0.5, 2.2, -0.2, g);
      break;
    case 'circuit-caverns':
      for (let i = 0; i < 5; i++)
        box(0.3 + (i % 2) * 0.2, 0.8 + i * 0.3, 0.3, glow(c, 1.6), Math.cos(i * 1.3) * 0.5, 0.4 + i * 0.15, Math.sin(i * 1.3) * 0.5, g).rotation.set(0.2 * i, i, 0.1);
      break;
    case 'trophy-hall':
      box(1.2, 0.8, 1.2, mat('#4a3b2a', { pattern: 'panel' }), 0, 0.4, 0, g);
      box(0.5, 0.5, 0.5, glow('#fbbf24', 2), 0, 1.1, 0, g);
      box(0.9, 0.2, 0.2, glow('#fbbf24', 2), 0, 1.3, 0, g);
      box(0.3, 0.3, 0.3, glow('#fde68a', 2), 0, 1.55, 0, g);
      break;
    case 'colony-commons':
      box(0.4, 2, 0.4, mat('#6b4f3a'), 0, 1, 0, g);
      box(2.0, 1.2, 2.0, mat('#2f8a47', { pattern: 'grass' }), 0, 2.4, 0, g);
      box(1.2, 0.8, 1.2, mat('#3fa55a', { pattern: 'grass' }), 0, 3.3, 0, g);
      for (let i = 0; i < 5; i++) box(0.1, 0.1, 0.1, glow('#fde68a', 3), Math.cos(i) * 0.9, 2.0 + (i % 3) * 0.5, Math.sin(i) * 0.9, g);
      break;
    case 'mainframe': {
      box(1.6, 3, 1.6, mat('#15201a', { pattern: 'server', accent: c }), 0, 1.5, 0, g);
      const r = ring(1.2, 0.04, glow(c, 2.4), g);
      r.position.y = 1.5;
      r.userData.spin = 1;
      break;
    }
    case 'comms-array':
      box(0.3, 2.6, 0.3, mat('#77738c', { pattern: 'metal' }), 0, 1.3, 0, g);
      box(1.2, 0.08, 0.08, mat('#77738c'), 0, 2.2, 0, g);
      box(0.2, 0.2, 0.2, glow('#f43f5e', 3), 0, 2.7, 0, g);
      break;
    default:
      box(1, 1, 1, glow(c, 1.5), 0, 0.5, 0, g);
  }
  g.userData.light = { y: 2, color: c, intensity: 6, distance: 9 };
  return g;
}

/** Floor "lit" markers for the contribution grid. */
export function contributionTile(level: number, color: string) {
  const m = box(0.86, 0.06, 0.86, level ? glow(color, 0.4 + level * 0.6) : mat('#0f1c13'), 0, 0.03, 0);
  return m;
}

export { disc };

/** Puzzle node: capacitor (sequence), rotating junction (rotate) or bit switch (pattern). */
export function buildPuzzleNode(type: 'sequence' | 'rotate' | 'pattern', accent: string, index: number) {
  const g = new THREE.Group();
  box(0.8, 0.5, 0.8, mat('#2b3040', { pattern: 'panel' }), 0, 0.25, 0, g);
  const head = group(g, 0, 0.55, 0);
  head.userData.dynamic = true;
  if (type === 'sequence') {
    box(0.4, 0.9, 0.4, mat('#3b2a47', { pattern: 'metal' }), 0, 0.45, 0, head);
    for (let i = 0; i < 3; i++) box(0.5, 0.06, 0.5, glow(accent, 1.4), 0, 0.2 + i * 0.3, 0, head);
  } else if (type === 'rotate') {
    box(0.64, 0.08, 0.64, mat('#15202a', { pattern: 'circuit', accent }), 0, 0.04, 0, head);
    box(0.14, 0.1, 0.5, glow(accent, 2.2), 0, 0.12, -0.14, head); // arrow shaft (points −z at state 0)
    box(0.34, 0.1, 0.12, glow(accent, 2.2), 0, 0.12, -0.36, head); // arrow head
  } else {
    box(0.3, 0.5, 0.2, mat('#1d2b22', { pattern: 'server', accent }), 0, 0.25, 0, head);
  }
  const lamp = box(0.2, 0.2, 0.2, glow('#f59e0b', 1.2), 0, type === 'sequence' ? 1.15 : 0.75, 0, head);
  lamp.userData.dynamic = true;
  g.userData.head = head;
  g.userData.lamp = lamp;
  g.userData.index = index;
  interactRing(g, accent, 0.6);
  return g;
}

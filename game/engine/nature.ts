import * as THREE from 'three';
import { blobShadow, box, glow, group, mat } from './voxels.ts';

/** Planet Aurora art: nature decor, section monuments and nature-puzzle pieces (voxel style). */

const leaf = (c: string) => mat(c, { pattern: 'grass' });
const bark = (c = '#6b4a2b') => mat(c, { pattern: 'metal' });
const stone = (c: string) => mat(c, { pattern: 'stone' });
/** Natural rock: mottled, not bricked. */
const rockM = (c: string) => mat(c, { pattern: 'noise' });

/** Canopy made of stacked, offset leaf blocks so it reads round-ish rather than cubic. */
function canopy(g: THREE.Object3D, y: number, r: number, c: string, c2: string) {
  box(r * 2, r * 0.9, r * 2, leaf(c), 0, y, 0, g);
  box(r * 1.5, r * 0.7, r * 1.5, leaf(c2), 0, y + r * 0.7, 0, g);
  box(r * 2.3, r * 0.5, r * 1.3, leaf(c), 0, y - r * 0.2, 0, g);
  box(r * 1.3, r * 0.5, r * 2.3, leaf(c2), 0, y - r * 0.1, 0, g);
}

export function buildDecor(kind: string, s = 1): THREE.Group {
  const g = new THREE.Group();
  switch (kind) {
    case 'oak':
      box(0.34, 1.4, 0.34, bark(), 0, 0.7, 0, g);
      box(0.5, 0.12, 0.12, bark(), 0.2, 1.1, 0, g).rotation.z = 0.5;
      canopy(g, 1.9, 0.75, '#3f8f35', '#4ea43f');
      break;
    case 'flowers':
      for (const [x, z, c] of [
        [-0.2, 0.1, '#f472b6'],
        [0.15, -0.15, '#fde047'],
        [0.25, 0.25, '#a78bfa'],
        [-0.1, -0.3, '#fb7185'],
      ] as const) {
        box(0.04, 0.2, 0.04, leaf('#3f7a2e'), x, 0.1, z, g);
        box(0.12, 0.08, 0.12, mat(c), x, 0.22, z, g);
      }
      break;
    case 'bush':
      box(0.8, 0.5, 0.7, leaf('#3b7d31'), 0, 0.25, 0, g);
      box(0.5, 0.3, 0.5, leaf('#4a9a3c'), 0.1, 0.55, 0.05, g);
      break;
    case 'rock':
    case 'mossrock':
    case 'snowrock':
    case 'basaltrock': {
      const c = kind === 'basaltrock' ? '#2a2525' : kind === 'snowrock' ? '#8d99a6' : '#7a7c80';
      box(0.9, 0.5, 0.8, rockM(c), 0, 0.25, 0, g);
      box(0.6, 0.35, 0.55, rockM(c), 0.15, 0.62, -0.05, g);
      box(0.4, 0.3, 0.45, rockM(c), -0.25, 0.4, 0.2, g);
      if (kind === 'mossrock') box(0.92, 0.1, 0.82, leaf('#4e7a3a'), 0, 0.57, 0, g);
      if (kind === 'snowrock') box(0.6, 0.1, 0.55, mat('#f1f5f9'), 0.15, 0.9, -0.05, g);
      break;
    }
    case 'supertree': {
      // Gardens-by-the-Bay supertree: a ribbed trunk flaring into a glowing canopy ring.
      box(0.6, 0.3, 0.6, stone('#5b4f45'), 0, 0.15, 0, g);
      for (let k = 0; k < 6; k++) box(0.4 + k * 0.04, 0.7, 0.4 + k * 0.04, mat(k % 2 ? '#5f6b3a' : '#4f5b30', { pattern: 'grass' }), 0, 0.6 + k * 0.7, 0, g);
      const crown = group(g, 0, 4.6, 0);
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        const arm = box(0.12, 0.12, 1.3, mat('#7a5a8c'), Math.cos(a) * 0.65, 0, Math.sin(a) * 0.65, crown);
        arm.rotation.y = -a + Math.PI / 2;
        arm.rotation.x = -0.35;
        box(0.18, 0.12, 0.18, glow(k % 2 ? '#c084fc' : '#f0abfc', 1.1), Math.cos(a) * 1.3, 0.35, Math.sin(a) * 1.3, crown);
      }
      box(0.7, 0.2, 0.7, mat('#6b5a7c'), 0, 0, 0, crown);
      break;
    }
    case 'orchid':
      for (const [x, z] of [
        [-0.15, 0],
        [0.18, 0.12],
      ]) {
        box(0.04, 0.34, 0.04, leaf('#3f7a2e'), x, 0.17, z, g);
        box(0.18, 0.1, 0.06, mat('#e879f9'), x, 0.36, z, g);
        box(0.06, 0.1, 0.18, mat('#f5d0fe'), x, 0.36, z, g);
      }
      box(0.4, 0.06, 0.3, leaf('#2f6d34'), 0, 0.03, 0, g);
      break;
    case 'hedge':
      box(0.95, 0.9, 0.95, leaf('#2f7a3a'), 0, 0.45, 0, g);
      box(0.8, 0.2, 0.8, leaf('#3d8f47'), 0, 1.0, 0, g);
      break;
    case 'lamp':
      box(0.1, 1.4, 0.1, mat('#2d3a2d'), 0, 0.7, 0, g);
      box(0.24, 0.24, 0.24, glow('#fef3c7', 1.3), 0, 1.5, 0, g);
      break;
    case 'pillar':
      box(0.7, 0.2, 0.7, stone('#6d7076'), 0, 0.1, 0, g);
      box(0.5, 1.8 * s, 0.5, stone('#8a8d93'), 0, 0.2 + 0.9 * s, 0, g);
      box(0.7, 0.2, 0.7, stone('#6d7076'), 0, 0.3 + 1.8 * s, 0, g);
      box(0.52, 0.3, 0.52, leaf('#4e7a3a'), 0, 0.6, 0, g);
      break;
    case 'crystal':
    case 'icecrystal': {
      const c = kind === 'crystal' ? '#a78bfa' : '#bae6fd';
      const a = box(0.3, 1.1, 0.3, mat(c, { emissive: c, intensity: 0.5, transparent: 0.85 }), 0, 0.55, 0, g);
      a.rotation.set(0.12, 0.4, 0.18);
      const b = box(0.2, 0.6, 0.2, mat(c, { emissive: c, intensity: 0.4, transparent: 0.85 }), 0.25, 0.3, 0.1, g);
      b.rotation.set(-0.2, 0.2, -0.35);
      break;
    }
    case 'lantern': {
      const l = group(g, 0, 1.4, 0);
      box(0.22, 0.28, 0.22, mat('#fbbf24', { emissive: '#f59e0b', intensity: 0.9, transparent: 0.9 }), 0, 0, 0, l);
      box(0.26, 0.04, 0.26, mat('#78350f'), 0, 0.16, 0, l);
      l.userData.hover = true;
      break;
    }
    case 'palm':
      for (let k = 0; k < 6; k++) box(0.24, 0.45, 0.24, bark('#8a6a3a'), k * 0.06, 0.22 + k * 0.42, 0, g);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        const f = box(0.16, 0.06, 1.1, leaf('#3f9a3c'), 0.35 + Math.cos(a) * 0.45, 2.6, Math.sin(a) * 0.45, g);
        f.rotation.y = -a + Math.PI / 2;
        f.rotation.x = 0.35;
      }
      break;
    case 'coral':
      for (const [x, z, h, c] of [
        [0, 0, 0.5, '#fb7185'],
        [0.2, 0.15, 0.35, '#f97316'],
        [-0.2, 0.1, 0.4, '#f472b6'],
      ] as const)
        box(0.12, h, 0.12, mat(c), x, h / 2, z, g);
      break;
    case 'shell':
      box(0.3, 0.1, 0.24, mat('#fde6d6'), 0, 0.05, 0, g);
      box(0.2, 0.08, 0.16, mat('#fbcfe8'), 0, 0.12, 0, g);
      break;
    case 'deadtree':
      box(0.26, 1.6, 0.26, bark('#2a211c'), 0, 0.8, 0, g);
      box(0.6, 0.1, 0.1, bark('#2a211c'), 0.25, 1.2, 0, g).rotation.z = 0.6;
      box(0.1, 0.1, 0.5, bark('#2a211c'), 0, 1.45, 0.2, g).rotation.x = -0.6;
      break;
    case 'vent':
      box(0.7, 0.2, 0.7, stone('#1c1818'), 0, 0.1, 0, g);
      box(0.3, 0.06, 0.3, glow('#fb923c', 1.4), 0, 0.22, 0, g);
      break;
    case 'cactus':
      box(0.3, 1.3, 0.3, leaf('#3f8a4a'), 0, 0.65, 0, g);
      box(0.22, 0.5, 0.2, leaf('#468f52'), 0.3, 0.9, 0, g);
      box(0.2, 0.14, 0.2, leaf('#468f52'), 0.2, 0.7, 0, g);
      box(0.2, 0.4, 0.2, leaf('#468f52'), -0.27, 0.7, 0, g);
      box(0.1, 0.1, 0.1, mat('#f472b6'), 0, 1.35, 0, g);
      break;
    case 'mesarock':
      box(0.9, 0.7, 0.8, rockM('#a4552e'), 0, 0.35, 0, g);
      box(0.6, 0.4, 0.6, rockM('#b8663a'), -0.1, 0.9, 0.05, g);
      break;
    case 'drybush':
      for (let k = 0; k < 4; k++) box(0.05, 0.4, 0.05, bark('#8a6a3a'), Math.cos(k * 1.6) * 0.15, 0.2, Math.sin(k * 1.6) * 0.15, g).rotation.z = 0.4 * (k % 2 ? 1 : -1);
      break;
    case 'jungletree':
      box(0.4, 2.4, 0.4, bark('#3a2a1c'), 0, 1.2, 0, g);
      for (let k = 0; k < 3; k++) box(0.08, 1.2, 0.08, leaf('#1f6a4a'), 0.22, 0.6 + k * 0.5, 0.1, g);
      canopy(g, 2.7, 0.9, '#155e4a', '#1a7a5c');
      box(0.12, 0.12, 0.12, glow('#5eead4', 1.4), 0.6, 2.3, 0.4, g);
      box(0.12, 0.12, 0.12, glow('#a7f3d0', 1.4), -0.5, 2.5, -0.3, g);
      break;
    case 'mushroom': {
      const c = ['#2dd4bf', '#818cf8', '#f472b6'][Math.floor(s * 10) % 3];
      box(0.12, 0.4, 0.12, mat('#e2e8f0'), 0, 0.2, 0, g);
      box(0.46, 0.14, 0.46, glow(c, 1.2), 0, 0.44, 0, g);
      box(0.3, 0.08, 0.3, glow(c, 1.5), 0, 0.54, 0, g);
      break;
    }
    case 'fern':
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        const f = box(0.1, 0.05, 0.7, leaf('#1f7a52'), Math.cos(a) * 0.25, 0.25, Math.sin(a) * 0.25, g);
        f.rotation.y = -a + Math.PI / 2;
        f.rotation.x = -0.5;
      }
      break;
    case 'pine':
      box(0.28, 0.8, 0.28, bark('#4a3524'), 0, 0.4, 0, g);
      for (let k = 0; k < 4; k++) {
        const w = 1.4 - k * 0.32;
        box(w, 0.45, w, leaf('#1f5a3a'), 0, 0.9 + k * 0.45, 0, g);
        box(w * 0.85, 0.1, w * 0.85, mat('#f1f5f9'), 0, 1.14 + k * 0.45, 0, g);
      }
      break;
  }
  g.scale.setScalar(s);
  return g;
}

// ── Section monuments ────────────────────────────────────────────────────────

export function buildMonument(section: string, accent: string): THREE.Group {
  const g = new THREE.Group();
  blobShadow(1.6, g);
  switch (section) {
    case 'about': {
      // Obelisk with a floating crystal portrait and a flower ring.
      box(2.2, 0.3, 2.2, stone('#8a8d93'), 0, 0.15, 0, g);
      box(0.8, 3.2, 0.8, stone('#c7c9cf'), 0, 1.9, 0, g);
      box(0.5, 0.5, 0.5, stone('#c7c9cf'), 0, 3.7, 0, g);
      const gem = box(0.5, 0.5, 0.5, mat(accent, { emissive: accent, intensity: 1, transparent: 0.85 }), 0, 4.5, 0, g);
      gem.rotation.set(Math.PI / 4, 0, Math.PI / 4);
      gem.userData.spin = 0.8;
      gem.userData.hover = true;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        const f = buildDecor('flowers', 0.9);
        f.position.set(Math.cos(a) * 1.3, 0.3, Math.sin(a) * 1.3);
        g.add(f);
      }
      break;
    }
    case 'contact': {
      // Comms beacon: dish on a mast.
      box(1.4, 0.3, 1.4, stone('#6d7076'), 0, 0.15, 0, g);
      box(0.3, 2.4, 0.3, mat('#cbd5e1', { pattern: 'metal' }), 0, 1.5, 0, g);
      const dish = group(g, 0, 2.8, 0);
      box(1.4, 0.12, 1.4, mat('#e2e8f0', { pattern: 'plate' }), 0, 0, 0, dish).rotation.x = -0.6;
      box(0.12, 0.6, 0.12, mat('#94a3b8'), 0, 0.3, 0.2, dish);
      box(0.16, 0.16, 0.16, glow(accent, 1.8), 0, 0.62, 0.3, dish);
      dish.userData.spin = 0.4;
      break;
    }
    case 'education':
      box(3, 0.3, 3, mat('#c9d3c2', { pattern: 'tile' }), 0, 0.15, 0, g);
      for (const [x, z] of [
        [-0.9, -0.9],
        [0.9, -0.6],
        [0, 0.9],
      ]) {
        const t = buildDecor('supertree', 0.55);
        t.position.set(x, 0.3, z);
        g.add(t);
      }
      break;
    case 'experience': {
      // Crater forge: anvil, glowing hearth and four banners (one per internship).
      box(3, 0.3, 3, stone('#2f2a2a'), 0, 0.15, 0, g);
      box(1.2, 0.6, 1.2, stone('#1c1818'), 0, 0.6, 0, g);
      box(0.9, 0.12, 0.9, glow('#fb923c', 1.6), 0, 0.92, 0, g);
      box(0.9, 0.4, 0.4, mat('#3b3f4a', { pattern: 'metal' }), 0, 1.2, -0.9, g);
      box(1.1, 0.14, 0.5, mat('#4b5563', { pattern: 'metal' }), 0, 1.47, -0.9, g);
      for (const [x, c] of [
        [-1.3, '#f59e0b'],
        [-0.45, '#60a5fa'],
        [0.45, '#34d399'],
        [1.3, '#f472b6'],
      ] as const) {
        box(0.08, 2.4, 0.08, mat('#2a211c'), x, 1.5, 1.3, g);
        box(0.55, 0.9, 0.04, mat(c, { pattern: 'plate' }), x + 0.3, 2.2, 1.3, g);
      }
      break;
    }
    case 'projects': {
      // The great glow-flower, petals open around six seed pods.
      box(3, 0.2, 3, leaf('#155e4a'), 0, 0.1, 0, g);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        const p = box(0.7, 0.1, 1.6, mat('#0f766e', { emissive: '#2dd4bf', intensity: 0.35 }), Math.cos(a) * 1.0, 0.45, Math.sin(a) * 1.0, g);
        p.rotation.y = -a + Math.PI / 2;
        p.rotation.x = 0.5;
        const pod = box(0.28, 0.36, 0.28, glow(['#5eead4', '#a7f3d0', '#67e8f9'][k % 3], 1.2), Math.cos(a) * 0.55, 0.55, Math.sin(a) * 0.55, g);
        pod.userData.hover = true;
      }
      box(0.5, 1.2, 0.5, leaf('#1a7a5c'), 0, 0.6, 0, g);
      box(0.4, 0.4, 0.4, glow('#fde68a', 1.4), 0, 1.4, 0, g);
      break;
    }
    case 'trophies': {
      // Ruined shrine with a great floating crystal over a pedestal.
      box(3, 0.3, 3, stone('#7b7f86'), 0, 0.15, 0, g);
      box(1, 1, 1, stone('#8a8d93'), 0, 0.8, 0, g);
      for (const [x, z] of [
        [-1.2, -1.2],
        [1.2, -1.2],
        [-1.2, 1.2],
        [1.2, 1.2],
      ]) {
        box(0.4, 2 + Math.abs(x) * 0.3, 0.4, stone('#9a9da3'), x, 1.2, z, g);
        box(0.18, 0.4, 0.18, mat('#a78bfa', { emissive: '#a78bfa', intensity: 0.6, transparent: 0.85 }), x, 2.6, z, g);
      }
      const c = box(0.6, 1.3, 0.6, mat('#c4b5fd', { emissive: '#8b5cf6', intensity: 0.8, transparent: 0.85 }), 0, 2.4, 0, g);
      c.rotation.set(0.2, 0.3, 0.1);
      c.userData.spin = 0.4;
      c.userData.hover = true;
      break;
    }
    case 'leadership': {
      // Lighthouse on the point.
      box(2.4, 0.4, 2.4, stone('#6d7076'), 0, 0.2, 0, g);
      for (let k = 0; k < 6; k++) box(1.2 - k * 0.08, 0.7, 1.2 - k * 0.08, mat(k % 2 ? '#ef4444' : '#f8fafc', { pattern: 'plate' }), 0, 0.75 + k * 0.7, 0, g);
      box(1.0, 0.7, 1.0, mat('#1e293b'), 0, 5.0, 0, g);
      box(0.6, 0.5, 0.6, glow('#fde68a', 1.8), 0, 5.0, 0, g);
      box(1.2, 0.2, 1.2, mat('#334155'), 0, 5.45, 0, g);
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.3, 7),
        new THREE.MeshBasicMaterial({ color: '#fef3c7', transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      beam.position.set(0, 5, 3.6);
      const pivot = group(g, 0, 0, 0);
      pivot.add(beam);
      pivot.userData.spin = 0.5;
      break;
    }
    case 'github': {
      // Ice cave arch with a frozen server obelisk inside.
      box(3, 0.3, 3, mat('#dde6f0'), 0, 0.15, 0, g);
      for (const x of [-1.2, 1.2]) box(0.6, 2.2, 1.6, mat('#a5d8ff', { pattern: 'hex', accent: '#e0f2fe' }), x, 1.4, -0.4, g);
      box(3, 0.6, 1.6, mat('#bae6fd', { pattern: 'hex', accent: '#e0f2fe' }), 0, 2.8, -0.4, g);
      box(0.7, 1.8, 0.5, mat('#0f1a14', { pattern: 'server', accent: '#4ade80' }), 0, 1.2, -0.5, g);
      box(0.9, 2, 0.7, mat('#bae6fd', { emissive: '#7dd3fc', intensity: 0.3, transparent: 0.45 }), 0, 1.2, -0.5, g);
      break;
    }
    case 'hobbies': {
      // Sky-island hangout: skate ramp, punching bag, cat tree and a travel signpost.
      box(3.2, 0.2, 3.2, leaf('#6cc24a'), 0, 0.1, 0, g);
      const ramp = box(1.2, 0.12, 0.9, mat('#8a5a2b', { pattern: 'panel' }), -0.9, 0.45, -0.9, g);
      ramp.rotation.z = 0.5;
      box(0.8, 0.08, 0.22, mat('#ef4444'), -0.9, 0.25, 0.1, g); // skateboard
      for (const x of [-1.2, -0.6]) box(0.06, 0.06, 0.06, mat('#fde047'), x, 0.2, 0.1, g);
      box(0.08, 2, 0.08, mat('#374151'), 1, 1.1, -1, g);
      box(0.6, 0.1, 0.08, mat('#374151'), 0.8, 2.05, -1, g);
      box(0.4, 0.9, 0.4, mat('#b91c1c', { pattern: 'plate' }), 0.6, 1.3, -1, g); // punching bag
      box(0.9, 0.12, 0.9, mat('#d6c3a0'), 1, 0.4, 0.9, g); // cat tree
      box(0.2, 1.1, 0.2, mat('#c9a57a', { pattern: 'grass' }), 1, 0.9, 0.9, g);
      box(0.8, 0.12, 0.8, mat('#d6c3a0'), 1, 1.5, 0.9, g);
      box(0.08, 1.6, 0.08, bark(), -1.2, 0.9, 1.1, g); // signpost
      box(0.7, 0.18, 0.06, mat('#fde68a'), -0.95, 1.4, 1.1, g);
      box(0.7, 0.18, 0.06, mat('#fca5a5'), -1.4, 1.1, 1.1, g);
      break;
    }
    case 'future': {
      // Observatory dome with a telescope pointed at the sky.
      box(3, 0.4, 3, stone('#b8663a'), 0, 0.2, 0, g);
      box(2.2, 1.2, 2.2, mat('#e7e5e4', { pattern: 'plate' }), 0, 1.0, 0, g);
      box(1.8, 0.6, 1.8, mat('#d6d3d1', { pattern: 'plate' }), 0, 1.9, 0, g);
      box(1.1, 0.4, 1.1, mat('#d6d3d1', { pattern: 'plate' }), 0, 2.4, 0, g);
      const scope = group(g, 0, 2.5, 0);
      const t = box(0.3, 0.3, 1.6, mat('#475569', { pattern: 'metal' }), 0, 0.3, 0.4, scope);
      t.rotation.x = -0.7;
      box(0.2, 0.2, 0.05, glow(accent, 1.4), 0, 0.85, 0.95, scope);
      scope.userData.spin = 0.15;
      break;
    }
  }
  return g;
}

// ── Nature-puzzle pieces and gates ───────────────────────────────────────────

const PIECE_COLOURS = ['#a78bfa', '#2dd4bf', '#fbbf24', '#fb7185', '#60a5fa'];
export const runeColour = (i: number) => PIECE_COLOURS[i % PIECE_COLOURS.length];

/** A puzzle piece; `userData.lamp` shows its state, `userData.head` rotates (mirrors). */
export function buildPiece(kind: string, index: number): THREE.Group {
  const g = new THREE.Group();
  switch (kind) {
    case 'runestone': {
      box(0.7, 1.2, 0.5, stone('#6d7076'), 0, 0.6, 0, g);
      g.userData.lamp = box(0.3, 0.3, 0.04, glow(runeColour(index), 0.6), 0, 0.8, 0.27, g);
      break;
    }
    case 'sprout':
      box(0.6, 0.2, 0.6, mat('#5b4330', { pattern: 'stone' }), 0, 0.1, 0, g);
      g.userData.lamp = box(0.12, 0.3, 0.12, leaf('#65a30d'), 0, 0.35, 0, g);
      break;
    case 'lever': {
      box(0.6, 0.5, 0.4, stone('#2f2a2a'), 0, 0.25, 0, g);
      const h = group(g, 0, 0.5, 0);
      box(0.08, 0.6, 0.08, mat('#9ca3af'), 0, 0.3, 0, h);
      box(0.14, 0.14, 0.14, mat('#ef4444'), 0, 0.62, 0, h);
      h.rotation.x = -0.6;
      g.userData.head = h;
      g.userData.lamp = box(0.12, 0.08, 0.12, glow('#ef4444', 1.2), 0.2, 0.52, 0.12, g);
      break;
    }
    case 'pearl': {
      box(0.5, 0.12, 0.4, mat('#fbcfe8'), 0, 0.06, 0, g);
      const p = box(0.2, 0.2, 0.2, glow('#f5f3ff', 1.6), 0, 0.3, 0, g);
      p.userData.hover = true;
      break;
    }
    case 'chime':
      box(0.08, 1.6, 0.08, mat('#94a3b8'), -0.35, 0.8, 0, g);
      box(0.08, 1.6, 0.08, mat('#94a3b8'), 0.35, 0.8, 0, g);
      box(0.8, 0.08, 0.08, mat('#94a3b8'), 0, 1.6, 0, g);
      for (let k = 0; k < 3; k++) box(0.1, 0.7 - k * 0.15, 0.1, mat('#bae6fd', { emissive: '#7dd3fc', intensity: 0.2 }), -0.2 + k * 0.2, 1.2 - (0.7 - k * 0.15) / 2, 0, g);
      g.userData.lamp = box(0.14, 0.14, 0.14, glow('#e0f2fe', 0.5), 0, 1.72, 0, g);
      break;
    case 'mirror': {
      box(0.5, 0.6, 0.5, stone('#a4552e'), 0, 0.3, 0, g);
      const h = group(g, 0, 0.6, 0);
      box(0.1, 0.5, 0.1, mat('#78350f'), 0, 0.25, 0, h);
      box(0.7, 0.6, 0.06, mat('#fef3c7', { emissive: '#fde68a', intensity: 0.3 }), 0, 0.7, 0.1, h);
      g.userData.head = h;
      g.userData.lamp = box(0.12, 0.12, 0.12, glow('#78350f', 0.5), 0.3, 0.5, 0.3, g);
      break;
    }
    case 'spore': {
      const sp = box(0.22, 0.22, 0.22, glow('#5eead4', 1.6), 0, 0.5, 0, g);
      sp.userData.spin = 2;
      sp.userData.hover = true;
      break;
    }
  }
  return g;
}

/** Gate across an entrance: vines, ice, rune door, sandstone, or hedge (`userData.panel` sinks to open). */
export function buildNatureGate(kind: string, span: number, alongX: boolean): THREE.Group {
  const g = new THREE.Group();
  const panel = group(g, 0, 0, 0);
  const c: Record<string, [string, string]> = {
    ruin: ['#6d7076', '#a78bfa'],
    sand: ['#d6c3a0', '#38bdf8'],
    mesa: ['#a4552e', '#fbbf24'],
    jungle: ['#1f6a4a', '#5eead4'],
    ice: ['#bae6fd', '#e0f2fe'],
  };
  const [body, rune] = c[kind] ?? ['#6d7076', '#fde68a'];
  const w = span;
  box(alongX ? w : 0.5, 2.2, alongX ? 0.5 : w, kind === 'jungle' ? leaf(body) : mat(body, { pattern: kind === 'ice' ? 'hex' : 'stone', transparent: kind === 'ice' ? 0.8 : undefined }), 0, 1.1, 0, panel);
  box(alongX ? 0.5 : 0.52, 0.5, alongX ? 0.52 : 0.5, glow(rune, 0.9), 0, 1.3, 0, panel);
  g.userData.panel = panel;
  return g;
}

import * as THREE from 'three';
import { blobShadow, box, glow, group, mat } from './voxels.ts';
import { mergeRig } from './batch.ts';

/**
 * Voxel characters. All face +z by default; animate via the returned rig.
 * Dayna and Xiao Hu follow the avatar/cat specs in docs/v2-design.md.
 */

export type Rig = {
  root: THREE.Group;
  body: THREE.Group;
  parts: Record<string, THREE.Object3D>;
  /** phase advances with movement speed; t is time in seconds. */
  animate(t: number, speed: number, dt: number): void;
};

const SKIN = '#e8bd98';
const HAIR = '#1a1311';

export function buildDayna(): Rig {
  const root = new THREE.Group();
  const body = group(root);
  blobShadow(0.42, root);
  const jacket = mat('#6d28d9', { rough: 0.7 });
  const jacketDark = mat('#4c1d95');
  const top = mat('#141218');
  const trousers = mat('#e6dcc8');
  const shoe = mat('#1d1b22');
  const skin = mat(SKIN, { rough: 0.9 });
  const hair = mat(HAIR, { rough: 0.95 });
  const belt = mat('#5a4330');

  // Legs pivot at the hip.
  const legL = group(body, -0.12, 0.52, 0);
  const legR = group(body, 0.12, 0.52, 0);
  for (const leg of [legL, legR]) {
    box(0.2, 0.44, 0.22, trousers, 0, -0.22, 0, leg);
    box(0.21, 0.1, 0.26, shoe, 0, -0.47, 0.02, leg);
  }
  // Torso: purple utility jacket open over a black top.
  const torso = group(body, 0, 0.52, 0);
  box(0.48, 0.5, 0.26, jacket, 0, 0.25, 0, torso);
  box(0.18, 0.44, 0.02, top, 0, 0.24, 0.135, torso);
  box(0.05, 0.3, 0.03, jacketDark, -0.12, 0.3, 0.135, torso); // lapels
  box(0.05, 0.3, 0.03, jacketDark, 0.12, 0.3, 0.135, torso);
  box(0.03, 0.03, 0.02, glow('#fcd34d', 1.2), 0, 0.36, 0.15, torso); // gold pendant
  box(0.5, 0.07, 0.28, belt, 0, 0.03, 0, torso); // tool belt
  box(0.09, 0.12, 0.08, belt, 0.2, -0.02, 0.1, torso);
  box(0.03, 0.1, 0.03, mat('#9ca3af', { metal: 0.8, rough: 0.3 }), 0.2, 0.07, 0.12, torso); // screwdriver
  box(0.3, 0.2, 0.12, mat('#3f3a4a'), 0, 0.3, -0.18, torso); // small backpack

  // Arms pivot at the shoulder.
  const armL = group(body, -0.32, 0.98, 0);
  const armR = group(body, 0.32, 0.98, 0);
  for (const arm of [armL, armR]) {
    box(0.16, 0.36, 0.18, jacket, 0, -0.16, 0, arm);
    box(0.14, 0.12, 0.16, skin, 0, -0.4, 0, arm);
  }
  // Glowing gauntlet on the right hand (solder beam emitter).
  const gauntlet = box(0.18, 0.16, 0.2, glow('#a855f7', 1.8), 0, -0.36, 0, armR);
  box(0.06, 0.06, 0.08, glow('#e9d5ff', 3), 0, -0.44, 0.08, armR);

  // Head
  const head = group(body, 0, 1.02, 0);
  box(0.44, 0.42, 0.42, skin, 0, 0.21, 0, head);
  box(0.08, 0.09, 0.02, mat('#1a1212'), -0.1, 0.21, 0.215, head); // eyes
  box(0.08, 0.09, 0.02, mat('#1a1212'), 0.1, 0.21, 0.215, head);
  box(0.1, 0.025, 0.02, mat(HAIR), -0.1, 0.28, 0.216, head); // brows
  box(0.1, 0.025, 0.02, mat(HAIR), 0.1, 0.28, 0.216, head);
  box(0.05, 0.02, 0.02, mat('#f1f5f9'), -0.085, 0.225, 0.222, head); // eye shine
  box(0.05, 0.02, 0.02, mat('#f1f5f9'), 0.115, 0.225, 0.222, head);
  box(0.12, 0.03, 0.02, mat('#c07a6a'), 0, 0.09, 0.215, head); // lips
  box(0.08, 0.04, 0.02, mat('#eaa99a'), -0.16, 0.13, 0.213, head); // blush
  box(0.08, 0.04, 0.02, mat('#eaa99a'), 0.16, 0.13, 0.213, head);
  // Long dark wavy hair: cap, sides, back past the shoulders, face-framing strands, centre part.
  box(0.48, 0.1, 0.48, hair, 0, 0.45, 0, head);
  box(0.07, 0.44, 0.46, hair, -0.245, 0.2, -0.01, head);
  box(0.07, 0.44, 0.46, hair, 0.245, 0.2, -0.01, head);
  box(0.5, 0.76, 0.1, hair, 0, 0.02, -0.25, head);
  box(0.42, 0.2, 0.08, hair, 0, -0.34, -0.22, head); // wavy ends
  box(0.1, 0.34, 0.05, hair, -0.19, 0.18, 0.21, head); // curtain strands
  box(0.1, 0.34, 0.05, hair, 0.19, 0.18, 0.21, head);
  box(0.12, 0.1, 0.05, hair, -0.13, 0.4, 0.21, head);
  box(0.12, 0.1, 0.05, hair, 0.13, 0.4, 0.21, head);
  box(0.12, 0.2, 0.08, hair, -0.26, -0.12, 0.05, head); // waves over the shoulders
  box(0.12, 0.2, 0.08, hair, 0.26, -0.12, 0.05, head);
  // Goggles pushed up on the forehead.
  box(0.5, 0.05, 0.5, mat('#26222e'), 0, 0.5, 0, head);
  const lens = mat('#5eead4', { metal: 0.7, rough: 0.2, emissive: '#0e7490', intensity: 0.35 });
  box(0.11, 0.07, 0.04, lens, -0.1, 0.53, 0.24, head);
  box(0.11, 0.07, 0.04, lens, 0.1, 0.53, 0.24, head);

  mergeRig(root);
  let phase = 0;
  return {
    root,
    body,
    parts: { legL, legR, armL, armR, head, torso, gauntlet },
    animate(t, speed, dt) {
      phase += dt * (4 + speed * 1.8);
      const swing = Math.min(1, speed / 4.5);
      legL.rotation.x = Math.sin(phase) * 0.7 * swing;
      legR.rotation.x = -Math.sin(phase) * 0.7 * swing;
      armL.rotation.x = -Math.sin(phase) * 0.6 * swing;
      if (!armR.userData.override) armR.rotation.x = Math.sin(phase) * 0.6 * swing;
      body.position.y = Math.abs(Math.sin(phase)) * 0.05 * swing + (swing < 0.1 ? Math.sin(t * 2) * 0.012 : 0);
      head.rotation.y = swing < 0.1 ? Math.sin(t * 0.7) * 0.15 : 0;
    },
  };
}

/** Xiao Hu — brown mackerel tabby with a ringed, black-tipped tail and a purple LED tag. */
export function buildCat(): Rig {
  const root = new THREE.Group();
  const body = group(root);
  blobShadow(0.32, root);
  const fur = mat('#8a7560', { pattern: 'tabby', rough: 1 });
  const furDark = mat('#4a3a2c', { rough: 1 });
  const cream = mat('#d9c7a6', { rough: 1 });
  const pink = mat('#e7a2a2');
  const torso = group(body, 0, 0.24, 0);
  box(0.26, 0.22, 0.52, fur, 0, 0, 0, torso);
  box(0.2, 0.04, 0.4, cream, 0, -0.11, 0, torso); // belly
  const legs: THREE.Group[] = [];
  for (const [x, z] of [
    [-0.09, 0.18],
    [0.09, 0.18],
    [-0.09, -0.18],
    [0.09, -0.18],
  ]) {
    const leg = group(body, x, 0.16, z);
    box(0.07, 0.16, 0.07, fur, 0, -0.08, 0, leg);
    box(0.075, 0.04, 0.08, cream, 0, -0.15, 0.005, leg);
    legs.push(leg);
  }
  const head = group(body, 0, 0.36, 0.3);
  box(0.26, 0.22, 0.22, fur, 0, 0, 0, head);
  box(0.03, 0.08, 0.02, furDark, 0, 0.07, 0.112, head); // tabby "M"
  box(0.1, 0.03, 0.02, furDark, 0, 0.1, 0.112, head);
  box(0.13, 0.08, 0.05, cream, 0, -0.05, 0.12, head); // muzzle
  box(0.04, 0.03, 0.02, pink, 0, -0.02, 0.15, head); // nose
  box(0.05, 0.05, 0.02, glow('#bef264', 1.1), -0.06, 0.02, 0.115, head); // pale green eyes
  box(0.05, 0.05, 0.02, glow('#bef264', 1.1), 0.06, 0.02, 0.115, head);
  box(0.02, 0.04, 0.021, mat('#0b0b0b'), -0.06, 0.02, 0.117, head);
  box(0.02, 0.04, 0.021, mat('#0b0b0b'), 0.06, 0.02, 0.117, head);
  for (const x of [-0.08, 0.08]) {
    box(0.07, 0.09, 0.04, fur, x, 0.14, 0.02, head);
    box(0.04, 0.05, 0.02, pink, x, 0.13, 0.045, head);
  }
  // Whiskers
  for (const x of [-1, 1]) box(0.12, 0.008, 0.008, mat('#f1efe9'), x * 0.12, -0.05, 0.13, head);
  // Collar + purple LED tag
  box(0.27, 0.04, 0.23, mat('#2a211b'), 0, -0.1, -0.02, head);
  box(0.04, 0.04, 0.02, glow('#c084fc', 2.4), 0, -0.13, 0.1, head);
  // Tail: ringed, black tip.
  const tail = group(body, 0, 0.3, -0.26);
  let seg: THREE.Object3D = tail;
  const tailSegs: THREE.Group[] = [];
  for (let i = 0; i < 5; i++) {
    const g = group(seg, 0, 0, i === 0 ? 0 : -0.1);
    box(0.06, 0.06, 0.11, i === 4 ? mat('#0f0d0c') : i % 2 ? furDark : fur, 0, 0, -0.05, g);
    g.rotation.x = -0.25;
    tailSegs.push(g);
    seg = g;
  }

  mergeRig(root);
  let phase = 0;
  return {
    root,
    body,
    parts: { head, tail, torso },
    animate(t, speed, dt) {
      phase += dt * (5 + speed * 3);
      const swing = Math.min(1, speed / 3);
      legs.forEach((leg, i) => (leg.rotation.x = Math.sin(phase + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.8 * swing));
      tailSegs.forEach((s, i) => {
        s.rotation.y = Math.sin(t * 2.2 + i * 0.6) * 0.25;
        s.rotation.x = -0.25 - swing * 0.1;
      });
      body.position.y = Math.abs(Math.sin(phase)) * 0.03 * swing;
    },
  };
}

// ── Enemies ──────────────────────────────────────────────────────────────────

export type EnemyType = 'wisp' | 'welder' | 'crawler' | 'bug' | 'packet' | 'drone' | 'boss' | 'core' | 'arm' | 'queen' | 'swarm';

export function buildEnemy(type: EnemyType): Rig {
  const root = new THREE.Group();
  const body = group(root);
  const parts: Record<string, THREE.Object3D> = {};
  let bob = 0;
  let floaty = false;
  switch (type) {
    case 'wisp': {
      floaty = true;
      blobShadow(0.25, root);
      const core = group(body, 0, 0.8, 0);
      box(0.28, 0.28, 0.28, glow('#f0abfc', 2.6), 0, 0, 0, core);
      for (let i = 0; i < 4; i++) {
        const orb = box(0.1, 0.1, 0.1, glow('#e879f9', 2), 0, 0, 0, core);
        orb.userData.orbit = i;
      }
      parts.core = core;
      break;
    }
    case 'welder': {
      blobShadow(0.4, root);
      const rust = mat('#8a4b2a', { pattern: 'metal' });
      box(0.6, 0.45, 0.5, rust, 0, 0.35, 0, body);
      box(0.5, 0.12, 0.45, mat('#3a2a22'), 0, 0.08, 0, body);
      const head = group(body, 0, 0.7, 0.05);
      box(0.34, 0.24, 0.3, mat('#b8653a', { pattern: 'panel' }), 0, 0, 0, head);
      box(0.24, 0.07, 0.02, glow('#fb923c', 2.5), 0, 0.02, 0.16, head);
      const arm = group(body, 0.36, 0.5, 0.1);
      box(0.1, 0.1, 0.42, mat('#6b3a22'), 0, 0, 0.18, arm);
      box(0.08, 0.08, 0.08, glow('#fdba74', 4), 0, 0, 0.42, arm);
      parts.head = head;
      parts.arm = arm;
      break;
    }
    case 'crawler': {
      blobShadow(0.42, root);
      const scrap = mat('#6b6258', { pattern: 'metal' });
      box(0.7, 0.22, 0.56, scrap, 0, 0.28, 0, body);
      box(0.4, 0.1, 0.3, mat('#8a7f70'), 0.05, 0.43, -0.05, body);
      box(0.1, 0.08, 0.04, glow('#ef4444', 3), -0.12, 0.3, 0.29, body);
      box(0.1, 0.08, 0.04, glow('#ef4444', 3), 0.12, 0.3, 0.29, body);
      for (let i = 0; i < 4; i++) {
        const leg = group(body, i < 2 ? -0.38 : 0.38, 0.25, i % 2 ? -0.18 : 0.18);
        box(0.06, 0.26, 0.06, mat('#3d3833'), 0, -0.12, 0, leg);
        leg.rotation.z = i < 2 ? -0.5 : 0.5;
        parts[`leg${i}`] = leg;
      }
      break;
    }
    case 'bug': {
      blobShadow(0.36, root);
      const shell = mat('#0f3a44', { pattern: 'circuit', accent: '#22d3ee' });
      box(0.46, 0.24, 0.6, shell, 0, 0.26, 0, body);
      box(0.04, 0.26, 0.62, glow('#22d3ee', 1.8), 0, 0.27, 0, body);
      box(0.3, 0.16, 0.18, mat('#123039'), 0, 0.22, 0.36, body);
      box(0.06, 0.06, 0.03, glow('#fde047', 3), -0.08, 0.25, 0.46, body);
      box(0.06, 0.06, 0.03, glow('#fde047', 3), 0.08, 0.25, 0.46, body);
      for (let i = 0; i < 6; i++) {
        const leg = group(body, i < 3 ? -0.26 : 0.26, 0.2, -0.18 + (i % 3) * 0.18);
        box(0.18, 0.04, 0.04, mat('#0a2229'), i < 3 ? -0.07 : 0.07, -0.05, 0, leg);
        parts[`leg${i}`] = leg;
      }
      const cargo = group(body, 0, 0.46, -0.05);
      parts.cargo = cargo;
      break;
    }
    case 'packet': {
      floaty = true;
      blobShadow(0.3, root);
      const cube = group(body, 0, 0.7, 0);
      box(0.46, 0.46, 0.46, mat('#7f1d1d', { emissive: '#ef4444', intensity: 0.9 }), 0, 0, 0, cube);
      box(0.3, 0.06, 0.02, glow('#fecaca', 2.5), 0, 0.05, 0.24, cube);
      box(0.08, 0.08, 0.02, mat('#0a0a0a'), -0.1, -0.08, 0.24, cube);
      box(0.08, 0.08, 0.02, mat('#0a0a0a'), 0.1, -0.08, 0.24, cube);
      parts.cube = cube;
      break;
    }
    case 'drone': {
      floaty = true;
      blobShadow(0.32, root);
      const craft = group(body, 0, 1.0, 0);
      box(0.4, 0.14, 0.4, mat('#d4d0e8', { pattern: 'panel' }), 0, 0, 0, craft);
      box(0.14, 0.08, 0.04, glow('#a78bfa', 3), 0, -0.02, 0.21, craft);
      for (const [x, z] of [
        [-0.28, -0.28],
        [0.28, -0.28],
        [-0.28, 0.28],
        [0.28, 0.28],
      ]) {
        box(0.04, 0.04, 0.3, mat('#6b6880'), x / 2, 0, z / 2, craft).rotation.y = Math.atan2(x, z);
        const rotor = box(0.22, 0.02, 0.04, mat('#e9e5ff'), x, 0.06, z, craft);
        rotor.userData.rotor = true;
      }
      parts.craft = craft;
      break;
    }
    case 'core': {
      // Overloaded Core: a giant unstable reactor orb ringed by capacitor plates.
      floaty = true;
      blobShadow(0.9, root);
      const core = group(body, 0, 1.6, 0);
      box(0.9, 0.9, 0.9, glow('#f0abfc', 3.2), 0, 0, 0, core);
      box(1.1, 0.25, 1.1, mat('#3b2a47', { pattern: 'metal' }), 0, 0.55, 0, core);
      box(1.1, 0.25, 1.1, mat('#3b2a47', { pattern: 'metal' }), 0, -0.55, 0, core);
      for (let i = 0; i < 6; i++) {
        const plate = box(0.18, 0.5, 0.5, glow('#e879f9', 1.8), 0, 0, 0, core);
        plate.userData.orbit = i;
      }
      parts.core = core;
      break;
    }
    case 'arm': {
      // Rogue Assembly Arm: heavy base, rotating shoulder, long arm with a welding head.
      blobShadow(1.0, root);
      const orange = mat('#f59e0b', { pattern: 'metal', metal: 0.4 });
      box(1.6, 0.5, 1.6, mat('#3b3b40', { pattern: 'panel' }), 0, 0.25, 0, body);
      box(1.7, 0.1, 1.7, mat('#15151a', { pattern: 'hazard', accent: '#f59e0b' }), 0, 0.52, 0, body);
      const shoulder = group(body, 0, 0.6, 0);
      box(0.8, 0.5, 0.8, orange, 0, 0.25, 0, shoulder);
      const upper = group(shoulder, 0, 0.5, 0);
      box(0.35, 1.5, 0.35, orange, 0, 0.75, 0, upper);
      const fore = group(upper, 0, 1.5, 0);
      box(0.3, 0.3, 1.4, orange, 0, 0, 0.6, fore);
      box(0.4, 0.4, 0.3, mat('#3a2a22'), 0, 0, 1.35, fore);
      box(0.16, 0.16, 0.16, glow('#fde68a', 5), 0, 0, 1.55, fore);
      box(0.5, 0.12, 0.02, glow('#ef4444', 3), 0, 0.3, 0.41, shoulder);
      parts.arm = fore;
      parts.shoulder = shoulder;
      break;
    }
    case 'queen': {
      // Bug Queen: an oversized circuit beetle with a glowing egg sac.
      blobShadow(1.1, root);
      const shell = mat('#0f3a44', { pattern: 'circuit', accent: '#22d3ee' });
      box(1.3, 0.6, 1.7, shell, 0, 0.55, 0, body);
      box(0.08, 0.62, 1.72, glow('#22d3ee', 2), 0, 0.56, 0, body);
      box(0.9, 0.5, 0.7, glow('#67e8f9', 1.2), 0, 0.6, -1.05, body);
      box(0.8, 0.45, 0.5, mat('#123039'), 0, 0.5, 1.05, body);
      box(0.14, 0.14, 0.04, glow('#fde047', 4), -0.2, 0.55, 1.31, body);
      box(0.14, 0.14, 0.04, glow('#fde047', 4), 0.2, 0.55, 1.31, body);
      for (const x of [-0.25, 0.25]) box(0.08, 0.08, 0.5, mat('#0a2229'), x, 0.35, 1.5, body).rotation.y = x * 0.8;
      for (let i = 0; i < 6; i++) {
        const leg = group(body, i < 3 ? -0.7 : 0.7, 0.4, -0.5 + (i % 3) * 0.5);
        box(0.5, 0.1, 0.1, mat('#0a2229'), i < 3 ? -0.22 : 0.22, -0.12, 0, leg);
        parts[`leg${i}`] = leg;
      }
      break;
    }
    case 'swarm': {
      // Static Swarm: a cloud of interference drones around a bright core.
      floaty = true;
      blobShadow(0.9, root);
      const core = group(body, 0, 1.4, 0);
      box(0.5, 0.5, 0.5, glow('#e9d5ff', 3), 0, 0, 0, core);
      for (let i = 0; i < 9; i++) {
        const d = box(0.24, 0.1, 0.24, mat('#d4d0e8', { emissive: '#a78bfa', intensity: 1.2 }), 0, 0, 0, core);
        d.userData.orbit = i;
      }
      parts.core = core;
      break;
    }
    case 'boss': {
      floaty = true;
      blobShadow(1.0, root);
      const core = group(body, 0, 1.5, 0);
      // "Merge Conflict": a cube split into ours (green) and theirs (red).
      box(0.8, 1.5, 1.5, mat('#14532d', { emissive: '#22c55e', intensity: 0.8, pattern: 'server', accent: '#4ade80' }), -0.42, 0, 0, core);
      box(0.8, 1.5, 1.5, mat('#7f1d1d', { emissive: '#ef4444', intensity: 0.8, pattern: 'server', accent: '#f87171' }), 0.42, 0, 0, core);
      box(0.06, 1.6, 1.6, glow('#fef08a', 3), 0, 0, 0, core);
      for (const [x, c] of [
        [-0.42, '#bbf7d0'],
        [0.42, '#fecaca'],
      ] as const) {
        box(0.22, 0.14, 0.02, glow(c, 3), x - 0.12, 0.25, 0.76, core);
        box(0.22, 0.14, 0.02, glow(c, 3), x + 0.12, 0.25, 0.76, core);
        box(0.4, 0.08, 0.02, mat('#0a0a0a'), x, -0.2, 0.76, core);
      }
      box(0.5, 0.18, 0.02, glow('#fef08a', 2), 0, 0.62, 0.76, core); // "<<<<<<<"
      parts.core = core;
      break;
    }
  }
  mergeRig(root);
  return {
    root,
    body,
    parts,
    animate(t, speed, dt) {
      bob += dt * (6 + speed * 3);
      if (floaty) body.position.y = Math.sin(t * 3 + root.id) * 0.08;
      if (parts.core && (type === 'core' || type === 'swarm')) {
        parts.core.rotation.y += dt * (type === 'core' ? 1.5 : 2.5);
        parts.core.children.forEach((c) => {
          const i = c.userData.orbit;
          if (i == null) return;
          const n = type === 'core' ? 6 : 9;
          const a = t * (type === 'core' ? 1.2 : 3) + (i * Math.PI * 2) / n;
          const r = type === 'core' ? 0.85 : 0.9 + Math.sin(t * 5 + i) * 0.25;
          c.position.set(Math.cos(a) * r, type === 'swarm' ? Math.sin(a * 2 + i) * 0.4 : 0, Math.sin(a) * r);
          c.rotation.y = -a;
        });
      }
      if (parts.shoulder && type === 'arm') parts.arm.rotation.x = Math.sin(t * 2) * 0.25 - 0.15;
      if (parts.core && type === 'wisp') {
        parts.core.rotation.y += dt * 3;
        parts.core.children.forEach((c) => {
          const i = c.userData.orbit;
          if (i == null) return;
          const a = t * 4 + (i * Math.PI) / 2;
          c.position.set(Math.cos(a) * 0.3, Math.sin(a * 1.3) * 0.1, Math.sin(a) * 0.3);
        });
      }
      if (parts.cube) {
        parts.cube.rotation.y = t * 1.5;
        parts.cube.position.x = Math.random() < 0.04 ? (Math.random() - 0.5) * 0.1 : 0; // glitch jitter
      }
      if (parts.craft) parts.craft.children.forEach((c) => c.userData.rotor && (c.rotation.y += dt * 30));
      if (parts.core && type === 'boss') parts.core.rotation.y = Math.sin(t * 0.8) * 0.4;
      for (let i = 0; i < 6; i++) {
        const leg = parts[`leg${i}`];
        if (leg) leg.rotation.x = Math.sin(bob + i) * 0.5 * Math.min(1, speed);
      }
      if (parts.head) parts.head.rotation.y = Math.sin(t * 1.3) * 0.4;
    },
  };
}

// ── Colony NPCs ──────────────────────────────────────────────────────────────

const OUTFITS = ['#0ea5e9', '#f97316', '#10b981', '#e11d48', '#eab308', '#6366f1'];
const HAIRS = ['#2b1d14', '#0f0d0c', '#6b4423', '#3b2f2f'];
const SKINS = ['#f0c8a8', '#d9a47e', '#b57a55', '#e8bd98'];

export function buildNpc(seed: number): Rig {
  const root = new THREE.Group();
  const body = group(root);
  blobShadow(0.38, root);
  const outfit = mat(OUTFITS[seed % OUTFITS.length]);
  const skin = mat(SKINS[seed % SKINS.length]);
  const hair = mat(HAIRS[seed % HAIRS.length]);
  box(0.2, 0.5, 0.22, mat('#334155'), -0.12, 0.25, 0, body);
  box(0.2, 0.5, 0.22, mat('#334155'), 0.12, 0.25, 0, body);
  box(0.48, 0.52, 0.26, outfit, 0, 0.76, 0, body);
  const armL = group(body, -0.32, 1.0, 0);
  const armR = group(body, 0.32, 1.0, 0);
  box(0.16, 0.46, 0.18, outfit, 0, -0.2, 0, armL);
  box(0.16, 0.46, 0.18, outfit, 0, -0.2, 0, armR);
  const head = group(body, 0, 1.04, 0);
  box(0.42, 0.42, 0.42, skin, 0, 0.21, 0, head);
  box(0.46, 0.14 + (seed % 3) * 0.05, 0.46, hair, 0, 0.42, -0.01, head);
  box(0.06, 0.06, 0.02, mat('#1f1a1a'), -0.1, 0.2, 0.21, head);
  box(0.06, 0.06, 0.02, mat('#1f1a1a'), 0.1, 0.2, 0.21, head);
  box(0.1, 0.03, 0.02, mat('#b0645a'), 0, 0.1, 0.21, head);
  mergeRig(root);
  return {
    root,
    body,
    parts: { head, armL, armR },
    animate(t) {
      head.rotation.y = Math.sin(t * 0.6 + seed) * 0.3;
      armR.rotation.x = Math.sin(t * 1.4 + seed) * 0.15;
      body.position.y = Math.sin(t * 1.6 + seed) * 0.01;
    },
  };
}

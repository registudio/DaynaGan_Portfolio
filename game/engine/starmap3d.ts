import * as THREE from 'three';
import type { Biome } from './biomes.ts';
import { FLOOR, WALL, type LevelMap } from './layout.ts';
import { box, glow, group, mat } from './voxels.ts';

/**
 * The hub's star-map table: every mission is drawn as a miniature floating island built from its
 * real layout (rooms, corridors, terraces, walls and glowing paths) in its biome's colours,
 * orbiting a miniature of the station.
 */
export type IslandSpec = { id: string; map: LevelMap; biome: Biome; cleared: boolean; locked: boolean };

const UNIT = new THREE.BoxGeometry(1, 1, 1);

function bounds(map: LevelMap) {
  let x0 = Infinity;
  let z0 = Infinity;
  let x1 = -Infinity;
  let z1 = -Infinity;
  map.cells.forEach((c, i) => {
    if (c.t === 0) return;
    const x = i % map.w;
    const z = Math.floor(i / map.w);
    x0 = Math.min(x0, x);
    z0 = Math.min(z0, z);
    x1 = Math.max(x1, x);
    z1 = Math.max(z1, z);
  });
  return { x0, z0, x1, z1, w: x1 - x0 + 1, d: z1 - z0 + 1 };
}

/** One island: instanced voxel tiles (tops + walls) over a tapered rock base. */
export function buildIsland(spec: IslandSpec, size: number) {
  const { map, biome } = spec;
  const g = new THREE.Group();
  const b = bounds(map);
  const s = size / Math.max(b.w, b.d);
  const tiles = map.cells.map((c, i) => ({ c, x: i % map.w, z: Math.floor(i / map.w) })).filter((t) => t.c.t === FLOOR || t.c.t === WALL);
  const mesh = new THREE.InstancedMesh(UNIT, new THREE.MeshLambertMaterial({ color: '#ffffff' }), tiles.length);
  const m = new THREE.Matrix4();
  const col = new THREE.Color();
  const grey = new THREE.Color('#3f3f46');
  const floorC = new THREE.Color(biome.floor.color).multiplyScalar(1.8);
  const altC = new THREE.Color(biome.floorAlt.color).multiplyScalar(1.8);
  const pathC = new THREE.Color(biome.light);
  const wallC = new THREE.Color(biome.wall.color).multiplyScalar(1.3);
  tiles.forEach((t, k) => {
    const wall = t.c.t === WALL;
    const hh = (t.c.h * 0.9 + (wall ? 1.4 : 0) + 1) * s;
    m.compose(
      new THREE.Vector3((t.x - b.x0 - b.w / 2 + 0.5) * s, hh / 2, (t.z - b.z0 - b.d / 2 + 0.5) * s),
      new THREE.Quaternion(),
      new THREE.Vector3(s * 0.96, hh, s * 0.96),
    );
    mesh.setMatrixAt(k, m);
    col.copy(wall ? wallC : t.c.surf === 'path' || t.c.surf === 'glow' ? pathC : t.c.surf === 'alt' ? altC : floorC);
    // Terraces read better with a touch of height shading.
    col.multiplyScalar(0.85 + Math.min(0.4, t.c.h * 0.08));
    // Keep pale biomes (Spires) from blowing out.
    const peak = Math.max(col.r, col.g, col.b);
    if (peak > 0.62) col.multiplyScalar(0.62 / peak);
    if (spec.locked) col.lerp(grey, 0.65);
    mesh.setColorAt(k, col);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  g.add(mesh);
  // Tapered rock underneath, like the Minecraft Dungeons map islands.
  const rock = mat(spec.locked ? '#27272a' : biome.cliff, { pattern: 'stone' });
  const w = b.w * s;
  const d = b.d * s;
  [
    [1, 0.18],
    [0.72, 0.16],
    [0.42, 0.14],
    [0.18, 0.12],
  ].forEach(([f, h], k) => box(w * f, size * h, d * f, rock, 0, -size * (0.09 + k * 0.15), 0, g));
  if (spec.cleared) {
    const star = box(size * 0.1, size * 0.1, size * 0.1, glow('#fbbf24', 2), 0, size * 0.55, 0, g);
    star.rotation.set(Math.PI / 4, 0, Math.PI / 4);
    star.userData.spin = 1.5;
  }
  return g;
}

export function buildStarMapTable(islands: IslandSpec[], hub: IslandSpec | null) {
  const g = new THREE.Group();
  const shell = mat('#2f3446', { pattern: 'plate' });
  const dark = mat('#161a26', { pattern: 'plate' });
  // Table: bevelled base, a projector well and brass-ish trim.
  box(3.4, 0.12, 2.8, dark, 0, 0.06, 0, g);
  box(3.2, 0.72, 2.6, shell, 0, 0.48, 0, g);
  box(3.3, 0.08, 2.7, dark, 0, 0.88, 0, g);
  box(3.0, 0.02, 2.4, mat('#0b1020', { pattern: 'grate' }), 0, 0.93, 0, g);
  for (const x of [-1.2, 1.2]) box(0.3, 0.04, 2.0, glow('#6366f1', 0.8), x, 0.94, 0, g);
  for (const z of [-1.28, 1.28]) box(2.6, 0.2, 0.04, mat('#0a0e16', { pattern: 'screen', accent: '#818cf8', emissive: '#818cf8', intensity: 0.3 }), 0, 0.55, z * 1.02, g);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.2, 1.1, 32, 1, true),
    new THREE.MeshBasicMaterial({ color: '#818cf8', transparent: true, opacity: 0.05, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
  );
  beam.position.y = 1.5;
  g.add(beam);
  const holo = group(g, 0, 1.55, 0);
  if (hub) {
    const hubIsland = buildIsland(hub, 0.6);
    hubIsland.position.y = 0.1;
    holo.add(hubIsland);
  }
  const n = islands.length;
  islands.forEach((spec, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const isl = buildIsland(spec, 0.72);
    isl.position.set(Math.cos(a) * 1.22, Math.sin(i * 1.7) * 0.08, Math.sin(a) * 0.9);
    isl.rotation.y = -a * 0.15;
    const bob = group(holo);
    bob.add(isl);
    bob.userData.hover = true;
    // Dotted route back to the station.
    const route = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.012, 1),
      new THREE.MeshBasicMaterial({ color: spec.locked ? '#52525b' : spec.biome.light, transparent: true, opacity: 0.45 }),
    );
    const len = Math.hypot(Math.cos(a) * 1.22, Math.sin(a) * 0.9) - 0.5;
    route.scale.z = len;
    route.position.set(Math.cos(a) * (0.3 + len / 2) * 0.96, -0.02, Math.sin(a) * (0.3 + len / 2) * 0.72);
    route.rotation.y = Math.atan2(Math.cos(a) * 1.22, Math.sin(a) * 0.9);
    holo.add(route);
  });
  holo.userData.spin = 0.05;
  g.userData.light = { y: 2.6, color: '#a78bfa', intensity: 2.5, distance: 7 };
  // Ring marker is replaced by the zone ring; keep one so the table reads as interactable.
  const ringMark = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.02, 4, 32), glow('#a78bfa', 1));
  ringMark.rotation.x = -Math.PI / 2;
  ringMark.position.y = 0.04;
  ringMark.userData.interactRing = true;
  g.add(ringMark);
  return g;
}

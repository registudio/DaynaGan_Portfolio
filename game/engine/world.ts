import * as THREE from 'three';
import type { Biome, Surface } from './biomes.ts';
import { computeWalls, FLOOR, VOID, WALL, type Cell, type LevelMap } from './layout.ts';
import { glowTexture, pixelTexture } from './textures.ts';

/** Renders a LevelMap as instanced voxel blocks and answers collision/height queries. */

const WALL_BLOCKS = 3;
const CLIFF_DEPTH = 4;

type Batch = { material: THREE.Material; matrices: THREE.Matrix4[] };

function surfaceMaterial(s: Surface, shade = 1): THREE.MeshLambertMaterial {
  const color = new THREE.Color(s.color).multiplyScalar(shade);
  const m = new THREE.MeshLambertMaterial({
    map: pixelTexture(s.pattern, `#${color.getHexString()}`, s.accent ?? s.color),
  });
  if (s.glow) {
    m.emissiveMap = glowTexture(s.pattern, s.accent ?? s.color);
    m.emissive = new THREE.Color('#ffffff');
    m.emissiveIntensity = s.pattern === 'metal' ? 0.55 : 0.75;
    if (s.pattern === 'metal') {
      m.color = new THREE.Color('#333333');
      m.emissive = new THREE.Color(s.color);
      m.emissiveMap = null;
    }
  }
  return m;
}

type WorldMaterials = Record<'floor' | 'alt' | 'path' | 'wall' | 'wallDark' | 'top' | 'trim' | 'cliff' | 'cliffDeep' | 'rail' | 'windowMat' | 'pipe' | 'vent' | 'lamp' | 'bolt', THREE.Material>;
const materialCache = new Map<string, WorldMaterials>();
const terrainCache = new Map<string, THREE.Material>();

/** Per-biome world materials, built once per session and reused on every visit. */
function worldMaterials(b: Biome): WorldMaterials {
  const key = `${b.id}|${b.light}`;
  const hit = materialCache.get(key);
  if (hit) return hit;
  const m: WorldMaterials = {
    floor: surfaceMaterial(b.floor),
    alt: surfaceMaterial(b.floorAlt),
    path: surfaceMaterial(b.path ?? b.floorAlt),
    wall: surfaceMaterial(b.wall),
    wallDark: surfaceMaterial(b.wall, 0.75),
    top: surfaceMaterial({ pattern: 'metal', color: b.wall.color }, 0.6),
    // Emissive-only surfaces don't need lighting at all.
    trim: new THREE.MeshBasicMaterial({ color: new THREE.Color(b.wallTop.color).multiplyScalar(1.3) }),
    cliff: new THREE.MeshLambertMaterial({ map: pixelTexture('stone', b.cliff) }),
    cliffDeep: new THREE.MeshLambertMaterial({ map: pixelTexture('stone', b.cliff), color: '#777777' }),
    rail: new THREE.MeshBasicMaterial({ color: new THREE.Color(b.rail).multiplyScalar(1.1) }),
    pipe: new THREE.MeshLambertMaterial({ map: pixelTexture('metal', `#${new THREE.Color(b.wall.color).multiplyScalar(0.75).getHexString()}`, '#ffffff', 16) }),
    vent: new THREE.MeshLambertMaterial({ map: pixelTexture('vent', `#${new THREE.Color(b.wall.color).multiplyScalar(0.9).getHexString()}`, '#ffffff', 16) }),
    lamp: new THREE.MeshBasicMaterial({ color: new THREE.Color(b.wallTop.color).lerp(new THREE.Color('#ffffff'), 0.35).multiplyScalar(0.9) }),
    bolt: new THREE.MeshLambertMaterial({ color: new THREE.Color(b.wall.color).multiplyScalar(0.55) }),
    windowMat: new THREE.MeshLambertMaterial({
      color: '#0b1020',
      emissive: new THREE.Color('#1e3a8a'),
      emissiveIntensity: 0.9,
      emissiveMap: glowTexture('stone', '#93c5fd'),
    }),
  };
  materialCache.set(key, m);
  return m;
}

export class World {
  group = new THREE.Group();
  map: LevelMap;
  biome: Biome;
  hiddenRoom: number | null;
  private meshes: THREE.InstancedMesh[] = [];
  private unit = new THREE.BoxGeometry(1, 1, 1);

  constructor(map: LevelMap, biome: Biome, hiddenRoom: number | null = null) {
    this.map = map;
    this.biome = biome;
    this.hiddenRoom = hiddenRoom;
    this.build();
  }

  cell(x: number, z: number): Cell | undefined {
    const fx = Math.floor(x);
    const fz = Math.floor(z);
    if (fx < 0 || fz < 0 || fx >= this.map.w || fz >= this.map.d) return undefined;
    return this.map.cells[fz * this.map.w + fx];
  }

  private hidden(c: Cell | undefined) {
    return !!c && this.hiddenRoom != null && c.room === this.hiddenRoom;
  }

  build() {
    this.clear();
    const { floor, alt, path, wall, wallDark, top, trim, cliff, cliffDeep, rail, windowMat, pipe, vent, lamp, bolt } = worldMaterials(this.biome);
    const batches = new Map<THREE.Material, Batch>();
    const add = (material: THREE.Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) => {
      let batch = batches.get(material);
      if (!batch) batches.set(material, (batch = { material, matrices: [] }));
      const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz));
      batch.matrices.push(m);
    };

    const { w, d, cells } = this.map;
    const at = (x: number, z: number) => (x < 0 || z < 0 || x >= w || z >= d ? undefined : cells[z * w + x]);
    const open = (c: Cell | undefined) => !c || c.t === VOID || this.hidden(c);
    // Open-world terrain: per-cell materials from the biome palette.
    const terr = this.biome.terrain;
    const tcache = new Map<string, THREE.Material>();
    const tmat = (key: string, part: 'top' | 'alt' | 'side' | 'wall') => {
      const k = `${key}|${part}`;
      let m = tcache.get(k) ?? terrainCache.get(`${this.biome.id}|${k}`);
      if (!m) {
        const t = terr![key] ?? terr!.meadow;
        m =
          part === 'side'
            ? new THREE.MeshLambertMaterial({ map: pixelTexture('stone', t.side) })
            : part === 'wall'
              ? surfaceMaterial({ ...t.top, glow: false }, 0.82)
              : surfaceMaterial(part === 'alt' ? (t.alt ?? t.top) : t.top);
        terrainCache.set(`${this.biome.id}|${k}`, m);
      }
      tcache.set(k, m);
      return m;
    };
    for (let z = 0; z < d; z++)
      for (let x = 0; x < w; x++) {
        const c = cells[z * w + x];
        if (this.hidden(c)) continue;
        const cx = x + 0.5;
        const cz = z + 0.5;
        if (c.t === FLOOR && terr && c.mat) {
          add(tmat(c.mat, c.surf === 'alt' ? 'alt' : 'top'), cx, c.h - 0.5, cz);
          // Fill down to the lowest neighbour (terraces) or a deep cliff at the coast.
          const ns = [at(x + 1, z), at(x - 1, z), at(x, z + 1), at(x, z - 1)];
          const low = ns.some((n) => open(n)) ? c.h - CLIFF_DEPTH - 1 : Math.min(...ns.map((n) => (n && n.t !== VOID ? n.h : c.h)));
          const side = tmat(c.mat, 'side');
          for (let y = c.h - 1; y > low - 0.01; y--) add(side, cx, y - 0.5, cz);
          continue;
        }
        if (c.t === WALL && terr && c.mat) {
          // Low garden/ruin walls (2 blocks) so the monuments inside stay visible from the camera.
          for (let k = 0; k < 2; k++) add(tmat(c.mat, 'wall'), cx, c.h + k + 0.5, cz);
          for (let k = 1; k <= 2; k++) add(tmat(c.mat, 'side'), cx, c.h - k + 0.5, cz);
          continue;
        }
        if (c.t === FLOOR) {
          const m = c.surf === 'path' ? path : c.surf === 'alt' ? alt : floor;
          add(m, cx, c.h - 0.5, cz);
          const edge = [at(x + 1, z), at(x - 1, z), at(x, z + 1), at(x, z - 1)].some((n) => open(n));
          if (edge) for (let k = 1; k <= CLIFF_DEPTH; k++) add(k > 2 ? cliffDeep : cliff, cx, c.h - 0.5 - k, cz);
          // Clutter where floor meets a back wall: bolted plates and cable runs.
          const hh = ((x * 2654435761) ^ (z * 40503)) >>> 0;
          if (at(x - 1, z)?.t === WALL && hh % 5 === 0) add(bolt, x + 0.12, c.h + 0.03, cz, 0.16, 0.06, 0.7);
          if (at(x, z - 1)?.t === WALL && hh % 6 === 1) add(bolt, cx, c.h + 0.03, z + 0.12, 0.7, 0.06, 0.16);
          // Glowing guard rail on front edges.
          if (open(at(x + 1, z))) add(rail, x + 1, c.h + 0.04, cz, 0.08, 0.08, 1);
          if (open(at(x, z + 1))) add(rail, cx, c.h + 0.04, z + 1, 1, 0.08, 0.08);
        } else if (c.t === WALL) {
          const base = c.h;
          for (let k = 0; k < WALL_BLOCKS; k++) {
            const m = c.window && k === 1 ? windowMat : k === 0 ? wallDark : wall;
            add(m, cx, base + k + 0.5, cz);
          }
          add(top, cx, base + WALL_BLOCKS + 0.06, cz, 1, 0.12, 1);
          // Neon trim on the faces that look onto the floor.
          if (at(x + 1, z)?.t === FLOOR) add(trim, x + 1.01, base + 2.3, cz, 0.04, 0.1, 1);
          if (at(x, z + 1)?.t === FLOOR) add(trim, cx, base + 2.3, z + 1.01, 1, 0.1, 0.04);
          if (at(x + 1, z)?.t === FLOOR) add(trim, x + 1.01, base + 0.12, cz, 0.04, 0.06, 1);
          if (at(x, z + 1)?.t === FLOOR) add(trim, cx, base + 0.12, z + 1.01, 1, 0.06, 0.04);
          for (let k = 1; k <= CLIFF_DEPTH - 1; k++) add(cliffDeep, cx, base - 0.5 - k + 1, cz);
          // Greebles on the faces you can see: pipes, vents, lamps and conduit runs (deterministic per cell).
          const h = ((x * 73856093) ^ (z * 19349663)) >>> 0;
          const faces: [number, number][] = [];
          if (at(x + 1, z)?.t === FLOOR) faces.push([1, 0]);
          if (at(x, z + 1)?.t === FLOOR) faces.push([0, 1]);
          for (const [fx, fz] of faces) {
            const ox = fx ? x + 1.06 : cx;
            const oz = fz ? z + 1.06 : cz;
            const sx = (w: number) => (fx ? 0.12 : w);
            const sz = (w: number) => (fz ? 0.12 : w);
            const kind = h % 7;
            if (kind === 0 && !c.window) {
              add(pipe, ox, base + 1.3, oz, sx(0.16), 2.3, sz(0.16));
              add(bolt, ox, base + 0.45, oz, sx(0.24), 0.08, sz(0.24));
              add(bolt, ox, base + 2.15, oz, sx(0.24), 0.08, sz(0.24));
            } else if (kind === 1 && !c.window) add(vent, ox - fx * 0.03, base + 1.2, oz - fz * 0.03, sx(0.62), 0.5, sz(0.62));
            else if (kind === 2) {
              add(bolt, ox, base + 1.72, oz, sx(0.3), 0.16, sz(0.3));
              add(lamp, ox + fx * 0.02, base + 1.66, oz + fz * 0.02, sx(0.18), 0.05, sz(0.18));
            } else if (kind === 3) add(pipe, ox, base + 0.62, oz, sx(1), 0.1, sz(1));
          }
        }
      }

    for (const batch of batches.values()) {
      const mesh = new THREE.InstancedMesh(this.unit, batch.material, batch.matrices.length);
      batch.matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.instanceMatrix.needsUpdate = true;
      const isFloor = batch.material === floor || batch.material === alt || batch.material === path;
      mesh.receiveShadow = true;
      mesh.castShadow = !isFloor && batch.material !== rail;
      mesh.computeBoundingSphere();
      this.meshes.push(mesh);
      this.group.add(mesh);
    }
  }

  clear() {
    for (const m of this.meshes) this.group.remove(m);
    this.meshes = [];
  }

  dispose() {
    this.clear();
    this.unit.dispose();
  }

  /** Opens the secret corridor and reveals the hidden room. */
  unlockSecret() {
    for (const c of this.map.cells)
      if (c.secret) {
        c.t = FLOOR;
        c.secret = false;
        c.surf = 'path';
        c.room = -1;
      }
    this.hiddenRoom = null;
    computeWalls(this.map);
    this.build();
  }

  solid(x: number, z: number): boolean {
    const c = this.cell(x, z);
    return !c || c.t !== FLOOR || !!c.solid || this.hidden(c);
  }

  heightAt(x: number, z: number): number {
    const c = this.cell(x, z);
    return c && c.t === FLOOR ? c.h : 0;
  }

  roomAt(x: number, z: number): number {
    return this.cell(x, z)?.room ?? -1;
  }

  /** Moves a circle through the grid, sliding along walls. Mutates pos. */
  move(pos: THREE.Vector3, dx: number, dz: number, r: number) {
    const blocked = (x: number, z: number) =>
      this.solid(x - r, z - r) || this.solid(x + r, z - r) || this.solid(x - r, z + r) || this.solid(x + r, z + r);
    if (!blocked(pos.x + dx, pos.z)) pos.x += dx;
    if (!blocked(pos.x, pos.z + dz)) pos.z += dz;
  }

  /** True if the straight line between two points crosses no solid cell. */
  clearLine(ax: number, az: number, bx: number, bz: number) {
    const steps = Math.ceil(Math.hypot(bx - ax, bz - az) * 2);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const c = this.cell(ax + (bx - ax) * t, az + (bz - az) * t);
      if (!c || c.t === WALL) return false;
    }
    return true;
  }
}

// ── Light pool ───────────────────────────────────────────────────────────────

export type LightSource = { pos: THREE.Vector3; color: THREE.Color; intensity: number; distance: number; flicker?: number };

/** A fixed number of point lights reassigned to the nearest sources (no shader recompiles). */
export class LightPool {
  lights: THREE.PointLight[] = [];
  sources: LightSource[] = [];
  private t = 0;
  constructor(scene: THREE.Scene, count: number) {
    for (let i = 0; i < count; i++) {
      const l = new THREE.PointLight('#ffffff', 0, 8, 1.3);
      scene.add(l);
      this.lights.push(l);
    }
  }
  update(target: THREE.Vector3, dt: number, time: number) {
    this.t -= dt;
    if (this.t <= 0) {
      this.t = 0.25;
      const sorted = [...this.sources].sort((a, b) => a.pos.distanceToSquared(target) - b.pos.distanceToSquared(target));
      this.lights.forEach((l, i) => {
        const s = sorted[i];
        l.userData.src = s ?? null;
        if (!s) {
          l.intensity = 0;
          return;
        }
        l.position.copy(s.pos);
        l.color.copy(s.color);
        l.distance = s.distance;
      });
    }
    for (const l of this.lights) {
      const s = l.userData.src as LightSource | null;
      if (!s) continue;
      // Lambert surfaces take point light more directly than the old PBR ones; keep pools soft.
      const boost = 2.4;
      const flicker = s.flicker ? 1 + Math.sin(time * 13 + s.pos.x) * s.flicker * 0.5 + (Math.random() - 0.5) * s.flicker * 0.3 : 1;
      l.intensity = s.intensity * flicker * boost;
    }
  }
  dispose(scene: THREE.Scene) {
    this.lights.forEach((l) => scene.remove(l));
  }
}

// ── Particles ────────────────────────────────────────────────────────────────

export class Ambient {
  points: THREE.Points;
  private vel: Float32Array;
  private kind: Biome['particles'];
  private box: { x: number; z: number; w: number; d: number };
  constructor(kind: Biome['particles'], color: string, box: { x: number; z: number; w: number; d: number }, count = 240) {
    this.kind = kind;
    this.box = box;
    const pos = new Float32Array(count * 3);
    this.vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) this.reset(pos, i, true);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const colors: Record<string, string> = { embers: '#fb923c', sparks: '#f0abfc', motes: '#e0f2fe', stars: '#ffffff', pollen: '#fef08a', data: color, snow: '#ffffff' };
    this.points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: colors[kind ?? 'motes'] ?? color,
        size: kind === 'stars' ? 2 : 3,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.points.frustumCulled = false;
  }
  private reset(pos: Float32Array, i: number, initial = false) {
    const b = this.box;
    const k = this.kind;
    pos[i * 3] = b.x + Math.random() * b.w;
    pos[i * 3 + 2] = b.z + Math.random() * b.d;
    if (k === 'stars') pos[i * 3 + 1] = -6 - Math.random() * 20;
    else pos[i * 3 + 1] = initial ? Math.random() * 5 : k === 'snow' ? 6 : -0.5;
    const v = this.vel;
    v[i * 3] = (Math.random() - 0.5) * 0.3;
    v[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
    v[i * 3 + 1] =
      k === 'embers' ? 0.6 + Math.random() * 0.8 : k === 'sparks' ? 1 + Math.random() * 2 : k === 'data' ? 0.4 + Math.random() * 0.5 : k === 'stars' ? 0 : 0.1 + Math.random() * 0.2;
  }
  update(dt: number) {
    const attr = this.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    const pos = attr.array as Float32Array;
    const n = pos.length / 3;
    for (let i = 0; i < n; i++) {
      pos[i * 3] += this.vel[i * 3] * dt;
      pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      if (this.kind !== 'stars' && pos[i * 3 + 1] > 6) this.reset(pos, i);
    }
    attr.needsUpdate = true;
  }
  dispose() {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}

// ── Voxel burst FX ───────────────────────────────────────────────────────────

export class Bursts {
  group = new THREE.Group();
  private items: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number; spin: THREE.Vector3 }[] = [];
  private geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  private mats = new Map<string, THREE.Material>();
  spawn(at: THREE.Vector3, color: string, count = 14, speed = 3, glowing = true) {
    let m = this.mats.get(color);
    if (!m) {
      m = glowing ? new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2) }) : new THREE.MeshLambertMaterial({ color });
      this.mats.set(color, m);
    }
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.geo, m);
      mesh.position.copy(at);
      const vel = new THREE.Vector3((Math.random() - 0.5) * speed, Math.random() * speed + 1, (Math.random() - 0.5) * speed);
      this.group.add(mesh);
      this.items.push({ mesh, vel, life: 0.5 + Math.random() * 0.5, spin: new THREE.Vector3(Math.random() * 8, Math.random() * 8, 0) });
    }
  }
  update(dt: number, floor: (x: number, z: number) => number) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.life -= dt;
      it.vel.y -= 9 * dt;
      it.mesh.position.addScaledVector(it.vel, dt);
      const f = floor(it.mesh.position.x, it.mesh.position.z) + 0.05;
      if (it.mesh.position.y < f) {
        it.mesh.position.y = f;
        it.vel.multiplyScalar(0.4);
        it.vel.y = Math.abs(it.vel.y) * 0.3;
      }
      it.mesh.rotation.x += it.spin.x * dt;
      it.mesh.rotation.y += it.spin.y * dt;
      it.mesh.scale.setScalar(Math.max(0.01, Math.min(1, it.life * 2)));
      if (it.life <= 0) {
        this.group.remove(it.mesh);
        this.items.splice(i, 1);
      }
    }
  }
  dispose() {
    this.geo.dispose();
    this.mats.forEach((m) => m.dispose());
  }
}

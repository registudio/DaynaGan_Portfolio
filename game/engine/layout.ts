import type { Level, Portfolio } from '@/lib/portfolio';
import type { GitHubFeed } from '@/lib/github';
import { BIOMES, type PropKind } from './biomes.ts';
import { rng } from './rng.ts';
import { BOSSES, PUZZLES } from './missions.ts';
import { TRIAL_INFO, trialSlots, trialType, type TrialType } from './trials.ts';

/**
 * Turns a content level into a tile map + spawn list. Rooms are laid out as a
 * zig-zag chain joined by corridors: back walls (−x/−z) are tall, front edges
 * drop into the abyss (Minecraft Dungeons style) so nothing blocks the camera.
 */

export const VOID = 0;
export const FLOOR = 1;
export const WALL = 2;

export type Cell = {
  t: 0 | 1 | 2;
  h: number;
  room: number;
  surf: 'floor' | 'alt' | 'path' | 'glow';
  solid?: boolean;
  secret?: boolean;
  window?: boolean;
  /** Terrain key into the biome's `terrain` palette (open-world planet). */
  mat?: string;
};

export type RoomRect = {
  i: number;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  kind: 'entry' | 'content' | 'cavern' | 'vault' | 'secret' | 'hub' | 'trial';
  roomId?: string;
  title?: string;
};

export type HazardKind = 'conveyor' | 'laser' | 'capacitor' | 'emp';
export type TrialPoint = 'button' | 'cover' | 'crate' | 'plate' | 'breaker' | 'cell' | 'socket';

export type Spawn =
  | { kind: 'console'; x: number; z: number; roomId: string }
  | { kind: 'terminal'; x: number; z: number; roomId: string; partId: string }
  | { kind: 'npc'; x: number; z: number; roomId: string; look: number }
  | { kind: 'part'; x: number; z: number; projectId: string; partId: string; carried?: boolean }
  | { kind: 'assembly'; x: number; z: number; projectId: string; wip: boolean }
  | { kind: 'shelf'; x: number; z: number; projectId: string }
  | { kind: 'matrix'; x: number; z: number; roomId: string }
  | { kind: 'repo'; x: number; z: number; index: number }
  | { kind: 'grid'; x: number; z: number; w: number; d: number }
  | { kind: 'relay'; x: number; z: number; id: string }
  | { kind: 'dish'; x: number; z: number }
  | { kind: 'transmitter'; x: number; z: number }
  | { kind: 'exit'; x: number; z: number }
  | { kind: 'home'; x: number; z: number }
  | { kind: 'screw'; id: string; x: number; z: number }
  | { kind: 'enemy'; x: number; z: number; type: string; room: number }
  | { kind: 'boss'; x: number; z: number; room: number; type: string }
  | { kind: 'spawner'; id: string; x: number; z: number; room: number; type: string }
  | { kind: 'hazard'; type: HazardKind; x: number; z: number; dir: 0 | 1; len: number; room: number; phase?: number; push?: 1 | -1 }
  | {
      kind: 'trial';
      id: string;
      type: TrialType;
      room: number;
      x: number;
      z: number;
      gate: { x: number; z: number; cells: { x: number; z: number }[] };
      entry: { x: number; z: number; cells: { x: number; z: number }[] } | null;
      points: { role: TrialPoint; x: number; z: number }[];
    }
  | { kind: 'barrier'; id: string; cells: { x: number; z: number }[]; x: number; z: number }
  | { kind: 'pnode'; id: string; index: number; x: number; z: number }
  | { kind: 'phint'; id: string; x: number; z: number }
  | { kind: 'prop'; x: number; z: number; prop: PropKind; rot: number }
  | { kind: 'centerpiece'; x: number; z: number; what: string }
  | { kind: 'secret'; x: number; z: number }
  | { kind: 'backroom'; x: number; z: number }
  | { kind: 'hub'; x: number; z: number; what: 'starmap' | 'bunk' | 'catbed' | 'locker' | 'vendor' | 'pad' | 'earth' | 'planet' | 'shuttle' };

export type LevelMap = {
  id: string;
  biome: string;
  w: number;
  d: number;
  cells: Cell[];
  rooms: RoomRect[];
  spawn: { x: number; z: number };
  spawns: Spawn[];
};

/** Footprint of a room inside its rectangle (cells outside it drop away or become wall). */
export type RoomShape = 'rect' | 'octagon' | 'round' | 'cross' | 'notch' | 'cave';

type RoomSpec = {
  w: number;
  d: number;
  kind: RoomRect['kind'];
  roomId?: string;
  title?: string;
  h?: number;
  shape?: RoomShape;
  /** How this room joins the previous one: along +x or +z. */
  link?: 'x' | 'z';
  /** Corridor length into this room. */
  gap?: number;
  /** Sideways shift against the previous room (cells). */
  offset?: number;
  /** Corridor half-width into this room (1 → 3 wide, 2 → 5 wide). */
  half?: number;
};

const CORRIDOR = 4;

class Builder {
  w = 0;
  d = 0;
  cells: Cell[] = [];
  rooms: RoomRect[] = [];
  spawns: Spawn[] = [];
  used = new Set<string>();
  doors: { x: number; z: number }[] = [];
  /** Door cells per room, with the corridor half-width, so shaped rooms keep their doorways. */
  private roomDoors: { room: number; x: number; z: number; axis: 'x' | 'z'; half: number }[] = [];
  private shapes = new Map<number, RoomShape>();
  /** Decorative inlay cells (rings, stripes) painted after carving. */
  private inlays: { x: number; z: number }[] = [];
  corridors: { a: number; b: number; cells: { x: number; z: number }[] }[] = [];
  private raw: { x: number; z: number; h: number; room: number; surf: Cell['surf'] }[] = [];
  private secretRaw: { x: number; z: number; h: number }[] = [];

  chain(specs: RoomSpec[], climb = 0) {
    let prev: RoomRect | null = null;
    specs.forEach((spec, i) => {
      const h = spec.h ?? i * climb;
      const axis = spec.link ?? (i % 2 === 1 ? 'x' : 'z');
      const gap = spec.gap ?? CORRIDOR;
      const off = spec.offset ?? 0;
      let x = 0;
      let z = 0;
      if (prev) {
        const p: RoomRect = prev;
        // Push the room further out until it clears every earlier room (offsets can swing it back).
        for (let g = gap; g < gap + 24; g++) {
          if (axis === 'x') {
            x = p.x + p.w + g;
            z = Math.round(p.z + p.d / 2 - spec.d / 2) + off;
          } else {
            z = p.z + p.d + g;
            x = Math.round(p.x + p.w / 2 - spec.w / 2) + off;
          }
          const clash = this.rooms.some((r) => x < r.x + r.w + 2 && x + spec.w + 2 > r.x && z < r.z + r.d + 2 && z + spec.d + 2 > r.z);
          if (!clash) break;
        }
      }
      const room: RoomRect = { i, x, z, w: spec.w, d: spec.d, h, kind: spec.kind, roomId: spec.roomId, title: spec.title };
      this.addRoom(room, spec.shape);
      if (prev) this.corridor(prev, room, axis, false, spec.half ?? 1);
      prev = room;
    });
    return this.rooms;
  }

  addRoom(room: RoomRect, shape: RoomShape = 'rect') {
    this.rooms.push(room);
    if (shape !== 'rect') this.shapes.set(room.i, shape);
    for (let x = room.x; x < room.x + room.w; x++)
      for (let z = room.z; z < room.z + room.d; z++)
        this.raw.push({ x, z, h: room.h, room: room.i, surf: (x + z) % 2 === 0 ? 'floor' : 'alt' });
  }

  corridor(a: RoomRect, b: RoomRect, axis: 'x' | 'z', secret = false, half = 1) {
    const cells: { x: number; z: number }[] = [];
    if (!secret) this.corridors.push({ a: a.i, b: b.i, cells });
    const push = (x: number, z: number, h: number) => {
      cells.push({ x, z });
      if (secret) this.secretRaw.push({ x, z, h });
      else this.raw.push({ x, z, h, room: -1, surf: 'path' });
    };
    if (axis === 'x') {
      const lo = Math.max(a.z, b.z);
      const hi = Math.min(a.z + a.d, b.z + b.d);
      const cz = Math.floor((lo + hi) / 2);
      const x0 = a.x + a.w;
      const x1 = b.x;
      for (let x = x0; x < x1; x++)
        for (let z = cz - half; z <= cz + half; z++) push(x, z, a.h + ((b.h - a.h) * (x - x0 + 1)) / (x1 - x0 + 1));
      this.doors.push({ x: x0 - 1, z: cz }, { x: x1, z: cz });
      this.roomDoors.push({ room: a.i, x: x0 - 1, z: cz, axis, half }, { room: b.i, x: x1, z: cz, axis, half });
    } else {
      const lo = Math.max(a.x, b.x);
      const hi = Math.min(a.x + a.w, b.x + b.w);
      const cx = Math.floor((lo + hi) / 2);
      const z0 = a.z + a.d;
      const z1 = b.z;
      for (let z = z0; z < z1; z++)
        for (let x = cx - half; x <= cx + half; x++) push(x, z, a.h + ((b.h - a.h) * (z - z0 + 1)) / (z1 - z0 + 1));
      this.doors.push({ x: cx, z: z0 - 1 }, { x: cx, z: z1 });
      this.roomDoors.push({ room: a.i, x: cx, z: z0 - 1, axis, half }, { room: b.i, x: cx, z: z1, axis, half });
    }
  }

  /** Is local cell (u, v) of a w×d room inside `shape`? */
  static inside(shape: RoomShape, u: number, v: number, w: number, d: number, seed: number) {
    const fx = (u + 0.5 - w / 2) / (w / 2);
    const fz = (v + 0.5 - d / 2) / (d / 2);
    const m = Math.min(w, d);
    switch (shape) {
      case 'octagon': {
        const c = Math.round(m * 0.3);
        return u + v >= c && w - 1 - u + v >= c && u + (d - 1 - v) >= c && w - 1 - u + (d - 1 - v) >= c;
      }
      case 'round':
        return fx * fx + fz * fz <= 1.12;
      case 'cross': {
        const c = Math.round(m * 0.26);
        const inX = u < c || u >= w - c;
        const inZ = v < c || v >= d - c;
        return !(inX && inZ);
      }
      case 'notch': {
        // An L: the front (+x/+z) corner drops into the abyss, the back corner is chamfered.
        const front = u >= Math.round(w * 0.62) && v >= Math.round(d * 0.62);
        return !front && u + v >= 2;
      }
      case 'cave': {
        const hsh = Math.sin((u + seed * 7.13) * 12.9898 + (v - seed) * 78.233) * 43758.5453;
        const noise = hsh - Math.floor(hsh);
        return fx * fx * fx * fx + fz * fz * fz * fz <= 0.62 + noise * 0.42 || (Math.abs(fx) < 0.55 && Math.abs(fz) < 0.55);
      }
      default:
        return true;
    }
  }

  /** Paint a decorative ring (or stripe) of path tiles into a room, applied at finalize. */
  inlay(room: RoomRect, kind: 'ring' | 'stripe') {
    const cx = room.x + room.w / 2;
    const cz = room.z + room.d / 2;
    const r = Math.min(room.w, room.d) * 0.3;
    for (let x = room.x; x < room.x + room.w; x++)
      for (let z = room.z; z < room.z + room.d; z++) {
        const dist = Math.hypot(x + 0.5 - cx, z + 0.5 - cz);
        if (kind === 'ring' ? Math.abs(dist - r) < 0.5 : Math.abs(x + 0.5 - cx) < 1 || Math.abs(z + 0.5 - cz) < 1) this.inlays.push({ x, z });
      }
  }

  /** A room behind `from`'s back (−z) wall joined by a hidden corridor. */
  secretRoom(from: RoomRect, spec: RoomSpec) {
    const room: RoomRect = {
      i: this.rooms.length,
      x: Math.round(from.x + from.w / 2 - spec.w / 2),
      z: from.z - CORRIDOR - spec.d,
      w: spec.w,
      d: spec.d,
      h: from.h,
      kind: 'secret',
      roomId: spec.roomId,
      title: spec.title,
    };
    this.addRoom(room);
    // Corridor runs from the secret room (a) to `from` (b) along z.
    this.corridor(room, from, 'z', true);
    return room;
  }

  /** Drops the cells of shaped rooms that fall outside their shape, keeping every doorway clear. */
  private carve() {
    if (!this.shapes.size) return;
    const keep = (c: { x: number; z: number; room: number }) => {
      const shape = this.shapes.get(c.room);
      if (!shape) return true;
      const r = this.rooms[c.room];
      for (const dr of this.roomDoors) {
        if (dr.room !== c.room) continue;
        // A straight lane from each door into the room, a cell wider than the corridor.
        const along = dr.axis === 'x' ? Math.abs(c.z - dr.z) : Math.abs(c.x - dr.x);
        const depth = dr.axis === 'x' ? Math.abs(c.x - dr.x) : Math.abs(c.z - dr.z);
        if (along <= dr.half + 1 && depth <= 4) return true;
      }
      return Builder.inside(shape, c.x - r.x, c.z - r.z, r.w, r.d, r.i);
    };
    this.raw = this.raw.filter((c) => c.room < 0 || keep(c));
  }

  finalize(margin = 4) {
    this.carve();
    const all = [...this.raw, ...this.secretRaw];
    const minX = Math.min(...all.map((c) => c.x)) - margin;
    const minZ = Math.min(...all.map((c) => c.z)) - margin;
    const maxX = Math.max(...all.map((c) => c.x)) + margin;
    const maxZ = Math.max(...all.map((c) => c.z)) + margin;
    this.w = maxX - minX + 1;
    this.d = maxZ - minZ + 1;
    this.cells = Array.from({ length: this.w * this.d }, () => ({ t: VOID, h: 0, room: -1, surf: 'floor' }) as Cell);
    for (const c of this.raw) {
      const cell = this.cell(c.x - minX, c.z - minZ)!;
      if (cell.t === FLOOR && cell.room >= 0) continue;
      Object.assign(cell, { t: FLOOR, h: c.h, room: c.room, surf: c.surf });
    }
    for (const r of this.rooms) {
      r.x -= minX;
      r.z -= minZ;
    }
    this.doors = this.doors.map((d) => ({ x: d.x - minX, z: d.z - minZ }));
    for (const c of this.corridors) c.cells = c.cells.map((p) => ({ x: p.x - minX, z: p.z - minZ }));
    for (const p of this.inlays) {
      const cell = this.cell(p.x - minX, p.z - minZ);
      if (cell && cell.t === FLOOR && cell.room >= 0) cell.surf = 'path';
    }
    this.walls();
    for (const c of this.secretRaw) {
      const cell = this.cell(c.x - minX, c.z - minZ)!;
      if (cell.t !== FLOOR) Object.assign(cell, { t: WALL, h: c.h, secret: true, room: -1, surf: 'path' });
    }
    return { dx: -minX, dz: -minZ };
  }

  cell(x: number, z: number) {
    if (x < 0 || z < 0 || x >= this.w || z >= this.d) return undefined;
    return this.cells[z * this.w + x];
  }

  private walls() {
    computeWalls(this);
  }

  isFree(x: number, z: number, pad = 1) {
    const fx = Math.floor(x);
    const fz = Math.floor(z);
    for (let dx = -pad; dx <= pad; dx++)
      for (let dz = -pad; dz <= pad; dz++) {
        const c = this.cell(fx + dx, fz + dz);
        if (!c || c.t !== FLOOR || c.solid) return false;
        if (this.used.has(`${fx + dx},${fz + dz}`)) return false;
      }
    return true;
  }

  claim(x: number, z: number, pad = 0) {
    const fx = Math.floor(x);
    const fz = Math.floor(z);
    for (let dx = -pad; dx <= pad; dx++) for (let dz = -pad; dz <= pad; dz++) this.used.add(`${fx + dx},${fz + dz}`);
  }

  nearDoor(x: number, z: number, dist = 2.5) {
    return this.doors.some((d) => Math.abs(d.x - x) <= dist && Math.abs(d.z - z) <= dist);
  }

  /**
   * Candidate interactable spots inside a room, on a ring inset from the walls so every
   * trigger circle can be walked into from any side: back row first, then the sides, then the front.
   */
  spots(room: RoomRect, gap = 2.6, inset = 2.5): { x: number; z: number }[] {
    const out: { x: number; z: number }[] = [];
    // Skip doors and anything already placed (puzzle nodes, barriers…) so each ring stays clear.
    const add = (x: number, z: number) => {
      if (!this.nearDoor(x, z, 1.6) && this.isFree(x, z, 1)) out.push({ x, z });
    };
    const x0 = room.x + inset;
    const x1 = room.x + room.w - inset;
    const z0 = room.z + inset;
    const z1 = room.z + room.d - inset;
    for (let x = x0; x <= x1 + 0.01; x += gap) add(x, z0);
    for (let z = z0 + gap; z <= z1 - gap / 2; z += gap) add(x0, z);
    for (let z = z0 + gap; z <= z1 - gap / 2; z += gap) add(x1, z);
    for (let x = x0 + gap; x <= x1 - gap / 2; x += gap) add(x, z1);
    return out;
  }

  randomFree(room: RoomRect, rand: () => number, pad = 1, inset = 2): { x: number; z: number } | null {
    for (let tries = 0; tries < 60; tries++) {
      const x = room.x + inset + rand() * (room.w - inset * 2);
      const z = room.z + inset + rand() * (room.d - inset * 2);
      if (this.isFree(x, z, pad) && !this.nearDoor(x, z)) return { x: Math.floor(x) + 0.5, z: Math.floor(z) + 0.5 };
    }
    return null;
  }

  decorate(biome: string, rand: () => number, density = 0.16) {
    const props = BIOMES[biome]?.props ?? [];
    if (!props.length) return;
    const floorAt = (x: number, z: number) => this.cell(x, z)?.t === FLOOR;
    for (const room of this.rooms) {
      for (let x = room.x; x < room.x + room.w; x++)
        for (let z = room.z; z < room.z + room.d; z++) {
          const c = this.cell(x, z);
          if (!c || c.t !== FLOOR || c.room !== room.i) continue;
          // The room's rim, whatever its shape: a neighbour that isn't floor.
          const back = !floorAt(x - 1, z) || !floorAt(x, z - 1);
          const front = !floorAt(x + 1, z) || !floorAt(x, z + 1);
          if ((!back && !front) || rand() > density) continue;
          if (this.nearDoor(x, z, 2) || this.used.has(`${x},${z}`)) continue;
          // Keep front edges mostly open.
          if (front && !back && rand() > 0.35) continue;
          const prop = props[Math.floor(rand() * props.length)];
          c.solid = true;
          this.claim(x, z);
          this.spawns.push({ kind: 'prop', x: x + 0.5, z: z + 0.5, prop, rot: Math.floor(rand() * 4) });
        }
    }
  }

  result(id: string, biome: string, spawn: { x: number; z: number }): LevelMap {
    return { id, biome, w: this.w, d: this.d, cells: this.cells, rooms: this.rooms, spawn, spawns: this.spawns };
  }
}

/** Turns void cells behind (−x/−z of) floor into walls. Re-run after opening a secret. */
export function computeWalls(map: { w: number; d: number; cells: Cell[] }) {
  const at = (x: number, z: number) =>
    x < 0 || z < 0 || x >= map.w || z >= map.d ? undefined : map.cells[z * map.w + x];
  for (let z = 0; z < map.d; z++)
    for (let x = 0; x < map.w; x++) {
      const c = at(x, z)!;
      if (c.t !== VOID) continue;
      const back = [at(x + 1, z), at(x, z + 1), at(x + 1, z + 1)].filter((n) => n?.t === FLOOR);
      if (back.length) {
        c.t = WALL;
        c.h = Math.max(...back.map((n) => n!.h));
      }
    }
}

const ENEMIES: Record<string, string[]> = {
  'spark-wisps': ['wisp'],
  'welder-arms, scrap-crawlers': ['welder', 'crawler'],
  'short-circuit-bugs': ['bug'],
  'malware-packets': ['packet'],
  'static-drones': ['drone'],
  'pop-quiz-drones': ['drone', 'wisp'],
  'dust-bots': ['crawler', 'packet'],
  'pest-bugs': ['bug', 'crawler'],
};

function enemyTypes(level: Level): string[] {
  const list = level.meta.enemies ?? 'none';
  if (list === 'none') return [];
  return (
    ENEMIES[list] ??
    list
      .split(',')
      .map((s) => s.trim().replace(/s$/, ''))
      .filter(Boolean)
  );
}

function roomSize(parts: number): { w: number; d: number } {
  // Roomy enough that terminals, their rings and a fight all fit without crowding.
  const w = Math.min(23, Math.max(13, 9 + Math.ceil(parts / 2) * 3));
  return { w, d: parts > 6 ? 15 : 13 };
}

const RANGED = new Set(['welder', 'drone']);

/**
 * Encounter groups with readable roles: a pressure pack of melee bots at the room's middle,
 * ranged support at the back (far side from where you enter), and — in some rooms — a
 * fabricator as the reinforcement source (placed separately).
 */
function spawnEnemies(b: Builder, level: Level, rand: () => number, peaceful: boolean, rooms: RoomRect[], count = 2) {
  const types = enemyTypes(level);
  if (!types.length || peaceful) return;
  const melee = types.filter((t) => !RANGED.has(t));
  const ranged = types.filter((t) => RANGED.has(t));
  const pressure = melee.length ? melee : types;
  const support = ranged.length ? ranged : ['drone'];
  rooms.forEach((room, r) => {
    const n = count + Math.floor(rand() * 2);
    // Pressure: clustered around the room centre.
    for (let k = 0; k < n; k++) {
      const p = b.randomFree(room, rand, 0, Math.max(3, Math.floor(Math.min(room.w, room.d) / 3)));
      if (p) b.spawns.push({ kind: 'enemy', x: p.x, z: p.z, type: pressure[k % pressure.length], room: room.i });
    }
    // Ranged support from the second combat room on, near the back wall.
    if (r === 0) return;
    for (let k = 0; k < 1 + (r > 2 ? 1 : 0); k++) {
      // "Back" = the side opposite the corridor you arrive through.
      const into = b.corridors.find((c) => c.b === room.i);
      const fromX = !!into && into.cells[0].x < room.x;
      for (let t = 0; t < 30; t++) {
        const along = 2 + rand() * ((fromX ? room.d : room.w) - 4);
        const depth = 2 + rand() * 2.5;
        const x = fromX ? room.x + room.w - depth : room.x + along;
        const z = fromX ? room.z + along : room.z + room.d - depth;
        if (!b.isFree(x, z, 0) || b.nearDoor(x, z)) continue;
        b.spawns.push({ kind: 'enemy', x: Math.floor(x) + 0.5, z: Math.floor(z) + 0.5, type: support[k % support.length], room: room.i });
        break;
      }
    }
  });
}

function entryRoom(b: Builder, room: RoomRect, what: string) {
  const cx = room.x + room.w / 2;
  const cz = room.z + room.d / 2;
  b.spawns.push({ kind: 'exit', x: cx - 2, z: cz + 2 });
  b.claim(cx - 2, cz + 2, 1);
  b.spawns.push({ kind: 'centerpiece', x: cx + 0.5, z: room.z + 2.5, what });
  const c = b.cell(Math.floor(cx + 0.5), Math.floor(room.z + 2.5));
  b.claim(cx + 0.5, room.z + 2.5, 1);
  if (c) c.solid = true;
  return { x: cx, z: cz + 1 };
}

/**
 * Each mission's own floor plan: how rooms join (the route), corridor lengths and widths,
 * room shapes and heights. Entry and trial rooms stay rectangular (their set pieces need it).
 *   Core Reactor     — zig-zag of round reactor chambers joined by wide halls
 *   Academy Spires   — a stair-step climb (two east, two south) over long bridges, octagonal spires
 *   Robot Forge      — one long assembly line heading east, L-shaped bays staggered either side
 *   Circuit Caverns  — a wandering route through jagged caves, sloping down
 *   Trophy Hall      — a grand gallery of cross-shaped halls
 *   Colony Commons   — round plazas heading south over gentle terraces
 *   Mainframe        — a straight data bus running south, server halls offset left and right
 *   Comms Array      — octagonal platforms climbing steadily to the summit
 */
type Recipe = {
  links: ('x' | 'z')[] | ((i: number, rand: () => number) => 'x' | 'z');
  shape?: RoomShape | ((spec: RoomSpec, i: number) => RoomShape);
  gap?: number | ((i: number, rand: () => number) => number);
  offset?: (i: number, rand: () => number) => number;
  half?: number | ((i: number, rand: () => number) => number);
  height?: (i: number, climb: number) => number;
  grow?: number;
  inlay?: 'ring' | 'stripe';
};

export const RECIPES: Record<string, Recipe> = {
  about: { links: ['x', 'z'], shape: 'round', gap: 5, half: 2, grow: 3, inlay: 'ring' },
  education: { links: ['x', 'x', 'z', 'z'], shape: 'octagon', gap: 6, half: 1, grow: 2, height: (i, climb) => i * climb },
  experience: { links: ['x'], shape: 'notch', gap: 3, half: 2, offset: (i) => (i % 2 ? 3 : -3), grow: 1, inlay: 'stripe' },
  projects: {
    links: (i, rand) => (i === 1 ? 'x' : rand() < 0.55 ? 'x' : 'z'),
    shape: 'cave',
    gap: (_, rand) => 3 + Math.floor(rand() * 5),
    offset: (_, rand) => Math.round((rand() - 0.5) * 6),
    half: (_, rand) => (rand() < 0.3 ? 2 : 1),
    height: (i) => Math.max(0, 3 - i * 0.25),
    grow: 2,
  },
  trophies: { links: (i) => (i === 1 ? 'z' : 'x'), shape: 'cross', gap: 4, half: 2, grow: 2, inlay: 'stripe' },
  leadership: {
    links: ['z', 'z', 'x'],
    shape: 'round',
    gap: 3,
    half: 1,
    offset: (i) => [0, 2, -2][i % 3],
    height: (i) => [0, 0.75, 1.5, 0.75][i % 4],
    grow: 3,
    inlay: 'ring',
  },
  github: { links: ['z'], gap: 6, half: 1, offset: (i) => (i % 2 ? 4 : -4), inlay: 'stripe' },
  contact: { links: ['x', 'z'], shape: (spec) => (spec.roomId === 'relays' ? 'octagon' : 'round'), gap: 4, half: 2, height: (i) => i * 1, grow: 2, inlay: 'ring' },
};

function applyRecipe(levelId: string, specs: RoomSpec[], rand: () => number, climb: number) {
  const r = RECIPES[levelId];
  if (!r) return;
  const pick = <T,>(v: T | ((i: number, rand: () => number) => T) | undefined, i: number): T | undefined =>
    typeof v === 'function' ? (v as (i: number, rand: () => number) => T)(i, rand) : v;
  specs.forEach((spec, i) => {
    if (i > 0) {
      spec.link = Array.isArray(r.links) ? r.links[(i - 1) % r.links.length] : r.links(i, rand);
      spec.gap = pick(r.gap, i);
      spec.half = pick(r.half, i);
      spec.offset = r.offset?.(i, rand) ?? 0;
    }
    if (r.height) spec.h = r.height(i, climb);
    if (spec.kind === 'entry' || spec.kind === 'trial' || spec.kind === 'secret') return;
    spec.shape = typeof r.shape === 'function' ? r.shape(spec, i) : r.shape;
    // Shaped rooms lose their corners: grow them so the same content still fits.
    if (spec.shape && spec.shape !== 'rect' && r.grow) {
      spec.w += r.grow;
      spec.d += r.grow;
    }
  });
}

export function buildLevel(
  portfolio: Portfolio,
  levelId: string,
  opts: { peaceful: boolean; github: GitHubFeed },
): LevelMap {
  if (levelId === 'hub') return buildHub();
  const level = portfolio.levels.find((l) => l.id === levelId);
  if (!level) throw new Error(`No level ${levelId}`);
  const biome = level.meta.biome ?? 'orbital-station';
  const rand = rng(levelId.length * 7919 + levelId.charCodeAt(0));
  const b = new Builder();
  const climb = BIOMES[biome]?.climb ?? 0;

  const specs: RoomSpec[] = [{ w: 12, d: 12, kind: 'entry', title: level.title }];
  if (levelId === 'projects') {
    specs.push({ w: 23, d: 18, kind: 'cavern', title: 'Parts Cavern' });
    for (const r of level.rooms) specs.push({ w: 14, d: 13, kind: 'vault', roomId: r.id, title: r.title });
  } else if (levelId === 'trophies') {
    const order = ['awards', 'skill-matrix', 'shelves'];
    for (const id of order) {
      const r = level.rooms.find((x) => x.id === id);
      if (r) specs.push({ ...roomSize(id === 'awards' ? r.parts.length : 6), kind: 'content', roomId: r.id, title: r.title });
    }
  } else if (levelId === 'contact') {
    specs.push({ w: 17, d: 17, kind: 'content', roomId: 'relays', title: 'Relay Field' });
    for (const r of level.rooms) specs.push({ w: 14, d: 14, kind: 'content', roomId: r.id, title: r.title });
  } else {
    for (const r of level.rooms) specs.push({ ...roomSize(r.parts.length), kind: 'content', roomId: r.id, title: r.title });
  }
  // Trial rooms (locked dungeons with a task + hazard gauntlet) between some content rooms.
  const contentIdx = specs.map((sp, i) => (sp.kind === 'entry' ? -1 : i)).filter((i) => i >= 0);
  // The door into the final room is already the puzzle gate on puzzle missions.
  const slots = levelId === 'hub' ? [] : trialSlots(contentIdx.length).filter((sl) => !(PUZZLES[levelId] && sl === contentIdx.length - 2));
  for (const [n, slot] of [...slots.entries()].reverse()) {
    const type = trialType(levelId, n, opts.peaceful);
    specs.splice(contentIdx[slot] + 1, 0, { w: 16, d: 14, kind: 'trial', title: `Trial · ${TRIAL_INFO[type].name}`, roomId: `trial-${n}` });
  }
  applyRecipe(levelId, specs, rng(levelId.length * 131 + 17), climb);
  const rooms = b.chain(specs, climb);
  for (const r of rooms) {
    const deco = RECIPES[levelId]?.inlay;
    if (deco && (r.kind === 'content' || r.kind === 'vault' || r.kind === 'cavern')) b.inlay(r, deco);
  }
  const secret =
    levelId === 'trophies'
      ? b.secretRoom(rooms.find((r) => r.roomId === 'shelves')!, { w: 11, d: 11, kind: 'secret', roomId: 'backroom', title: 'The Backroom' })
      : null;
  b.finalize();

  const spawn = entryRoom(b, rooms[0], biome);
  const contentRooms = rooms.filter((r) => r.kind !== 'entry' && r.kind !== 'secret' && r.kind !== 'trial');

  // Puzzle nodes get first pick of floor space.
  placePuzzle(b, levelId, rooms, rand);
  if (levelId === 'projects') buildProjects(b, level, rooms, rand, opts.peaceful);
  else if (levelId === 'trophies') buildTrophies(b, level, rooms, secret!);
  else if (levelId === 'github') buildGitHub(b, level, rooms, opts.github);
  else if (levelId === 'contact') buildContact(b, rooms);
  else
    for (const room of contentRooms) {
      const content = level.rooms.find((r) => r.id === room.roomId);
      if (!content) continue;
      const cx = room.x + room.w / 2;
      if (levelId === 'leadership') {
        b.spawns.push({ kind: 'npc', x: cx, z: room.z + room.d / 2 - 1, roomId: content.id, look: room.i });
        b.claim(cx, room.z + room.d / 2 - 1, 1);
      } else {
        b.spawns.push({ kind: 'console', x: cx, z: room.z + 2.5, roomId: content.id });
        b.claim(cx, room.z + 2.5, 1);
      }
      const spots = b.spots(room).filter((s) => Math.abs(s.x - cx) > 1.8 || s.z > room.z + 3);
      content.parts
        .filter((p) => !p.todo || p.body)
        .forEach((part, k) => {
          // Crowded rooms (puzzle nodes, hint consoles) fall back to any clear floor.
          const s = spots[k] ?? b.randomFree(room, rand, 1, 2) ?? b.randomFree(room, rand, 0, 2);
          if (!s) return;
          b.spawns.push({ kind: 'terminal', x: s.x, z: s.z, roomId: content.id, partId: part.id });
          b.claim(s.x, s.z, 1);
        });
    }

  if (levelId !== 'projects' && levelId !== 'github') spawnEnemies(b, level, rand, opts.peaceful, contentRooms, 2);
  if (levelId === 'github' && !opts.peaceful) spawnEnemies(b, level, rand, false, contentRooms.slice(0, -1), 2);
  if (!opts.peaceful) {
    placeBoss(b, levelId, rooms);
    placeSpawners(b, level, levelId, rooms, rand);
  } else b.spawns = b.spawns.filter((s) => s.kind !== 'boss');
  placeHazards(b, levelId, rooms, rand);
  buildTrials(b, level, levelId, rooms, rand, opts.peaceful);
  placeScrews(b, levelId, rooms, rand);
  // Portal home in the last room (opens once the mission is cleared).
  const last = [...rooms].reverse().find((r) => r.kind !== 'secret' && r.kind !== 'entry');
  const hp = last && (b.randomFree(last, rand, 1, 2) ?? b.randomFree(last, rand, 0, 2));
  if (hp) {
    b.claim(hp.x, hp.z, 1);
    b.spawns.push({ kind: 'home', x: hp.x, z: hp.z });
  }
  b.decorate(biome, rand, levelId === 'trophies' ? 0.1 : 0.16);
  return b.result(levelId, biome, spawn);
}

/** Mini-boss arena: the last content room (Caverns: the big cavern; Comms: the relay field). */
function bossRoom(levelId: string, rooms: RoomRect[]) {
  if (!BOSSES[levelId] || levelId === 'github') return undefined;
  return levelId === 'projects'
    ? rooms.find((r) => r.kind === 'cavern')
    : levelId === 'contact'
      ? rooms.find((r) => r.roomId === 'relays')
      : [...rooms].reverse().find((r) => r.kind === 'content');
}

function placeBoss(b: Builder, levelId: string, rooms: RoomRect[]) {
  const def = BOSSES[levelId];
  const room = bossRoom(levelId, rooms);
  if (!def || !room) return;
  const p = b.randomFree(room, rng(room.x * 31 + room.z), 1, 3) ?? { x: room.x + room.w / 2, z: room.z + room.d / 2 + 1.5 };
  b.spawns.push({ kind: 'boss', x: p.x, z: p.z, room: room.i, type: def.type });
}

/**
 * Bot fabricators: destructible spawners that keep printing the level's bots while you're
 * in their room. Every combat level gets 2–3, never in the entry or mini-boss room.
 */
function placeSpawners(b: Builder, level: Level, levelId: string, rooms: RoomRect[], rand: () => number) {
  const types = levelId === 'projects' ? ['bug'] : enemyTypes(level);
  if (!types.length) return;
  const bossSpawn = b.spawns.find((s) => s.kind === 'boss');
  const bossIdx = bossSpawn?.kind === 'boss' ? bossSpawn.room : bossRoom(levelId, rooms)?.i;
  const candidates = rooms.filter((r) => r.i !== bossIdx && (r.kind === 'content' || r.kind === 'vault' || r.kind === 'cavern'));
  if (!candidates.length) return;
  // Spread them out: every other room from the second, then fill up to two by cycling rooms.
  const order = [...candidates.filter((_, k) => k % 2 === 1), ...candidates.filter((_, k) => k % 2 === 0)];
  const want = Math.min(3, Math.max(2, Math.ceil(candidates.length / 2)));
  let placed = 0;
  for (let k = 0; placed < want && k < order.length * 2; k++) {
    const room = order[k % order.length];
    const p = b.randomFree(room, rand, 1, 3) ?? b.randomFree(room, rand, 1, 2) ?? b.randomFree(room, rand, 0, 2);
    if (!p) continue;
    b.claim(p.x, p.z, 1);
    const c = b.cell(Math.floor(p.x), Math.floor(p.z));
    if (c) c.solid = true;
    b.spawns.push({ kind: 'spawner', id: `${levelId}-fab-${placed}`, x: p.x, z: p.z, room: room.i, type: types[placed % types.length] });
    placed++;
  }
}

/** Which interactive hazards each mission gets (biome-themed). */
export const HAZARDS: Record<string, Partial<Record<HazardKind, number>>> = {
  about: { capacitor: 3, emp: 1 },
  education: { laser: 2, emp: 1 },
  experience: { conveyor: 2, capacitor: 3 },
  projects: { laser: 2, capacitor: 2 },
  trophies: { capacitor: 2, laser: 1 },
  leadership: { capacitor: 2, emp: 1 },
  github: { emp: 2, laser: 1 },
  contact: { emp: 2, capacitor: 2 },
};

/**
 * Conveyors, laser grids, explosive capacitors and EMP pads, placed on clear floor in content rooms
 * (never the entry room, never on a door or anything already placed).
 */
function placeHazards(b: Builder, levelId: string, rooms: RoomRect[], rand: () => number) {
  const want = HAZARDS[levelId];
  if (!want) return;
  const pool = rooms.filter((r) => r.kind === 'content' || r.kind === 'cavern' || r.kind === 'vault');
  if (!pool.length) return;
  let k = 0;
  for (const [type, n] of Object.entries(want) as [HazardKind, number][]) {
    for (let placed = 0, tries = 0; placed < n && tries < 80; tries++) {
      const room = pool[(k + tries) % pool.length];
      const dir: 0 | 1 = rand() < 0.5 ? 0 : 1;
      const len = type === 'conveyor' ? 4 : type === 'laser' ? 4 : type === 'emp' ? 2 : 1;
      const p = b.randomFree(room, rand, 1, 2);
      if (!p) continue;
      const cells: { x: number; z: number }[] = [];
      for (let i = 0; i < len; i++) cells.push({ x: p.x + (dir === 0 ? i : 0), z: p.z + (dir === 1 ? i : 0) });
      if (type === 'emp') cells.push({ x: p.x + 1, z: p.z }, { x: p.x + 1, z: p.z + 1 });
      if (!cells.every((c) => b.isFree(c.x, c.z, 1) && !b.nearDoor(c.x, c.z, 2.5))) continue;
      for (const c of cells) b.claim(c.x, c.z, 0);
      // Capacitors and laser posts are solid; conveyors and EMP pads are floor you walk on.
      const solid = type === 'capacitor' ? [cells[0]] : type === 'laser' ? [cells[0], cells[len - 1]] : [];
      for (const c of solid) {
        const cell = b.cell(Math.floor(c.x), Math.floor(c.z));
        if (cell) cell.solid = true;
      }
      b.spawns.push({ kind: 'hazard', type, x: p.x, z: p.z, dir, len, room: room.i });
      placed++;
      k++;
    }
  }
}

/**
 * Fills each trial room: a hazard gauntlet between the entrance and the exit (staggered laser
 * sweeps, conveyors in the Forge, EMP pads, capacitors by the bots) plus the pieces of its task.
 * The exit corridor becomes the locked gate.
 */
function buildTrials(b: Builder, level: Level, levelId: string, rooms: RoomRect[], rand: () => number, peaceful: boolean) {
  const types = levelId === 'projects' ? ['bug'] : enemyTypes(level);
  rooms
    .filter((r) => r.kind === 'trial')
    .forEach((room, n) => {
      const type = trialType(levelId, n, peaceful);
      const exit = b.corridors.find((c) => c.a === room.i);
      const into = b.corridors.find((c) => c.b === room.i);
      if (!exit || !into) return;
      const x0 = room.x;
      const z0 = room.z;
      const x1 = room.x + room.w - 1;
      const z1 = room.z + room.d - 1;
      // Exit is on the +x wall or the +z wall (the chain alternates).
      const exitOnX = exit.cells[0].x > x1;
      const mid = (a: { x: number; z: number }[]) => a[Math.floor(a.length / 2)];
      const gateC = mid(exit.cells);
      const entryC = mid(into.cells);
      const free = (x: number, z: number, pad = 0) => b.isFree(x + 0.5, z + 0.5, pad) && !b.nearDoor(x + 0.5, z + 0.5, 1.6);
      const claimCell = (x: number, z: number, pad = 0) => b.claim(x + 0.5, z + 0.5, pad);
      const points: { role: TrialPoint; x: number; z: number }[] = [];
      // ── Gauntlet: two laser sweeps parallel to the exit wall, out of phase.
      for (const [k, off] of [3, 7].entries()) {
        if (exitOnX) {
          const lx = x1 - off;
          if (lx <= x0 + 1) continue;
          const zA = z0 + 1;
          const len = room.d - 2;
          const cells = Array.from({ length: len }, (_, i) => ({ x: lx, z: zA + i }));
          if (!cells.every((c) => b.isFree(c.x + 0.5, c.z + 0.5, 0))) continue;
          cells.forEach((c) => claimCell(c.x, c.z));
          for (const c of [cells[0], cells[len - 1]]) {
            const cell = b.cell(c.x, c.z);
            if (cell) cell.solid = true;
          }
          b.spawns.push({ kind: 'hazard', type: 'laser', x: lx + 0.5, z: zA + 0.5, dir: 1, len, room: room.i, phase: k * 2 });
        } else {
          const lz = z1 - off;
          if (lz <= z0 + 1) continue;
          const xA = x0 + 1;
          const len = room.w - 2;
          const cells = Array.from({ length: len }, (_, i) => ({ x: xA + i, z: lz }));
          if (!cells.every((c) => b.isFree(c.x + 0.5, c.z + 0.5, 0))) continue;
          cells.forEach((c) => claimCell(c.x, c.z));
          for (const c of [cells[0], cells[len - 1]]) {
            const cell = b.cell(c.x, c.z);
            if (cell) cell.solid = true;
          }
          b.spawns.push({ kind: 'hazard', type: 'laser', x: xA + 0.5, z: lz + 0.5, dir: 0, len, room: room.i, phase: k * 2 });
        }
      }
      // Between the sweeps: a conveyor in the Forge (shoves you sideways), EMP pads elsewhere.
      const between = exitOnX ? { x: x1 - 5, z: z0 + 3 } : { x: x0 + 3, z: z1 - 5 };
      if (levelId === 'experience') {
        const len = 4;
        const ok = Array.from({ length: len }, (_, i) => (exitOnX ? { x: between.x, z: between.z + i } : { x: between.x + i, z: between.z })).every((c) => free(c.x, c.z));
        if (ok) {
          for (let i = 0; i < len; i++) claimCell(exitOnX ? between.x : between.x + i, exitOnX ? between.z + i : between.z);
          b.spawns.push({ kind: 'hazard', type: 'conveyor', x: between.x + 0.5, z: between.z + 0.5, dir: exitOnX ? 1 : 0, len, room: room.i });
        }
      } else if (free(between.x, between.z, 1) && free(between.x + 1, between.z + 1, 0)) {
        claimCell(between.x, between.z, 1);
        b.spawns.push({ kind: 'hazard', type: 'emp', x: between.x + 0.5, z: between.z + 0.5, dir: 0, len: 2, room: room.i });
      }
      // Task pieces.
      const spot = (pred: (x: number, z: number) => boolean, pad = 1) => {
        for (let t = 0; t < 120; t++) {
          const x = x0 + 1 + Math.floor(rand() * (room.w - 2));
          const z = z0 + 1 + Math.floor(rand() * (room.d - 2));
          if (free(x, z, pad) && pred(x, z)) return { x, z };
        }
        return null;
      };
      const farFromGate = (x: number, z: number) => Math.hypot(x - gateC.x, z - gateC.z) > 7;
      const farFromEntry = (x: number, z: number) => Math.hypot(x - entryC.x, z - entryC.z) > 5;
      if (type === 'button') {
        // In a corner away from both doors, half-hidden by crate stacks.
        const corners = [
          { x: x0 + 1, z: z0 + 1, cx: 1, cz: 1 },
          { x: x1 - 1, z: z0 + 1, cx: -1, cz: 1 },
          { x: x0 + 1, z: z1 - 1, cx: 1, cz: -1 },
          { x: x1 - 1, z: z1 - 1, cx: -1, cz: -1 },
        ].filter((c) => free(c.x, c.z) && farFromGate(c.x, c.z) && farFromEntry(c.x, c.z));
        const c = corners[Math.floor(rand() * corners.length)] ?? spot((x, z) => farFromGate(x, z));
        if (c) {
          claimCell(c.x, c.z, 1);
          points.push({ role: 'button', x: c.x + 0.5, z: c.z + 0.5 });
          const cx = 'cx' in c ? c.cx : 1;
          const cz = 'cz' in c ? c.cz : 1;
          for (const [dx, dz] of [
            [cx * 2, 0],
            [cx * 2, cz],
            [0, cz * 2],
          ]) {
            const cell = b.cell(c.x + dx, c.z + dz);
            if (!cell || cell.t !== FLOOR) continue;
            cell.solid = true;
            points.push({ role: 'cover', x: c.x + dx + 0.5, z: c.z + dz + 0.5 });
          }
        }
      } else if (type === 'push') {
        // Plate in the open; crate three cells away on the same row with room to push from behind.
        for (let t = 0; t < 80; t++) {
          const p = spot(() => true, 1);
          if (!p) break;
          const horiz = rand() < 0.5;
          const sgn = rand() < 0.5 ? 1 : -1;
          const cr = horiz ? { x: p.x + 3 * sgn, z: p.z } : { x: p.x, z: p.z + 3 * sgn };
          const behind = horiz ? { x: cr.x + sgn, z: cr.z } : { x: cr.x, z: cr.z + sgn };
          const lane = [1, 2].map((k) => (horiz ? { x: p.x + k * sgn, z: p.z } : { x: p.x, z: p.z + k * sgn }));
          if (![cr, behind, ...lane].every((c) => free(c.x, c.z))) continue;
          for (const c of [p, cr, behind, ...lane]) claimCell(c.x, c.z);
          points.push({ role: 'plate', x: p.x + 0.5, z: p.z + 0.5 }, { role: 'crate', x: cr.x + 0.5, z: cr.z + 0.5 });
          break;
        }
      } else if (type === 'lasers') {
        const got: { x: number; z: number }[] = [];
        for (let t = 0; t < 3; t++) {
          const p = spot((x, z) => got.every((g) => Math.hypot(g.x - x, g.z - z) > 4) && Math.hypot(x - gateC.x, z - gateC.z) > 3);
          if (!p) continue;
          claimCell(p.x, p.z, 1);
          const cell = b.cell(p.x, p.z);
          if (cell) cell.solid = true;
          got.push(p);
          points.push({ role: 'breaker', x: p.x + 0.5, z: p.z + 0.5 });
        }
      } else if (type === 'battery') {
        const sock = exitOnX ? { x: x1, z: gateC.z - 2 } : { x: gateC.x - 2, z: z1 };
        const cellP = spot((x, z) => farFromGate(x, z));
        if (cellP && b.cell(sock.x, sock.z)?.t === FLOOR) {
          claimCell(cellP.x, cellP.z, 1);
          claimCell(sock.x, sock.z);
          points.push({ role: 'cell', x: cellP.x + 0.5, z: cellP.z + 0.5 }, { role: 'socket', x: sock.x + 0.5, z: sock.z + 0.5 });
        }
      }
      // A few bots and a capacitor or two for them to be blown up with (arenas bring their own waves).
      if (!peaceful && type !== 'arena' && types.length) {
        for (let k = 0; k < 3; k++) {
          const p = b.randomFree(room, rand, 0, 3);
          if (p) b.spawns.push({ kind: 'enemy', x: p.x, z: p.z, type: types[k % types.length], room: room.i });
        }
      }
      for (let k = 0; k < 2; k++) {
        const p = spot(() => true, 1);
        if (!p) continue;
        claimCell(p.x, p.z, 1);
        const cell = b.cell(p.x, p.z);
        if (cell) cell.solid = true;
        b.spawns.push({ kind: 'hazard', type: 'capacitor', x: p.x + 0.5, z: p.z + 0.5, dir: 0, len: 1, room: room.i });
      }
      b.spawns.push({
        kind: 'trial',
        id: `${levelId}-trial-${n}`,
        type,
        room: room.i,
        x: room.x + room.w / 2,
        z: room.z + room.d / 2,
        gate: { x: gateC.x + 0.5, z: gateC.z + 0.5, cells: exit.cells },
        entry: type === 'arena' ? { x: entryC.x + 0.5, z: entryC.z + 0.5, cells: into.cells } : null,
        points,
      });
    });
}

export const SCREWS_PER_MISSION = 3;

/**
 * Golden screws: hidden collectibles, tucked into corners away from the doors (one inside a
 * trial room when there is one). Deterministic, so saved ids stay valid.
 */
function placeScrews(b: Builder, levelId: string, rooms: RoomRect[], rand: () => number) {
  const trial = rooms.filter((r) => r.kind === 'trial');
  const others = rooms.filter((r) => r.kind === 'content' || r.kind === 'vault' || r.kind === 'cavern');
  const order = [...trial.slice(0, 1), ...others.filter((_, k) => k % 2 === 1), ...others.filter((_, k) => k % 2 === 0)];
  let n = 0;
  for (const room of order) {
    if (n >= SCREWS_PER_MISSION) break;
    const corners = [
      { x: room.x + 1, z: room.z + 1 },
      { x: room.x + room.w - 2, z: room.z + 1 },
      { x: room.x + 1, z: room.z + room.d - 2 },
      { x: room.x + room.w - 2, z: room.z + room.d - 2 },
    ].sort(() => rand() - 0.5);
    const spot = corners.find((c) => b.isFree(c.x + 0.5, c.z + 0.5, 0) && !b.nearDoor(c.x + 0.5, c.z + 0.5, 3));
    if (!spot) continue;
    b.claim(spot.x + 0.5, spot.z + 0.5, 0);
    b.spawns.push({ kind: 'screw', id: `${levelId}-screw-${n}`, x: spot.x + 0.5, z: spot.z + 0.5 });
    n++;
  }
}

/** Energy barrier across the corridor into the final room, puzzle nodes + hint console in the room before. */
function placePuzzle(b: Builder, levelId: string, rooms: RoomRect[], rand: () => number) {
  const def = PUZZLES[levelId];
  if (!def) return;
  const target = [...rooms].reverse().find((r) => r.kind === 'content' || r.kind === 'vault');
  if (!target) return;
  const corridor = b.corridors.find((c) => c.b === target.i);
  const before = rooms.find((r) => r.i === corridor?.a);
  if (!corridor || !before) return;
  const id = `${levelId}-gate`;
  const mid = corridor.cells[Math.floor(corridor.cells.length / 2)];
  b.spawns.push({ kind: 'barrier', id, cells: corridor.cells, x: mid.x + 0.5, z: mid.z + 0.5 });
  // Hint console just inside the doorway, nodes spread through the room.
  const door = corridor.cells.reduce((best, c) => {
    const d = Math.abs(c.x + 0.5 - (before.x + before.w / 2)) + Math.abs(c.z + 0.5 - (before.z + before.d / 2));
    const bd = Math.abs(best.x + 0.5 - (before.x + before.w / 2)) + Math.abs(best.z + 0.5 - (before.z + before.d / 2));
    return d < bd ? c : best;
  });
  const hx = Math.min(before.x + before.w - 2, Math.max(before.x + 2, door.x + 0.5 + (door.x >= before.x + before.w ? -2 : 0)));
  const hz = Math.min(before.z + before.d - 2, Math.max(before.z + 2, door.z + 0.5 + (door.z >= before.z + before.d ? -2 : 0)));
  const hint = b.isFree(hx, hz, 0) ? { x: hx, z: hz } : b.randomFree(before, rand, 1, 2);
  if (hint) {
    b.spawns.push({ kind: 'phint', id, x: hint.x, z: hint.z });
    b.claim(hint.x, hint.z, 1);
  }
  for (let i = 0; i < def.nodes; i++) {
    const p = b.randomFree(before, rand, 1, 2) ?? b.randomFree(before, rand, 0, 1.5);
    if (!p) continue;
    b.spawns.push({ kind: 'pnode', id, index: i, x: p.x, z: p.z });
    b.claim(p.x, p.z, 1);
    const c = b.cell(Math.floor(p.x), Math.floor(p.z));
    if (c) c.solid = true;
  }
}

function buildProjects(b: Builder, level: Level, rooms: RoomRect[], rand: () => number, peaceful: boolean) {
  const cavern = rooms.find((r) => r.kind === 'cavern')!;
  const vaults = rooms.filter((r) => r.kind === 'vault');
  vaults.forEach((vault) => {
    const cx = vault.x + vault.w / 2;
    const cz = vault.z + vault.d / 2;
    const project = level.rooms.find((r) => r.id === vault.roomId)!;
    b.spawns.push({ kind: 'assembly', x: cx, z: cz - 0.5, projectId: project.id, wip: project.meta.status === 'in-progress' });
    b.claim(cx, cz - 0.5, 2);
    const cell = b.cell(Math.floor(cx), Math.floor(cz - 0.5));
    if (cell) cell.solid = true;
  });
  // Scatter each project's parts through the cavern and earlier vaults; one part per project rides a bug.
  vaults.forEach((vault, k) => {
    const project = level.rooms.find((r) => r.id === vault.roomId)!;
    const pool = [cavern, cavern, ...vaults.slice(Math.max(0, k - 2), k)];
    project.parts.forEach((part, j) => {
      const carried = !peaceful && j === project.parts.length - 1;
      const room = pool[Math.floor(rand() * pool.length)];
      const p = b.randomFree(room, rand, 0, 2);
      if (!p) return;
      b.claim(p.x, p.z);
      if (carried) b.spawns.push({ kind: 'enemy', x: p.x, z: p.z, type: 'bug', room: room.i });
      b.spawns.push({ kind: 'part', x: p.x, z: p.z, projectId: project.id, partId: part.id, carried });
    });
  });
  if (!peaceful) {
    for (const room of [cavern, ...vaults.slice(1)]) {
      const n = room === cavern ? 3 : 1;
      for (let i = 0; i < n; i++) {
        const p = b.randomFree(room, rand, 0, 3);
        if (p) b.spawns.push({ kind: 'enemy', x: p.x, z: p.z, type: 'bug', room: room.i });
      }
    }
  }
}

function buildTrophies(b: Builder, level: Level, rooms: RoomRect[], secret: RoomRect) {
  const rand = rng(4242);
  for (const room of rooms) {
    const content = level.rooms.find((r) => r.id === room.roomId);
    if (!content) continue;
    const cx = room.x + room.w / 2;
    if (content.id === 'awards') {
      b.spawns.push({ kind: 'console', x: cx, z: room.z + 2.5, roomId: content.id });
      b.claim(cx, room.z + 2.5, 1);
      const spots = b.spots(room, 2.4).filter((s) => Math.abs(s.x - cx) > 1.8 || s.z > room.z + 3);
      content.parts
        .filter((p) => !p.todo || p.body)
        .forEach((part, k) => {
          // Crowded rooms (puzzle nodes, hint consoles) fall back to any clear floor.
          const s = spots[k] ?? b.randomFree(room, rand, 1, 2) ?? b.randomFree(room, rand, 0, 2);
          if (!s) return;
          b.spawns.push({ kind: 'terminal', x: s.x, z: s.z, roomId: content.id, partId: part.id });
          b.claim(s.x, s.z, 1);
        });
    } else if (content.id === 'skill-matrix') {
      b.spawns.push({ kind: 'matrix', x: cx, z: room.z + room.d / 2, roomId: content.id });
      b.claim(cx, room.z + room.d / 2, 2);
      const c = b.cell(Math.floor(cx), Math.floor(room.z + room.d / 2));
      if (c) c.solid = true;
    } else if (content.id === 'shelves') {
      b.spawns.push({ kind: 'console', x: room.x + 2.5, z: room.z + room.d / 2 + 2, roomId: content.id });
      b.claim(room.x + 2.5, room.z + room.d / 2 + 2, 1);
      const ids = PROJECT_IDS;
      const spots = b.spots(room, 2.2).filter((s) => Math.abs(s.x - cx) > 1.5);
      ids.forEach((id, k) => {
        const s = spots[k];
        if (!s) return;
        b.spawns.push({ kind: 'shelf', x: s.x, z: s.z, projectId: id });
        b.claim(s.x, s.z, 1);
      });
      b.spawns.push({ kind: 'secret', x: cx, z: room.z - 0.5 });
    }
  }
  const scx = secret.x + secret.w / 2;
  b.spawns.push({ kind: 'backroom', x: scx, z: secret.z + 2.5 });
  b.claim(scx, secret.z + 2.5, 1);
  // Lab-notebook terminals and Xiao Hu's bed.
  const content = level.rooms.find((r) => r.id === 'backroom');
  const spots = b.spots(secret, 2.6).filter((s) => Math.abs(s.x - scx) > 1.8 || s.z > secret.z + 3);
  content?.parts
    .filter((p) => !p.todo || p.body)
    .filter((p) => p.id !== 'cat-corner')
    .forEach((part, k) => {
      const s = spots[k];
      if (!s) return;
      b.spawns.push({ kind: 'terminal', x: s.x, z: s.z, roomId: 'backroom', partId: part.id });
      b.claim(s.x, s.z, 1);
    });
  const bed = { x: secret.x + secret.w - 2.5, z: secret.z + secret.d - 2.5 };
  b.spawns.push({ kind: 'hub', what: 'catbed', x: bed.x, z: bed.z });
  b.claim(bed.x, bed.z, 1);
}

/** Set by the game before building the Trophy Hall (project ids in content order). */
export let PROJECT_IDS: string[] = [];
export const setProjectIds = (ids: string[]) => (PROJECT_IDS = ids);

function buildGitHub(b: Builder, level: Level, rooms: RoomRect[], feed: GitHubFeed) {
  for (const room of rooms) {
    const content = level.rooms.find((r) => r.id === room.roomId);
    if (!content) continue;
    const cx = room.x + room.w / 2;
    b.spawns.push({ kind: 'console', x: cx, z: room.z + 2.5, roomId: content.id });
    b.claim(cx, room.z + 2.5, 1);
    if (content.id === 'contributions') {
      b.spawns.push({ kind: 'grid', x: room.x + 2, z: room.z + 3, w: room.w - 4, d: Math.min(7, room.d - 5) });
    } else if (content.id === 'repos') {
      const spots = b.spots(room, 2.4).filter((s) => Math.abs(s.x - cx) > 1.8 || s.z > room.z + 3);
      feed.repos.slice(0, spots.length).forEach((_, k) => {
        const s = spots[k];
        b.spawns.push({ kind: 'repo', x: s.x, z: s.z, index: k });
        b.claim(s.x, s.z, 1);
      });
    } else if (content.id === 'commits') {
      b.spawns.push({ kind: 'boss', x: cx, z: room.z + room.d / 2 + 1, room: room.i, type: 'boss' });
    }
  }
}

function buildContact(b: Builder, rooms: RoomRect[]) {
  const field = rooms.find((r) => r.roomId === 'relays')!;
  const summit = rooms.find((r) => r.roomId === 'form')!;
  const cx = field.x + field.w / 2;
  const cz = field.z + field.d / 2;
  const pts = [
    [cx - 4, cz - 3],
    [cx + 4, cz - 3],
    [cx, cz + 3.5],
  ];
  pts.forEach(([x, z], i) => {
    b.spawns.push({ kind: 'relay', x, z, id: `relay-${i + 1}` });
    b.claim(x, z, 1);
    const c = b.cell(Math.floor(x), Math.floor(z));
    if (c) c.solid = true;
  });
  const sx = summit.x + summit.w / 2;
  b.spawns.push({ kind: 'dish', x: sx, z: summit.z + 3 });
  b.claim(sx, summit.z + 3, 2);
  for (let dx = -1; dx <= 1; dx++)
    for (let dz = -1; dz <= 1; dz++) {
      const c = b.cell(Math.floor(sx) + dx, Math.floor(summit.z + 3) + dz);
      if (c) c.solid = true;
    }
  b.spawns.push({ kind: 'transmitter', x: sx, z: summit.z + summit.d / 2 + 1.5 });
  b.claim(sx, summit.z + summit.d / 2 + 1.5, 1);
}

/** Station modules: name and the line shown when you walk in. */
export const HUB_AREAS: Record<string, string> = {
  'Command Deck': 'The star map: pick a mission',
  'Crew Quarters': "Dayna's bunk, Xiao Hu's bed and the gear locker",
  'Hangar Bay': 'Shuttle to Planet Aurora',
  'Commissary': 'Hydroponics garden and the vendor',
};

/**
 * The orbital station: a Command Deck (star map + teleporter) with three modules off it —
 * Crew Quarters to the west, the Hangar Bay to the east and the Commissary to the south —
 * joined by wide gangways. Rooms are placed by hand (they branch, unlike a mission chain).
 */
function buildHub(): LevelMap {
  const b = new Builder();
  const deck: RoomRect = { i: 0, x: 17, z: 0, w: 19, d: 17, h: 0, kind: 'hub', title: 'Command Deck' };
  const quarters: RoomRect = { i: 1, x: 0, z: 3, w: 13, d: 11, h: 0, kind: 'hub', title: 'Crew Quarters' };
  const hangar: RoomRect = { i: 2, x: 40, z: 0, w: 17, d: 17, h: 0, kind: 'hub', title: 'Hangar Bay' };
  const shop: RoomRect = { i: 3, x: 19, z: 21, w: 15, d: 13, h: 0, kind: 'hub', title: 'Commissary' };
  b.addRoom(deck, 'octagon');
  b.addRoom(quarters);
  b.addRoom(hangar);
  b.addRoom(shop, 'round');
  b.corridor(quarters, deck, 'x', false, 1);
  b.corridor(deck, hangar, 'x', false, 2);
  b.corridor(deck, shop, 'z', false, 2);
  b.inlay(deck, 'ring');
  b.inlay(hangar, 'stripe');
  b.finalize();
  const put = (what: Extract<Spawn, { kind: 'hub' }>['what'], x: number, z: number, solid = true) => {
    b.spawns.push({ kind: 'hub', what, x, z });
    b.claim(x, z, 1);
    if (solid) {
      const c = b.cell(Math.floor(x), Math.floor(z));
      if (c) c.solid = true;
    }
  };
  const solidBlock = (x0: number, z0: number, w: number, d: number) => {
    for (let x = x0; x < x0 + w; x++)
      for (let z = z0; z < z0 + d; z++) {
        const c = b.cell(x, z);
        if (c) c.solid = true;
        b.claim(x + 0.5, z + 0.5);
      }
  };
  // Command Deck: the holo star map in the middle, the teleporter in front of it.
  const cx = deck.x + deck.w / 2;
  const cz = deck.z + deck.d / 2;
  put('starmap', cx, cz - 1);
  solidBlock(Math.floor(cx) - 1, Math.floor(cz - 1) - 1, 3, 3);
  put('pad', cx, cz + 4, false);
  for (let z = Math.floor(cz + 1); z <= Math.floor(cz + 4); z++)
    for (let x = Math.floor(cx) - 1; x <= Math.floor(cx) + 1; x++) {
      const c = b.cell(x, z);
      if (c && c.t === FLOOR) c.surf = 'path';
    }
  // Crew Quarters.
  put('bunk', quarters.x + 2, quarters.z + 2);
  put('catbed', quarters.x + 5, quarters.z + 1.5);
  put('locker', quarters.x + quarters.w - 2.5, quarters.z + 2.5);
  // Hangar Bay: a docked shuttle on the pad, the planet lift beside it.
  const sx = hangar.x + hangar.w / 2 + 1;
  const sz = hangar.z + 5;
  put('shuttle', sx, sz, false);
  solidBlock(Math.floor(sx) - 2, Math.floor(sz) - 3, 5, 6);
  put('planet', hangar.x + 4.5, hangar.z + hangar.d - 4.5, false);
  // Commissary: the vendor at the back, planters around the garden.
  put('vendor', shop.x + shop.w / 2, shop.z + 2.5);
  put('earth', quarters.x - 6, deck.z - 14, false);
  // Windows along the back walls.
  for (let x = 0; x < b.w; x++)
    for (let z = 0; z < b.d; z++) {
      const c = b.cell(x, z)!;
      if (c.t === WALL && (x + z) % 3 === 0) c.window = true;
    }
  b.decorate('orbital-station', rng(42), 0.1);
  return b.result('hub', 'orbital-station', { x: cx, z: cz + 6 });
}

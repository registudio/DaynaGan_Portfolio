import type { Level, Portfolio } from '@/lib/portfolio';
import type { GitHubFeed } from '@/lib/github';
import { BIOMES, type PropKind } from './biomes.ts';
import { rng } from './rng.ts';
import { BOSSES, PUZZLES } from './missions.ts';

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
};

export type RoomRect = {
  i: number;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  kind: 'entry' | 'content' | 'cavern' | 'vault' | 'secret' | 'hub';
  roomId?: string;
  title?: string;
};

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
  | { kind: 'enemy'; x: number; z: number; type: string; room: number }
  | { kind: 'boss'; x: number; z: number; room: number; type: string }
  | { kind: 'spawner'; id: string; x: number; z: number; room: number; type: string }
  | { kind: 'barrier'; id: string; cells: { x: number; z: number }[]; x: number; z: number }
  | { kind: 'pnode'; id: string; index: number; x: number; z: number }
  | { kind: 'phint'; id: string; x: number; z: number }
  | { kind: 'prop'; x: number; z: number; prop: PropKind; rot: number }
  | { kind: 'centerpiece'; x: number; z: number; what: string }
  | { kind: 'secret'; x: number; z: number }
  | { kind: 'backroom'; x: number; z: number }
  | { kind: 'hub'; x: number; z: number; what: 'starmap' | 'bunk' | 'catbed' | 'locker' | 'vendor' | 'pad' | 'earth' };

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

type RoomSpec = { w: number; d: number; kind: RoomRect['kind']; roomId?: string; title?: string; h?: number };

const CORRIDOR = 4;

class Builder {
  w = 0;
  d = 0;
  cells: Cell[] = [];
  rooms: RoomRect[] = [];
  spawns: Spawn[] = [];
  used = new Set<string>();
  doors: { x: number; z: number }[] = [];
  corridors: { a: number; b: number; cells: { x: number; z: number }[] }[] = [];
  private raw: { x: number; z: number; h: number; room: number; surf: Cell['surf'] }[] = [];
  private secretRaw: { x: number; z: number; h: number }[] = [];

  chain(specs: RoomSpec[], climb = 0) {
    let prev: RoomRect | null = null;
    specs.forEach((spec, i) => {
      const h = spec.h ?? i * climb;
      let x = 0;
      let z = 0;
      if (prev) {
        if (i % 2 === 1) {
          x = prev.x + prev.w + CORRIDOR;
          z = Math.round(prev.z + prev.d / 2 - spec.d / 2);
        } else {
          z = prev.z + prev.d + CORRIDOR;
          x = Math.round(prev.x + prev.w / 2 - spec.w / 2);
        }
      }
      const room: RoomRect = { i, x, z, w: spec.w, d: spec.d, h, kind: spec.kind, roomId: spec.roomId, title: spec.title };
      this.addRoom(room);
      if (prev) this.corridor(prev, room, i % 2 === 1 ? 'x' : 'z');
      prev = room;
    });
    return this.rooms;
  }

  addRoom(room: RoomRect) {
    this.rooms.push(room);
    for (let x = room.x; x < room.x + room.w; x++)
      for (let z = room.z; z < room.z + room.d; z++)
        this.raw.push({ x, z, h: room.h, room: room.i, surf: (x + z) % 2 === 0 ? 'floor' : 'alt' });
  }

  corridor(a: RoomRect, b: RoomRect, axis: 'x' | 'z', secret = false) {
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
        for (let z = cz - 1; z <= cz + 1; z++) push(x, z, a.h + ((b.h - a.h) * (x - x0 + 1)) / (x1 - x0 + 1));
      this.doors.push({ x: x0 - 1, z: cz }, { x: x1, z: cz });
    } else {
      const lo = Math.max(a.x, b.x);
      const hi = Math.min(a.x + a.w, b.x + b.w);
      const cx = Math.floor((lo + hi) / 2);
      const z0 = a.z + a.d;
      const z1 = b.z;
      for (let z = z0; z < z1; z++)
        for (let x = cx - 1; x <= cx + 1; x++) push(x, z, a.h + ((b.h - a.h) * (z - z0 + 1)) / (z1 - z0 + 1));
      this.doors.push({ x: cx, z: z0 - 1 }, { x: cx, z: z1 });
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

  finalize(margin = 4) {
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
    for (const room of this.rooms) {
      if (room.kind === 'hub') continue;
      for (let x = room.x; x < room.x + room.w; x++)
        for (let z = room.z; z < room.z + room.d; z++) {
          const edge = x === room.x || z === room.z || x === room.x + room.w - 1 || z === room.z + room.d - 1;
          if (!edge || rand() > density) continue;
          if (this.nearDoor(x, z, 2) || this.used.has(`${x},${z}`)) continue;
          const c = this.cell(x, z);
          if (!c || c.t !== FLOOR) continue;
          // Keep front edges mostly open.
          const front = x === room.x + room.w - 1 || z === room.z + room.d - 1;
          if (front && rand() > 0.35) continue;
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
  const w = Math.min(19, Math.max(11, 7 + Math.ceil(parts / 2) * 3));
  return { w, d: parts > 6 ? 13 : 11 };
}

function spawnEnemies(b: Builder, level: Level, rand: () => number, peaceful: boolean, rooms: RoomRect[], count = 2) {
  const types = enemyTypes(level);
  if (!types.length || peaceful) return;
  for (const room of rooms) {
    const n = count + Math.floor(rand() * 2);
    for (let k = 0; k < n; k++) {
      const p = b.randomFree(room, rand, 0, 3);
      if (p) b.spawns.push({ kind: 'enemy', x: p.x, z: p.z, type: types[k % types.length], room: room.i });
    }
  }
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

  const specs: RoomSpec[] = [{ w: 11, d: 11, kind: 'entry', title: level.title }];
  if (levelId === 'projects') {
    specs.push({ w: 19, d: 15, kind: 'cavern', title: 'Parts Cavern' });
    for (const r of level.rooms) specs.push({ w: 11, d: 11, kind: 'vault', roomId: r.id, title: r.title });
  } else if (levelId === 'trophies') {
    const order = ['awards', 'skill-matrix', 'shelves'];
    for (const id of order) {
      const r = level.rooms.find((x) => x.id === id);
      if (r) specs.push({ ...roomSize(id === 'awards' ? r.parts.length : 6), kind: 'content', roomId: r.id, title: r.title });
    }
  } else if (levelId === 'contact') {
    specs.push({ w: 15, d: 15, kind: 'content', roomId: 'relays', title: 'Relay Field' });
    for (const r of level.rooms) specs.push({ w: 13, d: 13, kind: 'content', roomId: r.id, title: r.title });
  } else {
    for (const r of level.rooms) specs.push({ ...roomSize(r.parts.length), kind: 'content', roomId: r.id, title: r.title });
  }
  const rooms = b.chain(specs, climb);
  const secret =
    levelId === 'trophies'
      ? b.secretRoom(rooms.find((r) => r.roomId === 'shelves')!, { w: 11, d: 11, kind: 'secret', roomId: 'backroom', title: 'The Backroom' })
      : null;
  b.finalize();

  const spawn = entryRoom(b, rooms[0], biome);
  const contentRooms = rooms.filter((r) => r.kind !== 'entry' && r.kind !== 'secret');

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

function buildHub(): LevelMap {
  const b = new Builder();
  b.addRoom({ i: 0, x: 0, z: 0, w: 17, d: 13, h: 0, kind: 'hub', title: 'Station Hub' });
  b.finalize();
  const room = b.rooms[0];
  const cx = room.x + room.w / 2;
  const cz = room.z + room.d / 2;
  const put = (what: Extract<Spawn, { kind: 'hub' }>['what'], x: number, z: number, solid = true) => {
    b.spawns.push({ kind: 'hub', what, x, z });
    b.claim(x, z, 1);
    if (solid) {
      const c = b.cell(Math.floor(x), Math.floor(z));
      if (c) c.solid = true;
    }
  };
  put('starmap', cx, cz - 1);
  put('pad', cx, cz + 3, false);
  put('bunk', room.x + 2, room.z + 2);
  put('catbed', room.x + 4.5, room.z + 1.5);
  put('locker', room.x + room.w - 2.5, room.z + 2.5);
  put('vendor', room.x + room.w - 1.5, room.z + 6);
  put('earth', room.x - 10, room.z - 12, false);
  // Path tiles from pad to star map.
  for (let z = Math.floor(cz); z <= Math.floor(cz + 3); z++)
    for (let x = Math.floor(cx) - 1; x <= Math.floor(cx) + 1; x++) {
      const c = b.cell(x, z);
      if (c && c.t === FLOOR) c.surf = 'path';
    }
  // Windows along the back walls.
  for (let x = 0; x < b.w; x++)
    for (let z = 0; z < b.d; z++) {
      const c = b.cell(x, z)!;
      if (c.t === WALL && (x + z) % 3 === 0) c.window = true;
    }
  b.decorate('orbital-station', rng(42), 0.08);
  return b.result('hub', 'orbital-station', { x: cx, z: cz + 4.5 });
}

import { FLOOR, VOID, WALL, type Cell, type LevelMap, type RoomRect, type Spawn } from './layout.ts';
import { rng } from './rng.ts';

/**
 * Planet Aurora — the open-world overview. A deterministic island (~2.5 screens across) split into
 * biome regions, each holding one portfolio section as a landmark. Some landmarks sit behind a
 * nature puzzle (vine bridge, rune order, glow-spores, lava levers, pearls, ice chimes, sun mirrors).
 */

export type PlanetPuzzleKind = 'toggle' | 'sequence' | 'collect' | 'rotate';
export type GateKind = 'bridge' | 'wall' | 'lava';

export type RegionDef = {
  id: string;
  name: string;
  blurb: string;
  /** Portfolio section shown at this region's landmark. */
  sections: string[];
  terrain: string;
  alt?: string;
  angle: number; // degrees; 0 = +x
  radius: number;
  base: number;
  puzzle?: { kind: PlanetPuzzleKind; n: number; piece: string; name: string; hint: string; gate: GateKind; gateMat: string };
  decor: [string, number][]; // kind, density per cell
  light: string;
};

export const REGIONS: RegionDef[] = [
  {
    id: 'meadow', name: 'Landing Meadow', blurb: 'Where every visit starts — rolling grass, wildflowers and the comms beacon.',
    sections: ['about', 'contact'], terrain: 'meadow', angle: 0, radius: 0, base: 1, light: '#fde68a',
    decor: [['oak', 0.012], ['flowers', 0.05], ['bush', 0.015], ['rock', 0.006]],
  },
  {
    id: 'garden', name: 'Supertree Garden', blurb: 'Terraced gardens under glowing supertrees — a nod to home.',
    sections: ['education'], terrain: 'garden', angle: -90, radius: 33, base: 2, light: '#c084fc',
    decor: [['supertree', 0.004], ['orchid', 0.04], ['hedge', 0.01], ['lamp', 0.005]],
  },
  {
    id: 'ruins', name: 'Crystal Forest Ruins', blurb: 'Moss-covered ruins, humming crystals and floating lanterns.',
    sections: ['trophies'], terrain: 'ruin', alt: 'moss', angle: -40, radius: 38, base: 2, light: '#a78bfa',
    puzzle: { kind: 'sequence', n: 4, piece: 'runestone', name: 'Rune Order', hint: 'Touch the rune stones in the order the lanterns show: violet, teal, gold, rose.', gate: 'wall', gateMat: 'ruin' },
    decor: [['pillar', 0.01], ['crystal', 0.02], ['lantern', 0.008], ['mossrock', 0.01]],
  },
  {
    id: 'sky', name: 'Floating Sky Islands', blurb: 'Grassy islands adrift above the sea, waterfalls pouring off their edges.',
    sections: ['hobbies'], terrain: 'sky', angle: 0, radius: 58, base: 6, light: '#7dd3fc',
    puzzle: { kind: 'toggle', n: 3, piece: 'sprout', name: 'Vine Bridge', hint: 'Water the three sprouts on the cliff edge and the vines will grow a bridge.', gate: 'bridge', gateMat: 'bridge' },
    decor: [['oak', 0.02], ['flowers', 0.08], ['bush', 0.02]],
  },
  {
    id: 'volcano', name: 'Ember Volcano', blurb: 'Black basalt, rivers of lava and a forge in the crater.',
    sections: ['experience'], terrain: 'basalt', angle: 40, radius: 37, base: 1, light: '#fb923c',
    puzzle: { kind: 'toggle', n: 2, piece: 'lever', name: 'Lava Diversion', hint: 'Pull both levers on the slopes to divert the lava and cool a path to the crater.', gate: 'lava', gateMat: 'lava' },
    decor: [['basaltrock', 0.02], ['deadtree', 0.008], ['vent', 0.006]],
  },
  {
    id: 'ocean', name: 'Lighthouse Coast', blurb: 'Warm sand, tide pools and a lighthouse on the point.',
    sections: ['leadership'], terrain: 'sand', angle: 90, radius: 34, base: 0, light: '#38bdf8',
    puzzle: { kind: 'collect', n: 3, piece: 'pearl', name: 'Lighthouse Pearls', hint: 'Find three glowing pearls along the beach to relight the lighthouse.', gate: 'wall', gateMat: 'sand' },
    decor: [['palm', 0.015], ['coral', 0.012], ['shell', 0.01], ['rock', 0.006]],
  },
  {
    id: 'desert', name: 'Sunstone Canyon', blurb: 'Red mesas, dunes and an observatory looking to the future.',
    sections: ['future'], terrain: 'desert', alt: 'mesa', angle: 140, radius: 36, base: 1, light: '#fbbf24',
    puzzle: { kind: 'rotate', n: 3, piece: 'mirror', name: 'Sun Mirrors', hint: 'Turn each sun mirror until its gem glows gold to aim the light at the observatory.', gate: 'wall', gateMat: 'mesa' },
    decor: [['cactus', 0.02], ['mesarock', 0.012], ['drybush', 0.015]],
  },
  {
    id: 'jungle', name: 'Glowroot Jungle', blurb: 'A bioluminescent jungle — giant ferns, glowing mushrooms, fireflies.',
    sections: ['projects'], terrain: 'jungle', angle: 180, radius: 35, base: 1, light: '#2dd4bf',
    puzzle: { kind: 'collect', n: 5, piece: 'spore', name: 'Glow-spores', hint: 'Gather five glow-spores and the great flower will open.', gate: 'wall', gateMat: 'jungle' },
    decor: [['jungletree', 0.02], ['mushroom', 0.03], ['fern', 0.04]],
  },
  {
    id: 'tundra', name: 'Frostline Tundra', blurb: 'Snowy pines, ice caves and an aurora overhead.',
    sections: ['github'], terrain: 'snow', alt: 'ice', angle: -140, radius: 36, base: 2, light: '#93c5fd',
    puzzle: { kind: 'toggle', n: 3, piece: 'chime', name: 'Ice Chimes', hint: 'Ring the three ice chimes to shatter the frozen gate.', gate: 'wall', gateMat: 'ice' },
    decor: [['pine', 0.025], ['icecrystal', 0.01], ['snowrock', 0.008]],
  },
];

export type PlanetLandmark = { section: string; region: number; x: number; z: number; main: boolean };
export type PlanetPuzzle = {
  id: string;
  region: number;
  def: NonNullable<RegionDef['puzzle']>;
  pieces: { x: number; z: number; index: number }[];
  gate: { x: number; z: number; cells: { x: number; z: number }[] };
  hint: { x: number; z: number };
};
export type PlanetDecor = { kind: string; x: number; z: number; rot: number; s: number; solid: boolean };
export type PlanetMap = LevelMap & { landmarks: PlanetLandmark[]; puzzles: PlanetPuzzle[]; decor: PlanetDecor[]; sky: { x: number; z: number }[] };

const SIZE = 136;
const C = SIZE / 2;

function noise2(seed: number) {
  // Cheap smooth value noise from a hashed lattice (deterministic).
  const r = rng(seed);
  const grid = Array.from({ length: 33 * 33 }, () => r());
  const at = (i: number, j: number) => grid[(((j % 33) + 33) % 33) * 33 + (((i % 33) + 33) % 33)];
  return (x: number, z: number, scale: number) => {
    const fx = x / scale;
    const fz = z / scale;
    const i = Math.floor(fx);
    const j = Math.floor(fz);
    const tx = fx - i;
    const tz = fz - j;
    const sx = tx * tx * (3 - 2 * tx);
    const sz = tz * tz * (3 - 2 * tz);
    const a = at(i, j) + (at(i + 1, j) - at(i, j)) * sx;
    const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * sx;
    return a + (b - a) * sz;
  };
}

const rad = (deg: number) => (deg * Math.PI) / 180;

export function buildPlanet(): PlanetMap {
  const rand = rng(7071);
  const n1 = noise2(11);
  const n2 = noise2(29);
  const cells: Cell[] = Array.from({ length: SIZE * SIZE }, () => ({ t: VOID, h: 0, room: -1, surf: 'floor' }));
  const idx = (x: number, z: number) => z * SIZE + x;
  const inside = (x: number, z: number) => x >= 0 && z >= 0 && x < SIZE && z < SIZE;
  const centres = REGIONS.map((r) => ({ x: Math.round(C + Math.cos(rad(r.angle)) * r.radius), z: Math.round(C + Math.sin(rad(r.angle)) * r.radius) }));
  const skyI = REGIONS.findIndex((r) => r.id === 'sky');
  const volI = REGIONS.findIndex((r) => r.id === 'volcano');
  const oceanI = REGIONS.findIndex((r) => r.id === 'ocean');

  // ── Main island: wobbly coastline, pulled in to the south-east where the sea is.
  for (let z = 0; z < SIZE; z++)
    for (let x = 0; x < SIZE; x++) {
      const dx = x - C;
      const dz = z - C;
      const d = Math.hypot(dx, dz);
      const th = Math.atan2(dz, dx);
      let r = 50 + 4 * Math.sin(3 * th + 1) + 2.5 * Math.sin(7 * th + 2) + (n1(x, z, 9) - 0.5) * 8;
      if (Math.abs(th - rad(0)) < 0.5) r -= 4; // east coast faces the sky islands
      // Lighthouse peninsula to the south.
      const pen = Math.abs(dx - 2) < 3.5 && dz > 30 && dz < 56;
      if (d > r && !pen) continue;
      const c = cells[idx(x, z)];
      c.t = FLOOR;
      // Region: nearest centre with a noisy warp (sky islands are separate).
      let best = 0;
      let bd = Infinity;
      REGIONS.forEach((reg, i) => {
        if (i === skyI) return;
        const w = (n2(x + i * 17, z - i * 11, 11) - 0.5) * 14;
        const dd = Math.hypot(x - centres[i].x, z - centres[i].z) + w + (reg.id === 'meadow' ? 6 : 0);
        if (dd < bd) {
          bd = dd;
          best = i;
        }
      });
      if (pen) best = oceanI;
      const reg = REGIONS[best];
      c.room = best;
      // Beaches ring the whole coast.
      const coast = d > r - 3 && !pen;
      c.mat = coast && reg.id !== 'volcano' && reg.id !== 'tundra' ? 'sand' : reg.terrain;
      if (reg.alt && n1(x * 1.7, z * 1.7, 5) > 0.62) c.mat = reg.alt;
      c.surf = (x + z) % 2 === 0 ? 'floor' : 'alt';
      let h = reg.base + Math.round((n2(x, z, 13) - 0.5) * 2) * 0.5;
      if (coast || pen) h = Math.min(h, reg.base === 0 ? 0 : 0.5);
      if (reg.id === 'garden') h = reg.base + Math.floor(Math.max(0, 12 - Math.hypot(x - centres[best].x, z - centres[best].z)) / 4) * 0.5;
      if (reg.id === 'volcano') {
        const vd = Math.hypot(x - centres[volI].x, z - centres[volI].z);
        h = vd < 5 ? 4.5 : Math.max(1, 1 + (15 - vd) * 0.45);
        h = Math.round(h * 2) / 2;
        if (vd >= 5 && vd < 6.5) c.mat = 'basalt';
      }
      if (reg.id === 'desert' && n1(x * 0.8 + 50, z * 0.8, 7) > 0.66) {
        h = reg.base + 2.5; // mesa tops
        c.mat = 'mesa';
      }
      c.h = Math.max(0, h);
    }

  // ── Sky islands: three raised islets east of the coast.
  const skyC = centres[skyI];
  const islets = [
    { x: skyC.x, z: skyC.z, r: 7 },
    { x: skyC.x + 4, z: skyC.z - 12, r: 4.5 },
    { x: skyC.x + 3, z: skyC.z + 12, r: 4.5 },
  ];
  const sky: { x: number; z: number }[] = [];
  for (const is of islets)
    for (let z = Math.floor(is.z - is.r - 1); z <= is.z + is.r + 1; z++)
      for (let x = Math.floor(is.x - is.r - 1); x <= is.x + is.r + 1; x++) {
        if (!inside(x, z) || Math.hypot(x - is.x, z - is.z) > is.r + (n1(x, z, 3) - 0.5) * 1.5) continue;
        const c = cells[idx(x, z)];
        c.t = FLOOR;
        c.room = skyI;
        c.mat = 'sky';
        c.h = 6;
        c.surf = (x + z) % 2 ? 'alt' : 'floor';
        sky.push({ x, z });
      }
  // Islet-to-islet walkways (always open).
  const walk = (ax: number, az: number, bx: number, bz: number, mat: string, h: number, room: number) => {
    const steps = Math.ceil(Math.hypot(bx - ax, bz - az));
    const out: { x: number; z: number }[] = [];
    for (let s = 0; s <= steps; s++) {
      const x = Math.round(ax + ((bx - ax) * s) / steps);
      const z = Math.round(az + ((bz - az) * s) / steps);
      for (const [ox, oz] of [
        [0, 0],
        [1, 0],
        [0, 1],
      ]) {
        const c = cells[idx(x + ox, z + oz)];
        if (c.t === FLOOR) continue;
        c.t = FLOOR;
        c.mat = mat;
        c.h = h;
        c.room = room;
        out.push({ x: x + ox, z: z + oz });
      }
    }
    return out;
  };
  walk(islets[0].x, islets[0].z, islets[1].x, islets[1].z, 'bridge', 6, skyI);
  walk(islets[0].x, islets[0].z, islets[2].x, islets[2].z, 'bridge', 6, skyI);

  // ── Paths from the meadow to every region's landmark (cobbled, 3 wide).
  const meadow = centres[0];
  const paths = new Set<number>();
  REGIONS.forEach((reg, i) => {
    if (i === 0 || i === skyI) return;
    const steps = Math.ceil(Math.hypot(centres[i].x - meadow.x, centres[i].z - meadow.z));
    for (let s = 0; s <= steps; s++) {
      const bend = Math.sin((s / steps) * Math.PI) * 4 * (i % 2 ? 1 : -1);
      const t = s / steps;
      const px = meadow.x + (centres[i].x - meadow.x) * t + Math.cos(rad(reg.angle + 90)) * bend;
      const pz = meadow.z + (centres[i].z - meadow.z) * t + Math.sin(rad(reg.angle + 90)) * bend;
      for (let ox = 0; ox <= 1; ox++)
        for (let oz = 0; oz <= 1; oz++) {
          const x = Math.round(px) + ox;
          const z = Math.round(pz) + oz;
          if (!inside(x, z)) continue;
          const c = cells[idx(x, z)];
          if (c.t !== FLOOR) continue;
          if (c.mat !== 'lava') c.mat = REGIONS[c.room]?.id === 'tundra' ? 'ice' : 'path';
          c.surf = 'path';
          paths.add(idx(x, z));
        }
    }
  });

  // ── Landmark plazas; gated ones get a ring wall (or lava moat / bridge) with a 3-wide entrance.
  const landmarks: PlanetLandmark[] = [];
  const puzzles: PlanetPuzzle[] = [];
  const reserved = new Set<number>();
  const flatten = (cx: number, cz: number, r: number, h: number, mat: string, room: number) => {
    for (let z = cz - r; z <= cz + r; z++)
      for (let x = cx - r; x <= cx + r; x++) {
        if (!inside(x, z)) continue;
        const c = cells[idx(x, z)];
        c.t = FLOOR;
        c.h = h;
        c.mat = mat;
        c.room = room;
        reserved.add(idx(x, z));
      }
  };
  REGIONS.forEach((reg, i) => {
    const cx = centres[i].x;
    const cz = centres[i].z;
    const h = reg.id === 'volcano' ? 4.5 : reg.id === 'sky' ? 6 : Math.max(reg.base, cells[idx(cx, cz)].h);
    const plazaMat = reg.id === 'meadow' ? 'path' : reg.id === 'garden' ? 'terrace' : reg.id === 'volcano' ? 'basalt' : reg.id === 'ruins' ? 'ruin' : reg.id === 'ocean' ? 'sand' : reg.terrain;
    if (reg.id === 'meadow') {
      // About at the centre, Contact beacon a little south-east of the landing pad.
      flatten(cx - 5, cz - 5, 3, h, plazaMat, i);
      flatten(cx + 7, cz - 4, 2, h, plazaMat, i);
      landmarks.push({ section: 'about', region: i, x: cx - 5 + 0.5, z: cz - 5 + 0.5, main: true });
      landmarks.push({ section: 'contact', region: i, x: cx + 7 + 0.5, z: cz - 4 + 0.5, main: true });
      return;
    }
    flatten(cx, cz, reg.id === 'sky' ? 2 : 3, h, plazaMat, i);
    landmarks.push({ section: reg.sections[0], region: i, x: cx + 0.5, z: cz + 0.5, main: true });
    const pz = reg.puzzle;
    if (!pz) return;
    // Direction from the landmark back towards the meadow: the entrance faces it.
    const toM = Math.atan2(meadow.z - cz, meadow.x - cx);
    const ex = Math.abs(Math.cos(toM)) > Math.abs(Math.sin(toM)) ? Math.sign(Math.cos(toM)) : 0;
    const ez = ex === 0 ? Math.sign(Math.sin(toM)) : 0;
    const R = 5;
    const gateCells: { x: number; z: number }[] = [];
    if (pz.gate === 'bridge') {
      // Bridge from the main island's east coast to the big islet: void until the vines grow.
      let sx = cx - 8;
      while (sx > C && cells[idx(sx, cz)].t !== FLOOR) sx--;
      const h0 = cells[idx(sx, cz)].h;
      const span = cx - 6 - (sx + 1);
      for (let x = sx + 1; x < cx - 6; x++)
        for (let dz = -1; dz <= 1; dz++) {
          const c = cells[idx(x, cz + dz)];
          if (c.t === FLOOR) continue;
          // A ramp up to the islet (cells stay void until the vines grow).
          c.h = Math.round((h0 + ((6 - h0) * (x - sx)) / (span + 1)) * 2) / 2;
          c.mat = 'bridge';
          c.room = i;
          gateCells.push({ x, z: cz + dz });
        }
      const gx = sx + 1;
      puzzles.push({
        id: `planet-${reg.id}`,
        region: i,
        def: pz,
        pieces: [-3, 0, 3].map((dz, k) => ({ x: sx - 2 + 0.5, z: cz + dz + 0.5, index: k })),
        gate: { x: gx + 0.5, z: cz + 0.5, cells: gateCells },
        hint: { x: sx - 3 + 0.5, z: cz + 5 + 0.5 },
      });
      for (const p of [-3, 0, 3]) for (let ox = -1; ox <= 1; ox++) reserved.add(idx(sx - 2 + ox, cz + p));
      return;
    }
    for (let z = cz - R; z <= cz + R; z++)
      for (let x = cx - R; x <= cx + R; x++) {
        if (!inside(x, z)) continue;
        const ring = Math.max(Math.abs(x - cx), Math.abs(z - cz)) === R;
        const c = cells[idx(x, z)];
        if (!ring) {
          if (Math.max(Math.abs(x - cx), Math.abs(z - cz)) < R) {
            c.t = FLOOR;
            c.h = h;
            c.mat = plazaMat;
            c.room = i;
            reserved.add(idx(x, z));
          }
          continue;
        }
        const entrance = (ex !== 0 && x === cx + ex * R && Math.abs(z - cz) <= 1) || (ez !== 0 && z === cz + ez * R && Math.abs(x - cx) <= 1);
        c.room = i;
        c.h = h;
        reserved.add(idx(x, z));
        if (pz.gate === 'lava') {
          c.t = FLOOR;
          c.mat = 'lava';
          c.solid = true;
          if (entrance) gateCells.push({ x, z });
        } else if (entrance) {
          c.t = FLOOR;
          c.mat = plazaMat;
          gateCells.push({ x, z });
        } else {
          c.t = WALL;
          c.mat = pz.gateMat;
        }
      }
    // Keep the approach to the entrance walkable.
    for (let k = 1; k <= 3; k++)
      for (let o = -1; o <= 1; o++) {
        const x = cx + ex * (R + k) + (ez !== 0 ? o : 0);
        const z = cz + ez * (R + k) + (ex !== 0 ? o : 0);
        if (!inside(x, z)) continue;
        const c = cells[idx(x, z)];
        if (c.t === VOID) {
          c.t = FLOOR;
          c.mat = plazaMat;
          c.room = i;
        }
        c.h = h;
        c.solid = false;
        if (c.mat === 'lava') c.mat = 'basalt';
        reserved.add(idx(x, z));
      }
    // Puzzle pieces scattered in the region, outside the ring; a hint stone by the entrance.
    const pieces: { x: number; z: number; index: number }[] = [];
    for (let t = 0; t < 600 && pieces.length < pz.n; t++) {
      const a = rand() * Math.PI * 2;
      const dist = 8 + rand() * 12;
      const x = Math.round(cx + Math.cos(a) * dist);
      const z = Math.round(cz + Math.sin(a) * dist);
      if (!inside(x, z)) continue;
      const c = cells[idx(x, z)];
      if (c.t !== FLOOR || c.room !== i || c.solid || c.mat === 'lava' || reserved.has(idx(x, z))) continue;
      if (pieces.some((p) => Math.hypot(p.x - x, p.z - z) < 5)) continue;
      pieces.push({ x: x + 0.5, z: z + 0.5, index: pieces.length });
      for (let ox = -1; ox <= 1; ox++) for (let oz = -1; oz <= 1; oz++) reserved.add(idx(x + ox, z + oz));
    }
    const hx = cx + ex * (R + 2) + (ez !== 0 ? 3 : 0);
    const hz = cz + ez * (R + 2) + (ex !== 0 ? 3 : 0);
    puzzles.push({ id: `planet-${reg.id}`, region: i, def: pz, pieces, gate: { x: cx + ex * R + 0.5, z: cz + ez * R + 0.5, cells: gateCells }, hint: { x: hx + 0.5, z: hz + 0.5 } });
    reserved.add(idx(hx, hz));
  });

  // Lava rivers flowing down the volcano (solid, decorative).
  const vc = centres[volI];
  for (const a of [20, 130, 250]) {
    for (let s = 7; s < 16; s++) {
      const x = Math.round(vc.x + Math.cos(rad(a)) * s + Math.sin(s * 0.7) * 1.2);
      const z = Math.round(vc.z + Math.sin(rad(a)) * s);
      const k = idx(x, z);
      if (!inside(x, z) || reserved.has(k) || paths.has(k) || cells[k].t !== FLOOR) continue;
      cells[k].mat = 'lava';
      cells[k].solid = true;
    }
  }

  // ── Decor scatter (deterministic; not on paths, plazas or next to puzzle pieces).
  const decor: PlanetDecor[] = [];
  const SOLID = new Set(['oak', 'supertree', 'pillar', 'crystal', 'palm', 'cactus', 'mesarock', 'jungletree', 'pine', 'basaltrock', 'rock', 'mossrock', 'snowrock', 'icecrystal', 'deadtree', 'hedge']);
  for (let z = 1; z < SIZE - 1; z++)
    for (let x = 1; x < SIZE - 1; x++) {
      const k = idx(x, z);
      const c = cells[k];
      if (c.t !== FLOOR || c.solid || paths.has(k) || reserved.has(k) || c.room < 0) continue;
      const reg = REGIONS[c.room];
      const roll = rand();
      let acc = 0;
      for (const [kind, dens] of reg.decor) {
        acc += dens;
        if (roll >= acc) continue;
        const solid = SOLID.has(kind);
        // Solid decor never touches another solid thing (keeps every route open).
        if (solid && decor.some((d) => d.solid && Math.abs(d.x - x) <= 2 && Math.abs(d.z - z) <= 2)) break;
        decor.push({ kind, x: x + 0.5, z: z + 0.5, rot: Math.floor(rand() * 4), s: 0.85 + rand() * 0.35, solid });
        if (solid) c.solid = true;
        break;
      }
    }


  const rooms: RoomRect[] = REGIONS.map((reg, i) => {
    let x0 = SIZE;
    let z0 = SIZE;
    let x1 = 0;
    let z1 = 0;
    cells.forEach((c, k) => {
      if (c.room !== i) return;
      const x = k % SIZE;
      const z = Math.floor(k / SIZE);
      x0 = Math.min(x0, x);
      z0 = Math.min(z0, z);
      x1 = Math.max(x1, x);
      z1 = Math.max(z1, z);
    });
    return { i, x: x0, z: z0, w: Math.max(1, x1 - x0 + 1), d: Math.max(1, z1 - z0 + 1), h: reg.base, kind: 'content', roomId: `region-${reg.id}`, title: reg.name };
  });
  const spawn = { x: meadow.x + 0.5, z: meadow.z + 3.5 };
  const spawns: Spawn[] = [{ kind: 'exit', x: meadow.x + 3.5, z: meadow.z + 5.5 }];
  return { id: 'planet', biome: 'planet-surface', w: SIZE, d: SIZE, cells, rooms, spawn, spawns, landmarks, puzzles, decor, sky };
}

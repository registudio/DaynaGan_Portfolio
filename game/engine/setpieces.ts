import * as THREE from 'three';
import { FLOOR, type LevelMap } from './layout.ts';

/**
 * Biome lighting set pieces: purely decorative, animated, unlit (so they cost
 * no light slots) and additive so bloom does the heavy lifting.
 *   academy-spires  → god-ray light shafts slanting down into each room
 *   robot-forge     → a molten-solder sea churning far below the islands
 *   circuit-caverns → data waterfalls pouring off the front edges + glow pools
 *   orbital-station → the station's exterior: hull keels, a turning habitat ring,
 *                     solar wings, blinking beacons and shuttle traffic
 */
export type SetPiece = { group: THREE.Group; update(t: number, dt: number): void; dispose(): void };

const SEA_DEPTH = -9;

export function buildSetPiece(biome: string, map: LevelMap, quality: 'low' | 'high'): SetPiece | null {
  if (biome === 'academy-spires') return godRays(map, quality);
  if (biome === 'robot-forge') return solderSea(map);
  if (biome === 'circuit-caverns') return dataFalls(map, quality);
  if (biome === 'planet-surface') return planetSea(map, quality);
  if (biome === 'orbital-station') return stationExterior(map, quality);
  return null;
}

function disposer(group: THREE.Group, extra: { dispose(): void }[] = []) {
  return () => {
    group.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
    extra.forEach((x) => x.dispose());
  };
}

/** Vertical gradient strip: bright at the top, fading out at the bottom. */
function shaftTexture() {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.15, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.7, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function godRays(map: LevelMap, quality: 'low' | 'high'): SetPiece {
  const group = new THREE.Group();
  const tex = shaftTexture();
  const shafts: { mesh: THREE.Mesh; phase: number; base: number }[] = [];
  const per = quality === 'high' ? 3 : 2;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const r of map.rooms) {
    if (r.kind === 'secret') continue;
    for (let k = 0; k < per; k++) {
      const w = 0.8 + rnd() * 1.2;
      const len = 16;
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        color: k % 2 ? '#fef9c3' : '#e0f2fe',
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        fog: false,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, len), mat);
      // Slant from the upper back (−x, −z) down toward the front, like light through tall windows.
      const x = r.x + 1 + rnd() * Math.max(1, r.w - 2);
      const z = r.z + 1 + rnd() * Math.max(1, r.d - 2);
      mesh.position.set(x - 2.5, r.h + len * 0.42, z - 2.5);
      mesh.rotation.set(0, Math.PI / 4, 0);
      mesh.rotateX(-0.42);
      mesh.renderOrder = 5;
      group.add(mesh);
      shafts.push({ mesh, phase: rnd() * Math.PI * 2, base: 0.06 + rnd() * 0.05 });
    }
  }
  return {
    group,
    update(t) {
      for (const s of shafts) (s.mesh.material as THREE.MeshBasicMaterial).opacity = s.base * (0.7 + 0.3 * Math.sin(t * 0.6 + s.phase));
    },
    dispose: disposer(group, [tex]),
  };
}

function solderTexture() {
  const S = 64;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  g.fillStyle = '#431407';
  g.fillRect(0, 0, S, S);
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const shades = ['#c2410c', '#ea580c', '#f97316', '#fb923c', '#fdba74', '#fef3c7'];
  // Blocky flow streaks, brighter towards the centre of each band.
  for (let i = 0; i < 140; i++) {
    const x = Math.floor(rnd() * S);
    const y = Math.floor(rnd() * S);
    const band = Math.abs(Math.sin((y / S) * Math.PI * 4));
    g.fillStyle = shades[Math.min(shades.length - 1, Math.floor(band * 3 + rnd() * 2))];
    g.fillRect(x, y, 2 + Math.floor(rnd() * 6), 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  // Mipmapped minification: nearest sampling at this repeat shimmers into moiré stripes.
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function solderSea(map: LevelMap): SetPiece {
  const group = new THREE.Group();
  const tex = solderTexture();
  const size = Math.max(map.w, map.d) + 80;
  tex.repeat.set(size / 8, size / 8);
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: tex, color: '#b45309', fog: false }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(map.w / 2, SEA_DEPTH, map.d / 2);
  group.add(sea);
  // A second, sparser layer drifting the other way gives the churn.
  const tex2 = tex.clone();
  tex2.repeat.set(size / 13, size / 13);
  tex2.needsUpdate = true;
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: tex2, color: '#f59e0b', transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(map.w / 2, SEA_DEPTH + 0.3, map.d / 2);
  group.add(glow);
  // Rising heat bubbles: little voxels that pop up from the sea.
  const bubbles: { m: THREE.Mesh; v: number }[] = [];
  const bMat = new THREE.MeshBasicMaterial({ color: '#fed7aa', fog: false });
  const bGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
  for (let i = 0; i < 24; i++) {
    const m = new THREE.Mesh(bGeo, bMat);
    m.position.set(Math.random() * (map.w + 20) - 10, SEA_DEPTH + Math.random() * 2, Math.random() * (map.d + 20) - 10);
    group.add(m);
    bubbles.push({ m, v: 0.6 + Math.random() });
  }
  return {
    group,
    update(t, dt) {
      tex.offset.set(t * 0.02, t * 0.035);
      tex2.offset.set(-t * 0.03, t * 0.012);
      (glow.material as THREE.MeshBasicMaterial).opacity = 0.14 + 0.06 * Math.sin(t * 1.3);
      for (const b of bubbles) {
        b.m.position.y += b.v * dt;
        if (b.m.position.y > SEA_DEPTH + 2.5) {
          b.m.position.y = SEA_DEPTH;
          b.m.position.x = Math.random() * (map.w + 20) - 10;
          b.m.position.z = Math.random() * (map.d + 20) - 10;
        }
      }
    },
    dispose: disposer(group, [tex, tex2]),
  };
}

function dataFalls(map: LevelMap, quality: 'low' | 'high'): SetPiece {
  const group = new THREE.Group();
  const { w, d, cells } = map;
  const at = (x: number, z: number) => (x < 0 || z < 0 || x >= w || z >= d ? undefined : cells[z * w + x]);
  // Front-facing edge cells (camera sits at +x,+z) where the floor drops into the void.
  const edges: { x: number; z: number; h: number; dx: number; dz: number }[] = [];
  for (let z = 0; z < d; z++)
    for (let x = 0; x < w; x++) {
      const c = cells[z * w + x];
      if (c.t !== FLOOR || c.secret) continue;
      const e = at(x + 1, z);
      const s = at(x, z + 1);
      if (!e || e.t === 0) edges.push({ x: x + 1, z: z + 0.5, h: c.h, dx: 1, dz: 0 });
      if (!s || s.t === 0) edges.push({ x: x + 0.5, z: z + 1, h: c.h, dx: 0, dz: 1 });
    }
  // Pick evenly spaced falls so they read as distinct streams rather than a curtain.
  const falls = edges.filter((_, i) => i % 7 === 3).slice(0, quality === 'high' ? 18 : 9);
  const PER = quality === 'high' ? 40 : 24;
  const DROP = 9;
  const n = falls.length * PER;
  const pos = new Float32Array(n * 3);
  const speed = new Float32Array(n);
  const origin = (i: number) => falls[Math.floor(i / PER)];
  const reset = (i: number, spread = false) => {
    const f = origin(i);
    const j = (Math.random() - 0.5) * 0.9;
    pos[i * 3] = f.x + (f.dx ? 0.1 : j);
    pos[i * 3 + 1] = f.h - (spread ? Math.random() * DROP : 0);
    pos[i * 3 + 2] = f.z + (f.dz ? 0.1 : j);
    speed[i] = 3 + Math.random() * 3;
  };
  for (let i = 0; i < n; i++) reset(i, true);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(
    geo,
    new THREE.PointsMaterial({ color: '#5eead4', size: 3, sizeAttenuation: false, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }),
  );
  pts.frustumCulled = false;
  group.add(pts);
  // Glow pools where each stream lands.
  const poolMat = new THREE.MeshBasicMaterial({ color: '#2dd4bf', transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const poolGeo = new THREE.CircleGeometry(1.4, 12);
  const pools: THREE.Mesh[] = [];
  for (const f of falls) {
    const p = new THREE.Mesh(poolGeo, poolMat);
    p.rotation.x = -Math.PI / 2;
    p.position.set(f.x + f.dx * 0.8, f.h - DROP, f.z + f.dz * 0.8);
    group.add(p);
    pools.push(p);
  }
  return {
    group,
    update(t, dt) {
      for (let i = 0; i < n; i++) {
        const f = origin(i);
        pos[i * 3 + 1] -= speed[i] * dt;
        // Arc slightly outward as it falls.
        pos[i * 3] += f.dx * dt * 0.35;
        pos[i * 3 + 2] += f.dz * dt * 0.35;
        if (pos[i * 3 + 1] < f.h - DROP) reset(i);
      }
      geo.attributes.position.needsUpdate = true;
      poolMat.opacity = 0.28 + 0.1 * Math.sin(t * 2.2);
      for (let k = 0; k < pools.length; k++) pools[k].scale.setScalar(1 + 0.08 * Math.sin(t * 3 + k));
    },
    dispose: disposer(group),
  };
}

function waterTexture() {
  const S = 64;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  g.fillStyle = '#1d6fa3';
  g.fillRect(0, 0, S, S);
  let seed = 5;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const shades = ['#2383bd', '#2b93cf', '#58b6e6', '#a5dcf5'];
  for (let i = 0; i < 180; i++) {
    const x = Math.floor(rnd() * S);
    const y = Math.floor(rnd() * S);
    g.fillStyle = shades[Math.min(3, Math.floor(rnd() * rnd() * 4.5))];
    g.fillRect(x, y, 2 + Math.floor(rnd() * 5), 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Planet Aurora: the sea around the island, and waterfalls pouring off the sky islands. */
function planetSea(map: LevelMap, quality: 'low' | 'high'): SetPiece {
  const group = new THREE.Group();
  const tex = waterTexture();
  const size = Math.max(map.w, map.d) + 160;
  tex.repeat.set(size / 10, size / 10);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshLambertMaterial({ map: tex, transparent: true, opacity: 0.92 }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(map.w / 2, -0.35, map.d / 2);
  group.add(sea);
  const deep = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ color: '#0b2a4a' }));
  deep.rotation.x = -Math.PI / 2;
  deep.position.set(map.w / 2, -2.5, map.d / 2);
  group.add(deep);
  // Waterfalls: sky-island cells (h ≥ 5) whose east/south neighbour is open sky.
  const { w, d, cells } = map;
  const at = (x: number, z: number) => (x < 0 || z < 0 || x >= w || z >= d ? undefined : cells[z * w + x]);
  const edges: { x: number; z: number; h: number; dx: number; dz: number }[] = [];
  for (let z = 0; z < d; z++)
    for (let x = 0; x < w; x++) {
      const c = cells[z * w + x];
      if (c.t !== FLOOR || (c.mat !== 'sky' && c.mat !== 'bridge') || c.h < 3) continue;
      const e = at(x + 1, z);
      const s2 = at(x, z + 1);
      if (!e || e.t === 0) edges.push({ x: x + 1, z: z + 0.5, h: c.h, dx: 1, dz: 0 });
      if (!s2 || s2.t === 0) edges.push({ x: x + 0.5, z: z + 1, h: c.h, dx: 0, dz: 1 });
    }
  const falls = edges.filter((_, i) => i % 3 === 1).slice(0, quality === 'high' ? 16 : 8);
  const PER = quality === 'high' ? 36 : 20;
  const n = falls.length * PER;
  const pos = new Float32Array(n * 3);
  const speed = new Float32Array(n);
  const reset = (i: number, spread = false) => {
    const f = falls[Math.floor(i / PER)];
    const j = (Math.random() - 0.5) * 0.9;
    pos[i * 3] = f.x + (f.dx ? 0.1 : j);
    pos[i * 3 + 1] = f.h - (spread ? Math.random() * (f.h + 0.4) : 0);
    pos[i * 3 + 2] = f.z + (f.dz ? 0.1 : j);
    speed[i] = 4 + Math.random() * 3;
  };
  for (let i = 0; i < n; i++) reset(i, true);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#dbeafe', size: 3, sizeAttenuation: false, transparent: true, opacity: 0.85, depthWrite: false }));
  pts.frustumCulled = false;
  group.add(pts);
  return {
    group,
    update(t, dt) {
      tex.offset.set(t * 0.01, t * 0.006);
      for (let i = 0; i < n; i++) {
        const f = falls[Math.floor(i / PER)];
        pos[i * 3 + 1] -= speed[i] * dt;
        pos[i * 3] += f.dx * dt * 0.3;
        pos[i * 3 + 2] += f.dz * dt * 0.3;
        if (pos[i * 3 + 1] < -0.3) reset(i);
      }
      geo.attributes.position.needsUpdate = true;
    },
    dispose: disposer(group, [tex]),
  };
}

/** Solar-cell texture: deep blue cells in a silver grid. */
function solarTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#c7cdd9';
  g.fillRect(0, 0, 64, 64);
  for (let x = 0; x < 4; x++)
    for (let y = 0; y < 4; y++) {
      g.fillStyle = (x + y) % 2 ? '#1e3a8a' : '#1d4ed8';
      g.fillRect(x * 16 + 1, y * 16 + 1, 14, 14);
    }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function stationExterior(map: LevelMap, quality: 'low' | 'high'): SetPiece {
  const group = new THREE.Group();
  const hull = new THREE.MeshLambertMaterial({ color: '#3a4152' });
  const hullLight = new THREE.MeshLambertMaterial({ color: '#8a93a6' });
  const violet = new THREE.MeshBasicMaterial({ color: '#a78bfa', fog: false });
  const cyan = new THREE.MeshBasicMaterial({ color: '#7dd3fc', fog: false });
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  const cx = map.w / 2;
  const cz = map.d / 2;
  const span = Math.max(map.w, map.d);

  // Hull keels under every module: a tapered block with a glowing seam, so the decks read as
  // a solid station rather than floating tiles.
  for (const r of map.rooms) {
    const rx = r.x + r.w / 2;
    const rz = r.z + r.d / 2;
    add(new THREE.BoxGeometry(r.w * 0.8, 2.5, r.d * 0.8), hull, rx, -2.6, rz);
    add(new THREE.BoxGeometry(r.w * 0.5, 2.5, r.d * 0.5), hull, rx, -5, rz);
    add(new THREE.BoxGeometry(r.w * 0.82, 0.12, r.d * 0.82), violet, rx, -1.4, rz);
    add(new THREE.BoxGeometry(1.2, 4, 1.2), hullLight, rx, -8, rz);
    add(new THREE.BoxGeometry(0.5, 0.5, 0.5), cyan, rx, -10.2, rz);
  }

  // Habitat ring turning slowly beneath the station, joined by four spokes.
  const ring = new THREE.Group();
  ring.position.set(cx, -9, cz);
  group.add(ring);
  const R = span * 0.62;
  const torus = new THREE.Mesh(new THREE.TorusGeometry(R, 1.6, 6, quality === 'high' ? 64 : 40), hull);
  torus.rotation.x = Math.PI / 2;
  ring.add(torus);
  const band = new THREE.Mesh(new THREE.TorusGeometry(R + 1.45, 0.18, 4, quality === 'high' ? 64 : 40), cyan);
  band.rotation.x = Math.PI / 2;
  ring.add(band);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(R, 0.6, 0.6), hullLight);
    spoke.position.set((Math.cos(a) * R) / 2, 0, (Math.sin(a) * R) / 2);
    spoke.rotation.y = -a;
    ring.add(spoke);
  }
  // Window lights around the ring.
  const winGeo = new THREE.BoxGeometry(0.5, 0.35, 0.5);
  const n = quality === 'high' ? 48 : 28;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const w = new THREE.Mesh(winGeo, k % 5 === 0 ? violet : cyan);
    w.position.set(Math.cos(a) * R, 1.55, Math.sin(a) * R);
    ring.add(w);
  }

  // Solar wings off the back (−x and −z), behind the walls so they never hide the decks.
  const solar = solarTexture();
  const beacons: THREE.Mesh[] = [];
  solar.repeat.set(2, 3);
  const panelMat = new THREE.MeshLambertMaterial({ map: solar, side: THREE.DoubleSide });
  const wing = (alongX: boolean) => {
    const len = span * 0.55;
    const root = alongX ? new THREE.Vector3(-4, 1.5, cz) : new THREE.Vector3(cx, 1.5, -4);
    const dir = alongX ? new THREE.Vector3(-1, 0, 0) : new THREE.Vector3(0, 0, -1);
    const truss = add(new THREE.BoxGeometry(alongX ? len : 0.5, 0.5, alongX ? 0.5 : len), hullLight, 0, 0, 0);
    truss.position.copy(root).addScaledVector(dir, len / 2);
    const panels = Math.max(3, Math.floor(len / 7));
    for (let k = 0; k < panels; k++) {
      for (const side of [-1, 1]) {
        const p = new THREE.Mesh(new THREE.PlaneGeometry(alongX ? 5 : 8, alongX ? 8 : 5), panelMat);
        p.rotation.x = -Math.PI / 2 + 0.35 * side;
        const at = root.clone().addScaledVector(dir, 4 + k * 7);
        if (alongX) at.z += side * 5;
        else at.x += side * 5;
        p.position.copy(at);
        group.add(p);
      }
    }
    const tip = add(new THREE.BoxGeometry(0.6, 0.6, 0.6), new THREE.MeshBasicMaterial({ color: '#f43f5e', fog: false }), 0, 0, 0);
    tip.position.copy(root).addScaledVector(dir, len + 0.5);
    beacons.push(tip);
  };
  wing(true);
  wing(false);

  // Comms mast rising behind the Command Deck.
  const deck = map.rooms[0];
  if (deck) {
    const mx = deck.x - 3;
    const mz = deck.z - 3;
    add(new THREE.BoxGeometry(0.5, 12, 0.5), hullLight, mx, 4, mz);
    add(new THREE.BoxGeometry(3, 0.25, 0.25), hullLight, mx, 8.5, mz);
    const dish = add(new THREE.CylinderGeometry(1.6, 0.2, 0.6, 12, 1, true), hullLight, mx, 10.5, mz);
    dish.rotation.z = 0.5;
    const top = add(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: '#f43f5e', fog: false }), mx, 10.3, mz);
    beacons.push(top);
  }

  // Shuttle traffic on long loops around the station.
  const ships: { g: THREE.Group; r: number; y: number; speed: number; phase: number }[] = [];
  const shipBody = new THREE.BoxGeometry(1.2, 0.5, 2.4);
  const engine = new THREE.BoxGeometry(0.8, 0.3, 0.1);
  const flame = new THREE.MeshBasicMaterial({ color: '#c4b5fd', fog: false });
  for (let k = 0; k < (quality === 'high' ? 3 : 2); k++) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(shipBody, hullLight));
    const e = new THREE.Mesh(engine, flame);
    e.position.z = -1.25;
    g.add(e);
    group.add(g);
    ships.push({ g, r: span * (0.8 + k * 0.25), y: -4 + k * 6, speed: 0.05 + k * 0.02, phase: k * 2.1 });
  }

  return {
    group,
    update(t, dt) {
      ring.rotation.y += dt * 0.03;
      for (const [k, b] of beacons.entries()) b.visible = Math.sin(t * 3 + k * 1.7) > 0.2;
      for (const sh of ships) {
        const a = sh.phase + t * sh.speed;
        sh.g.position.set(cx + Math.cos(a) * sh.r, sh.y + Math.sin(t * 0.5 + sh.phase) * 0.6, cz + Math.sin(a) * sh.r);
        sh.g.rotation.y = -a;
      }
    },
    dispose: disposer(group, [solar]),
  };
}

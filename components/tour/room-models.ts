import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { roomOrigins, type Vec3 } from '@/lib/tour';
import type { TourContent } from '@/lib/content';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeSurfaceMaps } from './surface-materials';
// Authored interior sets supplement the supplied sectional exterior. Geometry is batched by material.
export const palette = {
  wall: new T.MeshStandardMaterial({ color: '#343943', metalness: 0.6, roughness: 0.6 }),
  dark: new T.MeshStandardMaterial({ color: '#090d16', metalness: 0.4, roughness: 0.6 }),
  metal: new T.MeshStandardMaterial({ color: '#6d7381', metalness: 0.7, roughness: 0.3 }),
  floor: new T.MeshPhysicalMaterial({
    color: '#434b56',
    metalness: 0.72,
    roughness: 0.3,
    clearcoat: 0.25,
    clearcoatRoughness: 0.28,
  }),
  glass: new T.MeshPhysicalMaterial({
    color: '#111f2a',
    metalness: 0.65,
    roughness: 0.12,
    clearcoat: 1,
  }),
  purple: new T.MeshStandardMaterial({
    color: '#bd96ff',
    emissive: '#9860eb',
    emissiveIntensity: 2,
    roughness: 0.25,
  }),
  white: new T.MeshStandardMaterial({
    color: '#c6d6e7',
    emissive: '#8baccf',
    emissiveIntensity: 1.2,
  }),
  green: new T.MeshStandardMaterial({
    color: '#81ffad',
    emissive: '#22ff57',
    emissiveIntensity: 2,
  }),
  red: new T.MeshStandardMaterial({ color: '#ff7979', emissive: '#ff1939', emissiveIntensity: 2 }),
};
type Mat = keyof typeof palette;
function builder(name: string, materials = palette) {
  const group = new T.Group();
  group.name = name;
  const buckets: Partial<Record<Mat, T.BufferGeometry[]>> = {};
  const add = (g: T.BufferGeometry, mat: Mat, p: Vec3 = [0, 0, 0], r: Vec3 = [0, 0, 0]) => {
    g.applyMatrix4(
      new T.Matrix4().compose(
        new T.Vector3(...p),
        new T.Quaternion().setFromEuler(new T.Euler(...r)),
        new T.Vector3(1, 1, 1),
      ),
    );
    const geo = g.index ? g.toNonIndexed() : g;
    if (geo !== g) g.dispose();
    (buckets[mat] ??= []).push(geo);
  };
  const box = (s: Vec3, p: Vec3, mat: Mat = 'wall', r: Vec3 = [0, 0, 0]) =>
    add(
      Math.min(...s) > 0.045
        ? new RoundedBoxGeometry(...s, 2, Math.min(0.014, Math.min(...s) * 0.12))
        : new T.BoxGeometry(...s),
      mat,
      p,
      r,
    );
  const cyl = (radius: number, h: number, p: Vec3, mat: Mat = 'metal', r: Vec3 = [0, 0, 0]) =>
    add(new T.CylinderGeometry(radius, radius, h, 20), mat, p, r);
  const ring = (radius: number, p: Vec3, mat: Mat = 'metal') =>
    add(new T.TorusGeometry(radius, 0.035, 5, 48), mat, p, [Math.PI / 2, 0, 0]);
  const finish = () => {
    for (const [m, geos] of Object.entries(buckets)) {
      const mesh = new T.Mesh(mergeGeometries(geos), materials[m as Mat]);
      mesh.castShadow = !['white', 'purple', 'green', 'red'].includes(m);
      mesh.receiveShadow = true;
      geos.forEach((g) => g.dispose());
      mesh.name = `${name}_${m}`;
      group.add(mesh);
    }
    return group;
  };
  return { group, add, box, cyl, ring, finish };
}
function shell(b: ReturnType<typeof builder>, depth = 7, width = 7) {
  // Keep portrait cameras inside the room, rather than exposing the set edges to space.
  b.box([width, 0.13, 6], [0, -0.6, 4.5], 'dark');
  b.box([width, 0.15, 6], [0, 2.4, 4.5], 'wall');
  for (const side of [-1, 1]) b.box([0.16, 3, 6], [(side * width) / 2, 0.9, 4.5], 'wall');
  for (let k = 0; k < 5; k++) b.box([width - 0.3, 0.025, 0.045], [0, 2.28, 2.5 + k], 'white');
  b.box([width, 0.13, depth], [0, -0.6, -1.5], 'dark');
  b.box([width, 0.15, depth], [0, 2.4, -1.5], 'wall');
  b.box([width, 3, 0.15], [0, 0.9, -1.5 - depth / 2]);
  const back = -1.4 - depth / 2;
  for (let col = 0; col < 5; col++) {
    const x = (col - 2) * 1.22;
    b.box([1.08, 2.35, 0.07], [x, 0.87, back], 'dark');
    b.box([0.97, 2.2, 0.085], [x, 0.87, back + 0.035], 'wall');
    b.box([0.025, 1.8, 0.02], [x - 0.42, 0.85, back + 0.087], 'metal');
    for (let k = 0; k < 4; k++)
      b.box([0.64, 0.032, 0.025], [x, -0.1 + k * 0.48, back + 0.085], 'metal');
    b.box([0.1, 0.04, 0.04], [x + 0.32, 1.67, back + 0.09], col % 2 ? 'red' : 'white');
  }
  for (const side of [-1, 1]) {
    b.box([0.16, 3, depth], [(side * width) / 2, 0.9, -1.5]);
    for (let k = 0; k < 8; k++) {
      const z = 1.4 - k * 0.8;
      b.box([0.13, 2.8, 0.14], [side * (width / 2 - 0.08), 0.9, z], 'metal');
      b.box([0.018, 1.55, 0.035], [side * (width / 2 - 0.18), 0.85, z], 'white');
    }
  }
  for (let k = 0; k < 7; k++) {
    b.box([width - 0.3, 0.03, 0.05], [0, 2.28, 1.2 - k * 0.9], 'white');
    b.box(
      [0.035, 0.008, depth - 0.5],
      [-width / 2 + 0.5 + (k * (width - 1)) / 6, -0.525, -1.5],
      'metal',
    );
  }
  // Recessed plates, service conduits, vents and fasteners give the interior scale.
  for (let row = 0; row < 8; row++)
    for (let col = 0; col < 7; col++) {
      const x = ((col - 3) * (width - 0.35)) / 7,
        z = 1.5 - (row * (depth - 0.5)) / 8;
      b.box([(width - 0.5) / 7, 0.012, (depth - 0.8) / 8], [x, -0.515, z], 'floor');
      for (const side of [-1, 1])
        b.box([0.016, 0.008, 0.055], [x + side * 0.36, -0.504, z + 0.22], 'dark');
    }
  for (const side of [-1, 1])
    for (let k = 0; k < 7; k++) {
      const x = side * (width / 2 - 0.13),
        z = 1.1 - k * 0.85;
      b.box([0.06, 0.7, 0.48], [x, 0.35, z], 'dark');
      for (let j = 0; j < 5; j++)
        b.box([0.075, 0.022, 0.36], [x - side * 0.035, 0.1 + j * 0.12, z], 'metal');
      b.cyl(0.035, 2.4, [x - side * 0.09, 0.8, z - 0.3], 'metal');
      b.box([0.025, 0.045, 0.04], [x - side * 0.12, 1.5, z], k % 3 === 0 ? 'red' : 'white');
    }
}
function screenTexture(title: string, lines: string[], color = '#b99aff') {
  const c = document.createElement('canvas');
  c.width = 768;
  c.height = 384;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#080d1c';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.strokeRect(14, 14, 740, 356);
  ctx.fillStyle = color;
  ctx.font = '22px monospace';
  ctx.fillText(title.toUpperCase().slice(0, 42), 32, 57);
  ctx.fillStyle = '#cdd8ee';
  ctx.font = '19px monospace';
  lines.slice(0, 7).forEach((line, i) => ctx.fillText(line.slice(0, 55), 32, 105 + i * 34));
  const texture = new T.CanvasTexture(c);
  texture.colorSpace = T.SRGBColorSpace;
  return texture;
}
function screen(
  parent: T.Group,
  name: string,
  p: Vec3,
  title: string,
  lines: string[],
  width = 1.3,
  height = 0.68,
) {
  const mesh = new T.Mesh(
    new T.PlaneGeometry(width, height),
    new T.MeshBasicMaterial({ map: screenTexture(title, lines), toneMapped: false }),
  );
  mesh.position.set(...p);
  mesh.name = name;
  parent.add(mesh);
}
export function makeInteriors(
  repoNames: string[],
  eventLines: string[],
  languages: string[],
  education: TourContent['education'],
) {
  const result = new T.Group();
  const maps = makeSurfaceMaps();
  const materials = Object.fromEntries(
    Object.entries(palette).map(([name, source]) => {
      const material = source.clone();
      if (['wall', 'dark', 'metal', 'floor'].includes(name)) {
        material.roughnessMap = maps.roughness;
        material.bumpMap = maps.bump;
        material.bumpScale = name === 'floor' ? 0.004 : 0.0015;
        material.envMapIntensity = name === 'metal' || name === 'floor' ? 0.75 : 0.35;
      }
      return [name, material];
    }),
  ) as typeof palette;
  result.name = 'Tour_Interiors';
  for (const stage of [1, 2, 3, 6, 7]) {
    const b = builder(`room-${stage}`, materials);
    shell(b, stage === 3 ? 10 : 7, stage === 3 ? 8 : 7);
    if (stage === 1) {
      b.cyl(0.7, 0.2, [0, -0.38, 0], 'metal');
      b.cyl(0.43, 2.4, [0, 0.7, 0], 'dark');
      b.cyl(0.23, 2.4, [0, 0.7, 0], 'purple');
      for (let i = 0; i < 9; i++)
        b.ring(0.49, [0, -0.3 + i * 0.25, 0], i % 3 === 0 ? 'purple' : 'metal');
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        b.box([0.035, 2.2, 0.035], [Math.sin(a) * 0.42, 0.7, Math.cos(a) * 0.42], 'metal');
        b.box([0.05, 0.05, 1.2], [Math.sin(a) * 1.0, -0.48, Math.cos(a) * 1.0], 'purple', [
          0,
          a,
          0,
        ]);
      }
      b.cyl(0.85, 0.18, [0, 1.96, 0], 'metal');
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        b.box([0.12, 0.16, 0.22], [Math.sin(a) * 0.7, -0.3, Math.cos(a) * 0.7], 'wall', [0, a, 0]);
        b.cyl(0.032, 1.5, [Math.sin(a) * 0.63, 0.6, Math.cos(a) * 0.63], 'metal');
      }
      for (const x of [-1.5, 1.5]) {
        b.cyl(0.18, 1.5, [x, 0.25, -1.3], 'metal');
        for (let j = 0; j < 6; j++) b.ring(0.2, [x, -0.4 + j * 0.25, -1.3], 'dark');
        b.box([0.45, 0.14, 0.5], [x, -0.4, -1.3], 'wall');
      }
    }
    if (stage === 2 || stage === 6 || stage === 7) {
      const spacing = stage === 7 ? 1.4 : 1.7;
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * spacing;
        b.box([1.5, 1.5, 0.2], [x, 0.38, -0.92], 'dark');
        b.box([1.55, 0.08, 0.22], [x, 1.15, -0.9], 'metal');
        b.box([1.55, 0.05, 0.035], [x, 1.11, -0.77], 'purple');
        b.box([1.4, 0.09, 0.65], [x, -0.05, -0.6], 'wall', [-0.16, 0, 0]);
        for (let k = 0; k < 7; k++)
          b.box(
            [0.06, 0.014, 0.025],
            [x - 0.4 + k * 0.13, 0.01, -0.45],
            k % 3 === 0 ? 'purple' : 'white',
          );
        for (const side of [-1, 1]) {
          b.box([0.045, 0.91, 0.07], [x + side * 0.68, 0.64, -0.77], 'metal');
          for (let k = 0; k < 4; k++)
            b.cyl(0.012, 0.017, [x + side * 0.68, 0.26 + k * 0.25, -0.727], 'dark', [
              Math.PI / 2,
              0,
              0,
            ]);
        }
        for (let row = 0; row < 3; row++)
          for (let col = 0; col < 12; col++)
            b.box(
              [0.036, 0.008, 0.026],
              [x - 0.27 + col * 0.047, 0.013, -0.37 + row * 0.042],
              row === 0 && col % 4 === 0 ? 'white' : 'dark',
            );
      }
    }
    if (stage === 3) {
      // Suspended service mounts connect the parked fighters to the overhead gantry.
      for (let i = 0; i < 7; i++) {
        const x = ((i % 4) - 1.5) * 1.12,
          z = -Math.floor(i / 4) * 2;
        b.cyl(0.021, 1.5, [x, 1.04, z], 'metal');
        b.box([0.24, 0.08, 0.22], [x, 0.3, z], 'dark');
        b.box([0.32, 0.075, 0.35], [x, 1.82, z], 'wall');
      }
      for (const side of [-1, 1])
        for (let i = 0; i < 4; i++) {
          const x = side * 3.05,
            z = -0.5 - i * 1.4;
          b.box([0.65, 0.55, 0.65], [x, -0.23, z], 'wall');
          b.box([0.69, 0.045, 0.69], [x, 0.055, z], 'metal');
          b.box([0.04, 0.36, 0.67], [x - side * 0.22, -0.21, z], 'dark');
          b.box([0.08, 0.02, 0.2], [x, 0.085, z], 'purple');
        }
      for (const x of [-2.5, 2.5]) b.box([0.08, 0.01, 8], [x, -0.52, -1.5], 'white');
      for (let i = 0; i < 7; i++) {
        b.box(
          [0.86, 0.01, 0.055],
          [((i % 4) - 1.5) * 1.12, -0.51, -Math.floor(i / 4) * 2 + 0.55],
          'purple',
        );
      }
      for (let k = 0; k < 5; k++) {
        b.box([7.8, 0.12, 0.15], [0, 1.9, 1.3 - k * 1.8], 'metal');
        b.box([0.12, 2.2, 0.14], [-3.5, 0.7, 1.3 - k * 1.8], 'metal');
        b.box([0.12, 2.2, 0.14], [3.5, 0.7, 1.3 - k * 1.8], 'metal');
      }
    }
    if (stage === 6) {
      b.box([1.7, 0.1, 2.1], [0, -0.52, -2.8], 'dark');
      for (const x of [-0.9, 0.9]) b.box([0.04, 0.65, 2.4], [x, -0.2, -2.8], 'metal');
    }
    if (stage === 7) {
      for (const side of [-1, 1])
        for (let i = 0; i < 9; i++)
          for (let j = 0; j < 4; j++) {
            b.box([0.36, 0.2, 0.44], [side * 2.8, -0.2 + j * 0.44, -0.2 - i * 0.42], 'metal');
            b.box(
              [0.02, 0.04, 0.24],
              [side * 2.58, -0.2 + j * 0.44, -0.2 - i * 0.42],
              i % 3 === 0 ? 'purple' : 'white',
            );
          }
    }
    const room = b.finish();
    room.position.set(...roomOrigins[stage]);
    room.userData.stage = stage;
    if (stage === 2) {
      education.forEach((e, i) =>
        screen(
          room,
          `academy-screen-${i}`,
          [(i - 1) * 1.7, 0.66, -0.795],
          e.short,
          [e.qualification, e.period, ...e.details].filter(Boolean),
        ),
      );
    }
    if (stage === 6) {
      screen(room, 'live-activity', [-1.7, 0.66, -0.795], 'LIVE / PUBLIC ACTIVITY', eventLines);
      screen(room, 'live-repositories', [0, 0.66, -0.795], 'ACTIVE REPOSITORIES', repoNames);
      screen(room, 'live-languages', [1.7, 0.66, -0.795], 'LANGUAGE SYSTEMS', languages);
    }
    if (stage === 7) {
      ['ENGINEERING LOGS', 'FIELD NOTES', 'ARCHIVE INDEX'].forEach((name, i) =>
        screen(room, `archive-screen-${i}`, [(i - 1) * 1.4, 0.66, -0.795], name, [
          'SECTOR ARCHIVES',
          'ACCESS TERMINAL',
          'SELECT TO ENTER',
        ]),
      );
    }
    if (stage === 3) {
      for (let i = 0; i < 7; i++) {
        const f = builder(`fighter-${i}`, materials);
        f.add(new T.SphereGeometry(0.145, 32, 20), 'metal');
        f.cyl(0.105, 0.03, [0, 0, 0.13], 'dark', [Math.PI / 2, 0, 0]);
        f.cyl(0.083, 0.009, [0, 0, 0.151], 'glass', [Math.PI / 2, 0, 0]);
        for (let k = 0; k < 4; k++)
          f.box([0.006, 0.172, 0.006], [0, 0, 0.16], 'metal', [0, 0, (k * Math.PI) / 4]);
        f.cyl(0.025, 0.012, [0, 0, 0.165], 'metal', [Math.PI / 2, 0, 0]);
        for (const x of [-0.045, 0.045]) {
          f.cyl(0.014, 0.12, [x, -0.11, 0.15], 'metal', [Math.PI / 2, 0, 0]);
          f.cyl(0.019, 0.025, [x, 0.035, -0.142], 'red', [Math.PI / 2, 0, 0]);
        }
        f.box([0.7, 0.055, 0.055], [0, 0, 0], 'metal');
        for (const side of [-1, 1]) {
          f.add(
            new T.CylinderGeometry(0.36, 0.36, 0.035, 6),
            'dark',
            [side * 0.33, 0, 0],
            [0, 0, Math.PI / 2],
          );
          f.add(
            new T.CylinderGeometry(0.37, 0.37, 0.008, 6, 1, true),
            'metal',
            [side * 0.35, 0, 0],
            [0, 0, Math.PI / 2],
          );
          f.box([0.025, 0.67, 0.025], [side * 0.35, 0, 0], 'metal');
          for (let k = 0; k < 3; k++)
            f.box([0.013, 0.69, 0.014], [side * 0.356, 0, 0], 'metal', [(k * Math.PI) / 3, 0, 0]);
          for (let k = 0; k < 6; k++) {
            const a = (k * Math.PI) / 3;
            f.box(
              [0.018, 0.36, 0.014],
              [side * 0.356, Math.cos(a) * 0.313, Math.sin(a) * 0.313],
              'metal',
              [Math.PI / 2 - a, 0, 0],
            );
          }
        }
        const fighter = f.finish();
        fighter.position.set(((i % 4) - 1.5) * 1.12, 0.15, -Math.floor(i / 4) * 2);
        fighter.rotation.y = i % 2 ? 0.3 : -0.2;
        room.add(fighter);
      }
    }
    result.add(room);
  }
  return result;
}
export function disposeInterior(root: T.Object3D) {
  const materials = new Set<T.MeshStandardMaterial>(),
    textures = new Set<T.Texture>();
  root.traverse((o) => {
    if (o instanceof T.Mesh) {
      o.geometry.dispose();
      const m = o.material as T.MeshStandardMaterial;
      materials.add(m);
    }
  });
  materials.forEach((m) => {
    [m.map, m.bumpMap, m.roughnessMap].forEach((t) => {
      if (t) textures.add(t);
    });
    m.dispose();
  });
  textures.forEach((t) => t.dispose());
}

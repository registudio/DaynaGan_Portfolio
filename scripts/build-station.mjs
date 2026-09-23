/** D-01 authored parametric model. Run offline; no geometry is authored in React.
 * Dimension system: radius 2.7 m, deck spacing .75 m, shell gap .035 rad.
 * Fixed structural hierarchy and material batches; import the GLB into Blender
 * for further art direction without changing the named module contracts.
 */
import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mkdirSync, writeFileSync } from 'node:fs';
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((b) => {
      this.result = b;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((b) => {
      this.result = `data:${blob.type};base64,${Buffer.from(b).toString('base64')}`;
      this.onloadend?.();
    });
  }
};
const scene = new T.Scene();
const root = new T.Group();
root.name = 'D01_Station';
scene.add(root);
const materials = {
  ceramic: new T.MeshStandardMaterial({ color: 0xc5d4d6, roughness: 0.5, metalness: 0.3 }),
  dark: new T.MeshStandardMaterial({ color: 0x243c4a, roughness: 0.55, metalness: 0.7 }),
  steel: new T.MeshStandardMaterial({ color: 0x7398a5, roughness: 0.36, metalness: 0.7 }),
  yellow: new T.MeshStandardMaterial({ color: 0xd6ba63, roughness: 0.45, metalness: 0.3 }),
  cyan: new T.MeshStandardMaterial({
    color: 0x6ce4ed,
    emissive: 0x28bfce,
    emissiveIntensity: 1.3,
    roughness: 0.3,
  }),
};
Object.entries(materials).forEach(([k, m]) => (m.name = k));
let active, buckets;
function group(name, section, offset) {
  flush();
  active = new T.Group();
  active.name = name;
  active.userData = { section, assemblyOffset: offset };
  root.add(active);
  buckets = {};
  return active;
}
function flush() {
  if (!active) return;
  for (const [mat, geos] of Object.entries(buckets)) {
    const mesh = new T.Mesh(mergeGeometries(geos), materials[mat]);
    mesh.name = `${active.name}_${mat}`;
    active.add(mesh);
  }
}
function add(geo, mat, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const matrix = new T.Matrix4().compose(
    new T.Vector3(...pos),
    new T.Quaternion().setFromEuler(new T.Euler(...rot)),
    new T.Vector3(1, 1, 1),
  );
  geo.applyMatrix4(matrix);
  const g = geo.index ? geo.toNonIndexed() : geo;
  delete g.attributes.uv;
  (buckets[mat] ??= []).push(g);
}
const box = (size, pos, mat = 'steel', rot = [0, 0, 0]) =>
  add(new T.BoxGeometry(...size), mat, pos, rot);
const cylinder = (r, h, pos, mat = 'steel') => add(new T.CylinderGeometry(r, r, h, 16), mat, pos);
const ring = (r, t, pos, mat = 'steel', rot = [Math.PI / 2, 0, 0], arc = Math.PI * 2) =>
  add(new T.TorusGeometry(r, t, 5, 64, arc), mat, pos, rot);
function beam(a, b, width = 0.08, mat = 'steel') {
  const start = new T.Vector3(...a),
    end = new T.Vector3(...b);
  const center = start.clone().add(end).multiplyScalar(0.5);
  const geo = new T.BoxGeometry(width, start.distanceTo(end), width);
  const q = new T.Quaternion().setFromUnitVectors(
    new T.Vector3(0, 1, 0),
    end.sub(start).normalize(),
  );
  geo.applyQuaternion(q);
  add(geo, mat, center.toArray());
}

group('Core', 1, [0, -2, 0]);
cylinder(0.42, 2.35, [0, 0, 0], 'dark');
cylinder(0.29, 2.65, [0, 0, 0], 'cyan');
for (let i = 0; i < 9; i++)
  ring(0.5, 0.055, [0, -1.15 + i * 0.285, 0], i % 3 === 0 ? 'yellow' : 'steel');
for (let i = 0; i < 8; i++) {
  const a = (i * Math.PI) / 4;
  box([0.07, 2.4, 0.07], [Math.cos(a) * 0.48, 0, Math.sin(a) * 0.48], 'ceramic');
}
cylinder(0.67, 0.17, [0, 1.34, 0], 'ceramic');
cylinder(0.67, 0.17, [0, -1.34, 0], 'ceramic');

group('Framework', 2, [0, 2.6, 0]);
ring(2.66, 0.065, [0, 0, 0], 'steel');
ring(2.65, 0.065, [0, 0, 0], 'steel', [0, 0, 0]);
ring(2.65, 0.065, [0, 0, 0], 'steel', [0, Math.PI / 2, 0]);
for (const y of [-1.5, -0.75, 0.75, 1.5]) {
  const r = Math.sqrt(2.65 ** 2 - y ** 2);
  ring(r, 0.047, [0, y, 0], 'steel');
}
for (let i = 0; i < 16; i++) {
  const a = (i * Math.PI) / 8;
  const x = Math.cos(a),
    z = Math.sin(a);
  beam([x * 0.65, -0.78, z * 0.65], [x * 2.48, -0.78, z * 2.48], 0.075);
  beam([x * 0.65, 0.78, z * 0.65], [x * 2.48, 0.78, z * 2.48], 0.075);
}

const systems = ['OTSAW_Sector', 'ASTAR_Sector', 'DSO_Sector', 'Ecovolt_Sector'];
for (let s = 0; s < 4; s++) {
  const a = Math.PI * 0.5 + s * Math.PI * 0.5;
  group(systems[s], 3 + s * 0.23, [Math.cos(a) * 2.5, 0, Math.sin(a) * 2.5]);
  for (let i = 0; i < 5; i++) {
    const angle = a + i * 0.19;
    const x = Math.cos(angle),
      z = Math.sin(angle);
    box([0.32, 0.56, 0.45], [x * 1.92, -0.35, z * 1.92], i === 2 ? 'yellow' : 'dark', [
      0,
      -angle,
      0,
    ]);
    box([0.16, 0.38, 0.06], [x * 2.18, -0.3, z * 2.18], 'ceramic', [0, -angle + Math.PI / 2, 0]);
    cylinder(0.065, 0.08, [x * 1.92, -0.03, z * 1.92], 'cyan');
    beam([x * 0.64, 0.5, z * 0.64], [x * 2.1, 0.5, z * 2.1], 0.05, 'yellow');
  }
}
group('ProjectBay', 4, [3, -1.5, 2]);
box([2.75, 0.12, 1.45], [0.42, -0.83, 0.38], 'dark');
box([1.05, 0.09, 0.48], [1, -0.15, 1.04], 'ceramic');
for (const x of [0.56, 1.43]) box([0.06, 0.66, 0.34], [x, -0.5, 1.04]);
box([0.33, 0.15, 0.28], [1, -0.025, 1.03], 'yellow');
for (const x of [0.86, 1.15])
  for (const z of [0.94, 1.13]) cylinder(0.06, 0.06, [x, 0.08, z], 'dark');
for (let i = 0; i < 3; i++) {
  box([0.4, 0.05, 0.4], [-0.6 + i * 0.55, -0.69, 1.1], 'steel');
  cylinder(0.1, 0.24, [-0.6 + i * 0.55, -0.55, 1.1], i === 1 ? 'cyan' : 'yellow');
}

group('ControlRoom', 5, [-3, 1.5, 1]);
box([2.25, 0.1, 1.2], [-0.3, 0.77, 0.23], 'dark');
for (let i = 0; i < 3; i++) {
  const x = -1.05 + i * 0.67;
  box([0.58, 0.35, 0.1], [x, 1.15, 0.35], 'dark', [-0.16, 0, 0]);
  box([0.49, 0.25, 0.025], [x, 1.15, 0.414], 'cyan', [-0.16, 0, 0]);
  box([0.59, 0.07, 0.36], [x, 0.93, 0.6], 'ceramic');
  for (let k = 0; k < 4; k++)
    box([0.06, 0.015, 0.04], [x - 0.17 + k * 0.1, 0.975, 0.65], k === 3 ? 'yellow' : 'steel');
}

group('Archives', 6, [-2, -1, 2]);
box([0.8, 1.15, 0.22], [-1.5, -0.05, 0.62], 'dark');
for (let j = 0; j < 5; j++)
  for (let i = 0; i < 4; i++) {
    box([0.14, 0.14, 0.29], [-1.78 + i * 0.18, -0.48 + j * 0.21, 0.76], 'ceramic');
    box(
      [0.07, 0.024, 0.025],
      [-1.78 + i * 0.18, -0.48 + j * 0.21, 0.92],
      j % 2 ? 'cyan' : 'yellow',
    );
  }

group('OuterShell', 7, [0, 0, -3]);
// Tessellated spherical panels, with a permanent front-right service cutaway.
for (let row = 0; row < 9; row++) {
  const theta = 0.13 + (row * (Math.PI - 0.26)) / 9,
    th = (Math.PI - 0.26) / 9 - 0.035;
  for (let col = 0; col < 20; col++) {
    const phi = (col * Math.PI * 2) / 20,
      ph = (Math.PI * 2) / 20 - 0.03;
    const midPhi = phi + ph / 2,
      midTheta = theta + th / 2;
    const front = Math.sin(midPhi) > -0.1;
    const right = -Math.cos(midPhi) > -0.38;
    if (front && right && row > 0 && row < 8) continue;
    add(
      new T.SphereGeometry(2.62, 4, 3, phi, ph, theta, th),
      row === 4 ? 'dark' : row === 1 && col % 4 === 0 ? 'yellow' : 'ceramic',
    );
    if (row % 2 === 0 && col % 2 === 0) {
      const x = -Math.cos(midPhi) * Math.sin(midTheta) * 2.65,
        y = Math.cos(midTheta) * 2.65,
        z = Math.sin(midPhi) * Math.sin(midTheta) * 2.65;
      const geo = new T.CylinderGeometry(0.035, 0.035, 0.05, 6);
      geo.applyQuaternion(
        new T.Quaternion().setFromUnitVectors(
          new T.Vector3(0, 1, 0),
          new T.Vector3(x, y, z).normalize(),
        ),
      );
      add(geo, 'steel', [x, y, z]);
    }
  }
}
for (const y of [-2.62, 2.62]) {
  cylinder(0.34, 0.15, [0, y, 0], 'dark');
  cylinder(0.2, 0.12, [0, y * 1.04, 0], 'yellow');
}
flush();
scene.updateMatrixWorld(true);
mkdirSync('public/models/station', { recursive: true });
mkdirSync('public/images', { recursive: true });
const glb = await new GLTFExporter().parseAsync(scene, { binary: true, onlyVisible: true });
writeFileSync('public/models/station/d01.glb', Buffer.from(glb));
// No-WebGL blueprint: edges projected from the exact same model, not a separate illustration.
const camera = new T.OrthographicCamera(-3.7, 3.7, 3.7, -3.7, 0.1, 100);
camera.position.set(5, 3.1, 7);
camera.lookAt(0, 0, 0);
camera.updateMatrixWorld();
const paths = [];
root.traverse((obj) => {
  if (!obj.isMesh) return;
  const edge = new T.EdgesGeometry(obj.geometry, 32).getAttribute('position');
  let d = '';
  for (let i = 0; i < edge.count; i += 2) {
    const a = new T.Vector3()
      .fromBufferAttribute(edge, i)
      .applyMatrix4(obj.matrixWorld)
      .project(camera);
    const b = new T.Vector3()
      .fromBufferAttribute(edge, i + 1)
      .applyMatrix4(obj.matrixWorld)
      .project(camera);
    d += `M${((a.x + 1) * 400).toFixed(1)},${((1 - a.y) * 400).toFixed(1)}L${((b.x + 1) * 400).toFixed(1)},${((1 - b.y) * 400).toFixed(1)}`;
  }
  paths.push(`<path d="${d}"/>`);
});
writeFileSync(
  'public/images/station-blueprint.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><g fill="none" stroke="#8dc3d1" stroke-width=".8" opacity=".65">${paths.join('')}</g></svg>`,
);
console.log(
  `D-01: ${root.children.length} named modules, ${(glb.byteLength / 1024).toFixed(0)} KB`,
);

/**
 * Packs the drone's raw glTF (from step_to_glb.py) into public/projects/drone/model.glb:
 * groups the assembly into the Drone section's parts (frame, battery, pogo) with explode
 * offsets, gives them materials, stands it upright, then simplifies and meshopt-compresses.
 *
 *   npm i --no-save @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions meshoptimizer
 *   node scripts/cad/pack-drone.mjs raw.glb public/projects/drone/model.glb 0.2 0.002
 *
 * Other projects: copy this file and change the grouping / materials block.
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, flatten, join, weld, simplify, quantize, meshopt, prune, getBounds } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';

const [, , input, output, ratio = '0.5', error = '0.0004'] = process.argv;
await MeshoptSimplifier.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(input);
const root = doc.getRoot();
const scene = root.listScenes()[0];
const top = scene.listChildren()[0];                       // PogoScoutv2.2
const [drone, pogo] = top.listChildren();                  // GEPRC MK4 5in, Pogo module
const find = (n, re) => { let hit; n.traverse((c) => { if (!hit && re.test(c.getName())) hit = c; }); return hit; };

const mat = (name, rgb, metal, rough) => doc.createMaterial(name).setBaseColorFactor([...rgb, 1]).setMetallicFactor(metal).setRoughnessFactor(rough);
const M = {
  carbon: mat('carbon', [0.09, 0.09, 0.1], 0.2, 0.45),
  metal: mat('metal', [0.62, 0.63, 0.66], 0.85, 0.35),
  pad: mat('pad', [0.16, 0.14, 0.2], 0, 0.9),
  print: mat('print', [0.55, 0.42, 0.95], 0.05, 0.55),
  tpu: mat('tpu', [0.13, 0.12, 0.15], 0, 0.85),
  pcb: mat('pcb', [0.1, 0.45, 0.3], 0.1, 0.6),
  copper: mat('copper', [0.85, 0.55, 0.3], 0.9, 0.3),
};
const paint = (n, m) => n.traverse((c) => c.getMesh()?.listPrimitives().forEach((p) => p.setMaterial(m)));
paint(drone, M.metal);
paint(find(drone, /^Carbon Fiber/), M.carbon);
paint(find(drone, /Arms/), M.carbon);
paint(find(drone, /^Battery Pad/), M.pad);
paint(pogo, M.print);
for (const c of pogo.listChildren()) {
  const n = c.getName();
  if (/^M3_|SPRING|Conductive/i.test(n)) paint(c, M.metal);
  if (/TPU/i.test(n)) paint(c, M.tpu);
  if (/PCB|Grove|LDC_components/i.test(n)) paint(c, M.pcb);
}

// Three explodable parts, named after the Drone section's part ids.
const group = (name, nodes) => {
  const g = doc.createNode(name);
  for (const n of nodes) { n.getParentNode()?.removeChild(n); g.addChild(n); }
  return g;
};
const pad = find(drone, /^Battery Pad/);
const battery = group('battery', [pad]);
const frame = group('frame', [...drone.listChildren()]);
const pogoG = group('pogo', [pogo]);
// The CAD's pogo axis is +Z: turn each part a quarter about X so the foot points down (−Y).
// The rotation sits on each part (not a shared parent), so explode offsets are in Y-up space.
const q = [Math.SQRT1_2, 0, 0, Math.SQRT1_2];
const model = doc.createNode('drone');
for (const [g, explode] of [[frame, [0, 0, 0]], [battery, [0, 0.35, 0]], [pogoG, [0, -0.45, 0]]]) {
  g.setRotation(q).setExtras({ explode });
  model.addChild(g);
}
scene.removeChild(top); scene.addChild(model);

await doc.transform(
  dedup(),
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: +ratio, error: +error }),
  prune(),
  join({ keepNamed: true }),
  quantize(),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);
await io.write(output, doc);
let tri = 0; for (const m of root.listMeshes()) for (const p of m.listPrimitives()) tri += (p.getIndices()?.getCount() ?? 0) / 3;
console.log('triangles', Math.round(tri), 'bounds', JSON.stringify(getBounds(model)));

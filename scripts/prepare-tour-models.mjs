import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, simplify, prune, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';

await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder,
  'meshopt.decoder': MeshoptDecoder,
});
mkdirSync('public/models/tour', { recursive: true });
const reports = [];
for (const [source, output, ratio, textureSize] of [
  ['battle-station-blueprint.glb', 'blueprint.glb', 1, 512],
  ['battle-station-under-construction.glb', 'station.glb', 0.65, 2048],
  ['battle-station-under-construction.glb', 'station-mobile.glb', 0.12, 768],
  ['starfighter-cockpit.glb', 'cockpit.glb', 0.75, 768],
]) {
  const doc = await io.read(`3D_models/${source}`);
  if (output === 'blueprint.glb') {
    for (const node of doc.getRoot().listNodes()) {
      if (node.getMesh() && !node.getName().endsWith('_blueprint_lines')) node.dispose();
    }
  }
  if (output !== 'cockpit.glb') {
    const root = doc
      .getRoot()
      .listNodes()
      .find((n) => n.getName() === 'battle_station');
    root.setScale([18.75, 18.75, 18.75]).setTranslation([0, -3, 0]);
    root.setExtras({ ...root.getExtras(), source, tourRadius: 3 });
  }
  for (const texture of doc.getRoot().listTextures()) {
    const img = texture.getImage();
    if (!img) continue;
    texture
      .setImage(
        execFileSync(process.execPath, ['scripts/resize-texture.mjs', String(textureSize)], {
          input: Buffer.from(img),
          maxBuffer: 20 * 1024 * 1024,
          windowsHide: true,
        }),
      )
      .setMimeType('image/png');
  }
  await doc.transform(
    dedup(),
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.001 }),
    prune({ keepLeaves: true }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  await io.write(`public/models/tour/${output}`, doc);
  const report = {
    source,
    output,
    inputBytes: statSync(`3D_models/${source}`).size,
    outputBytes: statSync(`public/models/tour/${output}`).size,
    nodes: doc
      .getRoot()
      .listNodes()
      .map((n) => n.getName())
      .filter(Boolean),
  };
  reports.push(report);
  console.log(`${output}: ${(report.outputBytes / 1024 / 1024).toFixed(2)} MB`);
}
writeFileSync('public/models/tour/manifest.json', JSON.stringify(reports, null, 2));

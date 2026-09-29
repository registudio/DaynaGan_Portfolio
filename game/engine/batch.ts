import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { UNIT_BOX } from './voxels.ts';

/**
 * Merges static voxel boxes into one InstancedMesh per material. Props are built
 * from dozens of small boxes; batching turns hundreds of draw calls into a few.
 * Anything animated (flagged in userData) is left untouched.
 */
const DYNAMIC_FLAGS = ['spin', 'roll', 'hover', 'blink', 'interactRing', 'core', 'emitter', 'npc', 'dynamic', 'orbit', 'rotor', 'beam'];

const isDynamic = (o: THREE.Object3D) => DYNAMIC_FLAGS.some((f) => o.userData[f]);

export function batchStatic(roots: THREE.Object3D[], into: THREE.Object3D): THREE.InstancedMesh[] {
  const groups = new Map<THREE.Material, THREE.Matrix4[]>();
  const victims: THREE.Mesh[] = [];
  const visit = (o: THREE.Object3D) => {
    if (isDynamic(o)) return;
    if (o instanceof THREE.Mesh && !(o instanceof THREE.InstancedMesh) && o.geometry === UNIT_BOX) {
      const m = o.material as THREE.Material;
      if (!Array.isArray(o.material) && !m.transparent && o.visible) {
        o.updateWorldMatrix(true, false);
        let list = groups.get(m);
        if (!list) groups.set(m, (list = []));
        list.push(o.matrixWorld.clone());
        victims.push(o);
      }
    }
    for (const c of o.children) visit(c);
  };
  for (const r of roots) visit(r);
  for (const v of victims) v.parent?.remove(v);
  into.updateWorldMatrix(true, false);
  const inv = into.matrixWorld.clone().invert();
  const out: THREE.InstancedMesh[] = [];
  for (const [material, mats] of groups) {
    const mesh = new THREE.InstancedMesh(UNIT_BOX, material, mats.length);
    mats.forEach((m, i) => mesh.setMatrixAt(i, m.premultiply(inv)));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    into.add(mesh);
    out.push(mesh);
  }
  return out;
}

/**
 * Merges sibling voxel boxes that share a material into one mesh, per group.
 * Keeps each animated limb (a Group) intact, so rigs still animate.
 */
export function mergeRig(root: THREE.Object3D) {
  const groups: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) groups.push(o);
  });
  for (const g of groups) {
    const byMat = new Map<THREE.Material, THREE.Mesh[]>();
    for (const c of g.children) {
      if (!(c instanceof THREE.Mesh) || c.geometry !== UNIT_BOX || Array.isArray(c.material) || isDynamic(c)) continue;
      const list = byMat.get(c.material) ?? [];
      list.push(c);
      byMat.set(c.material, list);
    }
    for (const [material, meshes] of byMat) {
      if (meshes.length < 2) continue;
      const geos = meshes.map((m) => {
        m.updateMatrix();
        return UNIT_BOX.clone().applyMatrix4(m.matrix);
      });
      const merged = mergeGeometries(geos);
      geos.forEach((x) => x.dispose());
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      for (const m of meshes) g.remove(m);
      g.add(mesh);
    }
  }
}

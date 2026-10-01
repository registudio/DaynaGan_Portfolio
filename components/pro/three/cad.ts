import * as THREE from 'three';
import { PROJECT_GEOMETRY } from '@/game/models/geometry';
import { partOfObject, type ShowModel } from './blueprint';

/**
 * Loads a CAD export (public/models/<project-id>.glb|.gltf|.stl|.obj) and wraps it in the
 * same API as the wireframe blueprints. Objects named after a part id (see portfolio.md)
 * become explodable, annotatable parts; with no named parts every top-level object is a part.
 */
export async function loadCad(url: string, projectId: string, dark = true): Promise<ShowModel> {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
  let root: THREE.Object3D;
  const fallback = new THREE.MeshStandardMaterial({ color: '#c4b5fd', metalness: 0.35, roughness: 0.45 });
  if (ext === 'glb' || ext === 'gltf') {
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    root = (await new GLTFLoader().loadAsync(url)).scene;
  } else if (ext === 'stl') {
    const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js');
    const geo = await new STLLoader().loadAsync(url);
    geo.computeVertexNormals();
    root = new THREE.Mesh(geo, fallback);
  } else if (ext === 'obj') {
    const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
    root = await new OBJLoader().loadAsync(url);
    root.traverse((o) => {
      if (o instanceof THREE.Mesh) o.material = fallback;
    });
  } else throw new Error(`Unsupported model format: ${url}`);

  // Fit to the blueprint scale (~3.2 units across) and centre on the origin.
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3()).length() || 1;
  const centre = box.getCenter(new THREE.Vector3());
  const group = new THREE.Group();
  const holder = new THREE.Group();
  holder.scale.setScalar(3.2 / size);
  root.position.sub(centre);
  holder.add(root);
  group.add(holder);
  group.updateMatrixWorld(true);

  const def = PROJECT_GEOMETRY[projectId];
  const known = new Set(def?.parts.map((p) => p.id));
  const named: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (o !== root && known.has(o.name) && !named.some((n) => isAncestor(n, o))) named.push(o);
  });
  const partObjs = named.length ? named : (root.children.length > 1 ? root.children : []);
  const parts = new Map<string, { obj: THREE.Object3D; base: THREE.Vector3; dir: THREE.Vector3 }>();
  partObjs.forEach((obj, i) => {
    const id = obj.name || `part-${i + 1}`;
    obj.traverse((o) => (o.userData.partId = id));
    const geo = def?.parts.find((p) => p.id === id);
    const c = new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());
    // Explode offsets are in display units; divide by the fit scale to get file units.
    const dir = (geo ? new THREE.Vector3().fromArray(geo.explode) : c.normalize().multiplyScalar(0.7)).divideScalar(holder.scale.x);
    parts.set(id, { obj, base: obj.position.clone(), dir });
  });

  // Highlight = emissive tint on a cloned material per part.
  const originals = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  const hot = new THREE.MeshStandardMaterial({ color: '#fde68a', emissive: '#fbbf24', emissiveIntensity: 0.6 });
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) originals.set(o, o.material);
  });

  return {
    group,
    partIds: [...parts.keys()],
    canExplode: parts.size > 0,
    setExplode(t) {
      for (const p of parts.values()) p.obj.position.copy(p.base).addScaledVector(p.dir, t);
    },
    setHighlight(id) {
      for (const [mesh, m] of originals) mesh.material = id && mesh.userData.partId === id ? hot : m;
    },
    partOf: partOfObject,
    anchor(id, target) {
      const p = parts.get(id);
      return p ? new THREE.Box3().setFromObject(p.obj).getCenter(target) : null;
    },
    setTheme() {},
    dispose() {
      root.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const m = originals.get(o) ?? o.material;
          (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose());
        }
      });
      fallback.dispose();
      hot.dispose();
    },
  };
}

function isAncestor(a: THREE.Object3D, b: THREE.Object3D) {
  for (let o: THREE.Object3D | null = b.parent; o; o = o.parent) if (o === a) return true;
  return false;
}

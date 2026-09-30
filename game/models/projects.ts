import * as THREE from 'three';
import { PROJECT_GEOMETRY, type Material, type PartGeometry, type Shape } from './geometry.ts';

/**
 * Voxel project models built from primitive part descriptions. Shared by the game
 * (blueprints, assembly, trophy shelves) and Professional mode (3D viewers).
 * A future GLB can replace a model part-by-part by matching part ids to node names.
 */

export type PartState = 'solid' | 'ghost' | 'hidden';

export type ProjectModel = {
  group: THREE.Group;
  partIds: string[];
  /** 0 = assembled, 1 = fully exploded. */
  setExplode(t: number): void;
  setPartState(id: string, state: PartState): void;
  /** Part id for an intersected object, if any. */
  partOf(object: THREE.Object3D): string | null;
  setHighlight(id: string | null): void;
  dispose(): void;
};

const VOXEL = 0.075;

const MATERIALS: Record<Material, { color: string; metalness: number; roughness: number; emissive?: number }> = {
  violet: { color: '#7c3aed', metalness: 0.2, roughness: 0.55 },
  lilac: { color: '#c4b5fd', metalness: 0.1, roughness: 0.6 },
  chrome: { color: '#d4d8e4', metalness: 0.75, roughness: 0.3 },
  graphite: { color: '#3b4252', metalness: 0.35, roughness: 0.7 },
  glow: { color: '#a5f3fc', metalness: 0, roughness: 0.4, emissive: 1.6 },
};

/** Signed-ish inside test in the shape's local frame (three.js primitive conventions). */
function inside(shape: Shape, size: number[], x: number, y: number, z: number, pad: number): boolean {
  const [a = 0.4, b = a, c = a] = size;
  switch (shape) {
    case 'box':
      return Math.abs(x) <= a / 2 + pad && Math.abs(y) <= b / 2 + pad && Math.abs(z) <= c / 2 + pad;
    case 'sphere':
      return x * x + y * y + z * z <= (a + pad) ** 2;
    case 'cylinder': {
      // [radiusTop, radiusBottom, height]
      const h = c;
      if (Math.abs(y) > h / 2 + pad) return false;
      const t = h > 0 ? (y + h / 2) / h : 0.5;
      const r = b + (a - b) * t;
      return x * x + z * z <= (r + pad) ** 2;
    }
    case 'cone': {
      // [radius, height]
      const h = b;
      if (Math.abs(y) > h / 2 + pad) return false;
      const r = a * (1 - (y + h / 2) / h);
      return x * x + z * z <= (r + pad) ** 2;
    }
    case 'capsule': {
      // [radius, length]
      const half = b / 2;
      const cy = Math.max(-half, Math.min(half, y));
      return x * x + (y - cy) ** 2 + z * z <= (a + pad) ** 2;
    }
    case 'torus': {
      // [radius, tube] in the XY plane
      const q = Math.sqrt(x * x + y * y) - a;
      return q * q + z * z <= (b + pad) ** 2;
    }
  }
}

function bounds(shape: Shape, size: number[]): [number, number, number] {
  const [a = 0.4, b = a, c = a] = size;
  switch (shape) {
    case 'box':
      return [a / 2, b / 2, c / 2];
    case 'sphere':
      return [a, a, a];
    case 'cylinder':
      return [Math.max(a, b), c / 2, Math.max(a, b)];
    case 'cone':
      return [a, b / 2, a];
    case 'capsule':
      return [a, b / 2 + a, a];
    case 'torus':
      return [a + b, a + b, b];
  }
}

const voxelCache = new Map<string, THREE.Vector3[]>();

/** Surface voxels (hollow) of a primitive, centred on the origin. */
export function voxelize(shape: Shape, size: number[], voxel = VOXEL): THREE.Vector3[] {
  const key = `${shape}|${size.join(',')}|${voxel}`;
  const hit = voxelCache.get(key);
  if (hit) return hit;
  const [bx, by, bz] = bounds(shape, size);
  const pad = voxel * 0.5;
  const nx = Math.max(0, Math.ceil(bx / voxel));
  const ny = Math.max(0, Math.ceil(by / voxel));
  const nz = Math.max(0, Math.ceil(bz / voxel));
  const filled = new Set<string>();
  const test = (i: number, j: number, k: number) =>
    inside(shape, size, i * voxel, j * voxel, k * voxel, pad);
  for (let i = -nx; i <= nx; i++)
    for (let j = -ny; j <= ny; j++)
      for (let k = -nz; k <= nz; k++) if (test(i, j, k)) filled.add(`${i},${j},${k}`);
  const out: THREE.Vector3[] = [];
  for (const cell of filled) {
    const [i, j, k] = cell.split(',').map(Number);
    const interior =
      filled.has(`${i + 1},${j},${k}`) &&
      filled.has(`${i - 1},${j},${k}`) &&
      filled.has(`${i},${j + 1},${k}`) &&
      filled.has(`${i},${j - 1},${k}`) &&
      filled.has(`${i},${j},${k + 1}`) &&
      filled.has(`${i},${j},${k - 1}`);
    if (!interior) out.push(new THREE.Vector3(i * voxel, j * voxel, k * voxel));
  }
  if (!out.length) out.push(new THREE.Vector3());
  voxelCache.set(key, out);
  return out;
}

const deg = (v?: number[]) =>
  new THREE.Euler(
    THREE.MathUtils.degToRad(v?.[0] ?? 0),
    THREE.MathUtils.degToRad(v?.[1] ?? 0),
    THREE.MathUtils.degToRad(v?.[2] ?? 0),
  );

type Instance = { obj: THREE.Object3D; base: THREE.Vector3; explode: THREE.Vector3 };

export function voxelMesh(
  voxels: THREE.Vector3[],
  material: THREE.Material,
  base: THREE.Color,
  voxel = VOXEL,
  seed = 1,
): THREE.InstancedMesh {
  const geo = new THREE.BoxGeometry(voxel * 0.97, voxel * 0.97, voxel * 0.97);
  const mesh = new THREE.InstancedMesh(geo, material, voxels.length);
  const m = new THREE.Matrix4();
  const c = new THREE.Color();
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  voxels.forEach((v, i) => {
    m.makeTranslation(v.x, v.y, v.z);
    mesh.setMatrixAt(i, m);
    // Per-voxel brightness jitter gives the pixel-noise look.
    const j = 0.86 + rand() * 0.22;
    mesh.setColorAt(i, c.copy(base).multiplyScalar(j));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function hasModel(projectId: string) {
  return projectId in PROJECT_GEOMETRY;
}

export function buildProjectModel(projectId: string, opts: { accent?: string; ghostOpacity?: number } = {}): ProjectModel {
  const def = PROJECT_GEOMETRY[projectId];
  const group = new THREE.Group();
  group.name = `project:${projectId}`;
  const accent = new THREE.Color(opts.accent ?? def?.accent ?? '#a78bfa');
  const parts = new Map<string, { root: THREE.Group; instances: Instance[]; solid: THREE.Material; geo: PartGeometry }>();
  const ghost = new THREE.MeshBasicMaterial({
    color: '#67e8f9',
    transparent: true,
    opacity: opts.ghostOpacity ?? 0.16,
    depthWrite: false,
  });
  const highlight = new THREE.MeshStandardMaterial({
    color: '#fde68a',
    emissive: '#fbbf24',
    emissiveIntensity: 0.9,
    vertexColors: false,
  });
  const owned: THREE.Material[] = [ghost, highlight];

  for (const [index, geo] of (def?.parts ?? []).entries()) {
    const spec = MATERIALS[geo.material] ?? MATERIALS.violet;
    const color = geo.material === 'glow' ? accent.clone().lerp(new THREE.Color('#ffffff'), 0.3) : new THREE.Color(spec.color);
    const solid = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      metalness: spec.metalness,
      roughness: spec.roughness,
      emissive: spec.emissive ? color : new THREE.Color('#000000'),
      emissiveIntensity: spec.emissive ?? 0,
    });
    owned.push(solid);
    const voxels = voxelize(geo.shape, geo.size);
    const root = new THREE.Group();
    root.name = geo.id;
    root.userData.partId = geo.id;
    const instances: Instance[] = [];
    const copies = [
      { position: geo.position, rotation: geo.rotation, explode: geo.explode },
      ...(geo.copies ?? []).map((c) => ({ ...c, rotation: c.rotation ?? geo.rotation })),
    ];
    copies.forEach((copy, ci) => {
      const mesh = voxelMesh(voxels, solid, color, VOXEL, index * 31 + ci + 7);
      mesh.userData.partId = geo.id;
      mesh.rotation.copy(deg(copy.rotation));
      const holder = new THREE.Group();
      holder.add(mesh);
      holder.position.fromArray(copy.position);
      root.add(holder);
      instances.push({
        obj: holder,
        base: new THREE.Vector3().fromArray(copy.position),
        explode: new THREE.Vector3().fromArray(copy.explode ?? [0, 0, 0]),
      });
    });
    group.add(root);
    parts.set(geo.id, { root, instances, solid, geo });
  }

  const setMaterial = (id: string, mat: THREE.Material) => {
    const part = parts.get(id);
    part?.root.traverse((o) => {
      if (o instanceof THREE.InstancedMesh) o.material = mat;
    });
  };
  const states = new Map<string, PartState>();

  return {
    group,
    partIds: [...parts.keys()],
    setExplode(t) {
      const k = THREE.MathUtils.clamp(t, 0, 1.5);
      for (const part of parts.values())
        for (const inst of part.instances) inst.obj.position.copy(inst.base).addScaledVector(inst.explode, k);
    },
    setPartState(id, state) {
      const part = parts.get(id);
      if (!part) return;
      states.set(id, state);
      part.root.visible = state !== 'hidden';
      setMaterial(id, state === 'ghost' ? ghost : part.solid);
      part.root.traverse((o) => {
        if (o instanceof THREE.Mesh) o.castShadow = state === 'solid';
      });
    },
    partOf(object) {
      let o: THREE.Object3D | null = object;
      while (o) {
        if (o.userData.partId) return o.userData.partId as string;
        o = o.parent;
      }
      return null;
    },
    setHighlight(id) {
      for (const [pid, part] of parts) {
        const state = states.get(pid) ?? 'solid';
        if (state !== 'solid') continue;
        setMaterial(pid, pid === id ? highlight : part.solid);
      }
    },
    dispose() {
      group.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      owned.forEach((m) => m.dispose());
    },
  };
}

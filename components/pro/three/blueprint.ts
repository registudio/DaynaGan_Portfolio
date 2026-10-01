import * as THREE from 'three';
import { PROJECT_GEOMETRY, type PartGeometry } from '@/game/models/geometry';

/**
 * Professional-mode 3D models. Until a CAD export exists for a project it is drawn as a
 * wireframe "blueprint" built from the part descriptions in game/models/geometry.ts
 * (smooth primitives, edge lines over a faint shell). CAD exports share the same API.
 */
export type ShowModel = {
  group: THREE.Group;
  /** Part ids that can be highlighted / annotated. */
  partIds: string[];
  canExplode: boolean;
  /** 0 = assembled, 1 = exploded. */
  setExplode(t: number): void;
  setHighlight(id: string | null): void;
  partOf(object: THREE.Object3D): string | null;
  /** World-space centre of a part (for hotspot annotations). */
  anchor(id: string, target: THREE.Vector3): THREE.Vector3 | null;
  setTheme(dark: boolean): void;
  dispose(): void;
};

export const hasBlueprint = (id: string) => id in PROJECT_GEOMETRY;

function primitive(part: PartGeometry): THREE.BufferGeometry {
  const [a = 0.4, b = a, c = a] = part.size;
  switch (part.shape) {
    case 'cylinder':
      return new THREE.CylinderGeometry(a, b, c, 28);
    case 'sphere':
      return new THREE.SphereGeometry(a, 20, 14);
    case 'torus':
      return new THREE.TorusGeometry(a, b === a ? 0.04 : b, 10, 40);
    case 'cone':
      return new THREE.ConeGeometry(a, b === a ? a * 2 : b, 28);
    case 'capsule':
      return new THREE.CapsuleGeometry(a, b === a ? a * 2 : b, 6, 16);
    default:
      return new THREE.BoxGeometry(a, b, c);
  }
}

const rad = (v?: [number, number, number]) =>
  new THREE.Euler(...((v ?? [0, 0, 0]).map((d) => (d * Math.PI) / 180) as [number, number, number]));

type Inst = { obj: THREE.Object3D; base: THREE.Vector3; explode: THREE.Vector3 };

export function buildBlueprint(projectId: string, dark = true): ShowModel {
  const def = PROJECT_GEOMETRY[projectId];
  const group = new THREE.Group();
  const accent = new THREE.Color(def?.accent ?? '#a78bfa');
  const line = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.85 });
  const lineHot = new THREE.LineBasicMaterial({ color: '#f0d9a8' });
  const shell = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide });
  const shellHot = new THREE.MeshBasicMaterial({ color: '#d6b06a', transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
  const geos: THREE.BufferGeometry[] = [];
  const parts = new Map<string, { root: THREE.Group; inst: Inst[] }>();

  for (const part of def?.parts ?? []) {
    const geo = primitive(part);
    const edges = new THREE.EdgesGeometry(geo, 24);
    geos.push(geo, edges);
    const root = new THREE.Group();
    root.userData.partId = part.id;
    const inst: Inst[] = [];
    const copies = [{ position: part.position, rotation: part.rotation, explode: part.explode }, ...(part.copies ?? [])];
    for (const c of copies) {
      const holder = new THREE.Group();
      const body = new THREE.Group();
      body.rotation.copy(rad(c.rotation ?? part.rotation));
      const mesh = new THREE.Mesh(geo, shell);
      mesh.userData.partId = part.id;
      const lines = new THREE.LineSegments(edges, line);
      lines.userData.partId = part.id;
      body.add(mesh, lines);
      holder.add(body);
      holder.position.fromArray(c.position);
      root.add(holder);
      inst.push({ obj: holder, base: new THREE.Vector3().fromArray(c.position), explode: new THREE.Vector3().fromArray(c.explode ?? [0, 0, 0]) });
    }
    group.add(root);
    parts.set(part.id, { root, inst });
  }

  const setTheme = (d: boolean) => {
    // Navy drawing lines on light paper, pale blue on dark; each project's accent only tints.
    line.color.copy(d ? new THREE.Color('#dbe6f6') : new THREE.Color('#1c3f73'));
    shell.color.copy(accent).lerp(new THREE.Color(d ? '#a9c2ea' : '#2b5592'), 0.7);
    shell.opacity = d ? 0.1 : 0.14;
  };
  setTheme(dark);

  return {
    group,
    partIds: [...parts.keys()],
    canExplode: true,
    setExplode(t) {
      for (const p of parts.values()) for (const i of p.inst) i.obj.position.copy(i.base).addScaledVector(i.explode, t);
    },
    setHighlight(id) {
      for (const [pid, p] of parts)
        p.root.traverse((o) => {
          if (o instanceof THREE.LineSegments) o.material = pid === id ? lineHot : line;
          else if (o instanceof THREE.Mesh) o.material = pid === id ? shellHot : shell;
        });
    },
    partOf: partOfObject,
    anchor(id, target) {
      const p = parts.get(id);
      if (!p) return null;
      return p.inst[0].obj.getWorldPosition(target);
    },
    setTheme,
    dispose() {
      geos.forEach((g) => g.dispose());
      [line, lineHot, shell, shellHot].forEach((m) => m.dispose());
    },
  };
}

export function partOfObject(object: THREE.Object3D): string | null {
  let o: THREE.Object3D | null = object;
  while (o) {
    if (o.userData.partId) return o.userData.partId as string;
    o = o.parent;
  }
  return null;
}

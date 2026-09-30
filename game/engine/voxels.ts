import * as THREE from 'three';
import { pixelTexture, type Pattern } from './textures.ts';

/** Shared helpers for building chunky voxel meshes out of boxes. */

const unit = new THREE.BoxGeometry(1, 1, 1);
/** Shared unit cube used by every voxel box (lets static props be batched). */
export const UNIT_BOX = unit;
const mats = new Map<string, THREE.Material>();

export type MatOpts = { emissive?: string | number; intensity?: number; pattern?: Pattern; accent?: string; metal?: number; rough?: number; transparent?: number };

export function mat(color: string, o: MatOpts = {}): THREE.Material {
  const key = `${color}|${o.emissive ?? ''}|${o.intensity ?? ''}|${o.pattern ?? 'noise'}|${o.accent ?? ''}|${o.metal ?? ''}|${o.rough ?? ''}|${o.transparent ?? ''}`;
  const hit = mats.get(key);
  if (hit) return hit;
  // Lambert (diffuse only): far cheaper per pixel than PBR, and voxels don't need the specular.
  const m = new THREE.MeshLambertMaterial({
    color: '#ffffff',
    map: pixelTexture(o.pattern ?? 'noise', color, o.accent ?? '#ffffff', 8),
    emissive: o.emissive != null ? new THREE.Color(o.emissive) : new THREE.Color(0),
    emissiveIntensity: o.intensity ?? (o.emissive != null ? 1.4 : 0),
    transparent: o.transparent != null,
    opacity: o.transparent ?? 1,
    depthWrite: o.transparent == null,
  });
  mats.set(key, m);
  return m;
}

/** Glowing, unlit-looking material for lights, screens and accents. */
export function glow(color: string, intensity = 2.2): THREE.Material {
  return mat(color, { emissive: color, intensity, rough: 0.4 });
}

export function box(
  w: number,
  h: number,
  d: number,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  parent?: THREE.Object3D,
): THREE.Mesh {
  const m = new THREE.Mesh(unit, material);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent?.add(m);
  return m;
}

export function group(parent?: THREE.Object3D, x = 0, y = 0, z = 0): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent?.add(g);
  return g;
}

/** Flat sprite-like disc (for rings, shadows, pads). */
export function disc(radius: number, material: THREE.Material, y = 0.01, parent?: THREE.Object3D) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 20), material);
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  parent?.add(m);
  return m;
}

export function ring(radius: number, tube: number, material: THREE.Material, parent?: THREE.Object3D) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 4, 24), material);
  m.rotation.x = -Math.PI / 2;
  parent?.add(m);
  return m;
}

export const blobShadow = (() => {
  let m: THREE.Material | null = null;
  return (radius: number, parent: THREE.Object3D) => {
    m ??= new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.35, depthWrite: false });
    const s = disc(radius, m, 0.02, parent);
    s.renderOrder = 1;
    return s;
  };
})();

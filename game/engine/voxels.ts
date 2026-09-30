import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { pixelTexture, type Pattern } from './textures.ts';

/** Shared helpers for building chunky voxel meshes out of boxes. */

const unit = new RoundedBoxGeometry(1, 1, 1, 1, 0.035);
/** Shared unit cube used by every voxel box (lets static props be batched). */
export const UNIT_BOX = unit;
const mats = new Map<string, THREE.Material>();
export const RELIEF = new Set<Pattern>(['plate', 'grate', 'panel', 'vent', 'tread', 'server', 'stone', 'tile', 'hex']);

export type MatOpts = { emissive?: string | number; intensity?: number; pattern?: Pattern; accent?: string; metal?: number; rough?: number; transparent?: number; res?: 8 | 16 };

export function mat(color: string, o: MatOpts = {}): THREE.Material {
  // Patterned surfaces get 16×16 detail (and the hand-authored tiles); flat colours stay 8×8.
  const res = o.res ?? (o.pattern && o.pattern !== 'noise' ? 16 : 8);
  const key = `${color}|${o.emissive ?? ''}|${o.intensity ?? ''}|${o.pattern ?? 'noise'}|${o.accent ?? ''}|${o.metal ?? ''}|${o.rough ?? ''}|${o.transparent ?? ''}|${res}`;
  const hit = mats.get(key);
  if (hit) return hit;
  // Lambert (diffuse only): far cheaper per pixel than PBR, and voxels don't need the specular.
  const options = {
    color: '#ffffff',
    map: pixelTexture(o.pattern ?? 'noise', color, o.accent ?? '#ffffff', res),
    emissive: o.emissive != null ? new THREE.Color(o.emissive) : new THREE.Color(0),
    emissiveIntensity: o.intensity ?? (o.emissive != null ? 1.4 : 0),
    transparent: o.transparent != null,
    opacity: o.transparent ?? 1,
    depthWrite: o.transparent == null,
  };
  const m = o.metal != null || o.rough != null
    ? new THREE.MeshStandardMaterial({ ...options, metalness: o.metal ?? 0.15, roughness: o.rough ?? 0.65 })
    : new THREE.MeshLambertMaterial(options);
  // Selective relief: engineered surfaces get a subtle bump from their own pattern.
  if (o.pattern && RELIEF.has(o.pattern) && !o.transparent) {
    (m as THREE.MeshLambertMaterial).bumpMap = options.map;
    (m as THREE.MeshLambertMaterial).bumpScale = 1.4;
  }
  m.userData.shared = true;
  mats.set(key, m);
  return m;
}

const glows = new Map<string, THREE.Material>();

/**
 * Glowing material for lights, screens and accents. Unlit, so nearby point lights can't push it
 * to white; the colour is HDR-scaled by `intensity` so bloom still picks up the bright ones.
 */
export function glow(color: string, intensity = 2.2): THREE.Material {
  const key = `${color}|${intensity}`;
  const hit = glows.get(key);
  if (hit) return hit;
  const m = new THREE.MeshBasicMaterial({
    color: new THREE.Color(1, 1, 1).multiplyScalar(Math.max(0.35, intensity * 0.72)),
    map: pixelTexture('noise', color, '#ffffff', 8),
  });
  glows.set(key, m);
  m.userData.shared = true;
  return m;
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
    m.userData.shared = true;
    const s = disc(radius, m, 0.02, parent);
    s.renderOrder = 1;
    return s;
  };
})();

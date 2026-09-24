import * as THREE from 'three';
import type { Part } from '@/lib/content';

/** Builds the primitive used to draw a part when no GLB model is supplied. */
export function partGeometry(part: Part): THREE.BufferGeometry {
  const [a = 0.4, b = a, c = a] = part.size;
  switch (part.shape) {
    case 'cylinder':
      return new THREE.CylinderGeometry(a, b, c, 40);
    case 'sphere':
      return new THREE.SphereGeometry(a, 48, 32);
    case 'torus':
      return new THREE.TorusGeometry(a, b === a ? 0.04 : b, 24, 120);
    case 'cone':
      return new THREE.ConeGeometry(a, b === a ? a * 2 : b, 40);
    case 'capsule':
      return new THREE.CapsuleGeometry(a, b === a ? a * 2 : b, 8, 24);
    default:
      return new THREE.BoxGeometry(a, b, c);
  }
}

export const toRadians = (v?: [number, number, number]) =>
  v ? (v.map((d) => (d * Math.PI) / 180) as [number, number, number]) : undefined;

/** Every placement of a part: the primary position plus any copies. */
export const partInstances = (part: Part) => [
  { position: part.position, rotation: part.rotation, explode: part.explode },
  ...part.copies,
];

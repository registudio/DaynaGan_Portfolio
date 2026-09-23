export type Vec3 = [number, number, number];
export function blueprintBlend(local: number) {
  const t = Math.min(1, Math.max(0, (local - 0.02) / 0.58));
  return t * t * (3 - 2 * t);
}
export const tourState = {
  stage: 0,
  local: 0,
  progress: 0,
  reduced: false,
  hovered: '',
  hangar: -1,
  selected: 0,
  blueprintRotation: 0,
  paused: false,
};
export const moduleMap: Record<string, string> = {
  '01_hypermatter_reactor': 'about',
  '02_imperial_academy_records': 'education',
  '03_sector_archives': 'blog',
  '04_hangar_bays': 'experience',
  '05_deflector_shields': 'skills',
  '06_equatorial_trench': 'experience',
  '07_turbolaser_batteries': 'skills',
  '08_superlaser': 'projects',
  '09_overbridge': 'github',
  '10_tractor_beam_emitters': 'contact',
  '11_comlink_array': 'contact',
};
export const sectionIds = [
  'blueprint',
  'about',
  'education',
  'experience',
  'projects',
  'skills',
  'github',
  'blog',
  'contact',
];
export const roomOrigins: Record<number, Vec3> = {
  1: [0, -14, 0],
  2: [18, -14, 0],
  3: [36, -14, 0],
  6: [54, -14, 0],
  7: [72, -14, 0],
};
export const hangarPositions: Vec3[] = [-0.9, -0.3, 0.3, 0.9].map((x) => [
  x,
  -0.025,
  Math.sqrt(9 - x * x) + 0.012,
]);
export const dishCenter: Vec3 = [1.052, 1.285, 2.34];
export const dishNormal: Vec3 = [0.35, 0.43, 0.832];
export const beamFocus: Vec3 = [1.682, 2.059, 3.838];
const normalLength = Math.hypot(...dishNormal);
const n = dishNormal.map((v) => v / normalLength) as Vec3;
const horizontalLength = Math.hypot(n[0], n[2]);
const right: Vec3 = [n[2] / horizontalLength, 0, -n[0] / horizontalLength];
const up: Vec3 = [n[1] * right[2], n[2] * right[0] - n[0] * right[2], -n[1] * right[0]];
export const beamOrigins: Vec3[] = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  return dishCenter.map(
    (v, k) => v + 0.68 * (up[k] * Math.cos(a) + right[k] * Math.sin(a)),
  ) as Vec3;
});
export function beamCount(local: number) {
  return Math.min(8, Math.max(0, Math.floor((local - 0.12) / 0.085) + 1));
}
export function combatDestroyed(local: number) {
  return Math.min(6, Math.max(0, Math.floor((local - 0.24) / 0.095)));
}
export type Anchor = { id: string; position: Vec3 };
export function localPoint(stage: number, p: Vec3): Vec3 {
  const o = roomOrigins[stage] || [0, 0, 0];
  return p.map((v, i) => v + o[i]) as Vec3;
}
export function tourAnchors(stage: number, hangar: number): Anchor[] {
  if (stage === 1)
    return [
      [-0.72, 0.5, 0.1],
      [0.72, 0.5, 0.1],
      [0, 1.7, 0],
    ].map((p, i) => ({ id: `core-${i}`, position: localPoint(1, p as Vec3) }));
  if (stage === 2)
    return [-1.7, 0, 1.7].map((x, i) => ({
      id: `academy-${i}`,
      position: localPoint(2, [x, 0.65, -0.8]),
    }));
  if (stage === 3 && hangar < 0)
    return hangarPositions.map((position, i) => ({
      id: `hangar-${i}`,
      position,
    }));
  if (stage === 3)
    return Array.from({ length: 7 }, (_, i) => ({
      id: `fighter-${i}`,
      position: localPoint(3, [((i % 4) - 1.5) * 1.12, 0.45, -Math.floor(i / 4) * 2]),
    }));
  if (stage === 4) return beamOrigins.map((position, i) => ({ id: `project-${i}`, position }));
  if (stage === 5)
    return Array.from({ length: 6 }, (_, i) => ({
      id: `defense-${i}`,
      position: [((i % 3) - 1) * 1.2, 0.25 + Math.floor(i / 3) * 0.65, 2.85] as Vec3,
    }));
  if (stage === 6)
    return [-1.7, 0, 1.7].map((x, i) => ({
      id: `console-${i}`,
      position: localPoint(6, [x, 0.6, -0.5]),
    }));
  if (stage === 7)
    return [-1.4, 0, 1.4].map((x, i) => ({
      id: `archive-${i}`,
      position: localPoint(7, [x, 0.6, -1]),
    }));
  if (stage === 8)
    return [-1.35, -0.45, 0.45, 1.35].map((x, i) => ({
      id: `comlink-${i}`,
      position: [x, 2.6, 1.5] as Vec3,
    }));
  return [];
}
export type Pose = { position: Vec3; target: Vec3; fov: number };
export function chapterPose(stage: number, local: number, mobile = false, hangar = -1): Pose {
  const extra = mobile ? 1.5 : 0;
  if (stage === 0) return { position: [6 + extra, 3.1, 9 + extra], target: [0, 0.25, 0], fov: 44 };
  if (stage === 1)
    return {
      position: localPoint(1, [2.5, 0.9, 4.1 + extra]),
      target: localPoint(1, [0, 0.75, 0]),
      fov: 52,
    };
  if (stage === 2)
    return {
      position: localPoint(2, [0, 0.9, 4.5 + extra]),
      target: localPoint(2, [0, 0.55, -0.7]),
      fov: 53,
    };
  if (stage === 3 && hangar >= 0)
    return {
      position: localPoint(3, [0, 1.1, 4.8 + extra]),
      target: localPoint(3, [0, 0.3, -1.4]),
      fov: 58,
    };
  if (stage === 3)
    return {
      position: [0.28 + Math.sin(local * 1.3) * 0.15, 0.06, 4.4 + (mobile ? 1.2 : 0)],
      target: [0, -0.025, 2.96],
      fov: 54,
    };
  if (stage === 4)
    return { position: [5 + extra, 4.5, 8.6 + extra], target: [0.9, 1, 1.9], fov: 47 };
  if (stage === 5)
    return {
      position: [Math.sin(local * 16) * 0.16, 0.5, 6.3 + extra],
      target: [0, 0.4, 2.5],
      fov: 62,
    };
  if (stage === 6)
    return {
      position: localPoint(6, [0, 1, 4.2 + extra]),
      target: localPoint(6, [0, 0.5, -1]),
      fov: 58,
    };
  if (stage === 7)
    return {
      position: localPoint(7, [0, 0.9, local > 0.65 ? 4.4 - (local - 0.65) * 5 : 4.4 + extra]),
      target: localPoint(7, [0, 0.6, -1.4]),
      fov: 55,
    };
  return { position: [5 + extra, 5, 8 + extra], target: [0, 1.7, 0], fov: 47 };
}

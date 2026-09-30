import type { Cell, LevelMap } from './layout.ts';

/** Half a block is a stair; anything taller is a ledge you can't walk up or down. */
export const MAX_STEP = 0.5;
export const CHUNK_SIZE = 12;
export function canStep(from: Cell | undefined, to: Cell | undefined) {
  return !!from && !!to && to.t === 1 && !to.solid && Math.abs(to.h - from.h) <= MAX_STEP + 1e-6;
}

export type TerrainFace = {
  points: number[][];
  shade: number[];
  surface: 'floor' | 'alt' | 'path' | 'side' | 'lip' | 'seam';
  x: number;
  z: number;
  /** Terrain palette key (open-world planet cells). */
  mat?: string;
};

/**
 * Exposed terrain only. Continuous side quads cover height differences, including fractional
 * stairs. Depth cues are baked in: tops brighten with elevation and darken into corners (contact
 * shading), risers are darker than tops, every ledge gets a light lip on its edge and a dark seam
 * where it meets the floor below.
 */
export function terrainFaces(map: LevelMap, hidden: number | null = null): TerrainFace[] {
  const faces: TerrainFace[] = [];
  const at = (x: number, z: number) => {
    const c = x < 0 || z < 0 || x >= map.w || z >= map.d ? undefined : map.cells[z * map.w + x];
    return c?.room === hidden && hidden != null ? undefined : c;
  };
  const LIP = 0.07;
  for (let z = 0; z < map.d; z++)
    for (let x = 0; x < map.w; x++) {
      const c = at(x, z);
      if (c?.t !== 1) continue;
      const y = c.h;
      const mat = c.mat;
      // Higher ground reads lighter: ~6% per block, clamped.
      const lift = Math.min(1.18, Math.max(0.86, 0.9 + y * 0.055));
      const shade = (dx: number, dz: number) => {
        const neighbors = [at(x + dx, z), at(x, z + dz), at(x + dx, z + dz)];
        const occ = neighbors.filter((n) => n && (n.t === 2 || n.h > y + 0.01)).length;
        return lift * (1 - occ * 0.17);
      };
      faces.push({
        x,
        z,
        mat,
        surface: c.surf === 'path' ? 'path' : c.surf === 'alt' ? 'alt' : 'floor',
        points: [
          [x, y, z],
          [x, y, z + 1],
          [x + 1, y, z + 1],
          [x + 1, y, z],
        ],
        shade: [shade(-1, -1), shade(-1, 1), shade(1, 1), shade(1, -1)],
      });
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const n = at(x + dx, z + dz);
        if (n?.t === 2 || (n?.t === 1 && n.h >= y)) continue;
        const bottom = n?.t === 1 ? n.h : y - 5;
        const points =
          dx === 1
            ? [[x + 1, y, z + 1], [x + 1, bottom, z + 1], [x + 1, bottom, z], [x + 1, y, z]]
            : dx === -1
              ? [[x, y, z], [x, bottom, z], [x, bottom, z + 1], [x, y, z + 1]]
              : dz === 1
                ? [[x, y, z + 1], [x, bottom, z + 1], [x + 1, bottom, z + 1], [x + 1, y, z + 1]]
                : [[x + 1, y, z], [x + 1, bottom, z], [x, bottom, z], [x, y, z]];
        // Risers: lit at the top edge, falling into shadow at the foot.
        faces.push({ x, z, mat, surface: 'side', points, shade: [0.72, 0.34, 0.34, 0.72] });
        // Lip: a thin highlight strip along the top edge of every drop.
        const e = 0.004;
        const lip =
          dx === 1
            ? [[x + 1 - LIP, y + e, z], [x + 1 - LIP, y + e, z + 1], [x + 1, y + e, z + 1], [x + 1, y + e, z]]
            : dx === -1
              ? [[x, y + e, z], [x, y + e, z + 1], [x + LIP, y + e, z + 1], [x + LIP, y + e, z]]
              : dz === 1
                ? [[x, y + e, z + 1 - LIP], [x, y + e, z + 1], [x + 1, y + e, z + 1], [x + 1, y + e, z + 1 - LIP]]
                : [[x, y + e, z], [x, y + e, z + LIP], [x + 1, y + e, z + LIP], [x + 1, y + e, z]];
        faces.push({ x, z, mat, surface: 'lip', points: lip, shade: [1, 1, 1, 1] });
        // Seam: a dark band on the lower floor, right at the foot of the ledge.
        if (n?.t === 1 && y - n.h > 0.01) {
          const b = n.h + e;
          const S = 0.16;
          const seam =
            dx === 1
              ? [[x + 1, b, z], [x + 1, b, z + 1], [x + 1 + S, b, z + 1], [x + 1 + S, b, z]]
              : dx === -1
                ? [[x - S, b, z], [x - S, b, z + 1], [x, b, z + 1], [x, b, z]]
                : dz === 1
                  ? [[x, b, z + 1], [x, b, z + 1 + S], [x + 1, b, z + 1 + S], [x + 1, b, z + 1]]
                  : [[x, b, z - S], [x, b, z], [x + 1, b, z], [x + 1, b, z - S]];
          faces.push({ x, z, mat, surface: 'seam', points: seam, shade: [1, 1, 1, 1] });
        }
      }
    }
  return faces;
}

import type { Cell, LevelMap } from './layout.ts';

export const MAX_STEP = 0.4;
export const CHUNK_SIZE = 12;
export function canStep(from: Cell | undefined, to: Cell | undefined) {
  return !!from && !!to && to.t === 1 && !to.solid && Math.abs(to.h - from.h) <= MAX_STEP + 1e-6;
}

export type TerrainFace = { points: number[][]; shade: number[]; surface: 'floor' | 'alt' | 'path' | 'side'; x: number; z: number };
/** Exposed terrain only. Continuous side quads cover height differences, including fractional stairs. */
export function terrainFaces(map: LevelMap, hidden: number | null = null): TerrainFace[] {
  const faces: TerrainFace[] = [];
  const at = (x: number, z: number) => {
    const c = x < 0 || z < 0 || x >= map.w || z >= map.d ? undefined : map.cells[z * map.w + x];
    return c?.room === hidden ? undefined : c;
  };
  for (let z = 0; z < map.d; z++) for (let x = 0; x < map.w; x++) {
    const c = at(x, z);
    if (c?.t !== 1) continue;
    const y = c.h;
    const shade = (dx: number, dz: number) => {
      const neighbors = [at(x + dx, z), at(x, z + dz), at(x + dx, z + dz)];
      return 1 - neighbors.filter(n => n && (n.t === 2 || n.h > y + 0.01)).length * 0.13;
    };
    faces.push({ x, z, surface: c.surf === 'path' ? 'path' : c.surf === 'alt' ? 'alt' : 'floor',
      points: [[x,y,z],[x,y,z+1],[x+1,y,z+1],[x+1,y,z]],
      shade: [shade(-1,-1),shade(-1,1),shade(1,1),shade(1,-1)] });
    for (const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const n = at(x+dx,z+dz);
      if (n?.t === 2 || (n?.t === 1 && n.h >= y)) continue;
      const bottom = n?.t === 1 ? n.h : y - 5;
      const points = dx === 1 ? [[x+1,y,z+1],[x+1,bottom,z+1],[x+1,bottom,z],[x+1,y,z]]
        : dx === -1 ? [[x,y,z],[x,bottom,z],[x,bottom,z+1],[x,y,z+1]]
        : dz === 1 ? [[x,y,z+1],[x,bottom,z+1],[x+1,bottom,z+1],[x+1,y,z+1]]
        : [[x+1,y,z],[x+1,bottom,z],[x,bottom,z],[x,y,z]];
      faces.push({x,z,surface:'side',points,shade:[0.68,0.37,0.37,0.68]});
    }
  }
  return faces;
}

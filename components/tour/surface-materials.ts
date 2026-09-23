import * as T from 'three';

/** Deterministic, locally generated PBR surface detail; no remote texture dependency. */
export function makeSurfaceMaps() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const pixels = ctx.createImageData(size, size);
  let seed = 1047;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const v = 176 + random() * 30 + Math.sin(y * 1.7) * 5;
      const i = (y * size + x) * 4;
      pixels.data.set([v, v, v, 255], i);
    }
  ctx.putImageData(pixels, 0, 0);
  for (let i = 0; i < 150; i++) {
    const x = random() * size,
      y = random() * size;
    ctx.strokeStyle = `rgba(245,245,245,${0.04 + random() * 0.12})`;
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 4 + random() * 32, y + random() * 1.5);
    ctx.stroke();
  }
  const roughness = new T.CanvasTexture(canvas);
  roughness.wrapS = roughness.wrapT = T.RepeatWrapping;
  roughness.anisotropy = 4;
  const bump = roughness.clone();
  bump.needsUpdate = true;
  return { roughness, bump };
}

/**
 * Adaptive quality for Professional mode. `low` on clearly constrained devices (≤2 cores,
 * ≤2 GB, Save-Data) or when frames measure slow after load; the page then drops the costly
 * extras (animated backdrop, cursor glow, per-letter motion, 3D resolution and auto-rotate)
 * while keeping the design. Client-only.
 */
export type Quality = 'high' | 'low';

const EVENT = 'dg-quality';

export function quality(): Quality {
  if (typeof document === 'undefined') return 'high';
  return document.documentElement.dataset.quality === 'low' ? 'low' : 'high';
}

export function setQuality(q: Quality) {
  if (quality() === q) return;
  document.documentElement.dataset.quality = q;
  dispatchEvent(new CustomEvent(EVENT, { detail: q }));
}

export function onQuality(fn: (q: Quality) => void) {
  const h = (e: Event) => fn((e as CustomEvent<Quality>).detail);
  addEventListener(EVENT, h);
  return () => removeEventListener(EVENT, h);
}

/** Static device hints. */
export function detectQuality(): Quality {
  const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const low = (n.hardwareConcurrency ?? 8) <= 2 || (n.deviceMemory ?? 8) <= 2 || !!n.connection?.saveData;
  return low ? 'low' : 'high';
}

/** Measures ~90 frames while the page is visible; slow median → low quality. */
export function sampleFrames(done: (medianMs: number) => void) {
  const d: number[] = [];
  let last = performance.now();
  const step = (now: number) => {
    if (!document.hidden) d.push(now - last);
    last = now;
    if (d.length < 90) requestAnimationFrame(step);
    else done(d.sort((a, b) => a - b)[45]);
  };
  requestAnimationFrame(step);
}

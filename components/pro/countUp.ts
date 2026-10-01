/**
 * Counts a `[data-count]` element up from 0 (data-decimals / data-suffix optional).
 * Placeholder for the client's Count Up component — swap the body when it arrives.
 */
export function countUp(el: HTMLElement, ms = 1400) {
  const target = Number(el.dataset.count);
  if (!Number.isFinite(target) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const decimals = Number(el.dataset.decimals || 0);
  const suffix = el.dataset.suffix || '';
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / ms);
    el.textContent = (target * (1 - (1 - t) ** 3)).toFixed(decimals) + suffix;
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

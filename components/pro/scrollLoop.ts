/**
 * One scroll listener and one animation frame for every scroll-driven effect on the page
 * (story openers, progress bar…), instead of each registering its own.
 */
type Fn = () => void;
const subs = new Set<Fn>();
let queued = false;

const run = () => {
  queued = false;
  subs.forEach((f) => f());
};
const onScroll = () => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(run);
};

export function onScrollFrame(fn: Fn): () => void {
  if (!subs.size) addEventListener('scroll', onScroll, { passive: true });
  subs.add(fn);
  return () => {
    subs.delete(fn);
    if (!subs.size) removeEventListener('scroll', onScroll);
  };
}

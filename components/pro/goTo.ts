/**
 * In-page navigation that lands on a section's resting state: for pinned scroll stories
 * that's the moment the title has docked and the content is in place (never mid-opener).
 * Targets inside a horizontal track scroll the track until that item is at its start.
 */
export function sectionTop(id: string): number | null {
  const el = document.getElementById(id);
  if (!el) return null;
  const section = el.closest('section') ?? el;
  // The hero section's own anchor is the top of the page.
  if (el === section && section.querySelector('.hero')) return 0;
  const story = section.querySelector<HTMLElement>('.story.live');
  const top = (n: Element) => n.getBoundingClientRect().top + scrollY;
  if (!story?.dataset.rest) return Math.max(0, top(el) - 84);
  const rest = top(story) + Number(story.dataset.rest);
  if (el === section) return rest;
  const track = story.querySelector<HTMLElement>('.story-track');
  if (track?.contains(el)) {
    const first = track.firstElementChild as HTMLElement | null;
    const x = el.getBoundingClientRect().left - (first ?? track).getBoundingClientRect().left;
    return rest + Math.min(Math.max(0, x), Number(story.dataset.travel) || 0);
  }
  const step = el.closest<HTMLElement>('.pin-step');
  if (step && story.contains(step)) {
    const n = Number(story.dataset.steps) || 1;
    return rest + (Number(story.dataset.hold) || 0) * ((Number(step.dataset.step) || 0) + 0.3) / n;
  }
  if (story.contains(el)) return rest;
  // Content below a docked title: keep it clear of the title.
  const dock = parseFloat(getComputedStyle(story.querySelector('.story-stage')!).getPropertyValue('--dock')) || 180;
  return Math.max(rest, top(el) - dock);
}

export function goTo(id: string) {
  const y = sectionTop(id);
  if (y == null) return false;
  scrollTo({ top: y, behavior: 'instant' });
  history.replaceState(null, '', `#${id}`);
  return true;
}

/**
 * Every resting point on the page, top to bottom: each section's start, each step of a
 * pinned story, each card of a horizontal track, and each story's last frame. Used for
 * keyboard stepping (↓ / ↑, Page Down / Up, Space).
 */
export function stopPoints(): number[] {
  const pts = new Set<number>([0]);
  const top = (n: Element) => n.getBoundingClientRect().top + scrollY;
  for (const section of document.querySelectorAll<HTMLElement>('main.pro > section')) {
    const story = section.querySelector<HTMLElement>('.story.live');
    if (!story?.dataset.rest) {
      if (!section.querySelector('.hero')) pts.add(Math.max(0, top(section) - 84));
      continue;
    }
    const base = top(story);
    const rest = base + Number(story.dataset.rest);
    pts.add(rest);
    const steps = Number(story.dataset.steps) || 0;
    const hold = Number(story.dataset.hold) || 0;
    for (let i = 1; i < steps; i++) pts.add(rest + (hold * (i + 0.3)) / steps);
    const track = story.querySelector<HTMLElement>('.story-track');
    const travel = Number(story.dataset.travel) || 0;
    if (track && travel) {
      const first = track.firstElementChild as HTMLElement;
      const x0 = first.getBoundingClientRect().left;
      for (const card of track.children) {
        const x = card.getBoundingClientRect().left - x0;
        if (x > 0) pts.add(rest + Math.min(x, travel));
      }
    }
    // Content that continues below an intro-only story: its sections' own starts.
    const after = story.nextElementSibling;
    if (after?.classList.contains('story-after')) pts.add(top(after) - 200);
  }
  pts.add(document.documentElement.scrollHeight - innerHeight);
  return [...pts].map(Math.round).sort((a, b) => a - b);
}

/** Scroll ranges during which a story is pinned (its stage fills the screen). */
export function pinnedRanges(): [number, number][] {
  return [...document.querySelectorAll<HTMLElement>('.story.live')].map((st) => {
    const a = st.getBoundingClientRect().top + scrollY;
    return [a, a + st.offsetHeight - innerHeight];
  });
}

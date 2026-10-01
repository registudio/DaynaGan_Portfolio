/**
 * In-page navigation that lands on a section's resting state: for pinned scroll stories
 * that's the moment the title has docked and the content is in place (never mid-opener).
 * Targets inside a horizontal track scroll the track until that item is at its start.
 */
export function sectionTop(id: string): number | null {
  const el = document.getElementById(id);
  if (!el) return null;
  const section = el.closest('section') ?? el;
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

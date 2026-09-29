'use client';
import { useEffect } from 'react';

/**
 * Page-wide scroll behaviour:
 * - `[data-reveal]` elements get `.is-visible` when they enter the viewport.
 * - `[data-parallax="0.2"]` elements drift relative to the viewport centre.
 * - `--scroll` on <html> holds the page's scroll position in pixels.
 */
export function ScrollEffects() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const reveal = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            reveal.unobserve(e.target);
          }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0 },
    );
    document.querySelectorAll('[data-reveal]').forEach((el) => reveal.observe(el));
    if (reduced) {
      document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-visible'));
      return () => reveal.disconnect();
    }

    const layers = [...document.querySelectorAll<HTMLElement>('[data-parallax]')];
    let raf = 0;
    const frame = () => {
      raf = 0;
      const vh = window.innerHeight;
      document.documentElement.style.setProperty('--scroll', `${window.scrollY}`);
      for (const el of layers) {
        const parent = el.parentElement!.getBoundingClientRect();
        if (parent.bottom < -vh || parent.top > vh * 2) continue;
        const offset = (parent.top + parent.height / 2 - vh / 2) * Number(el.dataset.parallax);
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      }
    };
    const request = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    frame();
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    return () => {
      reveal.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', request);
      window.removeEventListener('resize', request);
    };
  }, []);
  return null;
}

/** 0 → 1 as an element scrolls through the viewport; used by pinned sections. */
export function sectionProgress(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const total = rect.height - window.innerHeight;
  return total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
}

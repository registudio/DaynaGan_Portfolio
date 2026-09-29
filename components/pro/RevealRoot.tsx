'use client';

import { useEffect } from 'react';

/** Scroll reveals, timeline drawing and number counters for Professional mode. */
export default function RevealRoot() {
  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const reveal = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            e.target.classList.add('in');
            reveal.unobserve(e.target);
          }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    document.querySelectorAll('[data-reveal]').forEach((el) => reveal.observe(el));

    const counters = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        counters.unobserve(e.target);
        const el = e.target as HTMLElement;
        const target = Number(el.dataset.count);
        const decimals = Number(el.dataset.decimals || 0);
        const suffix = el.dataset.suffix || '';
        if (!Number.isFinite(target) || reduce) continue;
        const start = performance.now();
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / 1400);
          const eased = 1 - (1 - t) ** 3;
          el.textContent = (target * eased).toFixed(decimals) + suffix;
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    });
    document.querySelectorAll('[data-count]').forEach((el) => counters.observe(el));

    const timelines = [...document.querySelectorAll<HTMLElement>('[data-timeline]')];
    const onScroll = () => {
      for (const t of timelines) {
        const r = t.getBoundingClientRect();
        const p = reduce ? 1 : Math.min(1, Math.max(0, (innerHeight * 0.7 - r.top) / r.height));
        t.style.setProperty('--draw', p.toFixed(3));
      }
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      reveal.disconnect();
      counters.disconnect();
      removeEventListener('scroll', onScroll);
    };
  }, []);
  return null;
}

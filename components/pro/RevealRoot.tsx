'use client';

import { useEffect } from 'react';
import { filterProjects } from './ProjectShowcase';

/**
 * Page-wide motion for Professional mode: scroll reveals, number counters, timelines that
 * draw themselves (nodes light up as they're reached), the goals trajectory marker, the
 * cursor spotlight and skill ↔ experience highlighting. Everything is progressive — the
 * page reads fine with JS off or reduced motion on.
 */
export default function RevealRoot() {
  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cleanups: (() => void)[] = [];

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
    cleanups.push(() => reveal.disconnect());

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
    cleanups.push(() => counters.disconnect());

    // Scroll-linked progress: timelines draw, their nodes light up, the goals marker travels.
    const timelines = [...document.querySelectorAll<HTMLElement>('[data-timeline]')];
    const orbits = [...document.querySelectorAll<HTMLElement>('[data-orbit]')];
    let queued = false;
    const progress = (el: HTMLElement, start = 0.75, end = 0.35) => {
      const r = el.getBoundingClientRect();
      return reduce ? 1 : Math.min(1, Math.max(0, (innerHeight * start - r.top) / (r.height + innerHeight * (start - end))));
    };
    const onScroll = () => {
      queued = false;
      for (const t of timelines) {
        const p = progress(t, 0.7, 0.7);
        t.style.setProperty('--draw', p.toFixed(3));
        const line = t.getBoundingClientRect().top + t.offsetHeight * p;
        t.querySelectorAll<HTMLElement>('.t-item').forEach((item) =>
          item.classList.toggle('lit', reduce || item.getBoundingClientRect().top + 24 < line),
        );
      }
      for (const o of orbits) {
        const p = progress(o);
        o.style.setProperty('--orbit', p.toFixed(3));
        const track = o.querySelector<SVGPathElement>('.orbit-track');
        const marker = o.querySelector<SVGCircleElement>('.orbit-marker');
        if (track && marker) {
          const pt = track.getPointAtLength(track.getTotalLength() * p);
          marker.setAttribute('cx', pt.x.toFixed(1));
          marker.setAttribute('cy', pt.y.toFixed(1));
        }
        const n = Number(o.dataset.orbit) || 1;
        o.querySelectorAll<HTMLElement>('.goal').forEach((g, i) => g.classList.toggle('reached', p >= (n === 1 ? 0 : i / (n - 1)) - 0.02));
      }
    };
    const queue = () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(onScroll);
      }
    };
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue);
    onScroll();
    cleanups.push(() => {
      removeEventListener('scroll', queue);
      removeEventListener('resize', queue);
    });

    // Narrow screens: start the contribution heatmap at the latest weeks.
    document.querySelectorAll<HTMLElement>('.heat').forEach((h) => (h.scrollLeft = h.scrollWidth));

    // Cursor spotlight (fine pointers only).
    if (matchMedia('(pointer: fine)').matches && !reduce) {
      const root = document.documentElement;
      const move = (e: PointerEvent) => {
        root.style.setProperty('--mx', `${e.clientX}px`);
        root.style.setProperty('--my', `${e.clientY}px`);
        root.classList.add('spot');
      };
      const out = () => root.classList.remove('spot');
      addEventListener('pointermove', move, { passive: true });
      document.addEventListener('pointerleave', out);
      cleanups.push(() => {
        removeEventListener('pointermove', move);
        document.removeEventListener('pointerleave', out);
        root.classList.remove('spot');
      });
    }

    // Skills: hovering one lights up the roles/projects that used it; chips filter Projects.
    const lit = (id: string | null) => {
      document.querySelectorAll('.uses-lit').forEach((el) => el.classList.remove('uses-lit'));
      if (id) document.querySelectorAll(`[data-uses~="${CSS.escape(id)}"]`).forEach((el) => el.classList.add('uses-lit'));
    };
    const over = (e: Event) => {
      const s = (e.target as HTMLElement).closest<HTMLElement>('[data-skill]');
      lit(s?.dataset.skill ?? null);
    };
    const click = (e: MouseEvent) => {
      const f = (e.target as HTMLElement).closest<HTMLElement>('[data-filter]');
      if (f) filterProjects(f.dataset.filter!);
    };
    document.addEventListener('pointerover', over);
    document.addEventListener('focusin', over);
    document.addEventListener('click', click);
    cleanups.push(() => {
      document.removeEventListener('pointerover', over);
      document.removeEventListener('focusin', over);
      document.removeEventListener('click', click);
    });

    return () => cleanups.forEach((c) => c());
  }, []);
  return null;
}

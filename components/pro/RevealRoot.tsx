'use client';

import { useEffect } from 'react';
import { goTo, pinnedRanges, stopPoints } from './goTo';
import { onScrollFrame } from './scrollLoop';
import { detectQuality, sampleFrames, setQuality } from '@/lib/quality';

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
    // Numbers inside pinned stepped stories count when their step is reached (ScrollStory).
    document.querySelectorAll('[data-count]').forEach((el) => !el.closest('.story-steps') && counters.observe(el));
    cleanups.push(() => counters.disconnect());

    // Scroll-linked progress: timelines draw, their nodes light up, the goals marker travels.
    const timelines = [...document.querySelectorAll<HTMLElement>('[data-timeline]')];
    const orbits = [...document.querySelectorAll<HTMLElement>('[data-orbit]')];
    const progress = (el: HTMLElement, start = 0.75, end = 0.35) => {
      const r = el.getBoundingClientRect();
      return reduce ? 1 : Math.min(1, Math.max(0, (innerHeight * start - r.top) / (r.height + innerHeight * (start - end))));
    };
    const timelineItems = timelines.map((t) => [...t.querySelectorAll<HTMLElement>('.t-item')]);
    const onScroll = () => {
      // Read every rect first, then write — interleaving them forced a layout per item.
      const reads = timelines.map((t, i) => {
        const r = t.getBoundingClientRect();
        const near = r.bottom > -innerHeight && r.top < innerHeight * 2;
        return near ? { r, items: timelineItems[i].map((it) => it.getBoundingClientRect().top) } : null;
      });
      timelines.forEach((t, i) => {
        const read = reads[i];
        if (!read) return;
        const { r, items } = read;
        const p = reduce ? 1 : Math.min(1, Math.max(0, (innerHeight * 0.7 - r.top) / r.height));
        t.style.setProperty('--draw', p.toFixed(3));
        const line = r.top + r.height * p;
        timelineItems[i].forEach((item, j) => item.classList.toggle('lit', reduce || items[j] + 24 < line));
      });
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
    if (timelines.length || orbits.length) {
      cleanups.push(onScrollFrame(onScroll));
      addEventListener('resize', onScroll);
      onScroll();
      cleanups.push(() => removeEventListener('resize', onScroll));
    }

    // Adaptive quality: device hints now, then a short frame sample once the page settles.
    setQuality(detectQuality());
    const settle = setTimeout(
      () =>
        sampleFrames((ms) => {
          if (ms > 24) setQuality('low');
        }),
      2500,
    );
    cleanups.push(() => clearTimeout(settle));

    // In-page links land on the section's resting state, not halfway through its opener.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as Element).closest?.('a[href^="#"]') as HTMLAnchorElement | null;
      const id = a?.getAttribute('href')!.slice(1);
      if (!id || !document.getElementById(id)) return;
      e.preventDefault();
      goTo(id);
      if (a!.classList.contains('skip-link')) document.getElementById(id)?.focus({ preventScroll: true });
    };
    document.addEventListener('click', onClick);
    cleanups.push(() => document.removeEventListener('click', onClick));
    // Keyboard stepping: ↓ / Page Down / Space move to the next resting point (a pinned step,
    // an Experience card, the next section) instead of a fixed distance; ↑ / Page Up go back.
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable], .modal, .pviewer-canvas, [role="slider"]') || document.body.classList.contains('modal-open')) return;
      if (e.key === ' ' && t.closest('button, a, summary')) return;
      const down = e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey);
      const up = e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey);
      if (!down && !up) return;
      const pts = stopPoints();
      const y = scrollY;
      const target = down ? pts.find((p) => p > y + 4) : [...pts].reverse().find((p) => p < y - 4);
      if (target == null) return;
      // Only inside (or stepping into) a pinned story; plain sections scroll as usual.
      const inPin = (v: number) => pinnedRanges().some(([a, b]) => v >= a - 4 && v <= b + 4);
      if (!inPin(y) && !inPin(target)) return;
      // Leaving a pinned story can be a few screens (its opener + the next one) — still one step.
      if (Math.abs(target - y) > innerHeight * 4.5) return;
      e.preventDefault();
      scrollTo({ top: target, behavior: reduce ? 'instant' : 'smooth' });
    };
    addEventListener('keydown', onKey);
    cleanups.push(() => removeEventListener('keydown', onKey));

    // Arriving with a hash: wait for the stories to measure, then jump.
    const initial = location.hash.slice(1);
    if (initial && document.getElementById(initial)) {
      const t = setTimeout(() => goTo(initial), 750);
      cleanups.push(() => clearTimeout(t));
    }

    // Narrow screens: start the contribution heatmap at the latest weeks.
    document.querySelectorAll<HTMLElement>('.heat').forEach((h) => (h.scrollLeft = h.scrollWidth));

    // Cursor spotlight (fine pointers only): moves one composited element, batched per frame.
    const spot = document.querySelector<HTMLElement>('.spotlight');
    if (spot && matchMedia('(pointer: fine)').matches && !reduce) {
      const root = document.documentElement;
      let x = 0;
      let y = 0;
      let pending = false;
      const move = (e: PointerEvent) => {
        x = e.clientX;
        y = e.clientY;
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => {
          pending = false;
          spot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        });
        if (!root.classList.contains('spot')) root.classList.add('spot');
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

    return () => cleanups.forEach((c) => c());
  }, []);
  return null;
}

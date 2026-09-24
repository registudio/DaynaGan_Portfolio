'use client';
import { useEffect, useRef, useState } from 'react';
import type { NavigationItem } from '@/lib/content';

/** Pill navigation on top, dot indicators on the right and a progress spine on the left. */
export function FloatingNav({ items, resume }: { items: NavigationItem[]; resume: string }) {
  const [active, setActive] = useState(items[0].id);
  const [progress, setProgress] = useState(0);
  const [hidden, setHidden] = useState(false);
  const pill = useRef<HTMLDivElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);

  // Scroll spy: the section that crosses the middle of the viewport is active.
  useEffect(() => {
    const sections = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: '-50% 0px -50% 0px' },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [items]);

  useEffect(() => {
    document.documentElement.dataset.section = active;
  }, [active]);

  // Page progress, and hide the pill while scrolling down quickly.
  useEffect(() => {
    let last = window.scrollY,
      raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? y / max : 0);
        setHidden(y > 400 && y - last > 6);
        if (y < last - 4 || y < 400) setHidden(false);
        last = y;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Slide the highlight under the active link.
  useEffect(() => {
    const link = pill.current?.querySelector<HTMLElement>(`[data-id="${active}"]`);
    const bar = indicator.current;
    if (!link || !bar) return;
    bar.style.width = `${link.offsetWidth}px`;
    bar.style.transform = `translateX(${link.offsetLeft}px)`;
    // On narrow screens the links scroll sideways; keep the active one in view.
    const strip = pill.current!;
    strip.scrollTo({
      left: link.offsetLeft - strip.clientWidth / 2 + link.offsetWidth / 2,
      behavior: 'smooth',
    });
  }, [active]);

  const current = items.findIndex((i) => i.id === active);

  return (
    <>
      <header className={`nav-pill${hidden ? ' is-hidden' : ''}`}>
        <a className="nav-mark" href="#hero" aria-label="Back to top">
          DG
        </a>
        <nav aria-label="Sections">
          <div className="nav-links" ref={pill}>
            <span className="nav-indicator" ref={indicator} aria-hidden="true" />
            {items.slice(1).map((item) => (
              <a
                key={item.id}
                data-id={item.id}
                href={`#${item.id}`}
                aria-current={active === item.id ? 'true' : undefined}
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>
        <a className="nav-cta" href={resume} target="_blank" rel="noreferrer">
          Résumé
        </a>
      </header>

      <div className="rail rail-left" aria-hidden="true">
        <span className="rail-count">{items[current]?.number ?? '00'}</span>
        <span className="rail-track">
          <span style={{ transform: `scaleY(${progress})` }} />
        </span>
        <span className="rail-count rail-total">{items[items.length - 1].number}</span>
      </div>

      <nav className="rail rail-right" aria-label="Section indicators">
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={active === item.id ? 'is-active' : undefined}
            aria-label={item.label}
          >
            <span className="rail-label">{item.label}</span>
            <span className="rail-dot" />
          </a>
        ))}
      </nav>
    </>
  );
}

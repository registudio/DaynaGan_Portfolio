'use client';

import { useEffect, useRef } from 'react';

/**
 * Pinned, scroll-driven section opener. While pinned:
 *   1. reveal  — a giant title builds letter by letter (rise, un-blur, gradient fill) over a
 *               drifting outlined echo of the word;
 *   2. dock    — the title shrinks and glides into the normal heading position (top-left);
 *   3. travel  — (horizontal mode) the content track scrolls sideways as you scroll down.
 * Without JS, or with reduced motion, it renders as a plain heading followed by the content.
 */
export default function ScrollStory({
  title,
  number,
  horizontal = false,
  children,
}: {
  title: string;
  number?: string;
  /** Scroll the children sideways (a horizontal track) once the title has docked. */
  horizontal?: boolean;
  children: React.ReactNode;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const after = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const w = wrap.current;
    const st = stage.current;
    const h = head.current;
    if (!w || !st || !h) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    w.classList.add('live');
    let vh = innerHeight;
    let vw = innerWidth;
    let reveal = 0; // px of scroll for phase 1
    let dock = 0; // px of scroll for phase 2
    let travel = 0; // px of horizontal overflow
    let hw = 0;
    let hh = 0;
    let target = { x: 0, y: 0, k: 1 };

    const measure = () => {
      vh = innerHeight;
      vw = innerWidth;
      reveal = vh * 0.9;
      dock = vh * 0.7;
      h.style.transform = 'none';
      hw = h.offsetWidth;
      hh = h.offsetHeight;
      // Docked: left edge of the content column, just under the pill nav, at h2 size.
      const main = document.querySelector('main.pro') as HTMLElement | null;
      const left = main ? main.getBoundingClientRect().left + parseFloat(getComputedStyle(main).paddingLeft) : 16;
      const big = parseFloat(getComputedStyle(h.querySelector('.story-word')!).fontSize) || 160;
      const small = Math.min(46, Math.max(32, vw * 0.05));
      target = { x: left, y: vw < 700 ? 78 : 92, k: small / big };
      const t = track.current;
      travel = horizontal && t ? Math.max(0, t.scrollWidth - vw + left) : 0;
      // Intro-only mode: once docked, the heading stays pinned while the following content rises
      // underneath it; the pin releases exactly as that content reaches the heading.
      const docked = target.y + hh * target.k + 28;
      const pinned = reveal + dock + (horizontal ? vh * 0.15 + travel : Math.max(0, vh - docked));
      w.style.height = `${vh + pinned}px`;
      if (!horizontal && after.current) after.current.style.marginTop = `${-(vh - docked)}px`;
      update();
    };

    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    const ease = (t: number) => 1 - (1 - t) ** 3;
    const update = () => {
      const s = -w.getBoundingClientRect().top;
      // The build starts while the stage scrolls into view, so a nav jump never lands on a blank screen.
      const a = clamp((s + vh * 0.5) / (reveal + vh * 0.5));
      const b = ease(clamp((s - reveal) / dock));
      const c = travel ? clamp((s - reveal - dock - vh * 0.08) / travel) : 0;
      st.style.setProperty('--a', a.toFixed(4));
      st.style.setProperty('--b', b.toFixed(4));
      st.style.setProperty('--c', c.toFixed(4));
      const x0 = (vw - hw) / 2;
      const y0 = (vh - hh) / 2;
      const k = 1 + (target.k - 1) * b;
      h.style.transform = `translate(${x0 + (target.x - x0) * b}px, ${y0 + (target.y - y0) * b}px) scale(${k})`;
      if (track.current) track.current.style.transform = `translateX(${-travel * c}px)`;
    };

    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        update();
      });
    };
    measure();
    // Fonts / images can change sizes after first paint.
    const late = setTimeout(measure, 600);
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', measure);
    return () => {
      clearTimeout(late);
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', measure);
      w.classList.remove('live');
      w.style.height = '';
      h.style.transform = '';
      if (track.current) track.current.style.transform = '';
      if (after.current) after.current.style.marginTop = '';
    };
  }, [horizontal]);

  const letters = [...title];
  return (
    <>
      <div className={`story${horizontal ? ' story-h' : ''}`} ref={wrap}>
        <div className="story-stage" ref={stage}>
          <div className="story-ghost" aria-hidden>
            {title} · {title} · {title}
          </div>
          <div className="story-head" ref={head}>
            {number && <span className="story-num mono">{number}</span>}
            <h2 className="story-word" style={{ '--n': letters.length } as React.CSSProperties}>
              <span className="sr-only">{title}</span>
              {letters.map((ch, i) => (
                <span key={i} className="story-ch" aria-hidden style={{ '--i': i } as React.CSSProperties}>
                  {ch === ' ' ? ' ' : ch}
                </span>
              ))}
            </h2>
          </div>
          {horizontal && (
            <div className="story-window">
              <div className="story-track" ref={track}>
                {children}
              </div>
            </div>
          )}
        </div>
      </div>
      {!horizontal && (
        <div className="story-after" ref={after}>
          {children}
        </div>
      )}
    </>
  );
}

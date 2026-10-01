'use client';

import { useEffect, useRef } from 'react';

/**
 * Pinned, scroll-driven section opener. Each section gets its own motion design (`variant`):
 *   mask      (About)      — letters slide up from behind a baseline; a hairline rule draws under them
 *   path      (Education)  — the word wipes in while a hairline timeline draws and its stops light up
 *   rise      (Experience) — letters rise and settle over a drifting outlined echo
 *   blueprint (Projects)   — an outlined CAD sketch with dimension lines, then a fill sweeps in
 *   focus     (Contact)    — letters close in from wide spacing, an underline draws, a caption follows
 * Then every variant docks: the title shrinks and glides into the normal heading position.
 * `horizontal` adds a third phase where the children scroll sideways.
 *
 * Performance: only transform / opacity / clip-path animate (no filters or colour changes),
 * the scroll handler runs only while the section is near the viewport, and mobile address-bar
 * resizes don't trigger a re-layout. Without JS or with reduced motion: a plain heading.
 */
export type StoryVariant = 'mask' | 'path' | 'rise' | 'blueprint' | 'focus';

export default function ScrollStory({
  title,
  number,
  variant,
  horizontal = false,
  caption,
  marks,
  children,
}: {
  title: string;
  number?: string;
  variant: StoryVariant;
  /** Small line under the title (mask / focus variants). */
  caption?: string;
  /** Stops on the hairline timeline (path variant), e.g. schools in order. */
  marks?: string[];
  /** Scroll the children sideways (a horizontal track) once the title has docked. */
  horizontal?: boolean;
  children: React.ReactNode;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const after = useRef<HTMLDivElement>(null);
  const letters = [...title];

  useEffect(() => {
    const w = wrap.current;
    const st = stage.current;
    const h = head.current;
    if (!w || !st || !h) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    w.classList.add('live');
    let vh = 0;
    let vw = 0;
    let reveal = 0;
    let dock = 0;
    let travel = 0;
    let hw = 0;
    let hh = 0;
    let target = { x: 0, y: 0, k: 1 };
    let last = { a: -1, b: -1, c: -1 };

    const measure = () => {
      vh = innerHeight;
      vw = innerWidth;
      st.style.height = `${vh}px`;
      reveal = vh * 0.9;
      dock = vh * 0.7;
      hw = h.offsetWidth;
      hh = h.offsetHeight;
      const main = document.querySelector('main.pro') as HTMLElement | null;
      const left = main ? main.getBoundingClientRect().left + parseFloat(getComputedStyle(main).paddingLeft) : 16;
      const big = parseFloat(getComputedStyle(h.querySelector('.story-word')!).fontSize) || 160;
      const small = Math.min(46, Math.max(32, vw * 0.05));
      target = { x: left, y: vw < 700 ? 78 : 92, k: small / big };
      const docked = target.y + hh * target.k + 28;
      st.style.setProperty('--dock', `${docked}px`);
      const t = track.current;
      travel = horizontal && t ? Math.max(0, t.scrollWidth - vw + left) : 0;
      // Intro-only: the content starts rising under the heading during the last 40% of the dock.
      const pinned = horizontal ? reveal + dock + vh * 0.15 + travel : reveal + dock * 0.6 + Math.max(0, vh - docked);
      w.style.height = `${vh + pinned}px`;
      if (!horizontal && after.current) after.current.style.marginTop = `${-(vh - docked)}px`;
      last = { a: -1, b: -1, c: -1 };
      update();
    };

    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    const ease = (t: number) => 1 - (1 - t) ** 3;
    const update = () => {
      const s = -w.getBoundingClientRect().top;
      // The build starts while the stage scrolls into view, so nav jumps never land on a blank screen.
      const a = Math.round(clamp((s + vh * 0.25) / (reveal + vh * 0.25)) * 1000) / 1000;
      const b = Math.round(ease(clamp((s - reveal) / dock)) * 1000) / 1000;
      const c = travel ? Math.round(clamp((s - reveal - dock - vh * 0.08) / travel) * 1000) / 1000 : 0;
      if (a === last.a && b === last.b && c === last.c) return;
      if (a !== last.a) {
        st.style.setProperty('--a', String(a));
      }
      if (b !== last.b) {
        st.style.setProperty('--b', String(b));
        const x0 = (vw - hw) / 2;
        const y0 = (vh - hh) / 2;
        const k = 1 + (target.k - 1) * b;
        h.style.transform = `translate3d(${x0 + (target.x - x0) * b}px, ${y0 + (target.y - y0) * b}px, 0) scale(${k})`;
      }
      if (c !== last.c) {
        st.style.setProperty('--c', String(c));
        if (track.current) track.current.style.transform = `translate3d(${-travel * c}px, 0, 0)`;
      }
      last = { a, b, c };
    };

    // Only listen while the section is near the viewport.
    let active = false;
    let queued = false;
    const onScroll = () => {
      if (queued || !active) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        update();
      });
    };
    const io = new IntersectionObserver(
      ([e]) => {
        active = e.isIntersecting;
        if (active) update();
      },
      { rootMargin: '100% 0px 100% 0px' },
    );
    // Mobile browsers resize as the address bar shows/hides; only re-measure on real changes.
    let lastW = innerWidth;
    let lastH = innerHeight;
    const onResize = () => {
      if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 160) return;
      lastW = innerWidth;
      lastH = innerHeight;
      measure();
    };
    measure();
    io.observe(w);
    const late = setTimeout(measure, 700); // fonts can change sizes after first paint
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onResize);
    return () => {
      clearTimeout(late);
      io.disconnect();
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onResize);
      w.classList.remove('live');
      w.style.height = '';
      st.style.height = '';
      h.style.transform = '';
      if (track.current) track.current.style.transform = '';
      if (after.current) after.current.style.marginTop = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horizontal, variant, title]);

  // "My …" titles: the possessive picks up the brand colour.
  const accent = title.startsWith('My ') ? 2 : 0;
  const word = (extra = '') => (
    <h2 className={`story-word${extra}`} style={{ '--n': letters.length } as React.CSSProperties}>
      <span className="sr-only">{title}</span>
      {letters.map((ch, i) => (
        <span
          key={i}
          className={`story-ch${i < accent ? ' accent' : ''}`}
          aria-hidden
          style={{ '--i': i } as React.CSSProperties}
        >
          {ch}
        </span>
      ))}
    </h2>
  );

  return (
    <>
      <div className={`story v-${variant}${horizontal ? ' story-h' : ''}`} ref={wrap}>
        <div className="story-stage" ref={stage}>
          {variant === 'rise' && (
            <div className="story-ghost" aria-hidden>
              {title} · {title} · {title}
            </div>
          )}
          {variant === 'blueprint' && <div className="story-grid" aria-hidden />}
          <div className="story-head" ref={head} style={{ '--n': letters.length } as React.CSSProperties}>
            {number && <span className="story-num mono">{number}</span>}
            {variant === 'blueprint' ? (
              <div className="story-blueprint">
                {word(' story-outline')}
                {/* Same per-letter structure as the outline, so the fill lines up exactly. */}
                <span className="story-fill" aria-hidden>
                  {letters.map((ch, i) => (
                    <span key={i} className="story-ch">
                      {ch}
                    </span>
                  ))}
                </span>
                <span className="dim dim-w" aria-hidden>
                  <i />
                  <b className="mono">W {letters.length * 64} mm</b>
                </span>
                <span className="dim dim-h" aria-hidden>
                  <i />
                </span>
                <span className="cross c1" aria-hidden />
                <span className="cross c2" aria-hidden />
                <span className="cross c3" aria-hidden />
                <span className="cross c4" aria-hidden />
              </div>
            ) : (
              word()
            )}
            {(variant === 'mask' || variant === 'focus') && (
              <div className="story-under" aria-hidden>
                <i className="story-rule" />
                {caption && <span className="story-caption mono">{caption}</span>}
              </div>
            )}
            {variant === 'path' && marks && (
              <div className="story-path" aria-hidden>
                <i className="story-rule" />
                {marks.map((m, i) => (
                  <span
                    key={m}
                    className="story-mark"
                    style={{ '--x': marks.length > 1 ? i / (marks.length - 1) : 0, '--k': i } as React.CSSProperties}
                  >
                    <b />
                    <span className="mono">{m}</span>
                  </span>
                ))}
              </div>
            )}
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

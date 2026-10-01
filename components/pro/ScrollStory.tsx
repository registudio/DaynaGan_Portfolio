'use client';

import { useEffect, useRef } from 'react';

/**
 * Pinned, scroll-driven section opener. Each section gets its own motion design (`variant`):
 *   assemble  (About)      — letters fly in from scattered positions and snap together
 *   layers    (Education)  — five offset copies of the word collapse into one, layer by layer
 *   rise      (Experience) — letters rise and settle over a drifting outlined echo
 *   blueprint (Projects)   — an outlined CAD sketch with dimension lines, then a fill sweeps in
 *   signal    (Contact)    — the word decodes from scrambled characters inside radio rings
 * Then every variant docks: the title shrinks and glides into the normal heading position.
 * `horizontal` adds a third phase where the children scroll sideways.
 *
 * Performance: only transform / opacity / clip-path animate (no filters or colour changes),
 * the scroll handler runs only while the section is near the viewport, and mobile address-bar
 * resizes don't trigger a re-layout. Without JS or with reduced motion: a plain heading.
 */
export type StoryVariant = 'assemble' | 'layers' | 'rise' | 'blueprint' | 'signal';

/** Deterministic pseudo-random −1…1 per letter, as a fixed-precision string (identical on server and client). */
const scatter = (i: number) => ((Math.sin((i + 1) * 12.9898) * 43758.5453) % 1).toFixed(3);

const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+<>/\\=';

export default function ScrollStory({
  title,
  number,
  variant,
  horizontal = false,
  children,
}: {
  title: string;
  number?: string;
  variant: StoryVariant;
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
    const chars = variant === 'signal' ? [...h.querySelectorAll<HTMLElement>('.story-ch')] : [];

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
        // Signal: unresolved letters cycle through glyphs (deterministic per step, so no flicker at rest).
        if (chars.length) {
          const step = Math.floor(a * 40);
          chars.forEach((el, i) => {
            const done = a * (chars.length + 3) - i >= 1;
            const ch = letters[i] === ' ' ? ' ' : done ? letters[i] : GLYPHS[(i * 7 + step * 13) % GLYPHS.length];
            if (el.textContent !== ch) el.textContent = ch;
          });
        }
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
      chars.forEach((el, i) => (el.textContent = letters[i]));
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
          style={{ '--i': i, '--r': scatter(i) } as React.CSSProperties}
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
          {variant === 'signal' && (
            <div className="story-rings" aria-hidden>
              <i />
              <i />
              <i />
              <i />
            </div>
          )}
          <div className="story-head" ref={head} style={{ '--n': letters.length } as React.CSSProperties}>
            {number && <span className="story-num mono">{number}</span>}
            {variant === 'layers' && (
              <div className="story-layers" aria-hidden>
                {[4, 3, 2, 1].map((l) => (
                  <span key={l} className="story-layer" style={{ '--l': l } as React.CSSProperties}>
                    {title}
                  </span>
                ))}
              </div>
            )}
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

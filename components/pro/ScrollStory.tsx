'use client';

import { useEffect, useRef } from 'react';
import { squarify } from '@/lib/treemap';
import { countUp } from './countUp';
import { onScrollFrame } from './scrollLoop';

/** Grid-draw cells: a fixed little treemap (percent units); `d` = when each cell's outline draws. */
const GRID = squarify(
  [9, 7, 6, 5, 5, 4, 3, 3, 3, 2, 2, 2, 1, 1].map((v, i) => ({ id: String(i), value: v })),
  100,
  100,
).map((r) => ({ ...r, d: ((r.x + r.w / 2) / 100) * 0.7 + ((r.y + r.h / 2) / 100) * 0.3 }));

/**
 * Pinned, scroll-driven section opener. Each section gets its own motion design (`variant`):
 *   mask      (About)      — letters slide up from behind a baseline; a hairline rule draws under them
 *   path      (Education)  — the word wipes in while a hairline timeline draws and its stops light up
 *   rise      (Experience) — letters fade in one after another, in place
 *   blueprint (Projects)   — an outlined CAD sketch with dimension lines, then a fill sweeps in
 *   focus     (Contact)    — letters close in from wide spacing, an underline draws, a caption follows
 *   grid      (Skills)     — a thin treemap outline traces itself around the word as it fades in
 * Then every variant docks: the title shrinks and glides into the normal heading position.
 * `horizontal` adds a third phase where the children scroll sideways; `steps` instead holds the
 * content pinned under the title while scrolling advances through its `.pin-step` children
 * (each gets `.on` once reached and `.now` while current; `[data-count]` numbers count up).
 *
 * Performance: only transform / opacity / clip-path animate (no filters or colour changes),
 * the scroll handler runs only while the section is near the viewport, and mobile address-bar
 * resizes don't trigger a re-layout. Without JS or with reduced motion: a plain heading.
 */
export type StoryVariant = 'mask' | 'path' | 'rise' | 'blueprint' | 'focus' | 'grid';

export default function ScrollStory({
  title,
  number,
  variant,
  horizontal = false,
  caption,
  marks,
  end = false,
  steps = 0,
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
  /** Last section: stretch the content so the footer sits on the final screen's bottom edge. */
  end?: boolean;
  /** Hold the content pinned and step through this many `.pin-step` children. */
  steps?: number;
  children: React.ReactNode;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const after = useRef<HTMLDivElement>(null);
  const win = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLElement>(null);
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
    const fx = [h, ...st.querySelectorAll<HTMLElement>('.story-fx')];
    const pinned = steps > 0;
    let hold = 0;
    let step = -2;
    const stepEls = pinned ? [...st.querySelectorAll<HTMLElement>('.pin-step, .pin-tab')] : [];
    const counted = new WeakSet<Element>();
    const setStep = (n: number) => {
      if (n === step) return;
      step = n;
      win.current?.setAttribute('data-step', String(n));
      stepEls.forEach((el) => {
        const i = Number(el.dataset.step ?? 0);
        el.classList.toggle('on', i <= n);
        el.classList.toggle('now', i === Math.max(0, n));
        if (el.classList.contains('pin-tab')) {
          if (i === Math.max(0, n)) el.setAttribute('aria-current', 'step');
          else el.removeAttribute('aria-current');
        }
        if (i <= n)
          el.querySelectorAll('[data-count]').forEach((c) => {
            if (counted.has(c)) return;
            counted.add(c);
            countUp(c as HTMLElement);
          });
      });
    };

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
      hold = pinned ? vh * (0.35 + steps * 0.55) : 0;
      // Intro-only: the content starts rising under the heading during the last 40% of the dock.
      const length = horizontal || pinned ? reveal + dock + vh * 0.15 + travel + hold : reveal + dock * 0.6 + Math.max(0, vh - docked);
      w.style.height = `${vh + length}px`;
      // Resting state (title docked, content in place, track at its start) for nav jumps.
      w.dataset.rest = String(Math.round(horizontal || pinned ? reveal + dock + vh * 0.08 : length));
      w.dataset.hold = String(Math.round(hold));
      w.dataset.steps = String(steps);
      w.dataset.travel = String(Math.round(travel));
      if (!horizontal && !pinned && after.current) {
        after.current.style.marginTop = `${-(vh - docked)}px`;
        if (end) {
          const main = document.querySelector('main.pro') as HTMLElement | null;
          const foot = document.querySelector('.pro-foot') as HTMLElement | null;
          const below = (main ? parseFloat(getComputedStyle(main).paddingBottom) : 0) + (foot?.offsetHeight ?? 0);
          after.current.style.minHeight = vw > 820 ? `${Math.max(0, vh - docked - below)}px` : '';
        }
      }
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
      // Stepped pin: the first step shows as the content arrives; later ones follow the hold.
      if (pinned) setStep(b < 0.7 ? -1 : Math.min(steps - 1, Math.floor(clamp((s - reveal - dock - vh * 0.08) / hold) * steps)));
      if (a === last.a && b === last.b && c === last.c) return;
      // Variables go only on the few elements that read them (the title and its effects) —
      // setting them on the stage restyled every card in the track on every frame.
      if (a !== last.a) fx.forEach((el) => el.style.setProperty('--a', String(a)));
      if (b !== last.b) {
        fx.forEach((el) => el.style.setProperty('--b', String(b)));
        const x0 = (vw - hw) / 2;
        const y0 = (vh - hh) / 2;
        const k = 1 + (target.k - 1) * b;
        h.style.transform = `translate3d(${x0 + (target.x - x0) * b}px, ${y0 + (target.y - y0) * b}px, 0) scale(${k})`;
        if (win.current) {
          // Fades in over the last 40% of the dock, so the line never crosses the moving title.
          win.current.style.opacity = String(clamp((b - 0.6) * 2.5));
          win.current.style.transform = `translate3d(0, ${(1 - b) * 80}px, 0)`;
        }
      }
      if (c !== last.c) {
        if (track.current) track.current.style.transform = `translate3d(${-travel * c}px, 0, 0)`;
        if (line.current) line.current.style.transform = `scaleX(${c})`;
      }
      last = { a, b, c };
    };

    // Only listen while the section is near the viewport.
    let active = false;
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
    // Shared page-wide scroll frame (see scrollLoop).
    const off = onScrollFrame(() => active && update());
    addEventListener('resize', onResize);
    return () => {
      clearTimeout(late);
      io.disconnect();
      off();
      removeEventListener('resize', onResize);
      w.classList.remove('live');
      stepEls.forEach((el) => el.classList.remove('on', 'now'));
      w.style.height = '';
      st.style.height = '';
      h.style.transform = '';
      if (track.current) track.current.style.transform = '';
      if (after.current) {
        after.current.style.marginTop = '';
        after.current.style.minHeight = '';
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horizontal, variant, title, end, steps]);

  const word = (extra = '') => (
    <h2 className={`story-word${extra}`} style={{ '--n': letters.length } as React.CSSProperties}>
      <span className="sr-only">{title}</span>
      {letters.map((ch, i) => (
        <span
          key={i}
          className="story-ch"
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
      <div className={`story v-${variant}${horizontal ? ' story-h' : ''}${steps ? ' story-steps' : ''}`} ref={wrap}>
        <div className="story-stage" ref={stage}>
          {variant === 'blueprint' && <div className="story-grid story-fx" aria-hidden />}
          <div className="story-head" ref={head} style={{ '--n': letters.length } as React.CSSProperties}>
            {number && (
              <span className="story-num mono" aria-hidden>
                {number}
              </span>
            )}
            {variant === 'grid' ? (
              <div className="story-grid-wrap">
                <svg className="story-cells" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                  {GRID.map((m) => (
                    <rect
                      key={m.id}
                      x={m.x + 0.4}
                      y={m.y + 0.8}
                      width={Math.max(0, m.w - 0.8)}
                      height={Math.max(0, m.h - 1.6)}
                      pathLength={1}
                      style={{ '--d': m.d.toFixed(3) } as React.CSSProperties}
                    />
                  ))}
                </svg>
                {word()}
              </div>
            ) : variant === 'blueprint' ? (
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
          {steps > 0 && !horizontal && (
            <div className="story-window story-pin" ref={win}>
              <div className="story-pin-inner">{children}</div>
            </div>
          )}
          {horizontal && (
            <div className="story-window" ref={win}>
              <i className="story-line" ref={line} aria-hidden />
              <div className="story-track" ref={track}>
                {children}
              </div>
            </div>
          )}
        </div>
      </div>
      {!horizontal && !steps && (
        <div className="story-after" ref={after}>
          {children}
        </div>
      )}
    </>
  );
}

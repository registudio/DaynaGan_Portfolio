'use client';

import { useEffect, useRef, useState } from 'react';
import { useMode } from '../App';
import ThemeToggle from './ThemeToggle';

type Section = { id: string; label: string };

/**
 * Floating glass pill nav: shrinks once you scroll, a highlight slides to the active
 * section, and on phones it opens a slide-up sheet. Also draws the scroll progress bar
 * and the side rail of section dots.
 */
export default function ProHeader({ name, sections }: { name: string; sections: Section[] }) {
  const { setMode } = useMode();
  const [active, setActive] = useState(sections[0]?.id);
  const [compact, setCompact] = useState(false);
  const [sheet, setSheet] = useState(false);
  const bar = useRef<HTMLDivElement>(null);
  const nav = useRef<HTMLElement>(null);
  const pill = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    els.forEach((el) => io.observe(el));
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.current?.style.setProperty('--p', String(max > 0 ? scrollY / max : 0));
      setCompact(scrollY > 40);
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      io.disconnect();
      removeEventListener('scroll', onScroll);
    };
  }, [sections]);

  // Slide the highlight under the active link (and keep it in view if the nav scrolls).
  useEffect(() => {
    const move = () => {
      const a = nav.current?.querySelector<HTMLElement>('[aria-current="true"]');
      const p = pill.current;
      if (!a || !p || !nav.current) return;
      p.style.width = `${a.offsetWidth}px`;
      p.style.transform = `translateX(${a.offsetLeft}px)`;
      nav.current.scrollTo({ left: a.offsetLeft - nav.current.clientWidth / 2 + a.offsetWidth / 2, behavior: 'smooth' });
    };
    move();
    addEventListener('resize', move);
    return () => removeEventListener('resize', move);
  }, [active, compact]);

  useEffect(() => {
    if (!sheet) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setSheet(false);
    addEventListener('keydown', esc);
    return () => removeEventListener('keydown', esc);
  }, [sheet]);

  const idx = Math.max(0, sections.findIndex((s) => s.id === active));
  return (
    <>
      <div className="progress-bar" ref={bar} aria-hidden />
      <header className={`pill-header${compact ? ' compact' : ''}`}>
        <div className="pill">
          <a className="brand" href="#about" aria-label={`${name} — back to top`}>
            <span className="brand-mark" aria-hidden>
              D
            </span>
            <span className="brand-name">{name}</span>
          </a>
          <nav ref={nav} className="pill-nav" aria-label="Sections">
            <span className="pill-glow" ref={pill} aria-hidden />
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} aria-current={active === s.id}>
                {s.label}
              </a>
            ))}
          </nav>
          <div className="pill-actions">
            <ThemeToggle />
            <button className="btn small primary play-btn" onClick={() => setMode('game')}>
              ▶ <span>Play</span>
            </button>
            <button
              className="icon-btn menu-btn"
              aria-label="Open menu"
              aria-expanded={sheet}
              aria-controls="nav-sheet"
              onClick={() => setSheet(true)}
            >
              <span className="mono">{String(idx + 1).padStart(2, '0')}</span> ☰
            </button>
          </div>
        </div>
      </header>

      <nav className="rail" aria-label="Section progress">
        {sections.map((s, i) => (
          <a key={s.id} href={`#${s.id}`} aria-current={active === s.id} className={i < idx ? 'done' : ''}>
            <span>{s.label}</span>
          </a>
        ))}
      </nav>

      <div className={`sheet-scrim${sheet ? ' open' : ''}`} onClick={() => setSheet(false)} aria-hidden />
      <div id="nav-sheet" className={`sheet${sheet ? ' open' : ''}`} role="dialog" aria-modal="true" aria-label="Menu" inert={!sheet} aria-hidden={!sheet}>
        <span className="sheet-grab" aria-hidden />
        <nav aria-label="Sections">
          {sections.map((s, i) => (
            <a key={s.id} href={`#${s.id}`} aria-current={active === s.id} onClick={() => setSheet(false)}>
              <span className="mono">{String(i + 1).padStart(2, '0')}</span> {s.label}
            </a>
          ))}
        </nav>
        <div className="sheet-actions">
          <ThemeToggle />
          <button className="btn primary" onClick={() => setMode('game')}>
            ▶ Play the game
          </button>
          <button className="btn" onClick={() => setSheet(false)}>
            Close
          </button>
        </div>
      </div>
    </>
  );
}

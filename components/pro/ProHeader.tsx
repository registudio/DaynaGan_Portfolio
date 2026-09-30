'use client';

import { useEffect, useRef, useState } from 'react';
import { useMode } from '../App';
import ThemeToggle from './ThemeToggle';

export default function ProHeader({
  name,
  resume,
  sections,
}: {
  name: string;
  resume: string;
  sections: { id: string; label: string }[];
}) {
  const { setMode } = useMode();
  const [active, setActive] = useState(sections[0]?.id);
  const bar = useRef<HTMLDivElement>(null);
  const nav = useRef<HTMLElement>(null);

  // Keep the active section's link in view when the nav has to scroll.
  useEffect(() => {
    const a = nav.current?.querySelector<HTMLElement>('[aria-current="true"]');
    if (a && nav.current) nav.current.scrollTo({ left: a.offsetLeft - nav.current.clientWidth / 2 + a.offsetWidth / 2, behavior: 'smooth' });
  }, [active]);

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
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      io.disconnect();
      removeEventListener('scroll', onScroll);
    };
  }, [sections]);

  return (
    <header className="pro-header">
      <div className="pro-header-inner">
        <a className="brand" href="#about">
          <span className="brand-mark" aria-hidden>
            D
          </span>
          {name}
        </a>
        <nav ref={nav} className="pro-nav" aria-label="Sections">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} aria-current={active === s.id}>
              {s.label}
            </a>
          ))}
        </nav>
        <div className="header-actions">
          <a className="btn small" href={resume} target="_blank" rel="noopener noreferrer">
            Résumé
          </a>
          <button className="btn small primary" onClick={() => setMode('game')}>
            ▶ Play
          </button>
          <ThemeToggle />
        </div>
      </div>
      <div className="progress-bar" ref={bar} aria-hidden />
    </header>
  );
}

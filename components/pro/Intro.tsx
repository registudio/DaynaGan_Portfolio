'use client';

import { useEffect, useState } from 'react';
import { useMode } from '../App';

/**
 * Plays every time Professional mode opens (first load, from the menu or from the game),
 * like a loading screen: the name draws itself in (~1.2 s), then lifts away.
 */
export default function Intro({ name }: { name: string }) {
  const { mode } = useMode();
  const [phase, setPhase] = useState<'off' | 'draw' | 'out'>('off');

  useEffect(() => {
    if (mode !== 'pro') return;
    let skip = false;
    try {
      skip = !!sessionStorage.getItem('dg-intro-skip'); // automated checks only
    } catch {}
    if (skip || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setPhase('draw');
    const t1 = setTimeout(() => setPhase('out'), 1300);
    const t2 = setTimeout(() => setPhase('off'), 1900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    if (phase !== 'draw') return;
    const skip = () => setPhase('out');
    addEventListener('keydown', skip, { once: true });
    addEventListener('wheel', skip, { once: true, passive: true });
    return () => {
      removeEventListener('keydown', skip);
      removeEventListener('wheel', skip);
    };
  }, [phase]);

  if (phase === 'off') return null;
  return (
    <div className={`name-intro ${phase}`} onClick={() => setPhase('out')} role="presentation">
      <svg viewBox="0 0 600 120" aria-hidden>
        <text x="50%" y="62%" textAnchor="middle">
          {name}
        </text>
      </svg>
      <span className="name-intro-skip mono">click or press any key to skip</span>
    </div>
  );
}

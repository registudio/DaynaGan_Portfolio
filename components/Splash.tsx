'use client';

import { useEffect, useRef } from 'react';
import type { Site } from '@/lib/portfolio';
import type { Mode } from './App';
import { Links } from './Links';

export default function Splash({
  site,
  visible,
  remembered,
  hasSave,
  onChoose,
}: {
  site: Site;
  visible: boolean;
  remembered: Mode | null;
  hasSave: boolean;
  onChoose: (m: Mode, anchor?: string) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (visible) startRef.current?.focus({ preventScroll: true });
  }, [visible]);

  // Prefetch the game bundle (Three.js + engine) while the visitor decides.
  useEffect(() => {
    if (!visible) return;
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const run = () => void import('./game/GameShell').catch(() => {});
    if (idle) idle(run);
    else setTimeout(run, 1200);
  }, [visible]);

  // Pixel starfield drifting towards the viewer.
  useEffect(() => {
    if (!visible) return;
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const stars = Array.from({ length: 180 }, () => ({
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1,
      z: Math.random(),
    }));
    const resize = () => {
      c.width = Math.ceil(innerWidth / 3);
      c.height = Math.ceil(innerHeight / 3);
    };
    resize();
    addEventListener('resize', resize);
    const tick = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (const s of stars) {
        if (!reduce) s.z -= 0.0025;
        if (s.z <= 0.02) {
          s.x = Math.random() * 2 - 1;
          s.y = Math.random() * 2 - 1;
          s.z = 1;
        }
        const px = ((s.x / s.z) * c.width) / 2 + c.width / 2;
        const py = ((s.y / s.z) * c.height) / 2 + c.height / 2;
        const b = 1 - s.z;
        ctx.fillStyle = b > 0.7 ? '#ffffff' : b > 0.4 ? '#c4b5fd' : '#6d28d9';
        const size = b > 0.8 ? 2 : 1;
        ctx.fillRect(px | 0, py | 0, size, size);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('resize', resize);
    };
  }, [visible]);

  return (
    <div className={`splash${visible ? '' : ' gone'}`} role="dialog" aria-label="Choose a mode" aria-hidden={!visible}>
      <canvas ref={canvas} className="stars" style={{ imageRendering: 'pixelated' }} aria-hidden />
      <div className="splash-card">
        <div className="sub">Computer Engineering · Robotics · Embedded</div>
        <h1>{site.displayName.toUpperCase()}</h1>
        <p style={{ margin: 0, color: '#d8d0f0', maxWidth: 460 }}>{site.tagline}</p>
        <div className="splash-buttons">
          <button ref={startRef} className="pixel-btn" onClick={() => onChoose('game')}>
            ▶ {hasSave ? 'CONTINUE' : 'PRESS START'}
            {remembered === 'game' && <small>last played</small>}
          </button>
          <button className="pixel-btn alt" onClick={() => onChoose('pro')}>
            ☰ VIEW PROFILE
          </button>
          <button className="pixel-btn alt tour" onClick={() => onChoose('game', 'tour')} title="Xiao Hu walks you through every mission">
            ⏱ QUICK TOUR <small>~4 min, hands-free</small>
          </button>
        </div>
        <div className="splash-links">
          <Links site={site} compact />
        </div>
      </div>
    </div>
  );
}

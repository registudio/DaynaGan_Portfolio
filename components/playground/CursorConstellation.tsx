'use client';
/**
 * STAND-IN for the Playground Original "Cursor constellation".
 * Replace the body with the studio's code; keep the export name and props.
 */
import { useEffect, useRef } from 'react';

type Star = { x: number; y: number; vx: number; vy: number; r: number };
const TRAIL = 14;
const FIELD = 70;

export function CursorConstellation({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0,
      h = 0,
      dpr = 1,
      raf = 0,
      visible = true;
    const pointer = { x: -9999, y: -9999, active: false };
    const trail = Array.from({ length: TRAIL }, () => ({ x: 0, y: 0 }));
    let stars: Star[] = [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round((FIELD * w * h) / (1440 * 900));
      stars = Array.from({ length: Math.max(24, count) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        r: Math.random() * 1.4 + 0.4,
      }));
    };

    const chrome = (x: number, y: number, r: number) => {
      const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.35, '#e4dcff');
      g.addColorStop(0.7, '#9b87d6');
      g.addColorStop(1, '#3b2d63');
      return g;
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      // Ambient stars, linked to each other and to the cursor when close.
      for (const s of stars) {
        if (!reduced) {
          s.x += s.vx;
          s.y += s.vy;
          if (s.x < 0 || s.x > w) s.vx *= -1;
          if (s.y < 0 || s.y > h) s.vy *= -1;
        }
        const d = Math.hypot(s.x - pointer.x, s.y - pointer.y);
        const near = pointer.active && d < 160;
        if (near) {
          ctx.strokeStyle = `rgba(196,181,253,${(1 - d / 160) * 0.55})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }
        ctx.fillStyle = near ? chrome(s.x, s.y, s.r * 2.2) : 'rgba(196,181,253,0.45)';
        ctx.beginPath();
        ctx.arc(s.x, s.y, near ? s.r * 2.2 : s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      // Chrome comet trail that eases towards the cursor.
      if (pointer.active) {
        trail[0].x += (pointer.x - trail[0].x) * 0.45;
        trail[0].y += (pointer.y - trail[0].y) * 0.45;
        for (let i = 1; i < TRAIL; i++) {
          trail[i].x += (trail[i - 1].x - trail[i].x) * 0.42;
          trail[i].y += (trail[i - 1].y - trail[i].y) * 0.42;
        }
        for (let i = TRAIL - 1; i >= 0; i--) {
          const r = 7 * (1 - i / TRAIL) + 1;
          ctx.globalAlpha = 1 - i / TRAIL;
          ctx.fillStyle = chrome(trail[i].x, trail[i].y, r);
          ctx.beginPath();
          ctx.arc(trail[i].x, trail[i].y, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      if (visible) raf = requestAnimationFrame(draw);
    };

    const move = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      if (!pointer.active) for (const t of trail) Object.assign(t, { x: pointer.x, y: pointer.y });
      pointer.active = pointer.y >= 0 && pointer.y <= h;
    };
    const leave = () => (pointer.active = false);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(draw);
    });

    resize();
    io.observe(canvas);
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', leave);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}

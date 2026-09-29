'use client';
import { useEffect, useRef, useState, type HTMLAttributes } from 'react';

/** Counts up to `value` the first time it scrolls into view. */
export function CountUp({
  value,
  decimals = 0,
  suffix = '',
}: {
  value: number;
  decimals?: number;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setShown(0);
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 1400);
        setShown(value * (1 - Math.pow(1 - t, 3)));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(ref.current!);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);
  return (
    <span ref={ref}>
      {shown.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/** Card that tilts towards the pointer with a moving sheen. */
export function TiltCard({ children, className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className={`tilt ${className}`}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return;
        const r = ref.current!.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        ref.current!.style.setProperty('--rx', `${(0.5 - y) * 10}deg`);
        ref.current!.style.setProperty('--ry', `${(x - 0.5) * 12}deg`);
        ref.current!.style.setProperty('--mx', `${x * 100}%`);
        ref.current!.style.setProperty('--my', `${y * 100}%`);
      }}
      onPointerLeave={() => {
        ref.current!.style.setProperty('--rx', '0deg');
        ref.current!.style.setProperty('--ry', '0deg');
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Button that leans towards the pointer. */
export function Magnetic({ children, className = '', ...rest }: HTMLAttributes<HTMLSpanElement>) {
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <span
      ref={ref}
      className={`magnetic ${className}`}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return;
        const r = ref.current!.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        ref.current!.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
      }}
      onPointerLeave={() => (ref.current!.style.transform = '')}
      {...rest}
    >
      {children}
    </span>
  );
}

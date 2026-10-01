'use client';

import { useEffect, useRef, useState } from 'react';
import CountUp from './CountUp';

/**
 * A figure like "3.97", "100+" or "55.6%" that counts up with React Bits' CountUp. Inside a
 * pinned story step it waits until that step is reached; with reduced motion it just shows
 * the value. Screen readers always get the final figure.
 */
export default function CountStat({ value, className }: { value: string; className?: string }) {
  const m = value.match(/^([\d.]+)(.*)$/);
  const ref = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false);
  const [still, setStill] = useState(false);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return setStill(true);
    const step = ref.current?.closest('.pin-step');
    if (!step) return setReady(true);
    const check = () => step.classList.contains('on') && setReady(true);
    check();
    const mo = new MutationObserver(check);
    mo.observe(step, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);

  if (!m) return <span className={className}>{value}</span>;
  return (
    <span className={className} ref={ref}>
      <span className="sr-only">{value}</span>
      <span aria-hidden>
        {still ? m[1] : <CountUp to={Number(m[1])} duration={1.6} startWhen={ready} />}
        {m[2]}
      </span>
    </span>
  );
}

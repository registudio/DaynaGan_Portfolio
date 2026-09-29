'use client';
import { useEffect, useRef, useState } from 'react';
import type { Profile } from '@/lib/content';

/** Vertical timeline whose spine fills as you scroll; each stop lights up as the fill reaches it. */
export function EducationTimeline({ items }: { items: Profile['education'] }) {
  const ref = useRef<HTMLOListElement>(null);
  const [fill, setFill] = useState(0);
  const [reached, setReached] = useState<number>(-1);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const list = ref.current!;
      const rect = list.getBoundingClientRect();
      const line = window.innerHeight * 0.6; // the "reading line" the fill follows
      const p = Math.min(1, Math.max(0, (line - rect.top) / rect.height));
      setFill(p);
      let last = -1;
      list.querySelectorAll<HTMLElement>('.timeline-node').forEach((node, i) => {
        if (node.getBoundingClientRect().top < line) last = i;
      });
      setReached(last);
    };
    const request = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', request);
      window.removeEventListener('resize', request);
    };
  }, []);

  return (
    <ol className="timeline" ref={ref}>
      <span className="timeline-spine" aria-hidden="true">
        <span style={{ transform: `scaleY(${fill})` }} />
      </span>
      {items.map((item, i) => (
        <li key={item.id} className={`timeline-item${i <= reached ? ' is-reached' : ''}`}>
          <span className="timeline-node" aria-hidden="true">
            {item.short}
          </span>
          <article className="timeline-card">
            <p className="timeline-period">{item.period || 'Secondary school'}</p>
            <h3>{item.title}</h3>
            <p className="timeline-qualification">{item.qualification}</p>
            <ul>
              {item.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </article>
        </li>
      ))}
    </ol>
  );
}

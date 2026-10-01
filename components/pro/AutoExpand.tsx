'use client';

import { useEffect, useRef } from 'react';
import { onScrollFrame } from './scrollLoop';

/**
 * Editorial rows that open one after another as you scroll: the first opens when it reaches
 * the screen, each next one once the row before it has been scrolled through. Opened rows
 * stay open; clicking a header toggles it.
 */
export default function AutoExpand({ children, className }: { children: React.ReactNode; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const rows = [...(box.current?.querySelectorAll<HTMLElement>('.edu-row') ?? [])];
    const touched = new Set<HTMLElement>(); // rows the visitor toggled by hand
    const openedAt = new Map<HTMLElement, number>();
    const set = (row: HTMLElement, open: boolean) => {
      row.classList.toggle('open', open);
      if (open) openedAt.set(row, performance.now());
      row.querySelector('.edu-toggle')?.setAttribute('aria-expanded', String(open));
    };
    const check = () => {
      const vh = innerHeight;
      rows.forEach((row, i) => {
        if (touched.has(row) || row.classList.contains('open')) return;
        const ready =
          i === 0
            ? row.getBoundingClientRect().top < vh * 0.7
            : // The row before has finished opening and been scrolled through.
              rows[i - 1].classList.contains('open') &&
              performance.now() - (openedAt.get(rows[i - 1]) ?? 0) > 700 &&
              rows[i - 1].getBoundingClientRect().bottom < vh * 0.62 &&
              row.getBoundingClientRect().top < vh * 0.8;
        if (ready) set(row, true);
      });
    };
    const offs = rows.map((row) => {
      const head = row.querySelector<HTMLElement>('.edu-toggle')!;
      const click = () => {
        touched.add(row);
        set(row, !row.classList.contains('open'));
      };
      head.addEventListener('click', click);
      return () => head.removeEventListener('click', click);
    });
    const off = onScrollFrame(check);
    check();
    return () => {
      off();
      offs.forEach((f) => f());
    };
  }, []);
  return (
    <div ref={box} className={className}>
      {children}
    </div>
  );
}

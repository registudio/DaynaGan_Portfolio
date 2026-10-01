'use client';
/**
 * STAND-IN for the Playground Original "Before and after" slider.
 * Replace the body with the studio's code; keep the export name and props.
 */
import { useRef, useState, type ReactNode } from 'react';

export function BeforeAfter({
  before,
  after,
  beforeLabel,
  afterLabel,
  initial = 50,
}: {
  before: ReactNode;
  after: ReactNode;
  beforeLabel: string;
  afterLabel: string;
  initial?: number;
}) {
  const [split, setSplit] = useState(initial);
  const frame = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const update = (clientX: number) => {
    const rect = frame.current!.getBoundingClientRect();
    setSplit(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  };

  return (
    <div
      ref={frame}
      className="compare"
      style={{ '--split': `${split}%` } as React.CSSProperties}
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e.clientX);
      }}
      onPointerMove={(e) => dragging.current && update(e.clientX)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      <div className="compare-side compare-after">
        {after}
        <span className="compare-label compare-label-after">{afterLabel}</span>
      </div>
      <div className="compare-side compare-before" aria-hidden={split < 2}>
        {before}
        <span className="compare-label">{beforeLabel}</span>
      </div>
      <input
        className="compare-range"
        type="range"
        min={0}
        max={100}
        value={Math.round(split)}
        onChange={(e) => setSplit(Number(e.target.value))}
        aria-label={`Reveal ${beforeLabel} or ${afterLabel}`}
      />
      <div className="compare-handle" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}

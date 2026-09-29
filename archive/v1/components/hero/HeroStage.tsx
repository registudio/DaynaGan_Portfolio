'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import type { HeroModel } from './HeroModels';

const HeroModels = dynamic(() => import('./HeroModels'), { ssr: false });

/** Cycles through the project blueprints, with a caption and dots to jump between them. */
export function HeroStage({ models }: { models: HeroModel[] }) {
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const paused = useRef(false);

  useEffect(() => {
    try {
      const c = document.createElement('canvas');
      setReady(!!(c.getContext('webgl2') || c.getContext('webgl')));
    } catch {
      setReady(false);
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      if (!paused.current && document.visibilityState === 'visible')
        setIndex((i) => (i + 1) % models.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, [models.length]);

  return (
    <div
      className="hero-stage"
      onPointerEnter={() => (paused.current = true)}
      onPointerLeave={() => (paused.current = false)}
    >
      <div className="hero-models">{ready && <HeroModels models={models} index={index} />}</div>
      <div className="hero-caption">
        <span className="hero-caption-label">
          <span>Blueprint {String(index + 1).padStart(2, '0')}</span>
          <a href="#projects">{models[index].title} ↓</a>
        </span>
        <span className="hero-dots" role="group" aria-label="Choose a blueprint">
          {models.map((m, i) => (
            <button
              key={m.slug}
              aria-label={m.title}
              aria-pressed={i === index}
              onClick={() => setIndex(i)}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

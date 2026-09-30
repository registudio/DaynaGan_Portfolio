'use client';

import { useEffect, useRef, useState } from 'react';

export type ShowcaseItem = { id: string; title: string };

const SPACING = 3.9;

/**
 * Hero centrepiece: every project model on a horizontal carousel. The row slides along the
 * x-axis to the current model while each one turns on its own turntable. Wireframe
 * blueprints stand in until the CAD exports arrive.
 */
export default function HeroCarousel({ items, cad }: { items: ShowcaseItem[]; cad: Record<string, string> }) {
  const host = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [gl, setGl] = useState<boolean | null>(null);
  const target = useRef(0);
  const paused = useRef(false);
  target.current = index;

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    (async () => {
      const THREE = await import('three');
      const { Stage, projectModel, isDark, reducedMotion, webglAvailable } = await import('./three/stage');
      if (disposed || !host.current) return;
      if (!webglAvailable()) return setGl(false);
      setGl(true);
      const reduce = reducedMotion();
      const row = new THREE.Group();
      const slots: InstanceType<typeof THREE.Group>[] = [];
      const models: Awaited<ReturnType<typeof projectModel>>[] = [];
      let x = 0;
      let pointerY = 0;
      const stage = new Stage(host.current, (dt, t) => {
        x += (-target.current * SPACING - x) * Math.min(1, dt * 4);
        row.position.x = x;
        slots.forEach((s, i) => {
          const d = Math.abs(i * SPACING + x) / SPACING;
          const k = 1.25 - Math.min(1, d) * 0.5;
          s.scale.setScalar(s.scale.x + (k - s.scale.x) * Math.min(1, dt * 5));
          if (!reduce) s.rotation.y += dt * (0.35 + (1 - Math.min(1, d)) * 0.2);
          models[i]?.setExplode(reduce ? 0.15 : 0.12 + Math.sin(t * 0.9 + i) * 0.12);
        });
        row.rotation.x += (pointerY * 0.12 - row.rotation.x) * 0.05;
      });
      stage.camera.position.set(0, 1.6, 6.6);
      stage.camera.lookAt(0, -0.35, 0);
      stage.scene.add(row);
      // A glowing turntable ring under each model.
      const ringGeo = new THREE.RingGeometry(1.25, 1.29, 64);
      const ringMat = new THREE.MeshBasicMaterial({ color: '#a78bfa', transparent: true, opacity: 0.4, side: THREE.DoubleSide });
      const discMat = new THREE.MeshBasicMaterial({ color: '#7c3aed', transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false });
      const discGeo = new THREE.CircleGeometry(1.25, 64);
      for (const [i, item] of items.entries()) {
        const slot = new THREE.Group();
        slot.position.x = i * SPACING;
        slot.rotation.y = i * 0.8;
        row.add(slot);
        slots.push(slot);
        const ring = new THREE.Mesh(ringGeo, ringMat);
        const disc = new THREE.Mesh(discGeo, discMat);
        ring.rotation.x = disc.rotation.x = -Math.PI / 2;
        ring.position.set(i * SPACING, -1.05, 0);
        disc.position.copy(ring.position);
        row.add(ring, disc);
        const m = await projectModel(item.id, cad[item.id], isDark());
        if (disposed) return m?.dispose();
        models.push(m);
        if (m) slot.add(m.group);
      }
      stage.themeChanged = (d) => models.forEach((m) => m?.setTheme(d));
      const onMove = (e: PointerEvent) => (pointerY = (e.clientY / innerHeight) * 2 - 1);
      addEventListener('pointermove', onMove, { passive: true });
      cleanup = () => {
        removeEventListener('pointermove', onMove);
        models.forEach((m) => m?.dispose());
        [ringGeo, ringMat, discGeo, discMat].forEach((x) => x.dispose());
        stage.dispose();
      };
    })();
    return () => {
      disposed = true;
      cleanup();
    };
  }, [items, cad]);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => {
      if (!paused.current && !document.hidden) setIndex((i) => (i + 1) % items.length);
    }, 4800);
    return () => clearInterval(id);
  }, [items.length]);

  const go = (d: number) => setIndex((i) => (i + d + items.length) % items.length);
  const item = items[index];
  return (
    <div
      className="hero-stage"
      onPointerEnter={() => (paused.current = true)}
      onPointerLeave={() => (paused.current = false)}
      onFocus={() => (paused.current = true)}
      onBlur={() => (paused.current = false)}
    >
      <div className="hero-canvas" ref={host} aria-hidden>
        {gl === false && <div className="hero-fallback">{items.map((i) => i.title).join(' · ')}</div>}
      </div>
      <div className="hero-caption">
        <button className="icon-btn" onClick={() => go(-1)} aria-label="Previous model">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <div className="hero-caption-text" aria-live="polite">
          <span className="mono">Blueprint {String(index + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}</span>
          <a href={`#projects-${item.id}`}>{item.title} ↓</a>
        </div>
        <button className="icon-btn" onClick={() => go(1)} aria-label="Next model">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <div className="hero-dots" role="group" aria-label="Choose a model">
        {items.map((m, i) => (
          <button key={m.id} aria-label={m.title} aria-pressed={i === index} onClick={() => setIndex(i)} />
        ))}
      </div>
    </div>
  );
}

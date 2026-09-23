'use client';
import dynamic from 'next/dynamic';
import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { NavigationItem } from '@/lib/content';
import { scrollState } from '@/lib/scene';
import { asset } from '@/lib/urls';
const StationCanvas = dynamic(() => import('./scene/StationCanvas'), { ssr: false });
class SceneBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
export function StationExperience({
  navigation,
  station,
}: {
  navigation: NavigationItem[];
  station: string;
}) {
  const [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false),
    [reduced, setReduced] = useState(false),
    [manualPause, setManualPause] = useState(false),
    [active, setActive] = useState(0);
  const progressRef = useRef<HTMLSpanElement>(null),
    barRef = useRef<HTMLDivElement>(null);
  const current = useRef(-1);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2');
      if (gl) {
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        setReady(true);
      } else setFailed(true);
    } catch {
      setFailed(true);
    }
    const onLost = () => setFailed(true);
    window.addEventListener('station-context-lost', onLost);
    return () => {
      query.removeEventListener('change', update);
      window.removeEventListener('station-context-lost', onLost);
    };
  }, []);
  useEffect(() => {
    scrollState.reduced = reduced || manualPause;
    document.documentElement.dataset.motion = scrollState.reduced ? 'reduced' : 'full';
    window.dispatchEvent(new Event('station-update'));
  }, [reduced, manualPause]);
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const sections = navigation
      .map((n) => document.getElementById(n.id))
      .filter((s): s is HTMLElement => !!s);
    let offsets: number[] = [];
    const measure = () => {
      offsets = sections.map((s) => s.getBoundingClientRect().top + window.scrollY);
    };
    const update = () => {
      const y = window.scrollY;
      let index = 0;
      for (let i = 0; i < offsets.length; i++)
        if (y + window.innerHeight * 0.3 >= offsets[i]) index = i;
      const fraction =
        (y + window.innerHeight * 0.3 - offsets[index]) /
        Math.max(1, (offsets[index + 1] ?? document.documentElement.scrollHeight) - offsets[index]);
      scrollState.stage = y < 20 ? 0 : Math.max(0, Math.min(7, index + fraction));
      scrollState.progress = Math.min(
        1,
        y / Math.max(1, document.documentElement.scrollHeight - window.innerHeight),
      );
      const p = Math.round(scrollState.progress * 100);
      if (progressRef.current) progressRef.current.textContent = `${p}%`;
      if (barRef.current) barRef.current.style.setProperty('--progress', `${p}%`);
      document.documentElement.dataset.stage = String(index);
      if (current.current !== index) {
        current.current = index;
        setActive(index);
      }
      window.dispatchEvent(new Event('station-update'));
    };
    measure();
    update();
    const trigger = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: update,
      onRefresh: () => {
        measure();
        update();
      },
    });
    const observer = new ResizeObserver(() => ScrollTrigger.refresh());
    observer.observe(document.body);
    return () => {
      trigger.kill();
      observer.disconnect();
    };
  }, [navigation]);
  return (
    <>
      <div className={`scene-layer ${failed ? 'scene-fallback' : ''}`} aria-hidden="true">
        <div className="scene-orbit orbit-one" />
        <div className="scene-orbit orbit-two" />
        <img
          className={`blueprint-fallback ${ready && !failed ? 'canvas-ready' : ''}`}
          src={asset('/images/station-blueprint.svg')}
          alt=""
        />
        {ready && !failed && (
          <SceneBoundary onFailure={() => setFailed(true)}>
            <StationCanvas />
          </SceneBoundary>
        )}
        <div className="scene-axis axis-top">
          + <span>Y</span>
        </div>
        <div className="scene-axis axis-bottom">
          + <span>X</span>
        </div>
        <div className="scene-dimension">
          <span>Ø 5.40 / D–01</span>
        </div>
      </div>
      <aside className="module-rail" aria-label="Station module navigation">
        {navigation.map((n, i) => (
          <a
            key={n.id}
            href={`#${n.id}`}
            aria-label={`${n.number} ${n.label}: ${n.caption}`}
            aria-current={active === i ? 'location' : undefined}
            onMouseEnter={() => {
              scrollState.hovered = n.id;
              window.dispatchEvent(new Event('station-update'));
            }}
            onMouseLeave={() => {
              scrollState.hovered = '';
              window.dispatchEvent(new Event('station-update'));
            }}
          >
            <span>{n.number}</span>
            <i />
            <b>{n.label}</b>
          </a>
        ))}
      </aside>
      <div className="assembly-hud">
        <div className="hud-meta">
          <span>
            <i className="status-dot" />
            {station} // {active === 7 ? 'OPERATIONAL' : 'ASSEMBLY'}
          </span>
          <span ref={progressRef}>0%</span>
        </div>
        <div className="segmented-progress" ref={barRef} />
        <div className="hud-bottom">
          <span>
            {navigation[active]?.number} / {navigation[active]?.label.toUpperCase()}
          </span>
          <button
            type="button"
            onClick={() => setManualPause((v) => !v)}
            aria-pressed={reduced || manualPause}
            disabled={reduced}
            aria-label="Use reduced motion"
          >
            {reduced || manualPause ? 'MOTION OFF' : 'MOTION ON'}{' '}
            <span>{reduced || manualPause ? '○' : '◉'}</span>
          </button>
        </div>
      </div>
    </>
  );
}

'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { GitHubFeed } from '@/lib/github';
import type { Portfolio } from '@/lib/portfolio';
import { Game } from '@/game/engine/Game';
import type { Hud } from '@/game/engine/store';
import type { Mode } from '../App';
import HudView from './Hud';
import PanelView from './PanelView';
import PauseMenu from './PauseMenu';
import TouchControls from './TouchControls';
import './game.css';

export default function GameShell({
  portfolio,
  github,
  onExit,
}: {
  portfolio: Portfolio;
  github: GitHubFeed;
  onExit: (m: Mode, anchor?: string) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState<string | null>(null);
  const exitRef = useRef(onExit);
  exitRef.current = onExit;

  useEffect(() => {
    if (!canvas.current || !overlay.current) return;
    const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    let g: Game | null = null;
    try {
      g = new Game({
        canvas: canvas.current,
        overlay: overlay.current,
        portfolio,
        github,
        touch,
        events: { onExit: (m, a) => exitRef.current(m, a) },
      });
      g.start();
      setGame(g);
    } catch (e) {
      console.error(e);
      setError('Your browser could not start the 3D game (WebGL unavailable).');
    }
    return () => g?.dispose();
  }, [portfolio, github]);

  if (error)
    return (
      <div className="g-root g-error">
        <p>{error}</p>
        <button className="pixel-btn" onClick={() => onExit('pro')}>
          ☰ View profile instead
        </button>
      </div>
    );

  return (
    <div className="g-root">
      <canvas ref={canvas} className="g-canvas" />
      <div ref={overlay} className="g-overlay" aria-hidden />
      {game && <GameUi game={game} />}
    </div>
  );
}

export function useHud(game: Game): Hud {
  return useSyncExternalStore(game.store.subscribe, game.store.get, game.store.get);
}

function GameUi({ game }: { game: Game }) {
  const hud = useHud(game);
  return (
    <>
      <HudView game={game} hud={hud} />
      {hud.touch && !hud.panel && !hud.menu && <TouchControls game={game} hud={hud} />}
      {hud.panel && <PanelView game={game} hud={hud} panel={hud.panel} />}
      {hud.menu === 'pause' && !hud.panel && <PauseMenu game={game} hud={hud} />}
      {hud.loading && (
        <div className="g-loading" role="status">
          <div className="g-loading-bar" />
          <span className="blink">{hud.loading}</span>
        </div>
      )}
    </>
  );
}

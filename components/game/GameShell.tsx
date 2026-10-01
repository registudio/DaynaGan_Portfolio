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
import ControlsOverlay from './ControlsOverlay';
import { useGameState } from './useGameState';
import './game.css';

export default function GameShell({
  portfolio,
  github,
  onExit,
  tour = false,
  planet = false,
}: {
  portfolio: Portfolio;
  github: GitHubFeed;
  onExit: (m: Mode, anchor?: string) => void;
  tour?: boolean;
  planet?: boolean;
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
    let tourTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      g = new Game({
        canvas: canvas.current,
        overlay: overlay.current,
        portfolio,
        github,
        touch,
        events: { onExit: (m, a) => exitRef.current(m, a) },
      });
      g.start(planet ? 'planet' : 'hub');
      setGame(g);
      if (tour) tourTimer = setTimeout(() => g?.startTour(), 900);
      if (process.env.NODE_ENV !== 'production') (window as unknown as { __game: Game }).__game = g;
    } catch (e) {
      console.error(e);
      setError('Your browser could not start the 3D game (WebGL unavailable).');
    }
    return () => { clearTimeout(tourTimer); g?.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolio, github]);

  if (error)
    return (
      <div className="g-root g-error">
        <p>{error}</p>
        <button className="pixel-btn" onClick={() => onExit('pro')}>
          Professional Mode instead
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
  // Cooldowns are consumed by Hotbar alone, not by panels or the rest of the HUD.
  return useGameState(game, ['scene','sceneTitle','loading','hp','maxHp','prompt','objective','chips','panel','card','area','assembly','banner','menu','toasts','save','settings','rev','touch','dead','boss','device','tour','navigation']) as Hud;
}

function GameUi({ game }: { game: Game }) {
  const hud = useHud(game);
  return (
    <>
      <HudView game={game} hud={hud} />
      {hud.touch && !hud.panel && !hud.menu && <TouchControls game={game} hud={hud} />}
      {!hud.menu && <ControlsOverlay game={game} hud={hud} />}
      <div className={`g-lowhp${!hud.dead && hud.hp > 0 && hud.hp / hud.maxHp <= 0.3 ? ' on' : ''}`} aria-hidden />
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

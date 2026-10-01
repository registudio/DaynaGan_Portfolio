'use client';

import dynamic from 'next/dynamic';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { GitHubFeed } from '@/lib/github';
import type { Portfolio } from '@/lib/portfolio';
import Splash from './Splash';

export type Mode = 'splash' | 'pro' | 'game';

const Game = dynamic(() => import('./game/GameShell'), {
  ssr: false,
  loading: () => <div className="game-loading blink">BOOTING STATION…</div>,
});

type ModeApi = { mode: Mode; setMode: (m: Mode, anchor?: string) => void };
const ModeContext = createContext<ModeApi>({ mode: 'splash', setMode: () => {} });
export const useMode = () => useContext(ModeContext);

const MODE_KEY = 'dg-mode';
export const SAVE_KEY = 'dg-save-v2';

export default function App({
  portfolio,
  github,
  children,
}: {
  portfolio: Portfolio;
  github: GitHubFeed;
  children: React.ReactNode;
}) {
  const [mode, setModeState] = useState<Mode>('splash');
  const [remembered, setRemembered] = useState<Mode | null>(null);
  const [hasSave, setHasSave] = useState(false);
  const [tour, setTour] = useState(false);
  const [planet, setPlanet] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('js');
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(MODE_KEY);
      setHasSave(!!localStorage.getItem(SAVE_KEY));
    } catch {}
    const hash = location.hash.slice(1);
    if (hash === 'play' || hash === 'tour' || hash === 'planet') {
      setTour(hash === 'tour');
      setPlanet(hash === 'planet');
      setModeState('game');
    }
    else if (hash && hash !== 'splash') setModeState('pro');
    else if (stored === 'pro') setModeState('pro');
    if (stored === 'pro' || stored === 'game') setRemembered(stored);
    // Not heading into Professional mode after all: drop the pre-paint cover.
    const html = document.documentElement;
    if (!html.classList.contains('boot-pro') || hash === 'play' || hash === 'tour' || hash === 'planet') html.classList.add('booted');
  }, []);

  const setMode = useCallback((m: Mode, anchor?: string) => {
    setModeState(m);
    try {
      if (m !== 'splash') localStorage.setItem(MODE_KEY, m);
    } catch {}
    if (m === 'pro') {
      history.replaceState(null, '', anchor ? `#${anchor}` : location.pathname);
      // Let the stories measure, then land on the section's resting state.
      if (anchor) setTimeout(() => import('./pro/goTo').then((m) => m.goTo(anchor)), 750);
    } else if (m === 'splash') {
      history.replaceState(null, '', location.pathname);
    } else if (m === 'game') {
      setTour(anchor === 'tour');
      setPlanet(anchor === 'planet');
      history.replaceState(null, '', anchor === 'tour' ? '#tour' : anchor === 'planet' ? '#planet' : '#play');
    }
  }, []);

  useEffect(() => {
    document.body.classList.toggle('lock', mode !== 'pro');
  }, [mode]);

  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      <div hidden={mode === 'game'} aria-hidden={mode === 'splash' || undefined}>
        {children}
      </div>
      <Splash
        site={portfolio.site}
        visible={mode === 'splash'}
        remembered={remembered}
        hasSave={hasSave}
        onChoose={setMode}
      />
      {mode === 'game' && <Game portfolio={portfolio} github={github} onExit={setMode} tour={tour} planet={planet} />}
    </ModeContext.Provider>
  );
}

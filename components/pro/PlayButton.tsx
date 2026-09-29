'use client';

import { useMode } from '../App';

export function PlayButton({ small = false }: { small?: boolean }) {
  const { setMode } = useMode();
  return (
    <button className={`btn primary${small ? ' small' : ''}`} onClick={() => setMode('game')}>
      ▶ Play the game
    </button>
  );
}

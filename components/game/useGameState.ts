'use client';
import { useMemo, useSyncExternalStore } from 'react';
import type { Game } from '@/game/engine/Game';
import type { Hud } from '@/game/engine/store';

/** Stable projections keep unrelated store ticks out of React subtrees. */
export function useGameState<K extends keyof Hud>(game: Game, keys: readonly K[]): Pick<Hud,K> {
  const signature=keys.join('|');
  const snapshot=useMemo(()=>{
    let selected: Pick<Hud,K> | undefined;
    return ()=>{
      const state=game.store.get();
      if(selected && keys.every(k=>Object.is(selected![k],state[k]))) return selected;
      selected=Object.fromEntries(keys.map(k=>[k,state[k]])) as Pick<Hud,K>;
      return selected;
    };
    // Field names define the selector, not the caller's array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[game,signature]);
  return useSyncExternalStore(game.store.subscribe,snapshot,snapshot);
}

'use client';

import { useEffect, useState } from 'react';
import type { Game } from '@/game/engine/Game';
import type { Hud } from '@/game/engine/store';

const SEEN_KEY = 'dg-controls-seen';

type Row = { label: string; keyboard: string; gamepad: string; touch: string };
const ROWS: Row[] = [
  { label: 'Move', keyboard: 'W A S D / ← ↑ → ↓', gamepad: 'Left stick', touch: 'Left joystick' },
  { label: 'Interact / scan', keyboard: 'E', gamepad: 'Ⓐ', touch: 'Tap the prompt / E button' },
  { label: 'Wrench (3-hit combo)', keyboard: 'Left click / J', gamepad: 'Ⓧ', touch: 'Wrench button' },
  { label: 'Solder beam', keyboard: 'Right click / K', gamepad: 'Ⓑ / RT', touch: 'Bolt button' },
  { label: 'Dash (after the Reactor)', keyboard: 'Shift / Space', gamepad: 'LB / RB', touch: 'Boot button' },
  { label: 'Xiao Hu: pounce / fetch', keyboard: 'C', gamepad: '—', touch: 'Cat button' },
  { label: 'Artifacts', keyboard: '1 2 3 4', gamepad: 'D-pad', touch: 'Hotbar slots' },
  { label: 'Pause · codex · settings', keyboard: 'Esc / P', gamepad: 'Start', touch: '❚❚ top right' },
];

/** First-run controls card, matching the visitor's device. Reopen from Pause → Controls. */
export default function ControlsOverlay({ game, hud, force = false, onClose }: { game: Game; hud: Hud; force?: boolean; onClose?: () => void }) {
  const [open, setOpen] = useState(force);
  useEffect(() => {
    if (force) return;
    let seen = false;
    try {
      seen = !!localStorage.getItem(SEEN_KEY);
    } catch {}
    if (!seen && !hud.tour) {
      setOpen(true);
      const t = setTimeout(() => close(), 20000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {}
    onClose?.();
  };
  if (!open || hud.panel || hud.loading) return null;
  const device = hud.device;
  const title = device === 'gamepad' ? 'Gamepad' : device === 'touch' ? 'Touch' : 'Keyboard & mouse';
  return (
    <div className="g-controls-card" role="dialog" aria-label="Controls">
      <div className="g-cc-head">
        <b>CONTROLS · {title}</b>
        <button onClick={close} aria-label="Close controls">
          ✕
        </button>
      </div>
      <table>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.label}>
              <td>{r.label}</td>
              <td>
                <kbd>{r[device]}</kbd>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Switches automatically when you pick up a controller or touch the screen. {game.portfolio.site.companion.name} will point
        the way.
      </p>
      <button className="g-btn primary" onClick={close}>
        Got it ▶
      </button>
    </div>
  );
}

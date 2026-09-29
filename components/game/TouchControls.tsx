'use client';

import { useRef } from 'react';
import type { Game } from '@/game/engine/Game';
import type { Action, Hud } from '@/game/engine/store';
import PixelIcon from './PixelIcon';

/** Virtual joystick (left) + action buttons (right) for touch screens. */
export default function TouchControls({ game, hud }: { game: Game; hud: Hud }) {
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const id = useRef<number | null>(null);

  const move = (e: React.PointerEvent) => {
    if (id.current !== e.pointerId || !base.current) return;
    const r = base.current.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = (e.clientX - cx) / (r.width / 2);
    let dy = (e.clientY - cy) / (r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > 1) {
      dx /= len;
      dy /= len;
    }
    game.input.stick = { x: dx, y: -dy };
    if (knob.current) knob.current.style.transform = `translate(${dx * 34}px, ${dy * 34}px)`;
  };
  const end = (e: React.PointerEvent) => {
    if (id.current !== e.pointerId) return;
    id.current = null;
    game.input.stick = { x: 0, y: 0 };
    if (knob.current) knob.current.style.transform = '';
  };
  const btn = (action: Action, icon: string, label: string, cls = '') => (
    <button
      className={`g-tbtn ${cls}`}
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        game.input.hold(action, true);
      }}
      onPointerUp={() => game.input.hold(action, false)}
      onPointerCancel={() => game.input.hold(action, false)}
      onPointerLeave={() => game.input.hold(action, false)}
    >
      {icon.length > 2 ? <PixelIcon name={icon} size={26} /> : icon}
    </button>
  );
  return (
    <div className="g-touch">
      <div
        ref={base}
        className="g-stick"
        onPointerDown={(e) => {
          id.current = e.pointerId;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          move(e);
        }}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <div ref={knob} className="g-knob" />
      </div>
      <div className="g-tbtns">
        {btn('zap', 'bolt', 'Solder beam', 'b1')}
        {btn('melee', 'wrench', 'Wrench', 'b2 big')}
        {btn('dash', 'boot', 'Dash', 'b3')}
        {hud.prompt && btn('interact', 'E', 'Interact', 'b4 act')}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { biomeFor } from '@/game/engine/biomes';
import type { Game } from '@/game/engine/Game';
import { chips, clearedCount, contactUnlocked, MISSION_ORDER } from '@/game/engine/missions';
import type { Hud } from '@/game/engine/store';

/** Isometric "world map" of floating mission islands around the station (MC Dungeons-style). */

const POS: Record<string, [number, number]> = {
  about: [-2.6, -2.2],
  education: [0.2, -3.4],
  experience: [2.9, -2.1],
  projects: [3.6, 0.8],
  trophies: [1.8, 3.2],
  leadership: [-1.2, 3.4],
  github: [-3.7, -0.5],
  contact: [-0.2, 0.3],
};

const TW = 50;
const TH = 40;
const iso = (x: number, y: number) => ({ x: (x - y) * TW, y: (x + y) * TH * 0.62 });

function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (s: number) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f)));
  return `rgb(${c(16)},${c(8)},${c(0)})`;
}

export default function StarMap({ game, hud }: { game: Game; hud: Hud }) {
  const { portfolio } = game;
  const [focus, setFocus] = useState<string>(MISSION_ORDER.find((id) => !hud.save.cleared.includes(id)) ?? 'about');
  const unlocked = contactUnlocked(portfolio, hud.save);
  const need = portfolio.site.contactUnlockAfter;
  const level = portfolio.levels.find((l) => l.id === focus);
  const locked = focus === 'contact' && !unlocked;
  const c = chips(portfolio, hud.save, focus);
  const biome = biomeFor(level?.meta.biome, level?.meta.light);

  return (
    <div className="g-starmap">
      <div className="g-eyebrow">Station Hub · Star map</div>
      <h2>Choose a deployment</h2>
      <div className="g-map-wrap">
        <svg viewBox="-340 -230 680 470" className="g-map" role="list" aria-label="Missions">
          {/* Starfield */}
          {Array.from({ length: 70 }, (_, i) => (
            <rect key={i} x={((i * 97) % 680) - 340} y={((i * 53) % 470) - 230} width={i % 7 ? 1.5 : 2.5} height={i % 7 ? 1.5 : 2.5} fill={i % 5 ? '#6d5aa8' : '#fff'} opacity={0.7} />
          ))}
          {/* Routes */}
          {MISSION_ORDER.filter((id) => id !== 'contact').map((id) => {
            const a = iso(0, 0);
            const b = iso(...POS[id]);
            return <line key={id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#4c3d7a" strokeDasharray="4 6" strokeWidth={2} />;
          })}
          {MISSION_ORDER.map((id) => {
            const l = portfolio.levels.find((x) => x.id === id);
            if (!l) return null;
            const b = biomeFor(l.meta.biome, l.meta.light);
            const { x, y } = iso(...POS[id]);
            const size = id === 'contact' ? 0.8 : 1;
            const w = TW * size;
            const h = TH * 0.62 * size;
            const cleared = hud.save.cleared.includes(id);
            const isLocked = id === 'contact' && !unlocked;
            const top = b.floor.color;
            const pct = chips(portfolio, hud.save, id);
            return (
              <g
                key={id}
                transform={`translate(${x} ${y})`}
                className={`g-isle${focus === id ? ' on' : ''}${isLocked ? ' locked' : ''}`}
                role="listitem"
                tabIndex={0}
                onClick={() => setFocus(id)}
                onKeyDown={(e) => e.key === 'Enter' && setFocus(id)}
                aria-label={`${l.title}${cleared ? ', cleared' : ''}${isLocked ? ', locked' : ''}`}
              >
                <polygon points={`${-w},0 0,${h} 0,${h + 26} ${-w},26`} fill={shade(b.cliff, 1.6)} />
                <polygon points={`${w},0 0,${h} 0,${h + 26} ${w},26`} fill={shade(b.cliff, 1.1)} />
                <polygon points={`0,${-h} ${w},0 0,${h} ${-w},0`} fill={top} stroke={b.light} strokeWidth={focus === id ? 3 : 1.5} />
                <rect x={-6} y={-h * 0.4 - 16} width={12} height={16} fill={b.light} opacity={0.9} />
                <rect x={-3} y={-h * 0.4 - 24} width={6} height={8} fill="#fff" opacity={0.85} />
                {/* Badge */}
                <g transform={`translate(0 ${-h - 22})`}>
                  <polygon points="0,-13 11,-6 11,6 0,13 -11,6 -11,-6" fill={isLocked ? '#334155' : cleared ? '#fbbf24' : '#1e1b2e'} stroke={b.light} strokeWidth={2} />
                  <text y={4} textAnchor="middle" className="g-badge-t">
                    {isLocked ? '🔒' : cleared ? '★' : `${Math.round((pct.got / Math.max(1, pct.total)) * 100)}`}
                  </text>
                </g>
                <text y={h + 46} textAnchor="middle" className="g-isle-t">
                  {l.title.toUpperCase()}
                </text>
              </g>
            );
          })}
          <g transform={`translate(${iso(0, 0).x} ${iso(0, 0).y})`} opacity={0}>
            <circle r={4} fill="#fff" />
          </g>
        </svg>
        <aside className="g-map-info" style={{ ['--accent' as string]: biome.light }}>
          <div className="g-eyebrow">{level?.meta.eyebrow}</div>
          <h3>{level?.title}</h3>
          <p className="g-biome">
            {biome.name} · {level?.meta.mission}
          </p>
          <p className="g-sub">{level?.meta.kicker}</p>
          <p>
            Data chips {c.got}/{c.total} · {hud.save.cleared.includes(focus) ? '★ Cleared' : 'Not cleared'}
          </p>
          {level?.meta.enemies && level.meta.enemies !== 'none' && <p className="g-sub">Hostiles: {level.meta.enemies.replace(/-/g, ' ')}</p>}
          {locked ? (
            <>
              <p className="g-warn">
                Locked — clear {need} missions to power the Comms Core ({clearedCount(portfolio, hud.save)}/{need}).
              </p>
              <button className="g-btn" onClick={() => game.travel('contact')}>
                Skip ahead anyway ▸
              </button>
            </>
          ) : (
            <button className="g-btn primary" onClick={() => game.travel(focus)} autoFocus>
              ▶ DEPLOY
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}

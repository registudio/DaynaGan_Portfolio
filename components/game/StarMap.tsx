'use client';

import { useState } from 'react';
import { biomeFor } from '@/game/engine/biomes';
import type { Game } from '@/game/engine/Game';
import { chips, clearedCount, contactUnlocked, MISSION_ORDER } from '@/game/engine/missions';
import type { Hud } from '@/game/engine/store';
import type { Biome } from '@/game/engine/biomes';
import type { LevelMap } from '@/game/engine/layout';
import { memo } from 'react';

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
  const [zoom, setZoom] = useState<string | null>(null);
  // Zoom the map into the chosen island, then deploy.
  const deploy = (id: string) => {
    if (zoom) return;
    if (hud.settings.reducedMotion) return game.travel(id);
    setZoom(id);
    setTimeout(() => game.travel(id), 620);
  };
  const zp = zoom ? iso(...POS[zoom]) : null;

  return (
    <div className="g-starmap">
      <div className="g-eyebrow">Station Hub · Star map</div>
      <h2>Choose a deployment</h2>
      <div className="g-map-wrap">
        <svg viewBox="-340 -230 680 470" className={`g-map${zoom ? ' zooming' : ''}`} role="list" aria-label="Missions">
          <g className="g-map-zoom" style={zp ? { transform: `scale(3.2) translate(${-zp.x}px, ${-zp.y}px)` } : undefined}>
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
                <IslandLayout map={game.levelPreview(id)} biome={b} locked={isLocked} focused={focus === id} />
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
          </g>
          <rect className="g-map-flash" x={-340} y={-230} width={680} height={470} fill={zoom ? biomeFor(portfolio.levels.find((l) => l.id === zoom)?.meta.biome).light : '#fff'} />
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
              <button className="g-btn" onClick={() => deploy('contact')}>
                Skip ahead anyway ▸
              </button>
            </>
          ) : (
            <button className="g-btn primary" onClick={() => deploy(focus)} autoFocus>
              ▶ DEPLOY
            </button>
          )}
          <button className="g-btn g-planet-btn" onClick={() => game.travel('planet')}>
            🌍 Planet Aurora — explore everything, no combat
          </button>
        </aside>
      </div>
    </div>
  );
}

const FLOOR = 1;
const WALL = 2;

/**
 * An isometric miniature of a mission's actual layout: terraces, walls, glowing paths and cliff
 * sides in the biome's colours, plus markers for the mini-boss, fabricators, the puzzle gate and
 * the portal home.
 */
const IslandLayout = memo(function IslandLayout({ map, biome, locked, focused }: { map: LevelMap; biome: Biome; locked: boolean; focused: boolean }) {
  let x0 = Infinity;
  let z0 = Infinity;
  let x1 = -Infinity;
  let z1 = -Infinity;
  map.cells.forEach((c, i) => {
    if (c.t === 0) return;
    const x = i % map.w;
    const z = Math.floor(i / map.w);
    x0 = Math.min(x0, x);
    z0 = Math.min(z0, z);
    x1 = Math.max(x1, x);
    z1 = Math.max(z1, z);
  });
  const W = x1 - x0 + 1;
  const D = z1 - z0 + 1;
  const k = 150 / (W + D);
  const cx = x0 + W / 2;
  const cz = z0 + D / 2;
  const P = (x: number, z: number, h: number) => [((x - cx) - (z - cz)) * k, ((x - cx) + (z - cz)) * k * 0.5 - h * k * 0.9] as const;
  const at = (x: number, z: number) => (x < 0 || z < 0 || x >= map.w || z >= map.d ? undefined : map.cells[z * map.w + x]);
  const grey = '#3f3f46';
  const col = (hex: string, f: number) => (locked ? grey : shade(hex, f));
  const paths = new Map<string, string[]>();
  const add = (fill: string, pts: (readonly [number, number])[]) => {
    const d = `M${pts.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join('L')}Z`;
    (paths.get(fill) ?? paths.set(fill, []).get(fill)!).push(d);
  };
  // Painter's order: back (low x+z) to front.
  const cells: { x: number; z: number; t: number; h: number; surf: string }[] = [];
  map.cells.forEach((c, i) => {
    if (c.t !== FLOOR && c.t !== WALL) return;
    cells.push({ x: i % map.w, z: Math.floor(i / map.w), t: c.t, h: c.h + (c.t === WALL ? 1.6 : 0), surf: c.surf });
  });
  cells.sort((a, b) => a.x + a.z - (b.x + b.z) || a.h - b.h);
  const DEPTH = 2.2;
  for (const c of cells) {
    const top = c.t === WALL ? col(biome.wall.color, 1.5) : c.surf === 'path' || c.surf === 'glow' ? (locked ? '#52525b' : biome.light) : col(c.surf === 'alt' ? biome.floorAlt.color : biome.floor.color, 1.9 + c.h * 0.08);
    const { x, z, h } = c;
    const ex = at(x + 1, z);
    const sz = at(x, z + 1);
    // Right (+x) and front (+z) faces down to the neighbour or the island base.
    const drop = (n: ReturnType<typeof at>) => (!n || n.t === 0 ? -DEPTH : n.h + (n.t === WALL ? 1.6 : 0));
    const dx = drop(ex);
    if (dx < h) add(col(c.t === WALL ? biome.wall.color : biome.cliff, c.t === WALL ? 1.0 : 1.3), [P(x + 1, z, h), P(x + 1, z + 1, h), P(x + 1, z + 1, dx), P(x + 1, z, dx)]);
    const dz = drop(sz);
    if (dz < h) add(col(c.t === WALL ? biome.wall.color : biome.cliff, c.t === WALL ? 0.75 : 0.9), [P(x, z + 1, h), P(x + 1, z + 1, h), P(x + 1, z + 1, dz), P(x, z + 1, dz)]);
    add(top, [P(x, z, h), P(x + 1, z, h), P(x + 1, z + 1, h), P(x, z + 1, h)]);
  }
  const marks = map.spawns.flatMap((s) => {
    if (s.kind !== 'boss' && s.kind !== 'spawner' && s.kind !== 'barrier' && s.kind !== 'home') return [];
    const c = at(Math.floor(s.x), Math.floor(s.z));
    const [mx, my] = P(s.x, s.z, (c?.h ?? 0) + 0.2);
    return [{ kind: s.kind, x: mx, y: my }];
  });
  return (
    <g className={`g-island${focused ? ' on' : ''}`}>
      <ellipse cx={0} cy={k * (W + D) * 0.28} rx={k * (W + D) * 0.42} ry={k * (W + D) * 0.12} fill="#000" opacity={0.35} />
      {[...paths.entries()].map(([fill, ds]) => (
        <path key={fill} d={ds.join('')} fill={fill} />
      ))}
      {marks.map((m, i) =>
        m.kind === 'boss' ? (
          <g key={i} transform={`translate(${m.x} ${m.y - 6})`}>
            <circle r={5} fill="#7f1d1d" stroke="#fca5a5" strokeWidth={1} />
            <text y={3} textAnchor="middle" fontSize={7} fill="#fecaca">☠</text>
          </g>
        ) : m.kind === 'spawner' ? (
          <rect key={i} x={m.x - 2.5} y={m.y - 5} width={5} height={5} fill="#f43f5e" transform={`rotate(45 ${m.x} ${m.y - 2.5})`} />
        ) : m.kind === 'barrier' ? (
          <rect key={i} x={m.x - 4} y={m.y - 3} width={8} height={3} fill="#ef4444" />
        ) : (
          <circle key={i} cx={m.x} cy={m.y - 1} r={3} fill="none" stroke="#fbbf24" strokeWidth={1.4} />
        ),
      )}
    </g>
  );
});

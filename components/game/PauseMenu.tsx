'use client';

import { useEffect, useState } from 'react';
import type { Game } from '@/game/engine/Game';
import { ACHIEVEMENTS, chips, GEAR, gearUnlocked, MISSION_ORDER } from '@/game/engine/missions';
import { partPanel, proAnchor, roomPanel } from '@/game/engine/panels';
import { DEFAULT_KEYS, type Action, type Hud } from '@/game/engine/store';
import { partKey, roomKey } from '@/lib/skills';
import SkillTree from './SkillTree';

const TABS = ['Codex', 'Skills', 'Gear', 'Achievements', 'Settings', 'Controls'] as const;
type Tab = (typeof TABS)[number];

const ACTION_LABELS: Record<Action, string> = {
  up: 'Move up',
  down: 'Move down',
  left: 'Move left',
  right: 'Move right',
  melee: 'Wrench (melee)',
  zap: 'Solder beam',
  dash: 'Dash',
  interact: 'Interact / scan',
  artifact1: 'Artifact 1 · Scanner',
  artifact2: 'Artifact 2 · EMP',
  artifact3: 'Artifact 3 · Repair',
  artifact4: 'Artifact 4 · Drone',
  pause: 'Pause',
};

export default function PauseMenu({ game, hud }: { game: Game; hud: Hud }) {
  const [tab, setTab] = useState<Tab>('Codex');
  return (
    <div className="g-modal">
      <div className="g-panel wide g-pause" role="dialog" aria-modal="true" aria-label="Paused">
        <div className="g-pause-head">
          <h2>PAUSED</h2>
          <div className="g-actions">
            <button className="g-btn primary" onClick={() => game.resume()} autoFocus>
              ▶ Resume
            </button>
            {hud.scene !== 'hub' && (
              <button className="g-btn" onClick={() => game.travel('hub')}>
                ⌂ Return to station
              </button>
            )}
            {hud.scene !== 'contact' && !hud.save.sent && (
              <button className="g-btn" onClick={() => game.travel('contact')}>
                ✉ Skip to Comms
              </button>
            )}
            <button className="g-btn" onClick={() => game.exit('pro')}>
              ☰ Professional mode
            </button>
          </div>
        </div>
        <nav className="g-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </nav>
        <div className="g-scroll g-tab-body">
          {tab === 'Codex' && <Codex game={game} hud={hud} />}
          {tab === 'Skills' && <SkillTree game={game} hud={hud} />}
          {tab === 'Gear' && <GearList hud={hud} game={game} />}
          {tab === 'Achievements' && (
            <ul className="g-ach">
              {ACHIEVEMENTS.map((a) => {
                const got = hud.save.achievements.includes(a.id);
                return (
                  <li key={a.id} className={got ? 'got' : ''}>
                    <b>{got ? '🏆' : '·'} {a.name}</b>
                    <span>{a.desc}</span>
                  </li>
                );
              })}
            </ul>
          )}
          {tab === 'Settings' && <SettingsTab game={game} hud={hud} />}
          {tab === 'Controls' && <ControlsTab game={game} hud={hud} />}
        </div>
      </div>
    </div>
  );
}

function Codex({ game, hud }: { game: Game; hud: Hud }) {
  const { portfolio } = game;
  const open = (levelId: string, roomId: string, partId?: string) => {
    const level = portfolio.levels.find((l) => l.id === levelId);
    const room = level?.rooms.find((r) => r.id === roomId);
    if (!room) return;
    const part = partId ? room.parts.find((p) => p.id === partId) : undefined;
    game.store.set({ menu: null, panel: part ? partPanel(portfolio, levelId, room, part) : roomPanel(portfolio, levelId, room, hud.save) });
  };
  return (
    <div className="g-codex">
      <p className="g-sub">Everything you&apos;ve scanned so far. Unscanned entries stay encrypted until you find them in-game — or read them all in Professional mode.</p>
      {MISSION_ORDER.map((id) => {
        const level = portfolio.levels.find((l) => l.id === id);
        if (!level) return null;
        const c = chips(portfolio, hud.save, id);
        return (
          <details key={id} open={id === hud.scene}>
            <summary>
              <b>{level.title}</b> <span>◆ {c.got}/{c.total}</span>{' '}
              <button
                className="g-link"
                onClick={(e) => {
                  e.preventDefault();
                  game.exit('pro', proAnchor(id));
                }}
              >
                Profile ↗
              </button>
            </summary>
            <ul>
              {level.rooms
                .filter((r) => r.id !== 'backroom' || hud.save.backroom)
                .map((room) => {
                  const rk = id === 'projects' ? `build:${room.id}` : roomKey(id, room.id);
                  const seen = id === 'projects' ? hud.save.built.includes(room.id) : hud.save.scanned.includes(rk);
                  return (
                    <li key={room.id}>
                      <button className={seen ? 'got' : ''} disabled={!seen} onClick={() => open(id, room.id)}>
                        {seen ? '◆' : '◇'} {seen ? room.title : '▒▒▒▒▒▒▒▒'}
                      </button>
                      {room.parts.length > 0 && (
                        <ul>
                          {room.parts
                            .filter((p) => !p.todo || p.body)
                            .map((part) => {
                              const got = hud.save.scanned.includes(partKey(id, room.id, part.id));
                              return (
                                <li key={part.id}>
                                  <button className={got ? 'got' : ''} disabled={!got} onClick={() => open(id, room.id, part.id)}>
                                    {got ? '◆' : '◇'} {got ? part.title : '▒▒▒▒▒'}
                                  </button>
                                </li>
                              );
                            })}
                        </ul>
                      )}
                    </li>
                  );
                })}
            </ul>
          </details>
        );
      })}
    </div>
  );
}

function GearList({ game, hud }: { game: Game; hud: Hud }) {
  const got = new Set(gearUnlocked(hud.save).map((g) => g.id));
  return (
    <ul className="g-ach">
      {GEAR.map((g) => {
        const from = game.portfolio.levels.find((l) => l.id === g.from);
        return (
          <li key={g.id} className={got.has(g.id) ? 'got' : ''}>
            <b>
              {got.has(g.id) ? '◆' : '◇'} {g.name} {g.slot ? `· slot ${g.slot}` : ''}
            </b>
            <span>
              {g.desc}
              {got.has(g.id) ? '' : ` — clear ${from?.title ?? g.from} to unlock`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function SettingsTab({ game, hud }: { game: Game; hud: Hud }) {
  const s = hud.settings;
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="g-settings">
      <label>
        <input type="checkbox" checked={!s.muted} onChange={(e) => game.setSettings({ muted: !e.target.checked })} /> Sound on
      </label>
      <label>
        Music <input type="range" min={0} max={1} step={0.05} value={s.music} onChange={(e) => game.setSettings({ music: Number(e.target.value) })} />
      </label>
      <label>
        Effects <input type="range" min={0} max={1} step={0.05} value={s.sfx} onChange={(e) => game.setSettings({ sfx: Number(e.target.value) })} />
      </label>
      <label>
        <input type="checkbox" checked={s.peaceful} onChange={(e) => game.setSettings({ peaceful: e.target.checked })} /> Peaceful mode (no bots)
      </label>
      <label>
        <input type="checkbox" checked={s.reducedMotion} onChange={(e) => game.setSettings({ reducedMotion: e.target.checked })} /> Reduce motion & screen shake
      </label>
      <label>
        <input type="checkbox" checked={s.largeText} onChange={(e) => game.setSettings({ largeText: e.target.checked })} /> Larger text
      </label>
      <label>
        Graphics
        <select value={s.quality} onChange={(e) => game.setSettings({ quality: e.target.value as 'auto' })}>
          <option value="auto">Auto</option>
          <option value="high">High (shadows)</option>
          <option value="low">Low (faster)</option>
        </select>
        <small> applies next time the game starts</small>
      </label>
      <div className="g-actions">
        {!confirm ? (
          <button className="g-btn" onClick={() => setConfirm(true)}>
            Reset progress…
          </button>
        ) : (
          <>
            <span className="g-warn">Erase all progress?</span>
            <button className="g-btn danger" onClick={() => game.resetProgress()}>
              Yes, reset
            </button>
            <button className="g-btn" onClick={() => setConfirm(false)}>
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ControlsTab({ game, hud }: { game: Game; hud: Hud }) {
  const [listening, setListening] = useState<Action | null>(null);
  useEffect(() => {
    if (!listening) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code !== 'Escape') game.setSettings({ keys: { ...hud.settings.keys, [listening]: [e.code] } });
      setListening(null);
    };
    addEventListener('keydown', onKey, true);
    return () => removeEventListener('keydown', onKey, true);
  }, [listening, game, hud.settings.keys]);
  return (
    <div className="g-controls">
      <p className="g-sub">Mouse: left click = wrench, right click = solder beam (aims at the cursor). Gamepad: left stick, A interact, X melee, B/RT beam, LB dash, D-pad artifacts, Start pause.</p>
      <table>
        <tbody>
          {(Object.keys(ACTION_LABELS) as Action[]).map((a) => (
            <tr key={a}>
              <td>{ACTION_LABELS[a]}</td>
              <td>
                <button className="g-key" onClick={() => setListening(a)}>
                  {listening === a ? 'Press a key…' : hud.settings.keys[a].join(' / ')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="g-btn" onClick={() => game.setSettings({ keys: DEFAULT_KEYS })}>
        Restore defaults
      </button>
    </div>
  );
}

'use client';

import { useEffect, useRef } from 'react';
import type { Game } from '@/game/engine/Game';
import { GEAR, gearUnlocked } from '@/game/engine/missions';
import type { Hud } from '@/game/engine/store';
import Hotbar from './Hotbar';

const keyName = (code?: string) =>
  !code ? '' : code.replace(/^Key/, '').replace(/^Digit/, '').replace('ShiftLeft', 'Shift').replace('Escape', 'Esc').replace('Space', '␣');

export default function HudView({ game, hud }: { game: Game; hud: Hud }) {
  const mini = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    game.setMinimap(mini.current);
    return () => game.setMinimap(null);
  }, [game]);
  const site = game.portfolio.site;
  const unlocked = new Set(gearUnlocked(hud.save).map((g) => g.id));
  const hpPct = Math.max(0, hud.hp / hud.maxHp);
  const keys = hud.settings.keys;

  return (
    <div className={`g-hud${hud.panel || hud.menu ? ' dim' : ''}`}>
      {/* Top-left: mission + data chips */}
      <div className="g-top-left">
        <div className="g-mission">{hud.sceneTitle}</div>
        {hud.chips && (
          <div className="g-chipcount" title="Data chips collected">
            ◆ {hud.chips.got}/{hud.chips.total}
          </div>
        )}
      </div>

      {/* Top-right: links, controls, minimap, objective */}
      <div className="g-top-right">
        <div className="g-links">
          <a href={site.linkedin} target="_blank" rel="noopener noreferrer" title="LinkedIn">in</a>
          <a href={site.github} target="_blank" rel="noopener noreferrer" title="GitHub">gh</a>
          <a href={`mailto:${site.email}`} title="Email">✉</a>
          <a href={site.resume} target="_blank" rel="noopener noreferrer" title="Résumé">CV</a>
          <button onClick={() => game.setSettings({ muted: !hud.settings.muted })} title={hud.settings.muted ? 'Unmute' : 'Mute'} aria-label={hud.settings.muted ? 'Unmute' : 'Mute'}>
            {hud.settings.muted ? '🔇' : '🔊'}
          </button>
          <button onClick={() => game.togglePause()} title="Pause (Esc)" aria-label="Pause">
            ❚❚
          </button>
          <button className="g-pro" onClick={() => game.exit('pro')} title="Switch to Professional mode">
            <span className="full">Professional Mode</span>
            <span className="short">Pro</span>
          </button>
        </div>
        <canvas ref={mini} className="g-minimap" width={300} height={300} aria-label="Minimap" />
        <details className="g-map-legend">
          <summary>
            Map key · <b>height {hud.navigation?.height ?? 0}</b>
          </summary>
          ◆ collectible · ○ console · ↗ exit · ! bot · F fabricator
          <br />
          lighter = higher · ▲▼ above/below you
          <br />
          dotted edge = stairs · thick dark edge = ledge
        </details>
        {hud.objective && (
          <div className={`g-objective${hud.objective.done ? ' done' : ''}`}>
            <b>◆ {hud.objective.mission}</b>
            <span>{hud.objective.text}</span>
          </div>
        )}
        {hud.navigation && <div className="g-next-step"><small>{hud.save.trackedProject?'PINNED BLUEPRINT':'NEXT NEARBY'}</small><b>{hud.navigation.text}</b><span>{hud.navigation.bearing}</span>{hud.save.trackedProject&&<button onClick={()=>game.trackProject(null)}>Unpin</button>}</div>}
      </div>

      {/* Toasts */}
      <div className="g-toasts" aria-live="polite">
        {hud.toasts.map((t) => (
          <div key={t.id} className={`g-toast ${t.kind}`}>
            {t.text}
          </div>
        ))}
      </div>

      {/* Recovered-part card */}
      {hud.card && (
        <div className="g-card" key={hud.card.id}>
          <small>{hud.card.eyebrow}</small>
          <b>{hud.card.title}</b>
          <div dangerouslySetInnerHTML={{ __html: hud.card.html }} />
        </div>
      )}

      {hud.boss && !hud.banner && (
        <div className="g-bossplate" key={hud.boss.name}>
          <b>{hud.boss.name.toUpperCase()}</b>
          <span>{hud.boss.title}</span>
        </div>
      )}

      {hud.assembly && (
        <div className={`g-assembly ${hud.assembly.state}`} role="status">
          <div className="g-assembly-head">
            <b>ASSEMBLING · {hud.assembly.title}</b>
            <span>
              {hud.assembly.overclock && hud.assembly.state === 'ok' ? '⚡ ' : ''}
              {hud.assembly.state === 'ok' ? `${hud.assembly.left}s` : hud.assembly.state === 'jammed' ? 'JAMMED' : hud.assembly.state === 'fault' ? 'POWER FAULT' : 'PAUSED'}
            </span>
          </div>
          <div className="g-assembly-bar">
            <i style={{ transform: `scaleX(${hud.assembly.p / 100})` }} />
          </div>
          <small>
            {hud.assembly.state === 'fault'
              ? 'Reset the tripped breaker in the vault to restore power.'
              : hud.assembly.state === 'jammed'
                ? 'Bots on the station — knock them off!'
                : hud.assembly.state === 'away'
                  ? 'Get back to the vault to keep building.'
                  : hud.assembly.relay
                    ? 'Relay fabricator active — destroy it to slow the waves.'
                    : hud.assembly.overclock
                      ? 'Overclocked — faster build, heavier waves. E at the station to stop.'
                      : 'Hold the line · E at the station to overclock.'}
          </small>
        </div>
      )}

      {hud.area && !hud.banner && !hud.boss && !hud.assembly && (
        <div className="g-area" key={hud.area.id}>
          {hud.area.eyebrow && <small>{hud.area.eyebrow}</small>}
          <b>{hud.area.title}</b>
          {hud.area.sub && <span>{hud.area.sub}</span>}
        </div>
      )}

      {hud.banner && (
        <div className="g-banner" key={hud.banner.id}>
          <b>{hud.banner.title}</b>
          <span>{hud.banner.sub}</span>
        </div>
      )}

      {/* Interaction prompt */}
      {hud.prompt && !hud.panel && (
        <button className="g-prompt" onClick={() => game.input.press('interact')}>
          <kbd>{hud.device === 'touch' ? 'TAP' : hud.device === 'gamepad' ? 'Ⓐ' : keyName(keys.interact[0])}</kbd> {hud.prompt.verb} · {hud.prompt.label}
        </button>
      )}

      {hud.tour && (
        <div className="g-tourbar" role="group" aria-label="Tour controls">
          <span className="g-tour-step">
            TOUR {hud.tour.step}/{hud.tour.total}
          </span>
          <span className="g-tour-label">{hud.tour.label}</span>
          <button onClick={() => game.tourNext(-1)} aria-label="Previous stop">
            ◀
          </button>
          <button onClick={() => game.tourTogglePause()} aria-label="Pause or resume tour">
            {hud.tour.label.endsWith('paused') ? '▶' : '❚❚'}
          </button>
          <button onClick={() => game.tourNext(1)} aria-label="Next stop">
            ▶▶
          </button>
          <button className="exit" onClick={() => game.stopTour()}>
            Exit tour
          </button>
        </div>
      )}

      <Hotbar game={game} />
      {hud.dead && <div className="g-dead">SUIT OFFLINE</div>}
    </div>
  );
}


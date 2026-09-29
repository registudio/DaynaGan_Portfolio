'use client';

import { useEffect, useRef } from 'react';
import type { Game } from '@/game/engine/Game';
import { GEAR, gearUnlocked } from '@/game/engine/missions';
import type { Hud } from '@/game/engine/store';
import PixelIcon from './PixelIcon';

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
            ☰ Profile
          </button>
        </div>
        <canvas ref={mini} className="g-minimap" width={300} height={300} aria-label="Minimap" />
        {hud.objective && (
          <div className={`g-objective${hud.objective.done ? ' done' : ''}`}>
            <b>◆ {hud.objective.mission}</b>
            <span>{hud.objective.text}</span>
          </div>
        )}
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

      {hud.banner && (
        <div className="g-banner" key={hud.banner.id}>
          <b>{hud.banner.title}</b>
          <span>{hud.banner.sub}</span>
        </div>
      )}

      {/* Interaction prompt */}
      {hud.prompt && !hud.panel && (
        <button className="g-prompt" onClick={() => game.input.press('interact')}>
          <kbd>{hud.touch ? 'TAP' : keyName(keys.interact[0])}</kbd> {hud.prompt.verb} · {hud.prompt.label}
        </button>
      )}

      {/* Hotbar */}
      <div className="g-hotbar">
        <div className="g-slot" title="Wrench (melee)">
          <span className="g-ico"><PixelIcon name="wrench" /></span>
          <kbd>{hud.touch ? '' : 'LMB'}</kbd>
        </div>
        <div className="g-slot" title="Solder beam">
          <span className="g-ico"><PixelIcon name="bolt" /></span>
          <kbd>{hud.touch ? '' : 'RMB'}</kbd>
        </div>
        <div className={`g-slot${unlocked.has('dash') ? '' : ' locked'}`} title="Servo Boots — dash">
          <span className="g-ico"><PixelIcon name={unlocked.has('dash') ? 'boot' : 'lock'} /></span>
          <Cooldown v={hud.cooldowns.dash} />
          <kbd>{hud.touch ? '' : keyName(keys.dash[0])}</kbd>
        </div>
        <div className="g-heart" title={`Health ${hud.hp}/${hud.maxHp}`}>
          <svg viewBox="0 0 16 14" aria-hidden>
            <defs>
              <clipPath id="hp-clip">
                <rect x="0" y={14 - 14 * hpPct} width="16" height={14 * hpPct} />
              </clipPath>
            </defs>
            <path d="M2 0h4v2h4V0h4v2h2v6h-2v2h-2v2h-2v2H6v-2H4v-2H2V8H0V2h2z" fill="#3b0d1a" />
            <path d="M2 0h4v2h4V0h4v2h2v6h-2v2h-2v2h-2v2H6v-2H4v-2H2V8H0V2h2z" fill="#f43f5e" clipPath="url(#hp-clip)" />
            <path d="M3 2h2v2H3z" fill="#fecdd3" />
          </svg>
          <span>
            {hud.hp}/{hud.maxHp}
          </span>
        </div>
        <button className="g-slot" title="Xiao Hu — pounce on a bot / fetch a part" onClick={() => game.catAbility()}>
          <span className="g-ico">
            <PixelIcon name="cat" />
          </span>
          <Cooldown v={hud.cooldowns.cat} />
          <kbd>{hud.touch ? '' : keyName(keys.cat?.[0])}</kbd>
        </button>
        {GEAR.filter((g) => g.slot).map((g) => (
          <button
            key={g.id}
            className={`g-slot${unlocked.has(g.id) ? '' : ' locked'}`}
            title={`${g.name} — ${g.desc}${unlocked.has(g.id) ? '' : ' (locked)'}`}
            onClick={() => game.input.press(`artifact${g.slot}` as 'artifact1')}
          >
            <span className="g-ico"><PixelIcon name={unlocked.has(g.id) ? g.id : 'lock'} /></span>
            <Cooldown v={hud.cooldowns[g.id]} />
            <kbd>{hud.touch ? '' : g.slot}</kbd>
          </button>
        ))}
      </div>
      {hud.dead && <div className="g-dead">SUIT OFFLINE</div>}
    </div>
  );
}

function Cooldown({ v }: { v?: number }) {
  if (!v) return null;
  return <i className="g-cd" style={{ height: `${Math.round(v * 100)}%` }} />;
}

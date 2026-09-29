'use client';

import { useMemo } from 'react';
import type { Game } from '@/game/engine/Game';
import type { Hud } from '@/game/engine/store';
import { computeSkills, skillSources } from '@/lib/skills';

/** Current skill levels with every source, ticked when earned. */
export default function SkillTree({ game, hud }: { game: Game; hud: Hud }) {
  const { portfolio } = game;
  const levels = useMemo(
    () => computeSkills(portfolio, { scanned: hud.save.scanned, built: hud.save.built }),
    [portfolio, hud.save.scanned, hud.save.built],
  );
  const sources = useMemo(() => skillSources(portfolio), [portfolio]);
  const done = new Set([...hud.save.scanned, ...hud.save.built.map((b) => `build:${b}`)]);
  const groups = [...new Set(portfolio.site.skills.map((s) => s.group))];
  return (
    <div className="g-skills">
      {groups.map((g) => (
        <section key={g}>
          <h3>{g}</h3>
          {portfolio.site.skills
            .filter((s) => s.group === g)
            .map((s) => (
              <div className="g-skill" key={s.id}>
                <div className="g-skill-row">
                  <span>{s.name}</span>
                  <span className="g-pips" aria-label={`Level ${levels[s.id]} of ${s.max}`}>
                    {Array.from({ length: s.max }, (_, i) => (
                      <i key={i} className={i < levels[s.id] ? 'on' : ''} />
                    ))}
                    <b>Lv {levels[s.id]}</b>
                  </span>
                </div>
                <ul>
                  {sources
                    .filter((src) => src.skill === s.id)
                    .map((src) => (
                      <li key={src.key + src.skill} className={done.has(src.key) ? 'got' : ''}>
                        {done.has(src.key) ? '◆' : '◇'} {src.key.startsWith('build:') ? `Build ${src.label}` : src.label}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
        </section>
      ))}
    </div>
  );
}

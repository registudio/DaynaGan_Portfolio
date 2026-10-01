'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { squarify } from '@/lib/treemap';
import Modal from './Modal';

export type SkillUse = { section: string; title: string; detail: string[]; period?: string };
export type SkillTile = {
  id: string;
  name: string;
  group: string;
  level: number;
  max: number;
  /** 0 = software … 1 = hardware; null = people skill. */
  axis: number | null;
  used: SkillUse[];
  related: string[];
};

const WORDS = ['Familiar', 'Familiar', 'Working knowledge', 'Proficient', 'Advanced', 'Expert'];
export const levelWord = (l: number) => WORDS[Math.max(0, Math.min(5, l))];
const kind = (axis: number | null) =>
  axis == null ? 'People' : axis < 0.25 ? 'Software' : axis > 0.75 ? 'Hardware' : 'Software + hardware';

/**
 * Interactive treemap: tile area = proficiency, colour = where the skill sits between pure
 * software (violet) and pure hardware (amber); people skills are teal. Click a tile for where
 * it was used and related skills.
 */
export default function SkillMap({ skills }: { skills: SkillTile[] }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1000, h: 560 });
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      // Taller on phones so small tiles keep a usable size.
      setSize({ w, h: w < 600 ? Math.round(w * 1.7) : Math.round(Math.max(420, Math.min(620, w * 0.52))) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Area grows a little faster than level so the differences read at a glance (flatter on
  // phones, where the smallest tiles would otherwise be too narrow for their names).
  const rects = useMemo(
    () => squarify(skills.map((s) => ({ id: s.id, value: Math.max(1, s.level) ** (size.w < 600 ? 1 : 1.35) })), size.w, size.h),
    [skills, size],
  );
  const byId = useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills]);
  const sel = open ? byId.get(open) : null;

  return (
    <div className="skillmap" data-reveal>
      <div className="skillmap-legend" aria-hidden>
        <span className="mono">Software</span>
        <i className="axis-bar" />
        <span className="mono">Hardware</span>
        <span className="legend-people">
          <i /> <span className="mono">People</span>
        </span>
        <span className="mono legend-size">Tile size = proficiency</span>
      </div>
      <div className="skillmap-box" ref={box} style={{ height: size.h }} role="group" aria-label="Skills — select one for details">
        {rects.map((r, i) => {
          const s = byId.get(r.id)!;
          const area = r.w * r.h;
          // Text size follows area, capped by width so long names never spill out of narrow tiles.
          const byArea = area > 60000 ? 3 : area > 30000 ? 2 : area > 14000 ? 1 : 0;
          const byWidth = r.w > 240 ? 3 : r.w > 190 ? 2 : r.w > 150 ? 1 : 0;
          const tier = ['s', 'm', 'l', 'xl'][Math.min(byArea, byWidth)];
          // Tall slivers set their label vertically; every label shrinks to fit its longest word.
          const tall = r.h > r.w * 2.2 && r.w < 90;
          const pad = size.w < 600 || tier === 's' ? 10 : 18;
          // The level line and meter only where there's room for them.
          const bare = tall || r.w < 110 || r.h < 100;
          const longest = Math.max(...s.name.split(/\s+/).map((x) => x.length));
          const fit = ((tall ? r.h : r.w) - 6 - pad * 2) / (longest * 0.58);
          return (
            <button
              key={r.id}
              className={`tile tile-${tier}${tall ? ' tall' : ''}${bare ? ' bare' : ''}${s.axis == null ? ' people' : ''}`}
              style={
                {
                  left: r.x,
                  top: r.y,
                  width: r.w,
                  height: r.h,
                  '--t': s.axis ?? 0,
                  '--i': i,
                  '--fit': `${Math.max(10, fit).toFixed(1)}px`,
                } as React.CSSProperties
              }
              onClick={() => setOpen(s.id)}
              aria-label={`${s.name}: ${levelWord(s.level)}. Show where it was used.`}
            >
              <span className="tile-inner">
                <span className="tile-name">{s.name}</span>
                <span className="tile-level">{levelWord(s.level)}</span>
                <span className="tile-meter" aria-hidden>
                  <i style={{ width: `${(s.level / s.max) * 100}%` }} />
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <Modal open={!!sel} onClose={() => setOpen(null)} label={sel ? `${sel.name} — details` : 'Skill'}>
        {sel && (
          <div className="skill-card" style={{ '--t': sel.axis ?? 0 } as React.CSSProperties}>
            <span className={`skill-kind mono${sel.axis == null ? ' people' : ''}`}>{kind(sel.axis)}</span>
            <h3>{sel.name}</h3>
            <div className="skill-card-level">
              <b>{levelWord(sel.level)}</b>
              <span className="tile-meter big" aria-label={`Level ${sel.level} of ${sel.max}`}>
                <i style={{ width: `${(sel.level / sel.max) * 100}%` }} />
              </span>
            </div>
            {sel.used.length > 0 && (
              <>
                <h4>Where it was used</h4>
                <ul className="used-list">
                  {sel.used.map((u) => (
                    <li key={u.section + u.title}>
                      <span className="mono used-section">{u.section}</span>
                      <b>{u.title}</b>
                      {u.period && <span className="muted small"> · {u.period}</span>}
                      {u.detail.length > 0 && <span className="used-detail">{u.detail.join(' · ')}</span>}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {sel.related.length > 0 && (
              <>
                <h4>Related skills</h4>
                <div className="chips">
                  {sel.related
                    .map((id) => byId.get(id))
                    .filter(Boolean)
                    .map((r) => (
                      <button key={r!.id} className="chip chip-btn" onClick={() => setOpen(r!.id)}>
                        {r!.name}
                      </button>
                    ))}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

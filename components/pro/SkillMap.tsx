'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { squarify } from '@/lib/treemap';
import Modal from './Modal';
import { goTo } from './goTo';

export type SkillUse = { section: string; title: string; detail: string[]; period?: string; href?: string };
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

/** One muted hue per category (no rainbow): depth varies a little with proficiency. */
const PALETTE = ['#6d28d9', '#4338ca', '#0e7490', '#a16207', '#9d174d', '#475569'];
const HEAD = 30; // category header band

/**
 * Categorised treemap: each category is a block sized by its skills' total proficiency, with a
 * header band; inside, tile area = proficiency. Click a tile for where the skill was used and
 * related skills.
 */
export default function SkillMap({ skills }: { skills: SkillTile[] }) {
  const box = useRef<HTMLDivElement>(null);
  // Unmeasured until mounted: tiles are only laid out once the real width is known (a
  // server-side guess wider than a phone widened the whole page before hydration).
  const [size, setSize] = useState({ w: 0, h: 560 });
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      // Taller on phones, where categories stack.
      setSize({ w, h: w < 600 ? Math.round(w * 2.1) : Math.round(Math.max(460, Math.min(640, w * 0.54))) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const phone = size.w < 600;
  const weight = (s: SkillTile) => Math.max(1, s.level) ** (phone ? 1 : 1.35);
  const groups = useMemo(() => {
    const names = [...new Set(skills.map((s) => s.group))];
    return names.map((name, gi) => {
      const items = skills.filter((s) => s.group === name);
      return { name, color: PALETTE[gi % PALETTE.length], items, value: items.reduce((a, s) => a + weight(s), 0) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skills, phone]);

  const layout = useMemo(() => {
    const total = groups.reduce((a, g) => a + g.value, 0);
    let y = 0;
    // Phones stack the categories full width; wider screens tile them.
    const outer = phone
      ? groups.map((g) => {
          const h = (g.value / total) * size.h;
          const r = { id: g.name, x: 0, y, w: size.w, h };
          y += h;
          return r;
        })
      : squarify(groups.map((g) => ({ id: g.name, value: g.value })), size.w, size.h);
    return outer.map((r) => {
      const g = groups.find((x) => x.name === r.id)!;
      const inner = squarify(
        g.items.map((s) => ({ id: s.id, value: weight(s) })),
        Math.max(1, r.w - 6),
        Math.max(1, r.h - HEAD - 6),
      );
      return { ...r, g, inner };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, size, phone]);

  const byId = useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills]);
  const colorOf = useMemo(() => new Map(groups.flatMap((g) => g.items.map((s) => [s.id, g.color] as const))), [groups]);
  const sel = open ? byId.get(open) : null;

  return (
    <div className="skillmap" data-reveal>
      <div className="skillmap-legend" aria-hidden>
        <span className="mono legend-size">Tile size = proficiency</span>
      </div>
      <div className="skillmap-box" ref={box} style={{ height: size.h }} role="group" aria-label="Skills by category — select one for details">
        {size.w > 0 && layout.map(({ g, x, y, w, h, inner }, gi) => (
          <div
            key={g.name}
            className="skill-cat"
            style={{ left: x, top: y, width: w, height: h, '--c': g.color, '--gi': gi } as React.CSSProperties}
          >
            <div className="skill-cat-head">
              <span>{g.name}</span>
              <span className="mono">{g.items.length}</span>
            </div>
            {inner.map((r, i) => {
              const s = byId.get(r.id)!;
              const area = r.w * r.h;
              // Text size follows area, capped by width so long names never spill out of narrow tiles.
              const byArea = area > 60000 ? 3 : area > 30000 ? 2 : area > 14000 ? 1 : 0;
              const byWidth = r.w > 240 ? 3 : r.w > 190 ? 2 : r.w > 150 ? 1 : 0;
              const tier = ['s', 'm', 'l', 'xl'][Math.min(byArea, byWidth)];
              // Tall slivers set their label vertically; every label shrinks to fit its longest word.
              const tall = r.h > r.w * 2.2 && r.w < 90;
              const pad = phone || tier === 's' ? 10 : 18;
              const bare = tall || r.w < 110 || r.h < 100;
              const longest = Math.max(...s.name.split(/\s+/).map((x) => x.length));
              const fit = ((tall ? r.h : r.w) - 6 - pad * 2) / (longest * 0.58);
              return (
                <button
                  key={r.id}
                  className={`tile tile-${tier}${tall ? ' tall' : ''}${bare ? ' bare' : ''}`}
                  style={
                    {
                      left: r.x + 3,
                      top: r.y + HEAD + 3,
                      width: r.w,
                      height: r.h,
                      '--k': s.level / s.max,
                      '--i': i,
                      '--fit': `${Math.max(10, fit).toFixed(1)}px`,
                    } as React.CSSProperties
                  }
                  onClick={() => setOpen(s.id)}
                  aria-label={`${s.name} (${g.name}): ${levelWord(s.level)}. Show where it was used.`}
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
        ))}
      </div>

      <Modal open={!!sel} onClose={() => setOpen(null)} label={sel ? `${sel.name} — details` : 'Skill'}>
        {sel && (
          <div className="skill-card" style={{ '--c': colorOf.get(sel.id) } as React.CSSProperties}>
            <span className="skill-kind mono">
              {sel.group} · {kind(sel.axis)}
            </span>
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
                      {/* Opens that role / project / school where it rests on the page. */}
                      <button
                        className="used-link"
                        onClick={() => {
                          setOpen(null);
                          if (u.href) setTimeout(() => goTo(u.href!), 60);
                        }}
                      >
                        <span className="mono used-section">{u.section}</span>
                        <b>{u.title}</b>
                        {u.period && <span className="muted small"> · {u.period}</span>}
                        {u.detail.length > 0 && <span className="used-detail">{u.detail.join(' · ')}</span>}
                        <span className="used-go" aria-hidden>
                          View →
                        </span>
                      </button>
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

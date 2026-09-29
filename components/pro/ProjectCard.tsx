'use client';

import { useEffect, useState } from 'react';
import { list, parseRequires, type Room, type SkillDef } from '@/lib/portfolio';
import ModelViewer from '../ModelViewer';

export default function ProjectCard({ room, anchor, skills }: { room: Room; anchor: string; skills: SkillDef[] }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const wip = room.meta.status === 'in-progress';

  // Open when linked to directly (e.g. "Project file →" from Experience).
  useEffect(() => {
    const check = () => {
      if (location.hash === `#${anchor}`) setOpen(true);
    };
    check();
    addEventListener('hashchange', check);
    return () => removeEventListener('hashchange', check);
  }, [anchor]);

  const [summary, ...rest] = (room.html ?? '').split(/(?<=<\/p>)\n?/);
  const skillName = (id: string) => skills.find((s) => s.id === id)?.name ?? id;

  return (
    <article id={anchor} className={`card project${open ? ' open' : ''}`} data-reveal>
      <div className="project-top">
        <h3>{room.title}</h3>
        <span className={`badge${wip ? ' wip' : ''}`}>{wip ? 'In progress' : room.meta.year || 'Complete'}</span>
      </div>
      <div className="prose" dangerouslySetInnerHTML={{ __html: summary }} />
      <ul className="chips">
        {list(room.meta.tags).map((t) => (
          <li className="chip" key={t}>
            {t}
          </li>
        ))}
      </ul>
      <div>
        <button className="btn small no-print" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? '− Close' : '+ Take it apart'}
        </button>
      </div>
      {open && (
        <div className="project-body">
          <div>
            {rest.join('') && <div className="prose" dangerouslySetInnerHTML={{ __html: rest.join('') }} />}
            {room.meta.requires && (
              <p className="muted" style={{ fontSize: 14 }}>
                Built with {parseRequires(room.meta.requires).map((r) => skillName(r.skill)).join(', ')}
              </p>
            )}
            <ul className="parts">
              {room.parts.map((p) => (
                <li
                  key={p.id}
                  className={active === p.id ? 'active' : ''}
                  onMouseEnter={() => setActive(p.id)}
                  onMouseLeave={() => setActive(null)}
                >
                  <b>{p.title}</b>
                  {p.html && <div dangerouslySetInnerHTML={{ __html: p.html }} />}
                  {p.meta.did && <p className="did">{p.meta.did}</p>}
                  {p.meta.learned && <p className="learned">{p.meta.learned}</p>}
                </li>
              ))}
            </ul>
          </div>
          <ModelViewer
            projectId={room.id}
            active={active}
            onHover={setActive}
            labels={Object.fromEntries(room.parts.map((p) => [p.id, p.title]))}
          />
        </div>
      )}
    </article>
  );
}

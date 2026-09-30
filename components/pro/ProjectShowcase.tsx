'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ProjectViewer from './ProjectViewer';

export type ShowcaseProject = {
  id: string;
  title: string;
  status: 'complete' | 'in-progress';
  year?: string;
  summary: string;
  body: string;
  tags: string[];
  skills: string[];
  /** Skill names the build exercises (for filtering). */
  uses: string[];
  repo?: string;
  demo?: string;
  parts: { id: string; title: string; html: string; did?: string; learned?: string }[];
};

export const FILTER_EVENT = 'pro:filter';

/** Ask the Projects showcase to filter by a tech/skill (from Skills, Experience chips…). */
export function filterProjects(value: string) {
  dispatchEvent(new CustomEvent(FILTER_EVENT, { detail: value }));
  document.getElementById('projects')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

const matches = (p: ShowcaseProject, f: string) => {
  const q = f.toLowerCase();
  return [...p.tags, ...p.skills, ...p.uses].some((t) => t.toLowerCase() === q || t.toLowerCase().includes(q));
};

/**
 * Pinned project stage: the 3D viewer stays put while each project's story scrolls past it,
 * one project per scroll step. Filter chips narrow the list by tech or skill.
 */
export default function ProjectShowcase({
  projects,
  filters,
  cad,
}: {
  projects: ShowcaseProject[];
  filters: string[];
  cad: Record<string, string>;
}) {
  const [filter, setFilter] = useState<string | null>(null);
  const shown = useMemo(() => (filter ? projects.filter((p) => matches(p, filter)) : projects), [projects, filter]);
  const [active, setActive] = useState<string | undefined>(projects[0]?.id);
  const [part, setPart] = useState<string | null>(null);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const on = (e: Event) => {
      const v = (e as CustomEvent<string>).detail;
      setFilter(projects.some((p) => matches(p, v)) ? v : null);
    };
    const hash = () => {
      const id = location.hash.replace('#projects-', '');
      if (projects.some((p) => p.id === id)) {
        setFilter(null);
        setActive(id);
      }
    };
    addEventListener(FILTER_EVENT, on);
    addEventListener('hashchange', hash);
    hash();
    return () => {
      removeEventListener(FILTER_EVENT, on);
      removeEventListener('hashchange', hash);
    };
  }, [projects]);

  // The article crossing the middle of the viewport is the one on stage.
  useEffect(() => {
    const els = [...(list.current?.querySelectorAll<HTMLElement>('.show-item') ?? [])];
    if (!els.length) return;
    if (!shown.some((p) => p.id === active)) setActive(shown[0]?.id);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive((e.target as HTMLElement).dataset.id);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [shown, active]);

  const current = shown.find((p) => p.id === active) ?? shown[0];
  const index = current ? shown.indexOf(current) : 0;
  return (
    <div className="showcase">
      <div className="filter-bar" role="toolbar" aria-label="Filter projects">
        <button className="fchip" aria-pressed={!filter} onClick={() => setFilter(null)}>
          All <span>{projects.length}</span>
        </button>
        {filters.map((f) => (
          <button key={f} className="fchip" aria-pressed={filter === f} onClick={() => setFilter(filter === f ? null : f)}>
            {f} <span>{projects.filter((p) => matches(p, f)).length}</span>
          </button>
        ))}
        {filter && !filters.includes(filter) && (
          <button className="fchip" aria-pressed onClick={() => setFilter(null)}>
            {filter} ×
          </button>
        )}
      </div>
      <div className="show-grid">
        <div className="show-list" ref={list}>
          {shown.map((p, i) => (
            <article
              key={p.id}
              id={`projects-${p.id}`}
              data-id={p.id}
              className={`show-item${p.id === current?.id ? ' on' : ''}`}
            >
              <div className="show-meta">
                <span className="mono">{String(i + 1).padStart(2, '0')} / {String(shown.length).padStart(2, '0')}</span>
                <span className={`badge${p.status === 'in-progress' ? ' wip' : ''}`}>
                  {p.status === 'in-progress' ? '● In progress' : `✓ Complete${p.year ? ` · ${p.year}` : ''}`}
                </span>
              </div>
              <h3>{p.title}</h3>
              <div className="prose lead" dangerouslySetInnerHTML={{ __html: p.summary }} />
              {p.body && <div className="prose" dangerouslySetInnerHTML={{ __html: p.body }} />}
              <ul className="chips">
                {p.tags.map((t) => (
                  <li key={t}>
                    <button className="chip chip-btn" onClick={() => setFilter(t)}>
                      {t}
                    </button>
                  </li>
                ))}
              </ul>
              {p.skills.length > 0 && <p className="muted small">Built with {p.skills.join(', ')}</p>}
              <ol className="parts">
                {p.parts.map((pt) => (
                  <li
                    key={pt.id}
                    className={p.id === current?.id && part === pt.id ? 'active' : ''}
                    onPointerEnter={() => p.id === current?.id && setPart(pt.id)}
                    onPointerLeave={() => setPart(null)}
                  >
                    <b>{pt.title}</b>
                    {pt.html && <div dangerouslySetInnerHTML={{ __html: pt.html }} />}
                    {pt.did && <p className="did">{pt.did}</p>}
                    {pt.learned && <p className="learned">{pt.learned}</p>}
                  </li>
                ))}
              </ol>
              {(p.repo || p.demo) && (
                <div className="show-links">
                  {p.repo && (
                    <a className="btn small" href={p.repo} target="_blank" rel="noopener noreferrer">
                      GitHub repo ↗
                    </a>
                  )}
                  {p.demo && (
                    <a className="btn small" href={p.demo} target="_blank" rel="noopener noreferrer">
                      Live demo ↗
                    </a>
                  )}
                </div>
              )}
            </article>
          ))}
          {!shown.length && <p className="muted">No projects match that filter.</p>}
        </div>
        <div className="show-stage">
          {current && (
            <>
              <div className="show-stage-head">
                <span className="mono">{String(index + 1).padStart(2, '0')}</span>
                <b>{current.title}</b>
                <span className="show-progress" aria-hidden>
                  {shown.map((p) => (
                    <i key={p.id} className={p.id === current.id ? 'on' : ''} />
                  ))}
                </span>
              </div>
              <ProjectViewer
                projectId={current.id}
                cad={cad}
                parts={current.parts.map((x) => ({ id: x.id, title: x.title, note: x.did }))}
                active={part}
                onHover={setPart}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import ProjectMedia, { ReportLink } from './ProjectMedia';

export type ShowcaseProject = {
  id: string;
  title: string;
  status: 'complete' | 'in-progress';
  year?: string;
  summary: string;
  body: string;
  tags: string[];
  skills: string[];
  repo?: string;
  demo?: string;
  parts: { id: string; title: string; html: string; did?: string; learned?: string }[];
  /** What the stage shows (portfolio.md `media:`). */
  media: 'cad' | 'photos' | 'diagram' | 'blueprint';
  tier: 'main' | 'supplementary';
  /** Uploaded files from public/projects/<id>/. */
  report?: string;
  reportExpected: boolean;
  photos: string[];
  /** One-line plain-text summary for cards. */
  blurb: string;
};

/**
 * Pinned project stage: the 3D viewer stays put while each project's story scrolls past it,
 * one project per scroll step.
 */
export default function ProjectShowcase({
  projects,
  cad,
}: {
  projects: ShowcaseProject[];
  cad: Record<string, string>;
}) {
  const shown = projects;
  const [active, setActive] = useState<string | undefined>(projects[0]?.id);
  const [part, setPart] = useState<string | null>(null);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hash = () => {
      const id = location.hash.replace('#projects-', '');
      if (projects.some((p) => p.id === id)) setActive(id);
    };
    addEventListener('hashchange', hash);
    hash();
    return () => {
      removeEventListener('hashchange', hash);
    };
  }, [projects]);

  // The article crossing the middle of the viewport is the one on stage.
  useEffect(() => {
    const els = [...(list.current?.querySelectorAll<HTMLElement>('.show-item') ?? [])];
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive((e.target as HTMLElement).dataset.id);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // Not re-created on every change, or its first callback would undo a hover selection.
  }, [shown]);

  const current = shown.find((p) => p.id === active) ?? shown[0];
  const index = current ? shown.indexOf(current) : 0;
  return (
    <div className="showcase">
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
                  {p.status === 'in-progress' ? '● In progress' : p.year ?? 'Complete'}
                </span>
              </div>
              <h3>{p.title}</h3>
              <div className="prose lead" dangerouslySetInnerHTML={{ __html: p.summary }} />
              {p.body && <div className="prose" dangerouslySetInnerHTML={{ __html: p.body }} />}
              <ul className="chips">
                {p.tags.map((t) => (
                  <li className="chip" key={t}>
                    {t}
                  </li>
                ))}
              </ul>
              {p.skills.length > 0 && <p className="muted small">Built with {p.skills.join(', ')}</p>}
              <ol className="parts">
                {p.parts.map((pt, n) => (
                  <li
                    key={pt.id}
                    className={p.id === current?.id && part === pt.id ? 'active' : ''}
                    onPointerEnter={() => {
                      // Hovering a component brings its project on stage right away.
                      if (p.id !== current?.id) setActive(p.id);
                      setPart(pt.id);
                    }}
                    onPointerLeave={() => setPart(null)}
                  >
                    <span className="part-no mono" aria-hidden>
                      {n + 1}
                    </span>
                    <b>{pt.title}</b>
                    {pt.html && <div dangerouslySetInnerHTML={{ __html: pt.html }} />}
                    {pt.did && <p className="did">{pt.did}</p>}
                    {pt.learned && <p className="learned">{pt.learned}</p>}
                  </li>
                ))}
              </ol>
              <div className="show-links">
                <a className="btn small" href={`/projects/${p.id}`}>
                  Case study →
                </a>
                <ReportLink project={p} />
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
            </article>
          ))}
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
              <ProjectMedia
                project={current}
                cad={cad}
                sheet={`${String(index + 1).padStart(2, '0')} / ${String(shown.length).padStart(2, '0')}`}
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

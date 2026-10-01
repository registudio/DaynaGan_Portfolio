'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { Project } from '@/lib/content';
import { BeforeAfter } from '@/components/playground/BeforeAfter';

const ExplodedViewer = dynamic(() => import('./ExplodedViewer'), {
  ssr: false,
  loading: () => <div className="viewer-loading">Assembling model…</div>,
});

export type ProjectCard = Omit<Project, 'body'>;
type Side = NonNullable<ProjectCard['compare']>['before'];

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function CompareSide({ side, variant }: { side: Side; variant: 'before' | 'after' }) {
  if (side.image) return <img src={side.image} alt={side.label} draggable={false} />;
  if (side.code)
    return (
      <pre className="compare-code">
        <code>{side.code}</code>
      </pre>
    );
  if (side.stat)
    return (
      <div className="compare-stat">
        <strong>{side.stat}</strong>
        <span>{side.note}</span>
      </div>
    );
  return (
    <div className={`compare-placeholder compare-placeholder-${variant}`}>
      <span>{variant === 'before' ? 'CAD / render coming soon' : 'Photo coming soon'}</span>
    </div>
  );
}

export function ProjectsExplorer({ projects }: { projects: ProjectCard[] }) {
  const [index, setIndex] = useState(0);
  const [view, setView] = useState<'model' | 'compare'>('model');
  const [explode, setExplode] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [near, setNear] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const stage = useRef<HTMLDivElement>(null);
  const labels = useRef(new Map<string, HTMLElement>());
  const project = projects[index];
  const activeId = hovered ?? selected;
  const activePart = project.parts.find((p) => p.id === activeId);

  // Load the 3D viewer shortly before the stage scrolls into view, then explode on arrival.
  useEffect(() => {
    setWebgl(hasWebGL());
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setNear(true);
      },
      { rootMargin: '600px 0px' },
    );
    const arrive = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setExplode(1);
          arrive.disconnect();
        }
      },
      { threshold: 0.55 },
    );
    io.observe(stage.current!);
    arrive.observe(stage.current!);
    return () => {
      io.disconnect();
      arrive.disconnect();
    };
  }, []);

  const choose = (i: number) => {
    setIndex(i);
    if (!projects[i].compare) setView('model');
    setSelected(null);
    setHovered(null);
    setExplode(0);
    labels.current.clear();
    // Assemble first, then burst apart so every switch shows the explosion.
    window.setTimeout(() => setExplode(1), 450);
  };

  return (
    <div className="explorer" style={{ '--accent': project.accent } as React.CSSProperties}>
      <div className="project-list" role="tablist" aria-label="Projects">
        {projects.map((p, i) => (
          <button
            key={p.slug}
            role="tab"
            aria-selected={i === index}
            className="project-tab"
            onClick={() => choose(i)}
          >
            <span className="project-tab-number">{String(i + 1).padStart(2, '0')}</span>
            <span className="project-tab-title">{p.title}</span>
            {p.status === 'in-progress' && <span className="badge-live">In progress</span>}
          </button>
        ))}
        <div className="project-tab project-tab-next" aria-hidden="true">
          <span className="project-tab-number">+</span>
          <span className="project-tab-title">Next build loading…</span>
        </div>
      </div>

      <div className="stage" ref={stage} role="tabpanel" aria-label={project.title}>
        <div className="stage-head">
          <div>
            <p className="stage-meta">
              {project.year ?? 'Project'} ·{' '}
              {project.status === 'in-progress' ? 'In progress' : 'Complete'}
            </p>
            <h3>{project.title}</h3>
            <p className="stage-summary">{project.summary}</p>
          </div>
          {project.compare && (
            <div className="view-switch" role="group" aria-label="View">
              <button aria-pressed={view === 'model'} onClick={() => setView('model')}>
                Exploded view
              </button>
              <button aria-pressed={view === 'compare'} onClick={() => setView('compare')}>
                CAD / real build
              </button>
            </div>
          )}
        </div>

        {view === 'model' ? (
          <div className="viewer">
            <div className="viewer-frame">
              <span className="viewer-grid" aria-hidden="true" />
              {near && webgl && (
                <ExplodedViewer
                  key={project.slug}
                  parts={project.parts}
                  model={project.model}
                  accent={project.accent}
                  explode={explode}
                  activeId={activeId}
                  onHover={setHovered}
                  onSelect={(id) => setSelected((s) => (s === id ? null : id))}
                  labels={labels}
                />
              )}
              {!webgl && (
                <p className="viewer-loading">
                  3D preview unavailable — the parts are listed alongside.
                </p>
              )}
              <div className="callouts">
                {project.parts.map((part, i) => (
                  <button
                    key={`${project.slug}-${part.id}`}
                    ref={(el) => {
                      if (el) labels.current.set(part.id, el);
                      else labels.current.delete(part.id);
                    }}
                    className={`callout${activeId === part.id ? ' is-active' : ''}`}
                    style={{ opacity: 0 }}
                    onMouseEnter={() => setHovered(part.id)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setSelected(part.id)}
                    onClick={() => setSelected((s) => (s === part.id ? null : part.id))}
                    aria-label={part.label}
                  >
                    <span>{i + 1}</span>
                    <em>{part.label}</em>
                  </button>
                ))}
              </div>
              <p className="viewer-hint">Drag to rotate · hover a part</p>
            </div>

            <aside className="parts">
              <label className="explode-control">
                <span>
                  Assembled <b>Exploded</b>
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={explode}
                  onChange={(e) => setExplode(Number(e.target.value))}
                  aria-label="Explode model"
                />
              </label>
              {activePart ? (
                <div className="part-detail" key={activePart.id}>
                  <p className="part-number">
                    Part {String(project.parts.indexOf(activePart) + 1).padStart(2, '0')}
                  </p>
                  <h4>{activePart.label}</h4>
                  <p>{activePart.summary}</p>
                  <dl>
                    <dt>What I did</dt>
                    <dd>{activePart.did ?? 'Notes coming soon.'}</dd>
                    <dt>What I learnt</dt>
                    <dd>{activePart.learned ?? 'Notes coming soon.'}</dd>
                  </dl>
                </div>
              ) : (
                <ol className="part-list">
                  {project.parts.map((part) => (
                    <li key={part.id}>
                      <button
                        onMouseEnter={() => setHovered(part.id)}
                        onMouseLeave={() => setHovered(null)}
                        onClick={() => setSelected(part.id)}
                      >
                        {part.label}
                      </button>
                    </li>
                  ))}
                </ol>
              )}
              {selected && (
                <button className="text-button" onClick={() => setSelected(null)}>
                  ← All parts
                </button>
              )}
            </aside>
          </div>
        ) : project.compare ? (
          <figure className="compare-wrap">
            <BeforeAfter
              key={project.slug}
              beforeLabel={project.compare.before.label}
              afterLabel={project.compare.after.label}
              before={<CompareSide side={project.compare.before} variant="before" />}
              after={<CompareSide side={project.compare.after} variant="after" />}
            />
            <figcaption>{project.compare.caption ?? 'Drag across to compare.'}</figcaption>
          </figure>
        ) : (
          <p className="viewer-loading">No comparison for this project yet.</p>
        )}

        <div className="stage-foot">
          <div className="tags">
            {project.technologies.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <Link className="text-link" href={`/projects/${project.slug}`}>
            Read the case study ↗
          </Link>
        </div>
      </div>
    </div>
  );
}

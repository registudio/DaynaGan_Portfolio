'use client';

import { useEffect, useState } from 'react';
import { detectQuality, sampleFrames, setQuality } from '@/lib/quality';
import ProjectViewer from './ProjectViewer';
import type { ShowcaseProject } from './ProjectShowcase';
import ThemeToggle from './ThemeToggle';

export type CaseLink = { label: string; href: string; meta?: string };

/**
 * A project's own page: the full write-up, the 3D viewer beside its numbered components
 * (hover either to highlight both), where the work happened, and the neighbouring projects.
 */
export default function CaseStudy({
  project: p,
  cad,
  index,
  total,
  name,
  related,
  prev,
  next,
}: {
  project: ShowcaseProject;
  cad: Record<string, string>;
  index: number;
  total: number;
  name: string;
  related: CaseLink[];
  prev?: CaseLink;
  next?: CaseLink;
}) {
  const [part, setPart] = useState<string | null>(null);
  // Same adaptive quality as the home page: device hints, then a short frame sample.
  useEffect(() => {
    setQuality(detectQuality());
    const t = setTimeout(() => sampleFrames((ms) => ms > 24 && setQuality('low')), 2500);
    return () => clearTimeout(t);
  }, []);
  const sheet = `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
  return (
    <>
      <div className="aurora" aria-hidden>
        <i />
        <i />
        <i />
      </div>
      <header className="case-bar">
        <a className="brand" href="/#projects" aria-label={`${name} — portfolio`}>
          <span className="brand-mark" aria-hidden>
            D
          </span>
          <span className="brand-name">{name}</span>
        </a>
        <div className="case-bar-actions">
          <ThemeToggle />
          <a className="btn small" href={`/#projects-${p.id}`}>
            ← Back to portfolio
          </a>
        </div>
      </header>
      <main className="pro case" id="main">
        <section className="case-hero">
          <span className="eyebrow mono">
            Case study · {sheet} · {p.status === 'in-progress' ? 'In progress' : (p.year ?? 'Complete')}
          </span>
          <h1>{p.title}</h1>
          <div className="prose lead" dangerouslySetInnerHTML={{ __html: p.summary }} />
          <ul className="chips">
            {p.tags.map((t) => (
              <li className="chip" key={t}>
                {t}
              </li>
            ))}
          </ul>
          {p.skills.length > 0 && <p className="muted small">Built with {p.skills.join(', ')}</p>}
        </section>

        <section className="case-grid" aria-label="Model and components">
          <div className="case-viewer">
            <ProjectViewer
              title={p.title}
              sheet={sheet}
              projectId={p.id}
              cad={cad}
              parts={p.parts.map((x) => ({ id: x.id, title: x.title, note: x.did }))}
              active={part}
              onHover={setPart}
            />
          </div>
          <div>
            <h2 className="case-h">Components</h2>
            <ol className="parts">
              {p.parts.map((pt, n) => (
                <li key={pt.id} className={part === pt.id ? 'active' : ''} onPointerEnter={() => setPart(pt.id)} onPointerLeave={() => setPart(null)}>
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
          </div>
        </section>

        {p.body && (
          <section className="case-section">
            <h2 className="case-h">The build</h2>
            <div className="prose" dangerouslySetInnerHTML={{ __html: p.body }} />
          </section>
        )}

        {related.length > 0 && (
          <section className="case-section">
            <h2 className="case-h">Where it happened</h2>
            <ul className="case-links">
              {related.map((r) => (
                <li key={r.href}>
                  <a href={r.href}>
                    <b>{r.label}</b>
                    {r.meta && <span className="muted"> · {r.meta}</span>}
                    <span aria-hidden> →</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(p.repo || p.demo) && (
          <div className="show-links">
            {p.repo && (
              <a className="btn" href={p.repo} target="_blank" rel="noopener noreferrer">
                GitHub repo ↗
              </a>
            )}
            {p.demo && (
              <a className="btn" href={p.demo} target="_blank" rel="noopener noreferrer">
                Live demo ↗
              </a>
            )}
          </div>
        )}

        <nav className="case-nav" aria-label="More projects">
          {prev ? (
            <a href={prev.href} className="case-nav-link">
              <span className="mono">← Previous</span>
              <b>{prev.label}</b>
            </a>
          ) : (
            <span />
          )}
          {next && (
            <a href={next.href} className="case-nav-link next">
              <span className="mono">Next →</span>
              <b>{next.label}</b>
            </a>
          )}
        </nav>
      </main>
      <footer className="pro-foot">
        <div className="foot-row muted small">
          <span>© {name}</span>
          <a href="/#contact">Get in touch →</a>
        </div>
      </footer>
    </>
  );
}

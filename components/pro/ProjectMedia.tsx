'use client';

import AgentDiagram from './AgentDiagram';
import PhotoGallery from './PhotoGallery';
import type { ShowcaseProject } from './ProjectShowcase';
import ProjectViewer from './ProjectViewer';

/** What a project's stage shows, by its `media:` in portfolio.md. */
export default function ProjectMedia({
  project: p,
  cad,
  sheet,
  active,
  onHover,
}: {
  project: ShowcaseProject;
  cad: Record<string, string>;
  sheet: string;
  active: string | null;
  onHover: (id: string | null) => void;
}) {
  const parts = p.parts.map((x) => ({ id: x.id, title: x.title, note: x.did }));
  if (p.media === 'diagram') return <AgentDiagram parts={parts} active={active} onHover={onHover} />;
  if (p.media === 'photos') return <PhotoGallery photos={p.photos} title={p.title} />;
  return <ProjectViewer title={p.title} sheet={sheet} projectId={p.id} cad={cad} parts={parts} active={active} onHover={onHover} />;
}

/** "Read the report" when the PDF is uploaded; a quiet note when one is expected but missing. */
export function ReportLink({ project: p, small = true }: { project: ShowcaseProject; small?: boolean }) {
  if (p.report)
    return (
      <a className={`btn${small ? ' small' : ''}`} href={p.report} target="_blank" rel="noopener noreferrer">
        Read the report ↗
      </a>
    );
  if (p.reportExpected) return <span className={`btn${small ? ' small' : ''} is-pending`}>Report coming soon</span>;
  return null;
}

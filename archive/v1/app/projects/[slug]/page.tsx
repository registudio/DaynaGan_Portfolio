import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProjects } from '@/lib/content';
import { Markdown } from '@/components/Markdown';
import { siteUrl } from '@/lib/urls';
export function generateStaticParams() {
  return getProjects().map((p) => ({ slug: p.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = getProjects().find((p) => p.slug === slug);
  if (!p) return {};
  return {
    title: p.title,
    description: p.summary,
    alternates: { canonical: siteUrl() ? new URL(`projects/${slug}`, siteUrl()).href : null },
    openGraph: { title: p.title, description: p.summary, type: 'article' },
  };
}
export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getProjects().find((p) => p.slug === slug);
  if (!p) notFound();
  return (
    <main className="article-page">
      <Link className="text-link" href="/#projects">
        ← Back to projects
      </Link>
      <p className="eyebrow">
        Projects / {p.year ?? 'Ongoing'} / {p.status === 'in-progress' ? 'In progress' : 'Complete'}
      </p>
      <h1>{p.title}</h1>
      <p className="article-summary">{p.summary}</p>
      <div className="tags">
        {p.technologies.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      <div className="article-links">
        {p.github && (
          <a href={p.github} target="_blank" rel="noreferrer">
            Source code ↗
          </a>
        )}
        {p.demo && (
          <a href={p.demo} target="_blank" rel="noreferrer">
            Live demo ↗
          </a>
        )}
      </div>
      <article className="prose article-body">
        <Markdown body={p.body} />
      </article>
    </main>
  );
}

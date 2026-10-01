import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CaseStudy, { type CaseLink } from '@/components/pro/CaseStudy';
import { showcase } from '@/components/pro/ProSite';
import { cadModels, loadRenderedPortfolio } from '@/lib/load';
import { levelById } from '@/lib/portfolio';

// Every project gets a static page; unknown ids are a 404.
export const dynamicParams = false;

function projects() {
  const portfolio = loadRenderedPortfolio();
  const level = levelById(portfolio, 'projects');
  return { portfolio, list: level ? showcase(portfolio, level) : [] };
}

const plain = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();

export function generateStaticParams() {
  return projects().list.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { portfolio, list } = projects();
  const p = list.find((x) => x.id === id);
  if (!p) return {};
  const title = `${p.title} — ${portfolio.site.displayName}`;
  const description = plain(p.summary);
  return { title, description, openGraph: { title, description, type: 'article' }, twitter: { card: 'summary_large_image', title, description } };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { portfolio, list } = projects();
  const i = list.findIndex((x) => x.id === id);
  if (i < 0) notFound();
  const p = list[i];
  // Roles and schools whose parts link to this project.
  const related: CaseLink[] = [];
  for (const levelId of ['experience', 'education', 'leadership'])
    for (const room of levelById(portfolio, levelId)?.rooms ?? [])
      if (room.parts.some((x) => x.meta.link === `projects/${id}`))
        related.push({ label: room.title, href: `/#${levelId}-${room.id}`, meta: [room.meta.role, room.meta.period].filter(Boolean).join(' · ') });
  const link = (x?: (typeof list)[number]) => (x ? { label: x.title, href: `/projects/${x.id}` } : undefined);
  return (
    <CaseStudy
      project={p}
      cad={cadModels()}
      index={i}
      total={list.length}
      name={portfolio.site.displayName}
      related={related}
      prev={link(list[i - 1])}
      next={link(list[i + 1])}
    />
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPosts } from '@/lib/content';
import { Markdown } from '@/components/Markdown';
import { siteUrl } from '@/lib/urls';
export function generateStaticParams() {
  return getPosts().map((p) => ({ slug: p.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = getPosts().find((p) => p.slug === slug);
  if (!p) return {};
  return {
    title: p.title,
    description: p.summary,
    alternates: { canonical: siteUrl() ? new URL(`blog/${slug}`, siteUrl()).href : null },
    openGraph: { title: p.title, description: p.summary, type: 'article', publishedTime: p.date },
  };
}
export default async function BlogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getPosts().find((p) => p.slug === slug);
  if (!p) notFound();
  return (
    <main className="article-page">
      <Link className="text-link" href="/">
        ← Back home
      </Link>
      <p className="eyebrow">
        Notes / <time dateTime={p.date}>{p.date}</time>
      </p>
      <h1>{p.title}</h1>
      <p className="article-summary">{p.summary}</p>
      <div className="tags">
        {p.tags.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      <article className="prose article-body">
        <Markdown body={p.body} />
      </article>
      <Link className="text-link" href="/">
        ← Back home
      </Link>
    </main>
  );
}

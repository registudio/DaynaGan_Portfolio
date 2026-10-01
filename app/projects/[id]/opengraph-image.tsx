import { ImageResponse } from 'next/og';
import { ShareCard, ogFonts } from '@/lib/og';
import { showcase } from '@/components/pro/ProSite';
import { loadRenderedPortfolio } from '@/lib/load';
import { levelById } from '@/lib/portfolio';

export const alt = 'Project case study — Dayna Gan';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export function generateStaticParams() {
  const portfolio = loadRenderedPortfolio();
  return showcase(portfolio, levelById(portfolio, 'projects')!).map((p) => ({ id: p.id }));
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const portfolio = loadRenderedPortfolio();
  const p = showcase(portfolio, levelById(portfolio, 'projects')!).find((x) => x.id === id);
  const plain = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
  return new ImageResponse(<ShareCard title={p?.title} line={p ? plain(p.summary) : undefined} eyebrow="Case study" />, { ...size, fonts: await ogFonts() });
}

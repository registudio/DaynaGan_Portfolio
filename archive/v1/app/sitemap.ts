import type { MetadataRoute } from 'next';
import { getProjects } from '@/lib/content';
import { siteUrl } from '@/lib/urls';
export const dynamic = 'force-static';
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  if (!base) return [];
  return [
    { url: base.href },
    ...getProjects().map((p) => ({ url: new URL(`projects/${p.slug}/`, base).href })),
  ];
}

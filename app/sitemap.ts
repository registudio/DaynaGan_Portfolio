import type { MetadataRoute } from 'next';
import { getProjects, getPosts } from '@/lib/content';
import { siteUrl } from '@/lib/urls';
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  if (!base) return [];
  return [
    { url: base.href },
    ...getProjects().map((p) => ({ url: new URL(`projects/${p.slug}`, base).href })),
    ...getPosts().map((p) => ({ url: new URL(`blog/${p.slug}`, base).href, lastModified: p.date })),
  ];
}

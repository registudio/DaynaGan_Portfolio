import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/urls';
export default function robots(): MetadataRoute.Robots {
  const url = siteUrl();
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/api/' },
    ...(url ? { sitemap: new URL('sitemap.xml', url).href } : {}),
  };
}

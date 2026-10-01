import type { Metadata } from 'next';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './globals.css';
import { getSite } from '@/lib/content';
import { siteUrl } from '@/lib/urls';
const site = getSite();
const url = siteUrl();
export const metadata: Metadata = {
  metadataBase: url || new URL('http://localhost:3000'),
  title: { default: site.title, template: `%s — ${site.displayName}` },
  description: site.description,
  ...(url ? { alternates: { canonical: url.href } } : {}),
  openGraph: {
    title: site.title,
    description: site.description,
    type: 'website',
    ...(url ? { url: url.href } : {}),
    images: [
      {
        url: 'images/og.png',
        width: 1200,
        height: 630,
        alt: 'Dayna Gan — portfolio',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: site.title,
    description: site.description,
    images: ['images/og.png'],
  },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

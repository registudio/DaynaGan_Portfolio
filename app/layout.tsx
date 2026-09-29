import type { Metadata, Viewport } from 'next';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import './globals.css';
import { loadPortfolio } from '@/lib/load';

const site = loadPortfolio().site;
const url = process.env.NEXT_PUBLIC_SITE_URL || undefined;

export const metadata: Metadata = {
  metadataBase: url ? new URL(url) : undefined,
  title: site.title,
  description: site.description,
  openGraph: { title: site.title, description: site.description, type: 'website' },
  twitter: { card: 'summary_large_image', title: site.title, description: site.description },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf8fc' },
    { media: '(prefers-color-scheme: dark)', color: '#130e1d' },
  ],
  width: 'device-width',
  initialScale: 1,
};

// Runs before first paint: applies the saved theme so there's no light/dark flash.
const themeScript = `try{var t=localStorage.getItem('dg-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

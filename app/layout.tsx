import type { Metadata, Viewport } from 'next';
import '@fontsource/space-grotesk/latin-400.css';
import '@fontsource/space-grotesk/latin-500.css';
import '@fontsource/space-grotesk/latin-700.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/pixelify-sans/latin-400.css';
import '@fontsource/pixelify-sans/latin-600.css';
import './globals.css';
import './pro.css';
import { SpeedInsights } from '@vercel/speed-insights/next';
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

// Runs before first paint: applies the saved theme (no light/dark flash) and, for visitors
// heading straight into Professional mode (saved choice or a section link), hides the main
// menu and covers the page until the name intro takes over — no menu flash for return visitors.
const bootScript = `try{var d=document.documentElement,t=localStorage.getItem('dg-theme');if(t==='light'||t==='dark')d.dataset.theme=t;var h=location.hash.slice(1),g=/^(play|tour|planet|splash)$/.test(h);if(location.pathname==='/'&&!g&&(h||localStorage.getItem('dg-mode')==='pro'))d.classList.add('boot-pro')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>
        {children}
        {/* Real-visitor Core Web Vitals in the Vercel dashboard (Speed Insights). */}
        <SpeedInsights />
      </body>
    </html>
  );
}

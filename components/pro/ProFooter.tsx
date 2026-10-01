'use client';

import type { Site } from '@/lib/portfolio';
import { PlayButton } from './PlayButton';

export default function ProFooter({ site, updated }: { site: Site; updated: string }) {
  const top = () => scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  return (
    <footer className="pro-foot">
      <div className="foot-row">
        <div className="foot-social">
          <a href={site.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="social">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.5c0-1.3-.02-3-1.83-3-1.83 0-2.12 1.43-2.12 2.9V21h-4V9Z" />
            </svg>
          </a>
          <a href={site.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="social">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.3 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
            </svg>
          </a>
          <a href={`mailto:${site.email}`} aria-label="Email" className="social">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1 2.2V17h16V7.2l-8 5.3-8-5.3ZM5.4 7l6.6 4.4L18.6 7H5.4Z" />
            </svg>
          </a>
        </div>
        <span className="no-print">
          <PlayButton small />
        </span>
        <button className="btn small to-top" onClick={top} aria-label="Back to top">
          ↑ Back to top
        </button>
      </div>
      <div className="foot-row muted small">
        <span>
          © {new Date(updated).getFullYear()} {site.name}
        </span>
        <span>Last updated {new Date(updated).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Singapore' })}</span>
      </div>
    </footer>
  );
}

'use client';

import type { Site } from '@/lib/portfolio';
import { GitHubIcon, LinkedInIcon, MailIcon } from './Icons';
import { PlayButton } from './PlayButton';

export default function ProFooter({ site, updated }: { site: Site; updated: string }) {
  const top = () => scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  return (
    <footer className="pro-foot">
      <div className="foot-row">
        <div className="foot-social">
          <a href={site.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="social">
            <LinkedInIcon className="" />
          </a>
          <a href={site.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="social">
            <GitHubIcon className="" />
          </a>
          <a href={`mailto:${site.email}`} aria-label="Email" className="social">
            <MailIcon className="" />
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

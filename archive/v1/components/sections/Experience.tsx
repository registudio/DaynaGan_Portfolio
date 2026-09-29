'use client';
import { useEffect, useRef, useState } from 'react';
import { sectionProgress } from '@/components/site/ScrollEffects';

export type Job = {
  slug: string;
  title: string;
  role: string;
  period: string;
  mark?: string;
  logo?: string;
  technologies: string[];
  summary: string;
  details: string[];
};

/**
 * Pinned horizontal track: vertical scrolling slides the role cards sideways.
 * Falls back to a normal vertical list on small screens and with reduced motion.
 */
export function ExperienceTrack({ jobs }: { jobs: Job[] }) {
  const outer = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(
      '(min-width: 900px) and (prefers-reduced-motion: no-preference)',
    );
    let raf = 0;
    const update = () => {
      raf = 0;
      if (!query.matches) return;
      const p = sectionProgress(outer.current!);
      const distance = track.current!.scrollWidth - track.current!.clientWidth;
      track.current!.style.transform = `translate3d(${-p * distance}px, 0, 0)`;
      setProgress(p);
    };
    const request = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const mode = () => {
      setPinned(query.matches);
      if (!query.matches) track.current!.style.transform = '';
      request();
    };
    mode();
    query.addEventListener('change', mode);
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    return () => {
      cancelAnimationFrame(raf);
      query.removeEventListener('change', mode);
      window.removeEventListener('scroll', request);
      window.removeEventListener('resize', request);
    };
  }, []);

  const current = Math.min(jobs.length - 1, Math.floor(progress * jobs.length));

  return (
    <div
      ref={outer}
      className={`experience-pin${pinned ? ' is-pinned' : ''}`}
      style={{ '--cards': jobs.length } as React.CSSProperties}
    >
      <div className="experience-sticky">
        <div className="experience-meta" aria-hidden="true">
          <span>
            {String(current + 1).padStart(2, '0')} / {String(jobs.length).padStart(2, '0')}
          </span>
          <span className="experience-bar">
            <span style={{ transform: `scaleX(${progress})` }} />
          </span>
          <span className="experience-scroll-note">Scroll →</span>
        </div>
        <div className="experience-track" ref={track}>
          {jobs.map((job, i) => (
            <article key={job.slug} className="job-card" data-reveal>
              <span className="job-index" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="job-head">
                {job.logo ? (
                  <img className="job-logo" src={job.logo} alt={`${job.title} logo`} />
                ) : (
                  <span className="job-logo job-mark" aria-hidden="true">
                    {job.mark ?? job.title.slice(0, 2)}
                  </span>
                )}
                <p className="job-period">{job.period}</p>
              </div>
              <h3>{job.title}</h3>
              <p className="job-role">{job.role}</p>
              <p className="job-summary">{job.summary}</p>
              <ul>
                {job.details.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
              <div className="tags">
                {job.technologies.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

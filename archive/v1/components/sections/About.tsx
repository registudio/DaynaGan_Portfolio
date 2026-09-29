import type { getSections, Profile } from '@/lib/content';
import { Markdown } from '@/components/Markdown';
import { CountUp } from './interactive';

type Section = ReturnType<typeof getSections>[number];

/** Split layout: the headline stays pinned on the left while the story scrolls on the right. */
export function About({ section, profile }: { section: Section; profile: Profile }) {
  return (
    <section id="about" className="section about">
      <span className="section-glow glow-left" data-parallax="-0.2" aria-hidden="true" />
      <div className="about-split">
        <header className="about-headline" data-reveal>
          <p className="eyebrow">{section.eyebrow}</p>
          <h2>{section.title}</h2>
          <p className="kicker">{section.kicker}</p>
        </header>
        <div className="about-story">
          <div className="about-copy" data-reveal>
            <Markdown body={section.body} />
            <div className="tags">
              {section.tags.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </div>

          <div className="currently" data-reveal>
            <h3 className="small-heading">Currently</h3>
            <ul>
              {profile.currently.map((c) => (
                <li key={c.label}>
                  <span>{c.label}</span>
                  {c.value}
                </li>
              ))}
            </ul>
          </div>

          <dl className="stats">
            {profile.stats.map((s) => (
              <div key={s.label} className="stat" data-reveal>
                <dt>{s.label}</dt>
                <dd>
                  <CountUp value={s.value} decimals={s.decimals} suffix={s.suffix} />
                </dd>
              </div>
            ))}
          </dl>

          <div className="community">
            <h3 className="small-heading" data-reveal>
              Beyond the workbench
            </h3>
            <ul>
              {profile.community.map((c) => (
                <li key={c.org} data-reveal>
                  <span className="community-period">{c.period}</span>
                  <strong>
                    {c.role} · {c.org}
                  </strong>
                  <p>{c.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

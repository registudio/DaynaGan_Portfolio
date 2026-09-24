import type { getSections, Profile, Site } from '@/lib/content';
import { Markdown } from '@/components/Markdown';
import { SectionHeader } from './SectionHeader';
import { CountUp, TiltCard } from './interactive';

type Section = ReturnType<typeof getSections>[number];

export function About({
  section,
  profile,
  site,
}: {
  section: Section;
  profile: Profile;
  site: Site;
}) {
  return (
    <section id="about" className="section about">
      <span className="section-glow glow-left" data-parallax="-0.2" aria-hidden="true" />
      <SectionHeader section={section} />
      <div className="about-grid">
        <TiltCard className="portrait-card" data-reveal>
          <div className="portrait" aria-label="Portrait placeholder">
            <span className="portrait-initials">DG</span>
            <span className="portrait-note">Photo coming soon</span>
          </div>
          <div className="portrait-meta">
            <strong>{site.name}</strong>
            <span>{site.location}</span>
          </div>
        </TiltCard>
        <div className="about-copy" data-reveal>
          <Markdown body={section.body} />
          <div className="tags">
            {section.tags.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
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
    </section>
  );
}

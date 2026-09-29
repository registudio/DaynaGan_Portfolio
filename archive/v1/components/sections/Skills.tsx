import type { Profile } from '@/lib/content';
import { TiltCard } from './interactive';

export function Skills({ profile }: { profile: Profile }) {
  return (
    <>
      <div className="marquees" aria-label="Skills">
        {profile.skills.map((group, i) => (
          <div key={group.title} className="marquee-row" data-reveal>
            <h3 className="marquee-title">{group.title}</h3>
            <div className={`marquee${i % 2 ? ' marquee-reverse' : ''}`}>
              {/* Duplicated once so the loop is seamless; the copy is hidden from assistive tech. */}
              {[0, 1].map((copy) => (
                <ul key={copy} aria-hidden={copy === 1 ? true : undefined}>
                  {[...group.items, ...group.items].map((item, j) => (
                    <li key={`${item}-${j}`}>{item}</li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        ))}
      </div>
      <h3 className="small-heading" data-reveal>
        Awards & recognition
      </h3>
      <ul className="awards">
        {profile.awards.map((a, i) => (
          <li key={a.title} data-reveal style={{ '--delay': `${i * 60}ms` } as React.CSSProperties}>
            <TiltCard className="award">
              <span className="award-icon" aria-hidden="true">
                ✦
              </span>
              <strong>{a.title}</strong>
              <span>{a.detail}</span>
              {a.period && <time>{a.period}</time>}
            </TiltCard>
          </li>
        ))}
      </ul>
    </>
  );
}

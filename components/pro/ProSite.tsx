import type { GitHubFeed } from '@/lib/github';
import { levelById, list, parseLink, sectionLevels, type Level, type Part, type Portfolio } from '@/lib/portfolio';
import { computeSkills, skillSources } from '@/lib/skills';
import { Links } from '../Links';
import ContactForm from './ContactForm';
import GitHubPanel from './GitHubPanel';
import ProHeader from './ProHeader';
import ProjectCard from './ProjectCard';
import RevealRoot from './RevealRoot';
import { PlayButton } from './PlayButton';

const Html = ({ html, className = 'prose' }: { html?: string; className?: string }) =>
  html ? <div className={className} dangerouslySetInnerHTML={{ __html: html }} /> : null;

/** Inline HTML for a bullet (drops the wrapping <p>). */
const inline = (html?: string) => (html ?? '').replace(/^<p>|<\/p>\n?$/g, '').trim();

const visible = <T extends Part>(items: T[]) => items.filter((i) => !i.todo || i.body);
const period = (p: Part) => (p.meta.period && p.meta.period !== 'TODO' ? p.meta.period : '');

function SectionHead({ level }: { level: Level }) {
  return (
    <header className="section-head" data-reveal>
      {level.meta.eyebrow && <span className="eyebrow">{level.meta.eyebrow}</span>}
      <h2>{level.meta.title || level.title}</h2>
      {level.meta.kicker && <span className="kicker">{level.meta.kicker}</span>}
      {level.meta.profile ? (
        <p className="intro">{level.meta.profile}</p>
      ) : (
        level.html && <Html html={level.html} className="prose intro" />
      )}
    </header>
  );
}

function linkHref(p: Portfolio, value?: string) {
  const link = parseLink(value);
  if (!link) return null;
  const level = levelById(p, link.level);
  const room = level?.rooms.find((r) => r.id === link.room);
  return { href: `#${link.level}${link.room ? `-${link.room}` : ''}`, label: room?.title ?? level?.title };
}

function PartList({ portfolio, parts }: { portfolio: Portfolio; parts: Part[] }) {
  const tagParts = parts.filter((p) => p.meta.tags);
  const bullets = parts.filter((p) => !p.meta.tags);
  return (
    <>
      {bullets.length > 0 && (
        <ul className="bullets">
          {bullets.map((part) => {
            const link = linkHref(portfolio, part.meta.link);
            const body = inline(part.html);
            return (
              <li key={part.id}>
                {part.title && <b>{part.title}</b>}
                {period(part) && <span className="muted"> · {period(part)}</span>}
                {body && (
                  <>
                    {part.title ? ' — ' : ''}
                    <span dangerouslySetInnerHTML={{ __html: body }} />
                  </>
                )}
                {link && link.href.startsWith('#projects') && (
                  <>
                    {' '}
                    <a className="xlink" href={link.href}>
                      Project file →
                    </a>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {tagParts.map((part) => (
        <div className="sub-block" key={part.id}>
          <h4>{part.title}</h4>
          <ul className="chips">
            {list(part.meta.tags).map((t) => (
              <li className="chip" key={t}>
                {t}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

function About({ portfolio, level }: { portfolio: Portfolio; level: Level }) {
  const { site } = portfolio;
  const identity = level.rooms.find((r) => r.id === 'identity');
  const currently = level.rooms.find((r) => r.id === 'currently');
  const stats = level.rooms.find((r) => r.id === 'stats');
  return (
    <section id={level.id} className="section" aria-labelledby="hero-title">
      <div className="hero">
        <span className="eyebrow">{level.meta.eyebrow} · {site.location}</span>
        <h1 id="hero-title">
          Hi, I&apos;m <span>{site.displayName}.</span>
        </h1>
        <p className="tagline">{site.tagline}</p>
        <div className="hero-links no-print">
          <PlayButton />
          <Links site={site} className="btn" />
        </div>
        {stats && (
          <div className="stats">
            {stats.parts.map((s) => {
              const m = s.title.match(/^([\d.]+)(.*)$/);
              const decimals = m?.[1].includes('.') ? m[1].split('.')[1].length : 0;
              return (
                <div className="card stat" key={s.id} data-reveal>
                  <b data-count={m?.[1]} data-decimals={decimals} data-suffix={m?.[2] ?? ''}>
                    {s.title}
                  </b>
                  <span>{s.meta.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="about-grid">
        <div className="card" data-reveal>
          <span className="eyebrow">{level.meta.title}</span>
          <div style={{ height: 10 }} />
          <Html html={identity?.html} />
          <div style={{ height: 16 }} />
          <ul className="chips">
            {list(level.meta.tags).map((t) => (
              <li className="chip" key={t}>
                {t}
              </li>
            ))}
          </ul>
        </div>
        {currently && (
          <div className="card" data-reveal>
            <span className="eyebrow">Currently</span>
            <dl className="currently" style={{ marginTop: 14 }}>
              {currently.parts.map((p) => (
                <div key={p.id}>
                  <dt>{p.title}</dt>
                  <dd dangerouslySetInnerHTML={{ __html: inline(p.html) }} />
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </section>
  );
}

function Timeline({ portfolio, level }: { portfolio: Portfolio; level: Level }) {
  const rooms = level.id === 'experience' ? [...level.rooms].reverse() : level.rooms;
  return (
    <section id={level.id} className="section">
      <SectionHead level={level} />
      <div className="timeline" data-timeline>
        {rooms.map((room) => (
          <article className="t-item card" key={room.id} id={`${level.id}-${room.id}`} data-reveal>
            <div className="t-head">
              <h3>{room.title}</h3>
              {period(room) && <span className="t-period">{period(room)}</span>}
            </div>
            <p className="t-sub">
              {room.meta.role || room.meta.qualification}
              {room.meta.tags && <span className="muted"> · {list(room.meta.tags).join(' · ')}</span>}
            </p>
            {room.html && <Html html={room.html} />}
            <div style={{ height: room.html ? 12 : 0 }} />
            <PartList portfolio={portfolio} parts={visible(room.parts)} />
          </article>
        ))}
      </div>
    </section>
  );
}

function Projects({ portfolio, level }: { portfolio: Portfolio; level: Level }) {
  return (
    <section id={level.id} className="section">
      <SectionHead level={level} />
      <div className="projects">
        {level.rooms.map((room) => (
          <ProjectCard
            key={room.id}
            room={room}
            anchor={`${level.id}-${room.id}`}
            skills={portfolio.site.skills}
          />
        ))}
      </div>
    </section>
  );
}

function Skills({ portfolio, level }: { portfolio: Portfolio; level: Level }) {
  const levels = computeSkills(portfolio, null);
  const sources = skillSources(portfolio);
  const groups = [...new Set(portfolio.site.skills.map((s) => s.group))];
  const awards = level.rooms.find((r) => r.id === 'awards');
  return (
    <section id={level.id} className="section">
      <SectionHead level={level} />
      <div className="skill-groups">
        {groups.map((group) => (
          <div className="card skill-group" key={group} data-reveal>
            <h3>{group}</h3>
            {portfolio.site.skills
              .filter((s) => s.group === group)
              .map((s) => {
                const from = [...new Set(sources.filter((src) => src.skill === s.id).map((src) => src.label.split(' · ')[0]))];
                return (
                  <div className="skill" key={s.id}>
                    <div className="skill-row">
                      <span>{s.name}</span>
                      <span className="pips" aria-label={`Level ${levels[s.id]} of ${s.max}`}>
                        {Array.from({ length: s.max }, (_, i) => (
                          <i key={i} className={i < levels[s.id] ? 'on' : ''} />
                        ))}
                      </span>
                    </div>
                    {from.length > 0 && (
                      <ul className="chips" aria-label="Where it was used">
                        {from.map((f) => (
                          <li className="chip" key={f}>
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
          </div>
        ))}
      </div>
      {awards && (
        <div className="awards">
          {visible(awards.parts).map((a) => (
            <div className="card award" key={a.id} data-reveal>
              <b>{a.title}</b>
              <span>{[a.meta.org, a.meta.period].filter(Boolean).join(' · ')}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Leadership({ portfolio, level }: { portfolio: Portfolio; level: Level }) {
  return (
    <section id={level.id} className="section">
      <SectionHead level={level} />
      <div className="grid-2">
        {level.rooms.map((room) => (
          <article className="card" key={room.id} id={`${level.id}-${room.id}`} data-reveal>
            <div className="t-head">
              <h3 style={{ margin: 0, fontSize: 19 }}>{room.title}</h3>
            </div>
            <p className="t-sub">
              {room.meta.role} <span className="t-period"> · {room.meta.period}</span>
            </p>
            <PartList portfolio={portfolio} parts={visible(room.parts).map((p) => ({ ...p, title: '' }))} />
          </article>
        ))}
      </div>
    </section>
  );
}

/** Hobbies / Future goals: a compact card grid (TODO-only items hidden until written). */
function CardGrid({ level }: { level: Level }) {
  return (
    <section id={level.id} className="section">
      <SectionHead level={level} />
      <div className="grid-3">
        {visible(level.rooms).map((room) => (
          <article className="card" key={room.id} id={`${level.id}-${room.id}`} data-reveal>
            <h3 style={{ margin: '0 0 6px', fontSize: 18 }}>{room.title}</h3>
            <Html html={room.html} />
            {!!list(room.meta.tags).length && (
              <ul className="chips" style={{ marginTop: 12 }}>
                {list(room.meta.tags).map((t) => (
                  <li className="chip" key={t}>
                    {t}
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function Contact({ portfolio, level }: { portfolio: Portfolio; level: Level }) {
  const form = level.rooms.find((r) => r.id === 'form');
  return (
    <section id={level.id} className="section">
      <SectionHead level={level} />
      <div className="contact-grid">
        <div data-reveal>
          <p className="muted" style={{ marginTop: 0 }}>
            Prefer another channel? Everything is one click away.
          </p>
          <div className="link-list">
            <a className="btn" href={`mailto:${portfolio.site.email}`}>
              ✉ {portfolio.site.email}
            </a>
            <a className="btn" href={portfolio.site.linkedin} target="_blank" rel="noopener noreferrer">
              in · LinkedIn
            </a>
            <a className="btn" href={portfolio.site.github} target="_blank" rel="noopener noreferrer">
              gh · GitHub
            </a>
            <a className="btn" href={portfolio.site.resume} target="_blank" rel="noopener noreferrer">
              ⤓ Résumé (PDF)
            </a>
          </div>
        </div>
        <div className="card" data-reveal>
          <ContactForm reasons={list(form?.meta.reasons)} success={form?.body ?? ''} email={portfolio.site.email} />
        </div>
      </div>
    </section>
  );
}

export default function ProSite({ portfolio, github }: { portfolio: Portfolio; github: GitHubFeed }) {
  const levels = sectionLevels(portfolio);
  const render = (level: Level) => {
    switch (level.id) {
      case 'about':
        return <About key={level.id} portfolio={portfolio} level={level} />;
      case 'education':
      case 'experience':
        return <Timeline key={level.id} portfolio={portfolio} level={level} />;
      case 'projects':
        return <Projects key={level.id} portfolio={portfolio} level={level} />;
      case 'trophies':
        return <Skills key={level.id} portfolio={portfolio} level={level} />;
      case 'leadership':
        return <Leadership key={level.id} portfolio={portfolio} level={level} />;
      case 'github':
        return (
          <section id={level.id} key={level.id} className="section">
            <SectionHead level={level} />
            <GitHubPanel feed={github} site={portfolio.site} />
          </section>
        );
      case 'contact':
        return <Contact key={level.id} portfolio={portfolio} level={level} />;
      case 'hobbies':
      case 'future':
        return <CardGrid key={level.id} level={level} />;
      default:
        return (
          <section id={level.id} key={level.id} className="section">
            <SectionHead level={level} />
            {level.rooms.map((r) => (
              <div className="card" key={r.id}>
                <h3>{r.title}</h3>
                <Html html={r.html} />
              </div>
            ))}
          </section>
        );
    }
  };
  return (
    <>
      <ProHeader
        name={portfolio.site.displayName}
        resume={portfolio.site.resume}
        sections={levels.map((l) => ({ id: l.id, label: l.id === 'trophies' ? 'Skills' : l.title.split(' ')[0] }))}
      />
      <main className="pro">{levels.map(render)}</main>
      <footer className="pro-foot">
        <span>
          © {new Date().getFullYear()} {portfolio.site.name}
        </span>
        <span className="no-print">
          <PlayButton small />
        </span>
      </footer>
      <RevealRoot />
    </>
  );
}

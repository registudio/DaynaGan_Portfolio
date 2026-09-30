import type { GitHubFeed } from '@/lib/github';
import {
  levelById,
  list,
  parseGrants,
  parseLink,
  parseRequires,
  sectionLevels,
  type Level,
  type Part,
  type Portfolio,
  type Room,
} from '@/lib/portfolio';
import { computeSkills, skillSources } from '@/lib/skills';
import ContactForm from './ContactForm';
import CopyEmail from './CopyEmail';
import GitHubPanel from './GitHubPanel';
import HeroCarousel from './HeroCarousel';
import { HobbyIcon } from './HobbyIcon';
import NameIntro from './Intro';
import ProFooter from './ProFooter';
import ProHeader from './ProHeader';
import ProjectShowcase, { type ShowcaseProject } from './ProjectShowcase';
import RevealRoot from './RevealRoot';
import ScrollStory from './ScrollStory';

const Html = ({ html, className = 'prose' }: { html?: string; className?: string }) =>
  html ? <div className={className} dangerouslySetInnerHTML={{ __html: html }} /> : null;

/** Inline HTML for a bullet (drops the wrapping <p>). */
const inline = (html?: string) => (html ?? '').replace(/^<p>|<\/p>\n?$/g, '').trim();

/** Plain text from rendered HTML (tags stripped, the entities marked emits decoded). */
const text = (html?: string) =>
  (html ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();

const visible = <T extends Part>(items: T[]) => items.filter((i) => !i.todo || i.body);
const period = (p: Part) => (p.meta.period && p.meta.period !== 'TODO' ? p.meta.period : '');

/** `metrics: 80+ | volunteers led; 3 | robots` → count-up figures. */
function Metrics({ value }: { value?: string }) {
  const items = (value ?? '')
    .split(';')
    .map((m) => m.split('|').map((s) => s.trim()))
    .filter(([v, l]) => v && l);
  if (!items.length) return null;
  return (
    <div className="metrics">
      {items.map(([v, label]) => {
        const m = v.match(/^([\d.]+)(.*)$/);
        const decimals = m?.[1].includes('.') ? m[1].split('.')[1].length : 0;
        return (
          <div className="metric" key={label}>
            <b data-count={m?.[1]} data-decimals={decimals} data-suffix={m?.[2] ?? ''}>
              {v}
            </b>
            <span>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Skill ids a room exercises (its grants, its parts' grants and its build requirements). */
const uses = (room: Room) =>
  [
    ...new Set([
      ...parseGrants(room.meta.grants).map((g) => g.skill),
      ...room.parts.flatMap((p) => parseGrants(p.meta.grants).map((g) => g.skill)),
      ...parseRequires(room.meta.requires).map((r) => r.skill),
    ]),
  ].join(' ');

/** "04 / Projects" → "04". Headings are just the section name; the number sits above it. */
const sectionNumber = (level: Level) => (level.meta.eyebrow ?? '').split('/')[0].trim();

function Intro({ level }: { level: Level }) {
  return level.meta.profile ? (
    <p className="intro">{level.meta.profile}</p>
  ) : level.html ? (
    <Html html={level.html} className="prose intro" />
  ) : null;
}

function SectionHead({ level, intro = true }: { level: Level; intro?: boolean }) {
  return (
    <header className="section-head" data-reveal>
      {sectionNumber(level) && <span className="eyebrow">{sectionNumber(level)}</span>}
      <h2>{level.title}</h2>
      {intro && <Intro level={level} />}
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

function TechChips({ tags }: { tags: string[] }) {
  if (!tags.length) return null;
  return (
    <ul className="chips tech">
      {tags.map((t) => (
        <li key={t}>
          <button className="chip chip-btn" data-filter={t} title={`Show projects using ${t}`}>
            {t}
          </button>
        </li>
      ))}
    </ul>
  );
}

function About({ portfolio, level, carousel, cad }: { portfolio: Portfolio; level: Level; carousel: { id: string; title: string }[]; cad: Record<string, string> }) {
  const { site } = portfolio;
  const identity = level.rooms.find((r) => r.id === 'identity');
  const currently = level.rooms.find((r) => r.id === 'currently');
  const stats = level.rooms.find((r) => r.id === 'stats');
  const status = currently?.parts ?? [];
  return (
    <section id={level.id} className="section about-section" aria-labelledby="hero-title">
      <div className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            {site.location}
            <span className="eyebrow-extra"> · {level.meta.kicker}</span>
          </span>
          <h1 id="hero-title">
            Hi, I&apos;m <span>{site.displayName}.</span>
          </h1>
          <p className="tagline">{site.tagline}</p>
          {status.length > 0 && (
            <p className="status-pill" style={{ '--n': status.length } as React.CSSProperties}>
              <i aria-hidden />
              <span className="status-label">Currently</span>
              <span className="status-rot">
                {status.map((p, i) => (
                  <span key={p.id} style={{ '--i': i } as React.CSSProperties}>
                    <b>{p.title}</b> {text(p.html)}
                  </span>
                ))}
              </span>
            </p>
          )}
          <div className="hero-links no-print">
            <a className="btn primary" href={site.resume} target="_blank" rel="noopener noreferrer">
              ⤓ Download résumé
            </a>
            <a className="btn" href="#contact">
              Contact me →
            </a>
          </div>
        </div>
        <HeroCarousel items={carousel} cad={cad} />
        <a className="scroll-cue no-print" href="#about-more" aria-label="Scroll to the introduction">
          <span className="mono">Scroll</span>
          <i aria-hidden />
        </a>
      </div>
      <div id="about-more" className="about-more">
        <SectionHead level={level} intro={false} />
      {stats && (
        <div className="stats">
          {stats.parts.map((s, i) => {
            const m = s.title.match(/^([\d.]+)(.*)$/);
            const decimals = m?.[1].includes('.') ? m[1].split('.')[1].length : 0;
            return (
              <div className="card stat" key={s.id} data-reveal style={{ '--i': i } as React.CSSProperties}>
                <b data-count={m?.[1]} data-decimals={decimals} data-suffix={m?.[2] ?? ''}>
                  {s.title}
                </b>
                <span>{s.meta.label}</span>
              </div>
            );
          })}
        </div>
      )}
      <div className="about-grid">
        <div className="card glass" data-reveal>
          <span className="eyebrow">Who I am</span>
          <div style={{ height: 10 }} />
          <Html html={identity?.html} />
          <div style={{ height: 16 }} />
          <TechChips tags={list(level.meta.tags)} />
        </div>
        {currently && (
          <div className="card glass" data-reveal>
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
          <article className="t-item card" key={room.id} id={`${level.id}-${room.id}`} data-reveal data-uses={uses(room)}>
            <div className="t-head">
              <h3>{room.title}</h3>
              {period(room) && <span className="t-period">{period(room)}</span>}
            </div>
            <p className="t-sub">{room.meta.role || room.meta.qualification}</p>
            <Metrics value={room.meta.metrics} />
            {room.html && <Html html={room.html} />}
            <div style={{ height: room.html ? 12 : 0 }} />
            <PartList portfolio={portfolio} parts={visible(room.parts)} />
            <TechChips tags={list(room.meta.tags)} />
          </article>
        ))}
      </div>
    </section>
  );
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
/** Sort key from the start of a period like "Sep 2024 – Feb 2025". */
const startKey = (p?: string) => {
  const m = (p ?? '').match(/([A-Za-z]{3})[a-z]*\.?\s+(\d{4})/);
  if (m) return Number(m[2]) * 12 + Math.max(0, MONTHS.indexOf(m[1].toLowerCase()));
  const y = (p ?? '').match(/\d{4}/);
  return y ? Number(y[0]) * 12 : 0;
};

/**
 * Experience: a pinned opener ("My Experience" builds, then docks as the heading), followed by
 * a horizontal timeline — one milestone per company, oldest to newest.
 */
function Journey({ portfolio, level }: { portfolio: Portfolio; level: Level }) {
  const rooms = [...level.rooms].sort((a, b) => startKey(a.meta.period) - startKey(b.meta.period));
  return (
    <section id={level.id} className="section section-story">
      <ScrollStory title={`My ${level.title}`} number={sectionNumber(level)} horizontal>
        <div className="mile mile-intro">
          <Intro level={level} />
          <p className="mile-hint mono" aria-hidden>
            Keep scrolling →
          </p>
        </div>
        {rooms.map((room, i) => (
          <article className="mile" key={room.id} id={`${level.id}-${room.id}`} data-uses={uses(room)}>
            <div className="mile-node" aria-hidden>
              <i />
              <span className="mono">{(room.meta.period ?? '').match(/\d{4}/)?.[0]}</span>
            </div>
            <div className="mile-card card glass">
              <span className="mono mile-count">
                {String(i + 1).padStart(2, '0')} / {String(rooms.length).padStart(2, '0')}
              </span>
              <div className="t-head">
                <h3>{room.title}</h3>
              </div>
              <p className="t-sub">
                {room.meta.role} {period(room) && <span className="t-period">· {period(room)}</span>}
              </p>
              <Metrics value={room.meta.metrics} />
              {room.html && <Html html={room.html} />}
              <PartList portfolio={portfolio} parts={visible(room.parts)} />
              <TechChips tags={list(room.meta.tags)} />
            </div>
          </article>
        ))}
        <div className="mile mile-end">
          <a className="btn" href="#projects">
            See what I built →
          </a>
        </div>
      </ScrollStory>
    </section>
  );
}

function showcase(portfolio: Portfolio, level: Level): ShowcaseProject[] {
  const skillName = (id: string) => portfolio.site.skills.find((s) => s.id === id)?.name ?? id;
  return level.rooms
    .filter((r) => r.meta.tags || r.meta.status)
    .map((room) => {
      const [summary = '', ...rest] = (room.html ?? '').split(/(?<=<\/p>)\n?/);
      return {
        id: room.id,
        title: room.title,
        status: room.meta.status === 'in-progress' ? 'in-progress' : 'complete',
        year: room.meta.year,
        summary,
        body: rest.join(''),
        tags: list(room.meta.tags),
        skills: parseRequires(room.meta.requires).map((r) => skillName(r.skill)),
        uses: uses(room).split(' ').filter(Boolean).map(skillName),
        repo: room.meta.repo,
        demo: room.meta.demo,
        parts: room.parts.map((p) => ({ id: p.id, title: p.title, html: p.html ?? '', did: p.meta.did, learned: p.meta.learned })),
      };
    });
}

function Projects({ portfolio, level, cad }: { portfolio: Portfolio; level: Level; cad: Record<string, string> }) {
  return (
    <section id={level.id} className="section section-wide section-story">
      <ScrollStory title={`My ${level.title}`} number={sectionNumber(level)}>
        <div className="section-head">
          <Intro level={level} />
        </div>
        <ProjectShowcase projects={showcase(portfolio, level)} filters={list(level.meta.filters)} cad={cad} />
      </ScrollStory>
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
      <p className="muted small hint-line">Hover a skill to light up where it was used · click to filter projects.</p>
      <div className="skill-groups">
        {groups.map((group, gi) => (
          <div className="card skill-group glass" key={group} data-reveal style={{ '--i': gi } as React.CSSProperties}>
            <h3>{group}</h3>
            {portfolio.site.skills
              .filter((s) => s.group === group)
              .map((s) => {
                const from = [...new Set(sources.filter((src) => src.skill === s.id).map((src) => src.label.split(' · ')[0]))];
                return (
                  <button
                    className="skill"
                    key={s.id}
                    data-skill={s.id}
                    data-filter={s.name}
                    title={from.length ? `Used in ${from.join(', ')}` : undefined}
                  >
                    <span className="skill-row">
                      <span>{s.name}</span>
                      <span className="muted mono">
                        {levels[s.id]}/{s.max}
                      </span>
                    </span>
                    <span className="skill-bar" aria-label={`Level ${levels[s.id]} of ${s.max}`}>
                      <i style={{ '--v': levels[s.id] / s.max } as React.CSSProperties} />
                    </span>
                    {from.length > 0 && <span className="skill-from">{from.join(' · ')}</span>}
                  </button>
                );
              })}
          </div>
        ))}
      </div>
      {awards && (
        <>
          <h3 className="sub-title" data-reveal>
            Awards &amp; recognition
          </h3>
          <div className="awards">
            {visible(awards.parts).map((a, i) => (
              <div className="flip" key={a.id} tabIndex={0} data-reveal style={{ '--i': i } as React.CSSProperties}>
                <div className="flip-inner">
                  <div className="flip-face card">
                    <span className="trophy" aria-hidden>
                      🏆
                    </span>
                    <b>{a.title}</b>
                    <span className="mono muted">{period(a) || '—'}</span>
                  </div>
                  <div className="flip-face flip-back card">
                    <span className="eyebrow">{a.meta.org}</span>
                    {a.html ? <Html html={a.html} /> : <p>{[a.title, a.meta.org, period(a)].filter(Boolean).join(' · ')}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

const endYear = (p?: string) => (p ? (/present/i.test(p) ? 9999 : Math.max(...(p.match(/\d{4}/g) ?? ['0']).map(Number))) : 0);

function Leadership({ portfolio, level }: { portfolio: Portfolio; level: Level }) {
  const rooms = [...level.rooms].sort((a, b) => endYear(b.meta.period) - endYear(a.meta.period));
  return (
    <section id={level.id} className="section">
      <SectionHead level={level} />
      <div className="grid-2 lead-grid">
        {rooms.map((room, i) => (
          <article className="card role-card glass" key={room.id} id={`${level.id}-${room.id}`} data-reveal style={{ '--i': i } as React.CSSProperties}>
            <div className="t-head">
              <h3>{room.title}</h3>
              <span className="t-period">{room.meta.period}</span>
            </div>
            <p className="t-sub">{room.meta.role}</p>
            <Metrics value={room.meta.metrics} />
            <PartList portfolio={portfolio} parts={visible(room.parts)} />
          </article>
        ))}
      </div>
    </section>
  );
}

function Hobbies({ level }: { level: Level }) {
  const rooms = visible(level.rooms);
  return (
    <section id={level.id} className="section">
      <SectionHead level={level} />
      <div className="bento">
        {rooms.map((room, i) => (
          <article
            className={`card bento-tile glass hobby-${room.id}${room.id === 'xiao-hu' ? ' big' : ''}`}
            key={room.id}
            id={`${level.id}-${room.id}`}
            tabIndex={0}
            data-reveal
            style={{ '--i': i } as React.CSSProperties}
          >
            <HobbyIcon id={room.id} />
            <h3>{room.title}</h3>
            <p className="one-liner">{text(room.html).split(/\n/)[0]}</p>
            {!!list(room.meta.tags).length && (
              <ul className="chips">
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

function Goals({ level }: { level: Level }) {
  const goals = level.rooms;
  const n = goals.length;
  // Points along the arc (SVG viewBox 0 0 1000 360).
  const at = (t: number) => {
    const x = 80 + t * 840;
    const y = 300 - Math.sin(t * Math.PI * 0.9 + 0.1) * 210;
    return { x, y };
  };
  const path = Array.from({ length: 41 }, (_, i) => at(i / 40)).map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  return (
    <section id={level.id} className="section">
      <SectionHead level={level} />
      <div className="orbit" data-orbit={n}>
        <svg viewBox="0 0 1000 360" aria-hidden>
          <defs>
            <linearGradient id="orbit-grad" x1="0" x2="1">
              <stop offset="0" stopColor="var(--violet-2)" />
              <stop offset="1" stopColor="#f0abfc" />
            </linearGradient>
          </defs>
          <path d={path} className="orbit-track" pathLength={1} />
          <path d={path} className="orbit-trail" pathLength={1} />
          <circle className="orbit-marker" r={9} cx={at(0).x} cy={at(0).y} />
        </svg>
        <ol className="goals">
          {goals.map((g, i) => {
            const p = at(n === 1 ? 0.5 : i / (n - 1));
            const plan = (g.html ?? '').trim();
            return (
              <li
                key={g.id}
                className="goal"
                tabIndex={0}
                style={{ '--x': `${p.x / 10}%`, '--y': `${(p.y / 360) * 100}%` } as React.CSSProperties}
              >
                <span className="goal-dot" aria-hidden />
                <span className="goal-title">
                  <span className="mono">{String(i + 1).padStart(2, '0')}</span> {g.title}
                </span>
                <span className="goal-plan">{plan ? <span dangerouslySetInnerHTML={{ __html: inline(plan) }} /> : <span className="muted">Details coming soon.</span>}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function Contact({ portfolio, level }: { portfolio: Portfolio; level: Level }) {
  const form = level.rooms.find((r) => r.id === 'form');
  return (
    <section id={level.id} className="section contact-section section-story">
      <ScrollStory title={level.title} number={sectionNumber(level)}>
      <div className="section-head">
        <Intro level={level} />
      </div>
      <div className="contact-grid">
        <div data-reveal>
          <CopyEmail email={portfolio.site.email} />
          <p className="reply-note">
            <i aria-hidden /> Usually replies within 2 days
          </p>
          <div className="link-list">
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
        <div className="card glass" data-reveal>
          <ContactForm variant="pro" reasons={list(form?.meta.reasons)} success={form?.body ?? ''} email={portfolio.site.email} />
        </div>
      </div>
      </ScrollStory>
    </section>
  );
}

export default function ProSite({
  portfolio,
  github,
  cad = {},
  updated,
}: {
  portfolio: Portfolio;
  github: GitHubFeed;
  cad?: Record<string, string>;
  updated: string;
}) {
  const levels = sectionLevels(portfolio);
  const projects = levelById(portfolio, 'projects');
  const carousel = projects ? showcase(portfolio, projects).map((p) => ({ id: p.id, title: p.title })) : [];
  const render = (level: Level) => {
    switch (level.id) {
      case 'about':
        return <About key={level.id} portfolio={portfolio} level={level} carousel={carousel} cad={cad} />;
      case 'education':
        return <Timeline key={level.id} portfolio={portfolio} level={level} />;
      case 'experience':
        return <Journey key={level.id} portfolio={portfolio} level={level} />;
      case 'projects':
        return <Projects key={level.id} portfolio={portfolio} level={level} cad={cad} />;
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
        return <Hobbies key={level.id} level={level} />;
      case 'future':
        return <Goals key={level.id} level={level} />;
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
      <div className="aurora" aria-hidden>
        <i />
        <i />
        <i />
      </div>
      <div className="spotlight" aria-hidden />
      <NameIntro name={portfolio.site.displayName} />
      <ProHeader
        name={portfolio.site.displayName}
        sections={levels.map((l) => ({ id: l.id, label: l.id === 'trophies' ? 'Skills' : l.title.split(' ')[0] }))}
      />
      <main className="pro">{levels.map(render)}</main>
      <ProFooter site={portfolio.site} updated={updated} />
      <RevealRoot />
    </>
  );
}

import type { GitHubFeed } from '@/lib/github';
import type { ProjectAssets } from '@/lib/load';
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
import CountStat from './CountStat';
import CopyEmail from './CopyEmail';
import ExpandCard from './ExpandCard';
import GitHubPanel from './GitHubPanel';
import { DownloadIcon, GitHubIcon, LinkedInIcon } from './Icons';
import HeroCarousel from './HeroCarousel';
import { HobbyIcon } from './HobbyIcon';
import NameIntro from './Intro';
import ProFooter from './ProFooter';
import ProHeader from './ProHeader';
import ProjectShowcase, { type ShowcaseProject } from './ProjectShowcase';
import RevealRoot from './RevealRoot';
import ScrollStory from './ScrollStory';
import ToastStack from './Toasts';

const NO_CAD: Record<string, string> = {};
import SkillMap, { type SkillTile, type SkillUse } from './SkillMap';

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
        return (
          <div className="metric" key={label}>
            <b>
              <CountStat value={v} />
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
        <li className="chip" key={t}>
          {t}
        </li>
      ))}
    </ul>
  );
}

function About({ portfolio, level, carousel, cad }: { portfolio: Portfolio; level: Level; carousel: { id: string; title: string }[]; cad: Record<string, string> }) {
  const { site } = portfolio;
  const identity = level.rooms.find((r) => r.id === 'identity');
  const currently = level.rooms.find((r) => r.id === 'currently');
  const status = currently?.parts ?? [];
  return (
    <section id={level.id} className="section about-section" aria-labelledby="hero-title">
      <div className="hero">
        <div className="hero-copy">
          <h1 id="hero-title">
            Hi, I&apos;m <span>{site.displayName.split(' ')[0]}.</span>
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
              <DownloadIcon /> Download résumé
            </a>
            <a className="btn" href="#contact">
              Contact me →
            </a>
          </div>
        </div>
        {/* Wireframes only: real CAD exports run to megabytes, too heavy for the first screen. */}
        <HeroCarousel items={carousel} cad={NO_CAD} />
      </div>
      <div id="about-more" className="about-more">
        <ScrollStory title="About Me" number={sectionNumber(level)} variant="mask" caption={level.meta.kicker} steps={2}>
          {/* Pinned: who I am, then what I'm doing now — plain type, no cards. */}
          <div className="about-pin">
            <div className="pin-step about-who" data-step={0}>
              <span className="eyebrow">Who I am</span>
              <Html html={identity?.html} />
              <p className="about-focus mono">{list(level.meta.tags).join('  ·  ')}</p>
            </div>
            {currently && (
              <div className="pin-step about-now" data-step={1}>
                <span className="eyebrow">Currently</span>
                <dl className="currently">
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
        </ScrollStory>
      </div>
    </section>
  );
}

/** Education: "Education" wipes in along a hairline path, then an ascending staircase of schools. */
function Timeline({ level }: { portfolio: Portfolio; level: Level }) {
  // Newest first. Pinned: one row is open at a time, following the scroll (ScrollStory steps).
  const rooms = [...level.rooms].reverse();
  const years = (room: Part) => {
    const p = period(room);
    const ys = p.match(/\d{4}/g) ?? [];
    if (/present/i.test(p)) return `${ys[0]} – now`;
    if (ys.length > 1) return `${ys[0]} – ${ys[1].slice(2)}`;
    return ys[0] ?? 'Secondary';
  };
  return (
    <section id={level.id} className="section section-story">
      <ScrollStory
        title={level.title}
        number={sectionNumber(level)}
        variant="path"
        marks={level.rooms.map((r) => r.meta.short || r.title)}
        steps={rooms.length}
      >
        <div className="edu-rows">
          {rooms.map((room, step) => {
            const parts = visible(room.parts);
            const honours = parts.filter(
              (p) => !p.meta.tags && !p.body && !p.meta.link && /honou?r|scholar|valedict|award|dean|merit|prize/i.test(p.title),
            );
            // Course lists can carry a TODO note and still be worth showing.
            const courses = room.parts.filter((p) => p.meta.tags && /subject|module|core|course/i.test(p.title));
            const courseList = courses.flatMap((c) => list(c.meta.tags));
            // The GPA already shows as the big figure, so its part isn't repeated.
            const also = parts.filter((p) => !honours.includes(p) && !courses.includes(p) && !/^gpa\b/i.test(p.title));
            const [gpa, gpaLabel] = (room.meta.metrics ?? '').split(';')[0].split('|').map((x) => x.trim());
            const panel = `${level.id}-${room.id}-more`;
            return (
              <article key={room.id} id={`${level.id}-${room.id}`} className="edu-row pin-step" data-step={step}>
                {/* Jumps to this school's step (RevealRoot routes in-page links to resting points). */}
                <a className="edu-toggle" href={`#${level.id}-${room.id}`} aria-controls={panel}>
                  <span className="edu-years">{years(room)}</span>
                  <span className="edu-name">
                    <h3>{room.title}</h3>
                    <span className="edu-qual">{room.meta.qualification}</span>
                  </span>
                  <span className="edu-plus" aria-hidden>
                    +
                  </span>
                </a>
                <div className="edu-more" id={panel}>
                  <div>
                    <div className="edu-inner">
                      <div className="edu-side">
                        {gpa && gpaLabel && (
                          <div className="edu-gpa">
                            <b>
                              <CountStat value={gpa} />
                            </b>
                            <span>GPA {gpaLabel.replace(/^GPA\s*/i, '')}</span>
                          </div>
                        )}
                        {honours.length > 0 && (
                          <ul className="honours">
                            {honours.map((h) => (
                              <li key={h.id}>{h.title}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="edu-main">
                        {courseList.length > 0 && (
                          <>
                            <span className="eyebrow">{courses[0].title}</span>
                            <ul className="edu-courses">
                              {courseList.slice(0, 10).map((c) => (
                                <li key={c}>{c}</li>
                              ))}
                              {courseList.length > 10 && <li className="muted">+{courseList.length - 10} more</li>}
                            </ul>
                          </>
                        )}
                        {also.length > 0 && (
                          <p className="edu-also">
                            <span className="eyebrow">Also</span> {also.map((a) => a.title).join(' · ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </ScrollStory>
    </section>
  );
}

/** Sections hidden from Professional mode for now (content stays in portfolio.md and the game). */
const ARCHIVED = new Set(['hobbies', 'future']);

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
  // Most recent first.
  const rooms = [...level.rooms].sort((a, b) => startKey(b.meta.period) - startKey(a.meta.period));
  return (
    <section id={level.id} className="section section-story">
      <ScrollStory title={`My ${level.title}`} number={sectionNumber(level)} variant="rise" horizontal>
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
            <ExpandCard
              interactive
              illuminate
              className="mile-card card glass"
              title={room.title}
              summary={
                <>
                  <span className="mono mile-count">
                    {String(i + 1).padStart(2, '0')} / {String(rooms.length).padStart(2, '0')}
                  </span>
                  <h3>{room.title}</h3>
                  <p className="t-sub">
                    {room.meta.role} {period(room) && <span className="t-period">· {period(room)}</span>}
                  </p>
                  <Metrics value={room.meta.metrics} />
                  {room.html && <Html html={room.html} />}
                  {visible(room.parts).length > 0 && (
                    <ul className="mile-points">
                      {visible(room.parts)
                        .filter((p) => !p.meta.tags)
                        .map((p) => (
                          <li key={p.id}>{p.title}</li>
                        ))}
                    </ul>
                  )}
                  <TechChips tags={list(room.meta.tags)} />
                </>
              }
              details={
                <div className="mile-detail">
                  <span className="eyebrow">{period(room)}</span>
                  <h3>{room.title}</h3>
                  <p className="t-sub">{room.meta.role}</p>
                  <Metrics value={room.meta.metrics} />
                  {room.html && <Html html={room.html} />}
                  <PartList portfolio={portfolio} parts={visible(room.parts)} />
                  <TechChips tags={list(room.meta.tags)} />
                </div>
              }
            />
          </article>
        ))}
      </ScrollStory>
    </section>
  );
}

const MEDIA = ['cad', 'photos', 'diagram', 'blueprint'] as const;

/** Every project (main and supplementary) with its uploaded files; filter by `tier`. */
export function showcase(portfolio: Portfolio, level: Level, assets: Record<string, ProjectAssets> = {}): ShowcaseProject[] {
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
        repo: room.meta.repo,
        demo: room.meta.demo,
        parts: room.parts.map((p) => ({ id: p.id, title: p.title, html: p.html ?? '', did: p.meta.did, learned: p.meta.learned })),
        media: (MEDIA as readonly string[]).includes(room.meta.media ?? '') ? (room.meta.media as ShowcaseProject['media']) : 'blueprint',
        tier: room.meta.tier === 'supplementary' ? 'supplementary' : 'main',
        report: assets[room.id]?.report,
        reportExpected: /^(yes|true)$/i.test(room.meta.report ?? ''),
        photos: assets[room.id]?.photos ?? [],
        blurb: room.meta.summary ?? text(summary),
      } satisfies ShowcaseProject;
    });
}

function Projects({
  portfolio,
  level,
  cad,
  assets,
}: {
  portfolio: Portfolio;
  level: Level;
  cad: Record<string, string>;
  assets: Record<string, ProjectAssets>;
}) {
  const all = showcase(portfolio, level, assets);
  const more = all.filter((p) => p.tier === 'supplementary');
  return (
    <section id={level.id} className="section section-wide section-story">
      <ScrollStory title={level.title} number={sectionNumber(level)} variant="blueprint">
        <div className="section-head">
          <Intro level={level} />
        </div>
        <ProjectShowcase projects={all.filter((p) => p.tier === 'main')} cad={cad} />
        {more.length > 0 && (
          <div className="more-projects" id="projects-more">
            <h3 className="sub-title">More projects</h3>
            <ul className="more-grid">
              {more.map((p) => (
                <li key={p.id} id={`projects-${p.id}`}>
                  <a className="more-card" href={`/projects/${p.id}`}>
                    <span className="mono more-meta">
                      {p.status === 'in-progress' ? 'In progress' : (p.year ?? 'Complete')} · {p.tags.slice(0, 2).join(' · ')}
                    </span>
                    <b>{p.title}</b>
                    <span className="more-blurb">{p.blurb}</span>
                    <span className="more-go">Case study →</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </ScrollStory>
    </section>
  );
}

/** Where each skill was used (rooms that grant or require it) and which skills travel with it. */
function skillTiles(portfolio: Portfolio): SkillTile[] {
  const levels = computeSkills(portfolio, null);
  const sources = skillSources(portfolio);
  const SECTION: Record<string, string> = { education: 'Education', experience: 'Experience', projects: 'Project', leadership: 'Leadership' };
  // skill → room key → use
  const uses = new Map<string, Map<string, SkillUse>>();
  const roomSkills = new Map<string, Set<string>>();
  const add = (skill: string, levelId: string, roomId: string, detail?: string) => {
    const level = levelById(portfolio, levelId);
    const room = level?.rooms.find((r) => r.id === roomId);
    if (!level || !room || !SECTION[levelId]) return;
    const key = `${levelId}/${roomId}`;
    const m = uses.get(skill) ?? new Map<string, SkillUse>();
    const u = m.get(key) ?? {
      section: SECTION[levelId],
      title: room.title,
      detail: [],
      period: period(room) || room.meta.year || undefined,
      // In-page anchor of that role / project / school (opened at its resting state).
      href: `${levelId}-${roomId}`,
    };
    if (detail && !u.detail.includes(detail)) u.detail.push(detail);
    m.set(key, u);
    uses.set(skill, m);
    roomSkills.set(key, (roomSkills.get(key) ?? new Set()).add(skill));
  };
  for (const src of sources) {
    const [levelId, roomId, partId] = src.key.startsWith('build:') ? ['projects', src.key.slice(6)] : src.key.split('/');
    const part = partId ? levelById(portfolio, levelId)?.rooms.find((r) => r.id === roomId)?.parts.find((p) => p.id === partId) : null;
    add(src.skill, levelId, roomId, part?.title);
  }
  for (const room of levelById(portfolio, 'projects')?.rooms ?? [])
    for (const r of parseRequires(room.meta.requires)) add(r.skill, 'projects', room.id);
  return portfolio.site.skills.map((sk) => {
    const co = new Map<string, number>();
    for (const [key, set] of roomSkills)
      if (set.has(sk.id)) for (const other of set) if (other !== sk.id) co.set(other, (co.get(other) ?? 0) + 1);
    return {
      id: sk.id,
      name: sk.name,
      group: sk.group,
      level: levels[sk.id] ?? 0,
      max: sk.max,
      axis: sk.axis ?? null,
      used: [...(uses.get(sk.id)?.values() ?? [])],
      related: [...co].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id),
    };
  });
}

/** Skills & Awards: grid-draw opener, then an interactive treemap and flip-card awards. */
function Skills({ portfolio, level }: { portfolio: Portfolio; level: Level }) {
  const awards = level.rooms.find((r) => r.id === 'awards');
  return (
    <section id={level.id} className="section section-story">
      <ScrollStory title={level.title} number={sectionNumber(level)} variant="grid" steps={awards ? 2 : 1}>
      {/* Pinned: the skills map, then the awards in its place. */}
      <div className="skills-pin">
      <div className="pin-step" data-step={0}>
        <SkillMap skills={skillTiles(portfolio)} />
      </div>
      {awards && (
        <div className="pin-step" data-step={1}>
          <h3 className="sub-title">Awards &amp; Recognition</h3>
          <div className="awards">
            {visible(awards.parts).map((a, i) => (
              <div className="flip" key={a.id} tabIndex={0} style={{ '--i': i } as React.CSSProperties}>
                <div className="flip-inner">
                  <div className="flip-face card">
                    <span className="trophy" aria-hidden>
                      {a.meta.icon || awards.meta.icon || '🏆'}
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
        </div>
      )}
      </div>
      </ScrollStory>
    </section>
  );
}

const endYear = (p?: string) => (p ? (/present/i.test(p) ? 9999 : Math.max(...(p.match(/\d{4}/g) ?? ['0']).map(Number))) : 0);

function Leadership({ portfolio, level }: { portfolio: Portfolio; level: Level }) {
  const rooms = [...level.rooms].sort((a, b) => endYear(b.meta.period) - endYear(a.meta.period));
  return (
    <section id={level.id} className="section">
      <SectionHead level={level} />
      {/* Impact ledger: one ruled row per role, the headline number right-aligned. */}
      <div className="ledger" role="list">
        {rooms.map((room, i) => {
          const parts = visible(room.parts);
          const [metric, metricLabel] = (room.meta.metrics ?? '').split(';')[0].split('|').map((x) => x.trim());
          const m = metric?.match(/^([\d.]+)(.*)$/);
          const years = (room.meta.period ?? '').match(/\d{4}/g) ?? [];
          const yearText = years.length > 1 && years[0] !== years[1] ? `${years[0]} – ${years[1].slice(2)}` : years[0] ?? '';
          return (
            <div role="listitem" key={room.id} id={`${level.id}-${room.id}`} data-reveal style={{ '--i': i } as React.CSSProperties}>
              <ExpandCard
                interactive
                illuminate
                className="ledger-row"
                title={room.title}
                summary={
                  <>
                    <span className="ledger-year mono">
                      {yearText}
                      {/present/i.test(room.meta.period ?? '') && ' – now'}
                    </span>
                    <div className="ledger-main">
                      <h3>{room.title}</h3>
                      <p className="ledger-role">{room.meta.role}</p>
                      <p className="ledger-what">{parts.map((p) => p.title).join(' · ')}</p>
                    </div>
                    <div className="ledger-metric">
                      {m && (
                        <>
                          <b>
                            <CountStat value={metric} />
                          </b>
                          <span>{metricLabel}</span>
                        </>
                      )}
                    </div>
                  </>
                }
                details={
                  <div className="mile-detail">
                    <span className="eyebrow">{room.meta.period}</span>
                    <h3>{room.title}</h3>
                    <p className="t-sub">{room.meta.role}</p>
                    <Metrics value={room.meta.metrics} />
                    <PartList portfolio={portfolio} parts={parts} />
                  </div>
                }
              />
            </div>
          );
        })}
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
      <ScrollStory title={level.title} number={sectionNumber(level)} variant="focus" caption={portfolio.site.email} end>
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
              <LinkedInIcon /> LinkedIn
            </a>
            <a className="btn" href={portfolio.site.github} target="_blank" rel="noopener noreferrer">
              <GitHubIcon /> GitHub
            </a>
            <a className="btn" href={portfolio.site.resume} target="_blank" rel="noopener noreferrer">
              <DownloadIcon /> Résumé (PDF)
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
  assets = {},
  updated,
}: {
  portfolio: Portfolio;
  github: GitHubFeed;
  cad?: Record<string, string>;
  /** Files uploaded per project (public/projects/<id>/). */
  assets?: Record<string, ProjectAssets>;
  updated: string;
}) {
  // Hobbies and Future Goals are archived in Professional mode for now (still in the game).
  // Renumber what's shown so the section numbers stay consecutive (01 … 08).
  const levels = sectionLevels(portfolio)
    .filter((l) => !ARCHIVED.has(l.id))
    .map((l, i) => ({ ...l, meta: { ...l.meta, eyebrow: `${String(i + 1).padStart(2, '0')} / ${l.title}` } }));
  const projects = levelById(portfolio, 'projects');
  const carousel = projects
    ? showcase(portfolio, projects)
        .filter((p) => p.tier === 'main')
        .map((p) => ({ id: p.id, title: p.title }))
    : [];
  const render = (level: Level) => {
    switch (level.id) {
      case 'about':
        return <About key={level.id} portfolio={portfolio} level={level} carousel={carousel} cad={cad} />;
      case 'education':
        return <Timeline key={level.id} portfolio={portfolio} level={level} />;
      case 'experience':
        return <Journey key={level.id} portfolio={portfolio} level={level} />;
      case 'projects':
        return <Projects key={level.id} portfolio={portfolio} level={level} cad={cad} assets={assets} />;
      case 'trophies':
        return <Skills key={level.id} portfolio={portfolio} level={level} />;
      case 'leadership':
        return <Leadership key={level.id} portfolio={portfolio} level={level} />;
      case 'github':
        return (
          <section id={level.id} key={level.id} className="section section-story">
            <ScrollStory title={level.title} number={sectionNumber(level)} variant="mask" caption={level.meta.kicker}>
              <GitHubPanel feed={github} site={portfolio.site} />
            </ScrollStory>
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
      <ToastStack />
      <main className="pro">{levels.map(render)}</main>
      <ProFooter site={portfolio.site} updated={updated} />
      <RevealRoot />
    </>
  );
}

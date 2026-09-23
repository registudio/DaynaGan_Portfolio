'use client';
import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { asset } from '@/lib/urls';
import { tourState, sectionIds, beamCount, combatDestroyed, blueprintBlend } from '@/lib/tour';
import type { TourProps } from './types';
import './tour.css';
const TourCanvas = dynamic(() => import('./TourCanvas'), { ssr: false });
class SceneBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
export function TourExperience({
  site,
  tour,
  sections,
  jobs,
  projects,
  posts,
  feed,
  githubPanel,
  readingPanel,
}: TourProps) {
  const [stage, setStage] = useState(0),
    [local, setLocal] = useState(0),
    [progress, setProgress] = useState(0),
    [selected, setSelected] = useState(0),
    [hangar, setHangar] = useState(-1),
    [hovered, setHovered] = useState(''),
    [reduce, setReduce] = useState(false),
    [systemReduce, setSystemReduce] = useState(false),
    [failed, setFailed] = useState(false),
    [ready, setReady] = useState(false),
    [webgl, setWebgl] = useState(false),
    [modal, setModal] = useState<'reading' | 'github' | 'archives' | null>(null),
    [mobilePanel, setMobilePanel] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null),
    lastStage = useRef(0),
    lastBucket = useRef(-1),
    lastReveal = useRef(-1);
  const screens = useMemo(
    () => ({
      repoNames: feed.repos.map((r) => `${r.name} / ${r.language || '—'}`),
      eventLines: feed.events.map((e) => `${e.type.replace('Event', '')} / ${e.repo.name}`),
      languages: feed.languages,
      education: tour.education,
    }),
    [feed, tour.education],
  );
  const select = useCallback((i: number) => {
    setSelected(i);
    tourState.selected = i;
    setMobilePanel(true);
  }, []);
  const highlight = useCallback((id: string) => {
    setHovered(id);
    tourState.hovered = id;
  }, []);
  const enterHangar = useCallback((i: number) => {
    setHangar(i);
    tourState.hangar = i;
    setSelected(0);
    tourState.selected = 0;
    setMobilePanel(true);
  }, []);
  const leaveHangar = useCallback(() => {
    setHangar(-1);
    tourState.hangar = -1;
  }, []);
  const go = useCallback(
    (id: string) => {
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: tourState.reduced ? 'instant' : 'smooth' });
      highlight('');
    },
    [highlight],
  );
  useEffect(() => {
    const q = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setSystemReduce(q.matches);
    update();
    q.addEventListener('change', update);
    try {
      const c = document.createElement('canvas'),
        gl = c.getContext('webgl2');
      if (gl) {
        setWebgl(true);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      } else setFailed(true);
    } catch {
      setFailed(true);
    }
    const lost = () => setFailed(true);
    window.addEventListener('tour-context-lost', lost);
    return () => {
      q.removeEventListener('change', update);
      window.removeEventListener('tour-context-lost', lost);
    };
  }, []);
  useEffect(() => {
    tourState.reduced = reduce || systemReduce;
    document.documentElement.dataset.motion = tourState.reduced ? 'reduced' : 'full';
  }, [reduce, systemReduce]);
  useEffect(() => {
    let frame = 0;
    const nodes = sectionIds.map((id) => document.getElementById(id)!);
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      let index = 0;
      for (let i = 0; i < nodes.length; i++) if (y + 4 >= nodes[i].offsetTop) index = i;
      const p = Math.min(
        1,
        Math.max(0, (y - nodes[index].offsetTop) / Math.max(1, nodes[index].offsetHeight)),
      );
      const total = Math.min(
        1,
        y / Math.max(1, document.documentElement.scrollHeight - innerHeight),
      );
      tourState.stage = index;
      tourState.local = p;
      tourState.progress = total;
      document.documentElement.style.setProperty(
        '--space-fade',
        String(index > 0 ? 1 : blueprintBlend(p)),
      );
      const bucket = Math.floor(p * 100);
      if (lastStage.current !== index) {
        lastStage.current = index;
        lastBucket.current = -1;
        lastReveal.current = -1;
        setStage(index);
        setSelected(0);
        tourState.selected = 0;
        leaveHangar();
        highlight('');
        setMobilePanel(false);
      }
      const reveal =
        index === 4
          ? Math.max(0, beamCount(p) - 1)
          : index === 5
            ? Math.max(0, combatDestroyed(p) - 1)
            : -1;
      if (reveal !== lastReveal.current) {
        lastReveal.current = reveal;
        if (reveal >= 0) {
          setSelected(reveal);
          tourState.selected = reveal;
          if ((index === 4 && beamCount(p) > 0) || (index === 5 && combatDestroyed(p) > 0))
            setMobilePanel(true);
        }
      }
      if (lastBucket.current !== bucket) {
        lastBucket.current = bucket;
        setLocal(p);
      }
      setProgress(Math.round(total * 100));
    };
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', scroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('resize', scroll);
    };
  }, [leaveHangar, highlight]);
  useEffect(() => {
    if (modal) {
      dialog.current?.showModal();
      const prior = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      tourState.paused = true;
      return () => {
        document.body.style.overflow = prior;
        tourState.paused = false;
      };
    }
    dialog.current?.close();
  }, [modal]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        leaveHangar();
        setMobilePanel(false);
      }
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [leaveHangar]);
  const section = sections[stage - 1],
    activeJob = jobs[hangar >= 0 ? hangar : selected % jobs.length],
    edu = tour.education[selected % tour.education.length],
    activeProject = projects[selected],
    destroyed = combatDestroyed(local),
    beams = beamCount(local);
  const currentId = sectionIds[stage];
  const hot = (id: string, label: string, i: number, click?: () => void) => (
    <button
      key={id}
      className={`spatial-hotspot ${selected === i ? 'is-selected' : ''}`}
      data-hotspot={id}
      aria-label={label}
      onFocus={() => select(i)}
      onMouseEnter={() => select(i)}
      onClick={
        click ||
        (() => {
          select(i);
          setMobilePanel(true);
        })
      }
    >
      <i />
      <span>{label}</span>
    </button>
  );
  const contact = [
    { name: 'Email', detail: site.email, href: `mailto:${site.email}` },
    { name: 'LinkedIn', detail: 'Professional network', href: site.linkedin },
    { name: 'GitHub', detail: 'Code & experiments', href: site.github },
    { name: 'Résumé', detail: 'Download PDF', href: asset(site.resume) },
  ];
  return (
    <div
      className={`tour-root chapter-${stage} ${failed ? 'no-webgl' : ''} ${mobilePanel ? 'panel-expanded' : ''}`}
    >
      <a
        className="skip-link"
        href="#portfolio-reading"
        onClick={(e) => {
          e.preventDefault();
          setModal('reading');
        }}
      >
        Read portfolio without the flight
      </a>
      <div className="tour-backdrop" aria-hidden="true">
        <div className="blueprint-sheet" />
        <div className="space-gradient" />
        <div className="blueprint-ruler ruler-horizontal" />
        <div className="blueprint-ruler ruler-vertical" />
      </div>
      <div className="tour-canvas" aria-label="Interactive guided station tour">
        {webgl && !failed && (
          <SceneBoundary onFailure={() => setFailed(true)}>
            <TourCanvas
              {...screens}
              onReady={() => setReady(true)}
              onHover={highlight}
              onNavigate={go}
              onHangar={enterHangar}
              onSelect={select}
            />
          </SceneBoundary>
        )}
      </div>
      {(!ready || failed) && (
        <div className="loading-station" role="status">
          <span className="loading-ring" />
          {failed
            ? '3D view unavailable · all portfolio content remains accessible'
            : 'Opening the station…'}
          {failed && <button onClick={() => setModal('reading')}>Read portfolio ↗</button>}
        </div>
      )}
      <div className="tour-caption north-west">
        <span className="tiny-label">PORTFOLIO / {site.station}</span>
        <span>
          {site.displayName}
          <b> · {site.location}</b>
        </span>
      </div>
      <div className="tour-caption north-east">
        <span className="tiny-label">
          {stage === 0
            ? 'TECHNICAL SCHEMATIC'
            : hangar >= 0
              ? 'HANGAR INTERIOR'
              : stage === 5 && local > 0.18 && local < 0.88
                ? 'X-WING / PILOT VIEW'
                : 'GHOST / GUIDED FLIGHT'}
        </span>
        <span>
          <i className="signal-dot" />
          {stage === 0 ? 'STATION OVERVIEW' : tour.areas[stage - 1]}
        </span>
      </div>
      <aside className="tour-rail" aria-label="Section navigation">
        <div className="rail-percent">
          {String(progress).padStart(2, '0')}
          <small>%</small>
        </div>
        <div className="rail-line">
          <i style={{ height: `${progress}%` }} />
        </div>
        {site.navigation.map((n, i) => (
          <a
            key={n.id}
            href={`#${n.id}`}
            aria-label={`${n.number} ${n.label}`}
            aria-current={stage === i ? 'location' : undefined}
            onMouseEnter={() => stage === 0 && highlight(n.id)}
            onMouseLeave={() => stage === 0 && highlight('')}
            onFocus={() => stage === 0 && highlight(n.id)}
            onBlur={() => stage === 0 && highlight('')}
          >
            <span>{n.number}</span>
            <i />
            <b>{n.label}</b>
          </a>
        ))}
      </aside>
      <div className="tour-ui" aria-live="off">
        {stage === 0 ? (
          <>
            <div className="blueprint-intro">
              <p className="tiny-label purple">GAN SIM RU DAYNA / COMPUTER ENGINEERING</p>
              <h1>Blueprint</h1>
              <p>{tour.title}</p>
              <small>{tour.intro}</small>
            </div>
            <div className="blueprint-coordinate coord-left">
              ELEVATION / DS–01
              <br />
              11 SECTORS · 8 DESTINATIONS
            </div>
            <div className="blueprint-coordinate coord-right">
              AXIS X / ROTATIONAL SURVEY
              <br />
              {hovered ? 'SECTOR LOCKED' : 'SCAN IN PROGRESS'}
            </div>
            <div className="blueprint-instruction">
              <span className="tiny-label">SELECT A SECTOR OR SCROLL TO ENTER</span>
              <p className="desktop-hint">{tour.blueprintNote}</p>
              <p className="mobile-hint">{tour.mobileNote}</p>
              <a href="#about" className="tour-primary">
                Begin the tour <span>↓</span>
              </a>
            </div>
            {hovered && hovered !== 'blueprint' && (
              <button className="sector-identification" onClick={() => go(hovered)}>
                <span className="tiny-label">SECTOR IDENTIFIED</span>
                <strong>{site.navigation.find((n) => n.id === hovered)?.label}</strong>
                <span>Enter sector ↗</span>
              </button>
            )}
          </>
        ) : (
          <>
            <div className="chapter-title">
              <span className="tiny-label purple">
                {site.navigation[stage]?.number} /{' '}
                {hangar >= 0 ? `DOCK ${String(hangar + 1).padStart(2, '0')}` : 'TOUR DESTINATION'}
              </span>
              <h1>{section?.title}</h1>
              <p>{section?.module}</p>
            </div>
            <div className="spatial-labels">
              {stage === 1 &&
                ['Hardware', 'Software', 'Robotics'].map((l, i) => hot(`core-${i}`, l, i))}
              {stage === 2 && tour.education.map((e, i) => hot(`academy-${i}`, e.short, i))}
              {stage === 3 &&
                (hangar < 0
                  ? jobs.map((j, i) =>
                      hot(`hangar-${i}`, `0${i + 1} / ${j.title}`, i, () => enterHangar(i)),
                    )
                  : activeJob.details.map((_, i) =>
                      hot(`fighter-${i}`, `Report ${String(i + 1).padStart(2, '0')}`, i),
                    ))}
              {stage === 4 &&
                Array.from({ length: 8 }, (_, i) =>
                  hot(
                    `project-${i}`,
                    `${String(i + 1).padStart(2, '0')} ${projects[i]?.title || 'Awaiting project'}`,
                    i,
                    () => {
                      select(i);
                      setMobilePanel(true);
                    },
                  ),
                )}
              {stage === 5 &&
                Array.from({ length: 6 }, (_, i) =>
                  hot(`defense-${i}`, i < 3 ? tour.skills[i].title : tour.awards[i - 3].title, i),
                )}
              {stage === 6 &&
                ['Activity', 'Repositories', 'Languages'].map((l, i) =>
                  hot(`console-${i}`, l, i, () => {
                    select(i);
                    setModal('github');
                  }),
                )}
              {stage === 7 &&
                ['Engineering logs', 'Field notes', 'Archive index'].map((l, i) =>
                  hot(`archive-${i}`, l, i, () => setModal('archives')),
                )}
              {stage === 8 &&
                contact.map((c, i) =>
                  hot(`comlink-${i}`, c.name, i, () => {
                    select(i);
                    setMobilePanel(true);
                  }),
                )}
            </div>
            <button
              className="mobile-panel-toggle"
              onClick={() => setMobilePanel((v) => !v)}
              aria-expanded={mobilePanel}
            >
              {section?.title} <span>{mobilePanel ? '−' : 'Read & explore +'}</span>
            </button>
            <svg
              className="popup-tether"
              aria-hidden="true"
              style={{ display: mobilePanel ? 'block' : 'none' }}
            >
              <path />
            </svg>
            <aside
              className={`tour-panel model-popup ${stage === 2 ? 'education-panel' : ''}`}
              aria-label={`${section?.title} details`}
              hidden={!mobilePanel}
            >
              <button
                className="popup-close"
                aria-label="Close model pop-up"
                onClick={() => setMobilePanel(false)}
              >
                ×
              </button>
              {stage === 1 && (
                <>
                  <span className="tiny-label">THE CENTRAL DRIVE</span>
                  <h2>Dayna Gan</h2>
                  {sections[0].body
                    .trim()
                    .split('\n\n')
                    .slice(0, 1)
                    .map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  <div className="tour-tags">
                    {sections[0].tags.map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                  </div>
                  <button className="tour-text-button" onClick={() => setModal('reading')}>
                    Leadership & community ↗
                  </button>
                </>
              )}
              {stage === 2 && (
                <>
                  <span className="tiny-label">ACADEMY RECORD / {edu.short}</span>
                  <div className="academy-records">
                    {[edu].map((e) => (
                      <button key={e.id} className="selected">
                        <span>{e.short}</span>
                        <strong>{e.title}</strong>
                        <small>{e.qualification}</small>
                        {e.period && <time>{e.period}</time>}
                        <ul>
                          {e.details.map((d) => (
                            <li key={d}>{d}</li>
                          ))}
                        </ul>
                      </button>
                    ))}
                  </div>
                  <p className="panel-hint">Hover or tap a terminal to focus its record.</p>
                </>
              )}
              {stage === 3 && (
                <>
                  {hangar >= 0 && (
                    <button className="tour-text-button" onClick={leaveHangar}>
                      ← Return to the trench
                    </button>
                  )}
                  <span className="tiny-label">
                    {hangar >= 0 ? 'DEPLOYMENT DEBRIEF' : 'SELECT A HANGAR'}
                  </span>
                  {hangar < 0 ? (
                    <>
                      <h2>{activeJob.title}</h2>
                      <p className="purple">{activeJob.role}</p>
                      <p>{activeJob.summary}</p>
                      <time>{activeJob.period}</time>
                      <button className="tour-primary" onClick={() => enterHangar(selected)}>
                        Enter this hangar ↗
                      </button>
                    </>
                  ) : (
                    <>
                      <h2>{activeJob.title}</h2>
                      <p className="purple">{activeJob.role}</p>
                      <time>{activeJob.period}</time>
                      <p>{activeJob.summary}</p>
                      <div className="report-highlight">
                        <span className="tiny-label">
                          FIGHTER / REPORT {String(selected + 1).padStart(2, '0')}
                        </span>
                        <p>{activeJob.details[selected % activeJob.details.length]}</p>
                      </div>
                      <div className="report-tabs">
                        {activeJob.details.map((_, i) => (
                          <button
                            key={i}
                            className={selected === i ? 'selected' : ''}
                            onClick={() => select(i)}
                            aria-label={`Read report ${i + 1}`}
                          >
                            {String(i + 1).padStart(2, '0')}
                          </button>
                        ))}
                      </div>
                      <div className="tour-tags">
                        {activeJob.technologies.map((t) => (
                          <span key={t}>{t}</span>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
              {stage === 4 && (
                <>
                  <span className="tiny-label">SUPERLASER / {beams} OF 8 GENERATORS ONLINE</span>
                  <div className="beam-status">
                    {Array.from({ length: 8 }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => select(i)}
                        data-lit={i < beams}
                        className={selected === i ? 'selected' : ''}
                        aria-label={`Project generator ${i + 1}`}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                  <h2>
                    {activeProject?.title ||
                      `Project slot ${String(selected + 1).padStart(2, '0')}`}
                  </h2>
                  <p>{activeProject?.summary || tour.projectNote}</p>
                  {activeProject ? (
                    <>
                      <div className="tour-tags">
                        {activeProject.technologies.map((t) => (
                          <span key={t}>{t}</span>
                        ))}
                      </div>
                      <Link className="tour-primary" href={`/projects/${activeProject.slug}`}>
                        Open case study ↗
                      </Link>
                    </>
                  ) : (
                    <span className="awaiting-label">TODO / PROJECT CONTENT PENDING</span>
                  )}
                  <p className="panel-hint">
                    Scroll to ignite the eight sub-beams clockwise. All converge at a single focal
                    point.
                  </p>
                  {local > 0.83 && <strong className="laser-status">MAIN BEAM / FIRING</strong>}
                </>
              )}
              {stage === 5 && (
                <>
                  <span className="tiny-label">
                    {local < 0.18
                      ? 'DEFENSE SYSTEMS'
                      : local < 0.88
                        ? 'X-WING / ATTACK RUN'
                        : 'SECTOR CLEARED'}{' '}
                    · {destroyed}/6
                  </span>
                  <h2>
                    {selected < 3 ? tour.skills[selected]?.title : tour.awards[selected - 3]?.title}
                  </h2>
                  {selected < 3 ? (
                    <div className="tour-tags">
                      {tour.skills[selected]?.items.map((t) => (
                        <span key={t}>{t}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="purple">{tour.awards[selected - 3]?.period}</p>
                  )}
                  <div className="defense-records">
                    {[...tour.skills.map((s) => s.title), ...tour.awards.map((a) => a.title)].map(
                      (t, i) => (
                        <button
                          key={t}
                          onClick={() => select(i)}
                          className={selected === i ? 'selected' : ''}
                        >
                          <span>{i < destroyed ? '✓' : i < 3 ? '⌖' : '◇'}</span>
                          {t}
                          <small>{i < 3 ? 'SKILL BATTERY' : 'AWARD SHIELD'}</small>
                        </button>
                      ),
                    )}
                  </div>
                  <p className="panel-hint">{tour.combatNote}</p>
                  {destroyed === 6 && (
                    <p className="purple">All records revealed. Continue to the Overbridge ↓</p>
                  )}
                </>
              )}
              {stage === 6 && (
                <>
                  <span className="tiny-label">
                    LIVE DEVELOPMENT / {feed.status === 'online' ? 'LINK ACTIVE' : 'LINK OFFLINE'}
                  </span>
                  <h2>
                    {selected === 0
                      ? 'Activity display'
                      : selected === 1
                        ? 'Repository console'
                        : 'Language systems'}
                  </h2>
                  {selected === 2 ? (
                    <div className="tour-tags">
                      {feed.languages.map((l) => (
                        <span key={l}>{l}</span>
                      ))}
                    </div>
                  ) : selected === 0 ? (
                    <div className="live-repos">
                      {feed.events.length ? (
                        feed.events.map((e) => (
                          <a
                            key={e.id}
                            href={`https://github.com/${e.repo.name}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <strong>
                              {e.type.replace('Event', '')} / {e.repo.name} ↗
                            </strong>
                            <small>{e.created_at.slice(0, 10)}</small>
                          </a>
                        ))
                      ) : (
                        <p>No recent public events are available.</p>
                      )}
                    </div>
                  ) : (
                    <div className="live-repos">
                      {feed.repos.slice(0, 4).map((r) => (
                        <a key={r.name} href={r.html_url} target="_blank" rel="noreferrer">
                          <strong>{r.name} ↗</strong>
                          <small>
                            {r.language} / ☆ {r.stargazers_count}
                          </small>
                        </a>
                      ))}
                    </div>
                  )}
                  {feed.status === 'offline' && (
                    <p>
                      Live feed temporarily offline. <a href={site.github}>View GitHub ↗</a>
                    </p>
                  )}
                  <button className="tour-primary" onClick={() => setModal('github')}>
                    Open full telemetry ↗
                  </button>
                  <p className="panel-hint">
                    Public GitHub data. Server cached and refreshed after one hour.
                  </p>
                </>
              )}
              {stage === 7 && (
                <>
                  <span className="tiny-label">SECTOR ARCHIVES / ENGINEERING LOGS</span>
                  <h2>
                    {posts.length
                      ? `${posts.length} transmissions stored`
                      : 'The next transmission is coming.'}
                  </h2>
                  {posts.length ? (
                    posts.map((p, i) => (
                      <Link className="log-link" key={p.slug} href={`/blog/${p.slug}`}>
                        <span>LOG {String(i + 1).padStart(3, '0')}</span>
                        <strong>{p.title}</strong>
                        <small>{p.date}</small>
                      </Link>
                    ))
                  ) : (
                    <>
                      <p>{sections.find((s) => s.id === 'blog')?.body.trim()}</p>
                      <span className="awaiting-label">TODO / FIELD NOTES PENDING</span>
                    </>
                  )}
                  <button className="tour-text-button" onClick={() => setModal('archives')}>
                    Enter the archive screen ↗
                  </button>
                </>
              )}
              {stage === 8 && (
                <>
                  <span className="tiny-label">COMLINK ARRAY / OPEN CHANNEL</span>
                  <h2>Let’s connect.</h2>
                  <p>{sections.find((s) => s.id === 'contact')?.body.trim()}</p>
                  <div className="comlink-list">
                    {contact.map((c, i) => (
                      <a
                        key={c.name}
                        className={selected === i ? 'selected' : ''}
                        href={c.href}
                        {...(i ? { target: '_blank', rel: 'noreferrer' } : {})}
                        onMouseEnter={() => select(i)}
                      >
                        <span>0{i + 1}</span>
                        <div>
                          <strong>{c.name}</strong>
                          <small>{c.detail}</small>
                        </div>
                        <b>↗</b>
                      </a>
                    ))}
                  </div>
                  <a href="#blueprint" className="tour-text-button">
                    Return to the blueprint ↑
                  </a>
                </>
              )}
            </aside>
          </>
        )}
      </div>
      <div className="tour-south">
        <span className="tour-location">
          <i />{' '}
          {stage === 0
            ? 'BLUEPRINT MODE'
            : hangar >= 0
              ? 'EXPLORING THE HANGAR'
              : 'TOUR IN PROGRESS'}{' '}
          <b>{stage === 0 ? 'X-AXIS ROTATION' : tour.ghostNote}</b>
        </span>
        <div>
          <button onClick={() => setModal('reading')}>Read portfolio</button>
          <button
            aria-pressed={reduce || systemReduce}
            disabled={systemReduce}
            onClick={() => setReduce((v) => !v)}
          >
            {reduce || systemReduce ? 'Motion off' : 'Motion on'} <span>◉</span>
          </button>
        </div>
      </div>
      <main className="flight-scroll" aria-label="Scroll-driven tour destinations">
        {site.navigation.map((n, i) => (
          <section
            id={n.id}
            data-flight-section={i}
            key={n.id}
            aria-label={n.label}
            style={{ height: `${i === 4 || i === 5 ? 260 : i === 3 ? 210 : 155}svh` }}
          >
            <span className="sr-only">
              {n.label} — {n.caption}
            </span>
          </section>
        ))}
      </main>
      <dialog
        ref={dialog}
        className="tour-dialog"
        id="portfolio-reading"
        onCancel={() => setModal(null)}
        onClick={(e) => {
          if (e.target === dialog.current) setModal(null);
        }}
        aria-label={
          modal === 'github'
            ? 'GitHub telemetry'
            : modal === 'archives'
              ? 'Engineering archives'
              : 'Portfolio reading view'
        }
      >
        <div className="dialog-bar">
          <span>
            {modal === 'github'
              ? 'THE OVERBRIDGE / TELEMETRY'
              : modal === 'archives'
                ? 'SECTOR ARCHIVES'
                : 'DAYNA GAN / PORTFOLIO'}
          </span>
          <button onClick={() => setModal(null)} aria-label="Close reading view">
            Close ×
          </button>
        </div>
        {modal === 'github' ? (
          githubPanel
        ) : modal === 'archives' ? (
          <div className="archive-reading">
            <h2>Blog</h2>
            {posts.length ? (
              posts.map((p) => (
                <Link key={p.slug} className="log-link" href={`/blog/${p.slug}`}>
                  <strong>{p.title}</strong>
                  <p>{p.summary}</p>
                </Link>
              ))
            ) : (
              <>
                <p>There are no published logs yet.</p>
                <p className="awaiting-label">TODO / REAL FIELD NOTES WILL APPEAR HERE</p>
              </>
            )}
          </div>
        ) : (
          readingPanel
        )}
      </dialog>
      <noscript>
        <style>{`.tour-dialog:not([open]){display:block;position:relative;margin:30px auto;max-height:none;z-index:40}.flight-scroll{display:none}.tour-canvas,.tour-ui,.tour-rail,.tour-caption,.tour-south,.loading-station{display:none}`}</style>
      </noscript>
    </div>
  );
}

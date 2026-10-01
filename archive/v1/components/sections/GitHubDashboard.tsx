'use client';
import { useMemo, useState } from 'react';
import type { GitHubFeed } from '@/lib/github';
import { asset } from '@/lib/urls';

type Pin = {
  live: boolean;
  name: string;
  description: string;
  language: string;
  href: string;
  stars?: number;
  forks?: number;
};
type Fallback = {
  slug: string;
  title: string;
  summary: string;
  technologies: string[];
  github?: string | null;
};

const LANGUAGE_COLOURS: Record<string, string> = {
  Python: '#b794f6',
  'C++': '#e879f9',
  C: '#a78bfa',
  TypeScript: '#818cf8',
  JavaScript: '#f0abfc',
  Java: '#c084fc',
  Verilog: '#d8b4fe',
  'Jupyter Notebook': '#e9d5ff',
};

const VERBS: Record<string, (e: GitHubFeed['events'][number]) => string> = {
  PushEvent: (e) => {
    const n = e.payload?.commits?.length ?? 1;
    return `Pushed ${n} commit${n === 1 ? '' : 's'} to`;
  },
  CreateEvent: (e) =>
    `Created ${e.payload?.ref_type ?? 'repository'}${e.payload?.ref ? ` ${e.payload.ref}` : ''} in`,
  PullRequestEvent: (e) =>
    `${e.payload?.action === 'closed' ? 'Closed' : 'Opened'} a pull request in`,
  IssuesEvent: (e) => `${e.payload?.action === 'closed' ? 'Closed' : 'Opened'} an issue in`,
  WatchEvent: () => 'Starred',
  ForkEvent: () => 'Forked',
  PublicEvent: () => 'Made public',
};

function Calendar({ feed }: { feed: GitHubFeed }) {
  const { weeks, max, total } = useMemo(() => {
    // Build 53 week columns ending on the fetch date, padded so columns start on Sunday.
    const end = new Date(feed.fetchedAt.slice(0, 10) + 'T00:00:00Z');
    const counts = new Map(feed.activity.map((d) => [d.date, d.count]));
    const days: { date: string; count: number }[] = [];
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 52 * 7 - end.getUTCDay());
    for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const date = d.toISOString().slice(0, 10);
      days.push({ date, count: counts.get(date) ?? 0 });
    }
    const weeks = Array.from({ length: Math.ceil(days.length / 7) }, (_, i) =>
      days.slice(i * 7, i * 7 + 7),
    );
    const max = Math.max(1, ...days.map((d) => d.count));
    return { weeks, max, total: days.reduce((sum, d) => sum + d.count, 0) };
  }, [feed]);

  const heading =
    feed.activitySource === 'calendar'
      ? `${feed.totalContributions ?? total} contributions in the last year`
      : feed.activitySource === 'events'
        ? `${total} public events in the last 90 days`
        : 'Contribution activity';

  return (
    <div className="gh-calendar">
      <h4>{heading}</h4>
      <div className="gh-calendar-scroll">
        <div className="gh-grid" role="img" aria-label={heading}>
          {weeks.map((week, i) => (
            <div key={i} className="gh-week">
              {week.map((d) => (
                <span
                  key={d.date}
                  title={`${d.count} on ${d.date}`}
                  data-level={d.count === 0 ? 0 : Math.max(1, Math.ceil((d.count / max) * 4))}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="gh-legend">
        <span>
          {feed.activitySource === 'events'
            ? 'Recent public events only. A GitHub token at build time shows the full calendar.'
            : feed.activitySource === 'none'
              ? 'Activity updates on the next daily rebuild.'
              : 'Public and private contribution counts.'}
        </span>
        <span className="gh-scale" aria-hidden="true">
          Less <i data-level="0" /> <i data-level="1" /> <i data-level="2" /> <i data-level="3" />{' '}
          <i data-level="4" /> More
        </span>
      </div>
    </div>
  );
}

export function GitHubDashboard({
  feed,
  profileUrl,
  username,
  displayName,
  location,
  projects,
}: {
  feed: GitHubFeed;
  profileUrl: string;
  username: string;
  displayName: string;
  location: string;
  projects: Fallback[];
}) {
  const [tab, setTab] = useState<'overview' | 'repositories'>('overview');
  const online = feed.status === 'online';
  const pins: Pin[] =
    online && feed.repos.length
      ? feed.repos.map((r) => ({
          name: r.name,
          description: r.description ?? 'No description yet.',
          language: r.language ?? 'Repository',
          live: true,
          href: r.html_url,
          stars: r.stargazers_count,
          forks: r.forks_count,
        }))
      : projects.map((p) => ({
          name: p.slug,
          description: p.summary,
          language: p.technologies[0] ?? 'Project',
          live: false,
          href: p.github ?? asset(`/projects/${p.slug}/`),
        }));

  const pinCard = (p: Pin) => (
    <a
      key={p.name}
      className="gh-pin"
      href={p.href}
      {...(p.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
    >
      <span className="gh-pin-name">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.71 1.71.75.75 0 0 1-1.07 1.05A2.5 2.5 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.71A2.5 2.5 0 0 1 4.5 9h8Z" />
        </svg>
        {p.name}
        <em>{p.live ? 'Public' : 'Portfolio'}</em>
      </span>
      <span className="gh-pin-desc">{p.description}</span>
      <span className="gh-pin-meta">
        <span>
          <i style={{ background: LANGUAGE_COLOURS[p.language] ?? '#a78bfa' }} />
          {p.language}
        </span>
        {p.stars !== undefined && <span>☆ {p.stars}</span>}
        {p.forks !== undefined && <span>⑂ {p.forks}</span>}
      </span>
    </a>
  );

  return (
    <div className="gh-window" data-reveal>
      <div className="gh-chrome">
        <span className="gh-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="gh-url">github.com/{username}</span>
        <a href={profileUrl} target="_blank" rel="noreferrer" aria-label="Open GitHub profile">
          ↗
        </a>
      </div>
      {!online && (
        <p className="gh-banner">
          GitHub data couldn't be loaded when this page was built — showing portfolio projects
          instead. It updates on the next daily rebuild.
        </p>
      )}
      <div className="gh-body">
        <aside className="gh-profile">
          {feed.profile ? (
            <img
              className="gh-avatar"
              src={feed.profile.avatar_url}
              alt=""
              width={260}
              height={260}
            />
          ) : (
            <span className="gh-avatar gh-avatar-initials" aria-hidden="true">
              DG
            </span>
          )}
          <h3>
            {feed.profile?.name ?? displayName}
            <span>{username}</span>
          </h3>
          {feed.profile?.bio && <p>{feed.profile.bio}</p>}
          <a className="gh-follow" href={profileUrl} target="_blank" rel="noreferrer">
            Follow
          </a>
          {feed.profile && (
            <p className="gh-social">
              <strong>{feed.profile.followers}</strong> followers ·{' '}
              <strong>{feed.profile.following}</strong> following
            </p>
          )}
          <p className="gh-location">⌖ {location}</p>
          {feed.profile && (
            <dl className="gh-stats">
              <div>
                <dt>Repos</dt>
                <dd>{feed.profile.public_repos}</dd>
              </div>
              <div>
                <dt>Stars</dt>
                <dd>{feed.totalStars}</dd>
              </div>
              <div>
                <dt>Followers</dt>
                <dd>{feed.profile.followers}</dd>
              </div>
            </dl>
          )}
          {feed.languageStats.length > 0 && (
            <div className="gh-languages">
              <h4 className="gh-subhead">Languages</h4>
              <span className="gh-language-bar" aria-hidden="true">
                {feed.languageStats.map((l) => (
                  <i
                    key={l.name}
                    style={{
                      width: `${l.share * 100}%`,
                      background: LANGUAGE_COLOURS[l.name] ?? '#a78bfa',
                    }}
                  />
                ))}
              </span>
              <ul>
                {feed.languageStats.slice(0, 6).map((l) => (
                  <li key={l.name}>
                    <i style={{ background: LANGUAGE_COLOURS[l.name] ?? '#a78bfa' }} />
                    {l.name} <span>{Math.round(l.share * 100)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
        <div className="gh-main">
          <div className="gh-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={tab === 'overview'}
              onClick={() => setTab('overview')}
            >
              Overview
            </button>
            <button
              role="tab"
              aria-selected={tab === 'repositories'}
              onClick={() => setTab('repositories')}
            >
              Repositories{' '}
              <span className="gh-count">{feed.profile?.public_repos ?? pins.length}</span>
            </button>
          </div>
          {tab === 'overview' ? (
            <>
              <h4 className="gh-subhead">{online ? 'Pinned repositories' : 'Pinned'}</h4>
              <div className="gh-pins">{pins.slice(0, 6).map(pinCard)}</div>
              <Calendar feed={feed} />
              {feed.events.length > 0 && (
                <div className="gh-activity">
                  <h4 className="gh-subhead">Recent commits & activity</h4>
                  <ol>
                    {feed.events.map((e) => (
                      <li key={e.id}>
                        <span className="gh-activity-dot" aria-hidden="true" />
                        <span>
                          {(VERBS[e.type] ?? (() => e.type.replace('Event', '')))(e)}{' '}
                          <a
                            href={`https://github.com/${e.repo.name}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {e.repo.name}
                          </a>
                          {e.payload?.commits?.[0] && (
                            <q>{e.payload.commits[0].message.split('\n')[0]}</q>
                          )}
                        </span>
                        <time dateTime={e.created_at}>{e.created_at.slice(0, 10)}</time>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </>
          ) : (
            <ul className="gh-repos">
              {pins.map((p) => (
                <li key={p.name}>{pinCard(p)}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <p className="gh-footnote">
        {online ? 'Snapshot' : 'Last attempt'} {feed.fetchedAt.slice(0, 16).replace('T', ' ')} UTC ·
        rebuilt daily
      </p>
    </div>
  );
}

import type { GitHubFeed } from '@/lib/github';
import type { Site } from '@/lib/portfolio';
import { heatLevel } from '@/game/engine/heat';
import CountStat from './CountStat';

const ago = (iso: string, now: number) => {
  const d = Math.max(0, now - Date.parse(iso)) / 86400000;
  if (d < 1) return 'today';
  if (d < 2) return 'yesterday';
  if (d < 30) return `${Math.floor(d)}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
};

/** Compact GitHub section: counters, a heatmap that fills in as a wave, pinned repos and a terminal commit log. */
export default function GitHubPanel({ feed, site }: { feed: GitHubFeed; site: Site }) {
  if (feed.status === 'offline')
    return (
      <div className="card">
        <p className="mono" style={{ marginTop: 0 }}>
          LIVE FEED TEMPORARILY OFFLINE
        </p>
        <a className="btn" href={site.github} target="_blank" rel="noopener noreferrer">
          View GitHub profile →
        </a>
      </div>
    );
  const now = Date.parse(feed.fetchedAt);
  const max = Math.max(1, ...feed.activity.map((d) => d.count));
  const stats = [
    { n: feed.profile?.public_repos ?? 0, label: 'public repos' },
    { n: feed.totalContributions ?? feed.activity.reduce((a, d) => a + d.count, 0), label: feed.totalContributions != null ? 'contributions in the last year' : 'recent public events' },
    { n: feed.totalStars, label: 'stars' },
    { n: feed.languages.length, label: 'languages' },
  ];
  return (
    <div className="gh card glass" data-reveal>
      <div className="gh-overview">
      <div className="gh-top">
        <a className="gh-handle mono" href={site.github} target="_blank" rel="noopener noreferrer">
          @{feed.profile?.login} ↗
        </a>
        <div className="gh-stats">
          {stats.map((s) => (
            <div key={s.label}>
              <b>
                <CountStat value={String(s.n)} />
              </b>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Same layout as GitHub's graph: a column per week, Sunday at the top. */}
      <div className="heat wave" role="img" aria-label={`Contribution activity, ${feed.activity.reduce((a, d) => a + d.count, 0)} contributions`}>
        {Array.from({ length: feed.activity.length ? new Date(feed.activity[0].date + 'T00:00:00Z').getUTCDay() : 0 }, (_, k) => (
          <i key={`pad-${k}`} className="pad" aria-hidden />
        ))}
        {feed.activity.map((d, i) => (
          <i key={d.date} data-l={heatLevel(d.count, max)} title={`${d.date}: ${d.count}`} style={{ '--c': Math.floor(i / 7) } as React.CSSProperties} />
        ))}
      </div>
      </div>
      <div className="gh-cols">
        <div>
          <h3 className="gh-h">{feed.pinnedSource === 'pinned' ? 'Pinned repositories' : 'Top repositories'}</h3>
          <ul className="repo-cards">
            {feed.pinned.map((r) => (
              <li key={r.name}>
                <a href={r.url} target="_blank" rel="noopener noreferrer">
                  {r.name}
                </a>
                <span className="muted mono small">
                  {r.stars ? `★ ${r.stars} · ` : ''}
                  updated {ago(r.updatedAt, now)}
                </span>
                {r.description && <p>{r.description}</p>}
                {r.languages.length > 0 && (
                  <>
                    <span className="lang-bar" aria-hidden>
                      {r.languages.map((l) => (
                        <i key={l.name} style={{ flexGrow: l.share, background: l.color }} />
                      ))}
                    </span>
                    <span className="lang-legend small">
                      {r.languages.slice(0, 3).map((l) => (
                        <span key={l.name}>
                          <i style={{ background: l.color }} /> {l.name} {Math.round(l.share * 100)}%
                        </span>
                      ))}
                    </span>
                  </>
                )}
              </li>
            ))}
            {!feed.pinned.length && <li className="muted">No public repositories yet.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

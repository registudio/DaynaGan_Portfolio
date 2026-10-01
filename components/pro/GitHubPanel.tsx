import { activityLog } from '@/lib/activity';
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
  const commits = activityLog(feed.events);
  const stats = [
    { n: feed.profile?.public_repos ?? 0, label: 'public repos' },
    { n: feed.totalContributions ?? feed.activity.reduce((a, d) => a + d.count, 0), label: feed.totalContributions != null ? 'contributions this year' : 'recent public events' },
    { n: feed.totalStars, label: 'stars' },
    { n: feed.languages.length, label: 'languages' },
  ];
  return (
    <div className="gh card glass pin-stack" data-reveal>
      {/* Steps of the pinned GitHub section: overview → repositories → activity. */}
      <div className="pin-step gh-overview" data-step={0}>
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
      <div className="heat wave" aria-label="Contribution activity">
        {feed.activity.map((d, i) => (
          <i key={d.date} data-l={heatLevel(d.count, max)} title={`${d.date}: ${d.count}`} style={{ '--c': Math.floor(i / 7) } as React.CSSProperties} />
        ))}
      </div>
      </div>
      <div className="gh-cols">
        <div className="pin-step" data-step={1}>
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
        <div className="pin-step" data-step={2}>
          <h3 className="gh-h">Recent activity</h3>
          <div className="terminal" role="log" aria-label="Recent GitHub activity">
            <div className="term-bar" aria-hidden>
              <i />
              <i />
              <i />
              <span className="mono">git log --oneline</span>
            </div>
            <ol className="term-lines">
              {commits.map((c, i) => (
                <li key={c.id} style={{ '--i': i } as React.CSSProperties}>
                  <span className="t-hash">{/^[0-9a-f]{7,}$/i.test(c.sha) ? c.sha.slice(0, 7) : c.sha.slice(-7)}</span>{' '}
                  <span className="t-repo">{c.repo}</span> <span className="t-msg">{c.message}</span>{' '}
                  <span className="t-when">{ago(c.at, now)}</span>
                </li>
              ))}
              {!commits.length && <li className="t-when">No recent public activity.</li>}
              <li className="t-cursor" aria-hidden>
                $ <i />
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

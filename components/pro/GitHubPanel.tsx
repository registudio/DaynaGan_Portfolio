import type { GitHubFeed } from '@/lib/github';
import type { Site } from '@/lib/portfolio';
import { heatLevel } from '@/game/engine/heat';


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
  const max = Math.max(1, ...feed.activity.map((d) => d.count));
  const commits = feed.events
    .filter((e) => e.type === 'PushEvent')
    .flatMap((e) => (e.payload?.commits ?? []).map((c) => ({ repo: e.repo.name, message: c.message, at: e.created_at })))
    .slice(0, 6);
  return (
    <div className="gh-grid">
      <div className="card" style={{ gridColumn: '1 / -1' }} data-reveal>
        <div className="t-head">
          <h3 style={{ margin: 0, fontSize: 18 }}>
            <a href={site.github} target="_blank" rel="noopener noreferrer">
              @{feed.profile?.login}
            </a>
          </h3>
          <span className="t-period">
            {feed.profile?.public_repos} repos · {feed.totalStars} stars
            {feed.totalContributions != null && ` · ${feed.totalContributions} contributions this year`}
          </span>
        </div>
        <div style={{ height: 14 }} />
        <div className="heat" aria-label="Contribution activity">
          {feed.activity.map((d) => (
            <i key={d.date} data-l={heatLevel(d.count, max)} title={`${d.date}: ${d.count}`} />
          ))}
        </div>
        {feed.activitySource === 'events' && (
          <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>
            Recent public activity.
          </p>
        )}
      </div>
      <div className="card" data-reveal>
        <h3 style={{ marginTop: 0, fontSize: 18 }}>Repositories</h3>
        <ul className="repo-list">
          {feed.repos.map((r) => (
            <li key={r.name}>
              <a href={r.html_url} target="_blank" rel="noopener noreferrer">
                {r.name}
              </a>
              <div className="muted" style={{ fontSize: 14 }}>
                {[r.language, r.stargazers_count ? `★ ${r.stargazers_count}` : '', r.description].filter(Boolean).join(' · ')}
              </div>
            </li>
          ))}
          {!feed.repos.length && <li className="muted">No public repositories yet.</li>}
        </ul>
      </div>
      <div className="card" data-reveal>
        <h3 style={{ marginTop: 0, fontSize: 18 }}>Recent commits</h3>
        <ul className="commit-list">
          {commits.map((c, i) => (
            <li key={i}>
              <span>{c.message.split('\n')[0]}</span>
              <span className="muted mono" style={{ fontSize: 12.5 }}>
                {c.repo.split('/')[1]} · {c.at.slice(0, 10)}
              </span>
            </li>
          ))}
          {!commits.length && <li className="muted">No recent public commits.</li>}
        </ul>
        {feed.languageStats.length > 0 && (
          <>
            <h3 style={{ fontSize: 18 }}>Languages</h3>
            <ul className="chips">
              {feed.languageStats.map((l) => (
                <li className="chip" key={l.name}>
                  {l.name} {Math.round(l.share * 100)}%
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

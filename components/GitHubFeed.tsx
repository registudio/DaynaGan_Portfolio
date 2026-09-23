import type { GitHubFeed as Feed } from '@/lib/github';
export function GitHubFeed({ feed, profile }: { feed: Feed; profile: string }) {
  return (
    <div className="terminal">
      <div className="terminal-bar">
        <span>
          <i className={feed.status === 'online' ? 'status-dot' : 'status-dot offline'} /> GITHUB /
          PUBLIC TELEMETRY
        </span>
        <a href={profile} target="_blank" rel="noreferrer" aria-label="View Dayna’s GitHub profile">
          ↗
        </a>
      </div>
      {feed.status === 'offline' ? (
        <div className="terminal-empty">
          <span className="mono">LIVE FEED TEMPORARILY OFFLINE</span>
          <p>The station is online. Its GitHub connection will retry at the next refresh.</p>
          <a className="text-link" href={profile} target="_blank" rel="noreferrer">
            View GitHub profile ↗
          </a>
        </div>
      ) : (
        <>
          <div className="activity">
            <div className="small-label">RECENT PUBLIC EVENT ACTIVITY / 12 WEEKS</div>
            <div className="activity-grid" aria-label="Public GitHub events by day">
              {feed.activity.map((day) => (
                <span
                  key={day.date}
                  title={`${day.date}: ${day.count} public events`}
                  data-level={Math.min(day.count, 3)}
                />
              ))}
            </div>
            <p className="data-note">
              Based on up to 100 recent public events. This is not a complete contribution history.
            </p>
          </div>
          <div className="repo-list">
            {feed.repos.length ? (
              feed.repos.map((repo) => (
                <a
                  key={repo.name}
                  className="repo"
                  href={repo.html_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <div>
                    <h3>
                      {repo.name} <span>↗</span>
                    </h3>
                    <p>{repo.description || 'View repository on GitHub.'}</p>
                    <div className="repo-meta">
                      <span>{repo.language || 'Repository'}</span>
                      <span>☆ {repo.stargazers_count}</span>
                      <span>⑂ {repo.forks_count}</span>
                      <time dateTime={repo.updated_at}>Updated {repo.updated_at.slice(0, 10)}</time>
                    </div>
                  </div>
                </a>
              ))
            ) : (
              <p className="empty-copy">No public repositories to display yet.</p>
            )}
          </div>
          {feed.languages.length > 0 && (
            <div className="language-list">
              <span className="small-label">LANGUAGE SYSTEMS</span>
              <div className="tags">
                {feed.languages.map((l) => (
                  <span key={l}>{l}</span>
                ))}
              </div>
            </div>
          )}
          {feed.events.length > 0 && (
            <div className="transmissions">
              <span className="small-label">RECENT TRANSMISSIONS</span>
              {feed.events.map((e) => (
                <div key={e.id}>
                  <span>{e.type.replace('Event', '')}</span>
                  <a href={`https://github.com/${e.repo.name}`} target="_blank" rel="noreferrer">
                    {e.repo.name}
                  </a>
                  <time dateTime={e.created_at}>{e.created_at.slice(5, 10)}</time>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <div className="terminal-footer">
        {feed.status === 'online' ? 'SNAPSHOT' : 'LAST ATTEMPT'} /{' '}
        {feed.fetchedAt.slice(0, 16).replace('T', ' ')} UTC{' '}
        <span>SERVER CACHED / REVALIDATES AFTER 1 HOUR</span>
      </div>
    </div>
  );
}

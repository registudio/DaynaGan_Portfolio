import type { GitHubFeed } from './github.ts';

export type ActivityLine = { id: string; sha: string; repo: string; message: string; at: string };

/**
 * Recent public activity as log lines: commit messages when the events API includes them;
 * otherwise (GitHub dropped commit lists from PushEvent payloads in 2025) one line per push,
 * branch or repository creation.
 */
export function activityLog(events: GitHubFeed['events'], limit = 7): ActivityLine[] {
  const branch = (ref?: string | null) => (ref ?? '').replace('refs/heads/', '');
  return events
    .flatMap((e): ActivityLine[] => {
      const p = e.payload;
      const repo = e.repo.name.split('/')[1] ?? e.repo.name;
      if (e.type === 'PushEvent' && p?.commits?.length)
        return p.commits.map((c, i) => ({ id: `${e.id}-${i}`, sha: c.sha ?? p.head ?? e.id, repo, message: c.message.split('\n')[0], at: e.created_at }));
      if (e.type === 'PushEvent') return [{ id: e.id, sha: p?.head ?? e.id, repo, message: `pushed to ${branch(p?.ref) || 'main'}`, at: e.created_at }];
      if (e.type === 'CreateEvent')
        return [{ id: e.id, sha: e.id, repo, message: `created ${p?.ref_type ?? 'repository'}${p?.ref ? ` ${p.ref}` : ''}`, at: e.created_at }];
      return [];
    })
    .slice(0, limit);
}

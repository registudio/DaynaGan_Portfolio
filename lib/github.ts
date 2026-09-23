import { z } from 'zod';
import { getSite } from './content';

const repoSchema = z.object({
  name: z.string(),
  html_url: z.url(),
  description: z.string().nullable(),
  language: z.string().nullable(),
  stargazers_count: z.number(),
  forks_count: z.number(),
  updated_at: z.string(),
  fork: z.boolean(),
});
const eventSchema = z.object({
  id: z.string(),
  type: z.string(),
  created_at: z.string(),
  repo: z.object({ name: z.string() }),
});
export type GitHubFeed = {
  status: 'online' | 'offline';
  fetchedAt: string;
  repos: z.infer<typeof repoSchema>[];
  events: z.infer<typeof eventSchema>[];
  languages: string[];
  activity: { date: string; count: number }[];
};
export async function getGitHubFeed(): Promise<GitHubFeed> {
  const fallback: GitHubFeed = {
    status: 'offline',
    fetchedAt: new Date().toISOString(),
    repos: [],
    events: [],
    languages: [],
    activity: [],
  };
  try {
    const { githubUsername } = getSite();
    const headers: HeadersInit = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const request = async (endpoint: string) => {
      const res = await fetch(
        `https://api.github.com/users/${encodeURIComponent(githubUsername)}/${endpoint}`,
        { headers, signal: AbortSignal.timeout(8000), next: { revalidate: 3600 } },
      );
      if (!res.ok) throw new Error(`GitHub returned ${res.status}`);
      return res.json();
    };
    const [rawRepos, rawEvents] = await Promise.all([
      request('repos?sort=updated&per_page=100'),
      request('events/public?per_page=100'),
    ]);
    const allRepos = z.array(repoSchema).parse(rawRepos);
    const events = z.array(eventSchema).parse(rawEvents);
    const activity = Array.from({ length: 84 }, (_, i) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - 83 + i);
      const date = d.toISOString().slice(0, 10);
      return { date, count: events.filter((e) => e.created_at.startsWith(date)).length };
    });
    return {
      status: 'online',
      fetchedAt: fallback.fetchedAt,
      repos: allRepos.filter((r) => !r.fork).slice(0, 6),
      events: events.slice(0, 5),
      languages: [...new Set(allRepos.map((r) => r.language).filter((l): l is string => !!l))],
      activity,
    };
  } catch (error) {
    console.warn(
      'GitHub feed unavailable; using profile fallback.',
      error instanceof Error ? error.message : error,
    );
    return fallback;
  }
}

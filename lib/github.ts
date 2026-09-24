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
  payload: z
    .object({
      commits: z.array(z.object({ message: z.string() })).optional(),
      ref: z.string().nullish(),
      ref_type: z.string().nullish(),
      action: z.string().nullish(),
    })
    .passthrough()
    .optional(),
});
const userSchema = z.object({
  login: z.string(),
  avatar_url: z.url(),
  name: z.string().nullable(),
  bio: z.string().nullable(),
  followers: z.number(),
  following: z.number(),
  public_repos: z.number(),
});
const calendarSchema = z.object({
  data: z.object({
    user: z.object({
      contributionsCollection: z.object({
        contributionCalendar: z.object({
          totalContributions: z.number(),
          weeks: z.array(
            z.object({
              contributionDays: z.array(
                z.object({ date: z.string(), contributionCount: z.number() }),
              ),
            }),
          ),
        }),
      }),
    }),
  }),
});

export type GitHubFeed = {
  status: 'online' | 'offline';
  fetchedAt: string;
  profile: z.infer<typeof userSchema> | null;
  repos: z.infer<typeof repoSchema>[];
  events: z.infer<typeof eventSchema>[];
  languages: string[];
  /** Daily counts, oldest first. */
  activity: { date: string; count: number }[];
  /** `calendar` = full contribution calendar (needs GITHUB_TOKEN); `events` = recent public events only. */
  activitySource: 'calendar' | 'events' | 'none';
  totalContributions: number | null;
};

const DAYS = 53 * 7;

export async function getGitHubFeed(): Promise<GitHubFeed> {
  const fallback: GitHubFeed = {
    status: 'offline',
    fetchedAt: new Date().toISOString(),
    profile: null,
    repos: [],
    events: [],
    languages: [],
    activity: [],
    activitySource: 'none',
    totalContributions: null,
  };
  try {
    const { githubUsername } = getSite();
    const token = process.env.GITHUB_TOKEN;
    const headers: HeadersInit = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const request = async (endpoint: string) => {
      const res = await fetch(
        `https://api.github.com/users/${encodeURIComponent(githubUsername)}${endpoint}`,
        { headers, signal: AbortSignal.timeout(8000), next: { revalidate: 3600 } },
      );
      if (!res.ok) throw new Error(`GitHub returned ${res.status}`);
      return res.json();
    };
    const [rawUser, rawRepos, rawEvents] = await Promise.all([
      request(''),
      request('/repos?sort=updated&per_page=100'),
      request('/events/public?per_page=100'),
    ]);
    const profile = userSchema.parse(rawUser);
    const allRepos = z.array(repoSchema).parse(rawRepos);
    const events = z.array(eventSchema).parse(rawEvents);

    let activity: GitHubFeed['activity'] = [];
    let activitySource: GitHubFeed['activitySource'] = 'events';
    let totalContributions: number | null = null;
    if (token) {
      try {
        const res = await fetch('https://api.github.com/graphql', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `query($login: String!) { user(login: $login) { contributionsCollection { contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } } } } }`,
            variables: { login: githubUsername },
          }),
          signal: AbortSignal.timeout(8000),
          next: { revalidate: 3600 },
        });
        if (!res.ok) throw new Error(`GitHub GraphQL returned ${res.status}`);
        const calendar = calendarSchema.parse(await res.json()).data.user.contributionsCollection
          .contributionCalendar;
        activity = calendar.weeks
          .flatMap((w) => w.contributionDays)
          .map((d) => ({ date: d.date, count: d.contributionCount }))
          .slice(-DAYS);
        totalContributions = calendar.totalContributions;
        activitySource = 'calendar';
      } catch (error) {
        console.warn('GitHub contribution calendar unavailable; using public events.', error);
      }
    }
    if (activitySource === 'events') {
      activity = Array.from({ length: DAYS }, (_, i) => {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() - (DAYS - 1) + i);
        const date = d.toISOString().slice(0, 10);
        return { date, count: events.filter((e) => e.created_at.startsWith(date)).length };
      });
    }
    return {
      status: 'online',
      fetchedAt: fallback.fetchedAt,
      profile,
      repos: allRepos.filter((r) => !r.fork).slice(0, 6),
      events: events.slice(0, 8),
      languages: [...new Set(allRepos.map((r) => r.language).filter((l): l is string => !!l))],
      activity,
      activitySource,
      totalContributions,
    };
  } catch (error) {
    console.warn(
      'GitHub feed unavailable; using profile fallback.',
      error instanceof Error ? error.message : error,
    );
    return fallback;
  }
}

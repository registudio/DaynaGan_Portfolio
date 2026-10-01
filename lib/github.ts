import { z } from 'zod';
import { loadPortfolio } from './load.ts';
import { parseContributionCalendar } from './contributions';

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
      commits: z.array(z.object({ message: z.string(), sha: z.string().optional() })).optional(),
      head: z.string().nullish(),
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
const langEdges = z.object({
  edges: z.array(z.object({ size: z.number(), node: z.object({ name: z.string(), color: z.string().nullable() }) })),
});
const pinnedSchema = z.object({
  nodes: z.array(
    z.object({
      name: z.string(),
      url: z.url(),
      description: z.string().nullable(),
      stargazerCount: z.number(),
      updatedAt: z.string(),
      languages: langEdges,
    }),
  ),
});
const calendarSchema = z.object({
  data: z.object({
    user: z.object({
      pinnedItems: pinnedSchema.optional(),
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
  /** Share of public, non-fork repositories per primary language, largest first. */
  languageStats: { name: string; share: number }[];
  totalStars: number;
  /** Daily counts, oldest first. */
  activity: { date: string; count: number }[];
  /** `calendar` = full contribution calendar (needs GITHUB_TOKEN); `events` = recent public events only. */
  activitySource: 'calendar' | 'events' | 'none';
  totalContributions: number | null;
  /** Pinned on the GitHub profile (needs GITHUB_TOKEN), else the top repositories. */
  pinned: PinnedRepo[];
  pinnedSource: 'pinned' | 'top';
};

export type PinnedRepo = {
  name: string;
  url: string;
  description: string | null;
  stars: number;
  updatedAt: string;
  languages: { name: string; share: number; color: string }[];
};

/** Linguist colours for common languages (used when GraphQL isn't available). */
const LANG_COLORS: Record<string, string> = {
  Python: '#3572A5', TypeScript: '#3178c6', JavaScript: '#f1e05a', 'C++': '#f34b7d', C: '#555555',
  Java: '#b07219', HTML: '#e34c26', CSS: '#663399', Shell: '#89e051', 'Jupyter Notebook': '#DA5B0B',
  Verilog: '#b2b7f8', CMake: '#DA3434', Dockerfile: '#384d54', Rust: '#dea584', Go: '#00ADD8',
  Arduino: '#bd79d1', MATLAB: '#e16737', 'C#': '#178600', Kotlin: '#A97BFF', Swift: '#F05138',
};
const langColor = (name: string) => LANG_COLORS[name] ?? '#8b5cf6';

const shares = (entries: [string, number, string | null][]) => {
  const total = entries.reduce((a, [, n]) => a + n, 0) || 1;
  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, n, color]) => ({ name, share: n / total, color: color ?? langColor(name) }));
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
    languageStats: [],
    totalStars: 0,
    activity: [],
    activitySource: 'none',
    totalContributions: null,
    pinned: [],
    pinnedSource: 'top',
  };
  try {
    const { githubUsername } = loadPortfolio().site;
    const token = process.env.GITHUB_TOKEN;
    const headers: HeadersInit = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const request = async (endpoint: string) => {
      const url = `https://api.github.com/users/${encodeURIComponent(githubUsername)}${endpoint}`;
      const init = { signal: AbortSignal.timeout(8000), next: { revalidate: 3600 } };
      let res = await fetch(url, { ...init, headers });
      // A bad or expired token shouldn't take the panel offline: retry anonymously.
      if (res.status === 401 && token) {
        const { Authorization: _auth, ...anon } = headers as Record<string, string>;
        res = await fetch(url, { ...init, headers: anon });
      }
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
    let pinned: PinnedRepo[] = [];
    if (token) {
      try {
        const res = await fetch('https://api.github.com/graphql', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `query($login: String!) { user(login: $login) { pinnedItems(first: 6, types: REPOSITORY) { nodes { ... on Repository { name url description stargazerCount updatedAt languages(first: 6, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name color } } } } } } contributionsCollection { contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } } } } }`,
            variables: { login: githubUsername },
          }),
          signal: AbortSignal.timeout(8000),
          next: { revalidate: 3600 },
        });
        if (!res.ok) throw new Error(`GitHub GraphQL returned ${res.status}`);
        const user = calendarSchema.parse(await res.json()).data.user;
        const calendar = user.contributionsCollection.contributionCalendar;
        pinned = (user.pinnedItems?.nodes ?? []).map((r) => ({
          name: r.name,
          url: r.url,
          description: r.description,
          stars: r.stargazerCount,
          updatedAt: r.updatedAt,
          languages: shares(r.languages.edges.map((e) => [e.node.name, e.size, e.node.color])),
        }));
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
    // No token (or it failed): the public calendar page has the same graph as the profile.
    if (activitySource === 'events') {
      try {
        const res = await fetch(`https://github.com/users/${encodeURIComponent(githubUsername)}/contributions`, {
          headers: { Accept: 'text/html' },
          signal: AbortSignal.timeout(8000),
          next: { revalidate: 3600 },
        });
        if (!res.ok) throw new Error(`GitHub contributions page returned ${res.status}`);
        const { days, total } = parseContributionCalendar(await res.text());
        if (days.length < 30) throw new Error('GitHub contributions page had no calendar');
        activity = days.slice(-DAYS);
        totalContributions = total;
        activitySource = 'calendar';
      } catch (error) {
        console.warn('GitHub public contribution calendar unavailable; using public events.', error instanceof Error ? error.message : error);
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
    const owned = allRepos.filter((r) => !r.fork);
    const top = [...owned]
      .sort((a, b) => b.stargazers_count - a.stargazers_count || b.updated_at.localeCompare(a.updated_at))
      .slice(0, 6);
    const pinnedSource: GitHubFeed['pinnedSource'] = pinned.length ? 'pinned' : 'top';
    if (!pinned.length)
      pinned = await Promise.all(
        top.slice(0, 4).map(async (r) => {
          let langs: Record<string, number> = r.language ? { [r.language]: 1 } : {};
          try {
            const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(githubUsername)}/${encodeURIComponent(r.name)}/languages`, {
              headers,
              signal: AbortSignal.timeout(6000),
              next: { revalidate: 3600 },
            });
            if (res.ok) langs = z.record(z.string(), z.number()).parse(await res.json());
          } catch {}
          return {
            name: r.name,
            url: r.html_url,
            description: r.description,
            stars: r.stargazers_count,
            updatedAt: r.updated_at,
            languages: shares(Object.entries(langs).map(([n, v]) => [n, v, null])),
          };
        }),
      );
    const counts = new Map<string, number>();
    for (const r of owned)
      if (r.language) counts.set(r.language, (counts.get(r.language) ?? 0) + 1);
    const counted = [...counts.values()].reduce((a, b) => a + b, 0) || 1;
    return {
      status: 'online',
      fetchedAt: fallback.fetchedAt,
      profile,
      repos: top,
      pinned,
      pinnedSource,
      events: events.slice(0, 8),
      languages: [...new Set(allRepos.map((r) => r.language).filter((l): l is string => !!l))],
      languageStats: [...counts]
        .map(([name, n]) => ({ name, share: n / counted }))
        .sort((a, b) => b.share - a.share),
      totalStars: owned.reduce((sum, r) => sum + r.stargazers_count, 0),
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

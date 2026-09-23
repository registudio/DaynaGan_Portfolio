import type { ReactNode } from 'react';
import type {
  Site,
  TourContent,
  getSections,
  getExperience,
  getProjects,
  getPosts,
} from '@/lib/content';
import type { GitHubFeed } from '@/lib/github';
export type TourProps = {
  site: Site;
  tour: TourContent;
  sections: ReturnType<typeof getSections>;
  jobs: (ReturnType<typeof getExperience>[number] & { summary: string; details: string[] })[];
  projects: ReturnType<typeof getProjects>;
  posts: ReturnType<typeof getPosts>;
  feed: GitHubFeed;
  githubPanel: ReactNode;
  readingPanel: ReactNode;
};

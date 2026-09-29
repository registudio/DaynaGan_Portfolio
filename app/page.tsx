import App from '@/components/App';
import ProSite from '@/components/pro/ProSite';
import { getGitHubFeed } from '@/lib/github';
import { loadRenderedPortfolio } from '@/lib/load';

// Refresh GitHub data at most hourly.
export const revalidate = 3600;

export default async function Page() {
  const portfolio = loadRenderedPortfolio();
  const github = await getGitHubFeed();
  return (
    <App portfolio={portfolio} github={github}>
      <ProSite portfolio={portfolio} github={github} />
    </App>
  );
}

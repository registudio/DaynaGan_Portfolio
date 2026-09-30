import App from '@/components/App';
import ProSite from '@/components/pro/ProSite';
import { getGitHubFeed } from '@/lib/github';
import { cadModels, loadRenderedPortfolio } from '@/lib/load';

// Refresh GitHub data at most hourly.
export const revalidate = 3600;

// Build time of this deployment (shown as "Last updated" in the footer).
const UPDATED = process.env.BUILD_TIME ?? new Date().toISOString();

export default async function Page() {
  const portfolio = loadRenderedPortfolio();
  const github = await getGitHubFeed();
  return (
    <App portfolio={portfolio} github={github}>
      <ProSite portfolio={portfolio} github={github} cad={cadModels()} updated={UPDATED} />
    </App>
  );
}

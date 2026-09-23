import { getGitHubFeed } from '@/lib/github';
export const revalidate = 3600;
export async function GET() {
  const feed = await getGitHubFeed();
  return Response.json(feed, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  });
}

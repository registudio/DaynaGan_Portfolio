import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="article-page">
      <p className="eyebrow">404 / Not found</p>
      <h1>Nothing to see here.</h1>
      <p>This page hasn’t been built yet. Let’s get you back.</p>
      <Link className="primary-link" href="/">
        Back home ↗
      </Link>
    </main>
  );
}

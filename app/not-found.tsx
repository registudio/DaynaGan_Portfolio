import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="article-page">
      <p className="eyebrow">404 / MODULE NOT FOUND</p>
      <h1>Outside the blueprint.</h1>
      <p>This page hasn’t been assembled. Let’s get you back to the station.</p>
      <Link className="primary-link" href="/">
        Return to station ↗
      </Link>
    </main>
  );
}

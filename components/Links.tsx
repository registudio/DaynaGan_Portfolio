import type { Site } from '@/lib/portfolio';

/** LinkedIn, GitHub, email and résumé — shown everywhere, never gated. */
export function Links({ site, compact = false, className }: { site: Site; compact?: boolean; className?: string }) {
  const items = [
    { href: site.linkedin, label: 'LinkedIn', short: 'in' },
    { href: site.github, label: 'GitHub', short: 'gh' },
    { href: `mailto:${site.email}`, label: 'Email', short: '✉' },
    { href: site.resume, label: 'Résumé', short: 'CV' },
  ];
  return (
    <>
      {items.map((i) => (
        <a
          key={i.label}
          href={i.href}
          className={className}
          target={i.href.startsWith('http') || i.href.endsWith('.pdf') ? '_blank' : undefined}
          rel="noopener noreferrer"
          aria-label={i.label}
          title={i.label}
        >
          {compact ? i.label : i.label}
        </a>
      ))}
    </>
  );
}

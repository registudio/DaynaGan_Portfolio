import type { getSections } from '@/lib/content';

type Section = ReturnType<typeof getSections>[number];

export function SectionHeader({
  section,
  children,
}: {
  section: Section;
  children?: React.ReactNode;
}) {
  return (
    <header className="section-header" data-reveal>
      <p className="eyebrow">{section.eyebrow}</p>
      <h2>{section.title}</h2>
      <p className="kicker">{section.kicker}</p>
      {children}
    </header>
  );
}

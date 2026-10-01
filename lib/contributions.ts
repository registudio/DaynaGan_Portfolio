/**
 * Parses GitHub's public contribution calendar (https://github.com/users/<login>/contributions),
 * the same graph shown on the profile. Needs no token. Each day is a
 * `<td data-date="…" id="contribution-day-component-…" data-level="0–4">` with a matching
 * `<tool-tip for="…">N contributions on …</tool-tip>`; the heading carries the yearly total.
 */
export type CalendarDay = { date: string; count: number };

export function parseContributionCalendar(html: string): { days: CalendarDay[]; total: number | null } {
  const counts = new Map<string, number>();
  for (const m of html.matchAll(/<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>\s*([^<]*?)\s*<\/tool-tip>/g)) {
    const n = m[2].match(/^(No|[\d,]+)\s+contributions?/i);
    if (n) counts.set(m[1], n[1].toLowerCase() === 'no' ? 0 : Number(n[1].replace(/,/g, '')));
  }
  const days: CalendarDay[] = [];
  for (const m of html.matchAll(/<td\b[^>]*\bdata-date="(\d{4}-\d{2}-\d{2})"[^>]*>/g)) {
    const tag = m[0];
    const id = tag.match(/\bid="([^"]+)"/)?.[1];
    const level = Number(tag.match(/\bdata-level="(\d)"/)?.[1] ?? 0);
    // Exact count from the tooltip; the shade level is a lower bound when it's missing.
    days.push({ date: m[1], count: (id ? counts.get(id) : undefined) ?? level });
  }
  days.sort((a, b) => a.date.localeCompare(b.date));
  const t = html.match(/([\d,]+)\s+contributions?\s+in the last year/i);
  const total = t ? Number(t[1].replace(/,/g, '')) : days.length ? days.reduce((a, d) => a + d.count, 0) : null;
  return { days, total };
}

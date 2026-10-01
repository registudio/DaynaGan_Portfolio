import type { Level, Room } from '../../lib/portfolio.ts';

/**
 * Ways the game tells Dayna's story besides "press E, read a panel" (pure, testable):
 *   - summaries for the walk-up hologram cards,
 *   - area title cards + Xiao Hu's narration when you enter a room,
 *   - short lore fragments that bots drop.
 */

/** Markdown → plain text. */
export function plain(md: string): string {
  return md
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sentences(md: string): string[] {
  const text = plain(md);
  if (!text) return [];
  return (text.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) ?? [text]).map((s) => s.trim()).filter(Boolean);
}

/** First sentence or two, capped at `max` characters (word boundary + ellipsis). */
export function summarize(md: string, max = 170): string {
  const out: string[] = [];
  for (const s of sentences(md)) {
    if (out.length && (out.join(' ') + ' ' + s).length > max) break;
    out.push(s);
    if (out.join(' ').length > max * 0.6) break;
  }
  const text = out.join(' ');
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max * 0.6)).trim()}…`;
}

export type AreaCard = { eyebrow: string; title: string; sub: string; line: string };

/** Title card + narration line for entering a content room. */
export function roomIntro(room: Room): AreaCard {
  const m = room.meta;
  const eyebrow = [m.role, m.qualification, m.short && m.short !== room.title ? m.short : m.org, m.period && m.period !== 'TODO' ? m.period : m.year]
    .filter((x): x is string => !!x && x !== 'TODO')
    .join(' · ');
  const sub = summarize(room.body, 110);
  const first = sentences(room.body)[0] ?? '';
  const line = first ? `${room.title}: ${first}` : `This is ${room.title}.`;
  return { eyebrow, title: room.title, sub, line: line.length > 150 ? `${line.slice(0, 147)}…` : line };
}

export type Fragment = { id: string; room: string; text: string };

/**
 * Lore fragments for a level: one-sentence facts taken from room and part bodies.
 * Deterministic ids so collected fragments can be saved.
 */
export function levelFragments(level: Level): Fragment[] {
  const out: Fragment[] = [];
  for (const room of level.rooms) {
    const sources = [room.body, ...room.parts.filter((p) => !p.todo).map((p) => p.body)];
    // Parts with no prose (awards, scores) still make a fact from their title.
    for (const [k, p] of room.parts.entries()) {
      if (p.todo || sentences(p.body).length) continue;
      const when = p.meta.period && p.meta.period !== 'TODO' ? ` (${p.meta.period})` : '';
      const text = `${p.title}${when} — ${room.meta.short ?? room.title}.`;
      // Bare labels ("CAD") aren't facts; awards, scores and dated items are.
      if ((when || p.title.length >= 14) && text.length <= 180) out.push({ id: `${level.id}:${room.id}:t${k}`, room: room.title, text });
    }
    sources.forEach((md, k) => {
      let taken = 0;
      sentences(md ?? '').forEach((s, j) => {
        if (taken >= 2 || s.length < 35 || s.length > 180 || /TODO/.test(s)) return;
        out.push({ id: `${level.id}:${room.id}:${k}:${j}`, room: room.title, text: s });
        taken++;
      });
    });
  }
  return out;
}

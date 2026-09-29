/**
 * Parser for content/portfolio.md — the single content source for both modes.
 *
 *   # Level   ## Room   ### Part
 *
 * `key: value` lines directly under a heading are metadata; the prose that follows
 * (after a blank line) is Markdown. Pure: no fs, safe for tests and the client.
 */

export type Meta = Record<string, string>;

export type Part = {
  id: string;
  title: string;
  meta: Meta;
  /** Markdown source with TODO lines removed. */
  body: string;
  todo: boolean;
  /** Rendered HTML of `body`, filled in on the server (see lib/load.ts). */
  html?: string;
};

export type Room = Part & { parts: Part[] };

export type Level = Part & { rooms: Room[] };

export type SkillDef = { id: string; name: string; group: string; max: number; start?: number };

export type Site = {
  name: string;
  displayName: string;
  title: string;
  description: string;
  tagline: string;
  location: string;
  email: string;
  linkedin: string;
  github: string;
  githubUsername: string;
  resume: string;
  contactUnlockAfter: number;
  companion: { name: string; meaning?: string };
  skills: SkillDef[];
};

export type Portfolio = { site: Site; levels: Level[] };

const HEADING = /^(#{1,3})\s+(.+?)\s*#*\s*$/;
const META = /^([a-zA-Z][\w-]*):\s?(.*)$/;

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item'
  );
}

/** Removes `TODO:` paragraphs so placeholders never reach visitors. */
function stripTodo(md: string): { body: string; todo: boolean } {
  let todo = false;
  const kept = md
    .split(/\n{2,}/)
    .filter((para) => {
      if (/^\s*TODO\b/.test(para)) {
        todo = true;
        return false;
      }
      return true;
    })
    .join('\n\n')
    .trim();
  return { body: kept, todo };
}

type Node = Part & { depth: number; children: Node[] };

export function parseBody(markdown: string): Level[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const levels: Node[] = [];
  const stack: Node[] = [];
  let current: Node | null = null;
  let buffer: string[] = [];
  let inMeta = false;
  let fence = false;

  const flush = () => {
    if (!current) return;
    const { body, todo } = stripTodo(buffer.join('\n'));
    current.body = body;
    current.todo = todo || current.meta.status === 'todo';
    buffer = [];
  };

  for (const line of lines) {
    if (/^```/.test(line)) fence = !fence;
    const heading = !fence && line.match(HEADING);
    if (heading) {
      flush();
      const depth = heading[1].length;
      const node: Node = {
        id: '',
        title: heading[2],
        meta: {},
        body: '',
        todo: false,
        depth,
        children: [],
      };
      while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();
      const parent = stack[stack.length - 1];
      if (depth === 1) levels.push(node);
      else if (parent && parent.depth === depth - 1) parent.children.push(node);
      else throw new Error(`"${heading[2]}" (h${depth}) has no parent heading one level up`);
      stack.push(node);
      current = node;
      inMeta = true;
      continue;
    }
    if (current && inMeta) {
      const m = line.match(META);
      if (m) {
        current.meta[m[1]] = m[2].trim();
        continue;
      }
      inMeta = false;
    }
    if (current) buffer.push(line);
  }
  flush();

  const finish = (node: Node): Part => ({
    id: node.meta.id || slugify(node.title),
    title: node.title,
    meta: node.meta,
    body: node.body,
    todo: node.todo,
  });
  return levels.map((level) => {
    const base = finish(level);
    return {
      ...base,
      rooms: level.children.map((room) => ({
        ...finish(room),
        parts: room.children.map(finish),
      })),
    };
  });
}

// ── metadata helpers ────────────────────────────────────────────────────────

export const list = (value?: string): string[] =>
  (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export type Grant = { skill: string; amount: number };
export type Requirement = { skill: string; level: number };

export function parseGrants(value?: string): Grant[] {
  return list(value).map((entry) => {
    const m = entry.match(/^([\w-]+)\s*\+?\s*(\d+)?$/);
    if (!m) throw new Error(`Bad grant "${entry}" (expected "skill +1")`);
    return { skill: m[1], amount: Number(m[2] ?? 1) };
  });
}

export function parseRequires(value?: string): Requirement[] {
  return list(value).map((entry) => {
    const m = entry.match(/^([\w-]+)\s+(\d+)$/);
    if (!m) throw new Error(`Bad requirement "${entry}" (expected "skill 3")`);
    return { skill: m[1], level: Number(m[2]) };
  });
}

/** `link: projects/rosa-ros2` → { level, room } */
export function parseLink(value?: string): { level: string; room?: string } | null {
  if (!value) return null;
  const [level, room] = value.split('/').map((s) => s.trim());
  return level ? { level, room } : null;
}

export const levelById = (p: Portfolio, id: string) => p.levels.find((l) => l.id === id);

/** Levels shown as sections in both modes (excludes the game-only hub). */
export const sectionLevels = (p: Portfolio) => p.levels.filter((l) => l.meta.kind !== 'hub');

export function validate(p: Portfolio): string[] {
  const errors: string[] = [];
  const skillIds = new Set(p.site.skills.map((s) => s.id));
  const ids = new Set<string>();
  for (const level of p.levels) {
    if (ids.has(level.id)) errors.push(`Duplicate level id "${level.id}"`);
    ids.add(level.id);
    const roomIds = new Set<string>();
    for (const room of level.rooms) {
      if (roomIds.has(room.id)) errors.push(`Duplicate room id "${level.id}/${room.id}"`);
      roomIds.add(room.id);
      const partIds = new Set<string>();
      for (const node of [room, ...room.parts]) {
        if (node !== room) {
          if (partIds.has(node.id)) errors.push(`Duplicate part id "${room.id}/${node.id}"`);
          partIds.add(node.id);
        }
        try {
          for (const g of parseGrants(node.meta.grants))
            if (!skillIds.has(g.skill)) errors.push(`Unknown skill "${g.skill}" in ${node.id}`);
          for (const r of parseRequires(node.meta.requires))
            if (!skillIds.has(r.skill)) errors.push(`Unknown skill "${r.skill}" in ${node.id}`);
        } catch (e) {
          errors.push(`${node.id}: ${(e as Error).message}`);
        }
        const link = parseLink(node.meta.link);
        if (link) {
          const target = levelById(p, link.level);
          if (!target || (link.room && !target.rooms.some((r) => r.id === link.room)))
            errors.push(`Broken link "${node.meta.link}" in ${node.id}`);
        }
      }
      for (const need of list(room.meta.needs))
        if (!level.rooms.some((r) => r.id === need))
          errors.push(`Unknown project "${need}" needed by ${room.id}`);
    }
  }
  return errors;
}

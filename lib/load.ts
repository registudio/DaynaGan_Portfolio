import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import { z } from 'zod';
import { parseBody, validate, type Part, type Portfolio } from './portfolio.ts';

const siteSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  title: z.string(),
  description: z.string(),
  tagline: z.string(),
  location: z.string(),
  email: z.email(),
  linkedin: z.url(),
  github: z.url(),
  githubUsername: z.string(),
  resume: z.string(),
  contactUnlockAfter: z.number().int().min(0).default(3),
  companion: z.object({ name: z.string(), meaning: z.string().optional() }),
  skills: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      group: z.string(),
      max: z.number().int().min(1).default(5),
      start: z.number().int().min(0).optional(),
    }),
  ),
});

export const CONTENT_FILE = path.join(process.cwd(), 'content', 'portfolio.md');

export function parsePortfolio(source: string): Portfolio {
  const { data, content } = matter(source);
  const portfolio = { site: siteSchema.parse(data), levels: parseBody(content) };
  const errors = validate(portfolio);
  if (errors.length) throw new Error(`content/portfolio.md:\n  ${errors.join('\n  ')}`);
  return portfolio;
}

export function loadPortfolio(): Portfolio {
  return parsePortfolio(fs.readFileSync(CONTENT_FILE, 'utf8'));
}

const render = <T extends Part>(node: T): T => ({
  ...node,
  html: node.body ? (marked.parse(node.body, { async: false, gfm: true }) as string) : '',
});

/** Portfolio with every body rendered to HTML, ready to hand to client components. */
export function loadRenderedPortfolio(): Portfolio {
  const p = loadPortfolio();
  return {
    site: p.site,
    levels: p.levels.map((level) => ({
      ...render(level),
      rooms: level.rooms.map((room) => ({ ...render(room), parts: room.parts.map(render) })),
    })),
  };
}

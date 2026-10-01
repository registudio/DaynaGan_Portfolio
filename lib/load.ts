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
  inbox: z.email().optional(),
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
      axis: z.number().min(0).max(1).optional(),
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

const MODEL_EXT = ['.glb', '.gltf', '.stl', '.obj'];

const PHOTO_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'];

/** What a project folder (public/projects/<id>/) holds; see public/projects/README.md. */
export type ProjectAssets = { model?: string; report?: string; photos: string[] };

/**
 * Documents uploaded per project: `model.<glb|gltf|stl|obj>`, `report.pdf` and anything in
 * `photos/`. Read at build time, keyed by project id.
 */
export function projectAssets(): Record<string, ProjectAssets> {
  const root = path.join(process.cwd(), 'public', 'projects');
  const out: Record<string, ProjectAssets> = {};
  let ids: string[] = [];
  try {
    ids = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
    return out;
  }
  for (const id of ids) {
    const dir = path.join(root, id);
    const files = fs.readdirSync(dir);
    const a: ProjectAssets = { photos: [] };
    for (const ext of MODEL_EXT) {
      const f = files.find((x) => x.toLowerCase() === `model${ext}`);
      if (f && !a.model) a.model = `/projects/${id}/${f}`;
    }
    const report = files.find((x) => /^report\.pdf$/i.test(x));
    if (report) a.report = `/projects/${id}/${report}`;
    try {
      a.photos = fs
        .readdirSync(path.join(dir, 'photos'))
        .filter((f) => PHOTO_EXT.some((e) => f.toLowerCase().endsWith(e)))
        .sort()
        .map((f) => `/projects/${id}/photos/${f}`);
    } catch {}
    out[id] = a;
  }
  return out;
}

/**
 * CAD exports dropped into public/models/ as `<project-id>.<glb|gltf|stl|obj>`, keyed by
 * project id. Projects without one show their wireframe blueprint.
 */
export function cadModels(): Record<string, string> {
  const dir = path.join(process.cwd(), 'public', 'models');
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir);
  } catch {
    return {};
  }
  const out: Record<string, string> = {};
  for (const ext of MODEL_EXT)
    for (const f of files)
      if (f.toLowerCase().endsWith(ext)) {
        const id = f.slice(0, -ext.length);
        out[id] ??= `/models/${f}`;
      }
  // A model in the project's own folder takes precedence.
  for (const [id, a] of Object.entries(projectAssets())) if (a.model) out[id] = a.model;
  return out;
}

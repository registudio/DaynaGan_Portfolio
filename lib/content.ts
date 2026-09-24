import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { z } from 'zod';

const root = path.join(process.cwd(), 'content');
export const navigationSchema = z.object({
  id: z.string(),
  label: z.string(),
  number: z.string(),
});
const siteSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  title: z.string(),
  description: z.string(),
  github: z.url(),
  githubUsername: z.string(),
  linkedin: z.url(),
  email: z.email(),
  resume: z.string(),
  location: z.string(),
  heroEyebrow: z.string(),
  heroKicker: z.string(),
  heroTitle: z.string(),
  heroSubtitle: z.string(),
  heroHint: z.string(),
  navigation: z.array(navigationSchema),
});
const sectionSchema = z.object({
  id: z.string(),
  order: z.number(),
  eyebrow: z.string(),
  title: z.string(),
  kicker: z.string(),
  tags: z.array(z.string()).default([]),
});
const baseEntry = z.object({
  title: z.string(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  summary: z.string(),
  featured: z.boolean().default(false),
  draft: z.boolean().default(false),
});
const vec3 = z.tuple([z.number(), z.number(), z.number()]);
const partCopySchema = z.object({
  position: vec3,
  rotation: vec3.optional(),
  explode: vec3.default([0, 0, 0]),
});
export const partSchema = z.object({
  id: z.string(),
  label: z.string(),
  /** Name of the matching node when the project supplies a GLB `model`. */
  node: z.string().optional(),
  shape: z.enum(['box', 'cylinder', 'sphere', 'torus', 'cone', 'capsule']).default('box'),
  size: z.array(z.number()).min(1).max(3).default([0.4, 0.4, 0.4]),
  position: vec3.default([0, 0, 0]),
  /** Degrees. */
  rotation: vec3.optional(),
  /** Offset applied when the model is fully exploded. */
  explode: vec3.default([0, 0, 0]),
  material: z.enum(['violet', 'lilac', 'chrome', 'graphite', 'glow']).default('violet'),
  copies: z.array(partCopySchema).default([]),
  summary: z.string(),
  did: z.string().optional(),
  learned: z.string().optional(),
});
const compareSideSchema = z.object({
  label: z.string(),
  image: z.string().optional(),
  code: z.string().optional(),
  stat: z.string().optional(),
  note: z.string().optional(),
});
export const projectSchema = baseEntry.extend({
  order: z.number().default(99),
  year: z.number().optional(),
  status: z.enum(['complete', 'in-progress']).default('complete'),
  technologies: z.array(z.string()).default([]),
  github: z.url().nullish(),
  demo: z.url().nullish(),
  /** Optional GLB under /public. Parts with a `node` name explode that node. */
  model: z.string().nullish(),
  thumbnail: z.string().nullish(),
  accent: z.string().default('#b794f6'),
  compare: z
    .object({ caption: z.string().optional(), before: compareSideSchema, after: compareSideSchema })
    .optional(),
  parts: z.array(partSchema).default([]),
});
export type Project = z.infer<typeof projectSchema> & { body: string };
export type Part = z.infer<typeof partSchema>;
const experienceSchema = z.object({
  slug: z.string(),
  title: z.string(),
  role: z.string(),
  period: z.string(),
  order: z.number(),
  /** Short text mark shown until a real logo exists. */
  mark: z.string().optional(),
  /** Optional logo under /public, e.g. /logos/ecovolt.svg. */
  logo: z.string().optional(),
  technologies: z.array(z.string()),
});
function read<T extends z.ZodType>(file: string, schema: T): z.infer<T> & { body: string } {
  const { data, content } = matter(fs.readFileSync(path.join(root, file), 'utf8'));
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new Error(`Invalid frontmatter in ${file}: ${parsed.error.message}`);
  return { ...(parsed.data as object), body: content } as z.infer<T> & { body: string };
}
function collection<T extends z.ZodType>(directory: string, schema: T) {
  return fs
    .readdirSync(path.join(root, directory))
    .filter((f) => /\.mdx?$/.test(f))
    .map((f) => read(`${directory}/${f}`, schema));
}
function uniqueSlugs<T extends { slug: string }>(entries: T[]): T[] {
  if (new Set(entries.map((e) => e.slug)).size !== entries.length)
    throw new Error('Duplicate content slug');
  return entries;
}
export const getSite = () => read('site.md', siteSchema);
export const getSections = () =>
  collection('sections', sectionSchema).sort((a, b) => a.order - b.order);
export const getExperience = () =>
  collection('experience', experienceSchema).sort((a, b) => a.order - b.order);
export const getProjects = () =>
  uniqueSlugs(collection('projects', projectSchema))
    .filter((p) => !p.draft)
    .sort((a, b) => a.order - b.order);
export type Site = ReturnType<typeof getSite>;
export type NavigationItem = z.infer<typeof navigationSchema>;
const profileSchema = z.object({
  stats: z.array(
    z.object({ value: z.number(), decimals: z.number(), suffix: z.string(), label: z.string() }),
  ),
  currently: z.array(z.object({ label: z.string(), value: z.string() })),
  education: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      short: z.string(),
      qualification: z.string(),
      period: z.string(),
      details: z.array(z.string()),
    }),
  ),
  skills: z.array(z.object({ title: z.string(), items: z.array(z.string()) })),
  awards: z.array(z.object({ title: z.string(), detail: z.string(), period: z.string() })),
  community: z.array(
    z.object({ role: z.string(), org: z.string(), period: z.string(), detail: z.string() }),
  ),
});
export const getProfile = () => read('profile.md', profileSchema);
export type Profile = ReturnType<typeof getProfile>;
export type Experience = ReturnType<typeof getExperience>[number];

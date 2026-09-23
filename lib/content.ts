import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { z } from 'zod';

const root = path.join(process.cwd(), 'content');
export const navigationSchema = z.object({
  id: z.string(),
  label: z.string(),
  caption: z.string(),
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
  station: z.string(),
  stationName: z.string(),
  location: z.string(),
  heroTitle: z.string(),
  heroTitleLines: z.array(z.string()),
  heroTitleAccent: z.string(),
  heroSubtitle: z.string(),
  heroDescription: z.string(),
  heroEyebrow: z.string(),
  navigation: z.array(navigationSchema),
});
const sectionSchema = z.object({
  id: z.string(),
  module: z.string(),
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
export const projectSchema = baseEntry.extend({
  year: z.number().optional(),
  status: z.string().default('complete'),
  technologies: z.array(z.string()).default([]),
  github: z.url().nullish(),
  demo: z.url().nullish(),
  model: z.string().nullish(),
  thumbnail: z.string().nullish(),
});
export const blogSchema = baseEntry.extend({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tags: z.array(z.string()).default([]),
  cover: z.string().nullish(),
});
const experienceSchema = z.object({
  slug: z.string(),
  title: z.string(),
  role: z.string(),
  period: z.string(),
  order: z.number(),
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
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
export const getPosts = () =>
  uniqueSlugs(collection('blog', blogSchema))
    .filter((p) => !p.draft)
    .sort((a, b) => b.date.localeCompare(a.date));
export type Site = ReturnType<typeof getSite>;
export type NavigationItem = z.infer<typeof navigationSchema>;
const tourSchema = z.object({
  title: z.string(),
  intro: z.string(),
  blueprintNote: z.string(),
  mobileNote: z.string(),
  ghostNote: z.string(),
  projectNote: z.string(),
  combatNote: z.string(),
  areas: z.array(z.string()),
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
  awards: z.array(z.object({ title: z.string(), period: z.string() })),
});
export const getTour = () => read('tour.md', tourSchema);
export type TourContent = ReturnType<typeof getTour>;

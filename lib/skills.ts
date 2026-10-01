import {
  list,
  parseGrants,
  parseRequires,
  type Level,
  type Portfolio,
  type Requirement,
} from './portfolio.ts';

/** Progress keys: `level/room` for a room console, `level/room/part` for a part. */
export const roomKey = (level: string, room: string) => `${level}/${room}`;
export const partKey = (level: string, room: string, part: string) => `${level}/${room}/${part}`;

export const PROJECTS_LEVEL = 'projects';

export type SkillSource = {
  skill: string;
  amount: number;
  /** Progress key that grants it; for project builds, `build:<projectId>`. */
  key: string;
  label: string;
  levelId: string;
};

/**
 * Every place a skill level can be earned, in content order.
 * Rooms and parts grant on scan; project rooms grant when the project is built.
 */
export function skillSources(p: Portfolio): SkillSource[] {
  const out: SkillSource[] = [];
  for (const level of p.levels) {
    for (const room of level.rooms) {
      const isProject = level.id === PROJECTS_LEVEL;
      for (const g of parseGrants(room.meta.grants))
        out.push({
          ...g,
          key: isProject ? `build:${room.id}` : roomKey(level.id, room.id),
          label: room.meta.short || room.title,
          levelId: level.id,
        });
      for (const part of room.parts)
        for (const g of parseGrants(part.meta.grants))
          out.push({
            ...g,
            key: partKey(level.id, room.id, part.id),
            label: `${room.meta.short || room.title} · ${part.title}`,
            levelId: level.id,
          });
    }
  }
  return out;
}

export type Progress = { scanned: Iterable<string>; built: Iterable<string> };

/** Current skill levels. Pass `null` for the fully-earned levels (Professional mode). */
export function computeSkills(p: Portfolio, progress: Progress | null): Record<string, number> {
  const done = progress
    ? new Set([...progress.scanned, ...[...progress.built].map((id) => `build:${id}`)])
    : null;
  const levels: Record<string, number> = {};
  for (const s of p.site.skills) levels[s.id] = s.start ?? 0;
  for (const src of skillSources(p)) if (!done || done.has(src.key)) levels[src.skill] += src.amount;
  for (const s of p.site.skills) levels[s.id] = Math.min(levels[s.id], s.max);
  return levels;
}

export type BuildCheck = {
  ok: boolean;
  missingSkills: (Requirement & { have: number; name: string; from: SkillSource[] })[];
  missingProjects: { id: string; title: string }[];
};

export function checkBuild(
  p: Portfolio,
  projectId: string,
  skills: Record<string, number>,
  built: Iterable<string>,
): BuildCheck {
  const level = p.levels.find((l) => l.id === PROJECTS_LEVEL) as Level;
  const room = level.rooms.find((r) => r.id === projectId);
  if (!room) throw new Error(`Unknown project ${projectId}`);
  const builtSet = new Set(built);
  const sources = skillSources(p);
  const missingSkills = parseRequires(room.meta.requires)
    .filter((r) => (skills[r.skill] ?? 0) < r.level)
    .map((r) => ({
      ...r,
      have: skills[r.skill] ?? 0,
      name: p.site.skills.find((s) => s.id === r.skill)?.name ?? r.skill,
      from: sources.filter((s) => s.skill === r.skill),
    }));
  const missingProjects = list(room.meta.needs)
    .filter((id) => !builtSet.has(id))
    .map((id) => ({ id, title: level.rooms.find((r) => r.id === id)?.title ?? id }));
  return { ok: !missingSkills.length && !missingProjects.length, missingSkills, missingProjects };
}

/**
 * Simulates a full playthrough (every console and part scanned, projects built as soon as
 * possible). Returns the projects that can never be built — should be empty.
 */
export function unbuildableProjects(p: Portfolio): string[] {
  const scanned: string[] = [];
  for (const level of p.levels) {
    if (level.id === PROJECTS_LEVEL) continue;
    for (const room of level.rooms) {
      scanned.push(roomKey(level.id, room.id));
      for (const part of room.parts) scanned.push(partKey(level.id, room.id, part.id));
    }
  }
  const projects = p.levels.find((l) => l.id === PROJECTS_LEVEL)?.rooms ?? [];
  const built: string[] = [];
  let progress = true;
  while (progress) {
    progress = false;
    const skills = computeSkills(p, { scanned, built });
    for (const room of projects) {
      if (built.includes(room.id)) continue;
      if (checkBuild(p, room.id, skills, built).ok) {
        built.push(room.id);
        progress = true;
      }
    }
  }
  return projects.filter((r) => !built.includes(r.id)).map((r) => r.id);
}

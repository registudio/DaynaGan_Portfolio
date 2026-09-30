import type { Portfolio } from '../../lib/portfolio.ts';
import { checkBuild, computeSkills, partKey } from '../../lib/skills.ts';
import type { SaveData } from './store.ts';

export const TOUR_TOPICS = { all: 'Full portfolio', robotics: 'Robotics', embedded: 'Embedded systems', ai: 'AI & learning' } as const;
export type TourTopic = keyof typeof TOUR_TOPICS;
const TOPICS = { robotics: /robot|ros.?2|nav2|isaac|claw/i, embedded: /embedded|esp32|stm32|sensor|solder|firmware|arduino|drone/i, ai: /reinforcement|dreamer|learning|agent|python|sma.?clite/i };
export function matchesTopic(topic: TourTopic, text: string) { return topic === 'all' || TOPICS[topic].test(text); }

export function projectPlan(p: Portfolio, save: SaveData, id: string) {
  const room = p.levels.find(l => l.id === 'projects')?.rooms.find(r => r.id === id);
  if (!room) return null;
  const missing = room.parts.filter(part => !save.scanned.includes(partKey('projects', id, part.id)));
  const check = checkBuild(p, id, computeSkills(p, save), save.built);
  const done = save.built.includes(id);
  const source = check.missingSkills.flatMap(s => s.from).find(s => s.key.startsWith('build:') ? !save.built.includes(s.key.slice(6)) : !save.scanned.includes(s.key));
  let next = { level: 'projects', target: `assembly:${id}`, text: `Assemble ${room.title}` };
  if (missing.length) next = { level: 'projects', target: partKey('projects', id, missing[0].id), text: `Recover ${missing[0].title} · ${room.parts.length - missing.length}/${room.parts.length} parts` };
  else if (check.missingProjects.length) next = { level: 'projects', target: `assembly:${check.missingProjects[0].id}`, text: `Build ${check.missingProjects[0].title} first` };
  else if (source) next = { level: source.levelId, target: source.key.startsWith('build:') ? `assembly:${source.key.slice(6)}` : source.key, text: `Earn ${check.missingSkills[0].name} XP at ${source.label}` };
  if (done) next.text = `${room.title} complete — choose another blueprint`;
  return {room,missing,check,done,next};
}

/** A series circuit conducts only as far as its first disconnected junction. */
export function signalPath(states: number[], target: number[]) {
  let powered = 0;
  for (let i = 0; i < target.length; i++) { if (states[i] !== target[i]) break; powered++; }
  return powered;
}

export function sensorReading(raw: number, offset: number) { return Math.round((raw + offset) * 10) / 10; }
export function gripResult(gap: number, force: number) {
  if (gap > 42) return 'open';
  if (gap < 32 || force > 65) return 'crushed';
  return force >= 30 ? 'held' : 'slipping';
}

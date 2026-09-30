import type { Portfolio } from '@/lib/portfolio';
import { partKey, PROJECTS_LEVEL, roomKey } from '../../lib/skills.ts';
import type { SaveData } from './store.ts';

/** Mission rules: objectives, clear conditions, gear and achievements (pure). */

export type Gear = { id: string; name: string; desc: string; slot?: 1 | 2 | 3 | 4; from: string };

export const GEAR: Gear[] = [
  { id: 'dash', name: 'Servo Boots', desc: 'Dash (Shift / Space)', from: 'about' },
  { id: 'scanner', name: 'Scanner Pulse', desc: 'Reveal terminals, parts and bots on the minimap', slot: 1, from: 'education' },
  { id: 'emp', name: 'EMP Arc', desc: 'Stun and damage nearby bots', slot: 2, from: 'experience' },
  { id: 'repair', name: 'Repair Kit', desc: 'Restore health', slot: 3, from: 'leadership' },
  { id: 'drone', name: 'Drone Buddy', desc: 'A mini drone zaps nearby bots', slot: 4, from: 'projects' },
  { id: 'firewall', name: 'Firewall', desc: '+2 max health', from: 'github' },
];

export type BossDef = { type: 'core' | 'arm' | 'queen' | 'boss' | 'swarm'; name: string; title: string; required: boolean };
/** One mini-boss per combat mission. Contact's is optional so the contact form is never locked behind a fight. */
export const BOSSES: Record<string, BossDef> = {
  about: { type: 'core', name: 'Overloaded Core', title: 'Reactor meltdown in progress', required: true },
  experience: { type: 'arm', name: 'Rogue Assembly Arm', title: 'Line 4 has gone rogue', required: true },
  projects: { type: 'queen', name: 'Bug Queen', title: 'Mother of all short circuits', required: true },
  github: { type: 'boss', name: 'Merge Conflict', title: '<<<<<<< ours · theirs >>>>>>>', required: true },
  contact: { type: 'swarm', name: 'Static Swarm', title: 'Interference on every channel', required: false },
};

export type PuzzleDef = { type: 'sequence' | 'rotate' | 'pattern'; name: string; hint: string; nodes: number };
/** Themed puzzles; each gates the mission's final room with an energy barrier. */
export const PUZZLES: Record<string, PuzzleDef> = {
  about: { type: 'sequence', name: 'Restart the capacitors', hint: 'Charge the capacitors in the order shown on the diagnostics console.', nodes: 3 },
  projects: { type: 'rotate', name: 'Rewire the junctions', hint: 'Rotate each junction until it matches the circuit diagram.', nodes: 3 },
  github: { type: 'pattern', name: 'Route the packets', hint: 'Set each switch so the routing table matches the packet header.', nodes: 4 },
};

export const COOLDOWNS: Record<string, number> = { dash: 0.9, scanner: 12, emp: 8, repair: 20, drone: 25, melee: 0.3, zap: 0.45, cat: 10 };

export type Achievement = { id: string; name: string; desc: string };
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-steps', name: 'First Steps', desc: 'Deploy to a mission' },
  { id: 'cat-person', name: 'Cat Person', desc: 'Pet Xiao Hu 5 times' },
  { id: 'bug-squasher', name: 'Bug Squasher', desc: 'Defeat 25 bots' },
  { id: 'pacifist', name: 'Pacifist', desc: 'Clear a combat mission without defeating a bot' },
  { id: 'builder', name: 'Builder', desc: 'Build your first project' },
  { id: 'master-builder', name: 'Master Builder', desc: 'Build all six projects' },
  { id: 'merge-resolved', name: 'Merge Resolved', desc: 'Defeat Merge Conflict' },
  { id: 'maxed', name: 'Maxed Out', desc: 'Raise any skill to its maximum' },
  { id: 'read-everything', name: 'Read Every Bullet', desc: 'Collect every data chip' },
  { id: 'curator', name: 'Curator', desc: 'Fill every trophy shelf' },
  { id: 'backroom', name: 'The Backroom', desc: 'Find what hides behind the shelves' },
  { id: 'speedrunner', name: 'Speedrunner', desc: 'Reach the Comms Core within 5 minutes of play' },
  { id: 'transmission', name: 'Transmission Sent', desc: 'Send Dayna a message' },
  { id: 'giant-slayer', name: 'Giant Slayer', desc: 'Defeat every mini-boss' },
  { id: 'puzzler', name: 'Puzzler', desc: 'Solve all three puzzles without Xiao Hu chewing the wires' },
  { id: 'good-kitty', name: 'Good Kitty', desc: 'Let Xiao Hu stun or fetch 5 times' },
  { id: 'combo', name: 'Three-Hit Wonder', desc: 'Land a full wrench combo on a mini-boss' },
  { id: 'archivist', name: 'Archivist', desc: 'Recover every data fragment in a mission' },
  { id: 'fab-breaker', name: 'Supply Chain Attack', desc: 'Destroy 5 bot fabricators' },
];

export const MISSION_ORDER = ['about', 'education', 'experience', 'projects', 'trophies', 'leadership', 'github', 'contact'];

const visible = <T extends { todo: boolean; body: string }>(xs: T[]) => xs.filter((x) => !x.todo || x.body);

/** Rooms whose console must be scanned to clear a standard mission. */
function consoleRooms(p: Portfolio, levelId: string) {
  const level = p.levels.find((l) => l.id === levelId);
  if (!level) return [];
  if (levelId === 'trophies') return level.rooms.filter((r) => r.id === 'awards' || r.id === 'skill-matrix');
  if (levelId === 'contact') return [];
  return level.rooms;
}

/** Every data-chip key in a mission (consoles + parts, or parts + builds for Projects). */
export function chipKeys(p: Portfolio, levelId: string): string[] {
  const level = p.levels.find((l) => l.id === levelId);
  if (!level || level.meta.kind === 'hub') return [];
  if (levelId === PROJECTS_LEVEL)
    return level.rooms.flatMap((r) => [`build:${r.id}`, ...r.parts.map((part) => partKey(levelId, r.id, part.id))]);
  if (levelId === 'contact') return ['relay-1', 'relay-2', 'relay-3', 'sent'].map((k) => `contact:${k}`);
  const rooms = levelId === 'trophies' ? level.rooms.filter((r) => r.id !== 'backroom') : level.rooms;
  return rooms.flatMap((r) => [
    roomKey(levelId, r.id),
    ...(levelId === 'trophies' && r.id !== 'awards' ? [] : visible(r.parts).map((part) => partKey(levelId, r.id, part.id))),
  ]);
}

export function hasChip(save: SaveData, key: string) {
  if (key.startsWith('build:')) return save.built.includes(key.slice(6));
  if (key.startsWith('contact:')) {
    const k = key.slice(8);
    return k === 'sent' ? save.sent : save.relays.includes(k);
  }
  return save.scanned.includes(key);
}

export function chips(p: Portfolio, save: SaveData, levelId: string) {
  const keys = chipKeys(p, levelId);
  return { got: keys.filter((k) => hasChip(save, k)).length, total: keys.length };
}

export function allChipsCollected(p: Portfolio, save: SaveData) {
  return MISSION_ORDER.every((id) => {
    const c = chips(p, save, id);
    return c.got >= c.total;
  });
}

export function bossDone(save: SaveData, levelId: string, peaceful: boolean) {
  const boss = BOSSES[levelId];
  return !boss || !boss.required || peaceful || save.bosses.includes(levelId);
}

export function isCleared(p: Portfolio, save: SaveData, levelId: string, peaceful: boolean): boolean {
  const level = p.levels.find((l) => l.id === levelId);
  if (!level) return false;
  if (levelId === PROJECTS_LEVEL) return level.rooms.every((r) => save.built.includes(r.id)) && bossDone(save, levelId, peaceful);
  if (levelId === 'contact') return save.sent;
  const rooms = consoleRooms(p, levelId);
  const scanned = rooms.every((r) => save.scanned.includes(roomKey(levelId, r.id)));
  return scanned && bossDone(save, levelId, peaceful);
}

export function clearedCount(p: Portfolio, save: SaveData) {
  return MISSION_ORDER.filter((id) => id !== 'contact' && save.cleared.includes(id)).length;
}

export function contactUnlocked(p: Portfolio, save: SaveData) {
  return clearedCount(p, save) >= p.site.contactUnlockAfter;
}

export function objective(p: Portfolio, save: SaveData, levelId: string, peaceful: boolean): { text: string; done: boolean } {
  if (levelId === 'hub') {
    const unlocked = contactUnlocked(p, save);
    const n = clearedCount(p, save);
    if (save.sent) return { text: 'Transmission sent — thanks for playing!', done: true };
    if (unlocked) return { text: 'Comms Core unlocked — send Dayna a transmission', done: false };
    return { text: `Pick a mission on the star map · ${n}/${p.site.contactUnlockAfter} cleared to unlock Comms`, done: false };
  }
  const level = p.levels.find((l) => l.id === levelId);
  if (!level) return { text: '', done: false };
  const done = isCleared(p, save, levelId, peaceful);
  if (levelId === PROJECTS_LEVEL) {
    const built = level.rooms.filter((r) => save.built.includes(r.id)).length;
    const parts = level.rooms.flatMap((r) => r.parts.map((x) => partKey(levelId, r.id, x.id)));
    const got = parts.filter((k) => save.scanned.includes(k)).length;
    if (built === level.rooms.length && !bossDone(save, levelId, peaceful)) return { text: `Defeat the ${BOSSES[levelId].name}`, done };
    return { text: `Build projects ${built}/${level.rooms.length} · parts ${got}/${parts.length}`, done };
  }
  if (levelId === 'contact') {
    if (save.sent) return { text: 'Transmission sent!', done: true };
    const n = save.relays.length;
    return n < 3 ? { text: `Power the relay nodes ${n}/3`, done } : { text: 'Dish aligned — use the transmission console', done };
  }
  const rooms = consoleRooms(p, levelId);
  const n = rooms.filter((r) => save.scanned.includes(roomKey(levelId, r.id))).length;
  const verb = levelId === 'leadership' ? 'Talk to the colonists' : 'Scan the consoles';
  let text = `${verb} ${n}/${rooms.length}`;
  if (n === rooms.length && !bossDone(save, levelId, peaceful)) text = `Defeat the ${BOSSES[levelId].name}`;
  if (levelId === 'trophies' && done) text = `Optional: fill the shelves ${save.shelved.length}/6`;
  return { text, done };
}

export function gearUnlocked(save: SaveData) {
  return GEAR.filter((g) => save.cleared.includes(g.from));
}

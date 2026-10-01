/**
 * Trial rooms: dungeon rooms between content rooms whose exit stays locked until a small task is
 * done. Pure data + selection so layout and tests agree on what each trial is.
 */
export type TrialType = 'button' | 'push' | 'lasers' | 'battery' | 'arena';

export const TRIAL_INFO: Record<TrialType, { name: string; task: string; hint: string; done: string }> = {
  button: {
    name: 'Hidden Release',
    task: 'Find the door release hidden somewhere in this room.',
    hint: 'The release is tucked away behind some crates. Check the corners!',
    done: 'Door release pressed — the way is open.',
  },
  push: {
    name: 'Dead Weight',
    task: 'Push the heavy crate onto the pressure plate (walk into it; E pulls it towards you).',
    hint: 'Walk into the crate to shove it, or press E beside it to drag it back a step.',
    done: 'Plate weighed down — door unlocked.',
  },
  lasers: {
    name: 'Laser Array',
    task: 'Switch off the three breakers to shut down the laser array on the exit.',
    hint: 'Three breaker boxes are scattered around the room. Flip them all.',
    done: 'Array offline — the laser wall is down.',
  },
  battery: {
    name: 'Dead Circuit',
    task: 'Carry the power cell across the room and slot it into the door socket.',
    hint: "The door is out of power. There's a spare cell on the far side — bring it over.",
    done: 'Door powered — it slides open.',
  },
  arena: {
    name: 'Lockdown',
    task: 'Lockdown! Defeat both waves of bots to release the doors.',
    hint: 'Survive the waves. Hazards hurt bots too — use them!',
    done: 'Lockdown lifted.',
  },
};

const ORDER: TrialType[] = ['button', 'lasers', 'push', 'arena', 'battery'];

/** Hand-planned so every kind of task shows up two or three times across the game. */
const PLAN: Record<string, TrialType[]> = {
  about: ['battery'],
  education: ['lasers', 'push'],
  experience: ['arena', 'battery'],
  projects: ['push', 'lasers'],
  trophies: ['button', 'arena'],
  leadership: ['push', 'button'],
  github: ['lasers'],
  contact: ['button'],
};

/** Deterministic trial type for the `n`th trial of a mission (no arenas in Peaceful mode). */
export function trialType(levelId: string, n: number, peaceful: boolean): TrialType {
  const planned = PLAN[levelId]?.[n];
  if (planned) return peaceful && planned === 'arena' ? 'button' : planned;
  let h = n * 7;
  for (const ch of levelId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  let t = ORDER[h % ORDER.length];
  if (peaceful && t === 'arena') t = 'button';
  return t;
}

/** Where trials go: after the first content room, then mid-way through the rest (max two). */
export function trialSlots(contentCount: number): number[] {
  if (contentCount < 2) return [];
  const slots = [0];
  if (contentCount >= 3) slots.push(Math.max(1, Math.floor((contentCount - 1) / 2) + (contentCount > 4 ? 1 : 0)));
  return [...new Set(slots)].filter((s) => s < contentCount - 1);
}

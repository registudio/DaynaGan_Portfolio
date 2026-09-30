/**
 * Tiny observable store shared by the engine (writer) and the React HUD (reader).
 * Also owns persistent progress + settings in localStorage.
 */

export type Action =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'melee'
  | 'zap'
  | 'dash'
  | 'interact'
  | 'artifact1'
  | 'artifact2'
  | 'artifact3'
  | 'artifact4'
  | 'cat'
  | 'pause';

export const DEFAULT_KEYS: Record<Action, string[]> = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  melee: ['KeyJ'],
  zap: ['KeyK'],
  dash: ['ShiftLeft', 'Space'],
  interact: ['KeyE', 'Enter'],
  artifact1: ['Digit1'],
  artifact2: ['Digit2'],
  artifact3: ['Digit3'],
  artifact4: ['Digit4'],
  cat: ['KeyC'],
  pause: ['Escape', 'KeyP'],
};

export type Difficulty = 'story' | 'normal' | 'hard';

export type Settings = {
  muted: boolean;
  difficulty: Difficulty;
  music: number;
  sfx: number;
  peaceful: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  quality: 'auto' | 'low' | 'high';
  depthReadability: boolean;
  textScale: number;
  hudScale: number;
  panelOpacity: number;
  keys: Record<Action, string[]>;
};

export type SaveData = {
  v: 2;
  scanned: string[];
  built: string[];
  shelved: string[];
  cleared: string[];
  achievements: string[];
  kills: number;
  pets: number;
  playMs: number;
  sent: boolean;
  backroom: boolean;
  tutorial: boolean;
  /** Bots defeated per mission (for the Pacifist achievement). */
  levelKills: Record<string, number>;
  relays: string[];
  /** Legacy (v2.0): Merge Conflict defeated. Superseded by `bosses`. */
  bossDefeated: boolean;
  /** Mission ids whose mini-boss is defeated. */
  bosses: string[];
  /** Puzzle ids solved. */
  puzzles: string[];
  /** Puzzles Xiao Hu bypassed. */
  bypassed: string[];
  catAssists?: number;
  /** Bot fabricators destroyed (ids like `about-fab-0`). */
  spawners?: string[];
  /** Lore fragments collected from bots. */
  fragments?: string[];
  /** Trial rooms completed (ids like `about-trial-0`). */
  trials?: string[];
  /** Planet Aurora: landmarks read, puzzles solved, regions discovered. */
  planet?: { seen: string[]; solved: string[]; regions: string[] };
  trackedProject?: string | null;
  labs?: string[];
  practiced?: string[];
};

export const SAVE_KEY = 'dg-save-v2';
const SETTINGS_KEY = 'dg-settings-v2';

export const emptySave = (): SaveData => ({
  v: 2,
  scanned: [],
  built: [],
  shelved: [],
  cleared: [],
  achievements: [],
  kills: 0,
  pets: 0,
  playMs: 0,
  sent: false,
  backroom: false,
  tutorial: false,
  levelKills: {},
  relays: [],
  bossDefeated: false,
  bosses: [],
  puzzles: [],
  bypassed: [],
});

export const defaultSettings = (): Settings => ({
  muted: true,
  difficulty: 'normal',
  music: 0.5,
  sfx: 0.8,
  peaceful: false,
  reducedMotion:
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  largeText: false,
  quality: 'auto',
  depthReadability: true,
  textScale: 1,
  hudScale: 1,
  panelOpacity: 0.94,
  keys: DEFAULT_KEYS,
});

function read<T>(key: string, fallback: () => T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback();
    return { ...fallback(), ...JSON.parse(raw) };
  } catch {
    return fallback();
  }
}

export function loadSave(): SaveData {
  const s = read(SAVE_KEY, emptySave);
  if (s.v !== 2) return emptySave();
  if (s.bossDefeated && !s.bosses.includes('github')) s.bosses.push('github');
  return s;
}
export function loadSettings(): Settings {
  const s = read(SETTINGS_KEY, defaultSettings);
  return { ...s, keys: { ...DEFAULT_KEYS, ...s.keys } };
}
export function persist(save: SaveData, settings: Settings) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

// ── UI state ────────────────────────────────────────────────────────────────

export type PanelAction = { id: string; label: string; primary?: boolean; href?: string };

export type Panel =
  | {
      kind: 'content';
      levelId: string;
      roomId: string;
      partId?: string;
      eyebrow?: string;
      title: string;
      html: string;
      meta?: Record<string, string>;
      /** Project model to show (rotate/explode). */
      model?: { projectId: string; ghost?: string[] };
      actions?: PanelAction[];
      tone?: 'info' | 'warn' | 'success';
    }
  | { kind: 'starmap' }
  | { kind: 'locker' }
  | { kind: 'contact' }
  | { kind: 'skills' }
  | { kind: 'credits' };

export type Toast = { id: number; text: string; kind: 'info' | 'skill' | 'achievement' | 'gear' | 'warn' };

export type Hud = {
  scene: string;
  sceneTitle: string;
  loading: string | null;
  hp: number;
  maxHp: number;
  cooldowns: Record<string, number>;
  prompt: { verb: string; label: string } | null;
  objective: { mission: string; text: string; done: boolean } | null;
  chips: { got: number; total: number } | null;
  panel: Panel | null;
  /** Non-blocking info card (e.g. a recovered project part). */
  card: { title: string; eyebrow: string; html: string; id: number } | null;
  /** Mission just cleared banner. */
  banner: { title: string; sub: string; id: number } | null;
  /** Hold-the-line assembly in progress. */
  assembly: { title: string; p: number; state: 'ok' | 'jammed' | 'away'; left: number } | null;
  /** Area title card shown on first entering a room. */
  area: { eyebrow: string; title: string; sub: string; id: number } | null;
  menu: null | 'pause';
  toasts: Toast[];
  save: SaveData;
  settings: Settings;
  /** Increments on every change to save data (for memoised selectors). */
  rev: number;
  touch: boolean;
  dead: boolean;
  /** Active mini-boss nameplate. */
  boss: { name: string; title: string } | null;
  /** Last-used input device, for control glyphs. */
  device: 'keyboard' | 'gamepad' | 'touch';
  /** Tour mode status (null when not touring). */
  tour: { step: number; total: number; label: string } | null;
  navigation?: { text: string; height: number; bearing: string } | null;
};

type Listener = () => void;

export class Store {
  private state: Hud;
  private listeners = new Set<Listener>();
  private toastId = 0;
  private pending: {text: string; kind: Toast['kind']; ms: number}[] = [];
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private quiet = false;

  setCombat(active: boolean) {
    this.quiet = active;
    if (!active && !this.state.toasts.length && this.pending.length) {
      const next = this.pending.shift()!;
      this.toast(next.text, next.kind, next.ms);
    }
  }
  dispose() { this.timers.forEach(clearTimeout); this.timers.clear(); this.pending = []; this.listeners.clear(); }

  constructor(initial: Hud) {
    this.state = initial;
  }
  get = () => this.state;
  subscribe = (fn: Listener) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  set(patch: Partial<Hud>) {
    let changed = false;
    for (const k in patch) {
      if ((this.state as Record<string, unknown>)[k] !== (patch as Record<string, unknown>)[k]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }
  toast(text: string, kind: Toast['kind'] = 'info', ms = 3200) {
    if ((this.quiet || this.state.toasts.length >= 2) && kind !== 'warn') {
      if (this.pending.length < 20) this.pending.push({text,kind,ms});
      return;
    }
    const id = ++this.toastId;
    this.set({ toasts: [...this.state.toasts.slice(-3), { id, text, kind }] });
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      this.set({ toasts: this.state.toasts.filter((t) => t.id !== id) });
      this.setCombat(this.quiet);
    }, ms);
    this.timers.add(timer);
  }
}

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { GitHubFeed } from '@/lib/github';
import type { Portfolio, Room } from '../../lib/portfolio.ts';
import { computeSkills, partKey, roomKey } from '../../lib/skills.ts';
import { buildProjectModel, type ProjectModel } from '../models/projects.ts';
import { Audio } from './audio.ts';
import { biomeFor, type Biome } from './biomes.ts';
import { BIOME_OUTFIT, buildCat, buildDayna, buildEnemy, buildNpc, type EnemyType, type Rig } from './characters.ts';
import { Input } from './input.ts';
import { buildLevel, setProjectIds, type LevelMap, type Spawn } from './layout.ts';
import {
  ACHIEVEMENTS,
  allChipsCollected,
  BOSSES,
  CAT_TRICKS,
  catTricks,
  chips,
  contactUnlocked,
  COOLDOWNS,
  GEAR,
  gearUnlocked,
  isCleared,
  MISSION_ORDER,
  objective,
  PUZZLES,
} from './missions.ts';
import { githubConsole, npcPanel, partCard, partPanel, projectPanel, repoPanel, roomPanel } from './panels.ts';
import {
  buildAssembly,
  buildBunk,
  buildCatBed,
  buildCenterpiece,
  buildConsole,
  buildDish,
  buildEarth,
  buildExitPad,
  buildLocker,
  buildMatrix,
  buildPartPickup,
  buildPlinth,
  buildPuzzleNode,
  buildProp,
  buildRelay,
  buildRepoRack,
  buildStarMap,
  buildTerminal,
  buildVendor,
  contributionTile,
  buildFragment,
  buildConveyor,
  buildEmpPad,
  buildLaserPost,
} from './props.ts';
import { heatLevel } from './heat.ts';
import { batchStatic } from './batch.ts';
import { rng } from './rng.ts';
import { buildSetPiece, type SetPiece } from './setpieces.ts';
import { loadSave, loadSettings, persist, Store, type Action, type Difficulty, type Hud, type Panel, type SaveData, type Settings } from './store.ts';
import { levelFragments, roomIntro, summarize, type Fragment } from './lore.ts';
import { glow } from './voxels.ts';
import { Ambient, Bursts, LightPool, World, type LightSource } from './world.ts';

// ── Tunables ─────────────────────────────────────────────────────────────────

const CAM_OFFSET = new THREE.Vector3(1, 1.3, 1).normalize().multiplyScalar(40);
const SCREEN_RIGHT = new THREE.Vector3(1, 0, -1).normalize();
const SCREEN_UP = new THREE.Vector3(-1, 0, -1).normalize();
const PLAYER_SPEED = 5;
const BASE_HP = 10;

type EnemySpec = { hp: number; speed: number; dmg: number; radius: number; shoot?: number; range?: number; color: string; aggro: number };
const ENEMY: Record<EnemyType, EnemySpec> = {
  wisp: { hp: 2, speed: 2.4, dmg: 1, radius: 0.3, color: '#f0abfc', aggro: 6 },
  welder: { hp: 5, speed: 1.5, dmg: 2, radius: 0.42, shoot: 2.6, range: 6, color: '#fb923c', aggro: 7 },
  crawler: { hp: 3, speed: 3.1, dmg: 1, radius: 0.42, color: '#ef4444', aggro: 7 },
  bug: { hp: 3, speed: 2.1, dmg: 1, radius: 0.36, color: '#22d3ee', aggro: 5 },
  packet: { hp: 2, speed: 3.6, dmg: 1, radius: 0.3, color: '#f87171', aggro: 8 },
  drone: { hp: 3, speed: 1.9, dmg: 1, radius: 0.36, shoot: 2.2, range: 7, color: '#a78bfa', aggro: 8 },
  // Mini-bosses
  core: { hp: 30, speed: 1.4, dmg: 2, radius: 0.9, shoot: 2.4, range: 12, color: '#f0abfc', aggro: 12 },
  arm: { hp: 40, speed: 0, dmg: 2, radius: 1.0, shoot: 2.2, range: 12, color: '#fbbf24', aggro: 12 },
  queen: { hp: 40, speed: 1.2, dmg: 2, radius: 1.1, shoot: 2.6, range: 12, color: '#22d3ee', aggro: 12 },
  boss: { hp: 55, speed: 1.1, dmg: 2, radius: 1.1, shoot: 2.5, range: 12, color: '#fef08a', aggro: 12 },
  swarm: { hp: 34, speed: 1.6, dmg: 2, radius: 0.9, shoot: 2.4, range: 12, color: '#c4b5fd', aggro: 12 },
  // Bot fabricator: static, prints bots until destroyed.
  spawner: { hp: 14, speed: 0, dmg: 0, radius: 0.8, color: '#f43f5e', aggro: 10 },
  // Explosive capacitor (a hazard, but hittable like a bot).
  capacitor: { hp: 1, speed: 0, dmg: 0, radius: 0.4, color: '#facc15', aggro: 0 },
};

const SPAWN_EVERY = 4.5;
const SPAWN_CAP = 3;

/** Attack rotation per mini-boss; every attack is telegraphed first. */
const BOSS_PATTERNS: Record<string, string[]> = {
  core: ['ring', 'lunge', 'ring', 'summon'],
  arm: ['fan', 'fan', 'summon', 'ring'],
  queen: ['fan', 'summon', 'lunge', 'fan'],
  boss: ['ring', 'summon', 'fan', 'ring'],
  swarm: ['blink', 'ring', 'fan', 'blink', 'summon'],
};

/** Difficulty presets (Pause → Settings). */
const DIFFICULTY: Record<Difficulty, { hp: number; dmg: number; speed: number; cooldown: number; extra: boolean }> = {
  story: { hp: 0.6, dmg: 0.5, speed: 0.85, cooldown: 1.35, extra: false },
  normal: { hp: 1, dmg: 1, speed: 1, cooldown: 1, extra: false },
  hard: { hp: 1.45, dmg: 1.5, speed: 1.15, cooldown: 0.8, extra: true },
};

type Enemy = {
  type: EnemyType;
  spec: EnemySpec;
  rig: Rig;
  pos: THREE.Vector3;
  hp: number;
  cd: number;
  touchCd: number;
  stun: number;
  wander: THREE.Vector3 | null;
  wanderT: number;
  room: number;
  home: THREE.Vector3;
  flash: number;
  carry: { projectId: string; partId: string } | null;
  boss: boolean;
  summoned: boolean;
  step: number;
  windup: number;
  pending: string | null;
  aim: THREE.Vector3 | null;
  lunge: { dir: THREE.Vector3; t: number } | null;
  tele?: THREE.Mesh;
  /** Capacitors only: seconds until a chain-reaction detonation. */
  fuse?: number;
  /** Fabricators only: what they print, their live bots, and their save id. */
  fab?: { type: EnemyType; id: string; kids: Enemy[]; t: number };
};

type Projectile = { mesh: THREE.Mesh; pos: THREE.Vector3; vel: THREE.Vector3; from: 'player' | 'enemy'; dmg: number; life: number };

type Inter = {
  id: string;
  kind: string;
  pos: THREE.Vector3;
  radius: number;
  verb: string;
  label: string;
  sub?: string;
  object: THREE.Object3D;
  done: () => boolean;
  enabled?: () => boolean;
  use: () => void;
  auto?: boolean;
  el?: HTMLDivElement;
  accent?: string;
  /** Floor ring drawn at exactly the trigger radius. */
  ring?: THREE.Group;
  /** Shown on the hologram card while you stand in the ring. */
  summary?: string;
  /** Big always-on readout (stat parts like "3.97 · Diploma GPA"). */
  stat?: { value: string; label: string };
  /** Passive read: standing in the ring for a moment counts as scanning. */
  scan?: () => void;
};

const DWELL = 1.3;

export type GameEvents = {
  onExit: (mode: 'pro' | 'splash', anchor?: string) => void;
};

export class Game {
  store: Store;
  readonly portfolio: Portfolio;
  readonly github: GitHubFeed;
  save: SaveData;
  settings: Settings;
  input!: Input;
  audio = new Audio();

  private canvas: HTMLCanvasElement;
  private overlay: HTMLElement;
  private events: GameEvents;
  private renderer!: THREE.WebGLRenderer;
  private composer!: EffectComposer;
  private bloom!: UnrealBloomPass;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 200);
  private camTarget = new THREE.Vector3();
  private shake = 0;
  private hemi = new THREE.HemisphereLight('#ffffff', '#222222', 1);
  private sun = new THREE.DirectionalLight('#ffffff', 1);
  private lights!: LightPool;
  private suit = new THREE.PointLight('#e9e3ff', 14, 7, 1.4);
  private raf = 0;
  private last = 0;
  private time = 0;
  private quality: 'low' | 'high' = 'high';
  private basePixelRatio = 1;
  private resScale = 1;
  private frameEma = 16;
  private resT = 3;

  private sceneId = 'hub';
  private map!: LevelMap;
  private world: World | null = null;
  private biome!: Biome;
  private level = new THREE.Group();
  private ambient: Ambient | null = null;
  private bursts = new Bursts();

  private player!: {
    rig: Rig;
    pos: THREE.Vector3;
    facing: number;
    hp: number;
    invuln: number;
    dashT: number;
    dashDir: THREE.Vector3;
    swingT: number;
    checkpoint: THREE.Vector3;
    room: number;
    dead: number;
    idle: number;
    history: THREE.Vector3[];
  };
  private cat!: {
    rig: Rig;
    pos: THREE.Vector3;
    facing: number;
    sleeping: boolean;
    sit: number;
    mode: 'follow' | 'pounce' | 'fetch' | 'carry';
    target: Enemy | null;
    fetch: Inter | null;
  };
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private inters: Inter[] = [];
  private hearts: { mesh: THREE.Object3D; pos: THREE.Vector3 }[] = [];
  private spinners: THREE.Object3D[] = [];
  private staticRoots: THREE.Object3D[] = [];
  /** Last frame's renderer stats (dev: __game.stats). */
  stats = { calls: 0, triangles: 0, fps: 60, scale: 1, tier: 0 };
  private blueprints = new Map<string, ProjectModel>();
  private cooldowns: Record<string, number> = {};
  private scannerT = 0;
  /** Xiao Hu's bed in the Backroom (she naps there while you explore it). */
  private catBed: THREE.Vector3 | null = null;
  private combo = 0;
  private comboT = 0;
  private hitStop = 0;
  private touring = false;
  private buddy: { mesh: THREE.Object3D; t: number; fire: number } | null = null;
  private relayObjs = new Map<string, THREE.Group>();
  private dish: THREE.Group | null = null;
  private beamT = 0;

  private bubble!: HTMLDivElement;
  private bubbleQueue: { text: string; ms: number }[] = [];
  private bubbleT = 0;
  private hintT = 20;
  private minimap: HTMLCanvasElement | null = null;
  private minimapBase: HTMLCanvasElement | null = null;
  private minimapT = 0;
  private saveT = 0;
  private hudT = 0;
  private dirty = false;
  private ray = new THREE.Raycaster();
  private skillsCache: Record<string, number> = {};

  constructor(opts: { canvas: HTMLCanvasElement; overlay: HTMLElement; portfolio: Portfolio; github: GitHubFeed; events: GameEvents; touch: boolean }) {
    this.canvas = opts.canvas;
    this.overlay = opts.overlay;
    this.portfolio = opts.portfolio;
    this.github = opts.github;
    this.events = opts.events;
    this.save = loadSave();
    this.settings = loadSettings();
    setProjectIds(this.projectRooms().map((r) => r.id));
    this.store = new Store({
      scene: 'hub',
      sceneTitle: 'Station Hub',
      loading: 'BOOTING STATION…',
      hp: BASE_HP,
      maxHp: BASE_HP,
      cooldowns: {},
      prompt: null,
      objective: null,
      chips: null,
      panel: null,
      card: null,
      area: null,
      assembly: null,
      banner: null,
      menu: null,
      toasts: [],
      save: this.save,
      settings: this.settings,
      rev: 0,
      touch: opts.touch,
      dead: false,
      boss: null,
      tour: null,
      device: opts.touch ? 'touch' : 'keyboard',
    });
    this.skillsCache = this.skills();
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  start() {
    const touch = this.store.get().touch;
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: 'high-performance' });
    const autoLow = touch || (navigator.hardwareConcurrency ?? 8) <= 4 || Math.min(innerWidth, innerHeight) < 600 || weakGpu(this.renderer);
    this.quality = this.settings.quality === 'auto' ? (autoLow ? 'low' : 'high') : this.settings.quality;
    this.basePixelRatio = Math.min(devicePixelRatio, this.quality === 'high' ? 1.25 : 1);
    this.renderer.setPixelRatio(this.basePixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = this.quality === 'high';
    this.renderer.info.autoReset = false;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.15, 0.9);
    // Bloom is a blur: computing it at half resolution looks the same for a quarter of the fill cost.
    const bloomSize = this.bloom.setSize.bind(this.bloom);
    this.bloom.setSize = (w: number, h: number) => bloomSize(Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 2)));
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.scene.add(this.hemi, this.sun, this.sun.target, this.level, this.bursts.group, this.suit);
    this.sun.castShadow = this.quality === 'high';
    this.sun.shadow.mapSize.set(1024, 1024);
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -16;
    sc.right = sc.top = 16;
    sc.near = 1;
    sc.far = 80;
    this.sun.shadow.bias = -0.0008;
    this.lights = new LightPool(this.scene, this.quality === 'high' ? 6 : 4);

    this.input = new Input(this.canvas, this.settings.keys);
    this.bubble = document.createElement('div');
    this.bubble.className = 'g-bubble';
    this.bubble.hidden = true;
    this.overlay.appendChild(this.bubble);
    this.applySettings();
    this.resize();
    addEventListener('resize', this.resize);
    document.addEventListener('visibilitychange', this.onVisibility);

    this.loadScene('hub', true);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    removeEventListener('resize', this.resize);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.persistNow();
    this.clearScene();
    this.input?.dispose();
    this.audio.dispose();
    this.composer?.dispose();
    this.renderer?.dispose();
    this.overlay.innerHTML = '';
  }

  private onVisibility = () => {
    if (document.hidden) {
      this.persistNow();
      this.audio.stop();
    } else if (!this.settings.muted) this.audio.playMusic(this.biome.id);
  };

  private resize = () => {
    const w = this.canvas.clientWidth || innerWidth;
    const h = this.canvas.clientHeight || innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w / 2, h / 2);
    const aspect = w / h;
    const half = aspect >= 1 ? 5.6 : Math.min(9, 5.6 / Math.max(aspect, 0.6));
    this.camera.left = -half * aspect;
    this.camera.right = half * aspect;
    this.camera.top = half;
    this.camera.bottom = -half;
    this.camera.updateProjectionMatrix();
  };

  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop);
    const raw = now - this.last;
    const dt = Math.min(0.05, raw / 1000);
    this.last = now;
    this.adaptResolution(raw, dt);
    const st = this.store.get();
    const paused = !!(st.panel || st.menu || st.loading || this.beaming);
    const actions = this.input.consume();
    if (this.input.device !== this.store.get().device) this.store.set({ device: this.input.device });
    if (actions.has('pause')) this.togglePause();
    if (!paused && this.world && this.hitStop > 0) {
      this.hitStop -= dt;
      // Keep presses made during the freeze so combos never drop inputs.
      for (const a of actions) if (a !== 'pause') this.buffered.add(a);
    } else if (!paused && this.world) {
      if (this.buffered.size) {
        for (const a of this.buffered) actions.add(a);
        this.buffered.clear();
      }
      this.time += dt;
      this.save.playMs += dt * 1000;
      try {
        this.update(dt, actions);
      } catch (e) {
        // Never let one bad frame freeze the game.
        console.error(e);
      }
    } else if (this.world) {
      // Keep idle animations alive behind panels.
      this.player.rig.animate(this.time, 0, dt * 0.3);
      if (!st.loading) this.tourReading(dt);
    }
    this.lights?.update(this.player?.pos ?? this.camTarget, dt, this.time);
    this.render(dt);
    this.saveT -= dt;
    if (this.saveT <= 0) {
      this.saveT = 5;
      if (this.dirty) this.persistNow();
    }
  };

  /** Dynamic resolution: trade pixels for frame rate when frames run long, recover when they don't. */
  private adaptResolution(frameMs: number, dt: number) {
    if (document.hidden || frameMs > 2000) return;
    // Count slow frames too (capped), otherwise a struggling device looks fine.
    this.frameEma += (Math.min(frameMs, 500) - this.frameEma) * 0.08;
    this.stats.fps = Math.round(1000 / this.frameEma);
    this.resT -= dt;
    if (this.resT > 0) return;
    this.resT = 2;
    let next = this.resScale;
    if (this.frameEma > 22 && this.resScale > 0.5) next = Math.max(0.5, this.resScale * 0.85);
    else if (this.frameEma < 14.5 && this.resScale < 1) next = Math.min(1, this.resScale * 1.1);
    // Already at the resolution floor and still slow: shed effects, cheapest-to-lose first.
    if (this.frameEma > 26 && this.resScale <= 0.501) {
      if (++this.slowChecks >= 2) {
        this.slowChecks = 0;
        this.dropQualityTier();
      }
    } else this.slowChecks = 0;
    if (next === this.resScale) return;
    this.resScale = next;
    this.stats.scale = Math.round(next * 100) / 100;
    this.renderer.setPixelRatio(this.basePixelRatio * next);
    this.composer.setPixelRatio(this.basePixelRatio * next);
    this.resize();
  }

  private slowChecks = 0;
  private tier = 0;

  private dropQualityTier() {
    if (this.tier === 0 && this.renderer.shadowMap.enabled) {
      this.renderer.shadowMap.enabled = false;
      this.sun.castShadow = false;
    } else if (this.tier <= 1 && this.lights.lights.length > 3) {
      for (const l of this.lights.lights.splice(3)) this.scene.remove(l);
      this.tier = 1;
    } else if (this.bloom.enabled) this.bloom.enabled = false;
    else return;
    this.tier++;
    this.stats.tier = this.tier;
  }

  private render(dt: number) {
    if (!this.world) return;
    const target = this.player.pos.clone();
    target.y += 0.6;
    this.camTarget.lerp(target, 1 - Math.exp(-dt * 6));
    const shake = this.settings.reducedMotion ? 0 : this.shake;
    this.shake = Math.max(0, this.shake - dt * 2.5);
    this.camera.position.copy(this.camTarget).add(CAM_OFFSET);
    if (shake) this.camera.position.add(new THREE.Vector3((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, 0));
    this.camera.lookAt(this.camTarget);
    this.sun.position.copy(this.camTarget).add(new THREE.Vector3(-8, 20, 6));
    this.sun.target.position.copy(this.camTarget);
    this.renderer.info.reset();
    this.composer.render();
    this.stats.calls = this.renderer.info.render.calls;
    this.stats.triangles = this.renderer.info.render.triangles;
    this.updateOverlays();
  }

  // ── Scenes ──────────────────────────────────────────────────────────────────

  private projectRooms(): Room[] {
    return this.portfolio.levels.find((l) => l.id === 'projects')?.rooms ?? [];
  }

  private levelTitle(id: string) {
    if (id === 'hub') return 'Station Hub';
    const l = this.portfolio.levels.find((x) => x.id === id);
    return l ? `${l.title} · ${biomeFor(l.meta.biome).name}` : id;
  }

  travel(id: string) {
    if (this.beaming) return;
    this.store.set({ panel: null, menu: null });
    this.audio.sfx('teleport');
    if (!this.world || !this.player || this.settings.reducedMotion) {
      this.loadScene(id);
      return;
    }
    // Beam out: Dayna (and Xiao Hu) stretch into a column of light, then the scene swaps.
    this.beaming = true;
    this.beam(false, () => {
      this.beaming = false;
      this.loadScene(id);
    });
  }

  private beaming = false;
  private buffered = new Set<Action>();
  private dwell: { target: Inter | null; t: number } = { target: null, t: 0 };
  private announced = new Set<number>();
  private nineLivesUsed = false;
  private slowT = 0;
  private fragments: Fragment[] = [];

  /** Teleport light column. `arriving` grows the rigs back in; otherwise they shrink away. */
  private beam(arriving: boolean, done?: () => void) {
    if (!this.player) return done?.();
    const color = this.biome?.light ?? '#a78bfa';
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 14, 12, 1, true), mat);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 14, 8, 1, true), mat.clone());
    col.add(core);
    col.position.copy(this.player.pos).add(new THREE.Vector3(0, 7, 0));
    this.level.add(col);
    const rigs = [this.player.rig.root, this.cat?.rig.root].filter(Boolean) as THREE.Object3D[];
    const dur = arriving ? 650 : 560;
    const t0 = performance.now();
    const tick = () => {
      const k = Math.min(1, (performance.now() - t0) / dur);
      // Column flares up then fades; rigs squash to a sliver (or unsquash on arrival).
      const flare = Math.sin(k * Math.PI);
      mat.opacity = 0.75 * flare;
      (core.material as THREE.MeshBasicMaterial).opacity = Math.min(1, 1.3 * flare);
      col.scale.set(1 + 0.3 * flare, 1, 1 + 0.3 * flare);
      const g = arriving ? Math.max(0, (k - 0.25) / 0.75) : 1 - k;
      const e = g * g * (3 - 2 * g);
      for (const r of rigs) r.scale.set(Math.max(0.001, e), Math.max(0.001, 1 + (1 - e) * 1.4), Math.max(0.001, e));
      if (k < 1) requestAnimationFrame(tick);
      else {
        for (const r of rigs) r.scale.setScalar(arriving ? 1 : 0.001);
        this.level.remove(col);
        col.geometry.dispose();
        core.geometry.dispose();
        mat.dispose();
        (core.material as THREE.Material).dispose();
        done?.();
      }
    };
    requestAnimationFrame(tick);
    if (arriving) this.bursts.spawn(this.player.pos.clone().add(new THREE.Vector3(0, 0.3, 0)), color, 18);
  }

  private loadScene(id: string, first = false) {
    const biomeName = id === 'hub' ? 'the station' : biomeFor(this.portfolio.levels.find((l) => l.id === id)?.meta.biome).name;
    this.store.set({ loading: first ? 'BOOTING STATION…' : id === 'hub' ? 'RETURNING TO STATION…' : `DEPLOYING TO ${biomeName.toUpperCase()}…` });
    setTimeout(() => {
      try {
        this.buildScene(id);
      } catch (e) {
        console.error(e);
      }
      setTimeout(() => {
        this.store.set({ loading: null });
        if (!first && !this.settings.reducedMotion) this.beam(true);
      }, first ? 350 : 500);
      this.afterEnter(id);
    }, 60);
  }

  private clearScene() {
    for (const i of this.inters) i.el?.remove();
    this.inters = [];
    this.enemies = [];
    this.projectiles = [];
    this.hearts = [];
    this.spinners = [];
    this.staticRoots = [];
    this.puzzle = null;
    this.assembly = null;
    this.hazards = [];
    this.catBed = null;
    this.relayObjs.clear();
    this.dish = null;
    this.buddy = null;
    this.blueprints.forEach((m) => m.dispose());
    this.blueprints.clear();
    this.setPiece?.dispose();
    this.setPiece = null;
    this.level.clear();
    this.world?.dispose();
    this.world = null;
    if (this.ambient) {
      this.scene.remove(this.ambient.points);
      this.ambient.dispose();
      this.ambient = null;
    }
    if (this.lights) this.lights.sources = [];
  }

  private setPiece: SetPiece | null = null;
  private levelCache = new Map<string, LevelMap>();

  /** Level layouts are deterministic; build once per session and hand out copies (secrets mutate cells). */
  private cachedLevel(id: string): LevelMap {
    const key = `${id}|${this.settings.peaceful}`;
    let map = this.levelCache.get(key);
    if (!map) {
      map = buildLevel(this.portfolio, id, { peaceful: this.settings.peaceful, github: this.github });
      this.levelCache.set(key, map);
    }
    return structuredClone(map);
  }

  private buildScene(id: string) {
    this.clearScene();
    this.bubbleQueue = [];
    this.bubbleT = 0;
    this.store.set({ boss: null, assembly: null });
    this.sceneId = id;
    const level = this.portfolio.levels.find((l) => l.id === id);
    this.biome = id === 'hub' ? biomeFor('orbital-station', '#a78bfa') : biomeFor(level?.meta.biome, level?.meta.light);
    const b = this.biome;
    this.map = this.cachedLevel(id);
    this.announced.clear();
    this.nineLivesUsed = false;
    this.fragments = level ? levelFragments(level) : [];
    const secret = this.map.rooms.find((r) => r.kind === 'secret');
    const hidden = secret && !this.save.backroom ? secret.i : null;
    this.world = new World(this.map, b, hidden);
    this.level.add(this.world.group);

    this.scene.background = new THREE.Color(b.background);
    this.scene.fog = new THREE.Fog(b.fog, 52, 95);
    this.hemi.color.set(b.ambient);
    this.hemi.groundColor.set(b.background);
    this.hemi.intensity = b.ambientIntensity * 2.2;
    this.sun.color.set(b.sun);
    this.sun.intensity = b.sunIntensity * 2;

    // Room lights in the biome's dominant colour.
    for (const room of this.map.rooms) {
      if (room.i === hidden) continue;
      const backroom = room.kind === 'secret';
      this.addLight(
        new THREE.Vector3(room.x + room.w / 2, room.h + 3.2, room.z + room.d / 2),
        backroom ? '#fef08a' : b.light,
        7,
        Math.max(room.w, room.d) * 1.1,
        backroom ? 0.7 : 0,
      );
    }

    for (const s of this.map.spawns) this.spawn(s, hidden);
    batchStatic(this.staticRoots, this.level);
    this.staticRoots = [];

    // Player + cat
    const spawnH = this.world.heightAt(this.map.spawn.x, this.map.spawn.z);
    const pos = new THREE.Vector3(this.map.spawn.x, spawnH, this.map.spawn.z);
    const rig = buildDayna(BIOME_OUTFIT[this.biome.id] ?? 'jacket');
    this.level.add(rig.root);
    const maxHp = this.maxHp();
    this.player = {
      rig,
      pos,
      facing: Math.PI / 4,
      hp: maxHp,
      invuln: 0,
      dashT: 0,
      dashDir: new THREE.Vector3(),
      swingT: 0,
      checkpoint: pos.clone(),
      room: this.world.roomAt(pos.x, pos.z),
      dead: 0,
      idle: 0,
      history: [],
    };
    const catRig = buildCat();
    this.level.add(catRig.root);
    const catPos = pos.clone().add(new THREE.Vector3(-1, 0, 0.6));
    let sleeping = false;
    if (id === 'hub') {
      const bed = this.map.spawns.find((s) => s.kind === 'hub' && s.what === 'catbed');
      if (bed && !this.save.tutorial) {
        catPos.set(bed.x, 0.2, bed.z);
        sleeping = true;
      }
    }
    this.cat = { rig: catRig, pos: catPos, facing: 0, sleeping, sit: 0, mode: 'follow', target: null, fetch: null };
    this.addCatInteract();
    this.camTarget.copy(pos);

    this.ambient = new Ambient(b.particles, b.light, { x: 0, z: 0, w: this.map.w, d: this.map.d }, this.quality === 'high' ? 260 : 120);
    if (b.particles) this.scene.add(this.ambient.points);
    this.setPiece = buildSetPiece(b.id, this.map, this.quality);
    if (this.setPiece) this.level.add(this.setPiece.group);
    this.minimapBase = this.renderMinimapBase();
    this.audio.playMusic(b.id);
    this.store.set({
      scene: id,
      sceneTitle: this.levelTitle(id),
      hp: maxHp,
      maxHp,
      prompt: null,
      dead: false,
    });
    this.refreshHud();
  }

  private afterEnter(id: string) {
    const name = this.portfolio.site.companion.name;
    if (this.tour) {
      this.tourArrived();
      return;
    }
    if (id === 'hub') {
      if (!this.save.tutorial) {
        this.say(`Mrrp? …Oh! Hi, I'm ${name}, Dayna's cat.`, 4200);
        this.say(this.store.get().touch ? 'Drag the left stick to move.' : 'Move with WASD or the arrow keys.', 4000);
        this.say('Walk to the glowing star map and press E to pick a mission.', 5200);
        this.say('Try the Core Reactor first — it covers the basics. Meow!', 4500);
        this.save.tutorial = true;
        this.markDirty();
      } else if (contactUnlocked(this.portfolio, this.save) && !this.save.sent) {
        this.say('The Comms Core is online — we can send Dayna a message!', 4500);
      } else this.say('Welcome back aboard. Meow.', 2500);
      return;
    }
    this.award('first-steps');
    if (id === 'contact' && this.save.playMs < 5 * 60 * 1000) this.award('speedrunner');
    const lines: Record<string, string[]> = {
      about: [
        'This is the heart of the station — and a quick intro to Dayna.',
        'Walk up to glowing consoles and press E to scan them.',
        this.settings.peaceful ? 'Peaceful mode is on, so no bots today.' : 'Spark wisps! Click or J to swing, right-click or K for the solder beam.',
      ],
      education: ['The Academy Spires! Climb from SST to NUS — every console teaches Dayna new skills.'],
      experience: ['The Robot Forge. Each hall is one of Dayna’s internships, oldest first.', 'Careful — rogue welders!'],
      projects: [
        'The Circuit Caverns. Project parts are scattered everywhere…',
        'Grab them, then build each project at its vault’s assembly station.',
        'Some parts are carried by bugs. Zap them!',
      ],
      trophies: ['The Trophy Hall. Awards, the Skill Matrix… and empty shelves. Hmm.'],
      leadership: ['The Colony Commons — talk to the colonists to hear about Dayna’s leadership.'],
      github: ['The Mainframe. The floor glows with real commits.', 'Something big is lurking in the commit feed…'],
      contact: ['The Comms Array! Power the three relays to align the dish.'],
      backroom: [],
    };
    for (const l of lines[id] ?? []) this.say(l, 4200);
  }

  private addLight(pos: THREE.Vector3, color: string, intensity: number, distance: number, flicker = 0) {
    const src: LightSource = { pos, color: new THREE.Color(color), intensity, distance, flicker };
    this.lights.sources.push(src);
    return src;
  }

  private place(obj: THREE.Object3D, x: number, z: number, rot = 0, batch = true) {
    const h = this.world!.heightAt(x, z);
    obj.position.set(x, h, z);
    obj.rotation.y = rot;
    this.level.add(obj);
    if (batch) this.staticRoots.push(obj);
    obj.traverse((o) => {
      if (o.userData.spin || o.userData.hover || o.userData.blink || o.userData.roll) this.spinners.push(o);
      const l = o.userData.light;
      if (l) {
        const wp = new THREE.Vector3();
        o.getWorldPosition(wp);
        // Hang prop lights well above the prop so nearby surfaces don't blow out (inverse-square near field).
        const y = Math.max(l.y, 2.4);
        this.addLight(wp.add(new THREE.Vector3(0, y, 0)), l.color, l.intensity, l.distance + (y - l.y), o === obj ? 0 : 0.2);
      }
    });
    return obj;
  }

  private inter(i: Omit<Inter, 'pos'> & { x: number; z: number }) {
    const h = this.world!.heightAt(i.x, i.z);
    const it: Inter = { ...i, pos: new THREE.Vector3(i.x, h, i.z) };
    // Replace the prop's decorative ring with one that matches the real trigger zone,
    // centred on the trigger point, so standing anywhere inside the circle works.
    if (!it.auto && it.object && it.object !== this.level) {
      const old: THREE.Object3D[] = [];
      it.object.traverse((o) => o.userData.interactRing && old.push(o));
      if (old.length) {
        old.forEach((o) => o.parent?.remove(o));
        it.ring = zoneRing(it.radius, it.accent ?? '#67e8f9');
        it.ring.position.set(it.pos.x, h + 0.05, it.pos.z);
        this.level.add(it.ring);
      }
    }
    this.inters.push(it);
    return it;
  }

  private spawn(s: Spawn, hidden: number | null) {
    const b = this.biome;
    const world = this.world!;
    if (hidden != null && world.roomAt(s.x, s.z) === hidden && s.kind !== 'secret') return;
    const level = this.portfolio.levels.find((l) => l.id === this.sceneId);
    const accent = '#67e8f9';
    switch (s.kind) {
      case 'prop': {
        const p = buildProp(s.prop, b);
        this.place(p, s.x, s.z, (s.rot * Math.PI) / 2);
        break;
      }
      case 'centerpiece':
        this.place(buildCenterpiece(b), s.x, s.z);
        break;
      case 'exit': {
        this.place(buildExitPad(b.light), s.x, s.z);
        this.inter({ id: 'exit', kind: 'exit', x: s.x, z: s.z, radius: 1.2, verb: 'Teleport', label: 'Return to station', object: this.level, done: () => false, use: () => this.travel('hub') });
        break;
      }
      case 'console': {
        const room = level?.rooms.find((r) => r.id === s.roomId);
        if (!room) break;
        const key = roomKey(this.sceneId, room.id);
        const obj = this.place(buildConsole(b.light), s.x, s.z);
        this.inter({
          id: key,
          kind: 'console',
          x: s.x,
          z: s.z + 0.2,
          radius: 1.5,
          verb: 'Scan',
          label: room.title,
          sub: room.meta.role ?? room.meta.qualification ?? room.meta.label ?? firstLine(room.body),
          summary: summarize(room.body),
          object: obj,
          accent: b.light,
          done: () => this.save.scanned.includes(key),
          use: () => this.openRoom(room),
          scan: this.sceneId === 'github' ? undefined : () => this.markScanned(key),
        });
        break;
      }
      case 'terminal': {
        const room = level?.rooms.find((r) => r.id === s.roomId);
        const part = room?.parts.find((p) => p.id === s.partId);
        if (!room || !part) break;
        const key = partKey(this.sceneId, room.id, part.id);
        const obj = this.place(buildTerminal(accent), s.x, s.z);
        this.inter({
          id: key,
          kind: 'terminal',
          x: s.x,
          z: s.z,
          radius: 1.2,
          verb: 'Read',
          label: part.title,
          sub: firstLine(part.body) || part.meta.period || part.meta.org,
          summary: summarize(part.body) || part.meta.tags?.split(',').slice(0, 6).join(' · '),
          stat: part.meta.label ? { value: part.title, label: part.meta.label } : undefined,
          object: obj,
          accent,
          done: () => this.save.scanned.includes(key),
          use: () => this.openPart(room, part.id),
          scan: () => this.markScanned(key),
        });
        break;
      }
      case 'npc': {
        const room = level?.rooms.find((r) => r.id === s.roomId);
        if (!room) break;
        const key = roomKey(this.sceneId, room.id);
        const rig = buildNpc(s.look + 1);
        this.place(rig.root, s.x, s.z, Math.PI * 0.25);
        this.spinners.push(rig.root);
        rig.root.userData.npc = rig;
        this.inter({
          id: key,
          kind: 'npc',
          x: s.x,
          z: s.z + 0.4,
          radius: 1.5,
          verb: 'Talk',
          label: room.title,
          sub: `${room.meta.role ?? ''} · ${room.meta.period ?? ''}`,
          object: rig.root,
          accent: b.light,
          done: () => this.save.scanned.includes(key),
          use: () => this.openRoom(room),
        });
        break;
      }
      case 'part': {
        const key = partKey('projects', s.projectId, s.partId);
        if (this.save.scanned.includes(key)) break;
        if (s.carried) {
          const bug = this.enemies[this.enemies.length - 1];
          if (bug && bug.type === 'bug' && !bug.carry && bug.pos.distanceTo(new THREE.Vector3(s.x, bug.pos.y, s.z)) < 0.1) {
            bug.carry = { projectId: s.projectId, partId: s.partId };
            const cargo = bug.rig.parts.cargo;
            const crate = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), glow('#fde047', 1.3));
            cargo?.add(crate);
            break;
          }
        }
        this.spawnPart(s.projectId, s.partId, s.x, s.z);
        break;
      }
      case 'assembly': {
        const room = this.projectRooms().find((r) => r.id === s.projectId);
        if (!room) break;
        const color = room.meta.status === 'in-progress' ? '#f59e0b' : b.light;
        const obj = this.place(buildAssembly(color, s.wip), s.x, s.z);
        const model = buildProjectModel(room.id, { ghostOpacity: 0.06 });
        model.group.scale.setScalar(0.62);
        model.group.position.set(0, 1.9, 0);
        model.setExplode(0.25);
        model.group.userData.spin = 0.5;
        obj.add(model.group);
        this.spinners.push(model.group);
        this.blueprints.set(room.id, model);
        this.syncBlueprint(room.id);
        this.inter({
          id: `assembly:${room.id}`,
          kind: 'assembly',
          x: s.x,
          z: s.z + 1.3,
          radius: 1.6,
          verb: 'Blueprint',
          label: room.title,
          sub: room.meta.status === 'in-progress' ? '⚠ Case file incomplete' : firstLine(room.body),
          object: obj,
          accent: color,
          done: () => this.save.built.includes(room.id),
          use: () => this.openProject(room),
        });
        break;
      }
      case 'shelf': {
        const room = this.projectRooms().find((r) => r.id === s.projectId);
        if (!room) break;
        const obj = this.place(buildPlinth(b.light), s.x, s.z);
        if (this.save.shelved.includes(room.id)) this.putOnShelf(obj, room.id);
        this.inter({
          id: `shelf:${room.id}`,
          kind: 'shelf',
          x: s.x,
          z: s.z,
          radius: 1.3,
          verb: 'Shelf',
          label: room.title,
          sub: this.save.shelved.includes(room.id) ? 'On display' : this.save.built.includes(room.id) ? 'Place your built model here' : 'Empty — build it in the Circuit Caverns',
          object: obj,
          accent: b.light,
          done: () => this.save.shelved.includes(room.id),
          use: () => this.useShelf(room, obj),
        });
        break;
      }
      case 'matrix': {
        const obj = this.place(buildMatrix(b.light), s.x, s.z);
        const key = roomKey('trophies', s.roomId);
        this.inter({
          id: key,
          kind: 'matrix',
          x: s.x,
          z: s.z + 1.4,
          radius: 1.8,
          verb: 'Open',
          label: 'Skill Matrix',
          sub: 'Every skill and where it came from',
          object: obj,
          accent: b.light,
          done: () => this.save.scanned.includes(key),
          use: () => {
            this.markScanned(key);
            this.audio.sfx('open');
            this.store.set({ panel: { kind: 'skills' } });
          },
        });
        break;
      }
      case 'secret':
        break;
      case 'barrier':
        this.spawnBarrier(s);
        break;
      case 'pnode':
        this.spawnNode(s);
        break;
      case 'phint':
        this.spawnHint(s);
        break;
      case 'backroom': {
        const obj = this.place(buildConsole('#fef08a'), s.x, s.z);
        this.inter({
          id: 'backroom',
          kind: 'console',
          x: s.x,
          z: s.z + 0.2,
          radius: 1.5,
          verb: 'Read',
          label: 'The Backroom',
          sub: '???',
          object: obj,
          accent: '#fef08a',
          done: () => this.save.achievements.includes('backroom'),
          use: () => {
            this.award('backroom');
            const room = this.portfolio.levels.find((l) => l.id === 'trophies')?.rooms.find((r) => r.id === 'backroom');
            this.store.set({
              panel: {
                kind: 'content',
                levelId: 'trophies',
                roomId: 'backroom',
                eyebrow: 'Level ??? · Classified',
                title: 'The Backroom',
                html: room?.html || '<p>You found it. Nobody is supposed to be back here… yet.</p><p>Something is being built in this room. Check back after the next update.</p>',
                tone: 'success',
              },
            });
          },
        });
        break;
      }
      case 'grid': {
        const days = this.github.activity;
        const max = Math.max(1, ...days.map((d) => d.count));
        const cols = s.w;
        const rows = s.d;
        const recent = days.slice(-cols * rows);
        recent.forEach((d, i) => {
          const cx = s.x + (i % cols) + 0.5;
          const cz = s.z + Math.floor(i / cols) + 0.5;
          const tile = contributionTile(heatLevel(d.count, max), b.light);
          tile.position.set(cx, world.heightAt(cx, cz) + 0.01, cz);
          this.level.add(tile);
        });
        break;
      }
      case 'repo': {
        const repo = this.github.repos[s.index];
        if (!repo) break;
        const obj = this.place(buildRepoRack(b.light), s.x, s.z);
        this.inter({
          id: `repo:${repo.name}`,
          kind: 'repo',
          x: s.x,
          z: s.z + 0.6,
          radius: 1.2,
          verb: 'Read',
          label: repo.name,
          sub: [repo.language, repo.stargazers_count ? `★${repo.stargazers_count}` : ''].filter(Boolean).join(' · '),
          object: obj,
          accent: b.light,
          done: () => false,
          use: () => {
            this.audio.sfx('open');
            this.store.set({ panel: repoPanel(this.github, s.index) });
          },
        });
        break;
      }
      case 'relay': {
        const on = this.save.relays.includes(s.id);
        const obj = this.place(buildRelay(on), s.x, s.z);
        this.relayObjs.set(s.id, obj as THREE.Group);
        this.addLight(new THREE.Vector3(s.x, 2.4, s.z), on ? '#a78bfa' : '#f59e0b', on ? 5 : 2, 5);
        this.inter({
          id: s.id,
          kind: 'relay',
          x: s.x,
          z: s.z + 0.8,
          radius: 1.4,
          verb: 'Power',
          label: 'Relay node',
          sub: 'Zap it or press E',
          object: obj,
          accent: '#f59e0b',
          done: () => this.save.relays.includes(s.id),
          use: () => this.powerRelay(s.id),
        });
        break;
      }
      case 'dish': {
        this.dish = this.place(buildDish(), s.x, s.z) as THREE.Group;
        this.syncDish();
        break;
      }
      case 'transmitter': {
        const obj = this.place(buildConsole('#a78bfa'), s.x, s.z);
        this.inter({
          id: 'transmitter',
          kind: 'console',
          x: s.x,
          z: s.z + 0.2,
          radius: 1.5,
          verb: 'Transmit',
          label: 'Transmission Console',
          sub: 'Send Dayna a message',
          object: obj,
          accent: '#a78bfa',
          done: () => this.save.sent,
          use: () => {
            if (this.save.relays.length < 3) {
              this.audio.sfx('error');
              this.say('No signal yet — power all three relay nodes first.', 3500);
              return;
            }
            this.audio.sfx('open');
            this.store.set({ panel: { kind: 'contact' } });
          },
        });
        break;
      }
      case 'enemy':
      case 'boss': {
        if (this.settings.peaceful) break;
        if (s.kind === 'boss' && this.save.bosses.includes(this.sceneId)) break;
        const type = s.type as EnemyType;
        const e = this.addEnemy(type, s.x, s.z, s.room);
        // Hard mode: extra regular bots.
        if (s.kind === 'enemy' && this.difficulty().extra && !this.world!.solid(s.x + 1, s.z)) this.addEnemy(type, s.x + 1, s.z, s.room);
        void e;
        break;
      }
      case 'spawner': {
        if (this.settings.peaceful || this.save.spawners?.includes(s.id)) {
          const c = this.world!.cell(s.x, s.z);
          if (c) c.solid = false;
          break;
        }
        const type = s.type as EnemyType;
        const e = this.addEnemy('spawner', s.x, s.z, s.room, ENEMY[type]?.color);
        e.fab = { type, id: s.id, kids: [], t: 1.5 };
        break;
      }
      case 'hazard':
        this.spawnHazard(s);
        break;
      case 'hub':
        this.spawnHub(s);
        break;
    }
  }

  // ── Hazards ─────────────────────────────────────────────────────────────────

  private hazards: {
    kind: 'conveyor' | 'laser' | 'emp';
    a: THREE.Vector3;
    b: THREE.Vector3;
    dir: THREE.Vector3;
    obj: THREE.Object3D;
    t: number;
    on: boolean;
    beam?: THREE.Mesh;
    hit: Map<unknown, number>;
  }[] = [];

  private spawnHazard(s: Extract<Spawn, { kind: 'hazard' }>) {
    const along = new THREE.Vector3(s.dir === 0 ? 1 : 0, 0, s.dir === 1 ? 1 : 0);
    const a = new THREE.Vector3(s.x, this.world!.heightAt(s.x, s.z), s.z);
    const b = a.clone().addScaledVector(along, s.len - 1);
    if (s.type === 'capacitor') {
      this.addEnemy('capacitor', s.x, s.z, s.room);
      return;
    }
    if (s.type === 'conveyor') {
      const obj = buildConveyor(s.len, s.dir);
      this.place(obj, s.x, s.z, 0, false);
      this.hazards.push({ kind: 'conveyor', a, b, dir: along, obj, t: 0, on: true, hit: new Map() });
    } else if (s.type === 'laser') {
      const p1 = buildLaserPost();
      const p2 = buildLaserPost();
      this.place(p1, a.x, a.z);
      this.place(p2, b.x, b.z);
      const len = s.len - 1;
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(s.dir === 0 ? len : 0.07, 0.07, s.dir === 1 ? len : 0.07),
        new THREE.MeshBasicMaterial({ color: '#ff4d4d', transparent: true, opacity: 0.9, depthWrite: false }),
      );
      beam.position.copy(a.clone().add(b).multiplyScalar(0.5)).add(new THREE.Vector3(0, 0.72, 0));
      this.level.add(beam);
      this.hazards.push({ kind: 'laser', a, b, dir: along, obj: p1, t: Math.random() * 3, on: false, beam, hit: new Map() });
    } else {
      const obj = buildEmpPad();
      this.place(obj, s.x, s.z, 0, false);
      const c = a.clone().add(new THREE.Vector3(0.5, 0, 0.5));
      this.hazards.push({ kind: 'emp', a: c, b: c, dir: along, obj, t: Math.random() * 2, on: false, hit: new Map() });
    }
  }

  private updateHazards(dt: number) {
    const p = this.player;
    const movers: { pos: THREE.Vector3; r: number; hurt: (dmg: number, from: THREE.Vector3) => void; stun: (s: number) => void; key: unknown }[] = [
      { pos: p.pos, r: 0.3, hurt: (d, f) => !this.settings.peaceful && this.hurtPlayer(d, f), stun: (s) => (this.slowT = Math.max(this.slowT, s)), key: p },
      ...this.enemies
        .filter((e) => e.spec.speed > 0 && !e.boss)
        .map((e) => ({ pos: e.pos, r: e.spec.radius, hurt: (d: number, f: THREE.Vector3) => this.damageEnemy(e, d, e.pos.clone().sub(f).setY(0).normalize()), stun: (s: number) => (e.stun = Math.max(e.stun, s)), key: e })),
    ];
    for (const h of this.hazards) {
      h.t += dt;
      if (h.kind === 'conveyor') {
        (h.obj.userData.belt as THREE.Texture).offset.y -= dt * 1.6;
        for (const m of movers) {
          const u = m.pos.clone().sub(h.a).dot(h.dir);
          const side = m.pos.clone().sub(h.a).addScaledVector(h.dir, -u).setY(0).length();
          if (u > -0.5 && u < h.a.distanceTo(h.b) + 0.5 && side < 0.5) this.world!.move(m.pos, h.dir.x * 2.3 * dt, h.dir.z * 2.3 * dt, m.r);
        }
      } else if (h.kind === 'laser') {
        // 2.2 s on, 1.8 s off; the last 0.5 s of "off" flickers as a warning.
        const cyc = h.t % 4;
        h.on = cyc < 2.2;
        const warn = !h.on && cyc > 3.5;
        const mat = h.beam!.material as THREE.MeshBasicMaterial;
        h.beam!.visible = h.on || (warn && Math.floor(h.t * 16) % 2 === 0);
        mat.opacity = h.on ? 0.9 : 0.3;
        if (!h.on) continue;
        const L = h.a.distanceTo(h.b);
        for (const m of movers) {
          const rel = m.pos.clone().sub(h.a).setY(0);
          const u = Math.max(0, Math.min(L, rel.dot(h.dir)));
          if (rel.addScaledVector(h.dir, -u).length() > m.r + 0.08) continue;
          const last = h.hit.get(m.key) ?? -9;
          if (h.t - last < 0.6) continue;
          h.hit.set(m.key, h.t);
          m.hurt(m.key === p ? 1 : 2, h.a.clone().addScaledVector(h.dir, u));
          this.bursts.spawn(m.pos.clone().add(new THREE.Vector3(0, 0.7, 0)), '#ff4d4d', 5, 2);
        }
      } else {
        // EMP pad: charges for 3.5 s (grate glows up), then discharges and stuns whatever stands on it.
        const core = h.obj.userData.core as THREE.Mesh;
        const k = (h.t % 4.2) / 3.5;
        (core.material as THREE.MeshBasicMaterial).opacity = k < 1 ? 0.04 + k * k * 0.3 : 0.6 * (1 - (k - 1) * 5);
        const fire = h.t % 4.2 >= 3.5 && !h.on;
        h.on = h.t % 4.2 >= 3.5;
        if (!fire) continue;
        this.pulseAt(h.a, '#7dd3fc', 1.6);
        for (const m of movers) {
          if (Math.abs(m.pos.x - h.a.x) > 1 || Math.abs(m.pos.z - h.a.z) > 1) continue;
          m.stun(m.key === p ? 1.6 : 2.4);
          if (m.key !== p) m.hurt(1, h.a);
        }
      }
    }
  }

  /** Explosive capacitor: damages bots (and Dayna) nearby and sets off other capacitors. */
  private explode(e: Enemy) {
    const at = e.pos.clone();
    this.bursts.spawn(at.clone().add(new THREE.Vector3(0, 0.6, 0)), '#fde047', 36, 5);
    this.pulseAt(at, '#f59e0b', 2.6);
    this.audio.sfx('emp');
    this.shake = Math.max(this.shake, 0.45);
    const c = this.world!.cell(at.x, at.z);
    if (c) c.solid = false;
    for (const o of [...this.enemies]) {
      if (o === e) continue;
      const d = o.pos.distanceTo(at);
      if (d > 2.5 + o.spec.radius) continue;
      if (o.type === 'capacitor') o.fuse = o.fuse ?? 0.3;
      else this.damageEnemy(o, o.boss ? 3 : 5, o.pos.clone().sub(at).setY(0).normalize(), 0.9);
    }
    if (this.player.pos.distanceTo(at) < 2.2 && !this.settings.peaceful) this.hurtPlayer(2, at);
  }

  /** Fabricator tick: while you're in its room it prints a bot every few seconds (capped). */
  private updateSpawner(e: Enemy, dt: number, active: boolean) {
    const f = e.fab!;
    f.kids = f.kids.filter((k) => this.enemies.includes(k));
    const cap = SPAWN_CAP + (this.difficulty().extra ? 1 : 0);
    const charging = active && f.kids.length < cap;
    if (charging) f.t -= dt;
    e.rig.animate(this.time, charging && f.t < 1 ? 1 : 0.1, dt);
    if (!charging || f.t > 0) return;
    f.t = SPAWN_EVERY * this.difficulty().cooldown;
    for (let tries = 0; tries < 8; tries++) {
      const a = Math.random() * Math.PI * 2;
      const x = e.pos.x + Math.cos(a) * 1.6;
      const z = e.pos.z + Math.sin(a) * 1.6;
      if (this.world!.solid(x, z)) continue;
      const kid = this.addEnemy(f.type, x, z, e.room);
      kid.summoned = true;
      kid.cd = 1.2;
      f.kids.push(kid);
      this.bursts.spawn(kid.pos.clone().add(new THREE.Vector3(0, 0.5, 0)), kid.spec.color, 10, 2.5);
      this.audio.sfx('build');
      break;
    }
  }

  private spawnHub(s: Extract<Spawn, { kind: 'hub' }>) {
    const name = this.portfolio.site.companion.name;
    switch (s.what) {
      case 'starmap': {
        const obj = this.place(buildStarMap(), s.x, s.z);
        this.inter({ id: 'starmap', kind: 'starmap', x: s.x, z: s.z + 1.4, radius: 1.8, verb: 'Open', label: 'Star map', sub: 'Choose a mission', object: obj, accent: '#a78bfa', done: () => false, use: () => this.openStarMap() });
        break;
      }
      case 'pad': {
        this.place(buildExitPad('#a78bfa'), s.x, s.z);
        this.inter({ id: 'pad', kind: 'pad', x: s.x, z: s.z, radius: 1.1, verb: 'Deploy', label: 'Teleporter', sub: 'Opens the star map', object: this.level, done: () => false, use: () => this.openStarMap() });
        break;
      }
      case 'bunk': {
        const obj = this.place(buildBunk(), s.x, s.z);
        this.inter({
          id: 'bunk',
          kind: 'bunk',
          x: s.x + 0.6,
          z: s.z + 1.4,
          radius: 1.4,
          verb: 'Read',
          label: "Dayna's bunk",
          sub: 'Résumé on the desk',
          object: obj,
          accent: '#a78bfa',
          done: () => false,
          use: () => {
            const about = this.portfolio.levels.find((l) => l.id === 'about');
            const identity = about?.rooms.find((r) => r.id === 'identity');
            this.audio.sfx('open');
            this.store.set({
              panel: {
                kind: 'content',
                levelId: 'about',
                roomId: 'identity',
                eyebrow: "Dayna's bunk",
                title: this.portfolio.site.displayName,
                html: `<p>${this.portfolio.site.tagline}</p>${identity?.html ?? ''}`,
                actions: [
                  { id: 'link', label: '⤓ Résumé (PDF)', href: this.portfolio.site.resume, primary: true },
                  { id: 'pro:about', label: 'Open in Professional mode' },
                ],
              },
            });
          },
        });
        break;
      }
      case 'catbed': {
        const obj = this.place(buildCatBed(), s.x, s.z);
        if (this.sceneId === 'trophies') {
          this.catBed = new THREE.Vector3(s.x, 0.2, s.z);
          const room = this.portfolio.levels.find((l) => l.id === 'trophies')?.rooms.find((r) => r.id === 'backroom');
          const part = room?.parts.find((p) => p.id === 'cat-corner');
          if (room && part)
            this.inter({
              id: partKey('trophies', 'backroom', part.id),
              kind: 'terminal',
              x: s.x,
              z: s.z + 0.9,
              radius: 1.3,
              verb: 'Read',
              label: part.title,
              sub: 'Shh… napping',
              object: obj,
              accent: '#fef08a',
              done: () => this.save.scanned.includes(partKey('trophies', 'backroom', part.id)),
              use: () => {
                this.openPart(room, part.id);
                this.audio.meow(0.9);
              },
            });
        }
        break;
      }
      case 'locker': {
        const obj = this.place(buildLocker(), s.x, s.z);
        this.inter({
          id: 'locker',
          kind: 'locker',
          x: s.x,
          z: s.z + 1.2,
          radius: 1.4,
          verb: 'Open',
          label: 'Collection locker',
          sub: `${this.save.built.length}/${this.projectRooms().length} projects built`,
          object: obj,
          accent: '#22d3ee',
          done: () => false,
          use: () => {
            this.audio.sfx('open');
            this.store.set({ panel: { kind: 'locker' } });
          },
        });
        break;
      }
      case 'vendor': {
        const obj = this.place(buildVendor(), s.x, s.z, -Math.PI / 2);
        this.inter({
          id: 'vendor',
          kind: 'vendor',
          x: s.x - 1.2,
          z: s.z,
          radius: 1.4,
          verb: 'Browse',
          label: 'Vendor stall',
          sub: 'Closed — coming soon',
          object: obj,
          accent: '#f59e0b',
          done: () => false,
          use: () => {
            this.audio.sfx('error');
            this.say(`It's closed… the vendor is still stocking up. ${name} wants a new collar though.`, 4200);
          },
        });
        break;
      }
      case 'earth': {
        const earth = buildEarth();
        earth.position.set(s.x, -16, s.z);
        this.level.add(earth);
        this.spinners.push(earth);
        break;
      }
    }
  }

  private addCatInteract() {
    const name = this.portfolio.site.companion.name;
    const it: Inter = {
      id: 'cat',
      kind: 'cat',
      pos: this.cat.pos,
      radius: 0.9,
      verb: 'Pet',
      enabled: () => this.cat.sleeping || this.cat.sit > 1.2,
      label: name,
      object: this.cat.rig.root,
      done: () => false,
      use: () => this.petCat(),
    };
    this.inters.push(it);
  }

  private petCat() {
    this.save.pets++;
    this.markDirty();
    this.cat.sleeping = false;
    this.audio.meow(1 + Math.random() * 0.2);
    this.bursts.spawn(this.cat.pos.clone().add(new THREE.Vector3(0, 0.7, 0)), '#f472b6', 6, 1.2);
    const lines = ['Purrrr…', 'Mrrp!', 'Meow! (more pets please)', '*headbutts your hand*', 'Purr. You may continue.'];
    this.say(lines[this.save.pets % lines.length], 2200, true);
    if (this.save.pets >= 5) this.award('cat-person');
  }

  private spawnPart(projectId: string, partId: string, x: number, z: number) {
    const room = this.projectRooms().find((r) => r.id === projectId);
    const part = room?.parts.find((p) => p.id === partId);
    if (!room || !part) return;
    const key = partKey('projects', projectId, partId);
    const color = room.meta.status === 'in-progress' ? '#fbbf24' : '#22d3ee';
    const obj = this.place(buildPartPickup(color), x, z, 0, false);
    const it = this.inter({
      id: key,
      kind: 'part',
      x,
      z,
      radius: 0.9,
      verb: 'Pick up',
      label: part.title,
      sub: `Part of ${room.title}`,
      object: obj,
      accent: color,
      auto: true,
      done: () => this.save.scanned.includes(key),
      use: () => {
        this.markScanned(key);
        this.audio.sfx('pickup');
        this.bursts.spawn(it.pos.clone().add(new THREE.Vector3(0, 0.5, 0)), color, 10, 2);
        this.level.remove(obj);
        this.removeInter(it);
        this.syncBlueprint(projectId);
        const card = partCard(room, part);
        this.store.set({ card: { ...card, id: Date.now() } });
        setTimeout(() => {
          if (this.store.get().card?.title === card.title) this.store.set({ card: null });
        }, 6000);
        const left = room.parts.filter((p) => !this.save.scanned.includes(partKey('projects', room.id, p.id))).length;
        if (!left) this.say(`That's everything for ${room.title}! Take it to its vault.`, 3500);
        this.hintT = 30;
      },
    });
  }

  private removeInter(it: Inter) {
    it.el?.remove();
    this.inters = this.inters.filter((i) => i !== it);
  }

  private addEnemy(type: EnemyType, x: number, z: number, room: number, accent?: string) {
    const spec = ENEMY[type];
    const rig = buildEnemy(type, accent);
    const pos = new THREE.Vector3(x, this.world!.heightAt(x, z), z);
    rig.root.position.copy(pos);
    this.level.add(rig.root);
    const boss = type in BOSS_PATTERNS;
    const hp = Math.max(1, Math.round(spec.hp * this.difficulty().hp));
    const e: Enemy = {
      type, spec, rig, pos, hp, cd: 1 + Math.random(), touchCd: 0, stun: 0, wander: null, wanderT: Math.random() * 2, room,
      home: pos.clone(), flash: 0, carry: null, boss, summoned: false, step: 0, windup: 0, pending: null, aim: null, lunge: null,
    };
    this.enemies.push(e);
    return e;
  }

  // ── Frame update ────────────────────────────────────────────────────────────

  private update(dt: number, actions: Set<string>) {
    const p = this.player;
    const world = this.world!;
    for (const k in this.cooldowns) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
    this.comboT = Math.max(0, this.comboT - dt);

    // Death / respawn
    if (p.dead > 0) {
      p.dead -= dt;
      p.rig.root.rotation.z = Math.min(Math.PI / 2, p.rig.root.rotation.z + dt * 6);
      if (p.dead <= 0) {
        p.pos.copy(p.checkpoint);
        p.hp = this.maxHp();
        p.rig.root.rotation.z = 0;
        p.invuln = 2;
        this.store.set({ hp: p.hp, dead: false });
        this.store.toast('SYSTEM REBOOT — respawned at the room entrance', 'warn');
      }
      this.updateWorldBits(dt);
      return;
    }

    // Movement (Tour mode drives the player itself)
    const tourSpeed = this.tour ? this.tourStep(dt) : 0;
    const mv = this.tour ? { x: 0, y: 0 } : this.input.move();
    const dir = new THREE.Vector3().addScaledVector(SCREEN_RIGHT, mv.x).addScaledVector(SCREEN_UP, mv.y);
    this.slowT = Math.max(0, this.slowT - dt);
    const speed = this.tour ? tourSpeed : dir.length() * PLAYER_SPEED * (this.slowT > 0 ? 0.5 : 1);
    if (dir.lengthSq() > 0.001) {
      p.facing = Math.atan2(dir.x, dir.z);
      p.idle = 0;
    } else p.idle += dt;
    const hasDash = this.hasGear('dash');
    if (actions.has('dash')) {
      if (!hasDash) {
        if (!this.cooldowns.dashHint) {
          this.cooldowns.dashHint = 8;
          this.say('Dashing needs the Servo Boots — clear the Core Reactor (About) mission.', 3500);
        }
      } else if (!this.cooldowns.dash) {
        this.cooldowns.dash = COOLDOWNS.dash;
        p.dashT = 0.18;
        p.dashDir.set(Math.sin(p.facing), 0, Math.cos(p.facing));
        p.invuln = Math.max(p.invuln, 0.32);
        this.audio.sfx('dash');
        this.bursts.spawn(p.pos.clone().add(new THREE.Vector3(0, 0.3, 0)), '#c4b5fd', 6, 1.5);
      }
    }
    if (p.dashT > 0) {
      p.dashT -= dt;
      world.move(p.pos, p.dashDir.x * 16 * dt, p.dashDir.z * 16 * dt, 0.3);
    } else if (speed > 0.01) {
      const n = dir.normalize();
      world.move(p.pos, n.x * speed * dt, n.z * speed * dt, 0.3);
    }
    const targetY = world.heightAt(p.pos.x, p.pos.z);
    p.pos.y += (targetY - p.pos.y) * Math.min(1, dt * 14);
    p.history.push(p.pos.clone());
    if (p.history.length > 200) p.history.shift();

    // Room change → checkpoint
    const room = world.roomAt(p.pos.x, p.pos.z);
    if (room !== p.room && room >= 0) {
      p.room = room;
      p.checkpoint.copy(p.pos);
      const r = this.map.rooms[room];
      if (r?.title && r.kind !== 'entry' && r.kind !== 'hub') this.enterArea(r);
    }

    // Combat
    if (actions.has('melee') || (this.input.isDown('melee') && !this.cooldowns.melee)) this.melee();
    if (actions.has('zap') || (this.input.isDown('zap') && !this.cooldowns.zap)) this.zap();
    if (actions.has('cat')) this.catAbility();
    const art = (['artifact1', 'artifact2', 'artifact3', 'artifact4'] as const).findIndex((a) => actions.has(a));
    if (art >= 0) this.useArtifact(art + 1);

    // Aim with the mouse while attacking.
    p.invuln = Math.max(0, p.invuln - dt);
    p.swingT = Math.max(0, p.swingT - dt);
    const arm = p.rig.parts.armR;
    arm.userData.override = p.swingT > 0;
    if (p.swingT > 0) arm.rotation.x = -2.2 + (1 - p.swingT / 0.25) * 2.6;

    p.rig.root.position.copy(p.pos);
    this.suit.position.copy(p.pos).add(new THREE.Vector3(0.6, 2.2, 0.6));
    p.rig.root.rotation.y = lerpAngle(p.rig.root.rotation.y, p.facing, 1 - Math.exp(-dt * 16));
    p.rig.animate(this.time, p.dashT > 0 ? 8 : speed, dt);
    p.rig.root.visible = p.invuln <= 0 || Math.floor(this.time * 20) % 2 === 0 || p.dashT > 0;

    this.updateCat(dt, speed);
    this.updateEnemies(dt);
    this.updateHazards(dt);
    this.updateAssembly(dt);
    this.updateProjectiles(dt);
    this.updateBuddy(dt);
    this.updateWorldBits(dt);

    // Interactions
    const near = this.nearestInter();
    if (near?.auto) near.use();
    const promptTarget = near && !near.auto ? near : null;
    const prompt = promptTarget ? { verb: promptTarget.verb, label: promptTarget.label } : null;
    const cur = this.store.get().prompt;
    if (cur?.label !== prompt?.label || cur?.verb !== prompt?.verb) this.store.set({ prompt });
    if (actions.has('interact') && promptTarget) promptTarget.use();
    // Walk-up reading: linger in a ring and it scans itself (E still opens the full entry).
    if (promptTarget?.scan && !promptTarget.done()) {
      if (this.dwell.target !== promptTarget) this.dwell = { target: promptTarget, t: 0 };
      this.dwell.t += dt;
      if (this.dwell.t >= DWELL) {
        promptTarget.scan();
        this.floatText(promptTarget.pos.clone().add(new THREE.Vector3(0, 2.2, 0)), 'SCANNED ◆', 'scan');
        this.dwell = { target: null, t: 0 };
      }
    } else this.dwell = { target: null, t: 0 };

    // Hearts
    for (let i = this.hearts.length - 1; i >= 0; i--) {
      const h = this.hearts[i];
      h.mesh.rotation.y += dt * 3;
      if (h.pos.distanceTo(p.pos) < 0.8) {
        p.hp = Math.min(this.maxHp(), p.hp + 2);
        this.store.set({ hp: p.hp });
        this.audio.sfx('heal');
        this.level.remove(h.mesh);
        this.hearts.splice(i, 1);
      }
    }

    // Hints in the Circuit Caverns
    if (this.sceneId === 'projects') {
      this.hintT -= dt;
      if (this.hintT <= 0) {
        this.hintT = 32;
        const part = this.inters.filter((i) => i.kind === 'part').sort((a, b) => a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos))[0];
        if (part) this.say(`Meow! I smell a part ${screenDirection(part.pos.clone().sub(p.pos))} of here — the ${part.label}.`, 4200);
      }
    }

    // Bubble queue
    this.bubbleT -= dt;
    if (this.bubbleT <= 0 && this.bubbleQueue.length) {
      const next = this.bubbleQueue.shift()!;
      this.showBubble(next.text, next.ms);
    } else if (this.bubbleT <= 0) this.bubble.hidden = true;

    this.hudT -= dt;
    if (this.hudT <= 0) {
      this.hudT = 0.1;
      const cds: Record<string, number> = {};
      for (const g of GEAR) if (COOLDOWNS[g.id]) cds[g.id] = (this.cooldowns[g.id] ?? 0) / COOLDOWNS[g.id];
      this.store.set({ cooldowns: cds });
    }
  }

  private updateWorldBits(dt: number) {
    const pp = this.player.pos;
    for (const o of this.spinners) {
      const wp = (o.userData.wp ??= o.getWorldPosition(new THREE.Vector3())) as THREE.Vector3;
      if (Math.abs(wp.x - pp.x) + Math.abs(wp.z - pp.z) > 30) continue;
      if (o.userData.spin) o.rotation.y += o.userData.spin * dt;
      if (o.userData.roll) o.rotation.z += o.userData.roll * dt;
      if (o.userData.hover) o.position.y = (o.userData.baseY ??= o.position.y) + Math.sin(this.time * 2 + o.id) * 0.08;
      const npc = o.userData.npc as Rig | undefined;
      npc?.animate(this.time, 0, dt);
    }
    // Interactable rings pulse; completed ones dim.
    const target = this.store.get().prompt ? this.nearestInter() : null;
    for (const i of this.inters) {
      if (i.ring) {
        const done = i.done() && i.kind !== 'relay';
        const on = i === target;
        const [edge, fill, inner] = i.ring.children as THREE.Mesh[];
        const mats = ringMaterials(i.ring.userData.color);
        edge.material = on ? mats.on : done ? DONE_RING : mats.idle;
        (fill.material as THREE.MeshBasicMaterial).opacity = on ? 0.09 : done ? 0 : 0.035;
        inner.visible = on;
        edge.rotation.z = this.time * (on ? 0.6 : 0.15);
        inner.scale.setScalar(on ? 1 + Math.sin(this.time * 5) * 0.05 : 1);
        continue;
      }
      if (!i.object || i.object === this.level) continue;
      const done = i.done();
      i.object.traverse((o) => {
        if (o.userData.interactRing) {
          o.visible = !done || i.kind === 'relay';
          o.scale.setScalar(1 + Math.sin(this.time * 4) * 0.06);
        }
      });
    }
    this.bursts.update(dt, (x, z) => this.world?.heightAt(x, z) ?? 0);
    this.ambient?.update(dt);
    this.setPiece?.update(this.time, dt);
    if (this.dish && this.beamT > 0) this.beamT -= dt;
    if (this.scannerT > 0) this.scannerT -= dt;
  }

  private updateCat(dt: number, playerSpeed: number) {
    const c = this.cat;
    const p = this.player;
    if (this.updateCatAbility(dt)) return;
    // Backroom: Xiao Hu heads for her bed and naps while you look around.
    const secret = this.map.rooms.find((r) => r.kind === 'secret');
    if (this.catBed && secret && this.world!.roomAt(p.pos.x, p.pos.z) === secret.i) {
      const d = this.catBed.clone().sub(c.pos).setY(0);
      if (d.length() > 0.15) {
        d.normalize();
        this.world!.move(c.pos, d.x * 3.5 * dt, d.z * 3.5 * dt, 0.18);
        c.facing = Math.atan2(d.x, d.z);
        c.rig.root.position.copy(c.pos);
        c.rig.root.rotation.y = c.facing;
        c.rig.animate(this.time, 3.5, dt);
        if (c.pos.distanceTo(this.catBed) < 0.3) c.pos.copy(this.catBed);
      } else if (!c.sleeping) {
        c.sleeping = true;
        this.say('*curls up* …zzz', 2200);
      }
      if (c.sleeping) {
        c.rig.root.position.copy(c.pos);
        c.rig.body.rotation.z = Math.PI / 2.2;
        c.rig.body.position.y = 0.12;
        c.rig.animate(this.time, 0, dt * 0.2);
      }
      return;
    }
    if (c.sleeping && this.catBed) c.sleeping = false;
    if (c.sleeping) {
      c.rig.root.position.copy(c.pos);
      c.rig.body.rotation.z = Math.PI / 2.2; // sprawled on its side, belly out
      c.rig.body.position.y = 0.12;
      c.rig.animate(this.time, 0, dt * 0.2);
      if (c.pos.distanceTo(p.pos) < 2.2 && this.save.tutorial) {
        c.sleeping = false;
        this.audio.meow(1.1);
      }
      return;
    }
    c.rig.body.rotation.z = 0;
    const behind = new THREE.Vector3(-Math.sin(p.facing), 0, -Math.cos(p.facing)).multiplyScalar(1.1).add(new THREE.Vector3(0.5, 0, 0.3));
    const target = p.pos.clone().add(behind);
    const to = target.sub(c.pos);
    to.y = 0;
    const dist = to.length();
    if (dist > 12) c.pos.copy(p.pos).add(new THREE.Vector3(0.6, 0, 0.6));
    let speed = 0;
    if (dist > 0.6) {
      speed = Math.min(dist * 3, Math.max(playerSpeed * 1.1, 3.2));
      to.normalize();
      this.world!.move(c.pos, to.x * speed * dt, to.z * speed * dt, 0.18);
      c.facing = Math.atan2(to.x, to.z);
      c.sit = 0;
    } else c.sit += dt;
    c.pos.y += (this.world!.heightAt(c.pos.x, c.pos.z) - c.pos.y) * Math.min(1, dt * 12);
    c.rig.root.position.copy(c.pos);
    c.rig.root.rotation.y = lerpAngle(c.rig.root.rotation.y, c.facing, 1 - Math.exp(-dt * 8));
    c.rig.animate(this.time, speed, dt);
    // Sit down when idle.
    const torso = c.rig.parts.torso;
    torso.rotation.x = c.sit > 1.5 ? -0.35 : 0;
  }

  private nearestInter(): Inter | null {
    let best: Inter | null = null;
    let bestD = Infinity;
    for (const i of this.inters) {
      if (i.enabled && !i.enabled()) continue;
      // Flat distance (ignore step heights), normalised so overlapping zones pick the one you're deepest in.
      const dist = Math.hypot(i.pos.x - this.player.pos.x, i.pos.z - this.player.pos.z);
      const d = dist / i.radius - 1;
      if (d < 0 && d < bestD && !(i.kind === 'cat' && this.inters.some((o) => o !== i && o.kind !== 'cat' && o.pos.distanceTo(this.player.pos) < o.radius))) {
        best = i;
        bestD = d;
      }
    }
    return best;
  }

  // ── Combat ──────────────────────────────────────────────────────────────────

  /**
   * Attack direction. Mouse: towards the cursor, snapped onto a bot within ~22° of it.
   * Keys/pad: the best bot in range, preferring ones ahead (melee looks all the way round).
   */
  private aimDir(range = 9, minCos = 0.2, needLine = false): THREE.Vector3 {
    const p = this.player;
    const fwd = new THREE.Vector3(Math.sin(p.facing), 0, Math.cos(p.facing));
    let aim = fwd;
    let mouse = false;
    if (this.input.attackFromMouse && this.input.pointer) {
      this.ray.setFromCamera(new THREE.Vector2(this.input.pointer.x, this.input.pointer.y), this.camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(p.pos.y + 0.6));
      const hit = new THREE.Vector3();
      if (this.ray.ray.intersectPlane(plane, hit)) {
        const d = hit.sub(p.pos).setY(0);
        if (d.lengthSq() > 0.01) {
          aim = d.normalize();
          mouse = true;
        }
      }
    }
    let best: THREE.Vector3 | null = null;
    let bestScore = Infinity;
    for (const e of this.enemies) {
      const d = e.pos.clone().sub(p.pos).setY(0);
      const len = d.length();
      if (len > range + e.spec.radius || len < 0.001) continue;
      const cos = d.normalize().dot(aim);
      if (cos < (mouse ? 0.92 : minCos)) continue;
      if (needLine && !this.world!.clearLine(p.pos.x, p.pos.z, e.pos.x, e.pos.z)) continue;
      const score = len * (2 - cos) * (e.type === 'spawner' ? 1.4 : e.type === 'capacitor' ? 1.8 : 1);
      if (score < bestScore) {
        bestScore = score;
        best = d;
      }
    }
    return best ?? aim;
  }

  private melee() {
    if (this.cooldowns.melee) return;
    this.cooldowns.melee = COOLDOWNS.melee;
    const p = this.player;
    // 3-hit combo: swings within 0.6 s chain; the third is a wide, heavy finisher.
    this.combo = this.comboT > 0 ? (this.combo % 3) + 1 : 1;
    this.comboT = 0.6;
    const finisher = this.combo === 3;
    const range = finisher ? 2.4 : 1.9;
    const dmg = finisher ? 3 : 2;
    // Half-angle of the swing; the drawn arc and the hit test use the same value.
    const half = finisher ? 1.75 : 1.35;
    const dir = this.aimDir(2.8, -1);
    p.facing = Math.atan2(dir.x, dir.z);
    p.swingT = 0.25;
    if (finisher) this.cooldowns.melee = COOLDOWNS.melee * 1.6;
    this.audio.sfx(finisher ? 'hit' : 'swing');
    const arc = new THREE.Mesh(
      new THREE.RingGeometry(0.5, range, 16, 1, -half, half * 2),
      new THREE.MeshBasicMaterial({ color: finisher ? '#fde68a' : '#e9d5ff', transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false }),
    );
    // Ring local +X → world (sin f, 0, cos f) needs z-rotation f − π/2 under the −π/2 x-tilt.
    arc.rotation.x = -Math.PI / 2;
    arc.rotation.z = p.facing - Math.PI / 2;
    arc.position.copy(p.pos).add(new THREE.Vector3(0, 0.6, 0));
    this.level.add(arc);
    const fade = () => {
      (arc.material as THREE.MeshBasicMaterial).opacity -= 0.12;
      if ((arc.material as THREE.MeshBasicMaterial).opacity > 0) requestAnimationFrame(fade);
      else {
        this.level.remove(arc);
        arc.geometry.dispose();
        (arc.material as THREE.Material).dispose();
      }
    };
    requestAnimationFrame(fade);
    let hit = false;
    const cosHalf = Math.cos(half);
    for (const e of [...this.enemies]) {
      const d = e.pos.clone().sub(p.pos).setY(0);
      const len = d.length();
      // Point-blank bots always count, whatever the angle.
      if (len < range + e.spec.radius && (len < e.spec.radius + 0.5 || d.normalize().dot(dir) > cosHalf)) {
        hit = true;
        this.damageEnemy(e, dmg, dir, finisher ? 0.9 : 0.3);
        if (finisher && e.boss) this.award('combo');
      }
    }
    if (hit) this.hitStop = finisher ? 0.09 : 0.045;
    for (const [id, obj] of this.relayObjs)
      if (!this.save.relays.includes(id) && obj.position.distanceTo(p.pos) < 1.8) this.powerRelay(id);
  }

  private zap() {
    if (this.cooldowns.zap) return;
    this.cooldowns.zap = COOLDOWNS.zap;
    const p = this.player;
    const dir = this.aimDir(9, 0.2, true);
    p.facing = Math.atan2(dir.x, dir.z);
    p.swingT = 0.12;
    const dmg = 1 + Math.floor((this.skillsCache.soldering ?? 0) / 2);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.5), glow('#e879f9', 4));
    const start = p.pos.clone().add(new THREE.Vector3(0, 0.7, 0)).addScaledVector(dir, 0.6);
    mesh.position.copy(start);
    mesh.rotation.y = Math.atan2(dir.x, dir.z);
    this.level.add(mesh);
    this.projectiles.push({ mesh, pos: start, vel: dir.clone().multiplyScalar(16), from: 'player', dmg, life: 0.7 });
    this.audio.sfx('zap');
  }

  private difficulty() {
    return DIFFICULTY[this.settings.difficulty ?? 'normal'];
  }

  private enemyShoot(e: Enemy, dir: THREE.Vector3, speed = 7) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), glow(e.spec.color, 3.5));
    const start = e.pos.clone().add(new THREE.Vector3(0, e.boss ? 1.3 : 0.7, 0));
    mesh.position.copy(start);
    this.level.add(mesh);
    this.projectiles.push({ mesh, pos: start, vel: dir.clone().setY(0).normalize().multiplyScalar(speed), from: 'enemy', dmg: e.spec.dmg, life: 2.6 });
  }

  private damageEnemy(e: Enemy, dmg: number, dir?: THREE.Vector3, knock = 0.3) {
    e.hp -= dmg;
    e.flash = 0.12;
    this.audio.sfx('hit');
    this.bursts.spawn(e.pos.clone().add(new THREE.Vector3(0, 0.6, 0)), e.spec.color, 4, 2);
    if (dir && !e.boss && e.spec.speed > 0) this.world!.move(e.pos, dir.x * knock, dir.z * knock, e.spec.radius);
    if (e.boss) this.damageNumber(e, dmg);
    if (e.hp <= 0) this.killEnemy(e);
  }

  private tricks() {
    return catTricks(this.portfolio, this.save);
  }

  /** First time into a room this visit: a title card, and Xiao Hu tells you what it's about. */
  private enterArea(r: LevelMap['rooms'][number]) {
    const level = this.portfolio.levels.find((l) => l.id === this.sceneId);
    const room = level?.rooms.find((x) => x.id === r.roomId);
    if (this.announced.has(r.i)) return;
    this.announced.add(r.i);
    const intro = room ? roomIntro(room) : null;
    const area = { eyebrow: intro?.eyebrow ?? '', title: r.title ?? '', sub: intro?.sub ?? '', id: Date.now() };
    this.store.set({ area });
    setTimeout(() => this.store.get().area?.id === area.id && this.store.set({ area: null }), 4200);
    if (intro && !this.tour && !this.store.get().boss && this.bubbleQueue.length < 2) this.say(intro.line, 5200);
  }

  /** Rising text in the world (skill ups, scans). */
  private floatText(at: THREE.Vector3, text: string, kind: 'scan' | 'skill' | 'lore' = 'scan') {
    const el = document.createElement('div');
    el.className = `g-float ${kind}`;
    el.textContent = text;
    const s = this.project(at);
    el.style.left = `${s.x}px`;
    el.style.top = `${s.y}px`;
    this.overlay.appendChild(el);
    setTimeout(() => el.remove(), 1400);
  }

  /** Bots sometimes drop a lore fragment: one fact from this mission you haven't found yet. */
  private maybeDropFragment(at: THREE.Vector3) {
    const got = new Set(this.save.fragments ?? []);
    const left = this.fragments.filter((f) => !got.has(f.id) && !this.inters.some((i) => i.id === `frag:${f.id}`));
    if (!left.length || Math.random() > 0.35) return;
    const f = left[Math.floor(Math.random() * left.length)];
    const x = Math.floor(at.x) + 0.5;
    const z = Math.floor(at.z) + 0.5;
    const obj = buildFragment(this.biome.light);
    this.place(obj, x, z, 0, false);
    this.spinners.push(obj.children[0]);
    const it = this.inter({
      id: `frag:${f.id}`,
      kind: 'fragment',
      x,
      z,
      radius: 0.9,
      verb: 'Collect',
      label: 'Data fragment',
      object: obj,
      auto: true,
      done: () => false,
      use: () => {
        this.save.fragments = [...(this.save.fragments ?? []), f.id];
        this.markDirty();
        this.removeInter(it);
        this.level.remove(obj);
        this.audio.sfx('chip');
        const card = { eyebrow: `Data fragment · ${f.room}`, title: 'Memory recovered', html: `<p>${escapeHtml(f.text)}</p>`, id: Date.now() };
        this.store.set({ card });
        setTimeout(() => this.store.get().card?.id === card.id && this.store.set({ card: null }), 6500);
        const total = this.fragments.length;
        const have = this.fragments.filter((x) => this.save.fragments!.includes(x.id)).length;
        this.floatText(this.player.pos.clone().add(new THREE.Vector3(0, 2.2, 0)), `FRAGMENT ${have}/${total}`, 'lore');
        if (have === total) this.award('archivist');
      },
    });
  }

  /** Floating damage numbers — mini-bosses only. */
  private damageNumber(e: Enemy, dmg: number) {
    const el = document.createElement('div');
    el.className = `g-dmg${dmg >= 3 ? ' big' : ''}`;
    el.textContent = String(dmg);
    const s = this.project(e.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, e.spec.radius * 2 + 1.2, 0)));
    el.style.left = `${s.x}px`;
    el.style.top = `${s.y}px`;
    this.overlay.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  private killEnemy(e: Enemy) {
    this.enemies = this.enemies.filter((x) => x !== e);
    this.level.remove(e.rig.root);
    if (e.type === 'capacitor') {
      this.explode(e);
      return;
    }
    if (e.tele) this.level.remove(e.tele);
    this.bursts.spawn(e.pos.clone().add(new THREE.Vector3(0, 0.5, 0)), e.spec.color, e.boss ? 60 : 16, e.boss ? 6 : 3);
    this.audio.sfx('die');
    this.shake = e.boss ? 0.6 : 0.15;
    this.hitStop = e.boss ? 0.25 : 0.06;
    this.save.kills++;
    this.save.levelKills[this.sceneId] = (this.save.levelKills[this.sceneId] ?? 0) + 1;
    if (this.save.kills >= 25) this.award('bug-squasher');
    if (e.fab) {
      const c = this.world!.cell(e.pos.x, e.pos.z);
      if (c) c.solid = false;
      this.save.spawners = [...(this.save.spawners ?? []), e.fab.id];
      if (this.save.spawners.length >= 5) this.award('fab-breaker');
      this.dropHeart(e.pos);
      const left = this.enemies.filter((x) => x.fab).length;
      this.store.toast(left ? `Fabricator destroyed — ${left} left in this mission` : 'All fabricators in this mission destroyed', 'info');
      this.pulse(e.spec.color, 2.5);
    } else if (e.carry) {
      this.spawnPart(e.carry.projectId, e.carry.partId, Math.floor(e.pos.x) + 0.5, Math.floor(e.pos.z) + 0.5);
      this.say('It dropped a part! Grab it.', 2500);
    } else if (Math.random() < (e.boss ? 1 : 0.22)) this.dropHeart(e.pos);
    else if (!e.boss) this.maybeDropFragment(e.pos);
    if (e.boss) {
      const def = BOSSES[this.sceneId];
      if (!this.save.bosses.includes(this.sceneId)) this.save.bosses.push(this.sceneId);
      if (e.type === 'boss') {
        this.save.bossDefeated = true;
        this.award('merge-resolved');
      }
      if (Object.keys(BOSSES).every((id) => this.save.bosses.includes(id))) this.award('giant-slayer');
      // Minions fizzle out with their boss.
      for (const m of [...this.enemies]) if (m.room === e.room && m.summoned) this.killEnemy(m);
      this.store.set({ boss: null, banner: { title: `${def?.name.toUpperCase() ?? 'BOSS'} DEFEATED`, sub: def?.title ?? '', id: Date.now() } });
      setTimeout(() => this.store.set({ banner: null }), 3600);
      this.say(e.type === 'boss' ? 'Conflict resolved! Both branches live happily now.' : `We beat the ${def?.name}! Meow!`, 4000);
      this.checkCleared();
      this.refreshHud();
    }
    this.markDirty();
  }

  private dropHeart(at: THREE.Vector3) {
    const g = new THREE.Group();
    const m = glow('#f43f5e', 2.4);
    for (const [x, y] of [
      [-0.08, 0.08],
      [0.08, 0.08],
      [0, 0],
      [-0.12, 0.14],
      [0.12, 0.14],
    ])
    {
      const px = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.1), m);
      px.position.set(x, y, 0);
      g.add(px);
    }
    const pos = at.clone();
    g.position.copy(pos).add(new THREE.Vector3(0, 0.5, 0));
    this.level.add(g);
    this.hearts.push({ mesh: g, pos });
  }

  private hurtPlayer(dmg: number, from: THREE.Vector3) {
    const p = this.player;
    if (p.invuln > 0 || p.dead > 0 || this.touring) return;
    p.hp -= Math.max(1, Math.round(dmg * this.difficulty().dmg));
    p.invuln = 0.7;
    this.shake = 0.3;
    this.hitStop = 0.05;
    this.audio.sfx('hurt');
    const push = p.pos.clone().sub(from).setY(0).normalize().multiplyScalar(0.6);
    this.world!.move(p.pos, push.x, push.z, 0.3);
    if (p.hp <= 0 && this.tricks()['nine-lives'] && !this.nineLivesUsed) {
      // Nine Lives: Xiao Hu drags Dayna back up once per mission.
      this.nineLivesUsed = true;
      p.hp = Math.ceil(this.maxHp() / 2);
      p.invuln = 2.2;
      this.pulseAt(p.pos, '#fcd34d', 3);
      this.bursts.spawn(p.pos.clone().add(new THREE.Vector3(0, 1, 0)), '#fde68a', 30, 4);
      for (const o of this.enemies) if (o.pos.distanceTo(p.pos) < 3.5 && !o.fab) o.stun = Math.max(o.stun, 1.5);
      this.audio.meow(1.4);
      this.say('Nine lives! …eight left. Meow.', 2600, true);
      this.store.toast('NINE LIVES — Xiao Hu revived Dayna', 'achievement', 3000);
    }
    if (p.hp <= 0) {
      p.hp = 0;
      p.dead = 1.3;
      this.cancelAssembly('The assembly was interrupted — the parts are safe. Try again from the station.');
      this.store.set({ dead: true });
      this.say('Dayna! …Rebooting suit systems. Meow.', 2500);
    }
    this.store.set({ hp: p.hp });
  }

  /** Warning decal shown while a bot winds up an attack (ring = area, line = aimed). */
  private telegraph(e: Enemy, kind: 'ring' | 'line', dir?: THREE.Vector3) {
    if (e.tele) this.level.remove(e.tele);
    const mat = new THREE.MeshBasicMaterial({ color: '#ef4444', transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide });
    let mesh: THREE.Mesh;
    if (kind === 'ring') {
      const r = e.boss ? 3.2 : 1.4;
      mesh = new THREE.Mesh(new THREE.RingGeometry(r - 0.18, r, 32), mat);
      mesh.rotation.x = -Math.PI / 2;
    } else {
      const len = e.boss ? 8 : 6;
      mesh = new THREE.Mesh(new THREE.PlaneGeometry(e.boss ? 1.4 : 0.35, len), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.z = -Math.atan2(dir!.x, dir!.z);
      mesh.position.addScaledVector(dir!, len / 2);
    }
    mesh.position.add(e.pos).setY(e.pos.y + 0.05);
    e.tele = mesh;
    this.level.add(mesh);
  }

  private clearTelegraph(e: Enemy) {
    if (!e.tele) return;
    this.level.remove(e.tele);
    e.tele.geometry.dispose();
    e.tele = undefined;
  }

  /** Run a wound-up attack. */
  private attack(e: Enemy, kind: string) {
    const p = this.player;
    const toP = p.pos.clone().sub(e.pos).setY(0).normalize();
    const d = this.difficulty();
    switch (kind) {
      case 'shot':
        this.enemyShoot(e, e.aim ?? toP);
        break;
      case 'lunge':
        e.lunge = { dir: (e.aim ?? toP).clone(), t: e.boss ? 0.5 : 0.32 };
        break;
      case 'ring': {
        const n = e.boss ? 12 : 8;
        const off = Math.random() * Math.PI;
        for (let i = 0; i < n; i++) {
          const a = off + (i / n) * Math.PI * 2;
          this.enemyShoot(e, new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), 5.5);
        }
        break;
      }
      case 'fan': {
        const base = Math.atan2((e.aim ?? toP).x, (e.aim ?? toP).z);
        for (let i = -2; i <= 2; i++) {
          const a = base + i * 0.2;
          this.enemyShoot(e, new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), 7.5);
        }
        break;
      }
      case 'summon': {
        const minion: EnemyType = ({ core: 'wisp', arm: 'crawler', queen: 'bug', boss: 'packet', swarm: 'drone' } as Record<string, EnemyType>)[e.type] ?? 'wisp';
        const alive = this.enemies.filter((m) => m.summoned && m.room === e.room).length;
        const count = Math.min(2 + (d.extra ? 1 : 0), 5 - alive);
        for (let i = 0; i < count; i++) {
          const a = (i / Math.max(1, count)) * Math.PI * 2 + Math.random();
          const x = e.pos.x + Math.cos(a) * 2;
          const z = e.pos.z + Math.sin(a) * 2;
          if (this.world!.solid(x, z)) continue;
          const m = this.addEnemy(minion, x, z, e.room);
          m.summoned = true;
          this.bursts.spawn(m.pos.clone().add(new THREE.Vector3(0, 0.5, 0)), m.spec.color, 8, 2);
        }
        break;
      }
      case 'blink': {
        for (let tries = 0; tries < 12; tries++) {
          const a = Math.random() * Math.PI * 2;
          const x = p.pos.x + Math.cos(a) * 4.5;
          const z = p.pos.z + Math.sin(a) * 4.5;
          if (!this.world!.solid(x, z) && this.world!.roomAt(x, z) === e.room) {
            this.bursts.spawn(e.pos.clone().add(new THREE.Vector3(0, 1, 0)), e.spec.color, 14, 3);
            e.pos.set(x, this.world!.heightAt(x, z), z);
            this.bursts.spawn(e.pos.clone().add(new THREE.Vector3(0, 1, 0)), e.spec.color, 14, 3);
            break;
          }
        }
        break;
      }
    }
  }

  private updateEnemies(dt: number) {
    const p = this.player;
    const world = this.world!;
    const playerRoom = world.roomAt(p.pos.x, p.pos.z);
    const diff = this.difficulty();
    let bossActive: Enemy | null = null;
    for (const e of [...this.enemies]) {
      // Room-local simulation: bots far from the player (and not in their room) sleep.
      const far = e.pos.distanceToSquared(p.pos) > 22 * 22 && e.room !== playerRoom;
      if (far) continue;
      e.cd -= dt;
      e.flash = Math.max(0, e.flash - dt);
      if (e.type === 'capacitor') {
        if (e.fuse != null) {
          e.fuse -= dt;
          e.rig.parts.core.visible = Math.floor(this.time * 20) % 2 === 0;
          if (e.fuse <= 0) this.killEnemy(e);
        }
        continue;
      }
      if (e.fab) {
        e.rig.root.scale.setScalar(e.flash > 0 ? 1.08 : 1);
        const d2 = e.pos.distanceToSquared(p.pos);
        this.updateSpawner(e, dt, p.dead <= 0 && !this.touring && (e.room === playerRoom || d2 < e.spec.aggro * e.spec.aggro));
        continue;
      }
      const pulse = e.windup > 0 ? 1 + Math.sin(this.time * 40) * 0.06 : 1;
      e.rig.root.scale.setScalar((e.flash > 0 ? 1.15 : 1) * pulse);
      if (e.stun > 0) {
        e.stun -= dt;
        e.windup = 0;
        this.clearTelegraph(e);
        e.rig.animate(this.time, 0, dt * 0.2);
        continue;
      }
      const to = p.pos.clone().sub(e.pos).setY(0);
      const dist = to.length();
      const active =
        p.dead <= 0 && !this.touring && (e.boss ? e.room === playerRoom : dist < e.spec.aggro || (e.room === playerRoom && dist < e.spec.aggro * 1.6));
      if (e.boss && active) bossActive = e;
      let speed = 0;
      const dir = dist > 0.001 ? to.clone().normalize() : new THREE.Vector3(0, 0, 1);
      if (e.lunge) {
        e.lunge.t -= dt;
        speed = e.spec.speed * 3.2;
        world.move(e.pos, e.lunge.dir.x * speed * dt, e.lunge.dir.z * speed * dt, e.spec.radius);
        if (e.lunge.t <= 0) e.lunge = null;
      } else if (e.windup > 0) {
        // Telegraphed attack: hold still, then strike.
        e.windup -= dt;
        e.rig.root.rotation.y = lerpAngle(e.rig.root.rotation.y, Math.atan2(dir.x, dir.z), 1 - Math.exp(-dt * 4));
        if (e.windup <= 0) {
          this.clearTelegraph(e);
          if (e.pending) this.attack(e, e.pending);
          e.pending = null;
        }
      } else if (active) {
        const keep = e.spec.shoot ? (e.boss ? 3.5 : 3.5) : 0;
        if (dist > keep + e.spec.radius && e.type !== 'arm') {
          speed = e.spec.speed * diff.speed * (e.type === 'wisp' ? 0.8 + Math.sin(this.time * 5 + e.home.x) * 0.4 : 1);
          const wobble = e.type === 'wisp' ? new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(Math.sin(this.time * 3) * 0.6) : new THREE.Vector3();
          const m = dir.clone().add(wobble).normalize();
          world.move(e.pos, m.x * speed * dt, m.z * speed * dt, e.spec.radius);
        }
        e.rig.root.rotation.y = lerpAngle(e.rig.root.rotation.y, Math.atan2(dir.x, dir.z), 1 - Math.exp(-dt * 8));
        // Choose and telegraph the next attack.
        if (e.cd <= 0) {
          let kind: string | null = null;
          if (e.boss) {
            const pattern = BOSS_PATTERNS[e.type] ?? ['ring'];
            kind = pattern[e.step++ % pattern.length];
            e.cd = (e.spec.shoot ?? 2.6) * diff.cooldown;
          } else if (e.spec.shoot && dist < (e.spec.range ?? 6) && world.clearLine(e.pos.x, e.pos.z, p.pos.x, p.pos.z)) {
            kind = 'shot';
            e.cd = e.spec.shoot * diff.cooldown * (0.8 + Math.random() * 0.4);
          } else if ((e.type === 'crawler' || e.type === 'packet') && dist < 4 && dist > 1.2) {
            kind = 'lunge';
            e.cd = 2.2 * diff.cooldown;
          }
          if (kind) {
            e.pending = kind;
            e.aim = dir.clone();
            e.windup = e.boss ? 0.75 : 0.45;
            if (kind === 'ring' || kind === 'summon' || kind === 'blink') this.telegraph(e, 'ring');
            else this.telegraph(e, 'line', dir);
          }
        }
      } else {
        e.wanderT -= dt;
        if (e.wanderT <= 0) {
          e.wanderT = 2 + Math.random() * 2;
          e.wander = e.home.clone().add(new THREE.Vector3((Math.random() - 0.5) * 5, 0, (Math.random() - 0.5) * 5));
        }
        if (e.wander && e.type !== 'arm') {
          const w = e.wander.clone().sub(e.pos).setY(0);
          if (w.length() > 0.3) {
            speed = e.spec.speed * 0.4;
            w.normalize();
            world.move(e.pos, w.x * speed * dt, w.z * speed * dt, e.spec.radius);
            e.rig.root.rotation.y = lerpAngle(e.rig.root.rotation.y, Math.atan2(w.x, w.z), 1 - Math.exp(-dt * 5));
          }
        }
      }
      // Contact damage.
      if (active && e.spec.dmg > 0 && dist < e.spec.radius + 0.45 && e.touchCd <= 0) {
        this.hurtPlayer(e.spec.dmg, e.pos);
        e.touchCd = 1;
      }
      e.touchCd -= dt;
      e.pos.y = world.heightAt(e.pos.x, e.pos.z);
      e.rig.root.position.copy(e.pos);
      e.rig.animate(this.time, speed, dt);
    }
    // Bots shoulder each other apart instead of stacking into one blob.
    const list = this.enemies;
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (a.room !== b.room || a.type === 'spawner' || b.type === 'spawner') continue;
        const dx = b.pos.x - a.pos.x;
        const dz = b.pos.z - a.pos.z;
        const min = a.spec.radius + b.spec.radius;
        const d2 = dx * dx + dz * dz;
        if (d2 >= min * min || d2 < 1e-6) continue;
        const d = Math.sqrt(d2);
        const push = (min - d) * 0.5;
        const nx = dx / d;
        const nz = dz / d;
        const wa = a.boss || a.spec.speed === 0 ? 0 : b.boss || b.spec.speed === 0 ? 2 : 1;
        const wb = b.boss || b.spec.speed === 0 ? 0 : a.boss || a.spec.speed === 0 ? 2 : 1;
        world.move(a.pos, -nx * push * wa, -nz * push * wa, a.spec.radius);
        world.move(b.pos, nx * push * wb, nz * push * wb, b.spec.radius);
      }
    const bossPlate = bossActive ? { name: BOSSES[this.sceneId]?.name ?? 'Boss', title: BOSSES[this.sceneId]?.title ?? '' } : null;
    if ((bossPlate?.name ?? null) !== (this.store.get().boss?.name ?? null)) {
      this.store.set({ boss: bossPlate });
      if (bossPlate) {
        this.audio.sfx('emp');
        this.say(`Careful — the ${bossPlate.name}! Watch for the red warnings and dodge.`, 3500, true);
      }
    }
  }

  private updateProjectiles(dt: number) {
    const world = this.world!;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.life -= dt;
      pr.pos.addScaledVector(pr.vel, dt);
      pr.mesh.position.copy(pr.pos);
      let dead = pr.life <= 0;
      const cell = world.cell(pr.pos.x, pr.pos.z);
      if (!cell || cell.t === 2 || (cell.solid && pr.pos.y < world.heightAt(pr.pos.x, pr.pos.z) + 1)) dead = true;
      if (pr.from === 'player') {
        for (const e of this.enemies) {
          if (e.pos.clone().setY(0).distanceTo(pr.pos.clone().setY(0)) < e.spec.radius + 0.25) {
            this.damageEnemy(e, pr.dmg, pr.vel.clone().normalize());
            dead = true;
            break;
          }
        }
        for (const [id, obj] of this.relayObjs)
          if (!this.save.relays.includes(id) && obj.position.clone().setY(0).distanceTo(pr.pos.clone().setY(0)) < 0.7) {
            this.powerRelay(id);
            dead = true;
          }
      } else if (this.player.dashT <= 0 && this.player.pos.clone().setY(0).distanceTo(pr.pos.clone().setY(0)) < 0.45) {
        this.hurtPlayer(pr.dmg, pr.pos);
        dead = true;
      }
      if (dead) {
        this.bursts.spawn(pr.pos, pr.from === 'player' ? '#e879f9' : '#fca5a5', 4, 1.5);
        this.level.remove(pr.mesh);
        pr.mesh.geometry.dispose();
        this.projectiles.splice(i, 1);
      }
    }
  }

  private useArtifact(slot: number) {
    const gear = GEAR.find((g) => g.slot === slot);
    if (!gear) return;
    if (!this.hasGear(gear.id)) {
      const from = this.portfolio.levels.find((l) => l.id === gear.from);
      this.say(`${gear.name} is locked — clear the ${from?.title ?? gear.from} mission to unlock it.`, 3500);
      this.audio.sfx('error');
      return;
    }
    if (this.cooldowns[gear.id]) return;
    this.cooldowns[gear.id] = COOLDOWNS[gear.id];
    const p = this.player;
    switch (gear.id) {
      case 'scanner':
        this.scannerT = 8;
        this.audio.sfx('chip');
        this.pulse('#67e8f9', 9);
        break;
      case 'emp':
        this.audio.sfx('emp');
        this.pulse('#a78bfa', 3.4);
        this.shake = 0.25;
        for (const e of [...this.enemies])
          if (e.pos.distanceTo(p.pos) < 3.4 + e.spec.radius) {
            e.stun = 2;
            this.damageEnemy(e, 2, e.pos.clone().sub(p.pos).setY(0).normalize());
          }
        break;
      case 'repair':
        p.hp = Math.min(this.maxHp(), p.hp + 5);
        this.store.set({ hp: p.hp });
        this.audio.sfx('heal');
        this.bursts.spawn(p.pos.clone().add(new THREE.Vector3(0, 0.8, 0)), '#34d399', 12, 2);
        break;
      case 'drone': {
        const mesh = buildEnemy('drone').root;
        mesh.scale.setScalar(0.6);
        this.level.add(mesh);
        this.buddy = { mesh, t: 12, fire: 0 };
        this.audio.sfx('build');
        break;
      }
    }
  }

  private updateBuddy(dt: number) {
    const b = this.buddy;
    if (!b) return;
    b.t -= dt;
    const a = this.time * 2;
    b.mesh.position.copy(this.player.pos).add(new THREE.Vector3(Math.cos(a) * 1.2, 0.4, Math.sin(a) * 1.2));
    b.fire -= dt;
    if (b.fire <= 0) {
      const target = this.enemies.filter((e) => e.pos.distanceTo(this.player.pos) < 6).sort((x, y) => x.pos.distanceTo(b.mesh.position) - y.pos.distanceTo(b.mesh.position))[0];
      if (target) {
        b.fire = 0.6;
        const dir = target.pos.clone().sub(b.mesh.position).setY(0).normalize();
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.3), glow('#c4b5fd', 4));
        const start = b.mesh.position.clone().add(new THREE.Vector3(0, 0.6, 0));
        mesh.position.copy(start);
        this.level.add(mesh);
        this.projectiles.push({ mesh, pos: start, vel: dir.multiplyScalar(14), from: 'player', dmg: 1, life: 0.6 });
      }
    }
    if (b.t <= 0) {
      this.level.remove(b.mesh);
      this.buddy = null;
    }
  }

  private pulse(color: string, radius: number) {
    this.pulseAt(this.player.pos, color, radius);
  }

  /** Expanding ground ring (EMP, hiss, explosions). */
  private pulseAt(at: THREE.Vector3, color: string, radius: number) {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1, 32),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.copy(at).add(new THREE.Vector3(0, 0.1, 0));
    this.level.add(m);
    let s = 0.2;
    const grow = () => {
      s += 0.08 * radius;
      m.scale.setScalar(s);
      (m.material as THREE.MeshBasicMaterial).opacity *= 0.9;
      if (s < radius) requestAnimationFrame(grow);
      else {
        this.level.remove(m);
        m.geometry.dispose();
      }
    };
    grow();
  }

  // ── Tour mode ───────────────────────────────────────────────────────────────

  private tour: {
    steps: { level: string; target: string; line: string; title: string }[];
    i: number;
    phase: 'travel' | 'walk' | 'read';
    timer: number;
    path: THREE.Vector3[];
    paused: boolean;
  } | null = null;

  private buildTourSteps() {
    const steps: { level: string; target: string; line: string; title: string }[] = [];
    const intro: Record<string, string> = {
      about: 'First stop: the Core Reactor — who Dayna is.',
      education: 'Up the Academy Spires: SST, then SP, then NUS.',
      experience: 'The Robot Forge — one hall per internship, oldest first.',
      projects: 'The Circuit Caverns — every project, taken apart.',
      trophies: 'The Trophy Hall: awards and the Skill Matrix.',
      leadership: 'The Colony Commons — leadership and community.',
      github: 'The Mainframe, wired to Dayna’s GitHub.',
      contact: 'Last stop: the Comms Array. Say hi!',
    };
    for (const id of MISSION_ORDER) {
      const level = this.portfolio.levels.find((l) => l.id === id);
      if (!level) continue;
      let targets: { target: string; title: string }[] = [];
      if (id === 'projects') targets = level.rooms.map((r) => ({ target: `assembly:${r.id}`, title: r.title }));
      else if (id === 'trophies')
        targets = level.rooms.filter((r) => r.id === 'awards' || r.id === 'skill-matrix').map((r) => ({ target: roomKey(id, r.id), title: r.title }));
      else if (id === 'contact') targets = [{ target: 'transmitter', title: 'Transmission Console' }];
      else targets = level.rooms.map((r) => ({ target: roomKey(id, r.id), title: r.title }));
      targets.forEach((t, k) => steps.push({ level: id, ...t, line: k === 0 ? intro[id] : `Next up: ${t.title}.` }));
    }
    return steps;
  }

  startTour() {
    const steps = this.buildTourSteps();
    this.tour = { steps, i: 0, phase: 'travel', timer: 0, path: [], paused: false };
    this.touring = true;
    this.store.set({ menu: null, panel: null });
    this.say(`Tour mode! I'll walk you through everything — sit back. Meow.`, 3500, true);
    this.tourUpdateHud();
    this.tourBegin();
  }

  stopTour(message = true) {
    if (!this.tour) return;
    this.tour = null;
    this.touring = false;
    this.store.set({ tour: null });
    if (message) this.say('Tour over — explore on your own any time!', 3000, true);
  }

  tourNext(delta = 1) {
    const t = this.tour;
    if (!t) return;
    t.i = Math.max(0, Math.min(t.steps.length - 1, t.i + delta));
    if (this.store.get().panel) this.store.set({ panel: null });
    this.tourBegin();
  }

  tourTogglePause() {
    if (!this.tour) return;
    this.tour.paused = !this.tour.paused;
    this.tourUpdateHud();
  }

  private tourUpdateHud() {
    const t = this.tour;
    if (!t) return;
    const s = t.steps[t.i];
    const level = this.portfolio.levels.find((l) => l.id === s.level);
    this.store.set({ tour: { step: t.i + 1, total: t.steps.length, label: `${level?.title ?? ''} · ${s.title}${t.paused ? ' · paused' : ''}` } });
  }

  private tourBegin() {
    const t = this.tour;
    if (!t) return;
    const s = t.steps[t.i];
    this.tourUpdateHud();
    if (this.sceneId !== s.level) {
      t.phase = 'travel';
      this.travel(s.level);
      return;
    }
    this.tourWalk();
  }

  /** Called after a scene finishes loading. */
  private tourArrived() {
    const t = this.tour;
    if (!t || this.sceneId !== t.steps[t.i].level) return;
    this.tourWalk();
  }

  private tourWalk() {
    const t = this.tour!;
    const s = t.steps[t.i];
    const it = this.inters.find((i) => i.id === s.target);
    if (!it) {
      this.tourNext();
      return;
    }
    this.say(s.line, 3200, true);
    t.path = this.findPath(this.player.pos, it.pos) ?? [];
    if (!t.path.length) {
      // Blocked (e.g. a puzzle barrier): beam straight there.
      this.bursts.spawn(this.player.pos.clone().add(new THREE.Vector3(0, 1, 0)), '#c4b5fd', 16, 3);
      const spot = this.freeNear(it.pos);
      this.player.pos.copy(spot);
      this.cat.pos.copy(spot).add(new THREE.Vector3(0.6, 0, 0.6));
    }
    t.phase = 'walk';
    t.timer = 12;
  }

  private freeNear(pos: THREE.Vector3) {
    for (const [dx, dz] of [[0, 1.2], [1.2, 0], [-1.2, 0], [0, -1.2], [1.2, 1.2], [-1.2, 1.2]])
      if (!this.world!.solid(pos.x + dx, pos.z + dz)) return new THREE.Vector3(pos.x + dx, this.world!.heightAt(pos.x + dx, pos.z + dz), pos.z + dz);
    return pos.clone();
  }

  /** BFS over walkable cells; returns waypoints (cell centres) ending next to the goal. */
  private findPath(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] | null {
    const w = this.world!;
    const W = this.map.w;
    const start = Math.floor(from.z) * W + Math.floor(from.x);
    const gx = Math.floor(to.x);
    const gz = Math.floor(to.z);
    const prev = new Map<number, number>([[start, -1]]);
    const queue = [start];
    let found = -1;
    while (queue.length) {
      const i = queue.shift()!;
      const x = i % W;
      const z = Math.floor(i / W);
      if (Math.abs(x - gx) <= 1 && Math.abs(z - gz) <= 1) {
        found = i;
        break;
      }
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const nz = z + dz;
        const j = nz * W + nx;
        if (prev.has(j) || w.solid(nx + 0.5, nz + 0.5)) continue;
        prev.set(j, i);
        queue.push(j);
      }
    }
    if (found < 0) return null;
    const out: THREE.Vector3[] = [];
    for (let i = found; i !== -1 && i !== start; i = prev.get(i)!) out.unshift(new THREE.Vector3((i % W) + 0.5, 0, Math.floor(i / W) + 0.5));
    return out;
  }

  /** Drives the player during the walk phase; returns the movement speed for animation. */
  private tourStep(dt: number): number {
    const t = this.tour;
    if (!t || t.phase !== 'walk' || t.paused) return 0;
    t.timer -= dt;
    const p = this.player;
    const next = t.path[0];
    if (next) {
      const d = next.clone().sub(p.pos).setY(0);
      const len = d.length();
      if (len < 0.2) t.path.shift();
      else {
        d.normalize();
        const step = Math.min(len, PLAYER_SPEED * 1.15 * dt);
        this.world!.move(p.pos, d.x * step, d.z * step, 0.3);
        p.facing = Math.atan2(d.x, d.z);
      }
    }
    if (!t.path.length || t.timer <= 0) {
      const it = this.inters.find((i) => i.id === t.steps[t.i].target);
      if (it) {
        const face = it.pos.clone().sub(p.pos).setY(0);
        if (face.lengthSq() > 0.01) p.facing = Math.atan2(face.x, face.z);
        if (it.id === 'transmitter') this.store.set({ panel: { kind: 'contact' } });
        else it.use();
      }
      t.phase = 'read';
      const panel = this.store.get().panel;
      const words = panel && panel.kind === 'content' ? panel.html.replace(/<[^>]+>/g, ' ').split(/\s+/).length : 40;
      t.timer = Math.min(16, Math.max(7, 4 + words / 4));
      if (t.i === t.steps.length - 1) t.timer = Infinity;
      return 0;
    }
    return PLAYER_SPEED;
  }

  /** Runs while a panel is open (the game itself is paused). */
  private tourReading(dt: number) {
    const t = this.tour;
    if (!t || t.phase !== 'read') return;
    if (!this.store.get().panel) {
      // Visitor closed the panel themselves — move on.
      if (t.i < t.steps.length - 1) this.tourNext();
      else this.stopTour();
      return;
    }
    if (t.paused) return;
    t.timer -= dt;
    if (t.timer <= 0) this.tourNext();
  }

  // ── Xiao Hu's ability ───────────────────────────────────────────────────────

  /** C / cat button: pounce on the nearest bot, or fetch the nearest project part. */
  catAbility() {
    const c = this.cat;
    const p = this.player;
    if (this.cooldowns.cat) {
      this.say('*licks paw* …give me a second.', 1600, true);
      return;
    }
    if (c.mode !== 'follow') return;
    c.sleeping = false;
    const enemy = this.enemies
      .filter((e) => e.type !== 'capacitor' && e.pos.distanceTo(p.pos) < 8 && this.world!.clearLine(c.pos.x, c.pos.z, e.pos.x, e.pos.z))
      .sort((a, b) => a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos))[0];
    if (enemy) {
      c.mode = 'pounce';
      c.target = enemy;
      this.cooldowns.cat = COOLDOWNS.cat;
      this.audio.meow(1.3);
      this.say('MRRRAOW!', 1400, true);
      return;
    }
    const long = this.tricks()['long-fetch'];
    const part = this.inters
      .filter((i) => (i.kind === 'part' || (long && i.kind === 'fragment')) && i.pos.distanceTo(p.pos) < (long ? 28 : 14))
      .sort((a, b) => a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos))[0];
    if (part) {
      c.mode = 'fetch';
      c.fetch = part;
      this.cooldowns.cat = COOLDOWNS.cat * (long ? 0.7 : 1);
      this.audio.meow(1.1);
      this.say(`I'll get the ${part.label}!`, 1800, true);
      return;
    }
    this.say('Nothing to chase here… *yawns*', 1800, true);
  }

  /** Returns true while the cat is busy with an ability (skips follow logic). */
  private updateCatAbility(dt: number): boolean {
    const c = this.cat;
    const world = this.world!;
    const run = (to: THREE.Vector3, speed: number) => {
      const d = to.clone().sub(c.pos).setY(0);
      const len = d.length();
      if (len > 0.05) {
        d.normalize();
        c.pos.x += d.x * Math.min(len, speed * dt);
        c.pos.z += d.z * Math.min(len, speed * dt);
        c.facing = Math.atan2(d.x, d.z);
      }
      c.pos.y = world.heightAt(c.pos.x, c.pos.z) + (c.mode === 'pounce' ? Math.sin(Math.min(1, len / 3) * Math.PI) * 0.6 : 0);
      c.rig.root.position.copy(c.pos);
      c.rig.root.rotation.y = c.facing;
      c.rig.animate(this.time, speed, dt);
      return len;
    };
    if (c.mode === 'pounce') {
      const e = c.target;
      if (!e || !this.enemies.includes(e)) {
        c.mode = 'follow';
        return false;
      }
      if (run(e.pos, 12) < e.spec.radius + 0.4) {
        e.stun = Math.max(e.stun, e.boss ? 1.2 : 2.5);
        e.windup = 0;
        this.clearTelegraph(e);
        this.damageEnemy(e, 1);
        this.bursts.spawn(e.pos.clone().add(new THREE.Vector3(0, 0.8, 0)), '#fcd34d', 10, 2.5);
        if (this.tricks().hiss) {
          // Hiss: a shockwave that stuns every bot around the target.
          this.pulseAt(e.pos, '#fcd34d', 2.6);
          this.audio.meow(0.7);
          for (const o of this.enemies)
            if (o !== e && !o.fab && o.pos.distanceTo(e.pos) < 2.6 + o.spec.radius) {
              o.stun = Math.max(o.stun, o.boss ? 0.6 : 1.6);
              o.windup = 0;
              this.clearTelegraph(o);
            }
        }
        this.catAssist();
        c.mode = 'follow';
        c.target = null;
      }
      return true;
    }
    if (c.mode === 'fetch' || c.mode === 'carry') {
      const it = c.fetch;
      if (!it || !this.inters.includes(it)) {
        c.mode = 'follow';
        c.fetch = null;
        return false;
      }
      if (c.mode === 'fetch') {
        if (run(it.pos, 9) < 0.4) c.mode = 'carry';
      } else {
        run(this.player.pos, 9);
        it.object.position.copy(c.pos).add(new THREE.Vector3(0, 0.25, 0));
        it.pos.copy(c.pos);
        if (c.pos.distanceTo(this.player.pos) < 1.2) {
          it.use();
          this.catAssist();
          c.mode = 'follow';
          c.fetch = null;
        }
      }
      return true;
    }
    return false;
  }

  private catAssist() {
    this.save.catAssists = (this.save.catAssists ?? 0) + 1;
    if (this.save.catAssists >= 5) this.award('good-kitty');
    this.markDirty();
  }

  // ── Puzzles ─────────────────────────────────────────────────────────────────

  private puzzle: {
    id: string;
    type: 'sequence' | 'rotate' | 'pattern';
    nodes: { index: number; obj: THREE.Group; state: number; pos: THREE.Vector3 }[];
    target: number[];
    progress: number;
    tries: number;
    barrier: { cells: { x: number; z: number }[]; meshes: THREE.Object3D[] } | null;
  } | null = null;

  private puzzleDef() {
    return PUZZLES[this.sceneId];
  }

  private setupPuzzle(id: string) {
    const def = this.puzzleDef();
    if (!def || this.puzzle) return;
    const r = rng(id.length * 131 + id.charCodeAt(0));
    let target: number[];
    if (def.type === 'sequence') {
      target = [...Array(def.nodes).keys()].sort(() => r() - 0.5);
      if (target.every((v, i) => v === i)) target.reverse();
    } else if (def.type === 'rotate') target = Array.from({ length: def.nodes }, () => 1 + Math.floor(r() * 3));
    else {
      target = Array.from({ length: def.nodes }, () => (r() > 0.5 ? 1 : 0));
      if (target.every((v) => !v)) target[0] = 1;
    }
    this.puzzle = { id, type: def.type, nodes: [], target, progress: 0, tries: 0, barrier: null };
  }

  private puzzleSolved(id: string) {
    return this.save.puzzles.includes(id);
  }

  private spawnBarrier(s: Extract<Spawn, { kind: 'barrier' }>) {
    this.setupPuzzle(s.id);
    if (this.puzzleSolved(s.id) || !this.puzzle) return;
    const meshes: THREE.Object3D[] = [];
    const mat = new THREE.MeshStandardMaterial({ color: '#000000', emissive: new THREE.Color('#ef4444'), emissiveIntensity: 1.6, transparent: true, opacity: 0.55, depthWrite: false });
    for (const c of s.cells) {
      const cell = this.world!.cell(c.x, c.z);
      if (cell) cell.solid = true;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.96, 2.2, 0.96), mat);
      m.position.set(c.x + 0.5, this.world!.heightAt(c.x + 0.5, c.z + 0.5) + 1.1, c.z + 0.5);
      m.userData.barrier = true;
      this.level.add(m);
      meshes.push(m);
    }
    this.addLight(new THREE.Vector3(s.x, 1.5, s.z), '#ef4444', 4, 5, 0.3);
    this.puzzle.barrier = { cells: s.cells, meshes };
    this.inter({
      id: `${s.id}-barrier`,
      kind: 'barrier',
      x: s.x,
      z: s.z,
      radius: 2.2,
      verb: 'Inspect',
      label: 'Energy barrier',
      sub: this.puzzleDef()?.name,
      object: this.level,
      accent: '#ef4444',
      done: () => this.puzzleSolved(s.id),
      enabled: () => !this.puzzleSolved(s.id),
      use: () => this.say(`Locked. ${this.puzzleDef()?.hint ?? ''}`, 3500, true),
    });
  }

  private nodeLook(n: { obj: THREE.Group; state: number }, type: string, lit = false) {
    const head = n.obj.userData.head as THREE.Object3D;
    const lamp = n.obj.userData.lamp as THREE.Mesh;
    if (type === 'rotate') head.rotation.y = (n.state * Math.PI) / 2;
    const on = type === 'pattern' ? n.state === 1 : lit;
    lamp.material = on ? glow('#4ade80', 3) : glow('#f59e0b', 1.2);
  }

  private spawnNode(s: Extract<Spawn, { kind: 'pnode' }>) {
    this.setupPuzzle(s.id);
    const pz = this.puzzle;
    if (!pz) return;
    const solved = this.puzzleSolved(s.id);
    const obj = buildPuzzleNode(pz.type, this.biome.light, s.index);
    this.place(obj, s.x, s.z, 0, false);
    const node = { index: s.index, obj, state: solved ? pz.target[s.index] : 0, pos: new THREE.Vector3(s.x, 0, s.z) };
    if (pz.type === 'sequence') node.state = 0;
    pz.nodes.push(node);
    this.nodeLook(node, pz.type, solved);
    const label = pz.type === 'sequence' ? `Capacitor ${'ABCD'[s.index]}` : pz.type === 'rotate' ? `Junction ${s.index + 1}` : `Switch ${s.index + 1}`;
    this.inter({
      id: `${s.id}-node-${s.index}`,
      kind: 'pnode',
      x: s.x,
      z: s.z + 0.8,
      radius: 1.2,
      verb: pz.type === 'sequence' ? 'Charge' : pz.type === 'rotate' ? 'Rotate' : 'Toggle',
      label,
      sub: this.puzzleDef()?.name,
      object: obj,
      accent: this.biome.light,
      done: () => this.puzzleSolved(s.id),
      enabled: () => !this.puzzleSolved(s.id),
      use: () => this.useNode(node),
    });
  }

  private spawnHint(s: Extract<Spawn, { kind: 'phint' }>) {
    this.setupPuzzle(s.id);
    const def = this.puzzleDef();
    if (!def) return;
    const obj = this.place(buildConsole('#f59e0b'), s.x, s.z);
    this.inter({
      id: `${s.id}-hint`,
      kind: 'console',
      x: s.x,
      z: s.z + 0.2,
      radius: 1.5,
      verb: 'Read',
      label: def.name,
      sub: 'Diagnostics console',
      object: obj,
      accent: '#f59e0b',
      done: () => this.puzzleSolved(s.id),
      use: () => this.openPuzzleHint(),
    });
  }

  private openPuzzleHint() {
    const pz = this.puzzle;
    const def = this.puzzleDef();
    if (!pz || !def) return;
    this.audio.sfx('open');
    const glyph = (v: number) => (pz.type === 'rotate' ? ['↗', '↖', '↙', '↘'][v] : pz.type === 'pattern' ? String(v) : 'ABCD'[v]);
    const solved = this.puzzleSolved(pz.id);
    const target =
      pz.type === 'sequence'
        ? pz.target.map((v) => `<b>${glyph(v)}</b>`).join(' → ')
        : pz.target.map((v, i) => `<span class="g-slotv">${i + 1}<b>${glyph(v)}</b></span>`).join(' ');
    const html = solved
      ? '<p class="g-ok">✔ Barrier offline — the way is open.</p>'
      : `<p>${def.hint}</p><div class="g-puzzle">${target}</div>${
          pz.type === 'rotate' ? '<p class="g-sub">Arrows show where each junction\u2019s glowing arrow must point on screen.</p>' : ''
        }`;
    this.store.set({
      panel: {
        kind: 'content',
        levelId: this.sceneId,
        roomId: 'puzzle',
        eyebrow: 'Diagnostics console',
        title: def.name,
        html,
        tone: solved ? 'success' : 'info',
        actions: !solved && pz.tries >= 3 ? [{ id: 'puzzle:bypass', label: `🐾 Let ${this.portfolio.site.companion.name} chew through the wire`, primary: true }] : [],
      },
    });
  }

  private useNode(node: { index: number; obj: THREE.Group; state: number }) {
    const pz = this.puzzle;
    if (!pz || this.puzzleSolved(pz.id)) return;
    this.audio.sfx('relay');
    if (pz.type === 'sequence') {
      if (pz.target[pz.progress] === node.index) {
        pz.progress++;
        this.nodeLook(node, pz.type, true);
        if (pz.progress >= pz.target.length) this.solvePuzzle(false);
      } else {
        pz.tries++;
        pz.progress = 0;
        for (const n of pz.nodes) this.nodeLook(n, pz.type, false);
        this.audio.sfx('error');
        this.bursts.spawn(node.obj.position.clone().add(new THREE.Vector3(0, 1.2, 0)), '#ef4444', 10, 2);
        this.say(pz.tries >= 3 ? 'Hmm… check the diagnostics console. Or I could chew the wire?' : 'Wrong order — the capacitors reset.', 3000, true);
      }
      return;
    }
    node.state = (node.state + 1) % (pz.type === 'rotate' ? 4 : 2);
    this.nodeLook(node, pz.type);
    pz.tries += 0.25;
    if (pz.nodes.every((n) => n.state === pz.target[n.index])) this.solvePuzzle(false);
    else if (pz.tries >= 3 && pz.tries < 3.25) this.say('Stuck? The diagnostics console has the answer — or I can chew the wire.', 3500);
  }

  private solvePuzzle(bypass: boolean) {
    const pz = this.puzzle;
    if (!pz || this.puzzleSolved(pz.id)) return;
    this.save.puzzles.push(pz.id);
    if (bypass) this.save.bypassed.push(pz.id);
    this.markDirty();
    for (const n of pz.nodes) {
      if (pz.type !== 'sequence') n.state = pz.target[n.index];
      this.nodeLook(n, pz.type, true);
    }
    if (pz.barrier) {
      for (const c of pz.barrier.cells) {
        const cell = this.world!.cell(c.x, c.z);
        if (cell) cell.solid = false;
      }
      for (const m of pz.barrier.meshes) {
        this.bursts.spawn(m.position, '#ef4444', 6, 2);
        this.level.remove(m);
      }
      this.lights.sources = this.lights.sources.filter((l) => !(l.color.getHexString() === 'ef4444' && l.flicker));
    }
    this.audio.sfx('build');
    this.shake = 0.3;
    this.store.toast(`🔓 ${this.puzzleDef()?.name ?? 'Puzzle'} — barrier offline`, 'gear');
    this.say(bypass ? '*crunch crunch* …Done! Don’t tell Dayna.' : 'You did it! The barrier is down.', 3200, true);
    const all = Object.keys(PUZZLES);
    if (all.every((id) => this.save.puzzles.includes(`${id}-gate`)) && !this.save.bypassed.length) this.award('puzzler');
    this.refreshHud();
  }

  // ── Content interactions ────────────────────────────────────────────────────

  private openRoom(room: Room) {
    const key = roomKey(this.sceneId, room.id);
    this.audio.sfx('open');
    const panel =
      this.sceneId === 'github'
        ? githubConsole(this.portfolio, room, this.github, this.save)
        : this.sceneId === 'leadership'
          ? npcPanel(this.portfolio, room, this.save)
          : roomPanel(this.portfolio, this.sceneId, room, this.save);
    this.store.set({ panel });
    this.markScanned(key);
  }

  private openPart(room: Room, partId: string) {
    const part = room.parts.find((p) => p.id === partId);
    if (!part) return;
    this.audio.sfx('open');
    this.store.set({ panel: partPanel(this.portfolio, this.sceneId, room, part) });
    this.markScanned(partKey(this.sceneId, room.id, part.id));
  }

  private openProject(room: Room) {
    this.audio.sfx('open');
    const { panel, check, missingParts } = projectPanel(this.portfolio, room, this.save, this.skillsCache);
    this.store.set({ panel });
    if (!this.save.built.includes(room.id)) {
      if (missingParts.length) this.say(`${missingParts.length} part${missingParts.length > 1 ? 's' : ''} still missing for ${room.title}.`, 3000);
      else if (!check.ok) {
        this.audio.sfx('error');
        const m = check.missingSkills[0];
        const need = check.missingProjects[0];
        if (m) {
          const lvl = this.portfolio.levels.find((l) => l.id === m.from[0]?.levelId);
          this.say(`Meow… we need ${m.name} Lv ${m.level}. Try the ${lvl?.title ?? 'other'} mission.`, 4500);
        } else if (need) this.say(`We should build ${need.title} first.`, 3500);
      }
    }
  }

  /** Called from the panel's Assemble button. */
  buildProject(id: string) {
    const room = this.projectRooms().find((r) => r.id === id);
    if (!room || this.save.built.includes(id) || this.assembly) return;
    const { check, missingParts } = projectPanel(this.portfolio, room, this.save, this.skillsCache);
    if (!check.ok || missingParts.length) return;
    if (this.settings.peaceful || this.touring) this.completeBuild(room);
    else this.startAssembly(room);
  }

  // ── Hold the line: assembling a project is a timed defence ─────────────────

  private assembly: {
    room: Room;
    t: number;
    dur: number;
    vault: number;
    station: THREE.Vector3;
    spawnT: number;
    wave: Enemy[];
    state: 'ok' | 'jammed' | 'away';
    shown: number;
  } | null = null;

  private startAssembly(room: Room) {
    const station = this.inters.find((i) => i.id === `assembly:${room.id}`);
    if (!station) return this.completeBuild(room);
    const dur = { story: 30, normal: 45, hard: 55 }[this.settings.difficulty ?? 'normal'];
    this.assembly = { room, t: 0, dur, vault: this.world!.roomAt(station.pos.x, station.pos.z), station: station.pos.clone(), spawnT: 1.5, wave: [], state: 'ok', shown: -1 };
    this.store.set({ panel: null });
    this.audio.sfx('emp');
    this.shake = 0.25;
    this.say(`Assembling ${room.title}! Keep the bugs off the station for ${dur} seconds!`, 3800, true);
    this.syncAssemblyHud();
  }

  private updateAssembly(dt: number) {
    const a = this.assembly;
    if (!a) return;
    const p = this.player;
    const away = this.world!.roomAt(p.pos.x, p.pos.z) !== a.vault;
    const jammed = this.enemies.some((e) => e.spec.speed > 0 && e.pos.distanceTo(a.station) < 1.9 + e.spec.radius);
    a.state = away ? 'away' : jammed ? 'jammed' : 'ok';
    if (a.state === 'ok') a.t += dt;
    const k = Math.min(1, a.t / a.dur);
    // The blueprint visibly pulls itself together as the bar fills.
    this.blueprints.get(a.room.id)?.setExplode(0.6 * (1 - k));
    if (a.state === 'ok' && Math.random() < dt * 6) this.bursts.spawn(a.station.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.2, 1.6, -1.3)), '#22d3ee', 2, 1.5);
    // Waves: bugs pour in from the edges of the vault, faster as the build nears completion.
    a.spawnT -= dt;
    a.wave = a.wave.filter((e) => this.enemies.includes(e));
    if (a.spawnT <= 0 && a.wave.length < 6) {
      a.spawnT = (k > 0.6 ? 2.4 : 3.2) * this.difficulty().cooldown;
      const count = 1 + (k > 0.5 ? 1 : 0) + (this.difficulty().extra ? 1 : 0);
      const r = this.map.rooms[a.vault];
      for (let n = 0, tries = 0; n < count && tries < 30; tries++) {
        const x = r.x + 1.5 + Math.random() * (r.w - 3);
        const z = r.z + 1.5 + Math.random() * (r.d - 3);
        if (this.world!.solid(x, z) || Math.hypot(x - a.station.x, z - a.station.z) < 4.5 || Math.hypot(x - p.pos.x, z - p.pos.z) < 2.5) continue;
        const e = this.addEnemy(k > 0.6 && n === 0 ? 'drone' : 'bug', x, z, a.vault);
        e.summoned = true;
        e.cd = 1;
        a.wave.push(e);
        this.bursts.spawn(e.pos.clone().add(new THREE.Vector3(0, 0.5, 0)), e.spec.color, 8, 2);
        n++;
      }
    }
    this.syncAssemblyHud();
    if (a.t >= a.dur) {
      this.assembly = null;
      for (const e of a.wave) if (this.enemies.includes(e)) this.killEnemy(e);
      this.store.set({ assembly: null });
      this.completeBuild(a.room);
    }
  }

  private syncAssemblyHud() {
    const a = this.assembly;
    if (!a) return;
    const p = Math.floor((a.t / a.dur) * 100);
    const cur = this.store.get().assembly;
    if (cur && a.shown === p && cur.state === a.state) return;
    a.shown = p;
    this.store.set({ assembly: { title: a.room.title, p, state: a.state, left: Math.ceil(a.dur - a.t) } });
  }

  private cancelAssembly(why: string) {
    if (!this.assembly) return;
    const room = this.assembly.room;
    this.assembly = null;
    this.store.set({ assembly: null });
    this.syncBlueprint(room.id);
    this.say(why, 3500);
  }

  private completeBuild(room: Room) {
    const id = room.id;
    this.save.built.push(id);
    this.markDirty();
    this.audio.sfx('build');
    this.shake = 0.3;
    const station = this.inters.find((i) => i.id === `assembly:${id}`);
    if (station) this.bursts.spawn(station.pos.clone().add(new THREE.Vector3(0, 2, -1.3)), '#22d3ee', 40, 4);
    this.syncBlueprint(id, true);
    this.award('builder');
    if (this.save.built.length >= this.projectRooms().length) this.award('master-builder');
    this.store.toast(`⚙ BUILT · ${room.title} — stored in your collection`, 'gear', 4000);
    this.say(`We built ${room.title}! It's in the collection locker now.`, 3500);
    this.afterProgress();
    if (!this.touring && !this.settings.peaceful) return;
    this.store.set({ panel: projectPanel(this.portfolio, room, this.save, this.skillsCache).panel });
  }

  private syncBlueprint(id: string, animate = false) {
    const model = this.blueprints.get(id);
    if (!model) return;
    const built = this.save.built.includes(id);
    for (const pid of model.partIds) {
      const got = built || this.save.scanned.includes(partKey('projects', id, pid));
      model.setPartState(pid, got ? 'solid' : 'ghost');
    }
    if (animate) {
      let t = 1;
      const tick = () => {
        t -= 0.03;
        model.setExplode(Math.max(0, t));
        if (t > 0) requestAnimationFrame(tick);
      };
      tick();
    } else model.setExplode(built ? 0 : 0.35);
  }

  private putOnShelf(plinth: THREE.Object3D, id: string) {
    const model = buildProjectModel(id);
    model.group.scale.setScalar(0.42);
    model.group.position.set(0, 1.35, 0);
    model.group.userData.spin = 0.6;
    plinth.add(model.group);
    this.spinners.push(model.group);
  }

  private useShelf(room: Room, plinth: THREE.Object3D) {
    if (this.save.shelved.includes(room.id)) {
      this.store.set({
        panel: { kind: 'content', levelId: 'projects', roomId: room.id, eyebrow: 'On display', title: room.title, html: room.html ?? '', model: { projectId: room.id }, actions: [{ id: `pro:projects-${room.id}`, label: 'Open in Professional mode' }] },
      });
      return;
    }
    if (!this.save.built.includes(room.id)) {
      this.audio.sfx('error');
      this.say(`We haven't built ${room.title} yet — it's in the Circuit Caverns.`, 3500);
      return;
    }
    this.save.shelved.push(room.id);
    this.markDirty();
    this.putOnShelf(plinth, room.id);
    const it = this.inters.find((i) => i.id === `shelf:${room.id}`);
    if (it) {
      it.sub = 'On display';
      it.el?.remove();
      it.el = undefined;
    }
    this.audio.sfx('build');
    this.bursts.spawn(plinth.position.clone().add(new THREE.Vector3(0, 1.4, 0)), '#fbbf24', 20, 2.5);
    this.store.toast(`${room.title} placed on the shelf (${this.save.shelved.length}/${this.projectRooms().length})`, 'info');
    if (this.save.shelved.length >= this.projectRooms().length) this.unlockBackroom();
    this.refreshHud();
  }

  private unlockBackroom() {
    this.award('curator');
    if (this.save.backroom) return;
    this.save.backroom = true;
    this.markDirty();
    this.shake = 0.8;
    this.audio.sfx('emp');
    this.world!.unlockSecret();
    const secret = this.map.rooms.find((r) => r.kind === 'secret');
    if (secret) {
      for (const s of this.map.spawns) if (this.world!.roomAt(s.x, s.z) === secret.i) this.spawn(s, null);
      this.addLight(new THREE.Vector3(secret.x + secret.w / 2, 3, secret.z + secret.d / 2), '#fef08a', 6, 12, 0.7);
    }
    this.minimapBase = this.renderMinimapBase();
    this.say('…Did the wall just move?! Something is behind the shelves!', 4500);
    this.store.toast('A hidden passage opened…', 'achievement', 4000);
  }

  private powerRelay(id: string) {
    if (this.save.relays.includes(id)) return;
    this.save.relays.push(id);
    this.markDirty();
    this.audio.sfx('relay');
    const obj = this.relayObjs.get(id);
    if (obj) {
      obj.traverse((o) => {
        if (o.userData.core && o instanceof THREE.Mesh) {
          o.material = glow('#a78bfa', 3);
          o.userData.spin = 1.4;
          this.spinners.push(o);
        }
      });
      this.bursts.spawn(obj.position.clone().add(new THREE.Vector3(0, 2, 0)), '#a78bfa', 20, 3);
      this.addLight(obj.position.clone().add(new THREE.Vector3(0, 2.4, 0)), '#a78bfa', 5, 5);
    }
    this.store.toast(`Relay online (${this.save.relays.length}/3)`, 'info');
    if (this.save.relays.length === 3) {
      this.say('All relays online! The dish is aligning… head to the console.', 4000);
      this.syncDish(true);
    }
    this.refreshHud();
  }

  private syncDish(animate = false) {
    const head = this.dish?.userData.head as THREE.Object3D | undefined;
    if (!head) return;
    const target = this.save.relays.length >= 3 ? -0.35 : -0.9;
    if (!animate) {
      head.rotation.x = target;
      return;
    }
    const tick = () => {
      head.rotation.x += (target - head.rotation.x) * 0.05;
      head.rotation.y += 0.02;
      if (Math.abs(target - head.rotation.x) > 0.01) requestAnimationFrame(tick);
    };
    tick();
  }

  /** Called by the contact form after a successful send. */
  onTransmissionSent() {
    this.save.sent = true;
    this.markDirty();
    this.award('transmission');
    this.audio.sfx('send');
    this.shake = 0.4;
    if (this.dish) {
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.6, 40, 8, 1, true),
        new THREE.MeshBasicMaterial({ color: '#c4b5fd', transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      beam.position.copy(this.dish.position).add(new THREE.Vector3(-6, 20, -6));
      beam.lookAt(this.dish.position.clone().add(new THREE.Vector3(-12, 40, -12)));
      beam.rotateX(Math.PI / 2);
      this.level.add(beam);
      this.bursts.spawn(this.dish.position.clone().add(new THREE.Vector3(0, 3, 0)), '#c4b5fd', 60, 5);
    }
    this.say('TRANSMISSION RECEIVED! Dayna will reply soon. Meow meow!', 5000);
    this.checkCleared();
  }

  private markScanned(key: string) {
    if (this.save.scanned.includes(key)) return;
    this.save.scanned.push(key);
    this.markDirty();
    this.audio.sfx('chip');
    this.afterProgress();
  }

  private afterProgress() {
    const before = this.skillsCache;
    const after = this.skills();
    this.skillsCache = after;
    for (const s of this.portfolio.site.skills) {
      if ((after[s.id] ?? 0) > (before[s.id] ?? 0)) {
        this.store.toast(`SKILL UP · ${s.name} Lv ${after[s.id]}`, 'skill');
        if (this.player) this.floatText(this.player.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.2, 2.4, 0)), `+ ${s.name}`, 'skill');
        this.audio.sfx('skill');
        if (after[s.id] >= s.max) this.award('maxed');
      }
    }
    if (allChipsCollected(this.portfolio, this.save)) this.award('read-everything');
    this.checkCleared();
    this.refreshHud();
  }

  private checkCleared() {
    const id = this.sceneId;
    if (id === 'hub' || this.save.cleared.includes(id)) return;
    if (!isCleared(this.portfolio, this.save, id, this.settings.peaceful)) return;
    const knew = catTricks(this.portfolio, this.save);
    this.save.cleared.push(id);
    const knows = catTricks(this.portfolio, this.save);
    for (const t of CAT_TRICKS)
      if (knows[t.id] && !knew[t.id])
        setTimeout(() => {
          this.store.toast(`XIAO HU LEARNED ${t.name.toUpperCase()} — ${t.desc}`, 'achievement', 6000);
          this.audio.meow(1.2);
          this.say(`Mrrp! I learned ${t.name}!`, 3000);
        }, 2400);
    this.markDirty();
    const level = this.portfolio.levels.find((l) => l.id === id);
    const gear = GEAR.find((g) => g.from === id);
    this.store.set({ banner: { title: 'MISSION CLEARED', sub: level?.meta.mission ?? level?.title ?? '', id: Date.now() } });
    setTimeout(() => this.store.set({ banner: null }), 3800);
    this.audio.sfx('build');
    if (gear) setTimeout(() => this.store.toast(`NEW GEAR · ${gear.name} — ${gear.desc}`, 'gear', 5000), 1200);
    if (gear?.id === 'firewall') {
      this.player.hp = this.maxHp();
      this.store.set({ hp: this.player.hp, maxHp: this.maxHp() });
    }
    const hasEnemies = (level?.meta.enemies ?? 'none') !== 'none';
    if (hasEnemies && !this.settings.peaceful && !(this.save.levelKills[id] ?? 0)) this.award('pacifist');
    if (id !== 'contact') {
      const unlocked = contactUnlocked(this.portfolio, this.save);
      this.say(
        unlocked ? 'Mission cleared! The Comms Core is unlocked — back to the station!' : 'Mission cleared! Step on the teleporter to head back.',
        4200,
      );
    }
    this.refreshHud();
  }

  award(id: string) {
    if (this.save.achievements.includes(id)) return;
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (!a) return;
    this.save.achievements.push(id);
    this.markDirty();
    this.store.toast(`🏆 ${a.name} — ${a.desc}`, 'achievement', 4000);
    this.audio.sfx('skill');
  }

  private hasGear(id: string) {
    return gearUnlocked(this.save).some((g) => g.id === id);
  }

  private maxHp() {
    return BASE_HP + (this.hasGear('firewall') ? 2 : 0);
  }

  skills() {
    return computeSkills(this.portfolio, { scanned: this.save.scanned, built: this.save.built });
  }

  private refreshHud() {
    const id = this.sceneId;
    const obj = objective(this.portfolio, this.save, id, this.settings.peaceful);
    const level = this.portfolio.levels.find((l) => l.id === id);
    this.store.set({
      objective: { mission: id === 'hub' ? 'Station Hub' : level?.meta.mission ?? level?.title ?? '', text: obj.text, done: obj.done },
      chips: id === 'hub' ? null : chips(this.portfolio, this.save, id),
      save: { ...this.save },
      rev: this.store.get().rev + 1,
    });
  }

  private markDirty() {
    this.dirty = true;
  }

  private persistNow() {
    persist(this.save, this.settings);
    this.dirty = false;
  }

  // ── Cat speech ──────────────────────────────────────────────────────────────

  say(text: string, ms = 3500, now = false) {
    if (now) {
      this.bubbleQueue = [];
      this.showBubble(text, ms);
      return;
    }
    if (this.bubbleT <= 0 && !this.bubbleQueue.length) this.showBubble(text, ms);
    else if (this.bubbleQueue.length < 4) this.bubbleQueue.push({ text, ms });
  }

  private showBubble(text: string, ms: number) {
    this.bubble.innerHTML = `<b>${escapeHtml(this.portfolio.site.companion.name)}</b>${escapeHtml(text)}`;
    this.bubble.hidden = false;
    this.bubbleT = ms / 1000;
    this.audio.meow(0.95 + Math.random() * 0.25);
  }

  // ── Overlays: labels, bubble, minimap ───────────────────────────────────────

  private project(v: THREE.Vector3) {
    const p = v.clone().project(this.camera);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    return { x: ((p.x + 1) / 2) * w, y: ((1 - p.y) / 2) * h, visible: p.z < 1 };
  }

  private updateOverlays() {
    if (!this.player) return;
    const p = this.player.pos;
    const near = this.nearestInter();
    for (const i of this.inters) {
      if (i.kind === 'cat' || i.kind === 'pad' || i.kind === 'exit') continue;
      const d = i.pos.distanceTo(p);
      const show = d < (i.stat ? 11 : 6.5) || (this.scannerT > 0 && d < 14);
      if (!show) {
        if (i.el) i.el.hidden = true;
        continue;
      }
      if (!i.el) {
        i.el = document.createElement('div');
        i.el.className = `g-label${i.stat ? ' stat' : ''}`;
        const head = i.stat
          ? `<span class="big">${escapeHtml(i.stat.value)}</span><span class="s">${escapeHtml(i.stat.label)}</span>`
          : `<span class="t">${escapeHtml(i.label)}</span>${i.sub ? `<span class="s">${escapeHtml(i.sub)}</span>` : ''}`;
        const more = i.summary && i.summary !== i.sub ? `<span class="x">${escapeHtml(i.summary)}</span>` : '';
        const bar = i.scan ? '<span class="bar"><i></i></span>' : '';
        i.el.innerHTML = `${head}${more}${bar}<span class="k">E · ${escapeHtml(i.verb === 'Scan' ? 'Open' : i.verb)} full entry</span>`;
        if (i.accent) i.el.style.setProperty('--accent', i.accent);
        this.overlay.appendChild(i.el);
      }
      const s = this.project(i.pos.clone().add(new THREE.Vector3(0, i.kind === 'assembly' ? 3.4 : i.kind === 'matrix' ? 3.4 : i.kind === 'npc' ? 2 : 2.1, 0)));
      i.el.hidden = !s.visible;
      i.el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -100%)`;
      i.el.style.opacity = String(Math.max(0.25, Math.min(1, (7 - d) / 3)));
      i.el.classList.toggle('done', i.done());
      i.el.classList.toggle('near', i === near);
      if (i === near && i.scan) i.el.style.setProperty('--p', String(i.done() ? 1 : this.dwell.target === i ? Math.min(1, this.dwell.t / DWELL) : 0));
    }
    if (!this.bubble.hidden) {
      const s = this.project(this.cat.pos.clone().add(new THREE.Vector3(0, 2.4, 0)));
      const w = this.canvas.clientWidth;
      const half = Math.min(150, w * 0.35);
      const x = Math.max(half + 8, Math.min(w - half - 8, s.x));
      const y = Math.max(this.bubble.offsetHeight + 70, s.y);
      this.bubble.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
    }
    this.minimapT -= 1 / 60;
    if (this.minimap && this.minimapT <= 0) {
      this.minimapT = 0.1;
      this.drawMinimap();
    }
  }

  setMinimap(canvas: HTMLCanvasElement | null) {
    this.minimap = canvas;
  }

  private renderMinimapBase() {
    const c = document.createElement('canvas');
    const S = 4;
    c.width = this.map.w * S;
    c.height = this.map.d * S;
    const ctx = c.getContext('2d')!;
    const hidden = this.world?.hiddenRoom;
    for (let z = 0; z < this.map.d; z++)
      for (let x = 0; x < this.map.w; x++) {
        const cell = this.map.cells[z * this.map.w + x];
        if (hidden != null && cell.room === hidden) continue;
        if (cell.t === 1) ctx.fillStyle = cell.solid ? '#3a3f55' : cell.surf === 'path' ? '#6d6395' : '#4b5170';
        else if (cell.t === 2) ctx.fillStyle = cell.secret ? '#262a3a' : '#20243a';
        else continue;
        ctx.fillRect(x * S, z * S, S, S);
      }
    return c;
  }

  private drawMinimap() {
    const c = this.minimap!;
    const ctx = c.getContext('2d')!;
    const W = c.width;
    const H = c.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!this.minimapBase) return;
    const S = 4;
    // ~26 tiles across; isometric-ish transform matching the camera (screen up = world −x−z).
    const k = W / 26 / S;
    const a = 0.707 * k;
    const b = 0.707 * k * 0.6;
    const p = this.player.pos;
    ctx.setTransform(a, b, -a, b, W / 2 - (a * p.x * S - a * p.z * S), H / 2 - (b * p.x * S + b * p.z * S));
    ctx.globalAlpha = 0.95;
    ctx.drawImage(this.minimapBase, 0, 0);
    const dot = (x: number, z: number, color: string, r = 1.4) => {
      ctx.fillStyle = color;
      ctx.fillRect(x * S - r * S * 0.5, z * S - r * S * 0.5, r * S, r * S);
    };
    for (const i of this.inters) {
      if (i.kind === 'cat') continue;
      const done = i.done();
      if (i.kind === 'part' && this.scannerT <= 0 && i.pos.distanceTo(p) > 7) continue;
      dot(i.pos.x, i.pos.z, done ? '#475569' : i.kind === 'part' ? '#fde047' : i.kind === 'exit' || i.kind === 'pad' ? '#a78bfa' : '#67e8f9', done ? 1 : 1.5);
    }
    if (this.scannerT > 0) for (const e of this.enemies) dot(e.pos.x, e.pos.z, '#f43f5e', 1.2);
    for (const e of this.enemies) if (e.fab) dot(e.pos.x, e.pos.z, '#f43f5e', 2.2);
    dot(this.cat.pos.x, this.cat.pos.z, '#d6b48a', 1);
    dot(p.x, p.z, '#ffffff', 1.8);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // ── UI API ──────────────────────────────────────────────────────────────────

  openStarMap() {
    this.audio.sfx('open');
    this.store.set({ panel: { kind: 'starmap' } });
  }

  closePanel() {
    const panel = this.store.get().panel;
    if (!panel) return;
    this.audio.sfx('close');
    this.store.set({ panel: null });
  }

  panelAction(id: string, panel: Panel) {
    if (id.startsWith('pro:')) {
      this.persistNow();
      this.events.onExit('pro', id.slice(4));
      return;
    }
    if (id.startsWith('build:')) {
      this.buildProject(id.slice(6));
      return;
    }
    if (id === 'puzzle:bypass') {
      this.store.set({ panel: null });
      this.solvePuzzle(true);
      return;
    }
    void panel;
  }

  togglePause() {
    const st = this.store.get();
    if (st.panel) return this.closePanel();
    this.store.set({ menu: st.menu ? null : 'pause' });
    this.persistNow();
  }

  resume() {
    this.store.set({ menu: null, panel: null });
  }

  setSettings(patch: Partial<Settings>) {
    const peacefulChanged = patch.peaceful != null && patch.peaceful !== this.settings.peaceful;
    this.settings = { ...this.settings, ...patch };
    this.input.keys = this.settings.keys;
    this.applySettings();
    this.store.set({ settings: this.settings });
    this.persistNow();
    if (peacefulChanged && this.sceneId !== 'hub') {
      this.store.toast(this.settings.peaceful ? 'Peaceful mode on — bots powered down' : 'Peaceful mode off', 'info');
      if (this.settings.peaceful) {
        for (const e of this.enemies) {
          if (e.carry) this.spawnPart(e.carry.projectId, e.carry.partId, Math.floor(e.pos.x) + 0.5, Math.floor(e.pos.z) + 0.5);
          this.level.remove(e.rig.root);
        }
        this.enemies = [];
        this.checkCleared();
      }
    }
  }

  private applySettings() {
    this.audio.configure(this.settings.muted, this.settings.music, this.settings.sfx);
    if (!this.settings.muted && this.biome) this.audio.playMusic(this.biome.id);
    document.documentElement.classList.toggle('g-large', this.settings.largeText);
  }

  resetProgress() {
    const settings = this.settings;
    this.save = loadSave();
    Object.assign(this.save, { scanned: [], built: [], shelved: [], cleared: [], achievements: [], kills: 0, pets: 0, playMs: 0, sent: false, backroom: false, tutorial: false, levelKills: {}, relays: [], bossDefeated: false, bosses: [], puzzles: [], bypassed: [] });
    this.settings = settings;
    this.persistNow();
    this.skillsCache = this.skills();
    this.travel('hub');
  }

  exit(mode: 'pro' | 'splash', anchor?: string) {
    this.persistNow();
    this.events.onExit(mode, anchor);
  }

  get missionIds() {
    return MISSION_ORDER;
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function lerpAngle(a: number, b: number, t: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function firstLine(md: string) {
  const line = md.split('\n').find((l) => l.trim()) ?? '';
  const plain = line.replace(/[*_`#>]/g, '').trim();
  return plain.length > 70 ? `${plain.slice(0, 67)}…` : plain;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

/** Direction of a world-space vector as the player sees it on screen. */
function screenDirection(v: THREE.Vector3) {
  const x = v.dot(SCREEN_RIGHT);
  const y = v.dot(SCREEN_UP);
  const a = Math.atan2(y, x);
  const names = ['to the right', 'up and to the right', 'straight up', 'up and to the left', 'to the left', 'down and to the left', 'straight down', 'down and to the right'];
  const i = (Math.round(a / (Math.PI / 4)) + 8) % 8;
  return names[i];
}

export type { Hud };

const DONE_RING = new THREE.MeshBasicMaterial({ color: '#64748b', transparent: true, opacity: 0.35, depthWrite: false });
const ringGeo = new Map<number, THREE.BufferGeometry>();
const ringMats = new Map<string, { idle: THREE.Material; on: THREE.Material; fill: THREE.MeshBasicMaterial }>();

/** Segmented HUD-style ring: 24 dashes, so zones read as UI rather than a solid neon hoop. */
function dashedRing(r: number) {
  let geo = ringGeo.get(r);
  if (geo) return geo;
  const n = 24;
  const seg = (Math.PI * 2) / n;
  const parts = Array.from({ length: n }, (_, i) => new THREE.RingGeometry(r - 0.045, r, 3, 1, i * seg, seg * 0.62));
  geo = mergeGeometries(parts)!;
  parts.forEach((g) => g.dispose());
  ringGeo.set(r, geo);
  return geo;
}

function ringMaterials(color: string) {
  let m = ringMats.get(color);
  if (!m) {
    const c = new THREE.Color(color);
    m = {
      idle: new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.4, depthWrite: false }),
      on: new THREE.MeshBasicMaterial({ color: c.clone().lerp(new THREE.Color('#ffffff'), 0.25), transparent: true, opacity: 0.9, depthWrite: false }),
      fill: new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.035, depthWrite: false, blending: THREE.AdditiveBlending }),
    };
    ringMats.set(color, m);
  }
  return m;
}

/** Floor marker for an interactable's trigger zone: dashed edge + faint fill + an inner ring when targeted. */
function zoneRing(radius: number, color: string) {
  const r = Math.round(radius * 100) / 100;
  const mats = ringMaterials(color);
  const g = new THREE.Group();
  const edge = new THREE.Mesh(dashedRing(r), mats.idle);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(r - 0.05, 32), mats.fill.clone());
  const inner = new THREE.Mesh(new THREE.RingGeometry(r * 0.55 - 0.02, r * 0.55, 32), mats.on);
  for (const m of [edge, disc, inner]) {
    m.rotation.x = -Math.PI / 2;
    g.add(m);
  }
  disc.position.y = -0.01;
  inner.visible = false;
  g.userData.color = color;
  return g;
}

/** Software renderers and older mobile/integrated GPUs start on the low preset. */
function weakGpu(renderer: THREE.WebGLRenderer) {
  try {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    return /swiftshader|llvmpipe|software|mali-[gt]?[1-7]\d|adreno \(tm\) [1-5]\d\d|powervr|intel\(r\) (hd|uhd) graphics( [1-6]\d\d)?\b/i.test(name);
  } catch {
    return false;
  }
}

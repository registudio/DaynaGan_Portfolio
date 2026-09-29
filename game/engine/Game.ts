import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { GitHubFeed } from '@/lib/github';
import type { Portfolio, Room } from '../../lib/portfolio.ts';
import { computeSkills, partKey, roomKey } from '../../lib/skills.ts';
import { buildProjectModel, type ProjectModel } from '../models/projects.ts';
import { Audio } from './audio.ts';
import { biomeFor, type Biome } from './biomes.ts';
import { buildCat, buildDayna, buildEnemy, buildNpc, type EnemyType, type Rig } from './characters.ts';
import { Input } from './input.ts';
import { buildLevel, setProjectIds, type LevelMap, type Spawn } from './layout.ts';
import {
  ACHIEVEMENTS,
  allChipsCollected,
  chips,
  contactUnlocked,
  COOLDOWNS,
  GEAR,
  gearUnlocked,
  isCleared,
  MISSION_ORDER,
  objective,
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
  buildProp,
  buildRelay,
  buildRepoRack,
  buildStarMap,
  buildTerminal,
  buildVendor,
  contributionTile,
} from './props.ts';
import { heatLevel } from './heat.ts';
import { loadSave, loadSettings, persist, Store, type Hud, type Panel, type SaveData, type Settings } from './store.ts';
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
  boss: { hp: 40, speed: 1.1, dmg: 2, radius: 1.1, shoot: 2.8, range: 11, color: '#fef08a', aggro: 11 },
};

type Enemy = {
  type: EnemyType;
  spec: EnemySpec;
  rig: Rig;
  pos: THREE.Vector3;
  hp: number;
  cd: number;
  stun: number;
  wander: THREE.Vector3 | null;
  wanderT: number;
  room: number;
  home: THREE.Vector3;
  flash: number;
  carry: { projectId: string; partId: string } | null;
  summonT: number;
  bar?: THREE.Mesh;
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
};

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
  private cat!: { rig: Rig; pos: THREE.Vector3; facing: number; sleeping: boolean; sit: number };
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private inters: Inter[] = [];
  private hearts: { mesh: THREE.Object3D; pos: THREE.Vector3 }[] = [];
  private spinners: THREE.Object3D[] = [];
  private blueprints = new Map<string, ProjectModel>();
  private cooldowns: Record<string, number> = {};
  private scannerT = 0;
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
      banner: null,
      menu: null,
      toasts: [],
      save: this.save,
      settings: this.settings,
      rev: 0,
      touch: opts.touch,
      dead: false,
    });
    this.skillsCache = this.skills();
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  start() {
    const touch = this.store.get().touch;
    const autoLow = touch || (navigator.hardwareConcurrency ?? 8) <= 4 || Math.min(innerWidth, innerHeight) < 600;
    this.quality = this.settings.quality === 'auto' ? (autoLow ? 'low' : 'high') : this.settings.quality;
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.quality === 'high' ? 1.5 : 1));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = this.quality === 'high';
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.4, 0.9);
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
    this.lights = new LightPool(this.scene, this.quality === 'high' ? 8 : 5);

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
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const st = this.store.get();
    const paused = !!(st.panel || st.menu || st.loading);
    const actions = this.input.consume();
    if (actions.has('pause')) this.togglePause();
    if (!paused && this.world) {
      this.time += dt;
      this.save.playMs += dt * 1000;
      this.update(dt, actions);
    } else if (this.world) {
      // Keep idle animations alive behind panels.
      this.player.rig.animate(this.time, 0, dt * 0.3);
    }
    this.lights?.update(this.player?.pos ?? this.camTarget, dt, this.time);
    this.render(dt);
    this.saveT -= dt;
    if (this.saveT <= 0) {
      this.saveT = 5;
      if (this.dirty) this.persistNow();
    }
  };

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
    this.composer.render();
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
    this.store.set({ panel: null, menu: null });
    this.audio.sfx('teleport');
    this.loadScene(id);
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
      setTimeout(() => this.store.set({ loading: null }), first ? 350 : 500);
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
    this.relayObjs.clear();
    this.dish = null;
    this.buddy = null;
    this.blueprints.forEach((m) => m.dispose());
    this.blueprints.clear();
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

  private buildScene(id: string) {
    this.clearScene();
    this.bubbleQueue = [];
    this.bubbleT = 0;
    this.sceneId = id;
    const level = this.portfolio.levels.find((l) => l.id === id);
    this.biome = id === 'hub' ? biomeFor('orbital-station', '#a78bfa') : biomeFor(level?.meta.biome, level?.meta.light);
    const b = this.biome;
    this.map = buildLevel(this.portfolio, id, { peaceful: this.settings.peaceful, github: this.github });
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
      this.addLight(new THREE.Vector3(room.x + room.w / 2, room.h + 3.2, room.z + room.d / 2), b.light, 7, Math.max(room.w, room.d) * 1.1);
    }

    for (const s of this.map.spawns) this.spawn(s, hidden);

    // Player + cat
    const spawnH = this.world.heightAt(this.map.spawn.x, this.map.spawn.z);
    const pos = new THREE.Vector3(this.map.spawn.x, spawnH, this.map.spawn.z);
    const rig = buildDayna();
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
    this.cat = { rig: catRig, pos: catPos, facing: 0, sleeping, sit: 0 };
    this.addCatInteract();
    this.camTarget.copy(pos);

    this.ambient = new Ambient(b.particles, b.light, { x: 0, z: 0, w: this.map.w, d: this.map.d }, this.quality === 'high' ? 260 : 120);
    if (b.particles) this.scene.add(this.ambient.points);
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

  private place(obj: THREE.Object3D, x: number, z: number, rot = 0) {
    const h = this.world!.heightAt(x, z);
    obj.position.set(x, h, z);
    obj.rotation.y = rot;
    this.level.add(obj);
    obj.traverse((o) => {
      if (o.userData.spin || o.userData.hover || o.userData.blink) this.spinners.push(o);
      const l = o.userData.light;
      if (l) {
        const wp = new THREE.Vector3();
        o.getWorldPosition(wp);
        this.addLight(wp.add(new THREE.Vector3(0, l.y, 0)), l.color, l.intensity, l.distance, o === obj ? 0 : 0.2);
      }
    });
    return obj;
  }

  private inter(i: Omit<Inter, 'pos'> & { x: number; z: number }) {
    const h = this.world!.heightAt(i.x, i.z);
    const it: Inter = { ...i, pos: new THREE.Vector3(i.x, h, i.z) };
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
          object: obj,
          accent: b.light,
          done: () => this.save.scanned.includes(key),
          use: () => this.openRoom(room),
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
          object: obj,
          accent,
          done: () => this.save.scanned.includes(key),
          use: () => this.openPart(room, part.id),
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
            const crate = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), glow('#fde047', 2));
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
        const model = buildProjectModel(room.id);
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
        if (s.kind === 'boss' && this.save.bossDefeated) break;
        const type = (s.kind === 'boss' ? 'boss' : s.type) as EnemyType;
        this.addEnemy(type, s.x, s.z, s.room);
        break;
      }
      case 'hub':
        this.spawnHub(s);
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
      case 'catbed':
        this.place(buildCatBed(), s.x, s.z);
        break;
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
    const obj = this.place(buildPartPickup(color), x, z);
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

  private addEnemy(type: EnemyType, x: number, z: number, room: number) {
    const spec = ENEMY[type];
    const rig = buildEnemy(type);
    const pos = new THREE.Vector3(x, this.world!.heightAt(x, z), z);
    rig.root.position.copy(pos);
    this.level.add(rig.root);
    const e: Enemy = { type, spec, rig, pos, hp: spec.hp, cd: 1 + Math.random(), stun: 0, wander: null, wanderT: Math.random() * 2, room, home: pos.clone(), flash: 0, carry: null, summonT: 6 };
    if (type === 'boss') {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.12), glow('#fef08a', 2));
      bar.position.y = 3.2;
      rig.root.add(bar);
      e.bar = bar;
    }
    this.enemies.push(e);
    return e;
  }

  // ── Frame update ────────────────────────────────────────────────────────────

  private update(dt: number, actions: Set<string>) {
    const p = this.player;
    const world = this.world!;
    for (const k in this.cooldowns) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);

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

    // Movement
    const mv = this.input.move();
    const dir = new THREE.Vector3().addScaledVector(SCREEN_RIGHT, mv.x).addScaledVector(SCREEN_UP, mv.y);
    const speed = dir.length() * PLAYER_SPEED;
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
        p.invuln = Math.max(p.invuln, 0.25);
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
      if (r?.title && r.kind !== 'entry' && r.kind !== 'hub') this.store.toast(`▸ ${r.title}`, 'info', 1800);
    }

    // Combat
    if (actions.has('melee') || (this.input.isDown('melee') && !this.cooldowns.melee)) this.melee();
    if (actions.has('zap') || (this.input.isDown('zap') && !this.cooldowns.zap)) this.zap();
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
    this.updateProjectiles(dt);
    this.updateBuddy(dt);
    this.updateWorldBits(dt);

    // Interactions
    const near = this.nearestInter();
    if (near?.auto && p.pos.distanceTo(near.pos) < near.radius) near.use();
    const promptTarget = near && !near.auto ? near : null;
    const prompt = promptTarget ? { verb: promptTarget.verb, label: promptTarget.label } : null;
    const cur = this.store.get().prompt;
    if (cur?.label !== prompt?.label || cur?.verb !== prompt?.verb) this.store.set({ prompt });
    if (actions.has('interact') && promptTarget) promptTarget.use();

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
    for (const o of this.spinners) {
      if (o.userData.spin) o.rotation.y += o.userData.spin * dt;
      if (o.userData.hover) o.position.y = (o.userData.baseY ??= o.position.y) + Math.sin(this.time * 2 + o.id) * 0.08;
      const npc = o.userData.npc as Rig | undefined;
      npc?.animate(this.time, 0, dt);
    }
    // Interactable rings pulse; completed ones dim.
    for (const i of this.inters) {
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
    if (this.dish && this.beamT > 0) this.beamT -= dt;
    if (this.scannerT > 0) this.scannerT -= dt;
  }

  private updateCat(dt: number, playerSpeed: number) {
    const c = this.cat;
    const p = this.player;
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
      const d = i.pos.distanceTo(this.player.pos) - i.radius;
      if (d < 0 && d < bestD && !(i.kind === 'cat' && this.inters.some((o) => o !== i && o.kind !== 'cat' && o.pos.distanceTo(this.player.pos) < o.radius))) {
        best = i;
        bestD = d;
      }
    }
    return best;
  }

  // ── Combat ──────────────────────────────────────────────────────────────────

  private aimDir(range = 9): THREE.Vector3 {
    const p = this.player;
    // Mouse aim
    if (this.input.usingPointer && this.input.pointer) {
      this.ray.setFromCamera(new THREE.Vector2(this.input.pointer.x, this.input.pointer.y), this.camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(p.pos.y + 0.6));
      const hit = new THREE.Vector3();
      if (this.ray.ray.intersectPlane(plane, hit)) {
        const d = hit.sub(p.pos).setY(0);
        if (d.lengthSq() > 0.01) return d.normalize();
      }
    }
    // Auto-aim: nearest enemy roughly ahead.
    const fwd = new THREE.Vector3(Math.sin(p.facing), 0, Math.cos(p.facing));
    let best: THREE.Vector3 | null = null;
    let bestScore = Infinity;
    for (const e of this.enemies) {
      const d = e.pos.clone().sub(p.pos).setY(0);
      const len = d.length();
      if (len > range) continue;
      const cos = d.normalize().dot(fwd);
      if (cos < 0.45) continue;
      const score = len * (2 - cos);
      if (score < bestScore) {
        bestScore = score;
        best = d;
      }
    }
    return best ?? fwd;
  }

  private melee() {
    if (this.cooldowns.melee) return;
    this.cooldowns.melee = COOLDOWNS.melee;
    const p = this.player;
    const dir = this.aimDir(2.5);
    p.facing = Math.atan2(dir.x, dir.z);
    p.swingT = 0.25;
    this.audio.sfx('swing');
    // Slash arc FX
    const arc = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.5, 12, 1, -Math.PI / 3, (Math.PI * 2) / 3),
      new THREE.MeshBasicMaterial({ color: '#e9d5ff', transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }),
    );
    arc.rotation.x = -Math.PI / 2;
    arc.rotation.z = -p.facing + Math.PI / 2;
    arc.position.copy(p.pos).add(new THREE.Vector3(0, 0.6, 0));
    this.level.add(arc);
    const fade = () => {
      (arc.material as THREE.MeshBasicMaterial).opacity -= 0.12;
      if ((arc.material as THREE.MeshBasicMaterial).opacity > 0) requestAnimationFrame(fade);
      else {
        this.level.remove(arc);
        arc.geometry.dispose();
      }
    };
    requestAnimationFrame(fade);
    for (const e of [...this.enemies]) {
      const d = e.pos.clone().sub(p.pos).setY(0);
      if (d.length() < 1.5 + e.spec.radius && d.normalize().dot(dir) > 0.2) this.damageEnemy(e, 2, dir);
    }
    for (const [id, obj] of this.relayObjs)
      if (!this.save.relays.includes(id) && obj.position.distanceTo(p.pos) < 1.8) this.powerRelay(id);
  }

  private zap() {
    if (this.cooldowns.zap) return;
    this.cooldowns.zap = COOLDOWNS.zap;
    const p = this.player;
    const dir = this.aimDir();
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

  private enemyShoot(e: Enemy, dir: THREE.Vector3, speed = 7) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), glow(e.spec.color, 3.5));
    const start = e.pos.clone().add(new THREE.Vector3(0, e.type === 'boss' ? 1.4 : 0.7, 0));
    mesh.position.copy(start);
    this.level.add(mesh);
    this.projectiles.push({ mesh, pos: start, vel: dir.clone().setY(0).normalize().multiplyScalar(speed), from: 'enemy', dmg: e.spec.dmg, life: 2.4 });
  }

  private damageEnemy(e: Enemy, dmg: number, dir?: THREE.Vector3) {
    e.hp -= dmg;
    e.flash = 0.12;
    this.audio.sfx('hit');
    this.bursts.spawn(e.pos.clone().add(new THREE.Vector3(0, 0.6, 0)), e.spec.color, 4, 2);
    if (dir && e.type !== 'boss') this.world!.move(e.pos, dir.x * 0.5, dir.z * 0.5, e.spec.radius);
    if (e.hp <= 0) this.killEnemy(e);
  }

  private killEnemy(e: Enemy) {
    this.enemies = this.enemies.filter((x) => x !== e);
    this.level.remove(e.rig.root);
    this.bursts.spawn(e.pos.clone().add(new THREE.Vector3(0, 0.5, 0)), e.spec.color, e.type === 'boss' ? 60 : 16, e.type === 'boss' ? 6 : 3);
    this.audio.sfx('die');
    this.shake = e.type === 'boss' ? 0.6 : 0.15;
    this.save.kills++;
    this.save.levelKills[this.sceneId] = (this.save.levelKills[this.sceneId] ?? 0) + 1;
    if (this.save.kills >= 25) this.award('bug-squasher');
    if (e.carry) {
      this.spawnPart(e.carry.projectId, e.carry.partId, Math.floor(e.pos.x) + 0.5, Math.floor(e.pos.z) + 0.5);
      this.say('It dropped a part! Grab it.', 2500);
    } else if (Math.random() < 0.22) this.dropHeart(e.pos);
    if (e.type === 'boss') {
      this.save.bossDefeated = true;
      this.award('merge-resolved');
      this.store.toast('MERGE CONFLICT RESOLVED', 'achievement', 4000);
      this.say('Conflict resolved! Both branches live happily now.', 4000);
      this.checkCleared();
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
      g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.1), m), { position: new THREE.Vector3(x, y, 0) }));
    const pos = at.clone();
    g.position.copy(pos).add(new THREE.Vector3(0, 0.5, 0));
    this.level.add(g);
    this.hearts.push({ mesh: g, pos });
  }

  private hurtPlayer(dmg: number, from: THREE.Vector3) {
    const p = this.player;
    if (p.invuln > 0 || p.dead > 0) return;
    p.hp -= dmg;
    p.invuln = 0.7;
    this.shake = 0.3;
    this.audio.sfx('hurt');
    const push = p.pos.clone().sub(from).setY(0).normalize().multiplyScalar(0.6);
    this.world!.move(p.pos, push.x, push.z, 0.3);
    if (p.hp <= 0) {
      p.hp = 0;
      p.dead = 1.3;
      this.store.set({ dead: true });
      this.say('Dayna! …Rebooting suit systems. Meow.', 2500);
    }
    this.store.set({ hp: p.hp });
  }

  private updateEnemies(dt: number) {
    const p = this.player;
    const world = this.world!;
    const playerRoom = world.roomAt(p.pos.x, p.pos.z);
    for (const e of [...this.enemies]) {
      e.cd -= dt;
      e.flash = Math.max(0, e.flash - dt);
      e.rig.root.scale.setScalar(e.flash > 0 ? 1.15 : 1);
      if (e.stun > 0) {
        e.stun -= dt;
        e.rig.animate(this.time, 0, dt * 0.2);
        continue;
      }
      const to = p.pos.clone().sub(e.pos).setY(0);
      const dist = to.length();
      const active = p.dead <= 0 && (dist < e.spec.aggro || (e.room === playerRoom && dist < e.spec.aggro * 1.6));
      let speed = 0;
      if (active) {
        const dir = to.clone().normalize();
        const keep = e.spec.shoot ? (e.type === 'boss' ? 3 : 3.5) : 0;
        if (dist > keep + e.spec.radius) {
          speed = e.spec.speed * (e.type === 'wisp' ? 0.8 + Math.sin(this.time * 5 + e.home.x) * 0.4 : 1);
          const wobble = e.type === 'wisp' ? new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(Math.sin(this.time * 3) * 0.6) : new THREE.Vector3();
          const m = dir.clone().add(wobble).normalize();
          world.move(e.pos, m.x * speed * dt, m.z * speed * dt, e.spec.radius);
        }
        e.rig.root.rotation.y = lerpAngle(e.rig.root.rotation.y, Math.atan2(dir.x, dir.z), 1 - Math.exp(-dt * 8));
        if (e.spec.shoot && e.cd <= 0 && dist < (e.spec.range ?? 6) && world.clearLine(e.pos.x, e.pos.z, p.pos.x, p.pos.z)) {
          e.cd = e.spec.shoot * (0.8 + Math.random() * 0.4);
          if (e.type === 'boss') {
            const n = 10;
            const off = Math.random() * Math.PI;
            for (let i = 0; i < n; i++) {
              const a = off + (i / n) * Math.PI * 2;
              this.enemyShoot(e, new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), 5);
            }
          } else this.enemyShoot(e, dir);
        }
        if (dist < e.spec.radius + 0.45 && e.cd <= 0.6) {
          this.hurtPlayer(e.spec.dmg, e.pos);
          e.cd = 1;
        }
        if (e.type === 'boss') {
          e.summonT -= dt;
          if (e.summonT <= 0 && this.enemies.length < 5) {
            e.summonT = 7;
            for (let i = 0; i < 2; i++) this.addEnemy('packet', e.pos.x + (i ? 1.5 : -1.5), e.pos.z + 1, e.room);
          }
          if (e.bar) e.bar.scale.x = Math.max(0.01, e.hp / e.spec.hp);
        }
      } else {
        e.wanderT -= dt;
        if (e.wanderT <= 0) {
          e.wanderT = 2 + Math.random() * 2;
          e.wander = e.home.clone().add(new THREE.Vector3((Math.random() - 0.5) * 5, 0, (Math.random() - 0.5) * 5));
        }
        if (e.wander) {
          const w = e.wander.clone().sub(e.pos).setY(0);
          if (w.length() > 0.3) {
            speed = e.spec.speed * 0.4;
            w.normalize();
            world.move(e.pos, w.x * speed * dt, w.z * speed * dt, e.spec.radius);
            e.rig.root.rotation.y = lerpAngle(e.rig.root.rotation.y, Math.atan2(w.x, w.z), 1 - Math.exp(-dt * 5));
          }
        }
      }
      e.pos.y = world.heightAt(e.pos.x, e.pos.z);
      e.rig.root.position.copy(e.pos);
      e.rig.animate(this.time, speed, dt);
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
      } else if (this.player.pos.clone().setY(0).distanceTo(pr.pos.clone().setY(0)) < 0.45) {
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
    const m = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1, 32),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.copy(this.player.pos).add(new THREE.Vector3(0, 0.1, 0));
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
    if (!room || this.save.built.includes(id)) return;
    const { check, missingParts } = projectPanel(this.portfolio, room, this.save, this.skillsCache);
    if (!check.ok || missingParts.length) return;
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
      this.addLight(new THREE.Vector3(secret.x + secret.w / 2, 3, secret.z + secret.d / 2), '#fef08a', 6, 12);
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
    this.save.cleared.push(id);
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
      const show = d < 6.5 || (this.scannerT > 0 && d < 14);
      if (!show) {
        if (i.el) i.el.hidden = true;
        continue;
      }
      if (!i.el) {
        i.el = document.createElement('div');
        i.el.className = 'g-label';
        i.el.innerHTML = `<span class="t">${escapeHtml(i.label)}</span>${i.sub ? `<span class="s">${escapeHtml(i.sub)}</span>` : ''}`;
        if (i.accent) i.el.style.setProperty('--accent', i.accent);
        this.overlay.appendChild(i.el);
      }
      const s = this.project(i.pos.clone().add(new THREE.Vector3(0, i.kind === 'assembly' ? 3.4 : i.kind === 'matrix' ? 3.4 : i.kind === 'npc' ? 2 : 2.1, 0)));
      i.el.hidden = !s.visible;
      i.el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -100%)`;
      i.el.style.opacity = String(Math.max(0.25, Math.min(1, (7 - d) / 3)));
      i.el.classList.toggle('done', i.done());
      i.el.classList.toggle('near', i === near);
    }
    if (!this.bubble.hidden) {
      const s = this.project(this.cat.pos.clone().add(new THREE.Vector3(0, 2.4, 0)));
      this.bubble.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -100%)`;
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
    Object.assign(this.save, { scanned: [], built: [], shelved: [], cleared: [], achievements: [], kills: 0, pets: 0, playMs: 0, sent: false, backroom: false, tutorial: false, levelKills: {}, relays: [], bossDefeated: false });
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

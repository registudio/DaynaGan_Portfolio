import type { Pattern } from './textures.ts';

export type Surface = { pattern: Pattern; color: string; accent?: string; glow?: boolean };

export type PropKind =
  | 'crate'
  | 'pipe'
  | 'desk'
  | 'rack'
  | 'arm'
  | 'conveyor'
  | 'coil'
  | 'books'
  | 'lamp'
  | 'plant'
  | 'tree'
  | 'bench'
  | 'trophy-case'
  | 'antenna'
  | 'crystal'
  | 'cable';

export type Particles = 'embers' | 'motes' | 'sparks' | 'stars' | 'pollen' | 'data' | 'snow' | null;

export type Biome = {
  id: string;
  name: string;
  /** Dominant light colour of the biome (from content `light:`). */
  light: string;
  background: string;
  fog: string;
  ambient: string;
  ambientIntensity: number;
  sun: string;
  sunIntensity: number;
  floor: Surface;
  floorAlt: Surface;
  path?: Surface;
  wall: Surface;
  wallTop: Surface;
  cliff: string;
  rail: string;
  props: PropKind[];
  particles: Particles;
  /** Room floor height step (Academy Spires climbs). */
  climb?: number;
};

const B = (b: Omit<Biome, 'light'> & { light?: string }): Biome => ({ light: '#ffffff', ...b });

export const BIOMES: Record<string, Biome> = {
  'orbital-station': B({
    id: 'orbital-station',
    name: 'Orbital Station',
    background: '#05060b',
    fog: '#05060b',
    ambient: '#b8c2d9',
    ambientIntensity: 0.9,
    sun: '#dfe6ff',
    sunIntensity: 1.3,
    floor: { pattern: 'panel', color: '#5b6272' },
    floorAlt: { pattern: 'grate', color: '#4a505e' },
    path: { pattern: 'panel', color: '#6b5a8a' },
    wall: { pattern: 'panel', color: '#8a93a6' },
    wallTop: { pattern: 'metal', color: '#a78bfa', glow: true },
    cliff: '#262a33',
    rail: '#a78bfa',
    props: ['crate', 'pipe', 'desk', 'rack'],
    particles: 'stars',
  }),
  'core-reactor': B({
    id: 'core-reactor',
    name: 'Core Reactor',
    background: '#0d0414',
    fog: '#12051c',
    ambient: '#6b3a86',
    ambientIntensity: 0.55,
    sun: '#e9a8ff',
    sunIntensity: 0.6,
    floor: { pattern: 'hex', color: '#2f2138' },
    floorAlt: { pattern: 'grate', color: '#271b30' },
    path: { pattern: 'circuit', color: '#2a1b33', accent: '#e879f9', glow: true },
    wall: { pattern: 'panel', color: '#3b2a47' },
    wallTop: { pattern: 'metal', color: '#e879f9', glow: true },
    cliff: '#140a1c',
    rail: '#e879f9',
    props: ['coil', 'pipe', 'cable', 'crate'],
    particles: 'sparks',
  }),
  'academy-spires': B({
    id: 'academy-spires',
    name: 'Academy Spires',
    background: '#0a1530',
    fog: '#0e1c3d',
    ambient: '#9ec5ff',
    ambientIntensity: 0.9,
    sun: '#fff4d6',
    sunIntensity: 1.4,
    floor: { pattern: 'tile', color: '#c8d3e6' },
    floorAlt: { pattern: 'tile', color: '#aebcd6' },
    path: { pattern: 'tile', color: '#e2c77a' },
    wall: { pattern: 'stone', color: '#7f8fb0' },
    wallTop: { pattern: 'metal', color: '#60a5fa', glow: true },
    cliff: '#3a4768',
    rail: '#93c5fd',
    props: ['books', 'lamp', 'desk', 'plant'],
    particles: 'motes',
    climb: 1.5,
  }),
  'robot-forge': B({
    id: 'robot-forge',
    name: 'Robot Forge',
    background: '#120602',
    fog: '#1c0a04',
    ambient: '#b86b3a',
    ambientIntensity: 0.5,
    sun: '#ffb070',
    sunIntensity: 0.7,
    floor: { pattern: 'stone', color: '#3d2f2a' },
    floorAlt: { pattern: 'grate', color: '#332724' },
    path: { pattern: 'hazard', color: '#2b2220', accent: '#f59e0b' },
    wall: { pattern: 'panel', color: '#5a3a2e' },
    wallTop: { pattern: 'metal', color: '#f97316', glow: true },
    cliff: '#1a0c07',
    rail: '#f59e0b',
    props: ['arm', 'conveyor', 'crate', 'pipe'],
    particles: 'embers',
  }),
  'circuit-caverns': B({
    id: 'circuit-caverns',
    name: 'Circuit Caverns',
    background: '#020a10',
    fog: '#031018',
    ambient: '#2c6a80',
    ambientIntensity: 0.5,
    sun: '#9be7ff',
    sunIntensity: 0.5,
    floor: { pattern: 'stone', color: '#1e2a33' },
    floorAlt: { pattern: 'circuit', color: '#17222b', accent: '#22d3ee', glow: true },
    path: { pattern: 'circuit', color: '#15202a', accent: '#22d3ee', glow: true },
    wall: { pattern: 'stone', color: '#2a3a46' },
    wallTop: { pattern: 'metal', color: '#22d3ee', glow: true },
    cliff: '#081218',
    rail: '#22d3ee',
    props: ['crystal', 'cable', 'crate', 'rack'],
    particles: 'data',
  }),
  'trophy-hall': B({
    id: 'trophy-hall',
    name: 'Trophy Hall',
    background: '#0f0b04',
    fog: '#171004',
    ambient: '#caa25a',
    ambientIntensity: 0.75,
    sun: '#ffe7a8',
    sunIntensity: 1.0,
    floor: { pattern: 'tile', color: '#3a2f22' },
    floorAlt: { pattern: 'tile', color: '#2f261c' },
    path: { pattern: 'tile', color: '#6b1f2b' },
    wall: { pattern: 'panel', color: '#4a3b2a' },
    wallTop: { pattern: 'metal', color: '#fbbf24', glow: true },
    cliff: '#140e06',
    rail: '#fbbf24',
    props: ['trophy-case', 'lamp', 'plant', 'bench'],
    particles: 'motes',
  }),
  'colony-commons': B({
    id: 'colony-commons',
    name: 'Colony Commons',
    background: '#04120c',
    fog: '#082016',
    ambient: '#9be8c4',
    ambientIntensity: 0.95,
    sun: '#fff7d6',
    sunIntensity: 1.3,
    floor: { pattern: 'grass', color: '#3f7a4a' },
    floorAlt: { pattern: 'grass', color: '#356b40' },
    path: { pattern: 'tile', color: '#b9a98a' },
    wall: { pattern: 'panel', color: '#9fb7ad' },
    wallTop: { pattern: 'metal', color: '#34d399', glow: true },
    cliff: '#2a3a2e',
    rail: '#34d399',
    props: ['tree', 'plant', 'bench', 'lamp'],
    particles: 'pollen',
  }),
  mainframe: B({
    id: 'mainframe',
    name: 'Mainframe',
    background: '#010803',
    fog: '#020d05',
    ambient: '#2f7a45',
    ambientIntensity: 0.45,
    sun: '#b6ffcc',
    sunIntensity: 0.45,
    floor: { pattern: 'grate', color: '#16241a' },
    floorAlt: { pattern: 'panel', color: '#122017' },
    path: { pattern: 'circuit', color: '#0f1c13', accent: '#4ade80', glow: true },
    wall: { pattern: 'server', color: '#1d2b22', accent: '#4ade80' },
    wallTop: { pattern: 'metal', color: '#4ade80', glow: true },
    cliff: '#06100a',
    rail: '#4ade80',
    props: ['rack', 'cable', 'rack', 'desk'],
    particles: 'data',
  }),
  'comms-array': B({
    id: 'comms-array',
    name: 'Comms Array',
    background: '#03020a',
    fog: '#06041a',
    ambient: '#a9a0e8',
    ambientIntensity: 0.8,
    sun: '#e8e4ff',
    sunIntensity: 1.2,
    floor: { pattern: 'panel', color: '#5a5670' },
    floorAlt: { pattern: 'grate', color: '#4a4660' },
    path: { pattern: 'panel', color: '#6d5aa8' },
    wall: { pattern: 'panel', color: '#77738c' },
    wallTop: { pattern: 'metal', color: '#a78bfa', glow: true },
    cliff: '#1b1828',
    rail: '#c4b5fd',
    props: ['antenna', 'pipe', 'crate', 'cable'],
    particles: 'stars',
  }),
  backroom: B({
    id: 'backroom',
    name: 'The Backroom',
    background: '#0c0b05',
    fog: '#14120a',
    ambient: '#d6cf8a',
    ambientIntensity: 0.9,
    sun: '#fff8c8',
    sunIntensity: 0.6,
    floor: { pattern: 'tile', color: '#9c9258' },
    floorAlt: { pattern: 'tile', color: '#8f8650' },
    wall: { pattern: 'noise', color: '#c7bd76' },
    wallTop: { pattern: 'metal', color: '#fef08a', glow: true },
    cliff: '#3a361f',
    rail: '#fef08a',
    props: ['lamp', 'bench'],
    particles: null,
  }),
};

export function biomeFor(id: string | undefined, light?: string): Biome {
  const b = BIOMES[id ?? ''] ?? BIOMES['orbital-station'];
  return { ...b, light: light ?? b.rail };
}

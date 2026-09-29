// Part geometry per project (ported from v1). Keys match part ids in content/portfolio.md.
// Units: model space ~[-1.6, 1.6]. rotation in degrees. explode = offset when exploded.
export type Vec3 = [number, number, number];
export type Shape = 'box' | 'cylinder' | 'sphere' | 'torus' | 'cone' | 'capsule';
export type Material = 'violet' | 'lilac' | 'chrome' | 'graphite' | 'glow';
export type PartGeometry = {
  id: string;
  shape: Shape;
  size: number[];
  position: Vec3;
  rotation?: Vec3;
  explode: Vec3;
  material: Material;
  copies?: { position: Vec3; rotation?: Vec3; explode: Vec3 }[];
};
export const PROJECT_GEOMETRY: Record<string, { accent: string; parts: PartGeometry[] }> = {
  'air-quality-sensor': {
    accent: '#a78bfa',
    parts: [
      {
        id: 'lid',
        shape: 'box',
        size: [1.2, 0.12, 0.9],
        position: [0, 0.42, 0],
        explode: [0, 0.9, 0],
        material: 'lilac',
      },
      {
        id: 'sensor',
        shape: 'box',
        size: [0.42, 0.22, 0.42],
        position: [-0.25, 0.22, 0],
        explode: [-0.35, 0.55, 0],
        material: 'violet',
      },
      {
        id: 'mcu',
        shape: 'box',
        size: [0.32, 0.06, 0.24],
        position: [0.3, 0.12, 0],
        explode: [0.45, 0.35, 0],
        material: 'chrome',
      },
      {
        id: 'pcb',
        shape: 'box',
        size: [1.05, 0.04, 0.78],
        position: [0, 0.06, 0],
        explode: [0, 0.1, 0],
        material: 'glow',
      },
      {
        id: 'base',
        shape: 'box',
        size: [1.2, 0.36, 0.9],
        position: [0, -0.16, 0],
        explode: [0, -0.5, 0],
        material: 'graphite',
      },
    ],
  },
  'dreamer-smaclite': {
    accent: '#c084fc',
    parts: [
      {
        id: 'world-model',
        shape: 'sphere',
        size: [0.42],
        position: [0, 0.2, 0],
        explode: [0, 0.3, 0],
        material: 'glow',
      },
      {
        id: 'encoder',
        shape: 'box',
        size: [0.5, 0.5, 0.12],
        position: [-0.85, 0.2, 0],
        explode: [-0.8, 0, 0],
        material: 'violet',
      },
      {
        id: 'actor',
        shape: 'cone',
        size: [0.24, 0.5],
        position: [0.8, 0.45, 0],
        rotation: [0, 0, -90],
        explode: [0.8, 0.4, 0],
        material: 'lilac',
      },
      {
        id: 'critic',
        shape: 'cylinder',
        size: [0.2, 0.2, 0.36],
        position: [0.8, -0.05, 0],
        explode: [0.8, -0.4, 0],
        material: 'chrome',
      },
      {
        id: 'replay',
        shape: 'torus',
        size: [0.62, 0.03],
        position: [0, 0.2, 0],
        explode: [0, -0.7, 0],
        material: 'chrome',
      },
      {
        id: 'units',
        shape: 'box',
        size: [0.16, 0.16, 0.16],
        position: [-0.3, -0.6, 0.4],
        explode: [-0.3, -0.5, 0.6],
        material: 'lilac',
        copies: [
          {
            position: [0, -0.6, 0.5],
            explode: [0, -0.5, 0.7],
          },
          {
            position: [0.3, -0.6, 0.4],
            explode: [0.3, -0.5, 0.6],
          },
        ],
      },
    ],
  },
  drone: {
    accent: '#e9d5ff',
    parts: [
      {
        id: 'props',
        shape: 'cylinder',
        size: [0.32, 0.32, 0.015],
        position: [0.62, 0.22, 0.62],
        explode: [0.35, 0.7, 0.35],
        material: 'lilac',
        copies: [
          {
            position: [-0.62, 0.22, 0.62],
            explode: [-0.35, 0.7, 0.35],
          },
          {
            position: [0.62, 0.22, -0.62],
            explode: [0.35, 0.7, -0.35],
          },
          {
            position: [-0.62, 0.22, -0.62],
            explode: [-0.35, 0.7, -0.35],
          },
        ],
      },
      {
        id: 'motors',
        shape: 'cylinder',
        size: [0.09, 0.09, 0.14],
        position: [0.62, 0.12, 0.62],
        explode: [0.35, 0.35, 0.35],
        material: 'chrome',
        copies: [
          {
            position: [-0.62, 0.12, 0.62],
            explode: [-0.35, 0.35, 0.35],
          },
          {
            position: [0.62, 0.12, -0.62],
            explode: [0.35, 0.35, -0.35],
          },
          {
            position: [-0.62, 0.12, -0.62],
            explode: [-0.35, 0.35, -0.35],
          },
        ],
      },
      {
        id: 'fc',
        shape: 'box',
        size: [0.36, 0.06, 0.36],
        position: [0, 0.14, 0],
        explode: [0, 0.75, 0],
        material: 'glow',
      },
      {
        id: 'frame',
        shape: 'box',
        size: [1.8, 0.05, 0.12],
        position: [0, 0.05, 0],
        rotation: [0, 45, 0],
        explode: [0, 0, 0],
        material: 'graphite',
        copies: [
          {
            position: [0, 0.05, 0],
            rotation: [0, -45, 0],
            explode: [0, 0, 0],
          },
        ],
      },
      {
        id: 'battery',
        shape: 'box',
        size: [0.5, 0.16, 0.26],
        position: [0, -0.08, 0],
        explode: [0, -0.6, 0],
        material: 'violet',
      },
    ],
  },
  'isaac-nav2': {
    accent: '#9f7aea',
    parts: [
      {
        id: 'planner',
        shape: 'torus',
        size: [0.5, 0.03],
        position: [0, 0.75, 0],
        rotation: [90, 0, 0],
        explode: [0, 1.1, 0],
        material: 'glow',
      },
      {
        id: 'robot',
        shape: 'capsule',
        size: [0.28, 0.4],
        position: [0, 0.2, 0],
        explode: [0, 0.35, 0],
        material: 'violet',
      },
      {
        id: 'people',
        shape: 'capsule',
        size: [0.12, 0.45],
        position: [0.9, 0.15, 0.5],
        explode: [0.7, 0.2, 0.6],
        material: 'lilac',
        copies: [
          {
            position: [-0.8, 0.15, 0.7],
            explode: [-0.6, 0.2, 0.7],
          },
          {
            position: [0.6, 0.15, -0.8],
            explode: [0.5, 0.2, -0.7],
          },
        ],
      },
      {
        id: 'shelves',
        shape: 'box',
        size: [0.3, 1.1, 1.6],
        position: [-1.3, 0.35, -0.2],
        explode: [-0.8, 0, 0],
        material: 'graphite',
        copies: [
          {
            position: [1.3, 0.35, -0.2],
            explode: [0.8, 0, 0],
          },
        ],
      },
      {
        id: 'floor',
        shape: 'box',
        size: [3.2, 0.06, 2.4],
        position: [0, -0.25, 0],
        explode: [0, -0.6, 0],
        material: 'graphite',
      },
    ],
  },
  'robot-claw': {
    accent: '#d6bcfa',
    parts: [
      {
        id: 'fingers',
        shape: 'box',
        size: [0.1, 0.55, 0.16],
        position: [0.18, 1, 0],
        rotation: [0, 0, -12],
        explode: [0.45, 0.6, 0],
        material: 'lilac',
        copies: [
          {
            position: [-0.18, 1, 0],
            rotation: [0, 0, 12],
            explode: [-0.45, 0.6, 0],
          },
        ],
      },
      {
        id: 'wrist',
        shape: 'box',
        size: [0.34, 0.2, 0.22],
        position: [0, 0.68, 0],
        explode: [0, 0.55, 0],
        material: 'violet',
      },
      {
        id: 'arm',
        shape: 'box',
        size: [0.14, 0.8, 0.14],
        position: [0, 0.18, 0],
        explode: [0, 0.2, 0],
        material: 'chrome',
      },
      {
        id: 'joint',
        shape: 'cylinder',
        size: [0.18, 0.18, 0.2],
        position: [0, -0.24, 0],
        rotation: [90, 0, 0],
        explode: [0, -0.1, 0.5],
        material: 'glow',
      },
      {
        id: 'claw-base',
        shape: 'cylinder',
        size: [0.5, 0.55, 0.2],
        position: [0, -0.45, 0],
        explode: [0, -0.6, 0],
        material: 'graphite',
      },
      {
        id: 'remote',
        shape: 'box',
        size: [0.5, 0.1, 0.3],
        position: [0.95, -0.45, 0.35],
        explode: [0.6, -0.2, 0.4],
        material: 'violet',
      },
    ],
  },
  'rosa-ros2': {
    accent: '#b794f6',
    parts: [
      {
        id: 'brain',
        shape: 'sphere',
        size: [0.26],
        position: [0, 0.78, 0],
        explode: [0, 1.25, 0],
        material: 'glow',
      },
      {
        id: 'tools',
        shape: 'torus',
        size: [0.42, 0.035],
        position: [0, 0.78, 0],
        rotation: [90, 0, 0],
        explode: [0, 0.85, 0],
        material: 'chrome',
      },
      {
        id: 'compute',
        shape: 'box',
        size: [1, 0.18, 0.7],
        position: [0, 0.3, 0],
        explode: [0, 0.45, 0],
        material: 'violet',
      },
      {
        id: 'lidar',
        shape: 'cylinder',
        size: [0.13, 0.15, 0.16],
        position: [0.42, 0.48, 0],
        explode: [0.9, 0.7, 0],
        material: 'chrome',
      },
      {
        id: 'chassis',
        shape: 'box',
        size: [1.4, 0.32, 1],
        position: [0, 0, 0],
        explode: [0, -0.55, 0],
        material: 'graphite',
      },
      {
        id: 'wheels',
        shape: 'cylinder',
        size: [0.22, 0.22, 0.12],
        position: [0.48, -0.12, 0.56],
        rotation: [90, 0, 0],
        explode: [0.25, -0.35, 0.55],
        material: 'lilac',
        copies: [
          {
            position: [-0.48, -0.12, 0.56],
            explode: [-0.25, -0.35, 0.55],
          },
          {
            position: [0.48, -0.12, -0.56],
            explode: [0.25, -0.35, -0.55],
          },
          {
            position: [-0.48, -0.12, -0.56],
            explode: [-0.25, -0.35, -0.55],
          },
        ],
      },
    ],
  },
};

export type ModelStyle = 'modular' | 'brick';
export const moduleMap: Record<string, string> = {
  Core: 'about',
  Framework: 'education',
  OTSAW_Sector: 'experience',
  ASTAR_Sector: 'experience',
  DSO_Sector: 'experience',
  Ecovolt_Sector: 'experience',
  ProjectBay: 'projects',
  ControlRoom: 'github',
  Archives: 'blog',
  OuterShell: 'contact',
};
export const scrollState = {
  stage: 0,
  progress: 0,
  reduced: false,
  style: 'modular' as ModelStyle,
  hovered: '',
};
export function assemblyFor(module: number, stage: number) {
  if (module === 1) return 1;
  if (stage < 0.12) return 1;
  if (stage < 0.8) return 1 - (stage - 0.12) / 0.68;
  return Math.min(1, Math.max(0, (stage - module + 0.8) / 0.8));
}

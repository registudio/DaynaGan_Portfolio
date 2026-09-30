import * as THREE from 'three';
import { buildBlueprint, hasBlueprint, type ShowModel } from './blueprint';

export type { ShowModel };

/** CAD export if one was uploaded for the project, otherwise its wireframe blueprint. */
export async function projectModel(id: string, cadUrl: string | undefined, dark: boolean): Promise<ShowModel | null> {
  if (cadUrl) {
    try {
      const { loadCad } = await import('./cad');
      return await loadCad(cadUrl, id, dark);
    } catch (err) {
      console.warn(`CAD model for ${id} failed to load; showing the blueprint.`, err);
    }
  }
  return hasBlueprint(id) ? buildBlueprint(id, dark) : null;
}

export const isDark = () => {
  const t = document.documentElement.dataset.theme;
  return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
};

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * A transparent WebGL canvas that fills `host`: renderer, camera, lights, resize and a
 * render loop that pauses while off-screen or while the tab is hidden.
 */
export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private raf = 0;
  private visible = true;
  private ro: ResizeObserver;
  private io: IntersectionObserver;
  private clock = new THREE.Clock();
  private onTheme = new MutationObserver(() => this.themeChanged?.(isDark()));
  themeChanged?: (dark: boolean) => void;

  constructor(
    private host: HTMLElement,
    private tick: (dt: number, t: number) => void,
    fov = 34,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.prepend(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 200);
    this.scene.add(new THREE.HemisphereLight('#f5f3ff', '#312e81', 2));
    const key = new THREE.DirectionalLight('#ffffff', 2.4);
    key.position.set(3, 6, 4);
    this.scene.add(key);
    const rim = new THREE.PointLight('#a78bfa', 20, 14);
    rim.position.set(-3, 2, -3);
    this.scene.add(rim);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.io = new IntersectionObserver(([e]) => (this.visible = e.isIntersecting));
    this.io.observe(host);
    this.onTheme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    this.resize();
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, this.clock.getDelta());
      if (!this.visible || document.hidden) return;
      this.tick(dt, this.clock.elapsedTime);
      this.renderer.render(this.scene, this.camera);
    };
    this.raf = requestAnimationFrame(loop);
  }

  resize() {
    const w = this.host.clientWidth || 1;
    const h = this.host.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.io.disconnect();
    this.onTheme.disconnect();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

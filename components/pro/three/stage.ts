import * as THREE from 'three';
import { quality } from '@/lib/quality';
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
 * One WebGL renderer for the whole page (hero carousel + project viewer). Its canvas moves
 * into whichever Stage is drawing (only one is on screen at a time), so there is one GL
 * context and shader cache and no per-frame copying between canvases.
 */
let shared: { r: THREE.WebGLRenderer; users: number } | null = null;
function acquire() {
  if (!shared) {
    const r = new THREE.WebGLRenderer({ antialias: quality() !== 'low', alpha: true, powerPreference: 'low-power' });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.domElement.style.display = 'block';
    shared = { r, users: 0 };
  }
  shared.users++;
  return shared.r;
}
function release() {
  if (shared && --shared.users <= 0) {
    shared.r.dispose();
    shared.r.domElement.remove();
    shared = null;
  }
}

/**
 * A transparent 3D view that fills `host`: camera, lights, resize and a render loop that
 * pauses while off-screen or while the tab is hidden.
 */
export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  /** Element for pointer listeners / controls (the host, so they survive canvas moves). */
  readonly canvas: HTMLElement;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private raf = 0;
  private odd = false;
  private visible = true;
  private w = 1;
  private h = 1;
  private ro: ResizeObserver;
  private io: IntersectionObserver;
  private clock = new THREE.Clock();
  private onTheme = new MutationObserver(() => this.themeChanged?.(isDark()));
  themeChanged?: (dark: boolean) => void;
  /** Force one render on the next frame (e.g. after a model swap or a highlight). */
  dirty = true;

  constructor(
    private host: HTMLElement,
    /** Return false when nothing changed this frame to skip the render (on-demand rendering). */
    private tick: (dt: number, t: number) => boolean | void,
    fov = 34,
  ) {
    this.renderer = acquire();
    this.canvas = host;
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
    this.io = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      if (this.visible) this.dirty = true;
    });
    this.io.observe(host);
    this.onTheme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    this.resize();
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, this.clock.getDelta());
      if (!this.visible || document.hidden) return;
      // Low quality: 30 fps is plenty for a turntable and halves the GPU work.
      if (quality() === 'low' && (this.odd = !this.odd)) return;
      const claimed = this.claim();
      if (this.tick(dt, this.clock.elapsedTime) === false && !this.dirty && !claimed) return;
      this.dirty = false;
      this.renderer.render(this.scene, this.camera);
    };
    this.raf = requestAnimationFrame(loop);
  }

  /** Moves the shared canvas into this host (and sizes it) if it's elsewhere. */
  private claim() {
    const el = this.renderer.domElement;
    if (el.parentElement === this.host) return false;
    this.host.prepend(el);
    this.fit();
    return true;
  }

  private fit() {
    const dpr = Math.min(devicePixelRatio, quality() === 'low' ? 1 : 1.5);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(this.w, this.h, false);
  }

  resize() {
    this.w = this.host.clientWidth || 1;
    this.h = this.host.clientHeight || 1;
    this.camera.aspect = this.w / this.h;
    this.camera.updateProjectionMatrix();
    if (this.renderer.domElement.parentElement === this.host) this.fit();
    this.dirty = true;
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.io.disconnect();
    this.onTheme.disconnect();
    if (this.renderer.domElement.parentElement === this.host) this.renderer.domElement.remove();
    release();
  }
}

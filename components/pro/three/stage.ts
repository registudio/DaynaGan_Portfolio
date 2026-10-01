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
 * One WebGL renderer for the whole page (hero carousel + project viewer): each Stage renders
 * its scene with it and copies the frame onto its own canvas. One GL context, one shader
 * cache, and a section's canvas keeps its own pointer listeners.
 */
let shared: { r: THREE.WebGLRenderer; users: number } | null = null;
function acquire() {
  if (!shared) {
    const r = new THREE.WebGLRenderer({ antialias: quality() !== 'low', alpha: true, powerPreference: 'low-power' });
    r.setPixelRatio(1);
    r.outputColorSpace = THREE.SRGBColorSpace;
    shared = { r, users: 0 };
  }
  shared.users++;
  return shared.r;
}
function release() {
  if (shared && --shared.users <= 0) {
    shared.r.dispose();
    shared = null;
  }
}

/**
 * A transparent canvas that fills `host`: camera, lights, resize and a render loop that
 * pauses while off-screen or while the tab is hidden.
 */
export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  /** This stage's own canvas (attach pointer listeners / controls here). */
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private raf = 0;
  private odd = false;
  private visible = true;
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
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    host.prepend(this.canvas);
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
      if (this.tick(dt, this.clock.elapsedTime) === false && !this.dirty) return;
      this.dirty = false;
      this.draw();
    };
    this.raf = requestAnimationFrame(loop);
  }

  private draw() {
    const { width: w, height: h } = this.canvas;
    const size = this.renderer.getSize(new THREE.Vector2());
    if (size.x !== w || size.y !== h) this.renderer.setSize(w, h, false);
    this.renderer.render(this.scene, this.camera);
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.drawImage(this.renderer.domElement, 0, 0);
  }

  resize() {
    const w = this.host.clientWidth || 1;
    const h = this.host.clientHeight || 1;
    // Capped at 1.5 (1 on low quality): sharp enough for wireframes, far cheaper on phones.
    const dpr = Math.min(devicePixelRatio, quality() === 'low' ? 1 : 1.5);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.io.disconnect();
    this.onTheme.disconnect();
    this.canvas.remove();
    release();
  }
}

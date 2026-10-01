'use client';

import { useEffect, useRef, useState } from 'react';

export type ViewerPart = { id: string; title: string; note?: string };

type Api = {
  show: (id: string) => void;
  explode: (on: boolean) => void;
  highlight: (id: string | null) => void;
  spin: (on: boolean) => void;
  drag: (on: boolean) => void;
  /** Re-render once (e.g. hotspots re-shown while the model is still). */
  refresh: () => void;
  zoom: (f: number) => void;
  /** Back to the framed view (100 %). */
  resetZoom: () => void;
};

/**
 * The pinned 3D stage of the Projects showcase. One WebGL canvas for all projects: the model
 * swaps when the active project changes. Drag to rotate, pinch / ⌘-scroll / buttons to zoom,
 * exploded view, hotspot annotations and an idle turntable.
 */
export default function ProjectViewer({
  projectId,
  cad,
  parts,
  active,
  onHover,
  title = '',
  sheet = '',
}: {
  title?: string;
  /** Drawing number, e.g. "01 / 06". */
  sheet?: string;
  projectId: string;
  cad: Record<string, string>;
  parts: ViewerPart[];
  active: string | null;
  onHover: (id: string | null) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const dots = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);
  const [exploded, setExploded] = useState(false);
  const [hotspots, setHotspots] = useState(true);
  const [spin, setSpin] = useState(true);
  const [note, setNote] = useState<string | null>(null);
  const [canExplode, setCanExplode] = useState(true);
  const [ids, setIds] = useState<string[]>([]);
  const [gl, setGl] = useState<boolean | null>(null);
  const [coarse, setCoarse] = useState(false); // touch screen (read after mount: SSR can't know)
  const [drag, setDragOn] = useState(false);
  const [zoomPct, setZoomPct] = useState(100);
  const hover = useRef(onHover);
  hover.current = onHover;
  const initial = useRef(projectId);
  // The highlight asked for while a model is still loading is applied once it arrives.
  const want = useRef<string | null>(active);
  want.current = active;

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    (async () => {
      // Start the 3D once the page has loaded and gone idle, so it never competes with first
      // paint (the case-study page shows the viewer straight away).
      if (document.readyState !== 'complete') await new Promise((r) => addEventListener('load', r, { once: true }));
      await new Promise<void>((r) => {
        const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
        if (idle) idle(() => r(), { timeout: 2000 });
        else setTimeout(r, 600);
      });
      if (disposed) return;
      const THREE = await import('three');
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
      const { Stage, projectModel, isDark, reducedMotion, webglAvailable } = await import('./three/stage');
      const el = host.current;
      if (disposed || !el) return;
      if (!webglAvailable()) return setGl(false);
      setGl(true);
      const reduce = reducedMotion();
      let model: Awaited<ReturnType<typeof projectModel>> = null;
      let explodeT = 0;
      let explodeTo = 0;
      let swap = 1; // scale for the swap animation
      let idle = 0;
      let wantSpin = !reduce;
      let base = 1; // camera distance that frames the model = 100 %
      const reportZoom = () => {
        const pct = Math.round((base / stage.camera.position.distanceTo(controls.target)) * 100);
        setZoomPct((z) => (z === pct ? z : pct));
      };
      const tmp = new THREE.Vector3();
      const holder = new THREE.Group();
      const stage = new Stage(el, (dt) => {
        const prevExplode = explodeT;
        explodeT += (explodeTo - explodeT) * Math.min(1, dt * 5);
        if (Math.abs(explodeTo - explodeT) < 0.0005) explodeT = explodeTo;
        const prevSwap = swap;
        swap += (1 - swap) * Math.min(1, dt * 6);
        if (1 - swap < 0.0005) swap = 1;
        idle += dt;
        controls.autoRotate = wantSpin && idle > 2.5;
        const moved = controls.update();
        // Nothing moving (no drag, spin, explode or swap)? Skip the frame entirely.
        if (!moved && !controls.autoRotate && explodeT === prevExplode && swap === prevSwap && !stage.dirty) return false;
        model?.setExplode(explodeT);
        holder.scale.setScalar(swap);
        // Hotspot dots follow their parts.
        const box = dots.current;
        if (box && model) {
          const w = el.clientWidth;
          const h = el.clientHeight;
          for (const d of box.children as HTMLCollectionOf<HTMLElement>) {
            const p = model.anchor(d.dataset.id!, tmp);
            if (!p) continue;
            p.project(stage.camera);
            d.style.transform = `translate(${((p.x + 1) / 2) * w}px, ${((1 - p.y) / 2) * h}px)`;
            d.style.opacity = p.z < 1 ? '' : '0';
          }
        }
      }, 32);
      stage.scene.add(holder);
      const controls = new OrbitControls(stage.camera, stage.canvas);
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.autoRotateSpeed = 1.4;
      controls.minDistance = 3.2;
      controls.maxDistance = 12;
      stage.camera.position.set(4.6, 3.2, 5.2);
      // Touch screens: the sticky viewer covers much of the screen, so dragging it must scroll the
      // page. Rotation is opt-in there (the "Rotate" tool); on mouse/trackpad it's always on.
      const canvas = stage.canvas;
      const setDrag = (on: boolean) => {
        controls.enabled = on;
        canvas.style.touchAction = on ? 'none' : 'pan-y';
      };
      const touch = matchMedia('(pointer: coarse)').matches;
      setCoarse(touch);
      setDrag(!touch);
      controls.addEventListener('start', () => (idle = 0));
      controls.addEventListener('change', () => {
        if (!controls.autoRotate) idle = 0;
        reportZoom();
      });

      // Page scroll wins over zoom unless the visitor holds ⌘/Ctrl (trackpad pinch sets ctrlKey).
      const wheel = (e: WheelEvent) => {
        if (!e.ctrlKey && !e.metaKey) e.stopPropagation();
        else e.preventDefault();
      };
      el.addEventListener('wheel', wheel, { capture: true, passive: false });

      const ray = new THREE.Raycaster();
      const ptr = new THREE.Vector2();
      let last: string | null = null;
      const move = (e: PointerEvent) => {
        if (!model) return;
        const r = stage.canvas.getBoundingClientRect();
        ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ptr, stage.camera);
        const hit = ray.intersectObject(holder, true).find((h) => h.object.type === 'Mesh');
        const id = hit ? model.partOf(hit.object) : null;
        if (id !== last) {
          last = id;
          model.setHighlight(id);
          stage.dirty = true;
          hover.current(id);
        }
      };
      const leave = () => {
        last = null;
        model?.setHighlight(null);
        hover.current(null);
      };
      stage.canvas.addEventListener('pointermove', move);
      stage.canvas.addEventListener('pointerleave', leave);

      let loading = 0;
      const show = async (id: string) => {
        const ticket = ++loading;
        const next = await projectModel(id, cad[id], isDark());
        if (disposed || ticket !== loading) return next?.dispose();
        if (model) {
          holder.remove(model.group);
          model.dispose();
        }
        model = next;
        swap = 0.2;
        idle = 3;
        if (model) {
          // Centre the model and frame it, keeping the visitor's current viewing angle.
          model.group.position.set(0, 0, 0);
          model.setExplode(1);
          const box = new THREE.Box3().setFromObject(model.group);
          model.setExplode(0);
          box.union(new THREE.Box3().setFromObject(model.group));
          const centre = box.getCenter(new THREE.Vector3());
          const radius = Math.max(0.5, box.getSize(new THREE.Vector3()).length() / 2);
          model.group.position.sub(centre);
          holder.add(model.group);
          model.setExplode(explodeT);
          controls.target.set(0, 0, 0);
          // Fit the bounding sphere (with room for the exploded view) in the narrower FOV.
          const vfov = THREE.MathUtils.degToRad(stage.camera.fov);
          const hfov = 2 * Math.atan(Math.tan(vfov / 2) * stage.camera.aspect);
          const dist = (radius * 1.08) / Math.sin(Math.min(vfov, hfov) / 2);
          const dir = stage.camera.position.clone().normalize();
          stage.camera.position.copy(dir.multiplyScalar(dist));
          base = dist;
          reportZoom();
          controls.minDistance = radius * 1.4;
          controls.maxDistance = dist * 2.5;
          // Compile the highlight materials now, so the first hover doesn't stall on shaders.
          const first = model.partIds[0];
          if (first) {
            model.setHighlight(first);
            stage.renderer.compile(stage.scene, stage.camera);
          }
          model.setHighlight(want.current);
          stage.dirty = true;
        }
        setCanExplode(!!model?.canExplode);
        setIds(model?.partIds ?? []);
      };
      stage.themeChanged = (d) => {
        model?.setTheme(d);
        stage.dirty = true;
      };
      api.current = {
        show,
        explode: (on) => (explodeTo = on ? 1 : 0),
        highlight: (id) => {
          model?.setHighlight(id);
          stage.dirty = true;
        },
        spin: (on) => (wantSpin = on),
        drag: setDrag,
        refresh: () => (stage.dirty = true),
        zoom: (f) => {
          const off = stage.camera.position.clone().sub(controls.target);
          const len = THREE.MathUtils.clamp(off.length() * f, controls.minDistance, controls.maxDistance);
          stage.camera.position.copy(controls.target).addScaledVector(off.normalize(), len);
          idle = 0;
          reportZoom();
        },
        resetZoom: () => {
          const off = stage.camera.position.clone().sub(controls.target);
          stage.camera.position.copy(controls.target).addScaledVector(off.normalize(), base);
          idle = 0;
          reportZoom();
        },
      };
      // Auto-rotate keeps the GPU busy; off by default on low-quality devices.
      const { quality, onQuality } = await import('@/lib/quality');
      const turn = !reduce && quality() !== 'low';
      wantSpin = turn;
      setSpin(turn);
      // Downgraded mid-visit (slow frames measured): stop the idle turntable.
      const offQuality = onQuality((q) => {
        if (q === 'low') {
          wantSpin = false;
          setSpin(false);
        }
      });
      await show(initial.current);
      cleanup = () => {
        offQuality();
        el.removeEventListener('wheel', wheel, { capture: true });
        controls.dispose();
        model?.dispose();
        stage.dispose();
        api.current = null;
      };
    })();
    return () => {
      disposed = true;
      cleanup();
    };
  }, [cad]);

  useEffect(() => {
    api.current?.show(projectId);
    setNote(null);
  }, [projectId]);
  useEffect(() => api.current?.highlight(active), [active]);
  useEffect(() => {
    api.current?.refresh();
  }, [hotspots, ids]);

  const byId = new Map(parts.map((p) => [p.id, p]));
  // Hotspot numbers match the numbered component cards beside the viewer.
  const num = new Map(parts.map((p, i) => [p.id, i + 1]));
  const label = active ? byId.get(active) : null;
  const noted = note ? byId.get(note) : null;
  return (
    <div className="pviewer">
      <div className={`pviewer-canvas${cad[projectId] ? '' : ' blueprint'}`} ref={host}>
        {/* Until the CAD export arrives, the wireframe is presented as a technical drawing. */}
        {!cad[projectId] && (
          <div className="bp-sheet" aria-hidden>
            <i className="bp-corner tl" />
            <i className="bp-corner tr" />
            <i className="bp-corner bl" />
            <i className="bp-corner br" />
            <div className="bp-scale mono">
              <i />
              <span>Scale · NTS</span>
            </div>
            <dl className="bp-title mono">
              <div>
                <dt>Project</dt>
                <dd>{title}</dd>
              </div>
              <div>
                <dt>Dwg</dt>
                <dd>{sheet}</dd>
              </div>
              <div>
                <dt>Drawn</dt>
                <dd>D. Gan</dd>
              </div>
              <div>
                <dt>Rev</dt>
                <dd>A · wireframe</dd>
              </div>
            </dl>
          </div>
        )}
        {gl === false && <p className="muted pviewer-empty">3D view unavailable on this device.</p>}
        {hotspots && (
          <div className="hotspots" ref={dots}>
            {ids.filter((id) => byId.has(id)).map((id) => (
              <button
                key={id}
                data-id={id}
                className={`hotspot${note === id ? ' on' : ''}${active === id ? ' hot' : ''}`}
                aria-label={byId.get(id)!.title}
                onClick={() => setNote(note === id ? null : id)}
                onPointerEnter={() => onHover(id)}
                onPointerLeave={() => onHover(null)}
              >
                {num.get(id)}
              </button>
            ))}
          </div>
        )}
        {(noted || label) && (
          <div className="pviewer-note" role="status">
            <b>{(noted ?? label)!.title}</b>
            {(noted ?? label)!.note && <span>{(noted ?? label)!.note}</span>}
          </div>
        )}
      </div>
      <div className="pviewer-tools" role="toolbar" aria-label="3D view controls">
        <button
          className="tool"
          aria-pressed={exploded}
          disabled={!canExplode}
          onClick={() => {
            setExploded(!exploded);
            api.current?.explode(!exploded);
          }}
        >
          {exploded ? '⊟ Assemble' : '⊞ Explode'}
        </button>
        <button className="tool" aria-pressed={hotspots} onClick={() => setHotspots(!hotspots)}>
          ◉ Hotspots
        </button>
        <button
          className="tool"
          aria-pressed={spin}
          onClick={() => {
            setSpin(!spin);
            api.current?.spin(!spin);
          }}
        >
          ⟳ Auto-rotate
        </button>
        {coarse && (
          <button
            className="tool"
            aria-pressed={drag}
            onClick={() => {
              setDragOn(!drag);
              api.current?.drag(!drag);
            }}
          >
            ✋ Rotate
          </button>
        )}
        <span className="tool-gap" />
        <button className="tool" onClick={() => api.current?.zoom(1.25)} aria-label="Zoom out">
          －
        </button>
        <button className="tool zoom-pct mono" onClick={() => api.current?.resetZoom()} aria-label={`Zoom ${zoomPct}%. Reset to 100%`} title="Reset zoom">
          {zoomPct}%
        </button>
        <button className="tool" onClick={() => api.current?.zoom(0.8)} aria-label="Zoom in">
          ＋
        </button>
      </div>
      <p className="pviewer-hint">{cad[projectId] ? 'CAD model' : 'Wireframe blueprint · CAD model coming soon'} · drag to rotate · pinch or ⌘/Ctrl + scroll to zoom</p>
    </div>
  );
}

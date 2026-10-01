'use client';

import { useEffect, useRef, useState } from 'react';

/** Rotatable voxel model with an explode slider and hover-to-identify parts. */
export default function ModelViewer({
  projectId,
  active = null,
  onHover,
  labels = {},
  dark = false,
  initialExplode = 0.35,
  ghost = [],
  showSlider = true,
}: {
  projectId: string;
  active?: string | null;
  onHover?: (id: string | null) => void;
  labels?: Record<string, string>;
  dark?: boolean;
  initialExplode?: number;
  /** Part ids to render as translucent blueprint ghosts. */
  ghost?: string[];
  showSlider?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ explode: (t: number) => void; highlight: (id: string | null) => void } | null>(null);
  const [explode, setExplode] = useState(initialExplode);
  const [hovered, setHovered] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const ghostKey = ghost.join(',');
  const hoverRef = useRef(onHover);
  hoverRef.current = onHover;

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    (async () => {
      const THREE = await import('three');
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
      const { buildProjectModel, hasModel } = await import('@/game/models/projects');
      const el = host.current;
      if (disposed || !el) return;
      if (!hasModel(projectId)) return setFailed(true);
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        return setFailed(true);
      }
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      el.prepend(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
      camera.position.set(4.2, 3.4, 4.6);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.minDistance = 3;
      controls.maxDistance = 10;
      controls.autoRotate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
      controls.autoRotateSpeed = 1.2;
      scene.add(new THREE.HemisphereLight('#f5f3ff', '#312e81', dark ? 1.4 : 1.8));
      const sun = new THREE.DirectionalLight('#ffffff', 2.2);
      sun.position.set(3, 6, 4);
      sun.castShadow = true;
      scene.add(sun);
      const rim = new THREE.PointLight('#a78bfa', 18, 12);
      rim.position.set(-3, 2, -3);
      scene.add(rim);
      const model = buildProjectModel(projectId);
      model.setExplode(initialExplode);
      for (const id of ghostKey ? ghostKey.split(',') : []) model.setPartState(id, 'ghost');
      scene.add(model.group);
      const box = new THREE.Box3().setFromObject(model.group);
      const center = box.getCenter(new THREE.Vector3());
      controls.target.copy(center);
      const radius = box.getSize(new THREE.Vector3()).length() / 2;
      const dir = new THREE.Vector3(4.2, 3.4, 4.6).normalize();
      camera.position.copy(center).addScaledVector(dir, radius * 3.1);
      controls.minDistance = radius * 1.4;
      controls.maxDistance = radius * 5;

      const ray = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      let last: string | null = null;
      const onMove = (e: PointerEvent) => {
        const r = renderer.domElement.getBoundingClientRect();
        pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(pointer, camera);
        const hit = ray.intersectObject(model.group, true)[0];
        const id = hit ? model.partOf(hit.object) : null;
        if (id !== last) {
          last = id;
          model.setHighlight(id);
          setHovered(id);
          hoverRef.current?.(id);
        }
      };
      const onLeave = () => {
        last = null;
        model.setHighlight(null);
        setHovered(null);
        hoverRef.current?.(null);
      };
      renderer.domElement.addEventListener('pointermove', onMove);
      renderer.domElement.addEventListener('pointerleave', onLeave);

      const resize = () => {
        const w = el.clientWidth;
        const h = el.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      const ro = new ResizeObserver(resize);
      ro.observe(el);
      resize();
      let visibleNow = true;
      const io = new IntersectionObserver(([e]) => (visibleNow = e.isIntersecting));
      io.observe(el);
      let raf = 0;
      const loop = () => {
        raf = requestAnimationFrame(loop);
        if (!visibleNow) return;
        controls.update();
        renderer.render(scene, camera);
      };
      loop();
      api.current = { explode: (t) => model.setExplode(t), highlight: (id) => model.setHighlight(id) };
      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        controls.dispose();
        model.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();
    return () => {
      disposed = true;
      cleanup();
    };
  }, [projectId, dark, initialExplode, ghostKey]);

  useEffect(() => {
    api.current?.highlight(active);
  }, [active]);

  const label = hovered ?? active;
  return (
    <div className="viewer" ref={host}>
      {failed && (
        <p className="muted" style={{ padding: 16 }}>
          3D model unavailable on this device.
        </p>
      )}
      {label && labels[label] && <div className="viewer-tip">{labels[label]}</div>}
      {showSlider && <label className="viewer-controls">
        <span>Assembled</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={explode}
          onChange={(e) => {
            const v = Number(e.target.value);
            setExplode(v);
            api.current?.explode(v);
          }}
          aria-label="Explode model"
        />
        <span>Exploded</span>
      </label>}
    </div>
  );
}

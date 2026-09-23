'use client';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useLoader, useThree, type ThreeEvent } from '@react-three/fiber';
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { asset } from '@/lib/urls';
import {
  beamCount,
  blueprintBlend,
  beamFocus,
  beamOrigins,
  chapterPose,
  combatDestroyed,
  moduleMap,
  sectionIds,
  tourAnchors,
  tourState,
  type Vec3,
} from '@/lib/tour';
import { makeInteriors, disposeInterior } from './room-models';
import type { TourContent } from '@/lib/content';
type Props = {
  onReady: () => void;
  onHover: (id: string) => void;
  onNavigate: (id: string) => void;
  onHangar: (id: number) => void;
  onSelect: (id: number) => void;
  repoNames?: string[];
  eventLines?: string[];
  languages?: string[];
  education: TourContent['education'];
};
const loader = (l: GLTFLoader) => l.setMeshoptDecoder(MeshoptDecoder);
function useAsset(path: string) {
  return useLoader(GLTFLoader, asset(path), loader);
}
function sectionFor(object: T.Object3D) {
  let o: T.Object3D | null = object;
  while (o) {
    if (moduleMap[o.name]) return moduleMap[o.name];
    o = o.parent;
  }
  return '';
}
function Blueprint({
  onReady,
  onHover,
  onNavigate,
}: Pick<Props, 'onReady' | 'onHover' | 'onNavigate'>) {
  const { scene } = useAsset('/models/tour/blueprint.glb');
  const root = useMemo(() => scene.clone(true), [scene]);
  const material = useMemo(
    () => new T.LineBasicMaterial({ color: '#bcd7ff', transparent: true, opacity: 0.75 }),
    [],
  );
  useEffect(() => {
    root.traverse((o) => {
      if (o instanceof T.LineSegments) o.material = material.clone();
    });
    onReady();
    return () => {
      root.traverse((o) => {
        if (o instanceof T.LineSegments) (o.material as T.Material).dispose();
      });
    };
  }, [root]);
  useFrame((_, delta) => {
    root.visible = tourState.stage === 0;
    if (!root.visible) return;
    if (!tourState.hovered && !tourState.reduced && !tourState.paused && tourState.local < 0.02)
      tourState.blueprintRotation += Math.min(delta, 0.05) * 0.075;
    root.rotation.x = tourState.blueprintRotation;
    root.traverse((o) => {
      if (o instanceof T.LineSegments) {
        const m = o.material as T.LineBasicMaterial;
        const hot = sectionFor(o) === tourState.hovered;
        m.color.set(hot ? '#dfbaff' : '#bcd7ff');
        m.opacity =
          (hot ? 1 : tourState.hovered ? 0.26 : 0.66) * (1 - blueprintBlend(tourState.local));
      }
    });
  });
  const identify = (e: ThreeEvent<PointerEvent>) => {
    if (tourState.stage !== 0) return;
    e.stopPropagation();
    onHover(sectionFor(e.object));
  };
  return (
    <primitive
      object={root}
      onPointerOver={identify}
      onPointerOut={() => onHover('')}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (tourState.stage !== 0) return;
        e.stopPropagation();
        const id = sectionFor(e.object);
        if (id) {
          if (matchMedia('(hover: none)').matches) onHover(id);
          else onNavigate(id);
        }
      }}
    />
  );
}
function StationAsset() {
  const mobile = typeof window !== 'undefined' && window.innerWidth < 760;
  const { scene } = useAsset(`/models/tour/${mobile ? 'station-mobile' : 'station'}.glb`);
  const root = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((o) => {
      if (o instanceof T.Mesh) {
        o.material = Array.isArray(o.material)
          ? o.material.map((m) => m.clone())
          : o.material.clone();
      }
    });
    return clone;
  }, [scene]);
  useEffect(
    () => () =>
      root.traverse((o) => {
        if (o instanceof T.Mesh) {
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
        }
      }),
    [root],
  );
  useFrame(() => {
    const { stage, local } = tourState;
    const fade = stage === 0 ? blueprintBlend(local) : 1;
    root.visible =
      ([3, 4, 5, 8].includes(stage) && tourState.hangar < 0) || (stage === 0 && fade > 0);
    root.rotation.x = stage === 0 ? tourState.blueprintRotation : 0;
    if (root.visible)
      root.traverse((o) => {
        if (o instanceof T.Mesh) {
          for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
            m.transparent = fade < 1;
            m.opacity = fade;
            m.depthWrite = fade > 0.95;
          }
        }
      });
  });
  return <primitive object={root} />;
}
function Cockpit() {
  const { scene } = useAsset('/models/tour/cockpit.glb');
  const cockpit = useMemo(() => scene.clone(true), [scene]);
  const { camera } = useThree();
  useFrame(() => {
    const { stage, local, reduced } = tourState;
    cockpit.visible = stage === 5 && local > 0.18 && local < 0.9;
    if (!cockpit.visible) return;
    cockpit.quaternion.copy(camera.quaternion);
    cockpit.position.copy(camera.position);
    cockpit.translateY(-1.04);
    cockpit.translateZ(-0.12);
    if (!reduced) cockpit.rotateZ(Math.sin(local * 22) * 0.065);
  });
  return <primitive object={cockpit} />;
}
function Beam({
  start,
  end,
  color = '#65ff78',
  radius = 0.012,
}: {
  start: Vec3;
  end: Vec3;
  color?: string;
  radius?: number;
}) {
  const a = new T.Vector3(...start),
    b = new T.Vector3(...end),
    mid = a.clone().add(b).multiplyScalar(0.5),
    q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), b.sub(a).normalize());
  return (
    <group position={mid} quaternion={q}>
      <mesh>
        <cylinderGeometry
          args={[radius, radius, new T.Vector3(...start).distanceTo(new T.Vector3(...end)), 6]}
        />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh>
        <cylinderGeometry
          args={[
            radius * 4,
            radius * 4,
            new T.Vector3(...start).distanceTo(new T.Vector3(...end)),
            6,
          ]}
        />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.09}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
function LaserSystem({ onSelect }: Pick<Props, 'onSelect'>) {
  const ref = useRef<T.Group>(null);
  const generators = useRef<T.Group>(null);
  const focus = new T.Vector3(...beamFocus);
  const end = focus
    .clone()
    .add(new T.Vector3(0.35, 0.43, 0.832).multiplyScalar(13))
    .toArray() as Vec3;
  useFrame(() => {
    if (!ref.current || !generators.current) return;
    ref.current.visible = generators.current.visible = tourState.stage === 4;
    const n = tourState.reduced ? 8 : beamCount(tourState.local);
    ref.current.children.forEach((c, i) => (c.visible = i < 8 ? i < n : tourState.local > 0.83));
    generators.current.children.forEach((c, i) =>
      c.scale.setScalar(tourState.selected === i ? 1.3 : 1),
    );
  });
  return (
    <>
      <group ref={ref}>
        {beamOrigins.map((p, i) => (
          <Beam key={i} start={p} end={beamFocus} />
        ))}
        <Beam start={beamFocus} end={end} radius={0.055} />
        <mesh position={beamFocus}>
          <sphereGeometry args={[0.08, 12, 8]} />
          <meshBasicMaterial color="#ddffdc" toneMapped={false} />
        </mesh>
      </group>
      <group ref={generators}>
        {beamOrigins.map((p, i) => (
          <mesh key={i} position={p} onClick={() => onSelect(i)}>
            <sphereGeometry args={[0.075, 12, 8]} />
            <meshStandardMaterial color="#457752" emissive="#52ff72" emissiveIntensity={1.5} />
          </mesh>
        ))}
      </group>
    </>
  );
}
function HangarEntrances({ onHangar }: Pick<Props, 'onHangar'>) {
  const root = useRef<T.Group>(null);
  useFrame(() => {
    if (root.current) root.current.visible = tourState.stage === 3 && tourState.hangar < 0;
  });
  return (
    <group ref={root}>
      {[-1.35, -0.45, 0.45, 1.35].map((x, i) => (
        <group
          key={i}
          position={[x, -0.6, Math.sqrt(9 - x * x) + 0.08]}
          onClick={() => onHangar(i)}
        >
          <mesh>
            <boxGeometry args={[0.72, 0.45, 0.13]} />
            <meshStandardMaterial color="#060913" />
          </mesh>
          <mesh position={[0, 0, 0.073]}>
            <planeGeometry args={[0.65, 0.37]} />
            <meshBasicMaterial
              color="#af88ff"
              transparent
              opacity={0.32}
              side={T.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          {[-0.36, 0.36].map((v, j) => (
            <mesh key={j} position={[v, 0, 0.085]}>
              <boxGeometry args={[0.023, 0.46, 0.02]} />
              <meshBasicMaterial color="#c6a0ff" toneMapped={false} />
            </mesh>
          ))}
          {[-0.23, 0.23].map((v, j) => (
            <mesh key={j} position={[0, v, 0.085]}>
              <boxGeometry args={[0.72, 0.021, 0.02]} />
              <meshBasicMaterial color="#b488ff" toneMapped={false} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
function DefenseRun({ onSelect }: Pick<Props, 'onSelect'>) {
  const { camera } = useThree();
  const group = useRef<T.Group>(null),
    bolts = useRef<T.Group>(null),
    targets = useRef<T.Group>(null),
    debris = useRef<T.Group>(null);
  const time = useRef(0);
  useFrame((_, dt) => {
    if (!group.current || !targets.current || !bolts.current || !debris.current) return;
    group.current.visible = tourState.stage === 5;
    if (!group.current.visible) return;
    const { local, reduced } = tourState;
    if (!tourState.paused) time.current += Math.min(dt, 0.05);
    const destroyed = combatDestroyed(local);
    targets.current.children.forEach((t, i) => {
      t.visible = i >= destroyed;
      t.rotation.z = i < 3 ? Math.sin(time.current * 1.5 + i) * 0.04 : 0;
    });
    bolts.current.visible = !reduced && local > 0.16 && local < 0.82;
    bolts.current.children.forEach((b, i) => {
      const t = (time.current * (i < 12 ? 2.1 : 2.5) + i * 0.173) % 1;
      const incoming = i < 12,
        side = i % 2 ? 1 : -1;
      const source = new T.Vector3(((i % 3) - 1) * 1.2, 0.4, 3.1);
      // Incoming bolts miss the canopy and stop outside the near cockpit volume.
      const miss = new T.Vector3(side * 1.65, 0.45 + (i % 3) * 0.22, -1.1)
        .applyQuaternion(camera.quaternion)
        .add(camera.position);
      const muzzle = new T.Vector3(side * 0.65, -0.2, -1.15)
        .applyQuaternion(camera.quaternion)
        .add(camera.position);
      const destination = new T.Vector3(
        ((destroyed % 3) - 1) * 1.2,
        0.25 + Math.floor(destroyed / 3) * 0.65,
        2.9,
      );
      const start = incoming ? source : muzzle,
        end = incoming ? miss : destination;
      b.visible = !incoming || i % 3 >= Math.min(3, destroyed);
      b.position.lerpVectors(start, end, t);
      b.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), end.clone().sub(start).normalize());
    });
    debris.current.visible = destroyed > 0;
    debris.current.children.forEach((d, i) => {
      const target = i % 6;
      d.visible = target < destroyed;
      const t = Math.min(1, Math.max(0, (local - (0.24 + (target + 1) * 0.095)) * 4));
      d.position.set(
        ((target % 3) - 1) * 1.2 + Math.sin(i * 7) * t,
        0.25 + Math.floor(target / 3) * 0.65 - Math.abs(Math.cos(i)) * t,
        2.85 + Math.cos(i * 3) * t,
      );
      d.scale.setScalar((1 - t) * 0.5);
      d.rotation.set(t * i, t * 4, t * 2);
    });
  });
  return (
    <group ref={group}>
      <group ref={targets}>
        {Array.from({ length: 6 }, (_, i) => (
          <group
            key={i}
            position={[((i % 3) - 1) * 1.2, 0.25 + Math.floor(i / 3) * 0.65, 2.85]}
            onClick={() => onSelect(i)}
          >
            {i < 3 ? (
              <>
                <mesh>
                  <boxGeometry args={[0.35, 0.16, 0.3]} />
                  <meshStandardMaterial color="#747989" metalness={0.7} roughness={0.4} />
                </mesh>
                {[-0.09, 0.09].map((x) => (
                  <mesh key={x} position={[x, 0.08, 0.27]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.025, 0.025, 0.48, 8]} />
                    <meshStandardMaterial color="#818692" />
                  </mesh>
                ))}
              </>
            ) : (
              <>
                <mesh>
                  <cylinderGeometry args={[0.15, 0.23, 0.14, 12]} />
                  <meshStandardMaterial color="#55536c" />
                </mesh>
                <mesh>
                  <sphereGeometry args={[0.32, 16, 12]} />
                  <meshBasicMaterial color="#b99bff" wireframe transparent opacity={0.3} />
                </mesh>
              </>
            )}
          </group>
        ))}
      </group>
      <group ref={bolts}>
        {Array.from({ length: 20 }, (_, i) => (
          <mesh key={i}>
            <boxGeometry args={[0.016, 0.016, i < 12 ? 0.3 : 0.5]} />
            <meshBasicMaterial color={i < 12 ? '#55ff69' : '#ff3b55'} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <group ref={debris}>
        {Array.from({ length: 48 }, (_, i) => (
          <mesh key={i}>
            <boxGeometry args={[0.07, 0.08, 0.09]} />
            <meshStandardMaterial
              color={i % 4 === 0 ? '#ee9166' : '#797b91'}
              emissive={i % 4 === 0 ? '#853122' : '#000000'}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
function ContactEmitters() {
  const ref = useRef<T.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.visible = tourState.stage === 8;
  });
  return (
    <group ref={ref}>
      {[-1.35, -0.45, 0.45, 1.35].map((x, i) => (
        <group position={[x, 2.6, 1.5]} key={i}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.17, 0.18, 16]} />
            <meshStandardMaterial color="#838393" />
          </mesh>
          <mesh position={[0, 0, 1.15]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.48, 2.2, 24, 1, true]} />
            <meshBasicMaterial
              color="#ac7fff"
              transparent
              opacity={0.065}
              side={T.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0, 0, 0.1]}>
            <sphereGeometry args={[0.06, 12, 8]} />
            <meshBasicMaterial color="#c19cff" toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
function World({ repoNames = [], eventLines = [], languages = [], education, ...props }: Props) {
  const { camera, size } = useThree();
  const target = useRef(new T.Vector3(0, 0.25, 0));
  const interior = useMemo(
    () => makeInteriors(repoNames, eventLines, languages, education),
    [repoNames, eventLines, languages, education],
  );
  useEffect(() => () => disposeInterior(interior), [interior]);
  const starGeo = useMemo(() => {
    const positions = new Float32Array(1200 * 3);
    let seed = 42;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 1200; i++) {
      const a = rand() * Math.PI * 2,
        z = rand() * 2 - 1,
        r = 45 + rand() * 70;
      positions.set(
        [Math.cos(a) * Math.sqrt(1 - z * z) * r, z * r, Math.sin(a) * Math.sqrt(1 - z * z) * r],
        i * 3,
      );
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(positions, 3));
    return g;
  }, []);
  const stars = useRef<T.Points>(null);
  useFrame((_, delta) => {
    const { stage, local, reduced, hangar } = tourState;
    const pose = chapterPose(stage, reduced ? 0.4 : local, size.width < 760, hangar);
    const p = new T.Vector3(...pose.position),
      t = new T.Vector3(...pose.target);
    const speed = reduced ? 1 : 1 - Math.exp(-Math.min(delta, 0.05) * 3.8);
    camera.position.lerp(p, speed);
    target.current.lerp(t, speed);
    camera.lookAt(target.current);
    const cam = camera as T.PerspectiveCamera;
    const portrait = size.width < size.height;
    const fov = portrait
      ? T.MathUtils.radToDeg(
          2 *
            Math.atan(
              (Math.tan(T.MathUtils.degToRad(pose.fov / 2)) / (size.width / size.height)) * 0.85,
            ),
        )
      : pose.fov;
    cam.fov = T.MathUtils.lerp(cam.fov, fov, speed);
    if (stage === 0 && !portrait)
      cam.setViewOffset(size.width, size.height, -size.width * 0.075, 0, size.width, size.height);
    else cam.clearViewOffset();
    cam.updateProjectionMatrix();
    interior.children.forEach((room) => {
      room.visible = room.userData.stage === stage && (stage !== 3 || hangar >= 0);
      if (stage === 3 && room.visible)
        room.children
          .filter((c) => c.name.startsWith('fighter-'))
          .forEach((f, i) => {
            f.rotation.y = selectedRotation(i);
          });
    });
    if (stars.current) {
      stars.current.visible = stage > 0 || local > 0.25;
      (stars.current.material as T.PointsMaterial).opacity =
        stage > 0 ? 0.75 : Math.min(0.75, local);
    }
    const anchors = tourAnchors(stage, hangar);
    for (const a of anchors) {
      const el = document.querySelector<HTMLElement>(`[data-hotspot="${a.id}"]`);
      if (!el) continue;
      const v = new T.Vector3(...a.position).project(camera);
      const x = (v.x * 0.5 + 0.5) * size.width,
        y = (-v.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate3d(${x}px,${y}px,0)`;
      el.dataset.visible = String(
        v.z < 1 && v.z > -1 && x > 5 && x < size.width - 30 && y > 80 && y < size.height - 75,
      );
    }
    const selectedAnchor = anchors[tourState.selected % anchors.length];
    const popup = document.querySelector<HTMLElement>('.model-popup');
    if (popup && selectedAnchor) {
      const v = new T.Vector3(...selectedAnchor.position).project(camera);
      const x = (v.x * 0.5 + 0.5) * size.width,
        y = (-v.y * 0.5 + 0.5) * size.height;
      const w = popup.offsetWidth || 310,
        h = popup.offsetHeight || 260;
      const left = T.MathUtils.clamp(x + 35, 18, size.width - w - 55);
      const top = T.MathUtils.clamp(y - h * 0.3, 95, Math.max(95, size.height - h - 90));
      popup.style.setProperty('--popup-x', `${left}px`);
      popup.style.setProperty('--popup-y', `${top}px`);
      document
        .querySelector('.popup-tether path')
        ?.setAttribute(
          'd',
          `M ${x + 13} ${y + 13} L ${left - 12} ${top + 24} L ${left} ${top + 24}`,
        );
    }
  });
  return (
    <>
      <points ref={stars} geometry={starGeo}>
        <pointsMaterial
          color="#c7b8ed"
          size={0.07}
          sizeAttenuation
          transparent
          opacity={0.8}
          depthWrite={false}
        />
      </points>
      <primitive object={interior} />
      <Suspense fallback={null}>
        <Blueprint {...props} />
      </Suspense>
      <Suspense fallback={null}>
        <StationAsset />
      </Suspense>
      <Suspense fallback={null}>
        <Cockpit />
      </Suspense>
      <HangarEntrances {...props} />
      <LaserSystem {...props} />
      <DefenseRun {...props} />
      <ContactEmitters />
    </>
  );
}
function selectedRotation(i: number) {
  return (i === tourState.selected ? 0.25 : 0) + (i % 2 ? 0.3 : -0.2);
}
function ContextEvents() {
  const { gl } = useThree();
  useEffect(() => {
    const lost = () => window.dispatchEvent(new Event('tour-context-lost'));
    gl.domElement.addEventListener('webglcontextlost', lost);
    return () => gl.domElement.removeEventListener('webglcontextlost', lost);
  }, [gl]);
  return null;
}
export default function TourCanvas(props: Props) {
  return (
    <Canvas
      dpr={[1, 1.4]}
      camera={{ position: [6, 3.1, 9], fov: 44, near: 0.015, far: 180 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl, raycaster }) => {
        gl.setClearColor(0, 0);
        raycaster.params.Line = { threshold: 0.075 };
      }}
    >
      <ContextEvents />
      <ambientLight intensity={0.65} />
      <directionalLight position={[4, 8, 9]} intensity={2.3} color="#d5d7ee" />
      <directionalLight position={[-7, 3, -1]} intensity={1.5} color="#ad85ff" />
      <pointLight position={[0, -12, 2]} intensity={8} color="#9d68ff" />
      <Suspense fallback={null}>
        <World {...props} />
      </Suspense>
    </Canvas>
  );
}

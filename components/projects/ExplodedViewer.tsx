'use client';
/**
 * Exploded-view model viewer.
 *
 * Two sources of geometry:
 * 1. Procedural — each part in the project's frontmatter is drawn from a primitive shape.
 * 2. GLB — when the project sets `model`, parts with a `node` name move that node instead.
 *
 * Every part moves from `position` to `position + explode * t`, where t eases towards
 * the `explode` prop. A dashed assembly line shows the path each part travels.
 */
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Part } from '@/lib/content';
import { partGeometry, partInstances, toRadians as deg } from './geometry';

type Vec3 = [number, number, number];
type Anchors = MutableRefObject<Map<string, THREE.Object3D>>;
export type ViewerProps = {
  parts: Part[];
  model?: string | null;
  accent: string;
  explode: number;
  activeId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  labels: MutableRefObject<Map<string, HTMLElement>>;
};

const PRESETS: Record<Part['material'], THREE.MeshPhysicalMaterialParameters> = {
  violet: { color: '#7c4ddb', metalness: 0.35, roughness: 0.32, clearcoat: 0.8 },
  lilac: { color: '#c9b8f5', metalness: 0.15, roughness: 0.4, clearcoat: 0.5 },
  chrome: { color: '#ece8f7', metalness: 1, roughness: 0.12 },
  graphite: { color: '#2b2440', metalness: 0.55, roughness: 0.45 },
  glow: { color: '#b794f6', emissive: '#9f6bff', emissiveIntensity: 0.55, roughness: 0.3 },
};

function Geometry({ part }: { part: Part }) {
  const geometry = useMemo(() => partGeometry(part), [part]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <primitive object={geometry} attach="geometry" />;
}

function AssemblyLine({
  from,
  offset,
  t,
}: {
  from: Vec3;
  offset: Vec3;
  t: MutableRefObject<number>;
}) {
  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...from),
      new THREE.Vector3(from[0] + offset[0], from[1] + offset[1], from[2] + offset[2]),
    ]);
    const material = new THREE.LineDashedMaterial({
      color: '#c4b5fd',
      dashSize: 0.06,
      gapSize: 0.05,
      transparent: true,
      opacity: 0,
    });
    const l = new THREE.Line(geometry, material);
    l.computeLineDistances();
    return l;
  }, [from, offset]);
  useEffect(
    () => () => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    },
    [line],
  );
  useFrame(() => {
    (line.material as THREE.LineDashedMaterial).opacity = Math.min(0.55, t.current * 0.7);
  });
  return <primitive object={line} />;
}

function ProceduralPart({
  part,
  t,
  state,
  accent,
  anchors,
  onHover,
  onSelect,
}: {
  part: Part;
  t: MutableRefObject<number>;
  state: 'active' | 'dim' | 'idle';
  accent: string;
  anchors: Anchors;
  onHover: ViewerProps['onHover'];
  onSelect: ViewerProps['onSelect'];
}) {
  const instances = useMemo(() => partInstances(part), [part]);
  const groups = useRef<(THREE.Group | null)[]>([]);
  const materials = useRef<(THREE.MeshPhysicalMaterial | null)[]>([]);
  const base = PRESETS[part.material];
  const highlight = useMemo(() => new THREE.Color(accent), [accent]);
  const baseEmissive = useMemo(
    () => new THREE.Color((base.emissive as string) ?? '#000000'),
    [base],
  );

  useEffect(() => {
    const anchor = groups.current[0];
    if (anchor) anchors.current.set(part.id, anchor);
    return () => void anchors.current.delete(part.id);
  }, [anchors, part.id]);

  useFrame(() => {
    instances.forEach((inst, i) => {
      const g = groups.current[i];
      if (!g) return;
      const [x, y, z] = inst.position;
      const [ex, ey, ez] = inst.explode ?? [0, 0, 0];
      g.position.set(x + ex * t.current, y + ey * t.current, z + ez * t.current);
    });
    for (const m of materials.current) {
      if (!m) continue;
      const targetOpacity = state === 'dim' ? 0.28 : 1;
      m.opacity += (targetOpacity - m.opacity) * 0.15;
      m.transparent = m.opacity < 0.99;
      m.depthWrite = !m.transparent;
      const glow = state === 'active' ? 0.9 : ((base.emissiveIntensity as number) ?? 0);
      m.emissive.lerp(state === 'active' ? highlight : baseEmissive, 0.2);
      m.emissiveIntensity += (glow - m.emissiveIntensity) * 0.2;
    }
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
    onHover(part.id);
  };
  const out = () => {
    document.body.style.cursor = '';
    onHover(null);
  };

  return (
    <>
      {instances.map((inst, i) => (
        <group key={i}>
          <group ref={(g) => void (groups.current[i] = g)}>
            <mesh
              rotation={deg(inst.rotation)}
              onPointerOver={over}
              onPointerOut={out}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(part.id);
              }}
            >
              <Geometry part={part} />
              <meshPhysicalMaterial
                ref={(m) => void (materials.current[i] = m)}
                {...base}
                envMapIntensity={1.2}
              />
            </mesh>
          </group>
          {inst.explode && inst.explode.some((v) => v !== 0) && (
            <AssemblyLine from={inst.position} offset={inst.explode} t={t} />
          )}
        </group>
      ))}
    </>
  );
}

function GlbModel({
  url,
  parts,
  t,
  activeId,
  accent,
  anchors,
  onHover,
  onSelect,
}: {
  url: string;
  parts: Part[];
  t: MutableRefObject<number>;
  activeId: string | null;
  accent: string;
  anchors: Anchors;
  onHover: ViewerProps['onHover'];
  onSelect: ViewerProps['onSelect'];
}) {
  const [scene, setScene] = useState<THREE.Group | null>(null);
  const nodes = useRef<{ part: Part; object: THREE.Object3D; base: THREE.Vector3 }[]>([]);
  const highlight = useMemo(() => new THREE.Color(accent), [accent]);

  useEffect(() => {
    let cancelled = false;
    new GLTFLoader().load(url, (gltf) => {
      if (cancelled) return;
      const root = gltf.scene;
      // Fit the model into a ~2.6 unit cube, centred on the origin.
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3()).length() || 1;
      const scale = 2.6 / size;
      root.scale.setScalar(scale);
      root.position.copy(box.getCenter(new THREE.Vector3()).multiplyScalar(-scale));
      root.traverse((o) => {
        if (o instanceof THREE.Mesh) o.material = (o.material as THREE.Material).clone();
      });
      nodes.current = parts.flatMap((part) => {
        const object = part.node ? root.getObjectByName(part.node) : undefined;
        if (!object) return [];
        anchors.current.set(part.id, object);
        return [{ part, object, base: object.position.clone() }];
      });
      setScene(root);
    });
    return () => {
      cancelled = true;
    };
  }, [url, parts, anchors]);

  useFrame(() => {
    for (const { part, object, base } of nodes.current) {
      const [ex, ey, ez] = part.explode;
      object.position.set(
        base.x + ex * t.current,
        base.y + ey * t.current,
        base.z + ez * t.current,
      );
      object.traverse((o) => {
        if (!(o instanceof THREE.Mesh) || !('emissive' in o.material)) return;
        const m = o.material as THREE.MeshStandardMaterial;
        m.emissive.lerp(part.id === activeId ? highlight : new THREE.Color(0), 0.2);
      });
    }
  });

  const partFor = (object: THREE.Object3D | null) => {
    for (let o = object; o; o = o.parent) {
      const hit = nodes.current.find((n) => n.object === o);
      if (hit) return hit.part.id;
    }
    return null;
  };

  if (!scene) return null;
  return (
    <primitive
      object={scene}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        const id = partFor(e.object);
        if (!id) return;
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
        onHover(id);
      }}
      onPointerOut={() => {
        document.body.style.cursor = '';
        onHover(null);
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        const id = partFor(e.object);
        if (id) onSelect(id);
      }}
    />
  );
}

function Environment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

function Controls({ paused }: { paused: boolean }) {
  const { camera, gl } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement);
    c.enableDamping = true;
    c.enablePan = false;
    c.target.set(0, 0.35, 0); // exploded parts mostly travel upwards
    c.enableZoom = false; // the page scrolls; don't hijack the wheel
    c.autoRotate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    c.autoRotateSpeed = 0.7;
    c.addEventListener('start', () => (c.autoRotate = false));
    gl.domElement.style.touchAction = 'pan-y';
    controls.current = c;
    return () => c.dispose();
  }, [camera, gl]);
  useFrame(() => {
    const c = controls.current;
    if (!c) return;
    c.autoRotateSpeed = paused ? 0 : 0.7;
    c.update();
  });
  return null;
}

/** Projects each part's anchor to screen space and moves its numbered HTML label there. */
function LabelProjector({ anchors, labels }: { anchors: Anchors; labels: ViewerProps['labels'] }) {
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    for (const [id, el] of labels.current) {
      const anchor = anchors.current.get(id);
      if (!anchor) {
        el.style.opacity = '0';
        continue;
      }
      v.setFromMatrixPosition(anchor.matrixWorld).project(camera);
      const x = ((v.x + 1) / 2) * size.width;
      const y = ((1 - v.y) / 2) * size.height;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      el.style.opacity = v.z < 1 ? '' : '0';
    }
  });
  return null;
}

function Scene(props: ViewerProps) {
  const t = useRef(0);
  const anchors = useRef(new Map<string, THREE.Object3D>());
  useFrame(() => {
    t.current += (props.explode - t.current) * 0.07;
  });
  return (
    <>
      <Environment />
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 4]} intensity={1.4} color="#f3eeff" />
      <pointLight position={[-3, 1, -2]} intensity={12} color="#8b5cf6" />
      <pointLight position={[2, -2, 3]} intensity={6} color="#e879f9" />
      <mesh position={[0, -1.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.35, 1.38, 96]} />
        <meshBasicMaterial color={props.accent} transparent opacity={0.45} />
      </mesh>
      <mesh position={[0, -1.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.35, 96]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.06} />
      </mesh>
      {props.model ? (
        <GlbModel
          url={props.model}
          parts={props.parts}
          t={t}
          activeId={props.activeId}
          accent={props.accent}
          anchors={anchors}
          onHover={props.onHover}
          onSelect={props.onSelect}
        />
      ) : (
        props.parts.map((part) => (
          <ProceduralPart
            key={part.id}
            part={part}
            t={t}
            accent={props.accent}
            anchors={anchors}
            state={!props.activeId ? 'idle' : props.activeId === part.id ? 'active' : 'dim'}
            onHover={props.onHover}
            onSelect={props.onSelect}
          />
        ))
      )}
      <LabelProjector anchors={anchors} labels={props.labels} />
      <Controls paused={!!props.activeId} />
    </>
  );
}

export default function ExplodedViewer(props: ViewerProps) {
  return (
    <Canvas
      className="viewer-canvas"
      dpr={[1, 2]}
      camera={{ position: [4.3, 3, 4.9], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      onPointerMissed={() => props.onHover(null)}
    >
      <Scene {...props} />
    </Canvas>
  );
}

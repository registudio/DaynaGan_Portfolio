'use client';
/**
 * Hero centrepiece: chrome "blueprint" versions of each project model, cycling in turn.
 * Each part is drawn as chrome edge lines over a faint chrome shell, gently breathing
 * apart so it hints at the exploded views further down the page.
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Part } from '@/lib/content';
import { partGeometry, partInstances, toRadians } from '@/components/projects/geometry';

export type HeroModel = { slug: string; title: string; parts: Part[] };

const EDGE = new THREE.LineBasicMaterial({ color: '#efeaff', transparent: true, opacity: 0.9 });
const SHELL = new THREE.MeshPhysicalMaterial({
  color: '#d9d0f5',
  metalness: 1,
  roughness: 0.14,
  transparent: true,
  opacity: 0.22,
  envMapIntensity: 1.6,
  side: THREE.DoubleSide,
  depthWrite: false,
});

function BlueprintPart({ part, t }: { part: Part; t: React.MutableRefObject<number> }) {
  const { geometry, edges } = useMemo(() => {
    const geometry = partGeometry(part);
    return { geometry, edges: new THREE.EdgesGeometry(geometry, 20) };
  }, [part]);
  useEffect(
    () => () => {
      geometry.dispose();
      edges.dispose();
    },
    [geometry, edges],
  );
  const instances = useMemo(() => partInstances(part), [part]);
  const groups = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    instances.forEach((inst, i) => {
      const g = groups.current[i];
      if (!g) return;
      const [x, y, z] = inst.position;
      const [ex, ey, ez] = inst.explode ?? [0, 0, 0];
      g.position.set(x + ex * t.current, y + ey * t.current, z + ez * t.current);
    });
  });
  return (
    <>
      {instances.map((inst, i) => (
        <group key={i} ref={(g) => void (groups.current[i] = g)}>
          <group rotation={toRadians(inst.rotation)}>
            <mesh geometry={geometry} material={SHELL} />
            <lineSegments geometry={edges} material={EDGE} />
          </group>
        </group>
      ))}
    </>
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

function Carousel({ models, index }: { models: HeroModel[]; index: number }) {
  const group = useRef<THREE.Group>(null);
  const t = useRef(0);
  const scale = useRef(0);
  const [shown, setShown] = useState(index);
  const reduced = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const { pointer } = useThree();

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    // Shrink out, swap, grow back in whenever the index changes.
    const target = shown === index ? 1 : 0;
    scale.current += (target - scale.current) * Math.min(1, delta * 6);
    if (scale.current < 0.02 && shown !== index) setShown(index);
    g.scale.setScalar(Math.max(0.001, scale.current));
    if (!reduced) {
      g.rotation.y += delta * 0.35;
      t.current = 0.18 + Math.sin(state.clock.elapsedTime * 0.9) * 0.18;
    }
    g.rotation.x += (pointer.y * 0.15 - g.rotation.x) * 0.05;
  });

  const model = models[shown];
  return (
    <group ref={group}>
      <group key={model.slug}>
        {model.parts.map((part) => (
          <BlueprintPart key={part.id} part={part} t={t} />
        ))}
      </group>
    </group>
  );
}

export default function HeroModels({ models, index }: { models: HeroModel[]; index: number }) {
  return (
    <Canvas
      className="hero-models-canvas"
      dpr={[1, 2]}
      camera={{ position: [3.6, 2.4, 4.2], fov: 36 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ camera }) => camera.lookAt(0, 0.3, 0)}
    >
      <Environment />
      <ambientLight intensity={0.5} />
      <pointLight position={[-3, 2, -2]} intensity={10} color="#8b5cf6" />
      <gridHelper args={[6, 24, '#6d4bc4', '#2a1f47']} position={[0, -1.1, 0]} />
      <Carousel models={models} index={index} />
    </Canvas>
  );
}

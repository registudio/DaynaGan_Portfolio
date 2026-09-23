'use client';
import { Suspense, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { asset } from '@/lib/urls';
import { assemblyFor, moduleMap, scrollState } from '@/lib/scene';

function Station() {
  const gltf = useLoader(GLTFLoader, asset('/models/station/d01.glb'));
  const { camera, invalidate, size, set } = useThree();
  const cameras = useMemo(
    () => ({
      perspective: new THREE.PerspectiveCamera(10, 1, 0.1, 100),
      orthographic: new THREE.OrthographicCamera(-3.6, 3.6, 3.6, -3.6, 0.1, 100),
    }),
    [],
  );
  useEffect(() => {
    cameras.perspective.position.set(18.5, 11.1, 25.9);
    cameras.orthographic.position.set(5, 3, 7);
    cameras.orthographic.lookAt(0, 0, 0);
  }, [cameras]);
  const data = useMemo(() => {
    const model = gltf.scene.clone(true);
    const meshes: {
      mesh: THREE.Mesh;
      material: THREE.MeshStandardMaterial;
      original: THREE.Color;
      edges: THREE.LineSegments;
    }[] = [];
    model.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const material = (obj.material as THREE.MeshStandardMaterial).clone();
        obj.material = material;
        const original = material.color.clone();
        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(obj.geometry, 32),
          new THREE.LineBasicMaterial({ color: 0x8fcbd5, transparent: true, opacity: 0.62 }),
        );
        obj.add(edges);
        meshes.push({ mesh: obj, material, original, edges });
      }
    });
    const modules = model.getObjectByName('D01_Station')!.children;
    return { model, meshes, modules };
  }, [gltf]);
  useEffect(() => {
    const wake = () => invalidate();
    window.addEventListener('station-update', wake);
    return () => {
      window.removeEventListener('station-update', wake);
      data.meshes.forEach(({ material, edges }) => {
        material.dispose();
        edges.geometry.dispose();
        (edges.material as THREE.Material).dispose();
      });
    };
  }, [data, invalidate]);
  useFrame((_, delta) => {
    const { stage, reduced } = scrollState;
    const blueprint = stage < 0.12;
    const mobile = size.width < 600;
    const s = reduced ? Math.round(stage) : stage;
    const blend = Math.min(1, Math.max(0, (s - 0.25) / 0.8));
    const interior = !reduced && !mobile ? Math.max(0, 1 - Math.abs(s - 5) / 1.5) : 0;
    const target = new THREE.Vector3(5 - interior * 2, 3 - interior * 1.6, 7 - interior * 3.5);
    const perspective = cameras.perspective;
    const ortho = cameras.orthographic;
    ortho.left = -3.6 * (size.width / size.height);
    ortho.right = -ortho.left;
    ortho.top = 3.6;
    ortho.bottom = -3.6;
    ortho.updateProjectionMatrix();
    perspective.aspect = size.width / size.height;
    const activeCamera = blueprint ? ortho : perspective;
    if (camera !== activeCamera) set({ camera: activeCamera });
    // Match the orthographic composition at the start, then widen the perspective lens.
    const fov = blueprint ? 10 : 34 - interior * 6;
    const distanceScale = blueprint ? 3.7 : 1;
    target.multiplyScalar(distanceScale);
    const lerp = reduced ? 1 : 1 - Math.exp(-delta * 6);
    perspective.position.lerp(target, lerp);
    perspective.fov = THREE.MathUtils.lerp(perspective.fov, fov, lerp);
    perspective.updateProjectionMatrix();
    perspective.lookAt(0, 0, 0);
    data.model.rotation.y = blueprint ? 0 : Math.sin(s * 0.6) * 0.12;
    for (const module of data.modules) {
      const index = Number(module.userData.section) || 1;
      const assembled = reduced ? 1 : assemblyFor(index, s);
      module.visible = blueprint || assembled > 0.001;
      const offset = module.userData.assemblyOffset as number[];
      if (offset)
        module.position.set(
          offset[0] * (1 - assembled),
          offset[1] * (1 - assembled),
          offset[2] * (1 - assembled),
        );
      module.scale.setScalar(0.85 + 0.15 * assembled);
    }
    for (const { material, original, edges, mesh } of data.meshes) {
      material.color.copy(original);
      material.wireframe = false;
      material.transparent = true;
      material.opacity = blueprint ? 0.035 : Math.max(0.08, blend);
      material.depthWrite = !blueprint;
      const edgeMaterial = edges.material as THREE.LineBasicMaterial;
      edgeMaterial.opacity = blueprint ? 0.45 : 0.1;
      const selected =
        scrollState.hovered && moduleMap[mesh.parent?.name || ''] === scrollState.hovered;
      if (selected) {
        material.color.set(0xedd481);
        edgeMaterial.color.set(0xedd481);
        edgeMaterial.opacity = 0.9;
      } else edgeMaterial.color.set(0x8fcbd5);
      material.roughness = scrollState.style === 'brick' ? 0.75 : 0.42;
    }
    if (perspective.position.distanceTo(target) > 0.002 || Math.abs(perspective.fov - fov) > 0.01)
      invalidate();
  });
  return (
    <primitive
      object={data.model}
      onPointerOver={(event: { stopPropagation: () => void; object: THREE.Object3D }) => {
        if (scrollState.stage > 0.3 && scrollState.stage < 6.8) return;
        event.stopPropagation();
        scrollState.hovered = moduleMap[event.object.parent?.name || ''] || '';
        invalidate();
      }}
      onPointerOut={() => {
        scrollState.hovered = '';
        invalidate();
      }}
      onClick={(event: { object: THREE.Object3D }) => {
        if (scrollState.stage > 0.3 && scrollState.stage < 6.8) return;
        const section = moduleMap[event.object.parent?.name || ''];
        if (section)
          document
            .getElementById(section)
            ?.scrollIntoView({ behavior: scrollState.reduced ? 'instant' : 'smooth' });
      }}
    />
  );
}
export default function StationCanvas() {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.5]}
      camera={{ position: [18.5, 11.1, 25.9], fov: 10, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.domElement.addEventListener(
          'webglcontextlost',
          () => window.dispatchEvent(new Event('station-context-lost')),
          { once: true },
        );
      }}
    >
      <ambientLight intensity={1.1} />
      <directionalLight position={[3, 5, 6]} intensity={3.2} color="#e8f2ed" />
      <directionalLight position={[-4, 0, 2]} intensity={2} color="#83cddf" />
      <pointLight position={[0, 0, 1]} intensity={6} color="#44cede" />
      <Suspense fallback={null}>
        <Station />
      </Suspense>
    </Canvas>
  );
}

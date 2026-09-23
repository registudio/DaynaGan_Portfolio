'use client';
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as T from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { roomOrigins, tourState } from '@/lib/tour';

export function TourLighting() {
  const { gl, scene, size } = useThree();
  const key = useRef<T.SpotLight>(null),
    target = useRef<T.Object3D>(null),
    fill = useRef<T.PointLight>(null),
    rim = useRef<T.PointLight>(null),
    ambient = useRef<T.AmbientLight>(null),
    sun = useRef<T.DirectionalLight>(null),
    bounce = useRef<T.DirectionalLight>(null);
  useEffect(() => {
    const generator = new T.PMREMGenerator(gl),
      room = new RoomEnvironment();
    const reflection = generator.fromScene(room, 0.025);
    scene.environment = reflection.texture;
    room.dispose();
    generator.dispose();
    return () => {
      scene.environment = null;
      reflection.dispose();
    };
  }, [gl, scene]);
  useFrame(() => {
    const { stage, hangar } = tourState;
    const origin = roomOrigins[stage];
    const inside = !!origin && (stage !== 3 || hangar >= 0);
    if (
      !key.current ||
      !target.current ||
      !fill.current ||
      !rim.current ||
      !ambient.current ||
      !sun.current ||
      !bounce.current
    )
      return;
    scene.environmentIntensity = inside ? 0.45 : 0.15;
    ambient.current.intensity = inside ? 0.13 : 0.65;
    sun.current.visible = bounce.current.visible = !inside;
    key.current.visible = fill.current.visible = rim.current.visible = inside;
    if (!inside) return;
    key.current.position.set(origin[0] - 0.8, origin[1] + 2.15, origin[2] + 0.5);
    target.current.position.set(origin[0], origin[1] - 0.5, origin[2] - 1.2);
    key.current.target = target.current;
    fill.current.position.set(origin[0] + 2.2, origin[1] + 0.8, origin[2] + 1.6);
    rim.current.position.set(origin[0] - 1.6, origin[1] + 1.4, origin[2] - 2.6);
  });
  return (
    <>
      <ambientLight ref={ambient} />
      <directionalLight ref={sun} position={[4, 8, 9]} intensity={2.3} color="#d5d7ee" />
      <directionalLight ref={bounce} position={[-7, 3, -1]} intensity={1.5} color="#ad85ff" />
      <object3D ref={target} />
      <spotLight
        ref={key}
        color="#dbe5f4"
        intensity={48}
        distance={17}
        angle={1.1}
        penumbra={0.65}
        decay={2}
        castShadow
        shadow-mapSize-width={size.width < 760 ? 1024 : 2048}
        shadow-mapSize-height={size.width < 760 ? 1024 : 2048}
        shadow-bias={-0.00015}
        shadow-normalBias={0.018}
        shadow-camera-near={0.1}
        shadow-camera-far={18}
      />
      <pointLight ref={fill} color="#b6c9e8" intensity={7} distance={9} decay={2} />
      <pointLight ref={rim} color="#b58aff" intensity={12} distance={8} decay={2} />
    </>
  );
}

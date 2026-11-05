"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { Suspense, useEffect, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { Style, ZoneId } from "@/lib/design/zones";
import { HoodieModel, type ZonePointerHandler } from "./HoodieModel";


export interface ViewRequest {
  azimuth: number;
  nonce: number;
  /** focus point height (sleeves sit a little lower) */
  targetY?: number;
}

function CameraRig({ request, zoom, controls }: { request?: ViewRequest; zoom: number; controls: MutableRefObject<OrbitControlsImpl | null> }) {
  const { camera } = useThree();
  const anim = useRef<{ from: THREE.Spherical; to: THREE.Spherical; fromT: THREE.Vector3; toT: THREE.Vector3; t: number } | null>(null);

  useEffect(() => {
    if (!request || !controls.current) return;
    const c = controls.current;
    const offset = camera.position.clone().sub(c.target);
    const from = new THREE.Spherical().setFromVector3(offset);
    const to = new THREE.Spherical(from.radius, Math.PI / 2 - 0.08, request.azimuth);
    // take the short way round
    let dt = to.theta - from.theta;
    dt = Math.atan2(Math.sin(dt), Math.cos(dt));
    to.theta = from.theta + dt;
    anim.current = { from, to, fromT: c.target.clone(), toT: new THREE.Vector3(0, request.targetY ?? 0, 0), t: 0 };
  }, [request, camera, controls]);

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.zoom = zoom;
    cam.updateProjectionMatrix();
  }, [zoom, camera]);

  useFrame((_, delta) => {
    const a = anim.current;
    const c = controls.current;
    if (!a || !c) return;
    a.t = Math.min(1, a.t + delta / 0.7);
    const k = 1 - Math.pow(1 - a.t, 3);
    const s = new THREE.Spherical(
      a.from.radius + (a.to.radius - a.from.radius) * k,
      a.from.phi + (a.to.phi - a.from.phi) * k,
      a.from.theta + (a.to.theta - a.from.theta) * k,
    );
    c.target.lerpVectors(a.fromT, a.toT, k);
    camera.position.copy(new THREE.Vector3().setFromSpherical(s).add(c.target));
    c.update();
    if (a.t >= 1) anim.current = null;
  });
  return null;
}

export default function HoodieStage({
  style,
  color,
  zoneTextures,
  autoRotate = false,
  interactive = true,
  view,
  zoom = 1,
  onZonePointer,
  controlsRef,
  className,
  onCreated,
  preserveDrawingBuffer = false,
  background = "#0B0B0B",
  shadowsOn = true,
}: {
  style: Style;
  color: string;
  zoneTextures?: Partial<Record<ZoneId, THREE.Texture | null>>;
  autoRotate?: boolean;
  interactive?: boolean;
  view?: ViewRequest;
  zoom?: number;
  onZonePointer?: ZonePointerHandler;
  controlsRef?: MutableRefObject<OrbitControlsImpl | null>;
  className?: string;
  onCreated?: (gl: THREE.WebGLRenderer) => void;
  preserveDrawingBuffer?: boolean;
  background?: string;
  shadowsOn?: boolean;
}) {
  const local = useRef<OrbitControlsImpl | null>(null);
  const controls = controlsRef ?? local;
  return (
    <Canvas
      className={className}
      shadows={shadowsOn}
      dpr={[1, 2]}
      camera={{ position: [0, 0.05, 2.15], fov: 34, near: 0.1, far: 20 }}
      gl={{ antialias: true, preserveDrawingBuffer, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        onCreated?.(gl);
      }}
    >
      <color attach="background" args={[background]} />
      <fog attach="fog" args={[background, 4, 9]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[2.5, 3, 3]} intensity={2.1} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
      <directionalLight position={[-3, 1.5, -2]} intensity={0.9} color="#ffe2cc" />
      <spotLight position={[0, 3.5, -2.5]} intensity={18} angle={0.5} penumbra={1} color="#ffffff" />
      <Suspense fallback={null}>
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={2.2} position={[0, 2, 3]} scale={[4, 2, 1]} />
          <Lightformer form="rect" intensity={1.2} position={[-3, 0.5, 0]} rotation-y={Math.PI / 2} scale={[3, 2, 1]} />
          <Lightformer form="rect" intensity={0.35} color="#FF6B00" position={[3, 0, -1]} rotation-y={-Math.PI / 2} scale={[2, 2, 1]} />
          <Lightformer form="ring" intensity={0.6} position={[0, 3, -3]} scale={2} />
        </Environment>
      </Suspense>
      <HoodieModel style={style} color={color} zoneTextures={zoneTextures} onZonePointer={onZonePointer} />
      <ContactShadows position={[0, -0.43, 0]} opacity={0.55} scale={3} blur={2.6} far={1} resolution={512} frames={autoRotate ? Infinity : 1} />
      <OrbitControls
        ref={controls as never}
        enablePan={false}
        enableZoom={interactive}
        enableRotate={interactive}
        minDistance={0.9}
        maxDistance={3.4}
        minPolarAngle={Math.PI * 0.18}
        maxPolarAngle={Math.PI * 0.62}
        autoRotate={autoRotate}
        autoRotateSpeed={0.9}
        enableDamping
        dampingFactor={0.08}
        target={[0, 0, 0]}
      />
      <CameraRig request={view} zoom={zoom} controls={controls} />
    </Canvas>
  );
}

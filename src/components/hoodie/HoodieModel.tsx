"use client";

import { useMemo, useEffect } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { Style, ZoneId } from "@/lib/design/zones";
import { DIMS, buildSurface, frontPath, pocketPatches, sleeveFn, sleeveFrame, torsoFn, zonePatches, torsoRadii } from "./geometry";
import { fabricTextures, pocketTexture } from "./fabric";

export type ZonePointerPhase = "down" | "move" | "up";
export type ZonePointerHandler = (zone: ZoneId, u: number, v: number, phase: ZonePointerPhase, e: ThreeEvent<PointerEvent>) => void;

const TILE = 1 / 0.05; // knit tiles per metre

function lighten(hex: string, amt: number) {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  return new THREE.Color().setHSL(hsl.h, hsl.s * 0.7, Math.min(1, hsl.l + amt));
}

export function HoodieModel({
  style,
  color,
  zoneTextures,
  onZonePointer,
}: {
  style: Style;
  color: string;
  zoneTextures?: Partial<Record<ZoneId, THREE.Texture | null>>;
  onZonePointer?: ZonePointerHandler;
}) {
  const d = DIMS[style];
  const tex = useMemo(() => fabricTextures(), []);

  const geo = useMemo(() => {
    const torso = buildSurface(torsoFn(d), Math.PI / 2, Math.PI / 2 + Math.PI * 2, 0.06, d.neckY, 160, 70, false, TILE);
    const hem = buildSurface(torsoFn(d, -0.003), Math.PI / 2, Math.PI / 2 + Math.PI * 2, 0, 0.068, 160, 4, false, TILE);
    const sleeves = ([1, -1] as const).map((side) => {
      const P = sleeveFn(d, side);
      const body = buildSurface(P, 0, Math.PI * 2, 0, d.sleeveLen, 56, 40, side === -1, TILE);
      const cuff = buildSurface(sleeveFn(d, side, -0.008), 0, Math.PI * 2, d.sleeveLen - 0.004, d.sleeveLen + 0.075, 56, 4, side === -1, TILE);
      const f = sleeveFrame(d, side);
      const capPos = f.origin.clone().addScaledVector(f.dir, d.sleeveLen + 0.074);
      return { body, cuff, capPos, capDir: f.dir.clone(), capR: d.r1 - 0.01 };
    });
    const zones = zonePatches(style);
    const pockets = pocketPatches(style);
    const [na, nb] = torsoRadii(d, d.neckY);
    const strings =
      style === "ZIP"
        ? []
        : [-0.045, 0.045].map((x) => new THREE.TubeGeometry(frontPath(style, x, d.neckY - 0.03, d.neckY - 0.3, 0.012), 24, 0.0045, 8, false));
    const zipper = style === "ZIP" ? new THREE.TubeGeometry(frontPath(style, 0, d.neckY - 0.005, 0.01, 0.003), 48, 0.006, 6, false) : null;
    return { torso, hem, sleeves, zones, pockets, strings, zipper, neck: { a: na, b: nb } };
  }, [d, style]);

  useEffect(
    () => () => {
      [geo.torso, geo.hem, ...geo.sleeves.flatMap((s) => [s.body, s.cuff]), ...Object.values(geo.zones), ...geo.pockets, ...geo.strings, geo.zipper].forEach((g) => g?.dispose());
    },
    [geo],
  );

  const mats = useMemo(() => {
    const sheen = lighten(color, 0.25);
    const fabric = new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.93,
      metalness: 0,
      sheen: 1,
      sheenRoughness: 0.55,
      sheenColor: sheen,
      normalMap: tex.knit,
      normalScale: new THREE.Vector2(0.3, 0.3),
      side: THREE.DoubleSide,
    });
    const rib = fabric.clone();
    rib.normalMap = tex.rib;
    rib.normalScale = new THREE.Vector2(0.9, 0.9);
    const inner = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.35), roughness: 1, side: THREE.DoubleSide });
    const pocket = fabric.clone();
    pocket.map = pocketTexture(style === "ZIP" ? "side" : "kangaroo");
    const cord = new THREE.MeshStandardMaterial({ color: lighten(color, 0.08), roughness: 0.8 });
    const metal = new THREE.MeshStandardMaterial({ color: "#c9c9c9", metalness: 0.9, roughness: 0.3 });
    return { fabric, rib, inner, pocket, cord, metal };
  }, [color, tex, style]);

  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  const printMats = useMemo(() => {
    const out: Partial<Record<ZoneId, THREE.MeshStandardMaterial>> = {};
    for (const [zone, g] of Object.entries(geo.zones) as [ZoneId, THREE.BufferGeometry][]) {
      g.computeBoundingBox();
      const t = zoneTextures?.[zone];
      if (!t) continue;
      const knit = tex.knit.clone();
      knit.repeat.set(8, 8);
      out[zone] = new THREE.MeshStandardMaterial({
        map: t,
        transparent: true,
        roughness: 0.88,
        normalMap: knit,
        normalScale: new THREE.Vector2(0.3, 0.3),
        polygonOffset: true,
        polygonOffsetFactor: -4,
        depthWrite: false,
      });
    }
    return out;
  }, [geo.zones, zoneTextures, tex]);

  useEffect(() => () => Object.values(printMats).forEach((m) => m?.dispose()), [printMats]);

  const handlers = (zone: ZoneId) =>
    onZonePointer
      ? {
          onPointerDown: (e: ThreeEvent<PointerEvent>) => e.uv && onZonePointer(zone, e.uv.x, 1 - e.uv.y, "down", e),
          onPointerMove: (e: ThreeEvent<PointerEvent>) => e.uv && onZonePointer(zone, e.uv.x, 1 - e.uv.y, "move", e),
          onPointerUp: (e: ThreeEvent<PointerEvent>) => onZonePointer(zone, e.uv?.x ?? -1, 1 - (e.uv?.y ?? 2), "up", e),
        }
      : {};

  const hoodY = d.neckY + 0.005;
  return (
    <group position={[0, -0.42, 0]} dispose={null}>
      <mesh geometry={geo.torso} material={mats.fabric} castShadow receiveShadow />
      <mesh geometry={geo.hem} material={mats.rib} castShadow />
      {geo.sleeves.map((s, i) => (
        <group key={i}>
          <mesh geometry={s.body} material={mats.fabric} castShadow receiveShadow />
          <mesh geometry={s.cuff} material={mats.rib} castShadow />
          <mesh
            position={s.capPos}
            quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), s.capDir)}
            material={mats.inner}
          >
            <circleGeometry args={[s.capR, 32]} />
          </mesh>
        </group>
      ))}
      {/* neck rib + hood */}
      <mesh position={[0, d.neckY - 0.004, 0.004]} rotation={[Math.PI / 2 + 0.12, 0, 0]} scale={[1, geo.neck.b / geo.neck.a, 1]} material={mats.rib} castShadow>
        <torusGeometry args={[geo.neck.a, 0.022, 14, 64]} />
      </mesh>
      <mesh position={[0, d.neckY - 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, geo.neck.b / geo.neck.a, 1]} material={mats.inner}>
        <circleGeometry args={[geo.neck.a, 48]} />
      </mesh>
      {/* hood worn down: rolled rim around the back of the neck + a flat shell draped down the back */}
      <group position={[0, d.neckY - 0.012, -0.012]} rotation={[-Math.PI / 2 - 0.28, 0, 0]} scale={[1, geo.neck.b / geo.neck.a + 0.08, 1]}>
        <mesh rotation={[0, 0, Math.PI / 2 - Math.PI * 0.43]} material={mats.fabric} castShadow>
          <torusGeometry args={[geo.neck.a + 0.03, 0.034, 16, 64, Math.PI * 0.86]} />
        </mesh>
      </group>
      <group position={[0, d.neckY - 0.1, -torsoRadii(d, d.neckY - 0.1)[1] + 0.03]} rotation={[0.38, 0, 0]}>
        <mesh scale={[d.neckR * 2.15, d.neckR * 1.25, d.neckR * 0.42]} material={mats.fabric} castShadow>
          <sphereGeometry args={[1, 48, 32, Math.PI, Math.PI, 0, Math.PI]} />
        </mesh>
      </group>
      {geo.pockets.map((g, i) => (
        <mesh key={i} geometry={g} material={mats.pocket} castShadow receiveShadow />
      ))}
      {geo.strings.map((g, i) => (
        <mesh key={i} geometry={g} material={mats.cord} castShadow />
      ))}
      {geo.strings.length > 0 &&
        [-0.045, 0.045].map((x) => {
          const [, b] = torsoRadii(d, d.neckY - 0.3);
          return (
            <mesh key={x} position={[x, d.neckY - 0.31, b + 0.012]} material={mats.metal}>
              <cylinderGeometry args={[0.0055, 0.0055, 0.03, 10]} />
            </mesh>
          );
        })}
      {geo.zipper && (
        <>
          <mesh geometry={geo.zipper} material={mats.metal} />
          <mesh position={[0, d.neckY - 0.06, torsoRadii(d, d.neckY - 0.06)[1] + 0.012]} rotation={[0.25, 0, 0]} material={mats.metal}>
            <boxGeometry args={[0.012, 0.035, 0.004]} />
          </mesh>
        </>
      )}
      {(Object.keys(geo.zones) as ZoneId[]).map((zone) => {
        const m = printMats[zone];
        if (!m && !onZonePointer) return null;
        return (
          <mesh key={zone} geometry={geo.zones[zone]} material={m} visible={!!m} {...handlers(zone)} renderOrder={2}>
            {!m && <meshBasicMaterial transparent opacity={0} depthWrite={false} />}
          </mesh>
        );
      })}
    </group>
  );
}

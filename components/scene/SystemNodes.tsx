"use client";

import { type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { pointer } from "@/lib/fx";
import { CORE_RADIUS, systemPosition } from "@/lib/layouts";
import { clamp, easeInOutCubic, normalize3, scale3, smoothstep, type Vec3 } from "@/lib/math";
import { ACCENT } from "@/lib/palette";
import { useStore } from "@/lib/store";
import { SYSTEMS, type SystemDef } from "@/lib/systems";
import { Anchor } from "./Anchor";
import { getGlowTexture } from "./glowTexture";
import { buildLineGeometry, PulseLines, useFade, useWireGeometry } from "./primitives";

/** Portrait screens can't fit the full ring width, so the ring is drawn tighter there. */
export const ringScale = (aspect: number) => (aspect >= 1 ? 1 : 0.68 + 0.32 * clamp((aspect - 0.5) / 0.5));

function SystemNode({ def, touch }: { def: SystemDef; touch: boolean }) {
  const home = useMemo(() => systemPosition(def.index), [def.index]);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  const group = useRef<THREE.Group>(null);
  const wire = useRef<THREE.LineSegments>(null);
  const halo = useRef<THREE.Sprite>(null);
  const vis = useRef(0);
  const hover = useRef(0);
  const merge = useRef(0);
  const projected = useRef(new THREE.Vector3());

  const wireGeometry = useWireGeometry("icosa", 0.42);
  const { wireMat, coreMat, haloMat } = useMemo(
    () => ({
      wireMat: new THREE.LineBasicMaterial({
        color: ACCENT.bone,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
      coreMat: new THREE.MeshBasicMaterial({ color: ACCENT.cyan, transparent: true, opacity: 0, depthWrite: false }),
      haloMat: new THREE.SpriteMaterial({
        map: getGlowTexture(),
        color: ACCENT.cyan,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    }),
    [],
  );

  useEffect(
    () => () => {
      wireMat.dispose();
      coreMat.dispose();
      haloMat.dispose();
    },
    [wireMat, coreMat, haloMat],
  );

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const s = useStore.getState();
    const g = group.current;
    if (!g) return;
    const damp = THREE.MathUtils.damp;

    const appeared = s.phase === "main" && performance.now() - s.enteredAt > 280 + def.index * 140;
    const merging = s.finale === "merge" || s.finale === "final";
    merge.current = merging ? Math.min(1, merge.current + dt / 1.1) : 0;

    const show = merging
      ? merge.current < 0.92
      : appeared && s.active === null && (s.finale === "idle" || s.finale === "sync");
    vis.current = damp(vis.current, show ? 1 : 0, merging ? 6 : show ? 3 : 4.5, dt);
    hover.current = damp(hover.current, s.hovered === def.id ? 1 : 0, 8, dt);

    // Position: home, or rushing into the centre during the finale merge.
    const m = easeInOutCubic(merge.current);
    const k = ringScale(size.width / Math.max(1, size.height));
    g.position.set(home[0] * k * (1 - m), home[1] * (1 - m), home[2] * k * (1 - m));

    // Pointer proximity in screen space lifts intensity a little.
    projected.current.copy(g.position).project(camera);
    const aspect = size.width / Math.max(1, size.height);
    const d = Math.hypot((projected.current.x - pointer.x) * aspect, projected.current.y - pointer.y);
    const prox = pointer.inside ? smoothstep(0.5, 0, d) : 0;
    const intensity = 0.35 + prox * 0.35 + hover.current * 0.65;

    const scale = Math.max(0.0001, vis.current) * (1 + hover.current * 0.22);
    g.scale.setScalar(scale);
    g.visible = vis.current > 0.01;

    if (wire.current) {
      const speed = s.reducedMotion ? 0.08 : 0.32 + hover.current * 0.9;
      wire.current.rotation.y += dt * speed;
      wire.current.rotation.x += dt * speed * 0.45;
    }
    wireMat.opacity = vis.current * (0.22 + intensity * 0.55);
    coreMat.opacity = vis.current * (0.55 + intensity * 0.45);
    haloMat.opacity = vis.current * (0.18 + intensity * 0.5);
    if (halo.current) halo.current.scale.setScalar(1.6 + hover.current * 0.8 + prox * 0.3);
  });

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (vis.current < 0.5) return;
    useStore.getState().setHovered(def.id);
  };
  const onOut = () => {
    if (useStore.getState().hovered === def.id) useStore.getState().setHovered(null);
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6 || vis.current < 0.5) return;
    useStore.getState().select(def.id);
  };

  return (
    <group ref={group} position={home}>
      <mesh onPointerOver={onOver} onPointerOut={onOut} onClick={onClick}>
        <sphereGeometry args={[touch ? 1.3 : 0.85, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <lineSegments ref={wire} geometry={wireGeometry} material={wireMat} />
      <mesh material={coreMat}>
        <sphereGeometry args={[0.11, 16, 16]} />
      </mesh>
      <sprite ref={halo} material={haloMat} />
      <Anchor id={`node-${def.id}`} position={[0, -0.95, 0]} />
    </group>
  );
}

export function SystemNodes() {
  const touch = useStore((s) => s.touch);
  const size = useThree((s) => s.size);
  const k = ringScale(size.width / Math.max(1, size.height));

  const fade = useFade(() => {
    const s = useStore.getState();
    return s.phase === "main" && s.active === null && (s.finale === "idle" || s.finale === "sync");
  }, 1.5);

  const links = useMemo(
    () =>
      buildLineGeometry(
        SYSTEMS.map((def) => {
          const p = systemPosition(def.index);
          const inner = scale3(normalize3(p), CORE_RADIUS + 0.1);
          const pts: Vec3[] = [];
          for (let i = 0; i <= 16; i++) {
            const t = i / 16;
            pts.push([p[0] + (inner[0] - p[0]) * t, p[1] + (inner[1] - p[1]) * t, p[2] + (inner[2] - p[2]) * t]);
          }
          return pts;
        }),
      ),
    [],
  );

  return (
    <group>
      <group scale={[k, 1, k]}>
        <PulseLines geometry={links} color={ACCENT.cyan} fade={fade} base={0.06} pulse={0.9} speed={0.32} width={0.07} />
      </group>
      {SYSTEMS.map((def) => (
        <SystemNode key={def.id} def={def} touch={touch} />
      ))}
    </group>
  );
}

"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CORE_RADIUS, NODE_RING_RADIUS, SYSTEM_COUNT, systemAngle } from "@/lib/layouts";
import { TAU } from "@/lib/math";
import { ACCENT } from "@/lib/palette";
import { useStore } from "@/lib/store";

/** Technical overlay for OBSERVE mode: polar rings, system spokes and measurement ticks. */
export function ObserveGrid() {
  const group = useRef<THREE.Group>(null);
  const fade = useRef(0);

  const geometry = useMemo(() => {
    const pts: number[] = [];
    const circle = (r: number, y: number, seg = 160) => {
      for (let i = 0; i < seg; i++) {
        const a = (i / seg) * TAU;
        const b = ((i + 1) / seg) * TAU;
        pts.push(Math.cos(a) * r, y, Math.sin(a) * r, Math.cos(b) * r, y, Math.sin(b) * r);
      }
    };
    [CORE_RADIUS, 3.5, NODE_RING_RADIUS, 9.5].forEach((r) => circle(r, 0));
    for (let i = 0; i < SYSTEM_COUNT; i++) {
      const a = systemAngle(i);
      pts.push(Math.sin(a) * CORE_RADIUS, 0, Math.cos(a) * CORE_RADIUS, Math.sin(a) * 9.5, 0, Math.cos(a) * 9.5);
    }
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * TAU;
      const len = i % 10 === 0 ? 0.45 : 0.18;
      pts.push(Math.cos(a) * 9.5, 0, Math.sin(a) * 9.5, Math.cos(a) * (9.5 + len), 0, Math.sin(a) * (9.5 + len));
    }
    // vertical axis
    pts.push(0, -6, 0, 0, 6, 0);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);

  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: ACCENT.cyan,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((_, dt) => {
    const s = useStore.getState();
    fade.current = THREE.MathUtils.damp(fade.current, s.observe && s.finale === "idle" ? 1 : 0, 3, Math.min(dt, 0.1));
    material.opacity = fade.current * 0.16;
    if (group.current) {
      group.current.visible = fade.current > 0.005;
      group.current.scale.setScalar(0.92 + fade.current * 0.08);
    }
  });

  return (
    <group ref={group}>
      <lineSegments geometry={geometry} material={material} frustumCulled={false} />
    </group>
  );
}

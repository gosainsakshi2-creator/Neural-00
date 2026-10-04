"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { pointer } from "@/lib/fx";
import { CORE_RADIUS, nearestLinks } from "@/lib/layouts";
import { arcPoints, fibPoint, scale3, type Vec3 } from "@/lib/math";
import { ACCENT } from "@/lib/palette";
import { mulberry32 } from "@/lib/random";
import { useStore } from "@/lib/store";
import { buildLineGeometry, PulseLines, useFade } from "./primitives";

/** The synaptic web wrapped around the core: short neighbour links plus long arcs across the shell. */
export function NeuralLinks() {
  const activity = useRef(0);
  const timeScale = useRef(1);

  const fade = useFade(() => {
    const s = useStore.getState();
    if (s.phase === "intro") return s.introStage !== "dormant";
    if (s.finale === "silence" || s.finale === "awakened" || s.finale === "merge") return false;
    return s.active === null;
  }, 1.4);

  const { local, arcs } = useMemo(() => {
    const n = 110;
    const nodes: Vec3[] = Array.from({ length: n }, (_, i) => scale3(fibPoint(i, n), CORE_RADIUS));
    const near = nearestLinks(nodes, 3).map(([a, b]) => [nodes[a], nodes[b]]);
    const r = mulberry32(5);
    const long: Vec3[][] = [];
    for (let i = 0; i < 26; i++) {
      const a = nodes[Math.floor(r() * n)];
      const b = nodes[Math.floor(r() * n)];
      if (a !== b) long.push(arcPoints(a, b, 0.9 + r() * 0.9, 28));
    }
    return { local: buildLineGeometry(near), arcs: buildLineGeometry(long) };
  }, []);

  useFrame((_, dt) => {
    const s = useStore.getState();
    activity.current = THREE.MathUtils.damp(activity.current, Math.min(1, pointer.speed * 1.4), 3, dt);
    timeScale.current = s.reducedMotion ? 0.3 : 1 + activity.current * 1.5;
  });

  return (
    <group>
      <PulseLines
        geometry={local}
        color={ACCENT.cyan}
        fade={fade}
        base={0.05}
        pulse={0.5}
        speed={0.18}
        width={0.12}
        activity={activity}
        timeScale={timeScale}
      />
      <PulseLines
        geometry={arcs}
        color={ACCENT.violet}
        fade={fade}
        base={0.035}
        pulse={0.75}
        speed={0.12}
        width={0.05}
        activity={activity}
        timeScale={timeScale}
      />
    </group>
  );
}

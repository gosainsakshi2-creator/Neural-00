"use client";

import { useMemo, useRef } from "react";
import type * as THREE from "three";
import { MEMORY_CLUSTERS, MEMORY_LINKS, systemAngle } from "@/lib/layouts";
import { arcPoints } from "@/lib/math";
import { ACCENT } from "@/lib/palette";
import { useStore } from "@/lib/store";
import { SYSTEM_BY_ID } from "@/lib/systems";
import { Anchor } from "../Anchor";
import { buildLineGeometry, type GlowBuffers, GlowPoints, PulseLines, useFade } from "../primitives";

const FACING = systemAngle(SYSTEM_BY_ID.memory.index);

export function MemoryOverlay() {
  const fade = useFade(() => useStore.getState().active === "memory", 1.3);
  const flash = useRef(new Float32Array(MEMORY_CLUSTERS.length));
  const nextFlash = useRef(1.2);
  const recallCount = useRef(0);
  const recallAnchor = useRef<THREE.Group>(null);

  const links = useMemo(
    () =>
      buildLineGeometry(
        MEMORY_LINKS.map(([a, b], i) =>
          arcPoints(MEMORY_CLUSTERS[a].center, MEMORY_CLUSTERS[b].center, (i % 3) * 0.25 - 0.2, 18),
        ),
      ),
    [],
  );

  const update = ({ positions, sizes, alphas }: GlowBuffers, time: number, dt: number) => {
    if (time > nextFlash.current) {
      const cluster = Math.floor(Math.random() * (MEMORY_CLUSTERS.length - 1));
      flash.current[cluster] = 1;
      nextFlash.current = time + 1.6 + Math.random() * 0.9;
      const c = MEMORY_CLUSTERS[cluster].center;
      recallAnchor.current?.position.set(c[0], c[1] + 0.75, c[2]);
      recallCount.current++;
      useStore.getState().setMemoryRecall({
        id: recallCount.current,
        address: `0x${Math.floor(Math.random() * 0xffff).toString(16).padStart(4, "0").toUpperCase()}`,
        score: (0.82 + Math.random() * 0.17).toFixed(2),
      });
    }
    MEMORY_CLUSTERS.forEach((c, i) => {
      flash.current[i] = Math.max(0, flash.current[i] - dt * 0.9);
      positions.set(c.center, i * 3);
      sizes[i] = 3.2 + c.spread * 6 + flash.current[i] * 9;
      alphas[i] = 0.35 + flash.current[i] * 0.9;
    });
  };

  return (
    <group rotation-y={FACING}>
      <PulseLines geometry={links} color={ACCENT.violet} fade={fade} base={0.05} pulse={0.9} speed={0.42} width={0.06} />
      <GlowPoints count={MEMORY_CLUSTERS.length} color={ACCENT.cyan} fade={fade} update={update} />
      <Anchor id="memory-recall" ref={recallAnchor} />
    </group>
  );
}

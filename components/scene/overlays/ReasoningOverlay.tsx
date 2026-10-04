"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { REASONING_EDGES, REASONING_LAYERS, REASONING_NODES, systemAngle } from "@/lib/layouts";
import { lerp3 } from "@/lib/math";
import { ACCENT } from "@/lib/palette";
import { useStore } from "@/lib/store";
import { SYSTEM_BY_ID } from "@/lib/systems";
import { Anchor } from "../Anchor";
import { buildLineGeometry, type GlowBuffers, GlowPoints, PulseLines, useFade } from "../primitives";

const FACING = systemAngle(SYSTEM_BY_ID.reasoning.index);
const STEP = 1.25; // seconds per layer
const LAST = REASONING_LAYERS.length - 1;
const HOLD = 2.2;
const CYCLE = STEP * LAST + HOLD;
const PACKETS_PER_EDGE = 3;

export function ReasoningOverlay() {
  const fade = useFade(() => useStore.getState().active === "reasoning", 1.2);
  const front = useRef(0);
  const clock = useRef(0);

  const edges = useMemo(
    () =>
      buildLineGeometry(
        REASONING_EDGES.map(([a, b]) => [REASONING_NODES[a].pos, lerp3(REASONING_NODES[a].pos, REASONING_NODES[b].pos, 0.5), REASONING_NODES[b].pos]),
        REASONING_EDGES.map(([a]) => REASONING_NODES[a].layer),
      ),
    [],
  );

  useFrame((_, rawDt) => {
    const f = fade.current ?? 0;
    const s = useStore.getState();
    if (f <= 0.003 || s.active !== "reasoning") {
      clock.current = 0;
      return;
    }
    clock.current += Math.min(rawDt, 0.1) * (s.reducedMotion ? 0.5 : 1);
    const t = clock.current % CYCLE;
    front.current = Math.min(LAST, t / STEP);
    s.setFlowStep(Math.min(LAST, Math.floor(front.current + 0.0001)));
  });

  const updateNodes = ({ positions, sizes, alphas }: GlowBuffers) => {
    REASONING_NODES.forEach((n, i) => {
      positions.set(n.pos, i * 3);
      const local = front.current - n.layer;
      const firing = local >= 0 && local < 1 ? 1 - local * 0.6 : 0;
      const done = local >= 1 || (n.layer === LAST && front.current >= LAST);
      sizes[i] = 4 + firing * 10 + (done ? 2 : 0) + (n.layer === 0 || n.layer === LAST ? 3 : 0);
      alphas[i] = 0.25 + firing * 0.9 + (done ? 0.3 : 0);
    });
  };

  const updatePackets = ({ positions, sizes, alphas }: GlowBuffers) => {
    REASONING_EDGES.forEach(([a, b], e) => {
      const layer = REASONING_NODES[a].layer;
      const base = front.current - layer;
      for (let k = 0; k < PACKETS_PER_EDGE; k++) {
        const i = e * PACKETS_PER_EDGE + k;
        const t = base - k * 0.14;
        const on = t > 0 && t < 1;
        const p = lerp3(REASONING_NODES[a].pos, REASONING_NODES[b].pos, Math.min(1, Math.max(0, t)));
        positions.set(p, i * 3);
        sizes[i] = on ? 3.4 - k * 0.8 : 0;
        alphas[i] = on ? 1 - k * 0.28 : 0;
      }
    });
  };

  return (
    <group rotation-y={FACING}>
      <PulseLines geometry={edges} color={ACCENT.blue} fade={fade} base={0.07} pulse={1} front={front} />
      <GlowPoints count={REASONING_NODES.length} color={ACCENT.violet} fade={fade} update={updateNodes} />
      <GlowPoints count={REASONING_EDGES.length * PACKETS_PER_EDGE} color={ACCENT.cyan} fade={fade} update={updatePackets} />
      {REASONING_LAYERS.map((layer, i) => (
        <Anchor key={layer.label} id={`reasoning-${i}`} position={[Math.max(layer.radius, 0.6) + 1.7, layer.y, 0]} />
      ))}
    </group>
  );
}

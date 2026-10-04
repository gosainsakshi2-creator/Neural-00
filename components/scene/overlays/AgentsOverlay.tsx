"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { AGENT_ARCS, AGENT_HUB, agentPoint, AGENTS, systemAngle } from "@/lib/layouts";
import { arcControl, quadBezier } from "@/lib/math";
import { ACCENT } from "@/lib/palette";
import { useStore } from "@/lib/store";
import { SYSTEM_BY_ID } from "@/lib/systems";
import { Anchor } from "../Anchor";
import { buildLineGeometry, type GlowBuffers, GlowPoints, PulseLines, useFade, useWireGeometry } from "../primitives";

const FACING = systemAngle(SYSTEM_BY_ID.agents.index);
const PACKETS_PER_ARC = 4;

const CONTROLS = AGENT_ARCS.map((arc) => arcControl(agentPoint(arc.from), agentPoint(arc.to), arc.lift));

function AgentBody({ index }: { index: number }) {
  const wire = useRef<THREE.LineSegments>(null);
  const geometry = useWireGeometry("octa", 0.5);
  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: ACCENT.bone,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  const fade = useFade(() => useStore.getState().active === "agents", 1.4);
  const boost = useRef(0);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const s = useStore.getState();
    boost.current = THREE.MathUtils.damp(boost.current, s.agentFocus === AGENTS[index].id ? 1 : 0, 5, dt);
    const f = fade.current ?? 0;
    material.opacity = f * (0.18 + boost.current * 0.6);
    if (wire.current) {
      wire.current.visible = f > 0.003;
      const speed = s.reducedMotion ? 0.1 : 0.4 + boost.current * 1.6;
      wire.current.rotation.y += dt * speed;
      wire.current.rotation.z += dt * speed * 0.3;
      wire.current.scale.setScalar(1 + boost.current * 0.35);
    }
  });

  return <lineSegments ref={wire} position={AGENTS[index].pos} geometry={geometry} material={material} />;
}

export function AgentsOverlay() {
  const fade = useFade(() => useStore.getState().active === "agents", 1.3);
  const focusBoost = useRef<number[]>(AGENT_ARCS.map(() => 0));

  const arcs = useMemo(
    () =>
      buildLineGeometry(
        AGENT_ARCS.map((arc, i) => {
          const a = agentPoint(arc.from);
          const b = agentPoint(arc.to);
          return Array.from({ length: 25 }, (_, k) => quadBezier(a, CONTROLS[i], b, k / 24));
        }),
      ),
    [],
  );

  const updateAgents = ({ positions, sizes, alphas }: GlowBuffers, time: number) => {
    const focus = useStore.getState().agentFocus;
    AGENTS.forEach((agent, i) => {
      positions.set(agent.pos, i * 3);
      const on = focus === agent.id;
      sizes[i] = 6 + (on ? 8 + Math.sin(time * 6) * 1.5 : Math.sin(time * 1.4 + i) * 1.2);
      alphas[i] = on ? 1 : focus ? 0.35 : 0.7;
    });
    positions.set(AGENT_HUB, 4 * 3);
    sizes[4] = 9 + Math.sin(time * 2) * 1;
    alphas[4] = 0.6;
  };

  const updatePackets = ({ positions, sizes, alphas }: GlowBuffers, time: number, dt: number) => {
    const s = useStore.getState();
    const focusIndex = AGENTS.findIndex((a) => a.id === s.agentFocus);
    const speedScale = s.reducedMotion ? 0.3 : 1;
    AGENT_ARCS.forEach((arc, i) => {
      const touches = focusIndex >= 0 && (arc.from === focusIndex || arc.to === focusIndex);
      focusBoost.current[i] = THREE.MathUtils.damp(focusBoost.current[i], touches ? 1 : 0, 4, dt);
      const boost = focusBoost.current[i];
      const a = agentPoint(arc.from);
      const b = agentPoint(arc.to);
      for (let k = 0; k < PACKETS_PER_ARC; k++) {
        const idx = i * PACKETS_PER_ARC + k;
        const dir = k % 2 === 0 ? 1 : -1;
        const speed = (0.14 + ((i * 7 + k * 3) % 5) * 0.03) * (1 + boost * 1.8) * speedScale;
        let t = (time * speed + k / PACKETS_PER_ARC + i * 0.13) % 1;
        if (dir < 0) t = 1 - t;
        positions.set(quadBezier(a, CONTROLS[i], b, t), idx * 3);
        const edge = Math.sin(t * Math.PI);
        sizes[idx] = (2 + boost * 2.5) * (0.4 + edge * 0.6);
        alphas[idx] = (0.35 + boost * 0.65) * edge;
      }
    });
  };

  return (
    <group rotation-y={FACING}>
      <PulseLines geometry={arcs} color={ACCENT.violet} fade={fade} base={0.08} pulse={0.6} speed={0.3} width={0.07} />
      <GlowPoints count={AGENTS.length + 1} color={ACCENT.cyan} fade={fade} update={updateAgents} />
      <GlowPoints count={AGENT_ARCS.length * PACKETS_PER_ARC} color={ACCENT.cyan} fade={fade} update={updatePackets} />
      {AGENTS.map((agent, i) => (
        <AgentBody key={agent.id} index={i} />
      ))}
      {AGENTS.map((agent) => (
        <Anchor key={agent.id} id={`agent-${agent.id}`} position={[agent.pos[0], agent.pos[1] - 1.05, agent.pos[2]]} />
      ))}
      <Anchor id="agent-hub" position={[0, -0.85, 0]} />
    </group>
  );
}

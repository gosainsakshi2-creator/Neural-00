"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { systemAngle } from "@/lib/layouts";
import { TAU } from "@/lib/math";
import { ACCENT } from "@/lib/palette";
import { useStore, type VoiceStage } from "@/lib/store";
import { SYSTEM_BY_ID } from "@/lib/systems";
import { useFade } from "../primitives";

const FACING = systemAngle(SYSTEM_BY_ID.voice.index);
const LEVEL: Record<VoiceStage, number> = { idle: 0.2, listening: 0.55, processing: 0.25, generating: 1 };

export function VoiceOverlay() {
  const fade = useFade(() => useStore.getState().active === "voice", 1.3);
  const group = useRef<THREE.Group>(null);
  const rings = useRef<(THREE.LineLoop | null)[]>([]);
  const playhead = useRef<THREE.LineSegments>(null);
  const level = useRef(0);
  const clock = useRef(0);

  const { ringGeo, baseGeo, headGeo, ringMat, baseMat, headMat } = useMemo(() => {
    const circle: number[] = [];
    for (let i = 0; i < 128; i++) {
      const a = (i / 128) * TAU;
      circle.push(Math.cos(a), Math.sin(a), 0);
    }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute("position", new THREE.Float32BufferAttribute(circle, 3));
    const bg = new THREE.BufferGeometry();
    bg.setAttribute("position", new THREE.Float32BufferAttribute([-7.8, 0, 3.6, 7.8, 0, 3.6], 3));
    const hg = new THREE.BufferGeometry();
    hg.setAttribute("position", new THREE.Float32BufferAttribute([0, -2.2, 0, 0, 2.2, 0], 3));
    const mat = (color: string) =>
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    return {
      ringGeo: rg,
      baseGeo: bg,
      headGeo: hg,
      ringMat: mat(ACCENT.cyan),
      baseMat: mat(ACCENT.bone),
      headMat: mat(ACCENT.cyan),
    };
  }, []);

  useEffect(
    () => () => {
      [ringGeo, baseGeo, headGeo].forEach((g) => g.dispose());
      [ringMat, baseMat, headMat].forEach((m) => m.dispose());
    },
    [ringGeo, baseGeo, headGeo, ringMat, baseMat, headMat],
  );

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const f = fade.current ?? 0;
    if (group.current) group.current.visible = f > 0.003;
    if (f <= 0.003) return;
    const s = useStore.getState();
    clock.current += dt * (s.reducedMotion ? 0.3 : 1);
    level.current = THREE.MathUtils.damp(level.current, LEVEL[s.voiceStage], 3, dt);
    const t = clock.current;

    rings.current.forEach((ring, i) => {
      if (!ring) return;
      const beat = Math.sin(t * (2.2 + i * 0.7) + i) * 0.5 + 0.5;
      ring.scale.setScalar(1.1 + i * 0.55 + level.current * beat * 0.5);
    });
    ringMat.opacity = f * (0.08 + level.current * 0.16);
    baseMat.opacity = f * 0.1;

    if (playhead.current) playhead.current.position.x = ((t * 2.4) % 15) - 7.5;
    headMat.opacity = f * (0.08 + level.current * 0.22);
  });

  return (
    <group rotation-y={FACING}>
      <group ref={group}>
        {[0, 1, 2].map((i) => (
          <lineLoop
            key={i}
            ref={(el) => {
              rings.current[i] = el;
            }}
            geometry={ringGeo}
            material={ringMat}
            position={[0, 0, 0]}
          />
        ))}
        <lineSegments geometry={baseGeo} material={baseMat} />
        <lineSegments ref={playhead} geometry={headGeo} material={headMat} />
      </group>
    </group>
  );
}

"use client";

import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ACCENT } from "@/lib/palette";
import { useStore } from "@/lib/store";

const RING_COUNT = 2;

/** A thin expanding ring that marks moments of change: entering, selecting, merging. */
export function Shockwave() {
  const pulseNonce = useStore((s) => s.pulseNonce);
  const start = useRef(-10);
  const rings = useRef<(THREE.Mesh | null)[]>([]);

  const geometry = useMemo(() => new THREE.RingGeometry(0.985, 1, 160), []);
  const materials = useMemo(
    () =>
      Array.from(
        { length: RING_COUNT },
        (_, i) =>
          new THREE.MeshBasicMaterial({
            color: i === 0 ? ACCENT.bone : ACCENT.cyan,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
          }),
      ),
    [],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      materials.forEach((m) => m.dispose());
    },
    [geometry, materials],
  );

  useEffect(() => {
    if (pulseNonce > 0) start.current = performance.now() / 1000;
  }, [pulseNonce]);

  useFrame(() => {
    const t = performance.now() / 1000 - start.current;
    const reduced = useStore.getState().reducedMotion;
    rings.current.forEach((mesh, i) => {
      if (!mesh) return;
      const local = (t - i * 0.18) / 1.7;
      const on = local >= 0 && local <= 1 && !reduced;
      mesh.visible = on;
      if (!on) return;
      const e = 1 - Math.pow(1 - local, 3);
      mesh.scale.setScalar(2.4 + e * 13);
      materials[i].opacity = (1 - local) * (i === 0 ? 0.35 : 0.22);
    });
  });

  return (
    <Billboard>
      {materials.map((m, i) => (
        <mesh
          key={i}
          ref={(el) => {
            rings.current[i] = el;
          }}
          geometry={geometry}
          material={m}
          visible={false}
        />
      ))}
    </Billboard>
  );
}

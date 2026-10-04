"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ACCENT } from "@/lib/palette";
import { mulberry32, unitVector } from "@/lib/random";
import { useStore } from "@/lib/store";
import { getGlowTexture } from "./glowTexture";

/** Deep-space dust and a faint volumetric haze around the core. */
export function Atmosphere({ dust }: { dust: number }) {
  const points = useRef<THREE.Points>(null);
  const haze = useRef<THREE.Sprite>(null);
  const hazeOuter = useRef<THREE.Sprite>(null);

  const geometry = useMemo(() => {
    const r = mulberry32(17);
    const pos = new Float32Array(dust * 3);
    for (let i = 0; i < dust; i++) {
      const [x, y, z] = unitVector(r);
      const rad = 14 + r() * 30;
      pos.set([x * rad, y * rad * 0.7, z * rad], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [dust]);

  const { dustMat, hazeMat, hazeOuterMat } = useMemo(
    () => ({
      dustMat: new THREE.PointsMaterial({
        size: 0.06,
        color: ACCENT.bone,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
      }),
      hazeMat: new THREE.SpriteMaterial({
        map: getGlowTexture(),
        color: ACCENT.blue,
        transparent: true,
        opacity: 0.055,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
      hazeOuterMat: new THREE.SpriteMaterial({
        map: getGlowTexture(),
        color: ACCENT.violet,
        transparent: true,
        opacity: 0.018,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    }),
    [],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      dustMat.dispose();
      hazeMat.dispose();
      hazeOuterMat.dispose();
    },
    [geometry, dustMat, hazeMat, hazeOuterMat],
  );

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const s = useStore.getState();
    const silent = s.finale === "silence" || s.finale === "awakened";
    const damp = THREE.MathUtils.damp;
    if (points.current && !s.reducedMotion && !silent) points.current.rotation.y += dt * 0.006;
    dustMat.opacity = damp(dustMat.opacity, silent ? 0.02 : 0.35, 1.2, dt);

    const breathe = s.reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.4) * 0.006;
    const hazeTarget = silent ? 0.0 : s.finale === "final" ? 0.1 : s.active ? 0.03 : 0.055;
    hazeMat.opacity = damp(hazeMat.opacity, hazeTarget + breathe, 1.4, dt);
    hazeOuterMat.opacity = damp(hazeOuterMat.opacity, silent ? 0 : 0.018, 1.4, dt);
  });

  return (
    <group>
      <points ref={points} geometry={geometry} material={dustMat} frustumCulled={false} />
      <sprite ref={haze} material={hazeMat} scale={[14, 14, 1]} />
      <sprite ref={hazeOuter} material={hazeOuterMat} scale={[34, 34, 1]} />
    </group>
  );
}

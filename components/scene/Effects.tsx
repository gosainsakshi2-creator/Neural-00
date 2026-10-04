"use client";

import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { useFrame } from "@react-three/fiber";
import type { BloomEffect } from "postprocessing";
import { useRef } from "react";
import * as THREE from "three";
import { fx } from "@/lib/fx";
import { useStore } from "@/lib/store";

/** Bloom, a whisper of film grain and a vignette. Only mounted on capable devices. */
export function Effects() {
  const bloom = useRef<BloomEffect>(null);
  const reduced = useStore((s) => s.reducedMotion);

  useFrame((_, dt) => {
    if (!bloom.current) return;
    const s = useStore.getState();
    const target = (s.finale === "final" ? 0.95 : 0.75) + fx.flash * 1.6;
    bloom.current.intensity = THREE.MathUtils.damp(bloom.current.intensity, target, 4, Math.min(dt, 0.1));
  });

  if (reduced) {
    return (
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom ref={bloom} mipmapBlur intensity={0.75} luminanceThreshold={0.26} luminanceSmoothing={0.35} radius={0.68} />
        <Vignette offset={0.3} darkness={0.8} />
      </EffectComposer>
    );
  }

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom ref={bloom} mipmapBlur intensity={0.75} luminanceThreshold={0.26} luminanceSmoothing={0.35} radius={0.68} />
      <Noise premultiply opacity={0.06} />
      <Vignette offset={0.3} darkness={0.8} />
    </EffectComposer>
  );
}

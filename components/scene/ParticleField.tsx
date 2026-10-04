"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { fx, pointer } from "@/lib/fx";
import { easeInOutCubic } from "@/lib/math";
import { PALETTES, type PaletteKey } from "@/lib/palette";
import { mulberry32 } from "@/lib/random";
import { getShape } from "@/lib/shapes";
import { useStore, type VoiceStage } from "@/lib/store";

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  uniform float uStagger;
  uniform float uSwirl;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uSilence;
  uniform float uWave;
  uniform float uChaos;
  uniform float uDrift;
  uniform vec2 uMouse;
  uniform float uAspect;
  uniform float uMouseStrength;
  uniform float uObserve;
  uniform float uScanY;
  uniform float uScan;
  uniform float uFacing;
  uniform float uFlash;

  attribute vec3 aTarget;
  attribute vec4 aRand;

  varying float vAlpha;
  varying float vTint;
  varying float vHot;

  // Must match easeInOutCubic() in lib/math.ts
  float easeIO(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) * 0.5;
  }

  void main() {
    float lp = clamp((uProgress - aRand.x * uStagger) / (1.0 - uStagger), 0.0, 1.0);
    vec3 p = mix(position, aTarget, easeIO(lp));
    p += (aRand.yzw - 0.5) * sin(lp * 3.14159265) * uSwirl;

    float t = uTime;
    vec3 ph = aRand.yzw * 6.2831853;
    p += vec3(
      sin(t * 0.53 + ph.x + p.y * 0.6),
      cos(t * 0.47 + ph.y + p.z * 0.5),
      sin(t * 0.41 + ph.z + p.x * 0.55)
    ) * uDrift * (0.5 + aRand.x);

    p += vec3(
      sin(t * 1.9 + ph.x * 3.0),
      cos(t * 1.6 + ph.y * 3.0),
      sin(t * 2.2 + ph.z * 3.0)
    ) * uChaos * 0.55;

    if (uWave > 0.001) {
      float lx = cos(uFacing) * p.x - sin(uFacing) * p.z;
      float lz = sin(uFacing) * p.x + cos(uFacing) * p.z;
      float env = exp(-lx * lx / 22.0);
      float w = sin(lx * 1.35 - t * 2.6 + lz * 0.9) * 0.75
              + sin(lx * 3.2 + t * 3.7 - lz * 0.6) * 0.28
              + sin(lx * 0.55 - t * 1.3 + lz * 1.8) * 0.45;
      p.y += w * env * uWave * 1.25 * (1.0 - abs(lz) / 3.4 * 0.5);
    }

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vec4 clip = projectionMatrix * mv;
    vec2 ndc = clip.xy / max(clip.w, 0.0001);
    vec2 d = ndc - uMouse;
    d.x *= uAspect;
    float dist = length(d);
    float force = smoothstep(0.2, 0.0, dist) * uMouseStrength * step(0.0, clip.w);
    vec2 dir = dist > 0.0001 ? d / dist : vec2(0.0);
    mv.xy += dir * force * 0.032 * (-mv.z);
    gl_Position = projectionMatrix * mv;

    float scan = uScan * smoothstep(0.2, 0.0, abs(p.y - uScanY));
    float hot = max(force, scan);
    float size = uSize * (0.45 + aRand.w) * (1.0 + hot * 1.1) * mix(1.0, 0.72, uObserve);
    gl_PointSize = size * uPixelRatio * (42.0 / max(0.5, -mv.z));

    vAlpha = ((0.28 + 0.72 * aRand.z) * (1.0 - uSilence * 0.965)) + hot * 0.6 + uFlash * 0.8;
    vTint = aRand.y;
    vHot = hot + step(0.965, aRand.w) * 0.7 + uFlash;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uOpacity;
  uniform float uObserve;
  varying float vAlpha;
  varying float vTint;
  varying float vHot;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float soft = pow(smoothstep(0.5, 0.0, d), 1.8);
    float crisp = smoothstep(0.5, 0.32, d);
    float shape = mix(soft, crisp, uObserve * 0.8);
    vec3 col = mix(uColorA, uColorB, vTint);
    col = mix(col, vec3(0.86, 0.96, 1.0), uObserve * 0.55);
    col = mix(col, vec3(1.0), clamp(vHot, 0.0, 1.0) * 0.7);
    gl_FragColor = vec4(col, shape * vAlpha * uOpacity * 0.55);
  }
`;

const WAVE: Record<VoiceStage, number> = { idle: 0.3, listening: 0.55, processing: 0.16, generating: 1 };

interface ParticleFieldProps {
  count: number;
  sizeScale: number;
}

export function ParticleField({ count, sizeScale }: ParticleFieldProps) {
  const shape = useStore((s) => s.shape);
  const size = useThree((s) => s.size);
  const transition = useRef({ progress: 1, duration: 1, stagger: 0.35, swirl: 0 });
  const appliedNonce = useRef<number | null>(null);
  const silence = useRef(0);
  const colorA = useRef(new THREE.Color(PALETTES.core[0]));
  const colorB = useRef(new THREE.Color(PALETTES.core[1]));
  const targetA = useRef(new THREE.Color());
  const targetB = useRef(new THREE.Color());

  const { geometry, material, initialNonce } = useMemo(() => {
    const initial = useStore.getState().shape;
    const start = getShape(initial.key, count, initial.facing).slice();
    const target = start.slice();
    const rand = new Float32Array(count * 4);
    const r = mulberry32(99);
    for (let i = 0; i < rand.length; i++) rand[i] = r();

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(start, 3));
    g.setAttribute("aTarget", new THREE.BufferAttribute(target, 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(rand, 4));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 40);

    const m = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 1 },
        uStagger: { value: 0.35 },
        uSwirl: { value: 0 },
        uSize: { value: 1 },
        uPixelRatio: { value: 1 },
        uSilence: { value: 0 },
        uWave: { value: 0 },
        uChaos: { value: 0 },
        uDrift: { value: 0.05 },
        uMouse: { value: new THREE.Vector2(9, 9) },
        uAspect: { value: 1 },
        uMouseStrength: { value: 0 },
        uObserve: { value: 0 },
        uScanY: { value: 0 },
        uScan: { value: 0 },
        uFacing: { value: initial.facing },
        uFlash: { value: 0 },
        uColorA: { value: new THREE.Color(PALETTES.core[0]) },
        uColorB: { value: new THREE.Color(PALETTES.core[1]) },
        uOpacity: { value: 0 },
      },
    });
    return { geometry: g, material: m, initialNonce: initial.nonce };
  }, [count]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  // Start a new morph: freeze the current blended state as the new origin, then retarget.
  useEffect(() => {
    if (shape.nonce <= (appliedNonce.current ?? initialNonce)) return;
    appliedNonce.current = shape.nonce;

    const tr = transition.current;
    const pos = geometry.attributes.position.array as Float32Array;
    const tgt = geometry.attributes.aTarget.array as Float32Array;
    const rnd = geometry.attributes.aRand.array as Float32Array;
    const progress = Math.min(1, tr.progress);

    if (progress > 0) {
      for (let i = 0; i < count; i++) {
        const lp = Math.min(1, Math.max(0, (progress - rnd[i * 4] * tr.stagger) / (1 - tr.stagger)));
        const e = easeInOutCubic(lp);
        const sw = Math.sin(lp * Math.PI) * tr.swirl;
        const o = i * 3;
        const ro = i * 4;
        pos[o] = pos[o] + (tgt[o] - pos[o]) * e + (rnd[ro + 1] - 0.5) * sw;
        pos[o + 1] = pos[o + 1] + (tgt[o + 1] - pos[o + 1]) * e + (rnd[ro + 2] - 0.5) * sw;
        pos[o + 2] = pos[o + 2] + (tgt[o + 2] - pos[o + 2]) * e + (rnd[ro + 3] - 0.5) * sw;
      }
    }
    tgt.set(getShape(shape.key, count, shape.facing));
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aTarget.needsUpdate = true;

    tr.progress = 0;
    tr.duration = shape.duration;
    tr.stagger = shape.stagger;
    tr.swirl = shape.swirl;
    material.uniforms.uStagger.value = shape.stagger;
    material.uniforms.uSwirl.value = shape.swirl;
    material.uniforms.uFacing.value = shape.facing;
  }, [shape, geometry, material, count, initialNonce]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const s = useStore.getState();
    const u = material.uniforms;
    const damp = THREE.MathUtils.damp;
    const tr = transition.current;

    tr.progress = Math.min(1, tr.progress + dt / tr.duration);
    u.uProgress.value = tr.progress;

    const silent = s.finale === "silence" || s.finale === "awakened";
    silence.current = damp(silence.current, silent ? 1 : 0, silent ? 0.9 : 3.5, dt);
    const timeScale = (1 - silence.current) * (s.reducedMotion ? 0.35 : 1);
    u.uTime.value += dt * timeScale;
    u.uSilence.value = silence.current;

    const introTarget = s.phase === "intro" ? (s.introStage === "dormant" ? 0.45 : 0.95) : 1;
    u.uOpacity.value = damp(u.uOpacity.value, introTarget, 1.2, dt);

    u.uWave.value = damp(u.uWave.value, s.active === "voice" ? WAVE[s.voiceStage] : 0, 2.2, dt);
    u.uChaos.value = damp(u.uChaos.value, s.active === "generation" ? fx.chaosTarget : 0, 2, dt);
    u.uDrift.value = damp(u.uDrift.value, s.reducedMotion ? 0.012 : s.active === "voice" ? 0.015 : 0.05, 2, dt);
    u.uObserve.value = damp(u.uObserve.value, s.observe ? 1 : 0, 3, dt);

    const mouseOn = pointer.inside && !silent && s.phase === "main" ? (s.observe ? 0.6 : 1) : 0;
    u.uMouseStrength.value = damp(u.uMouseStrength.value, mouseOn, 4, dt);
    (u.uMouse.value as THREE.Vector2).set(pointer.x, pointer.y);
    u.uAspect.value = size.width / Math.max(1, size.height);
    u.uPixelRatio.value = state.gl.getPixelRatio();
    u.uSize.value = sizeScale;

    u.uScanY.value = fx.scanY;
    u.uScan.value = s.active === "vision" ? fx.scan : damp(u.uScan.value, 0, 3, dt);

    fx.flash = damp(fx.flash, 0, 1.6, dt);
    u.uFlash.value = fx.flash;

    const key: PaletteKey = s.finale !== "idle" ? "finale" : (s.active ?? "core");
    targetA.current.set(PALETTES[key][0]);
    targetB.current.set(PALETTES[key][1]);
    colorA.current.lerp(targetA.current, 1 - Math.exp(-2 * dt));
    colorB.current.lerp(targetB.current, 1 - Math.exp(-2 * dt));
    (u.uColorA.value as THREE.Color).copy(colorA.current);
    (u.uColorB.value as THREE.Color).copy(colorB.current);
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

"use client";

import { useFrame } from "@react-three/fiber";
import { type RefObject, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Vec3 } from "@/lib/math";

/* ------------------------------------------------------------------ */
/* Fade                                                                */
/* ------------------------------------------------------------------ */

/** A damped 0→1 value that follows `target`. Read `.current` inside useFrame. */
export function useFade(target: () => boolean, lambda = 2.5): RefObject<number> {
  const value = useRef(0);
  useFrame((_, dt) => {
    value.current = THREE.MathUtils.damp(value.current, target() ? 1 : 0, lambda, Math.min(dt, 0.1));
  });
  return value;
}

/* ------------------------------------------------------------------ */
/* Pulse lines                                                         */
/* ------------------------------------------------------------------ */

/**
 * Builds line segments from polylines. Each vertex carries its normalised position along the
 * polyline (aT), a per-polyline seed and an optional layer index used for sequential activation.
 */
export function buildLineGeometry(polylines: Vec3[][], layers?: number[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const ts: number[] = [];
  const seeds: number[] = [];
  const layerAttr: number[] = [];
  polylines.forEach((pts, li) => {
    let total = 0;
    const cumulative = [0];
    for (let i = 1; i < pts.length; i++) {
      total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]);
      cumulative.push(total);
    }
    const seed = (Math.sin(li * 91.17) * 0.5 + 0.5) % 1;
    for (let i = 0; i < pts.length - 1; i++) {
      positions.push(...pts[i], ...pts[i + 1]);
      ts.push(cumulative[i] / (total || 1), cumulative[i + 1] / (total || 1));
      seeds.push(seed, seed);
      const l = layers?.[li] ?? 0;
      layerAttr.push(l, l);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("aT", new THREE.Float32BufferAttribute(ts, 1));
  g.setAttribute("aSeed", new THREE.Float32BufferAttribute(seeds, 1));
  g.setAttribute("aLayer", new THREE.Float32BufferAttribute(layerAttr, 1));
  return g;
}

const pulseVertex = /* glsl */ `
  attribute float aT;
  attribute float aSeed;
  attribute float aLayer;
  varying float vT;
  varying float vSeed;
  varying float vLayer;
  void main() {
    vT = aT;
    vSeed = aSeed;
    vLayer = aLayer;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const pulseFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uSpeed;
  uniform float uWidth;
  uniform float uBase;
  uniform float uPulse;
  uniform float uOpacity;
  uniform float uActivity;
  uniform float uFront;
  uniform float uUseFront;
  uniform float uReverse;
  varying float vT;
  varying float vSeed;
  varying float vLayer;
  void main() {
    float t = mix(vT, 1.0 - vT, uReverse);
    float phase = fract(uTime * uSpeed * (0.6 + vSeed * 0.8) + vSeed * 7.0);
    float pulse = smoothstep(uWidth, 0.0, abs(t - phase));
    float base = uBase;
    if (uUseFront > 0.5) {
      float local = uFront - vLayer;
      float on = step(0.0, local) * step(local, 1.0);
      float done = step(1.0, local);
      pulse = on * (smoothstep(0.16, 0.0, abs(t - local)) + 0.22);
      base = uBase + done * 0.1;
    }
    float a = (base + pulse * uPulse * (0.65 + uActivity)) * uOpacity;
    gl_FragColor = vec4(uColor * (1.0 + pulse * 0.9), a);
  }
`;

export interface PulseLinesProps {
  geometry: THREE.BufferGeometry;
  color: string;
  fade: RefObject<number>;
  base?: number;
  pulse?: number;
  speed?: number;
  width?: number;
  reverse?: boolean;
  /** Optional ref driving sequential activation by layer. */
  front?: RefObject<number>;
  /** Optional ref (0..1) boosting pulse brightness, e.g. pointer activity. */
  activity?: RefObject<number>;
  timeScale?: RefObject<number>;
}

export function PulseLines({
  geometry,
  color,
  fade,
  base = 0.07,
  pulse = 0.6,
  speed = 0.25,
  width = 0.08,
  reverse = false,
  front,
  activity,
  timeScale,
}: PulseLinesProps) {
  const lines = useRef<THREE.LineSegments>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: pulseVertex,
        fragmentShader: pulseFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uTime: { value: 0 },
          uSpeed: { value: speed },
          uWidth: { value: width },
          uBase: { value: base },
          uPulse: { value: pulse },
          uOpacity: { value: 0 },
          uActivity: { value: 0 },
          uFront: { value: 0 },
          uUseFront: { value: front ? 1 : 0 },
          uReverse: { value: reverse ? 1 : 0 },
        },
      }),
    // Material is created once; dynamic values are pushed in useFrame below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, dt) => {
    const u = material.uniforms;
    const f = fade.current ?? 0;
    u.uTime.value += Math.min(dt, 0.1) * (timeScale?.current ?? 1);
    u.uOpacity.value = f;
    u.uActivity.value = activity?.current ?? 0;
    u.uBase.value = base;
    u.uPulse.value = pulse;
    (u.uColor.value as THREE.Color).set(color);
    if (front) u.uFront.value = front.current ?? 0;
    if (lines.current) lines.current.visible = f > 0.003;
  });

  return <lineSegments ref={lines} geometry={geometry} material={material} frustumCulled={false} />;
}

/* ------------------------------------------------------------------ */
/* Glow points                                                         */
/* ------------------------------------------------------------------ */

const glowVertex = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  uniform float uPixelRatio;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * (42.0 / max(0.5, -mv.z));
    vAlpha = aAlpha;
  }
`;

const glowFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float core = smoothstep(0.1, 0.0, d);
    float halo = pow(smoothstep(0.5, 0.0, d), 2.6);
    vec3 col = mix(uColor, vec3(1.0), core);
    gl_FragColor = vec4(col, (halo * 0.75 + core) * vAlpha * uOpacity);
  }
`;

export interface GlowBuffers {
  positions: Float32Array;
  sizes: Float32Array;
  alphas: Float32Array;
}

export interface GlowPointsProps {
  count: number;
  color: string;
  fade: RefObject<number>;
  /** Called every frame while visible. Write into the buffers; they are uploaded afterwards. */
  update: (buffers: GlowBuffers, time: number, dt: number) => void;
}

export function GlowPoints({ count, color, fade, update }: GlowPointsProps) {
  const points = useRef<THREE.Points>(null);
  const clock = useRef(0);

  const { geometry, buffers } = useMemo(() => {
    const b: GlowBuffers = {
      positions: new Float32Array(count * 3),
      sizes: new Float32Array(count).fill(1),
      alphas: new Float32Array(count).fill(1),
    };
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(b.positions, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aSize", new THREE.BufferAttribute(b.sizes, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(b.alphas, 1).setUsage(THREE.DynamicDrawUsage));
    return { geometry: g, buffers: b };
  }, [count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: glowVertex,
        fragmentShader: glowFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uOpacity: { value: 0 },
          uPixelRatio: { value: 1 },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((state, dt) => {
    const f = fade.current ?? 0;
    if (points.current) points.current.visible = f > 0.003;
    if (f <= 0.003) return;
    const step = Math.min(dt, 0.1);
    clock.current += step;
    update(buffers, clock.current, step);
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aSize.needsUpdate = true;
    geometry.attributes.aAlpha.needsUpdate = true;
    material.uniforms.uOpacity.value = f;
    material.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
    (material.uniforms.uColor.value as THREE.Color).set(color);
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}

/* ------------------------------------------------------------------ */
/* Wire shapes                                                         */
/* ------------------------------------------------------------------ */

/** Edges of a polyhedron as a thin line object with a shared, fade-driven material. */
export function useWireGeometry(kind: "icosa" | "octa", radius: number) {
  return useMemo(() => {
    const base = kind === "icosa" ? new THREE.IcosahedronGeometry(radius, 0) : new THREE.OctahedronGeometry(radius, 0);
    const edges = new THREE.EdgesGeometry(base);
    base.dispose();
    return edges;
  }, [kind, radius]);
}

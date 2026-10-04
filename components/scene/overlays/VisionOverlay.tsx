"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { fx } from "@/lib/fx";
import { systemAngle, VISION_FLOOR_Y, VISION_OBJECTS } from "@/lib/layouts";
import { ACCENT } from "@/lib/palette";
import { useStore } from "@/lib/store";
import { SYSTEM_BY_ID } from "@/lib/systems";
import { Anchor } from "../Anchor";
import { useFade } from "../primitives";

const FACING = systemAngle(SYSTEM_BY_ID.vision.index);
const SCAN_BOTTOM = VISION_FLOOR_Y - 0.1;
const SCAN_TOP = 2.4;
const SWEEP = 3.4;
const CYCLE = 4.6;

/** Corner brackets around an axis-aligned box: 8 corners × 3 short strokes. */
function bracketPositions(center: number[], size: number[]): number[] {
  const out: number[] = [];
  const h = size.map((s) => s / 2 + 0.12);
  const len = 0.28;
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      for (const sz of [-1, 1]) {
        const c = [center[0] + sx * h[0], center[1] + sy * h[1], center[2] + sz * h[2]];
        out.push(...c, c[0] - sx * len, c[1], c[2]);
        out.push(...c, c[0], c[1] - sy * len, c[2]);
        out.push(...c, c[0], c[1], c[2] - sz * len);
      }
  return out;
}

export function VisionOverlay() {
  const fade = useFade(() => useStore.getState().active === "vision", 1.3);
  const clock = useRef(0);
  const group = useRef<THREE.Group>(null);
  const scanPlane = useRef<THREE.Mesh>(null);

  const { gridGeo, brackets, planeMat, gridMat, bracketMats } = useMemo(() => {
    const grid: number[] = [];
    const extent = 7;
    for (let i = 0; i <= 14; i++) {
      const v = -extent + i;
      grid.push(-extent, VISION_FLOOR_Y, v, extent, VISION_FLOOR_Y, v);
      grid.push(v, VISION_FLOOR_Y, -extent, v, VISION_FLOOR_Y, extent);
    }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute("position", new THREE.Float32BufferAttribute(grid, 3));

    const br = VISION_OBJECTS.map((o) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(bracketPositions(o.center, o.size), 3));
      return g;
    });

    const lineMat = (color: string) =>
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

    const pm = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: { uOpacity: { value: 0 }, uColor: { value: new THREE.Color(ACCENT.cyan) } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          float d = length(vUv - 0.5) * 2.0;
          float fall = smoothstep(1.0, 0.2, d);
          float lines = smoothstep(0.92, 1.0, abs(sin(vUv.x * 120.0))) * 0.4;
          gl_FragColor = vec4(uColor, (0.05 + lines * 0.08) * fall * uOpacity);
        }
      `,
    });

    return {
      gridGeo: gg,
      brackets: br,
      planeMat: pm,
      gridMat: lineMat(ACCENT.bone),
      bracketMats: VISION_OBJECTS.map(() => lineMat(ACCENT.cyan)),
    };
  }, []);

  useEffect(
    () => () => {
      gridGeo.dispose();
      brackets.forEach((b) => b.dispose());
      planeMat.dispose();
      gridMat.dispose();
      bracketMats.forEach((m) => m.dispose());
    },
    [gridGeo, brackets, planeMat, gridMat, bracketMats],
  );

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const f = fade.current ?? 0;
    if (group.current) group.current.visible = f > 0.003;
    if (f <= 0.003) {
      fx.scan = 0;
      return;
    }
    const reduced = useStore.getState().reducedMotion;
    clock.current += dt * (reduced ? 0.4 : 1);
    const t = clock.current % CYCLE;
    const sweep = Math.min(1, t / SWEEP);
    const eased = 1 - Math.pow(1 - sweep, 2);
    const y = SCAN_BOTTOM + (SCAN_TOP - SCAN_BOTTOM) * eased;
    const tail = t > SWEEP ? 1 - (t - SWEEP) / (CYCLE - SWEEP) : 1;

    fx.scanY = y;
    fx.scan = f * tail;
    if (scanPlane.current) scanPlane.current.position.y = y;
    planeMat.uniforms.uOpacity.value = f * tail;
    gridMat.opacity = f * 0.09;

    let count = 0;
    VISION_OBJECTS.forEach((o, i) => {
      const seen = t < SWEEP ? y > o.center[1] : true;
      if (seen) count++;
      const target = seen ? 0.75 * tail + 0.15 : 0;
      bracketMats[i].opacity = THREE.MathUtils.damp(bracketMats[i].opacity, target * f, 6, dt);
    });
    useStore.getState().setVisionRevealed(count);
  });

  return (
    <group rotation-y={FACING}>
      <group ref={group}>
        <lineSegments geometry={gridGeo} material={gridMat} frustumCulled={false} />
        <mesh ref={scanPlane} material={planeMat} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[15, 15]} />
        </mesh>
        {brackets.map((g, i) => (
          <lineSegments key={VISION_OBJECTS[i].label} geometry={g} material={bracketMats[i]} frustumCulled={false} />
        ))}
      </group>
      {VISION_OBJECTS.map((o, i) => (
        <Anchor key={o.label} id={`vision-${i}`} position={[o.center[0], o.center[1] + o.size[1] / 2 + 0.45, o.center[2]]} />
      ))}
    </group>
  );
}

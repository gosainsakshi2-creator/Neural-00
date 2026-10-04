"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useState } from "react";
import { QUALITY } from "@/lib/quality";
import { useStore } from "@/lib/store";
import { AnchorProjector } from "./Anchor";
import { Atmosphere } from "./Atmosphere";
import { CameraRig } from "./CameraRig";
import { Effects } from "./Effects";
import { NeuralLinks } from "./NeuralLinks";
import { ObserveGrid } from "./ObserveGrid";
import { AgentsOverlay } from "./overlays/AgentsOverlay";
import { MemoryOverlay } from "./overlays/MemoryOverlay";
import { ReasoningOverlay } from "./overlays/ReasoningOverlay";
import { VisionOverlay } from "./overlays/VisionOverlay";
import { VoiceOverlay } from "./overlays/VoiceOverlay";
import { ParticleField } from "./ParticleField";
import { Shockwave } from "./Shockwave";
import { SystemNodes } from "./SystemNodes";

export default function Scene() {
  const tier = useStore((s) => s.quality);
  const profile = QUALITY[tier];
  const [dpr, setDpr] = useState(profile.dpr[1]);

  return (
    <Canvas
      className="scene-canvas"
      dpr={[profile.dpr[0], Math.min(dpr, profile.dpr[1])]}
      gl={{ antialias: false, alpha: false, stencil: false, powerPreference: "high-performance" }}
      camera={{ fov: 42, near: 0.1, far: 200, position: [0, 1.5, 19] }}
    >
      <color attach="background" args={["#030406"]} />
      <PerformanceMonitor
        onDecline={() => setDpr((d) => Math.max(profile.dpr[0], d - 0.25))}
        onIncline={() => setDpr((d) => Math.min(profile.dpr[1], d + 0.25))}
        flipflops={4}
      />
      <Suspense fallback={null}>
        <CameraRig />
        <Atmosphere key={`dust-${profile.dust}`} dust={profile.dust} />
        <ParticleField key={`field-${profile.particles}`} count={profile.particles} sizeScale={profile.size} />
        <NeuralLinks />
        <SystemNodes />
        <Shockwave />
        <ObserveGrid />
        <MemoryOverlay />
        <VisionOverlay />
        <ReasoningOverlay />
        <VoiceOverlay />
        <AgentsOverlay />
        {profile.bloom && <Effects />}
        <AnchorProjector />
      </Suspense>
    </Canvas>
  );
}

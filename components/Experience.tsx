"use client";

import { AnimatePresence, MotionConfig } from "motion/react";
import dynamic from "next/dynamic";
import { useEnvironment } from "@/components/hooks/useEnvironment";
import { useFinaleDirector } from "@/components/hooks/useFinaleDirector";
import { useGenerationCycle } from "@/components/hooks/useGenerationCycle";
import { useKeyboard } from "@/components/hooks/useKeyboard";
import { usePointer } from "@/components/hooks/usePointer";
import { useSceneDirector } from "@/components/hooks/useSceneDirector";
import { useSound } from "@/components/hooks/useSound";
import { useVoiceCycle } from "@/components/hooks/useVoiceCycle";
import { Cursor } from "@/components/ui/Cursor";
import { FinaleOverlay } from "@/components/ui/FinaleOverlay";
import { Hud } from "@/components/ui/Hud";
import { IntroSequence } from "@/components/ui/IntroSequence";
import { LayerPanel } from "@/components/ui/LayerPanel";
import { SceneLabels } from "@/components/ui/SceneLabels";
import { ObserverPanel } from "@/components/ui/ObserverPanel";
import { SystemPanel } from "@/components/ui/SystemPanel";
import { useStore } from "@/lib/store";

// The WebGL scene is client-only and loaded lazily, so the first paint is just type on black.
const Scene = dynamic(() => import("@/components/scene/Scene"), { ssr: false, loading: () => null });

export function Experience() {
  useEnvironment();
  usePointer();
  useKeyboard();
  useSceneDirector();
  useFinaleDirector();
  useGenerationCycle();
  useVoiceCycle();
  useSound();

  const ready = useStore((s) => s.ready);
  const phase = useStore((s) => s.phase);

  return (
    <MotionConfig reducedMotion="user">
      <main className="fixed inset-0 overflow-hidden bg-void text-bone">
        <h1 className="sr-only">NEURAL // 00 — Artificial intelligence, visualized</h1>
        <div className="absolute inset-0">{ready && <Scene />}</div>

        <SceneLabels />
        <AnimatePresence>{phase === "intro" && <IntroSequence key="intro" />}</AnimatePresence>
        {phase === "main" && <Hud />}
        <LayerPanel />
        <ObserverPanel />
        <SystemPanel />
        <FinaleOverlay />
        <Cursor />
      </main>
    </MotionConfig>
  );
}

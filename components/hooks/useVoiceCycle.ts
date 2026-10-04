"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

/** Simulated exchange timing. Purely visual — no audio input is ever requested. */
export function useVoiceCycle() {
  const active = useStore((s) => s.active === "voice");

  useEffect(() => {
    const s = useStore.getState();
    if (!active) {
      s.setVoiceStage("idle");
      return;
    }
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    const run = () => {
      s.setVoiceStage("listening");
      at(3000, () => s.setVoiceStage("processing"));
      at(5200, () => s.setVoiceStage("generating"));
      at(11000, run);
    };
    at(900, run);
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [active]);
}

"use client";

import { useEffect } from "react";
import { fx } from "@/lib/fx";
import { systemAngle } from "@/lib/layouts";
import type { ShapeKey } from "@/lib/shapes";
import { useStore } from "@/lib/store";
import { SYSTEM_BY_ID } from "@/lib/systems";

const FACING = systemAngle(SYSTEM_BY_ID.generation.index);

const OUTPUTS: { shape: ShapeKey; prompt: string }[] = [
  { shape: "gen-knot", prompt: "Fold one line into a closed form" },
  { shape: "gen-text", prompt: "Write the word form" },
  { shape: "gen-neural", prompt: "Grow a pattern that branches" },
  { shape: "gen-geo", prompt: "Nest three solids, one inside another" },
];

/** PROMPT → LATENT SPACE → TRANSFORMATION → OUTPUT, looping through four outputs. */
export function useGenerationCycle() {
  const active = useStore((s) => s.active === "generation");

  useEffect(() => {
    if (!active) {
      fx.chaosTarget = 0;
      return;
    }
    const s = useStore.getState();
    const k = s.reducedMotion ? 0.7 : 1;
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms * k));
    let index = 0;

    const cycle = (first: boolean) => {
      const out = OUTPUTS[index % OUTPUTS.length];
      index++;
      const lead = first ? 1600 : 0;
      if (!first) s.setShape("chaos", { duration: 1.8, stagger: 0.3, swirl: 2.2, facing: FACING });
      s.setGenPrompt(out.prompt);
      s.setFlowStep(0);
      fx.chaosTarget = 1;
      at(lead + 1500, () => s.setFlowStep(1));
      at(lead + 3000, () => {
        s.setFlowStep(2);
        fx.chaosTarget = 0;
        s.setShape(out.shape, { duration: 3.4, stagger: 0.55, swirl: 1.4, facing: FACING });
      });
      at(lead + 6300, () => s.setFlowStep(3));
      at(lead + 10000, () => cycle(false));
    };
    cycle(true);

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      fx.chaosTarget = 0;
    };
  }, [active]);
}

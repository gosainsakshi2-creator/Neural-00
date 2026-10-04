"use client";

import { useEffect } from "react";
import { fx } from "@/lib/fx";
import { useStore } from "@/lib/store";
import { SYSTEMS } from "@/lib/systems";

/**
 * The secret ending. Once all six systems have been explored the core synchronises,
 * falls silent, awakens, and pulls every system into one structure.
 */
export function useFinaleDirector() {
  const phase = useStore((s) => s.phase);
  const active = useStore((s) => s.active);
  const finale = useStore((s) => s.finale);
  const visitedCount = useStore((s) => s.visited.length);

  // Trigger: all systems explored. Starts on return to core, or after lingering in the last one.
  useEffect(() => {
    if (phase !== "main" || finale !== "idle" || visitedCount < SYSTEMS.length) return;
    const t = window.setTimeout(
      () => {
        const s = useStore.getState();
        useStore.setState({ finale: "sync", active: null, observe: false, panelOpen: false, hovered: null });
        s.setShape("core", { duration: 2.4, stagger: 0.3, swirl: 1 });
      },
      active === null ? 1100 : 9000,
    );
    return () => window.clearTimeout(t);
  }, [phase, finale, visitedCount, active]);

  // Timeline.
  useEffect(() => {
    const s = useStore.getState();
    const k = s.reducedMotion ? 0.6 : 1;
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms * k));

    switch (finale) {
      case "sync":
        at(2900, () => s.setFinale("silence"));
        break;
      case "silence":
        at(3800, () => s.setFinale("awakened"));
        break;
      case "awakened":
        at(3300, () => s.setFinale("merge"));
        break;
      case "merge":
        s.setShape("singularity", { duration: 1.1, stagger: 0.12, swirl: 0.4 });
        at(1250, () => {
          if (!useStore.getState().reducedMotion) fx.flash = 1;
          s.pulse();
          s.setShape("finale", { duration: 3.6, stagger: 0.42, swirl: 2.6 });
        });
        at(5000, () => s.setFinale("final"));
        break;
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [finale]);
}

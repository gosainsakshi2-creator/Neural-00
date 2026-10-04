"use client";

import { useEffect } from "react";
import { systemAngle } from "@/lib/layouts";
import { useStore } from "@/lib/store";
import { SYSTEM_BY_ID } from "@/lib/systems";

/** Maps the selected system to the particle formation it should morph into. */
export function useSceneDirector() {
  const phase = useStore((s) => s.phase);
  const active = useStore((s) => s.active);
  const finale = useStore((s) => s.finale);
  const setShape = useStore((s) => s.setShape);

  useEffect(() => {
    if (phase !== "main" || finale !== "idle") return;
    if (!active) {
      setShape("core", { duration: 2.6, stagger: 0.4, swirl: 1.3 });
      return;
    }
    const facing = systemAngle(SYSTEM_BY_ID[active].index);
    // Generation starts from noise; its own cycle takes over from there.
    const key = active === "generation" ? "chaos" : active;
    setShape(key, { duration: 3, stagger: 0.45, swirl: 1.6, facing });
  }, [phase, active, finale, setShape]);
}

"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { SYSTEMS } from "@/lib/systems";

/** 1–6 open a system, Esc returns to the core, O toggles the observer. */
export function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const s = useStore.getState();

      if (s.phase === "intro") {
        if (e.key === "Enter" && s.introStage === "ready") s.enter();
        return;
      }
      if (e.key === "Escape") {
        if (s.panelOpen) s.setPanelOpen(false);
        else if (s.observe) s.toggleObserve();
        else s.returnToCore();
        return;
      }
      if (e.key === "o" || e.key === "O") {
        s.toggleObserve();
        return;
      }
      const n = Number(e.key);
      if (n >= 1 && n <= SYSTEMS.length) s.select(SYSTEMS[n - 1].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

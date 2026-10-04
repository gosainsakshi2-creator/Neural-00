"use client";

import { useEffect } from "react";
import { pointer } from "@/lib/fx";

/** Track the pointer in normalised device coordinates without causing re-renders. */
export function usePointer() {
  useEffect(() => {
    let lastX = 0;
    let lastY = 0;
    let lastT = performance.now();
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      const now = performance.now();
      const dt = Math.max(1, now - lastT);
      const v = Math.hypot(x - lastX, y - lastY) / dt;
      pointer.speed = Math.min(1, pointer.speed * 0.8 + v * 40 * 0.2);
      pointer.x = x;
      pointer.y = y;
      pointer.inside = e.pointerType === "mouse" || e.pressure > 0;
      pointer.lastInteraction = now;
      lastX = x;
      lastY = y;
      lastT = now;
    };
    const onLeave = () => {
      pointer.inside = false;
    };
    const onTouchEnd = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") pointer.inside = false;
    };
    const decay = () => {
      pointer.speed *= 0.94;
      raf = requestAnimationFrame(decay);
    };
    raf = requestAnimationFrame(decay);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    window.addEventListener("pointerup", onTouchEnd, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      window.removeEventListener("pointerup", onTouchEnd);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);
}

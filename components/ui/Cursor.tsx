"use client";

import { motion, useMotionValue, useSpring } from "motion/react";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";

/** A tiny precise cursor for fine pointers. Expands slightly over anything interactive. */
export function Cursor() {
  const touch = useStore((s) => s.touch);
  const sceneHover = useStore((s) => s.hovered !== null);
  const [enabled, setEnabled] = useState(false);
  const [domHover, setDomHover] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pressed, setPressed] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const rx = useSpring(x, { stiffness: 520, damping: 42, mass: 0.6 });
  const ry = useSpring(y, { stiffness: 520, damping: 42, mass: 0.6 });

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)");
    const sync = () => setEnabled(fine.matches && !touch);
    sync();
    fine.addEventListener("change", sync);
    return () => fine.removeEventListener("change", sync);
  }, [touch]);

  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    root.classList.add("has-custom-cursor");
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
      const el = e.target as Element | null;
      setDomHover(Boolean(el?.closest("button, a, [data-cursor='hover']")));
    };
    const onLeave = () => setVisible(false);
    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    root.addEventListener("pointerleave", onLeave);
    return () => {
      root.classList.remove("has-custom-cursor");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointerleave", onLeave);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;
  const hover = sceneHover || domHover;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[100]">
      <motion.div className="absolute left-0 top-0" style={{ x, y }}>
        <span className="absolute -left-[2px] -top-[2px] block h-[4px] w-[4px] rounded-full bg-bone" />
      </motion.div>
      <motion.div className="absolute left-0 top-0" style={{ x: rx, y: ry }}>
        <motion.span
          className="absolute block rounded-full border border-bone/50"
          animate={{
            width: hover ? 30 : 16,
            height: hover ? 30 : 16,
            left: hover ? -15 : -8,
            top: hover ? -15 : -8,
            opacity: visible ? (hover ? 0.9 : 0.35) : 0,
            borderColor: hover ? "rgba(127,227,255,0.8)" : "rgba(232,236,241,0.5)",
            scale: pressed ? 0.8 : 1,
          }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      </motion.div>
    </div>
  );
}

"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { QUALITY, type QualityTier } from "@/lib/quality";
import { useStore } from "@/lib/store";

const ease = [0.16, 1, 0.3, 1] as const;
const TIERS: QualityTier[] = ["high", "medium", "low"];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[88px_1fr] items-baseline gap-4 border-t border-bone/10 py-3">
      <span className="t-micro text-bone/40">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Panel() {
  const quality = useStore((s) => s.quality);
  const reduced = useStore((s) => s.reducedMotion);
  const sound = useStore((s) => s.sound);
  const visited = useStore((s) => s.visited.length);
  const touch = useStore((s) => s.touch);
  const { setQuality, toggleSound, setPanelOpen } = useStore.getState();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (ref.current?.contains(target as Node) || target?.closest('[aria-controls="system-panel"]')) return;
      setPanelOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [setPanelOpen]);

  return (
    <motion.div
      ref={ref}
      id="system-panel"
      role="dialog"
      aria-label="System settings"
      className="pointer-events-auto fixed inset-x-3 bottom-[66px] z-40 border border-bone/10 bg-void/90 px-5 pb-3 pt-4 backdrop-blur-xl sm:inset-x-auto sm:bottom-auto sm:right-9 sm:top-20 sm:w-[320px]"
      initial={{ opacity: 0, y: -8, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.6, ease } }}
      exit={{ opacity: 0, y: -6, transition: { duration: 0.3 } }}
    >
      <p className="t-label pb-3 text-bone">System</p>

      <Row label="Render">
        <div className="flex gap-4" role="radiogroup" aria-label="Render quality">
          {TIERS.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={quality === t}
              data-cursor="hover"
              onClick={() => setQuality(t)}
              className={`t-micro transition-colors ${quality === t ? "text-cyan" : "text-bone/45 hover:text-bone"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <p className="t-num mt-1.5 text-bone/35">{QUALITY[quality].particles.toLocaleString("en-US")} particles</p>
      </Row>

      <Row label="Motion">
        <p className="t-micro text-bone/70">{reduced ? "Reduced" : "Full"}</p>
        <p className="mt-1 text-[10px] leading-snug text-bone/35">Follows your system’s reduced-motion setting.</p>
      </Row>

      <Row label="Sound">
        <button
          type="button"
          role="switch"
          aria-checked={sound}
          data-cursor="hover"
          onClick={toggleSound}
          className="t-micro text-bone/70 hover:text-bone"
        >
          {sound ? "On" : "Off"}
        </button>
        <p className="mt-1 text-[10px] leading-snug text-bone/35">Synthesised ambience. No microphone.</p>
      </Row>

      <Row label="Explored">
        <p className="t-num text-bone/70">{visited} / 6</p>
      </Row>

      {!touch && (
        <Row label="Keys">
          <p className="text-[10px] leading-relaxed text-bone/50">
            <kbd className="t-num text-bone">1–6</kbd> open a system, <kbd className="t-num text-bone">Esc</kbd> return,{" "}
            <kbd className="t-num text-bone">O</kbd> observe
          </p>
        </Row>
      )}
    </motion.div>
  );
}

export function SystemPanel() {
  const open = useStore((s) => s.panelOpen);
  return <AnimatePresence>{open && <Panel />}</AnimatePresence>;
}

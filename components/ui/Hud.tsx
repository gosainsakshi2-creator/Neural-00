"use client";

import { Orbit, RotateCcw, ScanEye, SlidersHorizontal, Volume2, VolumeX } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { SYSTEM_BY_ID, SYSTEMS } from "@/lib/systems";

const ease = [0.16, 1, 0.3, 1] as const;

function useStatus(): { text: string; state: "live" | "busy" | "silent" } {
  const active = useStore((s) => s.active);
  const finale = useStore((s) => s.finale);
  const observe = useStore((s) => s.observe);
  const [busy, setBusy] = useState(false);
  const [prevActive, setPrevActive] = useState(active);

  if (active !== prevActive) {
    setPrevActive(active);
    setBusy(true);
  }

  useEffect(() => {
    if (!busy) return;
    const t = window.setTimeout(() => setBusy(false), 2600);
    return () => window.clearTimeout(t);
  }, [busy, active]);

  switch (finale) {
    case "sync":
      return { text: "Synchronizing", state: "busy" };
    case "silence":
      return { text: "Silent", state: "silent" };
    case "awakened":
    case "final":
      return { text: "Awakened", state: "live" };
    case "merge":
      return { text: "Merging", state: "busy" };
  }
  if (busy) return { text: "Processing", state: "busy" };
  if (observe) return { text: "Observing", state: "live" };
  if (active) return { text: `Node ${SYSTEM_BY_ID[active].code} online`, state: "live" };
  return { text: "System online", state: "live" };
}

function Progress() {
  const visited = useStore((s) => s.visited);
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex gap-1.5" aria-hidden>
        {SYSTEMS.map((s) => (
          <span
            key={s.id}
            className={`h-px w-5 transition-colors duration-700 ${visited.includes(s.id) ? "bg-cyan" : "bg-bone/15"}`}
          />
        ))}
      </div>
      <p className="t-micro text-bone/40">
        <span className="t-num text-bone/70">{visited.length}</span> of 6 systems explored
      </p>
    </div>
  );
}

/** Small screens can't show the whole ring at once, so every system stays one tap away. */
function SystemGrid() {
  const visited = useStore((s) => s.visited);
  const select = useStore((s) => s.select);
  return (
    <motion.ul
      aria-label="Systems"
      className="fixed inset-x-0 bottom-[54px] z-20 grid grid-cols-3 border-t border-bone/10 bg-void/60 backdrop-blur-md sm:hidden"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, transition: { delay: 1, duration: 0.9, ease } }}
      exit={{ opacity: 0, y: 8, transition: { duration: 0.35 } }}
    >
      {SYSTEMS.map((def) => (
        <li key={def.id}>
          <button
            type="button"
            onClick={() => select(def.id)}
            className="flex w-full items-center gap-2 px-4 py-3 text-left active:bg-bone/5"
          >
            <span className="t-num text-[9px] text-bone/35">{def.code}</span>
            <span className="t-micro text-bone/75">{def.name}</span>
            {visited.includes(def.id) && <span className="ml-auto h-1 w-1 rounded-full bg-cyan" aria-label="explored" />}
          </button>
        </li>
      ))}
    </motion.ul>
  );
}

interface DockItemProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  pressed?: boolean;
  expanded?: boolean;
  disabled?: boolean;
  controls?: string;
}

function DockItem({ label, icon, onClick, pressed, expanded, disabled, controls }: DockItemProps) {
  return (
    <button
      type="button"
      data-cursor="hover"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      aria-expanded={expanded}
      aria-controls={controls}
      className="dock-btn t-micro disabled:pointer-events-none disabled:opacity-30"
    >
      <span className="sm:hidden" aria-hidden>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

export function Hud() {
  const status = useStatus();
  const active = useStore((s) => s.active);
  const finale = useStore((s) => s.finale);
  const observe = useStore((s) => s.observe);
  const panelOpen = useStore((s) => s.panelOpen);
  const sound = useStore((s) => s.sound);
  const interacted = useStore((s) => s.interacted);
  const touch = useStore((s) => s.touch);
  const { returnToCore, toggleObserve, setPanelOpen, toggleSound, restart } = useStore.getState();

  const inFinale = finale !== "idle";
  const chromeHidden = inFinale && finale !== "final";
  const iconSize = 14;

  return (
    <>
      {/* Top-left: identity + live status */}
      <motion.header
        className="pointer-events-none fixed left-5 top-5 z-20 sm:left-9 sm:top-8"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 0.4, ease }}
      >
        <p className="t-label text-bone">
          Neural <span className="text-bone/30">{"//"}</span> 00
        </p>
        <p className="mt-2 flex items-center gap-2.5" role="status" aria-live="polite">
          <span className="status-dot" data-state={status.state} aria-hidden />
          <span className="t-micro text-bone/55">{status.text}</span>
        </p>
      </motion.header>

      {/* Dock: top-right on desktop, bottom bar on touch / small screens */}
      <motion.nav
        aria-label="Experience controls"
        className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-bone/10 bg-void/70 px-2 pb-[max(env(safe-area-inset-bottom),6px)] backdrop-blur-md sm:inset-x-auto sm:bottom-auto sm:right-9 sm:top-7 sm:justify-end sm:gap-7 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: chromeHidden ? 0 : 1 }}
        transition={{ duration: chromeHidden ? 0.6 : 1.2, delay: chromeHidden ? 0 : 0.6, ease }}
        style={{ pointerEvents: chromeHidden ? "none" : "auto" }}
      >
        <DockItem label="Core" icon={<Orbit size={iconSize} />} onClick={returnToCore} disabled={!active || inFinale} />
        <DockItem label="Observe" icon={<ScanEye size={iconSize} />} onClick={toggleObserve} pressed={observe} disabled={inFinale} />
        <DockItem
          label="System"
          icon={<SlidersHorizontal size={iconSize} />}
          onClick={() => setPanelOpen(!panelOpen)}
          expanded={panelOpen}
          controls="system-panel"
        />
        <DockItem label="Reset" icon={<RotateCcw size={iconSize} />} onClick={restart} />
        <DockItem
          label={sound ? "Sound on" : "Sound off"}
          icon={sound ? <Volume2 size={iconSize} /> : <VolumeX size={iconSize} />}
          onClick={toggleSound}
          pressed={sound}
        />
      </motion.nav>

      {/* Bottom-left: exploration progress (desktop) / top-right (mobile) */}
      <motion.div
        className="pointer-events-none fixed right-5 top-6 z-20 sm:bottom-9 sm:left-9 sm:right-auto sm:top-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: chromeHidden || (active && touch) ? 0 : 1 }}
        transition={{ duration: 1, delay: chromeHidden ? 0 : 0.9 }}
      >
        <Progress />
      </motion.div>

      <AnimatePresence>{!active && !inFinale && <SystemGrid key="grid" />}</AnimatePresence>

      {/* Bottom-right: how to interact, until the visitor has done so */}
      <AnimatePresence>
        {!interacted && !inFinale && (
          <motion.p
            className="t-micro pointer-events-none fixed bottom-[160px] left-1/2 z-20 -translate-x-1/2 whitespace-nowrap text-bone/35 sm:bottom-9 sm:left-auto sm:right-9 sm:translate-x-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 1.8, duration: 1.2 } }}
            exit={{ opacity: 0, transition: { duration: 0.6 } }}
          >
            {touch ? "Drag to orbit, pinch to zoom, tap a system" : "Drag to orbit, scroll to zoom, select a system"}
          </motion.p>
        )}
      </AnimatePresence>
    </>
  );
}

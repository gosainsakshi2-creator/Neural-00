"use client";

import { animate, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { QUALITY } from "@/lib/quality";
import { useStore } from "@/lib/store";
import { Bracket } from "./Bracket";

const WORDMARK = "NEURAL // 00";
const ASSEMBLE_MS = 4300;
const ease = [0.16, 1, 0.3, 1] as const;

const STATUS: Record<string, string> = {
  dormant: "Dormant",
  assembling: "Assembling",
  ready: "System ready",
};

export function IntroSequence() {
  const stage = useStore((s) => s.introStage);
  const particles = useStore((s) => QUALITY[s.quality].particles);
  const enter = useStore((s) => s.enter);
  const counter = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLDivElement>(null);

  // Timeline: dormant → particles assemble → ready.
  useEffect(() => {
    const s = useStore.getState();
    if (s.reducedMotion) {
      s.setShape("core", { duration: 1.2 });
      s.setIntroStage("ready");
      return;
    }
    const t1 = window.setTimeout(() => {
      s.setIntroStage("assembling");
      s.setShape("core", { duration: ASSEMBLE_MS / 1000, stagger: 0.55, swirl: 2.4 });
    }, 900);
    const t2 = window.setTimeout(() => s.setIntroStage("ready"), 900 + ASSEMBLE_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  // Node counter + hairline progress while assembling.
  useEffect(() => {
    if (stage === "dormant") return;
    const from = stage === "ready" ? 1 : 0;
    const controls = animate(from, 1, {
      duration: stage === "ready" ? 0 : ASSEMBLE_MS / 1000,
      ease: [0.45, 0, 0.2, 1],
      onUpdate: (v) => {
        if (counter.current) counter.current.textContent = String(Math.round(v * particles)).padStart(5, "0");
        if (bar.current) bar.current.style.transform = `scaleX(${v})`;
      },
    });
    return () => controls.stop();
  }, [stage, particles]);

  return (
    <motion.section
      aria-label="Initialisation"
      className="pointer-events-none fixed inset-0 z-30"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(10px)", transition: { duration: 1.1, ease } }}
    >
      {/* Top-left: what this is */}
      <motion.p
        className="t-label absolute left-6 top-6 text-bone/60 sm:left-10 sm:top-9"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 0.5, ease }}
      >
        Artificial intelligence
        <br />
        visualized
      </motion.p>

      <motion.button
        type="button"
        data-cursor="hover"
        onClick={enter}
        className="dock-btn t-micro pointer-events-auto absolute right-5 top-4 sm:right-9 sm:top-7"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 1 }}
      >
        Skip intro
      </motion.button>

      {/* Centre, beneath the core: the single call to action */}
      <div className="absolute inset-x-0 top-[66%] flex justify-center sm:top-[68%]">
        {stage === "ready" && (
          <motion.div
            initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1.1, ease }}
            className="pointer-events-auto"
          >
            <Bracket onClick={enter} className="text-[11px]">
              Initialize
            </Bracket>
          </motion.div>
        )}
      </div>

      {/* Bottom-left: the wordmark */}
      <h2
        aria-label={WORDMARK}
        className="t-display absolute bottom-28 left-5 text-[clamp(40px,10.5vw,148px)] text-bone sm:left-9 lg:bottom-9 lg:text-[clamp(40px,7.4vw,148px)]"
      >
        {WORDMARK.split("").map((ch, i) => (
          <motion.span
            key={i}
            aria-hidden
            className={ch === "/" ? "text-bone/30" : undefined}
            initial={{ opacity: 0, y: "0.25em", filter: "blur(10px)" }}
            animate={{ opacity: 1, y: "0em", filter: "blur(0px)" }}
            transition={{ duration: 1.4, delay: 0.15 + i * 0.045, ease }}
            style={{ display: "inline-block", whiteSpace: "pre" }}
          >
            {ch}
          </motion.span>
        ))}
      </h2>

      {/* Bottom-right: status readout */}
      <motion.div
        className="absolute bottom-6 left-5 right-5 sm:left-9 sm:right-auto sm:w-72 lg:bottom-10 lg:left-auto lg:right-10 lg:w-64"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 1.2 }}
      >
        <div className="flex items-baseline justify-between gap-6">
          <span className="t-micro text-bone/40">System status</span>
          <span className="t-num text-bone/40" aria-hidden>
            <span ref={counter}>00000</span> nodes
          </span>
        </div>
        <p className="t-label mt-2 text-bone" role="status" aria-live="polite">
          <span className={stage === "ready" ? "text-cyan" : undefined}>{STATUS[stage]}</span>
        </p>
        <div className="mt-3 h-px w-full bg-bone/10">
          <div ref={bar} className="h-px w-full origin-left bg-cyan/70" style={{ transform: "scaleX(0)" }} />
        </div>
      </motion.div>
    </motion.section>
  );
}

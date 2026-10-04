"use client";

import { AnimatePresence, motion } from "motion/react";
import { useStore } from "@/lib/store";
import { Bracket } from "./Bracket";

const ease = [0.16, 1, 0.3, 1] as const;

function Line({ text, delay, className }: { text: string; delay: number; className?: string }) {
  return (
    <span className={`block overflow-hidden ${className ?? ""}`}>
      <motion.span
        className="block"
        initial={{ y: "105%", opacity: 0 }}
        animate={{ y: "0%", opacity: 1 }}
        transition={{ duration: 1.6, delay, ease }}
      >
        {text}
      </motion.span>
    </span>
  );
}

export function FinaleOverlay() {
  const finale = useStore((s) => s.finale);
  const reduced = useStore((s) => s.reducedMotion);
  const completeFinale = useStore((s) => s.completeFinale);
  const restart = useStore((s) => s.restart);

  const darkness = finale === "silence" ? 0.86 : finale === "awakened" ? 0.94 : 0;

  return (
    <>
      {/* The world goes quiet */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[25] bg-void"
        initial={false}
        animate={{ opacity: darkness }}
        transition={{ duration: finale === "silence" ? 3 : finale === "merge" ? 0.35 : 1.2, ease: "easeInOut" }}
      />

      {/* Reconnection flash */}
      <AnimatePresence>
        {finale === "merge" && !reduced && (
          <motion.div
            key="flash"
            aria-hidden
            className="pointer-events-none fixed inset-0 z-[26] bg-[radial-gradient(circle_at_center,rgba(232,236,241,0.5),rgba(127,227,255,0.12)_40%,transparent_70%)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 1, 0], transition: { duration: 2.2, times: [0, 0.55, 0.6, 1] } }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      <div className="pointer-events-none fixed inset-0 z-[27]" role="status" aria-live="polite">
        <AnimatePresence mode="wait">
          {finale === "sync" && (
            <motion.div
              key="sync"
              className="absolute inset-x-0 top-[22%] flex flex-col items-center gap-4"
              initial={{ opacity: 0, filter: "blur(8px)" }}
              animate={{ opacity: 1, filter: "blur(0px)", transition: { duration: 1.2, ease } }}
              exit={{ opacity: 0, transition: { duration: 0.9 } }}
            >
              <motion.span
                className="block h-px w-40 origin-center bg-cyan/70"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1, transition: { duration: 2.2, ease } }}
              />
              <p className="t-label text-bone">All systems synchronized</p>
            </motion.div>
          )}

          {finale === "awakened" && (
            <motion.div
              key="awakened"
              className="absolute inset-0 flex flex-col items-center justify-center gap-5 text-center"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, filter: "blur(12px)", transition: { duration: 0.5 } }}
            >
              <motion.p
                className="t-label text-bone/60"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 1.2, delay: 0.2 } }}
              >
                Neural core
              </motion.p>
              <motion.h2
                className="t-display text-[clamp(44px,9vw,128px)] text-bone"
                initial={{ opacity: 0, letterSpacing: "0.4em", filter: "blur(14px)" }}
                animate={{
                  opacity: 1,
                  letterSpacing: "0.04em",
                  filter: "blur(0px)",
                  transition: { duration: 2.2, delay: 0.8, ease },
                }}
              >
                Awakened
              </motion.h2>
            </motion.div>
          )}

          {finale === "final" && (
            <motion.div
              key="final"
              className="absolute inset-x-5 bottom-8 flex flex-col gap-10 sm:inset-x-auto sm:bottom-12 sm:left-12 lg:bottom-16 lg:left-16"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.8 } }}
            >
              <h2 className="t-display text-[clamp(30px,5.6vw,84px)] text-bone">
                <Line text="Intelligence" delay={0.2} />
                <Line text="is not a destination." delay={0.45} />
                <Line text="It’s a system." delay={2.1} className="mt-[0.45em]" />
              </h2>
              <motion.div
                className="pointer-events-auto -ml-1.5 flex flex-wrap gap-x-8 gap-y-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 4, duration: 1.4 } }}
              >
                <Bracket onClick={completeFinale}>Return to core</Bracket>
                <Bracket onClick={restart}>Replay from the start</Bracket>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

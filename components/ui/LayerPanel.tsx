"use client";

import { AnimatePresence, motion } from "motion/react";
import { useStore } from "@/lib/store";
import { SYSTEM_BY_ID, type SystemDef } from "@/lib/systems";
import { Bracket } from "./Bracket";
import { AgentRoster, FlowList, GenerationPrompt, TermMeters, VoiceStages, VoiceTranscript } from "./SystemWidgets";

const ease = [0.16, 1, 0.3, 1] as const;

function Widget({ def }: { def: SystemDef }) {
  switch (def.id) {
    case "voice":
      return <VoiceStages def={def} />;
    case "agents":
      return <AgentRoster />;
    case "generation":
      return (
        <div className="flex flex-col gap-6">
          <GenerationPrompt />
          <FlowList def={def} />
        </div>
      );
    default:
      return def.flow ? <FlowList def={def} /> : <TermMeters def={def} />;
  }
}

function Panel({ def }: { def: SystemDef }) {
  const returnToCore = useStore((s) => s.returnToCore);
  const hiddenForObserver = useStore((s) => s.observe);

  return (
    <motion.section
      aria-labelledby="layer-title"
      className={`pointer-events-auto fixed inset-x-0 bottom-[58px] z-20 px-5 pb-4 pt-5 sm:inset-x-auto sm:bottom-auto sm:left-9 sm:top-1/2 sm:w-[300px] sm:-translate-y-1/2 sm:p-0 lg:left-12 ${hiddenForObserver ? "max-sm:hidden" : ""}`}
      initial={{ opacity: 0, x: -16, filter: "blur(8px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)", transition: { duration: 1.1, delay: 0.9, ease } }}
      exit={{ opacity: 0, x: -10, filter: "blur(6px)", transition: { duration: 0.5, ease } }}
    >
      {/* Readability scrim on small screens only */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-void via-void/85 to-transparent sm:hidden" />

      <p className="t-micro text-bone/40">
        Node <span className="t-num text-bone/70">{def.code}</span> <span className="text-bone/20">/</span>{" "}
        <span className="t-num">06</span>
      </p>
      <h2 id="layer-title" className="t-display mt-3 text-[clamp(28px,3.4vw,46px)] text-bone">
        {def.layer}
      </h2>
      <p className="t-body mt-4 max-w-[34ch] max-sm:hidden">{def.summary}</p>

      <div className="mt-6 sm:mt-9">
        <Widget def={def} />
      </div>

      <div className="mt-5 -ml-1.5 sm:mt-10">
        <Bracket onClick={returnToCore}>Return to core</Bracket>
      </div>
    </motion.section>
  );
}

export function LayerPanel() {
  const active = useStore((s) => (s.finale === "idle" ? s.active : null));

  return (
    <>
      <AnimatePresence mode="wait">{active && <Panel key={active} def={SYSTEM_BY_ID[active]} />}</AnimatePresence>
      <AnimatePresence>
        {active === "voice" && (
          <motion.div
            key="voice-transcript"
            className="pointer-events-none fixed inset-x-5 top-24 z-20 flex justify-center sm:inset-x-auto sm:bottom-12 sm:left-1/2 sm:top-auto sm:w-[420px] sm:-translate-x-1/2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 1.4, duration: 1, ease } }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
          >
            <VoiceTranscript />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

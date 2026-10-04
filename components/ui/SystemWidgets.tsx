"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { AGENTS } from "@/lib/layouts";
import { useStore, type VoiceStage } from "@/lib/store";
import type { SystemDef } from "@/lib/systems";

const ease = [0.16, 1, 0.3, 1] as const;

/* ------------------------------------------------------------------ */
/* Sequential flow: INPUT ↓ CONTEXT ↓ …                                 */
/* ------------------------------------------------------------------ */

export function FlowList({ def }: { def: SystemDef }) {
  const step = useStore((s) => s.flowStep);
  return (
    <ol className="flex flex-col" aria-label={`${def.name} sequence`}>
      {def.terms.map((term, i) => {
        const state = i === step ? "active" : i < step ? "done" : "next";
        return (
          <li key={term} className="flex flex-col" aria-current={state === "active" ? "step" : undefined}>
            <span className="flex items-center gap-3">
              <span
                className={`h-px transition-all duration-700 ${state === "active" ? "w-6 bg-cyan" : state === "done" ? "w-3 bg-bone/40" : "w-3 bg-bone/15"}`}
                aria-hidden
              />
              <span
                className={`t-label transition-colors duration-500 ${state === "active" ? "text-bone" : state === "done" ? "text-bone/50" : "text-bone/25"}`}
              >
                {term}
              </span>
            </span>
            {i < def.terms.length - 1 && (
              <span aria-hidden className={`ml-[3px] py-0.5 text-[10px] leading-none transition-colors duration-500 ${i < step ? "text-cyan/60" : "text-bone/15"}`}>
                ↓
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* Terms with a quiet live meter                                        */
/* ------------------------------------------------------------------ */

export function TermMeters({ def }: { def: SystemDef }) {
  const reduced = useStore((s) => s.reducedMotion);
  const [levels, setLevels] = useState(() => def.terms.map((_, i) => 0.4 + i * 0.12));

  useEffect(() => {
    const id = window.setInterval(
      () => setLevels((prev) => prev.map((v) => Math.min(0.98, Math.max(0.18, v + (Math.random() - 0.5) * 0.22)))),
      reduced ? 2000 : 700,
    );
    return () => window.clearInterval(id);
  }, [reduced]);

  return (
    <ul className="flex flex-col gap-3.5">
      {def.terms.map((term, i) => (
        <li key={term} className="grid grid-cols-[1fr_72px] items-center gap-4">
          <span className="t-label text-bone/80">{term}</span>
          <span className="relative h-px bg-bone/10" aria-hidden>
            <span
              className="absolute inset-y-0 left-0 bg-cyan/70 transition-[width] duration-700 ease-out"
              style={{ width: `${levels[i] * 100}%` }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Voice                                                               */
/* ------------------------------------------------------------------ */

const VOICE_ORDER: VoiceStage[] = ["listening", "processing", "generating"];

export function VoiceStages({ def }: { def: SystemDef }) {
  const stage = useStore((s) => s.voiceStage);
  const index = VOICE_ORDER.indexOf(stage);
  return (
    <ul className="flex flex-col gap-3">
      {def.terms.map((term, i) => (
        <li key={term} className="flex items-center gap-3">
          <span
            className={`h-1.5 w-1.5 rounded-full transition-all duration-500 ${i === index ? "bg-cyan shadow-[0_0_10px_#7fe3ff]" : "bg-bone/15"}`}
            aria-hidden
          />
          <span className={`t-label transition-colors duration-500 ${i === index ? "text-bone" : "text-bone/30"}`}>{term}</span>
        </li>
      ))}
    </ul>
  );
}

function useTyped(text: string, run: boolean, speed = 42, resetKey = 0) {
  const [count, setCount] = useState(0);
  const [prev, setPrev] = useState({ text, run, resetKey });
  if (prev.text !== text || prev.run !== run || prev.resetKey !== resetKey) {
    setPrev({ text, run, resetKey });
    setCount(0);
  }
  useEffect(() => {
    if (!run) return;
    const id = window.setInterval(() => setCount((c) => (c >= text.length ? c : c + 1)), speed);
    return () => window.clearInterval(id);
  }, [text, run, speed, resetKey]);
  return { shown: run ? text.slice(0, count) : "", done: count >= text.length };
}

/** The simulated exchange. Nothing is captured: this is a visual dialogue only. */
export function VoiceTranscript() {
  const stage = useStore((s) => s.voiceStage);
  const [cycle, setCycle] = useState(0);
  const [prevStage, setPrevStage] = useState(stage);
  if (stage !== prevStage) {
    setPrevStage(stage);
    if (stage === "listening") setCycle((c) => c + 1);
  }
  const user = useTyped("Can you understand me?", stage !== "idle", 42, cycle);
  const reply = useTyped("Yes. Context received.", stage === "generating", 55);

  return (
    <div className="flex w-full max-w-md flex-col gap-4" aria-live="polite">
      <AnimatePresence mode="popLayout">
        {stage !== "idle" && (
          <motion.div
            key="user"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease }}
            className="flex gap-5"
          >
            <span className="t-micro w-14 shrink-0 pt-[3px] text-bone/35">User</span>
            <p className={`text-[15px] font-light text-bone ${!user.done ? "caret" : ""}`}>“{user.shown}”</p>
          </motion.div>
        )}
        {(stage === "processing" || stage === "generating") && (
          <motion.div
            key="system"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease }}
            className="flex gap-5"
          >
            <span className="t-micro w-14 shrink-0 pt-[3px] text-cyan/70">System</span>
            {stage === "processing" ? (
              <p className="text-[15px] font-light text-bone/50">
                Processing<span className="caret" />
              </p>
            ) : (
              <p className={`text-[15px] font-light text-bone ${!reply.done ? "caret" : ""}`}>“{reply.shown}”</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <p className="t-micro text-bone/25">Simulation. No microphone is used.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Agents                                                              */
/* ------------------------------------------------------------------ */

const MESSAGES = [
  ["Research", "Planning", "sources.bundle"],
  ["Planning", "Coding", "task.graph"],
  ["Coding", "Analysis", "patch.diff"],
  ["Analysis", "Research", "gaps.query"],
  ["Planning", "Analysis", "criteria.spec"],
  ["Coding", "Research", "api.lookup"],
] as const;

export function AgentRoster() {
  const focus = useStore((s) => s.agentFocus);
  const setFocus = useStore((s) => s.setAgentFocus);
  const reduced = useStore((s) => s.reducedMotion);
  const [log, setLog] = useState<{ id: number; text: readonly [string, string, string]; size: string }[]>([]);
  // Lives outside the effect so ids stay unique when it re-runs (Strict Mode, motion toggle).
  const nextId = useRef(0);

  useEffect(() => {
    const push = () => {
      const id = nextId.current++;
      const text = MESSAGES[id % MESSAGES.length];
      const size = `${(0.6 + ((id * 37) % 23) / 10).toFixed(1)}kb`;
      setLog((prev) => [{ id, text, size }, ...prev].slice(0, 4));
    };
    push();
    const id = window.setInterval(push, reduced ? 3000 : 1400);
    return () => window.clearInterval(id);
  }, [reduced]);

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col gap-1">
        {AGENTS.map((a) => {
          const on = focus === a.id;
          return (
            <li key={a.id}>
              <button
                type="button"
                data-cursor="hover"
                aria-pressed={on}
                onClick={() => setFocus(on ? null : a.id)}
                className="group grid w-full grid-cols-[1fr_auto] items-center gap-4 py-1.5 text-left"
              >
                <span className={`t-label transition-colors ${on ? "text-bone" : "text-bone/55 group-hover:text-bone"}`}>{a.label}</span>
                <span className={`t-micro transition-colors ${on ? "text-cyan" : "text-bone/25"}`}>{on ? "Active" : "Standing by"}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <ul className="hidden flex-col gap-1.5 border-t border-bone/10 pt-4 sm:flex" aria-label="Recent messages between agents">
        {log.map((m, i) => (
          <li
            key={m.id}
            className="grid grid-cols-[1fr_auto] gap-3 text-[10px] transition-opacity duration-700"
            style={{ opacity: 1 - i * 0.24 }}
          >
            <span className="t-micro text-bone/60">
              {m.text[0]} <span className="text-cyan/70">→</span> {m.text[1]}
            </span>
            <span className="t-num text-bone/35">{m.text[2]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Generation prompt                                                   */
/* ------------------------------------------------------------------ */

export function GenerationPrompt() {
  const prompt = useStore((s) => s.genPrompt);
  const typed = useTyped(prompt, prompt.length > 0, 34);
  return (
    <div className="border-l border-cyan/50 pl-4">
      <p className="t-micro text-bone/35">Prompt</p>
      <p className={`mt-1.5 text-[14px] font-light leading-snug text-bone ${!typed.done ? "caret" : ""}`}>{typed.shown}</p>
    </div>
  );
}

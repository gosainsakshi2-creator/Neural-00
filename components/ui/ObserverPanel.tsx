"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { SYSTEMS } from "@/lib/systems";

const ease = [0.16, 1, 0.3, 1] as const;

/** Demonstration timings from the brief. Stages overlap, so the total is less than their sum. */
const STAGES = [
  { label: "Input", ms: 12.4 },
  { label: "Perception", ms: 8.2 },
  { label: "Memory", ms: 4.7 },
  { label: "Reasoning", ms: 31.8 },
  { label: "Generation", ms: 21.2 },
];
const TOTAL = 57.1;
const MAX_STAGE = 31.8;
const HISTORY = 48;
const CORES = 8;

interface Telemetry {
  jitter: number[];
  network: number[];
  cores: number[];
  nodes: number[];
}

function seed(): Telemetry {
  return {
    jitter: STAGES.map(() => 1),
    network: Array.from({ length: HISTORY }, (_, i) => 0.4 + Math.sin(i * 0.4) * 0.15),
    cores: Array.from({ length: CORES }, (_, i) => 0.3 + (i % 3) * 0.15),
    nodes: SYSTEMS.map(() => 0.2),
  };
}

function useTelemetry(active: string | null, visited: string[], reduced: boolean): Telemetry {
  const [t, setT] = useState(seed);

  useEffect(() => {
    const id = window.setInterval(
      () =>
        setT((prev) => ({
          jitter: prev.jitter.map(() => 1 + (Math.random() - 0.5) * 0.06),
          network: [
            ...prev.network.slice(1),
            Math.min(1, Math.max(0.05, prev.network[HISTORY - 1] + (Math.random() - 0.5) * 0.28 + (active ? 0.04 : -0.02))),
          ],
          cores: prev.cores.map((c) => Math.min(1, Math.max(0.08, c + (Math.random() - 0.5) * 0.3 + (active ? 0.05 : -0.03)))),
          nodes: SYSTEMS.map((s, i) => {
            const target = s.id === active ? 0.85 : visited.includes(s.id) ? 0.35 : 0.12;
            return prev.nodes[i] + (target + (Math.random() - 0.5) * 0.12 - prev.nodes[i]) * 0.35;
          }),
        })),
      reduced ? 1000 : 180,
    );
    return () => window.clearInterval(id);
  }, [active, visited, reduced]);

  return t;
}

function Sparkline({ values }: { values: number[] }) {
  const w = 240;
  const h = 40;
  const d = values.map((v, i) => `${i === 0 ? "M" : "L"}${((i / (values.length - 1)) * w).toFixed(1)},${(h - v * h).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-10 w-full overflow-visible" aria-hidden preserveAspectRatio="none">
      <path d={`${d} L${w},${h} L0,${h} Z`} fill="rgb(127 227 255 / 0.06)" />
      <path d={d} fill="none" stroke="#7fe3ff" strokeOpacity="0.8" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-bone/10 pt-4">
      <h3 className="t-micro mb-3 text-bone/40">{title}</h3>
      {children}
    </section>
  );
}

function Diagnostics() {
  const active = useStore((s) => s.active);
  const visited = useStore((s) => s.visited);
  const reduced = useStore((s) => s.reducedMotion);
  const toggle = useStore((s) => s.toggleObserve);
  const t = useTelemetry(active, visited, reduced);
  const avg = t.jitter.reduce((a, b) => a + b, 0) / t.jitter.length;

  return (
    <motion.aside
      aria-label="Diagnostic layer"
      className="pointer-events-auto fixed inset-x-0 bottom-[58px] z-20 max-h-[62vh] overflow-y-auto bg-void/85 px-5 pb-5 pt-5 backdrop-blur-md sm:inset-x-auto sm:bottom-auto sm:right-9 sm:top-24 sm:max-h-[calc(100vh-8rem)] sm:w-[280px] sm:bg-transparent sm:p-0 sm:backdrop-blur-none"
      initial={{ opacity: 0, x: 16, filter: "blur(8px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)", transition: { duration: 0.9, ease } }}
      exit={{ opacity: 0, x: 10, filter: "blur(6px)", transition: { duration: 0.4 } }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="t-micro text-cyan/80">Observer</p>
          <h2 className="t-label mt-1.5 text-bone">Neural core</h2>
        </div>
        <button type="button" data-cursor="hover" onClick={toggle} className="dock-btn t-micro -mt-2">
          Close
        </button>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-bone/40">
        Demonstration values. These figures are simulated for this visualisation and are not measurements of any real system.
      </p>

      <div className="mt-5 flex flex-col gap-5">
        <Section title="Latency (demo)">
          <table className="w-full border-collapse">
            <tbody>
              {STAGES.map((s, i) => (
                <tr key={s.label} className="align-middle">
                  <th scope="row" className="t-micro py-1 text-left font-normal text-bone/70">
                    {s.label}
                  </th>
                  <td className="w-16 py-1 pr-3">
                    <span className="block h-px bg-bone/10">
                      <span
                        className="block h-px bg-electric transition-[width] duration-300"
                        style={{ width: `${((s.ms * t.jitter[i]) / MAX_STAGE) * 100}%` }}
                      />
                    </span>
                  </td>
                  <td className="t-num w-14 py-1 text-right text-bone">{(s.ms * t.jitter[i]).toFixed(1)}ms</td>
                </tr>
              ))}
              <tr className="border-t border-bone/15">
                <th scope="row" className="t-micro pt-2 text-left font-normal text-bone">
                  Total
                </th>
                <td className="t-micro pt-2 text-[8px] text-bone/30">overlapped</td>
                <td className="t-num pt-2 text-right text-cyan">{(TOTAL * avg).toFixed(1)}ms</td>
              </tr>
            </tbody>
          </table>
        </Section>

        <Section title="Network activity">
          <Sparkline values={t.network} />
        </Section>

        <Section title="Compute threads">
          <div className="flex h-8 items-end gap-1.5" aria-hidden>
            {t.cores.map((c, i) => (
              <span key={i} className="flex h-full flex-1 items-end bg-bone/[0.04]">
                <span className="block w-full bg-violet/70 transition-[height] duration-300" style={{ height: `${c * 100}%` }} />
              </span>
            ))}
          </div>
        </Section>

        <Section title="Node activity">
          <ul className="flex flex-col gap-1.5">
            {SYSTEMS.map((s, i) => {
              const state = s.id === active ? "Active" : visited.includes(s.id) ? "Explored" : "Idle";
              return (
                <li key={s.id} className="grid grid-cols-[18px_1fr_36px_64px] items-center gap-2">
                  <span className="t-num text-bone/30">{s.code}</span>
                  <span className="t-micro text-bone/70">{s.name}</span>
                  <span className="block h-px bg-bone/10">
                    <span className="block h-px bg-cyan/70 transition-[width] duration-300" style={{ width: `${t.nodes[i] * 100}%` }} />
                  </span>
                  <span className={`t-micro text-right text-[8px] ${state === "Active" ? "text-cyan" : "text-bone/35"}`}>{state}</span>
                </li>
              );
            })}
          </ul>
        </Section>
      </div>
    </motion.aside>
  );
}

export function ObserverPanel() {
  const open = useStore((s) => s.observe && s.finale === "idle" && s.phase === "main");
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="observer-scrim"
          aria-hidden
          className="pointer-events-none fixed inset-y-0 right-0 z-[15] hidden w-[440px] bg-gradient-to-l from-void via-void/80 to-transparent sm:block"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.8 } }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
        />
      )}
      {open && <Diagnostics key="observer" />}
    </AnimatePresence>
  );
}

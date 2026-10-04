"use client";

import { AGENTS, REASONING_LAYERS, VISION_OBJECTS } from "@/lib/layouts";
import { useStore } from "@/lib/store";
import { SYSTEMS, type SystemDef } from "@/lib/systems";
import { Anchored } from "./Anchored";

/* ------------------------------------------------------------------ */
/* System nodes                                                        */
/* ------------------------------------------------------------------ */

function NodeLabel({ def }: { def: SystemDef }) {
  const show = useStore((s) => s.phase === "main" && s.active === null && s.finale === "idle");
  const hovered = useStore((s) => s.hovered === def.id);
  const visited = useStore((s) => s.visited.includes(def.id));
  const select = useStore((s) => s.select);
  const setHovered = useStore((s) => s.setHovered);

  return (
    <button
      type="button"
      tabIndex={show ? 0 : -1}
      aria-hidden={!show}
      aria-label={`Open ${def.name}, system ${def.code}${visited ? ", explored" : ""}`}
      data-cursor="hover"
      onClick={() => select(def.id)}
      onMouseEnter={() => setHovered(def.id)}
      onMouseLeave={() => setHovered(null)}
      onFocus={() => setHovered(def.id)}
      onBlur={() => setHovered(null)}
      className={`node-label ${show ? "is-shown" : ""} ${hovered ? "is-hovered" : ""}`}
      style={{ transitionDelay: show ? `${380 + def.index * 110}ms` : "0ms" }}
    >
      <span className="node-label__code">{def.code}</span>
      <span className="node-label__name">{def.name}</span>
      <span className={`node-label__mark ${visited ? "is-on" : ""}`} aria-hidden />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Memory                                                              */
/* ------------------------------------------------------------------ */

function MemoryLabels() {
  const recall = useStore((s) => s.memoryRecall);
  if (!recall) return null;
  return (
    <Anchored id="memory-recall">
      <div key={recall.id} className="scene-tag scene-tag--enter">
        <span>Recall</span>
        <span className="scene-tag__mono">{recall.address}</span>
        <span className="scene-tag__mono">{recall.score}</span>
      </div>
    </Anchored>
  );
}

/* ------------------------------------------------------------------ */
/* Vision                                                              */
/* ------------------------------------------------------------------ */

// Objects are revealed bottom-up by the scan, so tags appear in order of centre height.
const VISION_ORDER = VISION_OBJECTS.map((o) => [...VISION_OBJECTS].sort((a, b) => a.center[1] - b.center[1]).indexOf(o));

function VisionLabels() {
  const revealed = useStore((s) => s.visionRevealed);
  return (
    <>
      {VISION_OBJECTS.map((o, i) => (
        <Anchored key={o.label} id={`vision-${i}`}>
          <div className={`scene-tag ${VISION_ORDER[i] < revealed ? "is-on" : ""}`}>
            <span>
              {String(i + 1).padStart(2, "0")} {o.label}
            </span>
            <span className="scene-tag__mono">{o.confidence.toFixed(2)}</span>
            <span className="scene-tag__mono">{Math.hypot(o.center[0], o.center[2] - 10).toFixed(1)}m</span>
          </div>
        </Anchored>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Reasoning                                                           */
/* ------------------------------------------------------------------ */

function ReasoningLabels() {
  const step = useStore((s) => s.flowStep);
  return (
    <>
      {REASONING_LAYERS.map((layer, i) => (
        <Anchored key={layer.label} id={`reasoning-${i}`}>
          <div className={`scene-layer max-sm:hidden ${i === step ? "is-active" : ""} ${i < step ? "is-done" : ""}`}>
            <span className="scene-layer__index">{String(i + 1).padStart(2, "0")}</span>
            <span>{layer.label}</span>
          </div>
        </Anchored>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Agents                                                              */
/* ------------------------------------------------------------------ */

function AgentLabels() {
  const focus = useStore((s) => s.agentFocus);
  const setFocus = useStore((s) => s.setAgentFocus);
  return (
    <>
      {AGENTS.map((agent, i) => {
        const active = focus === agent.id;
        return (
          <Anchored key={agent.id} id={`agent-${agent.id}`}>
            <button
              type="button"
              data-cursor="hover"
              aria-pressed={active}
              onClick={() => setFocus(active ? null : agent.id)}
              className={`agent-label ${active ? "is-active" : ""} ${focus && !active ? "is-dim" : ""}`}
              style={{ animationDelay: `${600 + i * 120}ms` }}
            >
              <span className="agent-label__name">{agent.label}</span>
              <span className="agent-label__task">{active ? agent.task : "Standing by"}</span>
            </button>
          </Anchored>
        );
      })}
      <Anchored id="agent-hub">
        <div className="scene-tag scene-tag--enter">
          <span>Orchestrator</span>
        </div>
      </Anchored>
    </>
  );
}

/** Every label that floats in the 3D scene, rendered in one ordinary DOM tree. */
export function SceneLabels() {
  const phase = useStore((s) => s.phase);
  const active = useStore((s) => (s.finale === "idle" ? s.active : null));

  return (
    <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
      {phase === "main" &&
        SYSTEMS.map((def) => (
          <Anchored key={def.id} id={`node-${def.id}`}>
            <NodeLabel def={def} />
          </Anchored>
        ))}
      {active === "memory" && <MemoryLabels />}
      {active === "vision" && <VisionLabels />}
      {active === "reasoning" && <ReasoningLabels />}
      {active === "agents" && <AgentLabels />}
    </div>
  );
}

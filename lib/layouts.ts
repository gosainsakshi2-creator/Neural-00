import { dist3, fibPoint, TAU, type Vec3 } from "./math";
import { mulberry32 } from "./random";

/* ------------------------------------------------------------------ */
/* Core + system ring                                                  */
/* ------------------------------------------------------------------ */

export const CORE_RADIUS = 2.2;
export const NODE_RING_RADIUS = 6.4;
export const SYSTEM_COUNT = 6;

export function systemAngle(index: number): number {
  return (index / SYSTEM_COUNT) * TAU + Math.PI / 6;
}

export function systemPosition(index: number): Vec3 {
  const a = systemAngle(index);
  return [Math.sin(a) * NODE_RING_RADIUS, index % 2 === 0 ? 0.75 : -0.75, Math.cos(a) * NODE_RING_RADIUS];
}

/** Link each point to its k nearest neighbours, without duplicates. */
export function nearestLinks(points: Vec3[], k: number): [number, number][] {
  const seen = new Set<string>();
  const links: [number, number][] = [];
  points.forEach((p, i) => {
    points
      .map((q, j) => ({ j, d: i === j ? Infinity : dist3(p, q) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, k)
      .forEach(({ j }) => {
        const a = Math.min(i, j);
        const b = Math.max(i, j);
        const key = `${a}-${b}`;
        if (!seen.has(key)) {
          seen.add(key);
          links.push([a, b]);
        }
      });
  });
  return links;
}

/* ------------------------------------------------------------------ */
/* Memory                                                              */
/* ------------------------------------------------------------------ */

export interface MemoryCluster {
  center: Vec3;
  spread: number;
}

export const MEMORY_CLUSTERS: MemoryCluster[] = (() => {
  const r = mulberry32(21);
  const n = 14;
  const out: MemoryCluster[] = [];
  for (let i = 0; i < n; i++) {
    const [x, y, z] = fibPoint(i, n);
    const rad = 3.1 + r() * 1.7;
    out.push({ center: [x * rad, y * rad * 0.78, z * rad], spread: 0.26 + r() * 0.34 });
  }
  out.push({ center: [0, 0, 0], spread: 0.5 });
  return out;
})();

export const MEMORY_LINKS = nearestLinks(
  MEMORY_CLUSTERS.map((c) => c.center),
  3,
);

/* ------------------------------------------------------------------ */
/* Vision                                                              */
/* ------------------------------------------------------------------ */

export const VISION_FLOOR_Y = -2.4;

export type VisionKind = "cube" | "sphere" | "torus" | "pillar";

export interface VisionObject {
  kind: VisionKind;
  label: string;
  center: Vec3;
  size: Vec3;
  confidence: number;
}

export const VISION_OBJECTS: VisionObject[] = [
  { kind: "cube", label: "Cube", center: [-2.7, -1.4, 0.6], size: [2, 2, 2], confidence: 0.98 },
  { kind: "sphere", label: "Sphere", center: [0.4, -1.15, -1.5], size: [2.5, 2.5, 2.5], confidence: 0.96 },
  { kind: "torus", label: "Ring", center: [2.9, -1.0, 0.9], size: [2.76, 2.76, 0.76], confidence: 0.91 },
  { kind: "pillar", label: "Column", center: [-0.4, -0.4, -4.4], size: [1, 4, 1], confidence: 0.87 },
];

/* ------------------------------------------------------------------ */
/* Reasoning                                                           */
/* ------------------------------------------------------------------ */

export interface ReasoningLayer {
  label: string;
  count: number;
  y: number;
  radius: number;
}

export const REASONING_LAYERS: ReasoningLayer[] = [
  { label: "Input", count: 1, y: 4.4, radius: 0 },
  { label: "Context", count: 4, y: 2.2, radius: 2.3 },
  { label: "Reasoning", count: 7, y: 0, radius: 3.7 },
  { label: "Decision", count: 4, y: -2.2, radius: 2.3 },
  { label: "Output", count: 1, y: -4.4, radius: 0 },
];

export interface GraphNode {
  pos: Vec3;
  layer: number;
}

export const REASONING_NODES: GraphNode[] = REASONING_LAYERS.flatMap((layer, L) =>
  Array.from({ length: layer.count }, (_, j) => {
    const a = (j / layer.count) * TAU + L * 0.55;
    return {
      pos: [Math.cos(a) * layer.radius, layer.y, Math.sin(a) * layer.radius * 0.8] as Vec3,
      layer: L,
    };
  }),
);

export const REASONING_EDGES: [number, number][] = (() => {
  const r = mulberry32(7);
  const edges = new Set<string>();
  const byLayer = REASONING_LAYERS.map((_, L) =>
    REASONING_NODES.map((n, i) => ({ n, i })).filter(({ n }) => n.layer === L),
  );
  for (let L = 0; L < byLayer.length - 1; L++) {
    const from = byLayer[L];
    const to = byLayer[L + 1];
    for (const { n, i } of from) {
      if (from.length === 1 || to.length === 1) {
        to.forEach(({ i: j }) => edges.add(`${i}-${j}`));
        continue;
      }
      const sorted = [...to].sort((a, b) => dist3(n.pos, a.n.pos) - dist3(n.pos, b.n.pos));
      sorted.slice(0, 2).forEach(({ i: j }) => edges.add(`${i}-${j}`));
      if (r() < 0.4) edges.add(`${i}-${sorted[2 + Math.floor(r() * (sorted.length - 2))].i}`);
    }
    // every target needs at least one incoming edge
    for (const { n, i: j } of to) {
      const hasIncoming = [...edges].some((e) => e.endsWith(`-${j}`));
      if (!hasIncoming) {
        const src = [...from].sort((a, b) => dist3(n.pos, a.n.pos) - dist3(n.pos, b.n.pos))[0];
        edges.add(`${src.i}-${j}`);
      }
    }
  }
  return [...edges].map((e) => e.split("-").map(Number) as [number, number]);
})();

/* ------------------------------------------------------------------ */
/* Agents                                                              */
/* ------------------------------------------------------------------ */

export const AGENT_IDS = ["research", "coding", "planning", "analysis"] as const;
export type AgentId = (typeof AGENT_IDS)[number];

export interface AgentDef {
  id: AgentId;
  label: string;
  pos: Vec3;
  task: string;
}

export const AGENTS: AgentDef[] = [
  { id: "research", label: "Research", pos: [-3.7, 1.7, 0.4], task: "Retrieving sources" },
  { id: "coding", label: "Coding", pos: [3.6, 1.9, -0.6], task: "Writing a patch" },
  { id: "planning", label: "Planning", pos: [-3.0, -2.0, -0.9], task: "Ordering subtasks" },
  { id: "analysis", label: "Analysis", pos: [3.2, -1.8, 1.0], task: "Checking results" },
];

export const AGENT_HUB: Vec3 = [0, 0, 0];

export interface AgentArc {
  from: number; // agent index, 4 = hub
  to: number;
  lift: number;
}

export const AGENT_ARCS: AgentArc[] = (() => {
  const arcs: AgentArc[] = [];
  for (let a = 0; a < AGENTS.length; a++) {
    for (let b = a + 1; b < AGENTS.length; b++) {
      arcs.push({ from: a, to: b, lift: (a + b) % 2 === 0 ? 1.1 : -0.9 });
    }
    arcs.push({ from: a, to: 4, lift: 0.35 });
  }
  return arcs;
})();

export const agentPoint = (index: number): Vec3 => (index === 4 ? AGENT_HUB : AGENTS[index].pos);

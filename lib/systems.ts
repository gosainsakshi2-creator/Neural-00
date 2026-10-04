export const SYSTEM_IDS = ["memory", "vision", "reasoning", "voice", "agents", "generation"] as const;

export type SystemId = (typeof SYSTEM_IDS)[number];

export interface SystemDef {
  id: SystemId;
  index: number;
  code: string;
  name: string;
  layer: string;
  summary: string;
  terms: readonly string[];
  /** Terms read as a sequence (rendered with arrows and a moving highlight). */
  flow: boolean;
}

export const SYSTEMS: readonly SystemDef[] = [
  {
    id: "memory",
    index: 0,
    code: "01",
    name: "Memory",
    layer: "Memory layer",
    summary: "Stored context, gathered into clusters the system can recall and connect.",
    terms: ["Recall", "Association", "Context"],
    flow: false,
  },
  {
    id: "vision",
    index: 1,
    code: "02",
    name: "Vision",
    layer: "Vision system",
    summary: "Raw depth points, resolved into objects and then into a scene.",
    terms: ["Perception", "Depth", "Objects", "Scene"],
    flow: false,
  },
  {
    id: "reasoning",
    index: 2,
    code: "03",
    name: "Reasoning",
    layer: "Reasoning",
    summary: "Signals branch, compete and settle into a single decision.",
    terms: ["Input", "Context", "Reasoning", "Decision", "Output"],
    flow: true,
  },
  {
    id: "voice",
    index: 3,
    code: "04",
    name: "Voice",
    layer: "Voice interface",
    summary: "A simulated exchange. Nothing is recorded and no microphone is used.",
    terms: ["Listening", "Processing", "Generating"],
    flow: false,
  },
  {
    id: "agents",
    index: 4,
    code: "05",
    name: "Agents",
    layer: "Agent network",
    summary: "Four autonomous agents handing work to one another. Select one to wake it.",
    terms: ["Research", "Coding", "Planning", "Analysis"],
    flow: false,
  },
  {
    id: "generation",
    index: 5,
    code: "06",
    name: "Generation",
    layer: "Generation layer",
    summary: "Noise goes in. Structure comes out.",
    terms: ["Prompt", "Latent space", "Transformation", "Output"],
    flow: true,
  },
];

export const SYSTEM_BY_ID = Object.fromEntries(SYSTEMS.map((s) => [s.id, s])) as Record<
  SystemId,
  SystemDef
>;

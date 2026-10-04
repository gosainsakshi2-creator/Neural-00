import type { SystemId } from "./systems";

export type PaletteKey = SystemId | "core" | "finale";

/** Two-tone particle palettes. Restrained: cyan, electric blue, violet, bone. */
export const PALETTES: Record<PaletteKey, [string, string]> = {
  core: ["#7fe3ff", "#9b8cff"],
  memory: ["#8fb3ff", "#b6a8ff"],
  vision: ["#7fe3ff", "#dfe8f2"],
  reasoning: ["#4d7cff", "#a597ff"],
  voice: ["#9fe9ff", "#4d7cff"],
  agents: ["#9b8cff", "#7fe3ff"],
  generation: ["#e8ecf1", "#9b8cff"],
  finale: ["#f4f8ff", "#7fe3ff"],
};

export const ACCENT = {
  cyan: "#7fe3ff",
  blue: "#4d7cff",
  violet: "#9b8cff",
  bone: "#e8ecf1",
} as const;

import { create } from "zustand";
import type { AgentId } from "./layouts";
import type { QualityTier } from "./quality";
import type { ShapeKey } from "./shapes";
import type { SystemId } from "./systems";

export type Phase = "intro" | "main";
export type IntroStage = "dormant" | "assembling" | "ready";
export type FinaleStage = "idle" | "sync" | "silence" | "awakened" | "merge" | "final";
export type VoiceStage = "idle" | "listening" | "processing" | "generating";

export interface ShapeRequest {
  key: ShapeKey;
  duration: number;
  stagger: number;
  swirl: number;
  facing: number;
  nonce: number;
}

export interface MemoryRecall {
  id: number;
  address: string;
  score: string;
}

export interface ShapeOptions {
  duration?: number;
  stagger?: number;
  swirl?: number;
  facing?: number;
}

interface ExperienceState {
  ready: boolean;
  quality: QualityTier;
  reducedMotion: boolean;
  touch: boolean;

  phase: Phase;
  introStage: IntroStage;
  enteredAt: number;

  active: SystemId | null;
  hovered: SystemId | null;
  visited: SystemId[];
  observe: boolean;
  panelOpen: boolean;
  sound: boolean;
  finale: FinaleStage;
  interacted: boolean;

  shape: ShapeRequest;
  flowStep: number;
  voiceStage: VoiceStage;
  agentFocus: AgentId | null;
  genPrompt: string;
  memoryRecall: MemoryRecall | null;
  visionRevealed: number;
  pulseNonce: number;

  configure: (env: { quality: QualityTier; reducedMotion: boolean; touch: boolean }) => void;
  setIntroStage: (stage: IntroStage) => void;
  enter: () => void;
  select: (id: SystemId) => void;
  returnToCore: () => void;
  setHovered: (id: SystemId | null) => void;
  toggleObserve: () => void;
  setPanelOpen: (open: boolean) => void;
  toggleSound: () => void;
  setQuality: (q: QualityTier) => void;
  setShape: (key: ShapeKey, opts?: ShapeOptions) => void;
  setFlowStep: (step: number) => void;
  setVoiceStage: (stage: VoiceStage) => void;
  setAgentFocus: (id: AgentId | null) => void;
  setGenPrompt: (prompt: string) => void;
  setMemoryRecall: (recall: MemoryRecall | null) => void;
  setVisionRevealed: (count: number) => void;
  setFinale: (stage: FinaleStage) => void;
  pulse: () => void;
  markInteracted: () => void;
  completeFinale: () => void;
  restart: () => void;
}

export const useStore = create<ExperienceState>()((set, get) => ({
  ready: false,
  quality: "high",
  reducedMotion: false,
  touch: false,

  phase: "intro",
  introStage: "dormant",
  enteredAt: 0,

  active: null,
  hovered: null,
  visited: [],
  observe: false,
  panelOpen: false,
  sound: false,
  finale: "idle",
  interacted: false,

  shape: { key: "dormant", duration: 1, stagger: 0.35, swirl: 0, facing: 0, nonce: 0 },
  flowStep: 0,
  voiceStage: "idle",
  agentFocus: null,
  genPrompt: "",
  memoryRecall: null,
  visionRevealed: 0,
  pulseNonce: 0,

  configure: (env) => set({ ...env, ready: true }),

  setIntroStage: (introStage) => set({ introStage }),

  enter: () => {
    if (get().phase === "main") return;
    set((s) => ({
      phase: "main",
      introStage: "ready",
      enteredAt: performance.now(),
      pulseNonce: s.pulseNonce + 1,
    }));
  },

  select: (id) => {
    const s = get();
    if (s.phase !== "main" || s.finale !== "idle" || s.active === id) return;
    set({
      active: id,
      hovered: null,
      visited: s.visited.includes(id) ? s.visited : [...s.visited, id],
      agentFocus: null,
      flowStep: 0,
      pulseNonce: s.pulseNonce + 1,
      interacted: true,
    });
  },

  returnToCore: () => {
    if (get().finale !== "idle") return;
    set({ active: null, agentFocus: null });
  },

  setHovered: (hovered) => {
    if (get().hovered !== hovered) set({ hovered });
  },

  toggleObserve: () => set((s) => ({ observe: !s.observe, panelOpen: false })),
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  toggleSound: () => set((s) => ({ sound: !s.sound })),
  setQuality: (quality) => set({ quality }),

  setShape: (key, opts = {}) => {
    const reduced = get().reducedMotion;
    const duration = opts.duration ?? 2.6;
    set((s) => ({
      shape: {
        key,
        duration: reduced ? Math.min(duration, 1.4) : duration,
        stagger: (opts.stagger ?? 0.35) * (reduced ? 0.4 : 1),
        swirl: reduced ? 0 : (opts.swirl ?? 1.2),
        facing: opts.facing ?? 0,
        nonce: s.shape.nonce + 1,
      },
    }));
  },

  setFlowStep: (flowStep) => {
    if (get().flowStep !== flowStep) set({ flowStep });
  },
  setVoiceStage: (voiceStage) => set({ voiceStage }),
  setAgentFocus: (agentFocus) => set({ agentFocus }),
  setGenPrompt: (genPrompt) => set({ genPrompt }),
  setMemoryRecall: (memoryRecall) => set({ memoryRecall }),
  setVisionRevealed: (visionRevealed) => {
    if (get().visionRevealed !== visionRevealed) set({ visionRevealed });
  },
  setFinale: (finale) => set({ finale }),
  pulse: () => set((s) => ({ pulseNonce: s.pulseNonce + 1 })),
  markInteracted: () => {
    if (!get().interacted) set({ interacted: true });
  },

  completeFinale: () => {
    set({ finale: "idle", visited: [], active: null, observe: false });
    get().setShape("core", { duration: 2.8, swirl: 1.6 });
  },

  restart: () => {
    set({
      phase: "intro",
      introStage: "dormant",
      active: null,
      hovered: null,
      visited: [],
      observe: false,
      panelOpen: false,
      finale: "idle",
      agentFocus: null,
      voiceStage: "idle",
    });
    get().setShape("dormant", { duration: 1.8, swirl: 2 });
  },
}));

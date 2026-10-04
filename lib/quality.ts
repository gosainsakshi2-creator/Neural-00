export type QualityTier = "high" | "medium" | "low";

export interface QualityProfile {
  tier: QualityTier;
  particles: number;
  dust: number;
  dpr: [number, number];
  bloom: boolean;
  /** Particle size multiplier — fewer particles are drawn slightly larger. */
  size: number;
}

export const QUALITY: Record<QualityTier, QualityProfile> = {
  high: { tier: "high", particles: 20000, dust: 1400, dpr: [1, 1.75], bloom: true, size: 1 },
  medium: { tier: "medium", particles: 11000, dust: 800, dpr: [1, 1.5], bloom: true, size: 1.12 },
  low: { tier: "low", particles: 5200, dust: 380, dpr: [1, 1.25], bloom: false, size: 1.4 },
};

export interface EnvironmentInfo {
  quality: QualityTier;
  reducedMotion: boolean;
  touch: boolean;
}

export function detectEnvironment(): EnvironmentInfo {
  const touch = window.matchMedia("(pointer: coarse)").matches;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 640;
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;

  let quality: QualityTier = "high";
  if ((touch && small) || cores <= 2 || memory <= 2) quality = "low";
  else if (touch || cores <= 4 || memory <= 4) quality = "medium";

  return { quality, reducedMotion, touch };
}

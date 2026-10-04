/**
 * Transient per-frame values shared between scene components.
 * Kept outside React state on purpose: they change every frame and must not re-render anything.
 */
export const fx = {
  /** Vision scan plane height (local space) and its strength. */
  scanY: 0,
  scan: 0,
  /** Generation layer: 1 = latent noise, 0 = settled structure. */
  chaosTarget: 0,
  /** Finale flash, decays inside the particle field. */
  flash: 0,
};

/** Pointer state in normalised device coordinates, updated from window events. */
export const pointer = {
  x: 0,
  y: 0,
  /** Smoothed copy used for parallax. */
  sx: 0,
  sy: 0,
  /** Smoothed speed, drives connection activity. */
  speed: 0,
  inside: false,
  lastInteraction: 0,
};

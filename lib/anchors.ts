import type { Object3D } from "three";

/**
 * Bridges 3D positions to DOM labels without a second React root per label.
 * Scene code registers anchor objects; DOM code registers elements under the same id;
 * a single projector writes each element's screen position once per frame.
 */
export const anchorObjects = new Map<string, Object3D>();
export const anchorElements = new Map<string, HTMLElement>();

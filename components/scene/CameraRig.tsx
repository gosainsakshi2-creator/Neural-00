"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { pointer } from "@/lib/fx";
import { systemAngle } from "@/lib/layouts";
import { clamp, TAU } from "@/lib/math";
import { useStore } from "@/lib/store";
import { SYSTEM_BY_ID, type SystemId } from "@/lib/systems";

interface View {
  theta: number;
  phi: number;
  radius: number;
  lookY: number;
}

const SYSTEM_VIEWS: Record<SystemId, Omit<View, "theta">> = {
  memory: { phi: 1.3, radius: 11, lookY: 0 },
  vision: { phi: 1.2, radius: 10.6, lookY: -0.9 },
  reasoning: { phi: 1.5, radius: 13.4, lookY: 0 },
  voice: { phi: 1.25, radius: 10.8, lookY: 0 },
  agents: { phi: 1.32, radius: 11.4, lookY: 0 },
  generation: { phi: 1.38, radius: 12, lookY: 0 },
};

/** Closest equivalent of `target` to `current` on the circle, so the camera never takes the long way round. */
const nearestAngle = (current: number, target: number) => {
  const diff = ((((target - current) % TAU) + TAU * 1.5) % TAU) - TAU / 2;
  return current + diff;
};

export function CameraRig() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);

  const want = useRef<View>({ theta: 0, phi: 1.36, radius: 19, lookY: 0 });
  const cur = useRef<View>({ theta: 0, phi: 1.36, radius: 19, lookY: 0 });
  const lambda = useRef(1.2);
  const timers = useRef<number[]>([]);
  const lastUser = useRef(0);
  const shift = useRef(0);
  const lift = useRef(0);
  const zoom = useRef(1);

  // Respond to experience state with camera presets.
  useEffect(() => {
    const clearTimers = () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
    const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));

    const apply = () => {
      const s = useStore.getState();
      const w = want.current;
      clearTimers();

      if (s.phase === "intro") {
        Object.assign(w, { phi: 1.36, radius: 19, lookY: 0 });
        lambda.current = 1.2;
        return;
      }

      switch (s.finale) {
        case "sync":
          Object.assign(w, { phi: 1.32, radius: 15, lookY: 0 });
          lambda.current = 1.4;
          return;
        case "silence":
        case "awakened":
          Object.assign(w, { radius: 12.5 });
          lambda.current = 0.4;
          return;
        case "merge":
          Object.assign(w, { phi: 1.4, radius: 6.4, lookY: 0 });
          lambda.current = 2.6;
          later(1300, () => {
            Object.assign(want.current, { radius: 17.5, phi: 1.22 });
            lambda.current = 0.85;
          });
          return;
        case "final":
          // Look slightly below the structure so it rises above the closing lines of text.
          Object.assign(w, { radius: 16.5, phi: 1.24, lookY: -1.7 });
          lambda.current = 0.6;
          return;
      }

      if (s.active) {
        const def = SYSTEM_BY_ID[s.active];
        const view = SYSTEM_VIEWS[s.active];
        w.theta = nearestAngle(cur.current.theta, systemAngle(def.index));
        // Fly in through the node first, then settle back into the system's framing.
        Object.assign(w, { phi: 1.42, radius: 6.7, lookY: 0 });
        lambda.current = 2.1;
        later(s.reducedMotion ? 0 : 760, () => {
          Object.assign(want.current, { phi: view.phi, radius: view.radius, lookY: view.lookY });
          lambda.current = 1.5;
        });
      } else {
        Object.assign(w, { phi: 1.32, radius: 15, lookY: 0 });
        lambda.current = 1.6;
      }
    };

    apply();
    const unsub = useStore.subscribe((s, prev) => {
      if (s.phase !== prev.phase || s.active !== prev.active || s.finale !== prev.finale) apply();
    });
    return () => {
      unsub();
      clearTimers();
    };
  }, []);

  // Direct manipulation: drag to orbit, wheel / pinch to zoom.
  useEffect(() => {
    const el = gl.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch = 0;

    const locked = () => {
      const s = useStore.getState();
      return s.phase !== "main" || (s.finale !== "idle" && s.finale !== "final");
    };

    const onDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };

    const onMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev || locked()) return;
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const w = want.current;

      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch > 0) w.radius = clamp(w.radius * (pinch / d), 5.5, 26);
        pinch = d;
      } else {
        const k = e.pointerType === "touch" ? 0.0068 : 0.0052;
        w.theta -= dx * k;
        w.phi = clamp(w.phi - dy * k * 0.85, 0.45, 2.55);
      }
      if (Math.abs(dx) + Math.abs(dy) > 1) {
        lastUser.current = performance.now();
        useStore.getState().markInteracted();
      }
    };

    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = 0;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (locked()) return;
      const w = want.current;
      w.radius = clamp(w.radius * (1 + e.deltaY * 0.0012), 5.5, 26);
      lastUser.current = performance.now();
      useStore.getState().markInteracted();
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
    };
  }, [gl]);

  const right = useRef(new THREE.Vector3());
  const up = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    // Portrait screens need the camera further back to fit the same composition.
    const aspect = state.size.width / Math.max(1, state.size.height);
    const fit = aspect < 1 ? THREE.MathUtils.lerp(1.85, 1, clamp((aspect - 0.5) / 0.5)) : 1;
    const s = useStore.getState();
    const w = want.current;
    const c = cur.current;
    const damp = THREE.MathUtils.damp;

    // Slow idle drift when nobody is touching anything.
    const idle = performance.now() - Math.max(lastUser.current, pointer.lastInteraction) > 4000;
    if (!s.reducedMotion && s.phase === "main" && !s.active && s.finale === "idle" && idle) w.theta += dt * 0.035;
    if (!s.reducedMotion && s.finale === "final") w.theta += dt * 0.05;
    if (!s.reducedMotion && s.phase === "intro") w.theta += dt * 0.06;

    const l = s.reducedMotion ? Math.max(lambda.current, 3) : lambda.current;
    c.theta = damp(c.theta, w.theta, l, dt);
    c.phi = damp(c.phi, w.phi, l, dt);
    c.radius = damp(c.radius, w.radius * fit, l, dt);
    c.lookY = damp(c.lookY, w.lookY, l, dt);

    // Keep the subject clear of side panels on wide screens: a horizontal pan in camera space.
    const wide = aspect > 1.15;
    const panelLeft = wide && s.active !== null && s.finale === "idle";
    const panelRight = wide && s.observe && s.finale === "idle";
    const shiftTarget = (panelLeft ? 0.13 : 0) - (panelRight ? 0.11 : 0);
    shift.current = damp(shift.current, shiftTarget, 1.6, dt);
    const panelBottom = aspect < 1 && s.active !== null && s.finale === "idle";
    lift.current = damp(lift.current, panelBottom ? 0.17 : 0, 1.6, dt);
    zoom.current = damp(zoom.current, wide && panelLeft && panelRight ? 1.2 : 1, 1.6, dt);

    const sinPhi = Math.sin(c.phi);
    const radius = c.radius * zoom.current;
    camera.position.set(
      radius * sinPhi * Math.sin(c.theta),
      radius * Math.cos(c.phi) + c.lookY,
      radius * sinPhi * Math.cos(c.theta),
    );
    look.current.set(0, c.lookY, 0);
    camera.lookAt(look.current);
    right.current.set(1, 0, 0).applyQuaternion(camera.quaternion);
    const pan = -shift.current * radius;
    camera.position.addScaledVector(right.current, pan);
    look.current.addScaledVector(right.current, pan);
    // Moving the camera down raises the subject on screen, clear of a bottom sheet.
    up.current.set(0, 1, 0).applyQuaternion(camera.quaternion);
    const rise = -lift.current * radius;
    camera.position.addScaledVector(up.current, rise);
    look.current.addScaledVector(up.current, rise);

    // Parallax: drift the camera a touch toward the pointer.
    if (!s.reducedMotion && !s.touch) {
      pointer.sx = damp(pointer.sx, pointer.x, 2.4, dt);
      pointer.sy = damp(pointer.sy, pointer.y, 2.4, dt);
      camera.lookAt(look.current);
      right.current.set(1, 0, 0).applyQuaternion(camera.quaternion);
      up.current.set(0, 1, 0).applyQuaternion(camera.quaternion);
      const amt = radius * 0.035;
      camera.position.addScaledVector(right.current, pointer.sx * amt);
      camera.position.addScaledVector(up.current, pointer.sy * amt * 0.7);
    }
    camera.lookAt(look.current);
  });

  return null;
}

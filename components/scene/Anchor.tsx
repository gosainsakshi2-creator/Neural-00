"use client";

import { useFrame } from "@react-three/fiber";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { anchorElements, anchorObjects } from "@/lib/anchors";
import type { Vec3 } from "@/lib/math";

/** An invisible point in the scene that a DOM label (see ui/Anchored) can follow. */
export const Anchor = forwardRef<THREE.Group, { id: string; position?: Vec3 }>(function Anchor(
  { id, position = [0, 0, 0] },
  forwarded,
) {
  const ref = useRef<THREE.Group>(null);
  useImperativeHandle(forwarded, () => ref.current as THREE.Group);

  useEffect(() => {
    const object = ref.current;
    if (!object) return;
    anchorObjects.set(id, object);
    return () => {
      if (anchorObjects.get(id) === object) anchorObjects.delete(id);
    };
  }, [id]);

  return <group ref={ref} position={position} />;
});

/** Projects every registered anchor to screen space. Mounted last so it sees final camera + object transforms. */
export function AnchorProjector() {
  const v = useRef(new THREE.Vector3());

  useFrame(({ camera, size }) => {
    anchorElements.forEach((el, id) => {
      const object = anchorObjects.get(id);
      if (!object) {
        el.style.visibility = "hidden";
        return;
      }
      object.getWorldPosition(v.current);
      v.current.project(camera);
      const behind = v.current.z > 1;
      const x = (v.current.x * 0.5 + 0.5) * size.width;
      const y = (-v.current.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
      el.style.visibility = behind ? "hidden" : "visible";
    });
  });

  return null;
}

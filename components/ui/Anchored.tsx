"use client";

import { useCallback } from "react";
import { anchorElements } from "@/lib/anchors";

/** A DOM element whose screen position is driven by the scene anchor with the same id. */
export function Anchored({ id, children }: { id: string; children: React.ReactNode }) {
  const ref = useCallback(
    (el: HTMLDivElement | null) => {
      if (el) anchorElements.set(id, el);
      else if (anchorElements.has(id)) anchorElements.delete(id);
    },
    [id],
  );
  return (
    <div ref={ref} className="pointer-events-none absolute left-0 top-0 will-change-transform" style={{ visibility: "hidden" }}>
      {children}
    </div>
  );
}

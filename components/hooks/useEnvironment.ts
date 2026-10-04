"use client";

import { useEffect } from "react";
import { detectEnvironment } from "@/lib/quality";
import { useStore } from "@/lib/store";

/** Detect device capability, touch and motion preference once on mount, and track motion changes. */
export function useEnvironment() {
  const configure = useStore((s) => s.configure);

  useEffect(() => {
    configure(detectEnvironment());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => useStore.setState({ reducedMotion: mq.matches });
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [configure]);
}

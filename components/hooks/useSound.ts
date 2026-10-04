"use client";

import { useEffect } from "react";
import { ambientSound } from "@/lib/sound";
import { useStore } from "@/lib/store";

/** Starts and stops the optional ambient layer, and pings softly on selection. */
export function useSound() {
  const sound = useStore((s) => s.sound);

  useEffect(() => {
    if (sound) ambientSound.start();
    else ambientSound.stop();
  }, [sound]);

  useEffect(
    () =>
      useStore.subscribe((s, prev) => {
        if (!s.sound) return;
        if (s.active && s.active !== prev.active) ambientSound.blip(1);
        if (!s.active && prev.active) ambientSound.blip(0.75);
        if (s.finale === "merge" && prev.finale !== "merge") ambientSound.blip(0.5);
        if (s.phase === "main" && prev.phase === "intro") ambientSound.blip(1.25);
      }),
    [],
  );
}

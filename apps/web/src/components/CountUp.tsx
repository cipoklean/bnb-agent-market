"use client";
// Count-up animation for the hero's LIVE stats. The target is real indexer data
// passed from the server component — the animation only affects presentation,
// never the value. Honors prefers-reduced-motion (renders the final number).
import { useEffect, useRef, useState } from "react";

export default function CountUp({
  to,
  durationMs = 1100,
  className = "",
}: {
  to: number;
  durationMs?: number;
  className?: string;
}) {
  const [value, setValue] = useState(0);
  const raf = useRef<number | null>(null);
  // Clamp: never animate or render a negative count (a bad upstream total
  // once rendered "-5,338,596"). Values are live indexer numbers only.
  const target = Math.max(0, Math.round(to));

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || target <= 0) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutExpo for a snappy settle.
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(Math.round(target * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target, durationMs]);

  return <span className={className}>{value.toLocaleString()}</span>;
}

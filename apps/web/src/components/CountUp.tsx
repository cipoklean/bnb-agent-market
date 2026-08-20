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

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || to <= 0) {
      setValue(to);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutExpo for a snappy settle.
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(Math.round(to * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [to, durationMs]);

  return <span className={className}>{value.toLocaleString()}</span>;
}

"use client";
// Compare selection — a small, NON-persisted client store shared by the
// directory cards (add/remove), the floating compare bar, and the /compare
// page. Holds the full LiveAgentView for each pick so /compare renders with no
// refetch (works even when the indexer is down). Capped at MAX_COMPARE.
import { create } from "zustand";
import type { LiveAgentView } from "./scan-normalize";

export const MAX_COMPARE = 3;

interface CompareState {
  items: LiveAgentView[];
  toggle: (v: LiveAgentView) => void;
  remove: (slug: string) => void;
  clear: () => void;
  has: (slug: string) => boolean;
  isFull: () => boolean;
}

export const useCompare = create<CompareState>((set, get) => ({
  items: [],
  toggle: (v) =>
    set((s) => {
      if (s.items.some((x) => x.slug === v.slug)) {
        return { items: s.items.filter((x) => x.slug !== v.slug) };
      }
      if (s.items.length >= MAX_COMPARE) return s; // cap — ignore extra picks
      return { items: [...s.items, v] };
    }),
  remove: (slug) => set((s) => ({ items: s.items.filter((x) => x.slug !== slug) })),
  clear: () => set({ items: [] }),
  has: (slug) => get().items.some((x) => x.slug === slug),
  isFull: () => get().items.length >= MAX_COMPARE,
}));

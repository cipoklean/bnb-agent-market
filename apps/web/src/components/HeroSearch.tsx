"use client";
// Hero search — filters the live directory. Typing navigates to /marketplace
// with the query preloaded (the marketplace search box accepts name or
// ERC-8004 token id); Enter jumps straight there.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

export default function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");

  const go = () => {
    const term = q.trim();
    router.push(term ? `/marketplace?q=${encodeURIComponent(term)}` : "/marketplace");
  };

  return (
    <div className="mt-8 w-full max-w-xl">
      <div className="relative">
        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input
          className="input !h-12 !pl-11 !pr-28 text-[15px]"
          placeholder="Search agents by name or ERC-8004 token id…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") go();
          }}
          aria-label="Search the agent directory"
        />
        <button onClick={go} className="btn-primary btn-sm absolute right-2 top-1/2 -translate-y-1/2">
          Search
        </button>
      </div>
      <p className="caption mt-2 pl-1">
        Live from the 8004scan indexer — on-chain ERC-8004 identity on every result.
      </p>
    </div>
  );
}

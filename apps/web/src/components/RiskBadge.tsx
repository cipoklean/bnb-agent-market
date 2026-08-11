"use client";
// RiskBadge — low / medium / high with icon + plain-English tooltip
import { AlertTriangle, Shield, Zap } from "lucide-react";
import { Tooltip } from "@/components/ui";
import type { RiskLevel } from "@/lib/types";

const META: Record<
  RiskLevel,
  { cls: string; icon: typeof Shield; label: string; tip: string }
> = {
  low: {
    cls: "badge-green",
    icon: Shield,
    label: "Low risk",
    tip: "Low risk — the agent can only take read-only or tightly limited actions inside the limits you set.",
  },
  medium: {
    cls: "badge-amber",
    icon: AlertTriangle,
    label: "Medium risk",
    tip: "Medium risk — the agent can move funds or call contracts, but only within the budget and allowlist you set.",
  },
  high: {
    cls: "badge-red",
    icon: Zap,
    label: "High risk",
    tip: "High risk — every action needs your approval, and high-value actions ask you to type CONFIRM first.",
  },
};

export default function RiskBadge({
  risk,
  className = "",
}: {
  risk: RiskLevel;
  className?: string;
}) {
  const m = META[risk];
  const Icon = m.icon;
  return (
    <Tooltip label={m.tip}>
      <span className={`${m.cls} !cursor-help ${className}`}>
        <Icon size={12} /> {m.label}
      </span>
    </Tooltip>
  );
}

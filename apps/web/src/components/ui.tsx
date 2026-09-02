"use client";
// Base UI primitives — Lumen Deck design system (memory/UI_SYSTEM.md)
import { useState, type ReactNode } from "react";
import { Check, Copy, X } from "lucide-react";

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`panel p-5 ${className}`}>{children}</div>;
}

export function PanelGlass({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`panel-glass p-5 ${className}`}>{children}</div>;
}

export function Label({ children }: { children: ReactNode }) {
  return <div className="label mb-1.5">{children}</div>;
}

export function SectionTitle({
  title,
  sub,
  right,
}: {
  title: string;
  sub?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4">
      <div>
        <h2 className="title-section">{title}</h2>
        {sub && <p className="body-sm mt-1">{sub}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "gold" | "success" | "danger" | "warning" | "info";
}) {
  const toneMap: Record<string, string> = {
    default: "text-text",
    gold: "text-primary",
    success: "text-success",
    danger: "text-danger",
    warning: "text-warning",
    info: "text-info",
  };
  return (
    <div className="card card-hover">
      <div className="flex items-start justify-between">
        <div className="label">{label}</div>
        {icon && <div className="text-muted">{icon}</div>}
      </div>
      <div className={`tnum text-[24px] font-semibold mt-1 ${toneMap[tone]}`}>{value}</div>
      {hint && <div className="caption mt-1">{hint}</div>}
    </div>
  );
}

export function ProgressBar({
  value,
  max,
  tone = "gold",
}: {
  value: number;
  max: number;
  tone?: "gold" | "green" | "red" | "blue";
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const color =
    tone === "green" ? "bg-success" : tone === "red" ? "bg-danger" : tone === "blue" ? "bg-info" : "bg-primary";
  return (
    <div className="h-1.5 w-full rounded-[2px] bg-surface-2 overflow-hidden">
      <div className={`h-full rounded-[2px] ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function CopyText({ text, display, mono = true }: { text: string; display?: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  const shown = display ?? text;
  return (
    <button
      className={`${mono ? "hash" : "caption"} inline-flex items-center gap-1 hover:text-primary transition-colors`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {
          /* clipboard unavailable */
        }
      }}
      title="Copy"
    >
      {shown}
      {copied ? <Check size={11} className="text-success" /> : <Copy size={11} />}
    </button>
  );
}

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group relative inline-block">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-56 -translate-x-1/2 rounded-[3px] border border-border/70 bg-surface-2 px-3 py-2 text-[12px] leading-snug text-text opacity-0 shadow-panel transition-opacity duration-150 group-hover:opacity-100">
        {label}
      </span>
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface/40 px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[4px] border border-bronze/40 bg-surface-2 text-muted">
        {icon}
      </div>
      <div className="title-card">{title}</div>
      <p className="body-sm mt-1 max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-card border border-border bg-surface p-6 shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="title-card">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-text" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function TrustNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-btn border border-success/25 bg-success/8 px-3 py-2 text-[12px] leading-relaxed text-success/90">
      {children}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-muted caption">
      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-primary" />
      {label ?? "Working…"}
    </div>
  );
}

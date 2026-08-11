"use client";
// PermissionEditor — budget caps, allowed targets, expiry, forbidden actions
import { useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";
import { Label, Tooltip } from "@/components/ui";
import { AVAILABLE_TARGETS } from "@/lib/data";

export interface PermissionValue {
  budget: { token: string; max_total: string; max_per_action: string };
  permissions: {
    allowed_targets: string[];
    allowed_selectors: string[];
    forbidden_actions: string[];
  };
  expiryDays: number;
}

const FORBIDDEN = ["transfer", "withdrawToExternal", "approveMax"];
const EXPIRY_OPTIONS = [1, 3, 7, 14, 30];
const TOKENS = ["BNB", "CAKE", "USDT"];

export default function PermissionEditor({
  value,
  onChange,
}: {
  value: PermissionValue;
  onChange: (v: PermissionValue) => void;
}) {
  const [custom, setCustom] = useState("");
  const total = parseFloat(value.budget.max_total);
  const per = parseFloat(value.budget.max_per_action);
  const invalid =
    Number.isNaN(total) || total <= 0 || Number.isNaN(per) || per <= 0 || per > total;

  const setBudget = (patch: Partial<PermissionValue["budget"]>) =>
    onChange({ ...value, budget: { ...value.budget, ...patch } });

  const toggleTarget = (t: string) => {
    const has = value.permissions.allowed_targets.includes(t);
    onChange({
      ...value,
      permissions: {
        ...value.permissions,
        allowed_targets: has
          ? value.permissions.allowed_targets.filter((x) => x !== t)
          : [...value.permissions.allowed_targets, t],
      },
    });
  };

  const addCustom = () => {
    const t = custom.trim();
    if (!t || value.permissions.allowed_targets.includes(t)) return;
    onChange({
      ...value,
      permissions: {
        ...value.permissions,
        allowed_targets: [...value.permissions.allowed_targets, t],
      },
    });
    setCustom("");
  };

  const toggleForbidden = (a: string) => {
    const has = value.permissions.forbidden_actions.includes(a);
    onChange({
      ...value,
      permissions: {
        ...value.permissions,
        forbidden_actions: has
          ? value.permissions.forbidden_actions.filter((x) => x !== a)
          : [...value.permissions.forbidden_actions, a],
      },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Budget */}
      <div>
        <Label>Spending limits</Label>
        <p className="body-sm mb-3">
          You can set a spending limit. The agent can never spend past these caps.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Tooltip label="The most the agent can spend across the whole session.">
              <div className="label mb-1.5">Token</div>
            </Tooltip>
            <select
              className="select"
              value={value.budget.token}
              onChange={(e) => setBudget({ token: e.target.value })}
            >
              {TOKENS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Tooltip label="The most this agent can spend across the entire session.">
              <div className="label mb-1.5">Total cap</div>
            </Tooltip>
            <input
              className="input tnum"
              type="number"
              min="0"
              step="0.01"
              value={value.budget.max_total}
              onChange={(e) => setBudget({ max_total: e.target.value })}
              placeholder="5"
            />
          </div>
          <div>
            <Tooltip label="The most a single action can spend. Must be within the total cap.">
              <div className="label mb-1.5">Per action</div>
            </Tooltip>
            <input
              className="input tnum"
              type="number"
              min="0"
              step="0.01"
              value={value.budget.max_per_action}
              onChange={(e) => setBudget({ max_per_action: e.target.value })}
              placeholder="2"
            />
          </div>
        </div>
        {invalid && (
          <p className="mt-2 flex items-center gap-1.5 text-[12px] text-danger">
            <AlertTriangle size={12} />
            Total cap must be a positive number, and per-action must be within it.
          </p>
        )}
      </div>

      {/* Allowed targets */}
      <div>
        <Tooltip label="The only contracts the agent may call. Anything outside this list is refused.">
          <Label>Allowed targets (allowlist)</Label>
        </Tooltip>
        <p className="body-sm mb-3">
          This agent can only do what you allow — actions are refused outside this list.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {AVAILABLE_TARGETS.map((t) => (
            <label
              key={t}
              className={`flex cursor-pointer items-center gap-2.5 rounded-btn border px-3 py-2 text-[13px] transition-colors ${
                value.permissions.allowed_targets.includes(t)
                  ? "border-primary/50 bg-primary/8 text-text"
                  : "border-border bg-surface-2/40 text-muted hover:border-muted/40"
              }`}
            >
              <input
                type="checkbox"
                checked={value.permissions.allowed_targets.includes(t)}
                onChange={() => toggleTarget(t)}
                className="accent-[#F0B90B]"
              />
              <span className="hash">{t}</span>
            </label>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            className="input hash !py-1.5 text-[12px]"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="Add custom contract address or label…"
          />
          <button onClick={addCustom} className="btn-ghost btn-sm shrink-0">
            <Plus size={13} /> Add
          </button>
        </div>
      </div>

      {/* Expiry */}
      <div>
        <Tooltip label="This session expires automatically. After expiry, the agent can no longer act.">
          <Label>Session expiry</Label>
        </Tooltip>
        <select
          className="select max-w-[220px]"
          value={value.expiryDays}
          onChange={(e) => onChange({ ...value, expiryDays: Number(e.target.value) })}
        >
          {EXPIRY_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {d} day{d > 1 ? "s" : ""}
            </option>
          ))}
        </select>
        <p className="caption mt-1.5">This session expires automatically after the time you choose.</p>
      </div>

      {/* Forbidden actions */}
      <div>
        <Tooltip label="Actions the agent is never allowed to take, no matter what the task asks.">
          <Label>Forbidden actions</Label>
        </Tooltip>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {FORBIDDEN.map((a) => (
            <label
              key={a}
              className={`flex cursor-pointer items-center gap-2.5 rounded-btn border px-3 py-2 text-[13px] transition-colors ${
                value.permissions.forbidden_actions.includes(a)
                  ? "border-danger/40 bg-danger/8 text-danger"
                  : "border-border bg-surface-2/40 text-muted hover:border-muted/40"
              }`}
            >
              <input
                type="checkbox"
                checked={value.permissions.forbidden_actions.includes(a)}
                onChange={() => toggleForbidden(a)}
                className="accent-[#EF4444]"
              />
              <span className="hash">{a}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

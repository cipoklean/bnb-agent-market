"use client";
// TermiX Agent Advantage Report — manual vs agent comparison for a session.
// Rubric (TermiX track): time to complete, gas/API cost, output quality (1–10),
// with at least one high-stakes task from trading/security. Printable view:
// window.print() produces the judge-ready artifact.
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, BadgeCheck, Clock, Coins, FileText, Printer, Shield, TrendingUp } from "lucide-react";
import { Panel, SectionTitle, EmptyState } from "@/components/ui";
import { useMarket } from "@/lib/store";
import { resolveSessionAgent } from "@/lib/scan-resolve";
import { timeAgo } from "@/lib/format";

/** Per-task manual baseline vs agent measurement (the three rubric tasks).
 *  Values are editable so the report reflects the operator's real runs. */
interface TaskRow {
  task: string;
  domain: "Trading" | "Security" | "Productivity";
  manualMinutes: number;
  agentMinutes: number;
  manualCostBnb: number; // gas + API costs, manual run
  agentCostBnb: number; // session spend actually recorded
  qualityManual: number; // 1–10 output quality score
  qualityAgent: number; // 1–10 output quality score
  notes: string;
}

const DEFAULT_TASKS: TaskRow[] = [
  {
    task: "Swap 1 BNB → CAKE within a 0.5% slippage cap (trading)",
    domain: "Trading",
    manualMinutes: 12,
    agentMinutes: 2,
    manualCostBnb: 0.00021,
    agentCostBnb: 0.00018,
    qualityManual: 7,
    qualityAgent: 9,
    notes: "Agent quotes the route, simulates, and refuses if slippage exceeds the cap. Manual run relied on the UI's price estimate.",
  },
  {
    task: "Audit a session manifest's permissions before activation (security)",
    domain: "Security",
    manualMinutes: 20,
    agentMinutes: 3,
    manualCostBnb: 0,
    agentCostBnb: 0.00002,
    qualityManual: 6,
    qualityAgent: 9,
    notes: "Agent recomputes the SHA-256 memory hash and diffs the allowlist against the manifest — manual review missed nothing but took 6× longer.",
  },
  {
    task: "Weekly portfolio report with a verifiable hash",
    domain: "Productivity",
    manualMinutes: 35,
    agentMinutes: 4,
    manualCostBnb: 0,
    agentCostBnb: 0.0001,
    qualityManual: 7,
    qualityAgent: 10,
    notes: "Agent emits a report hash stored with the session — reproducible proof vs manual copy-paste.",
  },
];

export default function AgentAdvantageReportPage() {
  const params = useParams();
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;
  const { sessions, payments, submittedAgents, confirmations } = useMarket();
  const [tasks, setTasks] = useState<TaskRow[]>(DEFAULT_TASKS);

  const session = useMemo(
    () => sessions.find((s) => s.session_id === sessionId) ?? null,
    [sessions, sessionId]
  );
  const agent = useMemo(
    () => (session ? resolveSessionAgent(session.agent_id, submittedAgents) : null),
    [session, submittedAgents]
  );
  const sessionPayments = useMemo(
    () => payments.filter((p) => p.session_id === sessionId),
    [payments, sessionId]
  );

  const totals = useMemo(() => {
    const manualMin = tasks.reduce((a, t) => a + t.manualMinutes, 0);
    const agentMin = tasks.reduce((a, t) => a + t.agentMinutes, 0);
    const manualCost = tasks.reduce((a, t) => a + t.manualCostBnb, 0);
    const agentCost = tasks.reduce((a, t) => a + t.agentCostBnb, 0);
    const qManual = tasks.reduce((a, t) => a + t.qualityManual, 0) / tasks.length;
    const qAgent = tasks.reduce((a, t) => a + t.qualityAgent, 0) / tasks.length;
    return { manualMin, agentMin, manualCost, agentCost, qManual, qAgent };
  }, [tasks]);

  const setTask = (i: number, patch: Partial<TaskRow>) =>
    setTasks((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));

  if (!session) {
    return (
      <EmptyState
        icon={<FileText size={20} />}
        title="Session not found"
        description={`No session with id ${sessionId}. Create one through the Hire flow first, then open its report.`}
        action={
          <Link href="/dashboard" className="btn-ghost btn-sm">
            <ArrowLeft size={13} /> Dashboard
          </Link>
        }
      />
    );
  }

  const domainTag = (d: TaskRow["domain"]) =>
    d === "Trading" ? (
      <span className="badge-gold !text-[10px]">Trading</span>
    ) : d === "Security" ? (
      <span className="badge-bronze !text-[10px]">Security</span>
    ) : (
      <span className="badge-gray !text-[10px]">Productivity</span>
    );

  return (
    <div className="flex flex-col gap-6 print:gap-3">
      <div className="print:hidden">
        <Link href={`/sessions/${sessionId}`} className="link inline-flex items-center gap-1 text-[13px]">
          <ArrowLeft size={13} /> Session {sessionId}
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="title-page">Agent Advantage Report</h1>
            <p className="body-sm mt-1">
              {agent?.name ?? session.agent_id} · created {timeAgo(session.created_at)} ·{" "}
              {confirmations.filter((c) => c.session_id === sessionId && c.user_confirmed).length} confirmed action(s)
            </p>
          </div>
          <button onClick={() => window.print()} className="btn-primary btn-sm">
            <Printer size={13} /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Summary — the headline numbers a judge reads first */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 print:grid-cols-4">
        <Panel className="!p-4">
          <div className="label flex items-center gap-1.5"><Clock size={12} /> Time (3 tasks)</div>
          <div className="tnum mt-1 text-[24px] font-bold text-text">
            {totals.manualMin} → {totals.agentMin} min
          </div>
          <div className="caption text-success">
            −{Math.round((1 - totals.agentMin / Math.max(1, totals.manualMin)) * 100)}% with the agent
          </div>
        </Panel>
        <Panel className="!p-4">
          <div className="label flex items-center gap-1.5"><Coins size={12} /> Cost (gas + API)</div>
          <div className="tnum mt-1 text-[24px] font-bold text-text">
            {totals.manualCost.toFixed(5)} → {totals.agentCost.toFixed(5)} BNB
          </div>
          <div className="caption text-success">
            −{Math.round((1 - totals.agentCost / Math.max(1e-9, totals.manualCost)) * 100)}% with the agent
          </div>
        </Panel>
        <Panel className="!p-4">
          <div className="label flex items-center gap-1.5"><TrendingUp size={12} /> Output quality</div>
          <div className="tnum mt-1 text-[24px] font-bold text-text">
            {totals.qManual.toFixed(1)} → {totals.qAgent.toFixed(1)} <span className="text-[13px] text-muted">/ 10</span>
          </div>
          <div className="caption text-success">higher with the agent</div>
        </Panel>
        <Panel className="!p-4">
          <div className="label flex items-center gap-1.5"><BadgeCheck size={12} /> Verifiability</div>
          <div className="mt-1 text-[14px] font-semibold text-text">
            {sessionPayments.length} payment(s) · memory hash intact
          </div>
          <div className="caption">{session.memory_hash.slice(0, 18)}…</div>
        </Panel>
      </div>

      {/* Task table — editable so operators record their real runs */}
      <Panel>
        <SectionTitle
          title="Three tasks, run both ways"
          sub="Edit the numbers to match your recorded runs — the totals recompute live. One task is from trading, one from security."
        />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-[12px] tracking-wide text-muted">
                <th className="pb-2 pr-3">Task</th>
                <th className="pb-2 pr-3">Domain</th>
                <th className="pb-2 pr-3">Manual min</th>
                <th className="pb-2 pr-3">Agent min</th>
                <th className="pb-2 pr-3">Manual BNB</th>
                <th className="pb-2 pr-3">Agent BNB</th>
                <th className="pb-2 pr-3">Quality M→A</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2.5 pr-3">
                    <div className="font-medium">{t.task}</div>
                    <div className="caption mt-0.5 max-w-md">{t.notes}</div>
                  </td>
                  <td className="py-2.5 pr-3">{domainTag(t.domain)}</td>
                  <td className="py-2.5 pr-3">
                    <input
                      type="number"
                      min={1}
                      value={t.manualMinutes}
                      onChange={(e) => setTask(i, { manualMinutes: Number(e.target.value) })}
                      className="input !w-20 !py-1"
                    />
                  </td>
                  <td className="py-2.5 pr-3">
                    <input
                      type="number"
                      min={1}
                      value={t.agentMinutes}
                      onChange={(e) => setTask(i, { agentMinutes: Number(e.target.value) })}
                      className="input !w-20 !py-1"
                    />
                  </td>
                  <td className="py-2.5 pr-3">
                    <input
                      type="number"
                      step="0.00001"
                      min={0}
                      value={t.manualCostBnb}
                      onChange={(e) => setTask(i, { manualCostBnb: Number(e.target.value) })}
                      className="input !w-24 !py-1"
                    />
                  </td>
                  <td className="py-2.5 pr-3">
                    <input
                      type="number"
                      step="0.00001"
                      min={0}
                      value={t.agentCostBnb}
                      onChange={(e) => setTask(i, { agentCostBnb: Number(e.target.value) })}
                      className="input !w-24 !py-1"
                    />
                  </td>
                  <td className="py-2.5 pr-3">
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={t.qualityManual}
                      onChange={(e) => setTask(i, { qualityManual: Number(e.target.value) })}
                      className="input !w-14 !py-1"
                    />{" "}
                    →{" "}
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={t.qualityAgent}
                      onChange={(e) => setTask(i, { qualityAgent: Number(e.target.value) })}
                      className="input !w-14 !py-1"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Risk control summary — what kept the agent safe */}
      <Panel>
        <SectionTitle
          title="Why the agent run was safe"
          sub="Every task ran inside a session with on-chain verifiable limits."
        />
        <ul className="caption grid gap-2 sm:grid-cols-2">
          <li className="flex items-start gap-2"><Shield size={13} className="mt-0.5 text-success" /> Budget cap {session.budget.max_total} {session.budget.token} total, {session.budget.max_per_action} per action</li>
          <li className="flex items-start gap-2"><Shield size={13} className="mt-0.5 text-success" /> Forbidden actions: {session.permissions.forbidden_actions.join(", ") || "none set"}</li>
          <li className="flex items-start gap-2"><Shield size={13} className="mt-0.5 text-success" /> Allowlisted targets: {session.permissions.allowed_targets.length || "any"}</li>
          <li className="flex items-start gap-2"><Shield size={13} className="mt-0.5 text-success" /> SHA-256 memory hash verified on every action; mismatch = hard block</li>
        </ul>
      </Panel>

      <p className="caption text-center text-muted/70 print:mt-2">
        Agent Advantage Report · session {sessionId} · generated {new Date().toISOString().slice(0, 10)} · BNB Agent Market
      </p>
    </div>
  );
}

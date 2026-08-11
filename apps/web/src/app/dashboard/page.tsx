"use client";
// Dashboard — active sessions, budget used, recent actions, alerts
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ChevronRight,
  Database,
  Wallet,
  Zap,
} from "lucide-react";
import { EmptyState, Panel, SectionTitle, StatCard } from "@/components/ui";
import SessionPass from "@/components/SessionPass";
import { useMarket } from "@/lib/store";
import { timeAgo } from "@/lib/format";
import type { SessionEvent } from "@/lib/types";

export default function DashboardPage() {
  const { walletConnected, connectWallet, sessions, payments, events } = useMarket();

  if (!walletConnected) {
    return (
      <div className="mx-auto max-w-xl">
        <EmptyState
          icon={<Wallet size={20} />}
          title="Connect your wallet to see your sessions"
          description="Your active agents, spending, and alerts live here. This demo connects a labeled demo wallet."
          action={
            <button onClick={connectWallet} className="btn-primary">
              <Wallet size={14} /> Connect (demo)
            </button>
          }
        />
      </div>
    );
  }

  const activeSessions = sessions.filter(
    (s) => s.status === "active" || s.status === "pending_confirmation"
  );
  const budgetUsed = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const alerts = events.filter((e) => e.type === "alert" || e.status === "blocked");
  const recent = events.slice(0, 8);

  const eventIcon = (e: SessionEvent) => {
    if (e.type === "alert") return <AlertTriangle size={13} className="text-warning" />;
    if (e.type === "revoked") return <AlertTriangle size={13} className="text-danger" />;
    if (e.type === "payment") return <Database size={13} className="text-info" />;
    if (e.type === "confirmed") return <Activity size={13} className="text-success" />;
    return <Activity size={13} className="text-primary" />;
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="title-page">Dashboard</h1>
        <p className="body-sm mt-1">
          Everything your agents are doing, with proof, in one place.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active sessions"
          value={String(activeSessions.length)}
          hint="Running or waiting for you"
          tone="gold"
          icon={<Zap size={14} />}
        />
        <StatCard
          label="Budget used"
          value={`${budgetUsed.toFixed(2)} BNB`}
          hint="Across all settled payments"
          tone="success"
          icon={<Database size={14} />}
        />
        <StatCard
          label="Recent actions"
          value={String(events.length)}
          hint="All recorded with proof"
          tone="info"
          icon={<Activity size={14} />}
        />
        <StatCard
          label="Alerts"
          value={String(alerts.length)}
          hint="Blocked or suspicious actions"
          tone="danger"
          icon={<AlertTriangle size={14} />}
        />
      </div>

      <section>
        <SectionTitle
          title="Your sessions"
          sub="Active sessions and ones waiting for your confirmation."
          right={
            <Link href="/marketplace" className="link text-[13px]">
              Hire another agent <ChevronRight size={12} className="inline" />
            </Link>
          }
        />
        {sessions.length === 0 ? (
          <EmptyState
            icon={<Zap size={20} />}
            title="No active sessions."
            description="Hire your first agent from the marketplace to get started."
            action={
              <Link href="/marketplace" className="btn-primary btn-sm">
                Explore Marketplace
              </Link>
            }
          />
        ) : activeSessions.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeSessions.map((s) => (
              <SessionPass key={s.session_id} session={s} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Zap size={20} />}
            title="No active sessions."
            description="Hire an agent to create a session with limits you control."
            action={
              <Link href="/marketplace" className="btn-primary btn-sm">
                Explore agents
              </Link>
            }
          />
        )}
      </section>

      <section>
        <SectionTitle title="Recent activity" sub="The latest actions across your sessions." />
        <Panel>
          {recent.length > 0 ? (
            <div className="flex flex-col">
              {recent.map((e) => (
                <div
                  key={e.id}
                  className="flex items-start gap-3 border-b border-border/40 py-2.5 last:border-0"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2">
                    {eventIcon(e)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-medium">{e.title}</span>
                      <span className="caption">{timeAgo(e.ts)}</span>
                    </div>
                    <p className="caption mt-0.5 truncate">{e.detail}</p>
                  </div>
                  <Link
                    href={`/sessions/${e.session_id}`}
                    className="link shrink-0 text-[12px]"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="body-sm">No activity yet. Hire an agent to get started.</p>
          )}
        </Panel>
      </section>
    </div>
  );
}

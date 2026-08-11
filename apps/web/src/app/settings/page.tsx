"use client";
// Settings — wallet, network, payment prefs, notifications, security, memory export
import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Download,
  FileText,
  Globe,
  Lock,
  Store,
  Wallet,
} from "lucide-react";
import {
  CopyText,
  Label,
  Panel,
  SectionTitle,
  Tooltip,
  TrustNote,
} from "@/components/ui";
import { useMarket, exportMemoryBundle } from "@/lib/store";
import { truncateAddress } from "@/lib/format";

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
        on ? "bg-primary" : "border border-border bg-surface-2"
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
          on ? "translate-x-4" : ""
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const {
    walletConnected,
    walletAddress,
    connectWallet,
    disconnectWallet,
    requireTypedConfirm,
    setRequireTypedConfirm,
  } = useMarket();
  const [network, setNetwork] = useState("BNB Mainnet");
  const [defaultToken, setDefaultToken] = useState("BNB");
  const [maxFee, setMaxFee] = useState("0.5");
  const [notifyEvents, setNotifyEvents] = useState(true);
  const [notifyPayments, setNotifyPayments] = useState(true);
  const [notifyRevokes, setNotifyRevokes] = useState(false);
  const [exportNote, setExportNote] = useState<string | null>(null);

  const doExport = async () => {
    const { payload, hash } = await exportMemoryBundle();
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `memory-bundle-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportNote(`Memory bundle exported. SHA-256: ${hash.slice(0, 16)}…`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard" className="link inline-flex items-center gap-1 text-[13px]">
          <ArrowLeft size={13} /> Dashboard
        </Link>
        <h1 className="title-page mt-2">Settings</h1>
        <p className="body-sm mt-1">Wallet, network, payments, notifications, and security.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Wallet */}
        <Panel className="flex flex-col gap-4">
          <SectionTitle title="Wallet" sub="Your identity for sessions and payments." />
          {walletConnected && walletAddress ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-btn border border-border bg-surface-2/50 p-3">
                <div className="label mb-1.5">Connected address</div>
                <div className="flex items-center gap-2">
                  <span className="hash">{truncateAddress(walletAddress, 8)}</span>
                  <CopyText text={walletAddress} />
                </div>
              </div>
              <button onClick={disconnectWallet} className="btn-danger self-start">
                Disconnect wallet
              </button>
              <TrustNote>Demo wallet — no real funds are used and nothing moves on-chain.</TrustNote>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="body-sm">Connect to create sessions, confirm memory, and approve payments.</p>
              <button onClick={connectWallet} className="btn-primary self-start">
                <Wallet size={14} /> Connect (demo)
              </button>
            </div>
          )}
        </Panel>

        {/* Network */}
        <Panel className="flex flex-col gap-4">
          <SectionTitle title="Network" sub="Which chain your agents operate on." />
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-muted" />
            <select
              className="select !w-auto"
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
            >
              <option value="BNB Mainnet">BNB Mainnet</option>
              <option value="BNB Testnet">BNB Testnet</option>
            </select>
          </div>
          <p className="caption">
            Demo note: switching networks does not change the labeled adapters — they
            remain DEMO until official contract addresses are verified.
          </p>
        </Panel>

        {/* Payment preferences */}
        <Panel className="flex flex-col gap-4">
          <SectionTitle title="Payment preferences" sub="Defaults for new sessions." />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Default token</Label>
              <select
                className="select"
                value={defaultToken}
                onChange={(e) => setDefaultToken(e.target.value)}
              >
                <option value="BNB">BNB</option>
                <option value="CAKE">CAKE</option>
                <option value="USDT">USDT</option>
              </select>
            </div>
            <div>
              <Tooltip label="The largest single payment you will approve without a second look.">
                <Label>Max fee per task</Label>
              </Tooltip>
              <input
                className="input tnum"
                type="number"
                min="0"
                step="0.01"
                value={maxFee}
                onChange={(e) => setMaxFee(e.target.value)}
              />
            </div>
          </div>
          <p className="caption">Current default: {defaultToken} · max fee {maxFee} {defaultToken}.</p>
        </Panel>

        {/* Notifications */}
        <Panel className="flex flex-col gap-4">
          <SectionTitle title="Notifications" sub="What you want to hear about." />
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[14px]">
                <Bell size={14} className="text-muted" /> Session events
              </span>
              <Toggle on={notifyEvents} onChange={setNotifyEvents} label="Session events" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[14px]">
                <Bell size={14} className="text-muted" /> Payment requests
              </span>
              <Toggle on={notifyPayments} onChange={setNotifyPayments} label="Payment requests" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[14px]">
                <Bell size={14} className="text-muted" /> Revocations
              </span>
              <Toggle on={notifyRevokes} onChange={setNotifyRevokes} label="Revocations" />
            </div>
          </div>
        </Panel>

        {/* Security */}
        <Panel className="flex flex-col gap-4">
          <SectionTitle title="Security" sub="How approvals behave." />
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-[14px]">
              <Lock size={14} className="text-muted" />
              Require typed CONFIRM for high-risk actions
            </span>
            <Toggle on={requireTypedConfirm} onChange={setRequireTypedConfirm} label="Typed CONFIRM for high risk" />
          </div>
          <p className="caption">
            When on, high-risk approvals ask you to type CONFIRM before they can proceed.
            {requireTypedConfirm ? " This is the recommended setting." : " Consider turning this back on."}
          </p>
          {!requireTypedConfirm && (
            <p className="flex items-start gap-1.5 rounded-btn border border-amber/30 bg-amber/8 px-3 py-2 text-[12px] text-warning">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              Reduced confirmation (demo): high-risk actions approve with one click
              while this is off. The Confirm Center shows the same warning.
            </p>
          )}
        </Panel>

        {/* List your agent (demo scope) */}
        <Panel className="flex flex-col gap-4 lg:col-span-2">
          <SectionTitle
            title="List your agent (demo scope)"
            sub="What a real listing needs — and what this demo can do today."
          />
          <ol className="grid gap-3 sm:grid-cols-3">
            <li className="rounded-btn border border-border bg-surface-2/40 p-3.5">
              <div className="label mb-1">1 · ERC-8004 registration</div>
              <p className="body-sm">
                Your agent needs an on-chain identity in the ERC-8004 registry with an
                attested track record.
              </p>
              <p className="caption mt-1.5">
                Status: DEMO — the official registry address and ABI are UNKNOWN
                (memory/UNKNOWN_ITEMS.md), so registration is not executable yet.
              </p>
            </li>
            <li className="rounded-btn border border-border bg-surface-2/40 p-3.5">
              <div className="label mb-1">2 · Metadata</div>
              <p className="body-sm">
                Name, tagline, description, category, risk level, fee model, and the
                capabilities buyers can hire.
              </p>
              <p className="caption mt-1.5">
                The marketplace already renders all of these fields from the agent
                registry.
              </p>
            </li>
            <li className="rounded-btn border border-border bg-surface-2/40 p-3.5">
              <div className="label mb-1">3 · Adapter status</div>
              <p className="body-sm">
                Each integration (payments, contracts, data) must pass the honesty gate:
                labeled DEMO until the official SDKs are verified.
              </p>
              <p className="caption mt-1.5">
                Status: all adapters are labeled DEMO today; nothing is faked.
              </p>
            </li>
          </ol>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/marketplace" className="btn-primary btn-sm">
              <Store size={13} /> See agents that are listed
            </Link>
            <Link href="/evidence" className="btn-ghost btn-sm">
              <FileText size={13} /> Evidence of what is wired
            </Link>
          </div>
          <TrustNote>
            This demo build cannot register new agents yet. Listing goes live when the
            official ERC-8004 registry address and ABI are verified — nothing here
            pretends otherwise.
          </TrustNote>
        </Panel>

        {/* Memory export */}
        <Panel className="flex flex-col gap-4">
          <SectionTitle title="Memory export" sub="Back up your session memory bundle." />
          <button onClick={doExport} className="btn-primary self-start">
            <Download size={14} /> Export memory bundle
          </button>
          {exportNote && <p className="caption">Note: {exportNote}</p>}
          <p className="caption">
            The bundle contains sessions, confirmations, payments, and events with a
            SHA-256 checksum. Import it later from the Memory Center.
          </p>
        </Panel>
      </div>
    </div>
  );
}

"use client";
// Memory Center — build attestations, session memory table, snapshots, export/import
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Download,
  FileText,
  RefreshCw,
  Shield,
  Upload,
  X,
} from "lucide-react";
import {
  CopyText,
  Label,
  Panel,
  PanelGlass,
  SectionTitle,
  Spinner,
  Tooltip,
} from "@/components/ui";
import { useMarket, computeMemoryBundle, exportMemoryBundle } from "@/lib/store";
import {
  buildAttestation,
  classifyManifestHash,
  type ManifestHashStatus,
  type MemoryAttestation,
} from "@/lib/memory";
import { timeAgo } from "@/lib/format";
import type { Confirmation, PaymentRecord, SessionEvent, SessionManifest } from "@/lib/types";

const STATUS_CLS: Record<string, string> = {
  draft: "badge-blue",
  pending_confirmation: "badge-amber",
  active: "badge-green",
  paused: "badge-gray",
  completed: "badge-blue",
  revoked: "badge-red",
  expired: "badge-gray",
};

export default function MemoryPage() {
  const { sessions, confirmations, snapshots, importBundle, connectWallet } = useMarket();
  const [project, setProject] = useState("BNB Agent Market Core");
  const [phase, setPhase] = useState("Frontend build");
  const [attestation, setAttestation] = useState<MemoryAttestation | null>(null);
  const [building, setBuilding] = useState(false);
  const [verifyMap, setVerifyMap] = useState<
    Record<string, ManifestHashStatus | "checking">
  >({});
  const [importNote, setImportNote] = useState<string | null>(null);
  const [unverifiedIds, setUnverifiedIds] = useState<Set<string>>(new Set());
  const [bundleHash, setBundleHash] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // A1 — the bundle hash shown here is the REAL hash of the current store contents,
  // computed with the same exportMemoryBundle() pipeline used by the export button.
  useEffect(() => {
    let live = true;
    computeMemoryBundle().then(({ hash }) => {
      if (live) setBundleHash(hash);
    });
    return () => {
      live = false;
    };
  }, [sessions, confirmations]);

  const build = async () => {
    setBuilding(true);
    const att = await buildAttestation({
      sessionId: `ses-build-${Date.now().toString(16).slice(-6)}`,
      project: project || "BNB Agent Market Core",
      currentPhase: phase || "Frontend build",
      activeProduct: "BNB Agent Market Core (AlphaDesk + TaskChain Bazaar)",
      confirmedGoal: "Ship the production marketplace with live 8004scan data.",
      knownConstraints: [
        "Real wallet connect (BSC mainnet enforced) · sessions carry signed confirmation proofs",
        "No unverified on-chain claims",
        "Safety over features",
      ],
      completedSinceLastSession: [
        "Store foundation (zustand + persist)",
        "Memory hashing utilities (SHA-256)",
        "Lumen Deck design system + primitives",
      ],
      inProgress: ["Frontend pages", "Hire wizard end-to-end flow"],
      blockedUnknown: [
        "ERC-8004 registry address + ABI",
        "Binance x402 payment schema",
        "Altana SDK / session contract interface",
      ],
      nextBestAction: "Run the app, verify pages, and walk the hire flow end to end.",
      model: "deepseek-v4-flash",
      confirmationRequired: "YES",
    });
    setAttestation(att);
    setBuilding(false);
  };

  const verifySession = async (s: SessionManifest) => {
    setVerifyMap((m) => ({ ...m, [s.session_id]: "checking" }));
    const st = await classifyManifestHash(s);
    setVerifyMap((m) => ({ ...m, [s.session_id]: st }));
  };

  const doExport = async () => {
    const { payload, hash } = await exportMemoryBundle();
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `memory-bundle-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setImportNote(`Memory bundle exported. SHA-256: ${hash.slice(0, 16)}…`);
  };

  const doImport = async (file: File) => {
    let parsed: {
      sessions?: SessionManifest[];
      confirmations?: unknown[];
      payments?: unknown[];
      events?: unknown[];
    };
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      setImportNote(
        "Import failed — the file is not valid JSON. Export a bundle from this page or Settings, then import that file."
      );
      return;
    }
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.sessions)) {
      setImportNote(
        "Import failed — this file does not look like a memory bundle (no sessions array). Export a bundle from this page or Settings, then import that file."
      );
      return;
    }
    const res = await importBundle({
      sessions: parsed.sessions,
      confirmations: parsed.confirmations as Confirmation[] | undefined,
      payments: parsed.payments as PaymentRecord[] | undefined,
      events: parsed.events as SessionEvent[] | undefined,
    });
    setUnverifiedIds(new Set(res.unverified));
    if (res.unverified.length === 0) {
      setImportNote(
        `Import complete — ${res.verified.length} session(s) restored and hash-verified. Confirmations, payments, and events were restored too.`
      );
    } else {
      setImportNote(
        `Import complete — ${res.verified.length} session(s) verified, ${res.unverified.length} imported as UNVERIFIED because their memory hash does not match the manifest. Review them before relying on them.`
      );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard" className="link inline-flex items-center gap-1 text-[13px]">
          <ArrowLeft size={13} /> Dashboard
        </Link>
        <h1 className="title-page mt-2">Memory Center</h1>
        <p className="body-sm mt-1">
          Memory is the fingerprint of every session. Build attestations, verify hashes,
          and export the bundle.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Build attestation */}
        <Panel className="flex flex-col gap-4">
          <SectionTitle
            title="Build memory attestation"
            sub="For developers and admins — produces a checksum-verified attestation."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Project</Label>
              <input
                className="input"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="Project name"
              />
            </div>
            <div>
              <Label>Phase</Label>
              <input
                className="input"
                value={phase}
                onChange={(e) => setPhase(e.target.value)}
                placeholder="Current phase"
              />
            </div>
          </div>
          <button onClick={build} disabled={building} className="btn-primary self-start">
            {building ? <Spinner label="Hashing attestation…" /> : <><Shield size={14} /> Build attestation</>}
          </button>
          {attestation && (
            <div className="rounded-btn border border-border bg-surface-2/50 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="label">Memory hash</div>
                <span className="badge-green"><Check size={12} /> Checksum verified</span>
              </div>
              <div className="mt-1.5">
                <CopyText text={`0x${attestation.memoryHash}`} />
              </div>
              <p className="caption mt-2">
                Session {attestation.sessionId} · phase &quot;{attestation.currentPhase}&quot; · next:{" "}
                {attestation.nextBestAction}
              </p>
            </div>
          )}
        </Panel>

        {/* Export / import */}
        <PanelGlass className="flex flex-col gap-4">
          <SectionTitle title="Export / import" sub="Carry your memory bundle between machines or demos." />
          <div className="flex flex-wrap gap-2">
            <button onClick={doExport} className="btn-primary">
              <Download size={14} /> Export memory bundle
            </button>
            <button onClick={() => fileRef.current?.click()} className="btn-ghost">
              <Upload size={14} /> Import bundle
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) doImport(f);
                e.target.value = "";
              }}
            />
          </div>
          {importNote && (
            <p className="caption">Note: {importNote}</p>
          )}
          <div className="flex items-center justify-between rounded-btn border border-border bg-surface-2/40 px-3 py-2">
            <span className="flex items-center gap-2 text-[13px]">
              <FileText size={13} className="text-primary" /> Bundle SHA-256
            </span>
            {bundleHash ? (
              <CopyText text={bundleHash} />
            ) : (
              <button onClick={connectWallet} className="link text-[12px]">
                Connect wallet to view
              </button>
            )}
          </div>
          <Tooltip label="The bundle contains all sessions, confirmations, payments, and events with hashes.">
            <p className="caption">
              Every export records a real snapshot in this browser and is hash-verified
              locally. Import restores what was exported — sessions whose hash does not
              match are marked UNVERIFIED, never silently dropped.
            </p>
          </Tooltip>
        </PanelGlass>
      </div>

      {/* Session memory table */}
      <Panel>
        <SectionTitle
          title="Session memory"
          sub="Every session's memory hash and verification status."
        />
        <div className="flex flex-col">
          {sessions.map((s) => {
            const v = verifyMap[s.session_id];
            return (
              <div
                key={s.session_id}
                className="flex flex-wrap items-center gap-3 border-b border-border/40 py-3 last:border-0"
              >
                <span className={STATUS_CLS[s.status] ?? "badge-gray"}>{s.status.replace("_", " ")}</span>
                <CopyText text={s.session_id} />
                <CopyText text={s.memory_hash} />
                <span className="flex-1" />
                {unverifiedIds.has(s.session_id) && (
                  <span className="badge-amber">
                    <X size={12} /> UNVERIFIED — import failed hash check
                  </span>
                )}
                <button
                  onClick={() => verifySession(s)}
                  disabled={v === "checking"}
                  className="btn-ghost btn-sm"
                >
                  {v === "checking" ? <Spinner label="Verifying…" /> : <><Shield size={12} /> Verify</>}
                </button>
                {v === "verified" && <span className="badge-green"><Check size={12} /> VERIFIED</span>}
                {v === "seed" && <span className="badge-amber">DEMO seed — placeholder hash</span>}
                {v === "pre-upgrade" && <span className="badge-amber">Pre-upgrade fingerprint</span>}
                {v === "tamper" && <span className="badge-red"><X size={12} /> MISMATCH</span>}
              </div>
            );
          })}
        </div>
        <p className="caption mt-3">
          Sessions created through the Hire flow compute real hashes and verify as
          matched. Seeded demo sessions show a labeled DEMO badge; imported bundles
          that fail the hash check are flagged UNVERIFIED so you can tell them
          apart.
        </p>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Export snapshots (this browser) */}
        <Panel>
          <SectionTitle
            title="Export snapshots (this browser)"
            sub="One real entry per export — id, time, and the actual bundle SHA-256."
          />
          {snapshots.length === 0 ? (
            <p className="body-sm">
              No exports yet. Export a bundle above and it will be recorded here with
              its real hash.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {snapshots.map((sn) => (
                <div
                  key={sn.id}
                  className="flex items-center justify-between gap-3 rounded-btn border border-border bg-surface-2/40 px-3 py-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <RefreshCw size={13} className="text-primary" />
                    <div>
                      <div className="text-[13px] font-medium">{sn.id}</div>
                      <div className="caption">{timeAgo(sn.time)}</div>
                    </div>
                  </div>
                  <CopyText text={sn.hash} />
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Confirmation history */}
        <Panel>
          <SectionTitle title="Confirmation history" sub="Every approval and refusal, recorded." />
          <div className="flex flex-col gap-2">
            {confirmations.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-btn border border-border bg-surface-2/40 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="text-[13px] font-medium capitalize">
                    {c.action_type.replace("_", " ")}
                  </div>
                  <div className="caption mt-0.5">
                    {c.session_id} · {timeAgo(c.timestamp)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.user_confirmed ? (
                    <span className="badge-green"><Check size={12} /> Confirmed</span>
                  ) : (
                    <span className="badge-amber">Awaiting you</span>
                  )}
                  <Tooltip label="The memory fingerprint this confirmation was bound to.">
                    <CopyText text={c.memory_hash} />
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

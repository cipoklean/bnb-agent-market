// Altana session API — server-side bridge to the on-chain Keystore.
// The client dashboard (/altana-sessions) talks to THIS route only; the
// SDK and ALTANA_PRIVATE_KEY never enter the browser bundle.
//
//   GET  /api/altana/sessions        → list active session grants
//   POST /api/altana/sessions        → grant a new session key on-chain
//   POST /api/altana/sessions/revoke → revoke (real on-chain transaction)
import { NextResponse } from "next/server";
import {
  altanaAdapter,
  altanaMode,
  altanaSubmissionWallet,
} from "@/lib/adapters/altana";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4 * 1024;

export async function GET() {
  if (altanaMode() === "unconfigured") {
    return NextResponse.json(
      {
        success: false,
        mode: "unconfigured",
        wallet: altanaSubmissionWallet(),
        error:
          "Altana live mode is not configured. Set ALTANA_PRIVATE_KEY and ALTANA_WALLET, then redeploy.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
  try {
    const sessions = await altanaAdapter.listSessions();
    return NextResponse.json(
      { success: true, mode: "live", sessions },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        mode: "live",
        error: e instanceof Error ? e.message : "Keystore query failed",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function POST(req: Request) {
  if (altanaMode() === "unconfigured") {
    return NextResponse.json(
      {
        success: false,
        mode: "unconfigured",
        error:
          "Altana live mode is not configured. Set ALTANA_PRIVATE_KEY and ALTANA_WALLET, then redeploy.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return NextResponse.json({ success: false, error: "Body too large" }, { status: 413 });
  }
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(await req.text()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }
  const action = String(body.action ?? "");
  try {
    if (action === "revoke") {
      const sessionId = String(body.sessionId ?? "");
      if (!sessionId) {
        return NextResponse.json({ success: false, error: "sessionId required" }, { status: 400 });
      }
      await altanaAdapter.revokeSession(sessionId);
      return NextResponse.json(
        { success: true, revoked: sessionId },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
    // default: grant a new session
    const agentAddress = String(body.agentAddress ?? "");
    const spendCap = String(body.spendCap ?? "");
    const expiryDays = Number(body.expiryDays ?? 0);
    const allowedTargets = Array.isArray(body.allowedTargets)
      ? (body.allowedTargets as string[]).map(String)
      : [];
    if (!/^0x[a-fA-F0-9]{40}$/.test(agentAddress)) {
      return NextResponse.json(
        { success: false, error: "agentAddress must be a 0x… 40-hex address" },
        { status: 400 }
      );
    }
    if (!/^\d+(\.\d+)?$/.test(spendCap) || Number(spendCap) <= 0) {
      return NextResponse.json(
        { success: false, error: "spendCap must be a positive number" },
        { status: 400 }
      );
    }
    if (!Number.isInteger(expiryDays) || expiryDays < 1 || expiryDays > 90) {
      return NextResponse.json(
        { success: false, error: "expiryDays must be 1–90" },
        { status: 400 }
      );
    }
    const session = await altanaAdapter.createSession({
      userAddress: "",
      agentAddress,
      spendCap,
      expiryDays,
      allowedTargets,
    });
    return NextResponse.json(
      { success: true, session },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "Keystore transaction failed",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}

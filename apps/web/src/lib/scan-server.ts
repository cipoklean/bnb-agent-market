// Server-side fetch for the 8004scan public REST API — shared by the
// same-origin proxy route (/api/8004scan/[chainId]/[tokenId]), the agent
// submission endpoint (/api/agents/submit), and the LIVE directory pages
// (marketplace / verticals / home, via listAgents + cached stats).
//
// Node-only (node:https + node:dns/promises) — NEVER import from client code.
// WHY the IP-probe dance: 8004scan.io rotates 4 A-record IPs and the first one
// is blackholed from some networks. Node's fetch connects to the FIRST address
// only and fails; browsers give up (~13s) instead of rotating. This probes each
// resolved address with a short per-attempt timeout (SNI keeps the TLS cert
// valid) and returns the first working response. Worst case (3 IPs x 2s +
// 4s plain-fetch fallback = 10s) stays under Vercel's 10s function cap.
//
// NOTE: The snapshot/degraded fallbacks have been removed. On indexer failure,
// the endpoint returns { agents: [], total: 0, degraded: true } so the UI
// displays a clear "no data" state instead of stale mock data.
import { resolve4 } from "node:dns/promises";
import https from "node:https";

export const SCAN_HOST = "8004scan.io";
const MAX_IPS = 3;
// Timeouts sized to fit Vercel's 10s hobby function cap even in the worst
// chain: 3 IPs x 2s + 4s plain-fetch fallback = 10s. Typical case (first IP
// responds) finishes in ~300ms.
const PER_IP_TIMEOUT_MS = 2_000;
const BASE_URL = `https://${SCAN_HOST}/api/v1/public`;
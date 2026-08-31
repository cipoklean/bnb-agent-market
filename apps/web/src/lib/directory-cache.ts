// Directory resilience — the live marketplace must NEVER render "0 + scary
// banner" when a recent good result exists. Layered fallback, in order:
//   1. live indexer result (5-minute TTL; module-level lastGood refreshed)
//   2. true degraded (nothing available) → { agents: [], degraded: true }
// Server-only (imports scan-server). Env overrides (dev/test only):
//   SCAN_FORCE_FAIL=1            → listAgents reports degraded (prove fallbacks)
//   DIRECTORY_TTL_MS=<ms>        → override the 5-minute TTL (tests)
//   DIRECTORY_DISABLE_SNAPSHOT=1 → skip the bundled snapshot (prove degraded)
import { listAgents, type DirectoryResult } from "./scan-server";
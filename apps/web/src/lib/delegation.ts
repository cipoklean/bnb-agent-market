// Strict delegation tree (D008) — revocation security.
//
// Tree: Human > Agent > Sub-agent.
//   - A session records WHO delegated it in `parent_session_id`:
//       undefined / "user"  → hired by the human
//       any agent identity  → hired BY that agent (its sub-agent)
//   - Revocation rule:
//       caller "user" (the human) may ALWAYS revoke.
//       an agent caller may ONLY revoke a session whose parent_session_id
//       equals its own identity — i.e. the sub-agent IT delegated.
//       anything else (sibling sessions, parent sessions, human-hired
//       sessions) is DENIED.
//
// Plain-JS-on-purpose (no imports, no TS-only syntax): this module is
// importable directly by Node tests via `--experimental-strip-types` so the
// revocation matrix is verifiable offline (tests/verify-delegation.mjs).
export const HUMAN_CALLER_ID = "user";

export const DELEGATION_DENY_MESSAGE =
  "Delegates cannot revoke sibling or parent sessions";

export interface DelegationTarget {
  parent_session_id?: string | null;
}

/** The caller agent is the DIRECT delegator of the target session. */
export function isDelegatingParent(
  target: DelegationTarget | null | undefined,
  callerId: string
): boolean {
  if (!target || callerId === HUMAN_CALLER_ID) return false;
  return target.parent_session_id === callerId;
}

/** Human always allowed; agents only for sessions they delegated. */
export function canRevoke(
  target: DelegationTarget | null | undefined,
  callerId: string
): boolean {
  if (callerId === HUMAN_CALLER_ID) return true;
  return isDelegatingParent(target, callerId);
}

/** Throw the standard denial when an agent caller lacks delegation rights. */
export function assertCanRevoke(
  target: DelegationTarget | null | undefined,
  callerId: string
): void {
  if (!canRevoke(target, callerId)) {
    throw new Error(DELEGATION_DENY_MESSAGE);
  }
}

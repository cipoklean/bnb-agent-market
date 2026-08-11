# CONSTRAINTS

## Security
- Agents never have unlimited control: caps, expiries, allowlists, revocation, simulation, audit logs.
- No high-risk action without user confirmation (typed CONFIRM for high-risk).
- Never store private keys; use env vars; no fund custody unless clearly necessary.
- Every important action must produce a proof.
- Agents cannot revoke human-hired agents (strict delegation tree, D008): an agent caller may only revoke sessions it delegated (`parent_session_id` equals its identity); human-hired, sibling, and parent sessions are denied with "Delegates cannot revoke sibling or parent sessions".

## UX
- Marketplace understandable in <5s; hire in <90s; risk understood in <10s; memory confirm in <10s; revoke in <5s.
- Max 3 primary actions per screen; no crowded screens; plain-English tooltips for every technical term.
- Every page has a primary action + a back path; destructive actions require confirmation.
- Loading states explain what is happening; errors suggest next step.

## Technical
- No guessing: unknown integration details → UNKNOWN + adapter placeholder, never faked.
- Memory survives reload and model switch (hash-verified, exportable).
- Frontend: Next.js + TypeScript + Tailwind; monospace for addresses/hashes/IDs.
- Keep contracts minimal; Foundry tests; events for everything.

## Hackathon
- Align with BNB Agent Studio marketplace challenge tracks (ERC-8004, x402, Altana, PancakeSwap, TermiX, AltLayer).
- Evidence Center must export: project summary, demo script, transaction proofs, memory attestations, confirmation logs, per-partner proofs.
- Demo must run without external credentials (mock-first with clear adapter boundaries).

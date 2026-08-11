# UI SYSTEM — "Lumen Deck"

A calm financial command center. Dark elegant surface, soft glass panels, high-contrast text, gold used sparingly. Feels like a trusted co-pilot.

## Color Tokens
```css
--bg: #0B0E14          --surface: #121826      --surface-2: #1A2233
--border: #263043      --text: #F5F7FA          --muted: #98A2B3
--primary: #F0B90B     --primary-contrast: #0B0E14
--success: #22C55E     --warning: #F59E0B       --danger: #EF4444
--info: #6C8CFF
```

## Typography
- UI font: Inter or IBM Plex Sans. Mono: IBM Plex Mono (addresses, hashes, IDs, tx data).
- Page title 28px · Section title 20px · Card title 16px · Body 14px · Caption 12px.

## Spacing & Radius
- Base 4px; spacing 8/16/24/32. Radius: cards 16px, buttons 10px, inputs 10px, badges 999px.

## Style Rules
- Soft glass panels (surface + border + subtle blur), rounded corners, subtle motion only.
- BNB gold (#F0B90B) as accent only — buttons, primary CTA, active states, gold badge.
- Status colors: success/warning/danger/info with icon + text (never color alone).

## Component Inventory
ui primitives: Panel, Button (primary/ghost/danger), Badge, StatusPill, Tooltip, CopyText (hashes/addresses), EmptyState, SectionTitle, StatCard, ProgressBar, Modal/Sheet.
Feature components: AgentCard, RiskBadge, SessionPass, MemoryAttestationCard, ConfirmBar, ProofDrawer, ActivityTimeline, PermissionEditor, PaymentSheet, TrustPanel.

## Microcopy Rules (plain English)
- "Allow this agent to act with limits you control." (not "Authorize session key")
- "On-chain proof of this agent's history." (not "ERC-8004 attestation")
- "Stop this agent now." (not "Revoke session")
- Key trust lines to use across UI: "This agent can only do what you allow." · "You can set a spending limit." · "This session expires automatically." · "You can stop the agent anytime." · "Every action is recorded with proof." · "The agent must confirm the session before acting." · "No action happens until you confirm."

## Accessibility
- Contrast ≥ 4.5:1 for text; focus rings visible; all statuses have text + icon; tooltips reachable where tech terms appear.

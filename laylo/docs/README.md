# BillBee — Documentation Index

Repo entry points stay at root: `README.md`, `CLAUDE.md`, `SESSION_MEMORY.md`, `BRAND_GUIDE.md`.
Everything else lives here, grouped by what it is.

## `design/` — Visual + interaction design

| File | What it covers |
|---|---|
| `DESIGN_SYSTEM.md` | Token spec + per-component variants. Conceptual reference — for current hexes/tokens, **see `BRAND_GUIDE.md` at root**. |
| `REDESIGN_BRIEF.md` | Item 27 Strategist audit. Personality copy bank, microinteractions, IA. Pre-rebrand naming ("Laylo"). |
| `LAYOUT_REDESIGN_BRIEF.md` | Per-page layout patterns (Bento, Honeycomb Tile, Origami, Conversational Stack, Calendar Ribbon, Story Strip). Typography rationale. |
| `REDESIGN_QA_REPORT.md` | Item 27 Phase 4 QA report. |
| `LIVE_ANIMATION_PLAN.md` | Animation rollout plan. |

## `security/` — Audits + threat modeling

| File | What it covers |
|---|---|
| `COMPREHENSIVE_SECURITY_AUDIT.md` | Coordinator output — 15 unique HIGHs after dedup. Verdict matrix per launch tier. **Read this one first.** |
| `THREAT_MODEL.md` | STRIDE matrix, top-20 threats, GDPR/CCPA gaps. |
| `PENTEST_REPORT.md` | 0 CRIT, 1 HIGH, 9 MED, 8 LOW. Verdict on Plaid integration hardening. |
| `DATA_LEAK_AUDIT.md` | 0 CRIT, 3 HIGH, 6 MED, 5 LOW. |
| `CRYPTO_AUDIT.md` | 0 CRIT, 3 HIGH, 6 MED, 5 LOW. AES + ES256 review. |
| `DEPENDENCY_AUDIT.md` | 0 CRIT, 25 HIGH transitive, 13 MOD. |
| `INFRA_SECURITY_AUDIT.md` | 0 CRIT, 6 HIGH, 11 MED, 7 LOW. Zero secrets in git history. |
| `SECURITY_REVIEW_REPORT.md` | Item 26 (Plaid) pre-merge security review. Historical. |

## `architecture/` — System design

| File | What it covers |
|---|---|
| `PLAID_INTEGRATION_SPEC.md` | Item 26 architectural spec (13 sections). Post-merge historical reference. |

## `operations/` — Deploy + roadmap

| File | What it covers |
|---|---|
| `DEPLOYMENT_RUNBOOK.md` | 10-section NO-AWS path to production: domain → service signups → DNS → Railway/Vercel deploy → Plaid → mobile → smoke → monitoring. ~$15-35/mo. |
| `BACKLOG.md` | Forward-looking work queue. Item 29 (email order tracking), Item 33 (receipts), security sprints 2/3/4, mobile parity items. |

## `internal/` — Workflow scaffolding

| File | What it covers |
|---|---|
| `PROMPT.md` | Reusable prompt templates for the multi-agent build workflow. |

## When to add a doc here

| Kind of doc | Where it goes |
|---|---|
| Token / color / typography / motion spec | Edit `BRAND_GUIDE.md` at root (the canonical source) |
| Per-component visual spec | `design/DESIGN_SYSTEM.md` |
| Per-page audit | `design/LAYOUT_REDESIGN_BRIEF.md` or a new sibling |
| Threat model / pentest / audit | `security/` |
| Architecture spec for a new integration | `architecture/<feature>_SPEC.md` |
| Deployment, runbook, on-call procedure | `operations/` |
| Internal Claude-agent workflow scaffolding | `internal/` |
| Session resume protocol | `SESSION_MEMORY.md` at root (don't fragment this) |

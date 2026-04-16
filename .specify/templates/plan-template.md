# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow. The approved `spec.md` remains authoritative for scope and behavior; summary and closeout text in this plan are operational scaffolding only.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]  
**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]
**Project Type**: [single/web/mobile - determines source structure]  
**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

[Gates determined based on constitution file]

## Execution Orchestration

**Authority Boundary**: This section turns the approved `spec.md` into a dispatch-ready plan. It does not replace `spec.md`, code, tests, or fresh command evidence. Packet summaries and closeout notes remain non-authoritative. Packetized structure here is dispatch scaffolding only; it does not implicitly activate commander mode. The commander contract applies only when the user explicitly assigns the main thread as commander.

### Packet Overview

| Packet ID | Goal | Owner | Reviewer | Verifier | Closer | Write-set | Read-set | State marker / status marker |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `[PKT-001]` | `[Dispatch goal]` | `[Single primary writer]` | `[Scope / boundary reviewer]` | `[Evidence verifier]` | `[Closeout recorder]` | `[Owned write surface]` | `[Required read surface]` | `queued` |

### Packet Template

> Duplicate this packet block for every packet in the plan. A plan is not dispatch-ready until every packet includes all required fields below.

#### Packet `[PKT-001]` — `[Short title]`

| Field | Value |
| --- | --- |
| Packet ID | `[PKT-001]` |
| Goal | `[Concrete delivery target for this packet]` |
| Scope | `[Exactly what this packet may change]` |
| Non-goals | `[Explicit exclusions that prevent scope creep]` |
| Upstream dependencies / frozen assumptions | `[Required inputs, frozen wording, prior packet outputs]` |
| Owner | `[Single primary writer for this packet]` |
| Reviewer | `[Independent reviewer for scope, boundary, contract, authority drift, and scope creep]` |
| Verifier | `[Independent verifier for fresh commands, evidence, negative invariants, regressions, and acceptance signals]` |
| Closer | `[Recorder of verified facts and unresolved risks only]` |
| Write-set | `[Only files / surfaces the owner may modify]` |
| Read-set | `[Files / docs that must be read before work starts]` |
| Required tests / commands | `[Exact commands or checks required for this packet]` |
| Acceptance signals | `[Observable evidence required before close]` |
| State marker / status marker | `queued -> in_progress -> review_pending -> verification_pending -> needs_rework -> paused -> closed` |
| Stop rule | `[When to stop, pause, or return to spec / scope freeze]` |

### Routing Rules

- Assign `Owner`, `Reviewer`, `Verifier`, and `Closer` explicitly before work starts.
- `Reviewer` and `Verifier` must stay separate from the `Owner`, and from each other.
- `Reviewer` only checks scope, boundary, contract, authority drift, and scope creep; review never substitutes for verification.
- `Verifier` only checks fresh commands, traceable evidence, negative invariants, regressions, and acceptance signals.
- `Closer` records verified facts and unresolved risks only; closeout and summary notes do not override `spec.md`, code, tests, or fresh command evidence.
- If commander personally owns or edits a packet `Write-set`, that packet's `Reviewer` and `Verifier` must both be reassigned to non-commander roles before the packet can close.

### Ownership & Serialization

- One packet has one primary writer.
- One file group has one owner at a time.
- Workers stay inside their assigned write-sets.
- If ownership is unclear, fall back to serial execution before continuing.
- When multiple packets converge on one feature, final cross-packet consistency work must run in a separate `integration packet` with its own owner, reviewer, verifier, and closer.
- A packet missing `Write-set`, `Read-set`, `Required tests / commands`, `Acceptance signals`, or `Stop rule` is not ready to dispatch.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

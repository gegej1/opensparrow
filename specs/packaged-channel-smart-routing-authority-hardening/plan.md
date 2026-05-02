# Packaged Channel Smart Routing Authority Hardening Plan

> **For future agentic workers:** this plan does not authorize implementation. Worker edits require Spec Review approval of the revised spec and write-set. Steps use checkbox syntax in `tasks.md` for gate tracking.

**Goal:** Fix packaged channel smart-routing input boundaries so Feishu, DingTalk, and WeCom route from current user text and stale instance evidence is filtered before being accepted.

**Architecture:** Keep `opensparrow-router/auto` as the current smart authority. The implementation should separate current-user-text extraction from channel envelopes/history, then report redacted tier-decision evidence tied to active `packRoot`, `configPath`, `profile`, ports, and provider/model. The plan treats DingTalk/WeCom nano behavior as `COMPLEX` tier selection from wrapped input, not router bypass.

**Tech Stack:** Node.js ESM, `ui/server.mjs`, `scripts/model-routing/lib/custom-plugin-routing.mjs`, `ui/lib/session-rebind.mjs`, Node test runner, packaged mac verification.

---

## Packet Boundaries

SpecWriter write-set for this revision:

- `specs/packaged-channel-smart-routing-authority-hardening/spec.md`
- `specs/packaged-channel-smart-routing-authority-hardening/plan.md`
- `specs/packaged-channel-smart-routing-authority-hardening/tasks.md`

This packet is not:

- a model-save fix;
- a concrete model hardcoding change;
- a dashboard UI redesign;
- a plugin install or wrapper packet;
- a dist/vendor/platforms/docs/longrun packet;
- Worker authorization.

Active facts frozen for planning:

- UI port: `19000`
- gateway port: `18930`
- router port: `18412`
- current provider/model: `opensparrow-router/auto`
- tier map: `SIMPLE -> gpt-4o`, `MEDIUM -> gpt-4o`, `COMPLEX -> gpt-5.4-nano`, `REASONING -> gpt-5.5`
- DingTalk and WeCom current snapshots already show router authority; their nano behavior is a tier-selection/input-boundary problem.
- Feishu `4o-mini` is stale/pre-reload or ambiguous evidence until current post-reload inbound evidence proves otherwise.

## Phase 0: Spec Review Gate

Spec Review must approve the revised facts before Worker Gate starts:

- root cause is channel smart-routing input-boundary bug plus stale-instance evidence hazard;
- DingTalk/WeCom are not framed as bypassing router authority;
- Feishu stale/pre-reload evidence is not counted as current authority;
- current-user-text extraction is the core implementation target;
- stale evidence must be filtered by active `packRoot`, `configPath`, `profile`, ports, and current provider/model;
- secret-safe diagnostics exclude raw channel envelopes and raw user original text;
- proposed Worker write-set remains only a proposal.

If Spec Review is not fully approved, the packet returns to SpecWriter revision.

## Phase 1: Worker Gate Plan

Worker Gate may begin only after Spec Review approval. Worker must not edit `specs/**`, docs, longrun, Mem0, dist, vendor, platforms, UI public files, build scripts, credential files, or generated artifacts.

The Worker should first add failing tests for:

- DingTalk simple wrapped channel prompt expected `SIMPLE/gpt-4o`;
- WeCom simple wrapped channel prompt expected `SIMPLE/gpt-4o`;
- literal JSON metadata or channel envelope not triggering `COMPLEX`;
- prior complex turn or shared `agent:main:main` history not affecting latest simple prompt;
- Feishu stale/pre-reload `4o-mini` evidence rejected without active instance proof;
- active-instance evidence accepted only with matching `packRoot`, `configPath`, `profile`, ports, and current provider/model;
- secret-safety assertions using synthetic fake secrets.

Expected test ownership remains proposed, not authorized:

- `ui/tests/custom-router-current-turn-routing.test.mjs`
- `ui/tests/packaged-channel-smart-routing-authority.test.mjs`
- `ui/tests/model-routing-runtime-dispatch.test.mjs`
- `ui/tests/custom-openai-provider-rebind.test.mjs`

## Phase 2: Current-User-Text Boundary

The Worker should design one source-owned extraction boundary:

- input: channel request body and metadata;
- output: classification body from raw or sanitized current user text;
- excluded from classification body:
  - channel envelope;
  - literal JSON metadata;
  - system context;
  - tool context;
  - assistant history;
  - older user turns;
  - unrelated channel messages;
- observable evidence:
  - source label;
  - redacted evidence label;
  - length;
  - stable hash;
  - selected tier/model.

Diagnostics must not output raw channel envelope or raw user original text.

## Phase 3: Active-Instance Evidence Filtering

The Worker should make all channel-routing evidence distinguish current from stale:

- active `packRoot`;
- active `configPath`;
- active `profile`;
- UI/gateway/router ports;
- current provider/model `opensparrow-router/auto`;
- current tier map.

Feishu evidence that only shows old `4o-mini` behavior must be classified as stale/pre-reload or ambiguous unless it matches the active post-reload instance.

## Phase 4: Source Verification Plan

Required source checks after Worker changes:

- `node --check ui/server.mjs`
- `node --check scripts/model-routing/lib/custom-plugin-routing.mjs`
- `node --test ui/tests/model-routing-runtime-dispatch.test.mjs`
- `node --test ui/tests/custom-openai-provider-rebind.test.mjs`
- `node --test ui/tests/packaged-channel-smart-routing-authority.test.mjs`
- `node --test ui/tests/custom-router-current-turn-routing.test.mjs`
- `git diff --check`

If any command is substituted, Worker must map the substitute to the revised acceptance matrix.

## Phase 5: Batch Review Gate Plan

Batch Review must check:

- no forbidden write-set files changed;
- no Worker edits to frozen `specs/**`;
- no Mem0 writes by Worker;
- no model hardcoding;
- router IDs preserved;
- tests prove DingTalk/WeCom simple wrapped prompts route `SIMPLE/gpt-4o`;
- tests prove metadata/envelope does not trigger `COMPLEX`;
- tests prove prior complex/shared history does not affect latest simple prompt;
- diagnostics are redacted and contain no raw channel envelope, raw user text, or secrets.

If Batch Review is not `APPROVED`, the packet returns to Worker Gate or Spec Review.

## Phase 6: Batch Verify Gate Plan

Batch Verify must use a fresh package or the active instance only after identity proof:

- prove UI `19000`, gateway `18930`, router `18412`, or record the new active ports if they changed;
- prove active `packRoot`, `configPath`, `profile`, and current provider/model;
- confirm tier map;
- verify DingTalk simple wrapped prompt routes `SIMPLE/gpt-4o`;
- verify WeCom simple wrapped prompt routes `SIMPLE/gpt-4o`;
- verify JSON metadata/channel envelope does not trigger `COMPLEX`;
- verify prior complex/shared history does not affect latest simple prompt;
- verify Feishu current post-reload inbound evidence or classify Feishu evidence as stale/pre-reload/ambiguous;
- verify complex and reasoning current text still route to higher tiers;
- verify single-model mode remains intact;
- run secret scans over all listed surfaces.

If Batch Verify is not `PASS`, the packet returns to Worker Gate or Batch Review Gate.

## Phase 7: Closer Gate Plan

Closer Gate requires:

- Spec Review approval;
- Worker Gate `DONE`;
- Batch Review Gate `APPROVED`;
- Batch Verify Gate `PASS`.

Only then may the Closer write facts-only docs/longrun closeout and durable Mem0. Worker, Reviewer, Verifier, and SpecWriter must not write Mem0.

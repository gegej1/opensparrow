# Packaged Router Model Registration Runtime Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax in `tasks.md` for tracking.

**Goal:** Make packaged OpenClaw embedded-agent chat accept `opensparrow-router/auto` and route it through the local router to the configured tier models.
**Architecture:** Keep the dashboard contract and router identities frozen, then close the missing bridge between smart-mode persistence and the OpenClaw model registry consumed by the daemon gateway. The backend should persist or bootstrap the `opensparrow-router` provider/model registration in the active profile before gateway restart, while the local router sidecar continues to own tier classification and upstream dispatch.
**Tech Stack:** Node ESM, `ui/server.mjs`, `ui/lib/model-routing-config.mjs`, `scripts/model-routing/lib/custom-plugin-routing.mjs`, `node:test`, packaged mac OpenClaw runtime metadata, fresh packaged chat verification.

---

## Packet Guard

- Packet identity: `packaged-router-model-registration-runtime-chat`.
- This is not a `unified-model-configuration-surface` reopen.
- This is not an `F-031` reopen.
- This is not an `F-027` identity rewrite.
- This is not native provider routing.
- This is not an `F-033`, `F-034`, install, Windows, wrapper, vendor, or packaging-strategy packet.
- Keep `providerId=opensparrow-router`.
- Keep `modelTarget=opensparrow-router/auto`.
- Do not write real keys, bearer tokens, or local auth files into logs, docs, test output, or final evidence.

## File Structure And Ownership

Worker-A owns the source runtime bridge and tests:

- `ui/lib/model-routing-config.mjs`
  - Candidate owner for save-time router provider/model registration metadata.
  - Candidate owner for canonical config shape emitted by `/api/config/model-routing`.
  - Must keep masked readback and key retention behavior from `unified-model-configuration-surface`.
- `ui/server.mjs`
  - Candidate owner for bootstrap/restart ordering, router provider registration sync, local router auth bootstrap, and gateway restart/session rebind.
  - Candidate owner for redacted diagnostics and packaged status surfaces if they expose the new registration truth.
- `scripts/model-routing/lib/custom-plugin-routing.mjs`
  - Candidate owner for shared router provider config helpers if current helpers are insufficient.
  - Must not change router ids.
- `ui/tests/packaged-save-contract-truth.test.mjs`
  - Extend smart-save assertions so saved config includes the provider/model registration needed by runtime chat.
- `ui/tests/model-routing-runtime-dispatch.test.mjs`
  - Preserve direct local router tier dispatch coverage.
- `ui/tests/packaged-router-model-registration-runtime-chat.test.mjs`
  - New focused regression for the model registration / embedded-chat bridge.

Worker-A must not write:

- `vendor/**`
- `platforms/windows/**`
- wrapper scripts unless proven strictly required and approved as scope expansion
- packaging strategy files
- `dist/**`
- `.env`, `.codex/auth.json`, `.codex/config.toml`, or local credential files
- longrun closeout files
- `docs/runtime-flow.md` during Worker implementation

## Phase 0 - Baseline And Handoff

1. Confirm worktree, branch, HEAD, and dirty state.
2. Read this packet's `spec.md`, `plan.md`, and `tasks.md`.
3. Read the prior `unified-model-configuration-surface` docs to understand the closed dashboard contract.
4. Inspect `ui/server.mjs`, `ui/lib/model-routing-config.mjs`, `scripts/model-routing/lib/custom-plugin-routing.mjs`, and current model-routing tests.
5. Inspect vendor `AGENTS.md`, OpenClaw package metadata, and README only as read-only references.
6. Confirm no other worker owns the same write-set.

Do not start implementation until the Worker can state the bug as: smart config readback is correct, but packaged embedded-agent chat rejects `opensparrow-router/auto` as an unknown model.

## Phase 1 - Reproduce The Runtime Registration Gap

Write a focused failing source test before implementation.

Recommended test file:

- `ui/tests/packaged-router-model-registration-runtime-chat.test.mjs`

The test should create an isolated profile/config that matches smart-mode save output:

- `agents.defaults.model.primary = opensparrow-router/auto`
- `plugins.entries.opensparrow-router.config.tierConnectionMap` with all four tiers
- `plugins.allow` state matching current behavior
- missing or insufficient `models.providers.opensparrow-router` registration if that is the reproduced gap

The test should assert the pre-fix failure in one of these source-level ways:

- the runtime registration helper does not persist `models.providers.opensparrow-router`;
- a model registry warmup probe cannot discover `opensparrow-router/auto`;
- a controlled gateway chat harness fails with `Unknown model: opensparrow-router/auto`;
- a redacted captured error contains `Unknown model: opensparrow-router/auto` before the fix.

The failure must be tied to the embedded-agent/gateway model registry path, not only the direct local router HTTP path.

## Phase 2 - Register The Router Provider/Model In The Runtime Profile

Implement the smallest bridge that makes the active runtime profile register `opensparrow-router/auto`.

Candidate implementation direction:

1. Reuse `buildCustomRouterProviderConfig({ port })` from `scripts/model-routing/lib/custom-plugin-routing.mjs`.
2. Ensure smart-mode persistence writes or triggers registration for:
   - `models.providers.opensparrow-router.baseUrl = http://127.0.0.1:<routerPort>/v1`
   - `models.providers.opensparrow-router.api = openai-completions`
   - `models.providers.opensparrow-router.models[0].id = auto`
3. Ensure any required local auth profile for `opensparrow-router` exists before the daemon gateway is restarted.
4. Ensure registration runs after a smart save, not only at UI server startup before the smart config exists.
5. Preserve `plugins.entries.opensparrow-router.config.tierConnectionMap` for the local router classifier and tier dispatch.
6. If `plugins.allow` causes fatal plugin loading because no physical plugin exists, either prove it is non-fatal after provider registration or remove/adjust only the unnecessary plugin allow behavior without changing provider ids or target ids.

Do not edit OpenClaw vendor code. If OpenClaw cannot accept a configured provider without vendor changes, stop and report.

## Phase 3 - Preserve Per-Tier Dispatch And Security

Keep the already accepted local router behavior:

- `readRuntimeTierConnection(routerConfig, tier)` prefers `tierConnectionMap.<tier>`.
- Legacy shared fallback remains only for old configs.
- The selected tier request uses the selected tier URL, model, and key.
- Debug headers may include tier and model only.
- No key appears in readback, diagnostics, headers, errors, or evidence.

Source tests must cover the four classifier lanes:

- `SIMPLE`: short prompt / low token budget
- `MEDIUM`: summary, analysis, comparison, plan, or `max_tokens >= 700`
- `COMPLEX`: code, debugging, SQL, JSON, architecture, or long prompt
- `REASONING`: reasoning, proof, math, logic, or `max_tokens >= 1600`

## Phase 4 - Regression Coverage

Required source checks:

- Smart save persists the router provider/model registration expected by OpenClaw.
- Smart readback still returns `opensparrow-router/auto`.
- Smart readback still masks all tier keys.
- Existing empty-key preserve/reject behavior still passes.
- The new focused test proves `opensparrow-router/auto` is accepted after the fix.
- `ui/tests/model-routing-runtime-dispatch.test.mjs` still proves all four tiers call distinct fixtures.
- Existing `unified-model-configuration-surface` tests still pass.

Recommended commands:

- `node --check ui/server.mjs`
- `node --check ui/lib/model-routing-config.mjs`
- `node --check scripts/model-routing/lib/custom-plugin-routing.mjs`
- `node --test ui/tests/packaged-router-model-registration-runtime-chat.test.mjs`
- `node --test ui/tests/packaged-save-contract-truth.test.mjs`
- `node --test ui/tests/model-routing-runtime-dispatch.test.mjs`
- `node --test ui/tests/dashboard-model-routing-ui.test.mjs`
- `node --test ui/public/replay-surfaces.test.mjs`
- `git diff --check`

## Phase 5 - Packaged Verification Handoff

Worker-A does not close the packet from source tests alone.

The packaged verifier needs a fresh artifact and must check:

1. `/api/status.instance.packRoot` points to the fresh artifact.
2. Dashboard smart mode saves four tier models.
3. `/api/config/model-routing` readback preserves:
   - `providerId=opensparrow-router`
   - `modelTarget=opensparrow-router/auto`
   - all four tiers with `apiKeyConfigured=true`
4. Real OpenClaw embedded-agent chat through Feishu, WeCom, or manual gateway path answers simple, complex, and reasoning prompts.
5. Gateway logs do not contain `Unknown model: opensparrow-router/auto`.
6. Gateway logs do not contain `Embedded agent failed before reply: Unknown model: opensparrow-router/auto`.
7. Upstream logs show tier models, not a collapse to `gpt-4o-mini`.
8. Captured evidence is redacted before reporting.

## Stop Conditions

Stop and report if:

- the fix requires editing OpenClaw vendor binaries or internals;
- the fix requires native provider routing;
- the fix requires renaming `opensparrow-router` or `opensparrow-router/auto`;
- the fix requires Windows;
- wrapper changes appear necessary but are not proven by the failure reproduction;
- stale process state explains the issue and a fresh `packRoot` cannot reproduce it;
- secrets appear in logs or captured evidence.

## Worker-A Handoff Summary

The Worker should receive:

- packet identity exactly: `packaged-router-model-registration-runtime-chat`;
- current evidence showing config readback is correct but embedded chat fails with unknown model;
- read/write boundaries from this plan;
- source acceptance checklist;
- packaged acceptance checklist;
- stop rules.

# Feature Specification: Packaged Router Model Registration Runtime Chat

**Packet identity**: `packaged-router-model-registration-runtime-chat`
**Created**: `2026-04-26`
**Status**: `spec-frozen`
**Target worktree**: `/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-p0-packaged-mac-diagnostics`

## Positioning

This packet defines a new packaged runtime chat path bugfix.

It is:

- a new packaged runtime chat path packet;
- a runtime model registration / provider bridge bugfix;
- a follow-up to the already closed `unified-model-configuration-surface` truth;
- scoped to making the real packaged OpenClaw embedded-agent chat path accept and route `opensparrow-router/auto`.

It is not:

- a `unified-model-configuration-surface` reopen;
- an `F-031` reopen;
- an `F-027` identity rewrite;
- native provider routing;
- an `F-033`, `F-034`, or install packet;
- a Windows packet;
- a vendor binary edit packet.

## Evidence Summary

The prior packet `unified-model-configuration-surface` is closed and pushed at:

- `b714f8cf247e535843b8a51471ab17d78b03c457`

Current user-reported packaged runtime evidence:

- Packaged UI: `http://127.0.0.1:19000`
- `/api/status`:
  - `installed=true`
  - `daemon=running`
  - `runtimeMode=daemon`
  - `profile=gtclaw-portable`
  - `gatewayPort=18930`
  - `packRoot=/private/tmp/unified-model-config-rebuild-x7V8BL/gtclaw-mac-release-arm64-20260426-193709/GTClaw-0.1.0-alpha-macOS-arm64`
- `/api/config/model-routing` readback is correct:
  - `mode=smart`
  - `effectivePrimaryModel=opensparrow-router/auto`
  - `providerId=opensparrow-router`
  - `modelTarget=opensparrow-router/auto`
  - `SIMPLE=gpt-5.4-nano`
  - `MEDIUM=gpt-5.4-mini`
  - `COMPLEX=gpt-5.4`
  - `REASONING=gpt-5.5`
  - all tier `apiKeyConfigured=true`
- Real chat behavior:
  - first simple questions may receive replies;
  - complex or reasoning questions can return `Something went wrong while processing your request...`
- `gateway.err.log` reports:
  - `plugin not found: opensparrow-router`
  - `plugins.allow: plugin not found: opensparrow-router`
  - `startup model warmup failed for opensparrow-router/auto: Unknown model: opensparrow-router/auto`
  - `FailoverError: Unknown model: opensparrow-router/auto`
  - `Embedded agent failed before reply: Unknown model: opensparrow-router/auto`

## Problem Statement

Smart mode save and readback are correct. The dashboard/backend surface persists `opensparrow-router/auto`, masks keys, preserves tier models, and reports the expected router invariants.

The real packaged OpenClaw gateway embedded-agent chat path still fails because `opensparrow-router/auto` is not recognized as a usable runtime model target. The failure happens after correct config readback, in the model/provider registration path used by the daemon gateway and embedded agent.

This is a runtime model registration / provider bridge gap. It is not a dashboard surface bug, not a user-facing model configuration rewrite, and not a request to rename router identities.

## Root Cause Hypothesis To Prove

The current source can route direct local router HTTP calls and source fixture tests through the local router path, but the packaged OpenClaw gateway chat path validates `opensparrow-router/auto` through its model registry before the embedded agent can reply.

The likely bridge gap is that the smart save path writes:

- `plugins.entries.opensparrow-router.config`
- `plugins.allow` containing `opensparrow-router`
- `agents.defaults.model.primary = opensparrow-router/auto`

but the packaged daemon gateway does not consistently see a registered model provider/model for:

- `models.providers.opensparrow-router`
- model id `auto`
- auth profile for provider `opensparrow-router`, if required by the OpenClaw provider runtime

Workers must prove the actual runtime cause with source tests and fresh packaged evidence before claiming the fix.

## In Scope

1. Make the packaged gateway embedded-agent chat path recognize `opensparrow-router/auto`.
2. Ensure `opensparrow-router/auto` routes through the local router / custom plugin-provider path.
3. Preserve per-tier dispatch for:
   - `SIMPLE`
   - `MEDIUM`
   - `COMPLEX`
   - `REASONING`
4. Preserve key masking in API readback, diagnostics, logs, headers, errors, and verifier evidence.
5. Add source tests that reproduce the current `Unknown model: opensparrow-router/auto` failure before the fix.
6. Add source tests proving the model registry accepts `opensparrow-router/auto` after the fix.
7. Add source tests proving chat/completion dispatch selects all four tier connections.
8. Add packaged real chat verification for the embedded-agent path, not only direct router fixture calls.

## Out of Scope

1. No native provider routing rewrite.
2. No rename of `opensparrow-router`.
3. No rename of `opensparrow-router/auto`.
4. No vendor binary edits.
5. No Windows scope.
6. No wrapper edits unless a Worker proves they are strictly required for this exact chat path failure.
7. No `F-033` / `F-034` install truth rewrite.
8. No longrun closeout in the Worker packet.
9. No dashboard surface redesign.
10. No change to the already accepted `unified-model-configuration-surface` UI contract unless a narrow source test proves a save-time runtime registration write is missing from that backend contract.

## Frozen Router Invariants

These identities are frozen and must appear unchanged in source and packaged evidence:

- `providerId=opensparrow-router`
- `modelTarget=opensparrow-router/auto`

The fix may add missing provider/model registration data for these identities. It must not replace them with `openai/...`, a native provider id, or a new router name.

## Runtime Contract

When smart mode is active:

1. `agents.defaults.model.primary` remains `opensparrow-router/auto`.
2. `models.providers.opensparrow-router` must be present and must describe a runtime provider/model entry that OpenClaw's gateway model registry accepts.
3. The accepted provider/model must forward chat completions to the local router sidecar.
4. The local router sidecar must continue to classify prompts and select a tier.
5. The selected tier must call the tier-specific upstream `baseUrl`, `apiKey`, and `model`.
6. Any synthetic local auth material used only to call the sidecar must not appear in user-facing readback or evidence.
7. Gateway restart or session rebind behavior must not leave the embedded agent bound to a stale model registry.

## Suggested Read Areas For Worker

Read:

- `ui/server.mjs`
- `ui/lib/model-routing-config.mjs`
- `scripts/model-routing/lib/custom-plugin-routing.mjs`
- `ui/tests/packaged-save-contract-truth.test.mjs`
- `ui/tests/model-routing-runtime-dispatch.test.mjs`
- `vendor/mac-openclaw/AGENTS.md`
- `vendor/mac-openclaw/lib/node_modules/openclaw/package.json`
- `vendor/mac-openclaw/lib/node_modules/openclaw/README.md`
- runtime generated config shape under the active profile, redacted
- `gateway.err.log`, redacted

Do not inspect or modify vendor binaries. Vendor package metadata and README files are read-only reference only.

## Potential Write-Set For Worker

Worker-A may write:

- `ui/server.mjs`
- `ui/lib/model-routing-config.mjs`
- `scripts/model-routing/lib/custom-plugin-routing.mjs`
- `ui/tests/packaged-save-contract-truth.test.mjs`
- `ui/tests/model-routing-runtime-dispatch.test.mjs`
- a new focused test under `ui/tests/`, preferably `ui/tests/packaged-router-model-registration-runtime-chat.test.mjs`

Worker-A must not write:

- `vendor/**`
- `platforms/windows/**`
- wrapper scripts unless proven strictly required and approved as scope expansion
- packaging strategy files
- `dist/**`
- credential or local config files
- longrun closeout files

`docs/runtime-flow.md` may be updated only in a later closeout packet after source and packaged verification pass. It is not part of the Worker implementation write-set.

## Source Acceptance

Source acceptance requires all of the following:

1. A test reproduces `Unknown model: opensparrow-router/auto` before the fix, or a controlled equivalent that proves `opensparrow-router/auto` is absent from the model/provider registry consumed by the chat path.
2. After the fix, the gateway/model registry accepts `opensparrow-router/auto`.
3. Smart save or runtime bootstrap persists the required `models.providers.opensparrow-router` registration in the same profile/config consumed by the daemon gateway.
4. If an auth profile is required for the local router provider, it is created or preserved without exposing its key.
5. The chat/completion path routes to the per-tier connection selected by the classifier.
6. `SIMPLE`, `MEDIUM`, `COMPLEX`, and `REASONING` can each be selected and dispatched.
7. No API key or authorization token appears in logs, headers, errors, readbacks, diagnostics, or test output.
8. Existing `unified-model-configuration-surface` tests still pass.
9. Router invariants remain:
   - `providerId=opensparrow-router`
   - `modelTarget=opensparrow-router/auto`
10. The fix does not require vendor binary edits, native provider routing, Windows, wrappers, or install-truth rewrites.

## Packaged Acceptance

Packaged acceptance requires a fresh artifact and real chat verification:

1. Build or use a fresh artifact; do not close from a stale running process.
2. `/api/status.instance.packRoot` points to the fresh artifact being verified.
3. Dashboard smart mode is saved with four tier models.
4. `/api/config/model-routing` readback remains correct:
   - `mode=smart`
   - `effectivePrimaryModel=opensparrow-router/auto`
   - all four tiers `apiKeyConfigured=true`
   - no plain key or `apiKey` property
5. Real OpenClaw chat through Feishu, WeCom, or the manual gateway path no longer returns `Something went wrong while processing your request...` for complex/reasoning prompts.
6. Gateway logs no longer show `Unknown model: opensparrow-router/auto`.
7. Gateway logs no longer show `Embedded agent failed before reply: Unknown model: opensparrow-router/auto`.
8. If `plugins.allow: plugin not found: opensparrow-router` remains, the verifier must prove it is non-fatal and not on the chat failure path. Otherwise it is still a blocker.
9. Upstream logs show the expected tier models:
   - `SIMPLE=gpt-5.4-nano`
   - `MEDIUM=gpt-5.4-mini`
   - `COMPLEX=gpt-5.4`
   - `REASONING=gpt-5.5`
10. Upstream logs must not show all traffic collapsing to `gpt-4o-mini`.
11. Router invariants are preserved:
   - `providerId=opensparrow-router`
   - `modelTarget=opensparrow-router/auto`
12. Captured logs and reports are redacted before being written into repo docs or final evidence.

## Negative Acceptance

The packet must be rejected if any of these happen:

- `opensparrow-router/auto` is changed to another model target.
- `opensparrow-router` is changed to another provider id.
- The fix bypasses smart routing by forcing all traffic to a single OpenAI model.
- The fix only proves direct `POST /v1/chat/completions` against the local router and does not prove the embedded-agent chat path.
- The fix depends on stale process state rather than a fresh artifact/profile.
- A key or bearer token appears in captured evidence.

## Stop Rules

Worker-A must stop and report instead of widening scope if:

1. The fix requires changing OpenClaw upstream binary/vendor internals.
2. The fix requires native provider routing rewrite.
3. The fix requires renaming `opensparrow-router` or `opensparrow-router/auto`.
4. The fix requires Windows work.
5. The fix requires wrappers and the requirement is not proven by a source or packaged reproduction.
6. The issue is actually caused by a stale process; prove this with a fresh `packRoot` before closing.
7. Secrets appear in logs or evidence; stop, redact, and restart evidence capture.

## Ready For Worker-A Criteria

Ready when all are true:

- `spec.md`, `plan.md`, and `tasks.md` exist for this packet.
- Worker-A receives the packet identity exactly as `packaged-router-model-registration-runtime-chat`.
- Worker-A accepts the proposed read-set, write-set, and forbidden surfaces.
- Worker-A agrees to reproduce the failure before implementing.
- Worker-A agrees that source PASS alone is not packaged PASS.
- Worker-A agrees that real embedded-agent chat verification is required.

## Not Ready Criteria

Not ready if any are true:

- The work is described as `unified-model-configuration-surface` reopen.
- The work is described as `F-031` reopen.
- The worker plans to rename router identities.
- The worker plans to modify `vendor/**` binaries.
- The worker plans to claim closeout from direct router fixture tests only.
- The worker cannot produce redacted packaged gateway log evidence.

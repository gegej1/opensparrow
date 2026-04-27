# Tasks: Packaged Router Model Registration Runtime Chat

**Packet identity**: `packaged-router-model-registration-runtime-chat`
**Owner**: Worker-A
**Status**: ready-for-worker

## Global Guards

- This is not a `unified-model-configuration-surface` reopen.
- This is not an `F-031` reopen.
- This is not an `F-027` identity rewrite.
- This is not native provider routing.
- This is not an `F-033`, `F-034`, install, Windows, wrapper, vendor, or packaging-strategy packet.
- Keep `providerId=opensparrow-router`.
- Keep `modelTarget=opensparrow-router/auto`.
- Preserve per-tier `SIMPLE`, `MEDIUM`, `COMPLEX`, and `REASONING` dispatch.
- Do not expose API keys, bearer tokens, local auth files, or secret-bearing logs.
- Do not update longrun closeout files in Worker implementation.

## Worker-A Write Ownership

Worker-A may write:

- `ui/server.mjs`
- `ui/lib/model-routing-config.mjs`
- `scripts/model-routing/lib/custom-plugin-routing.mjs`
- `ui/tests/packaged-save-contract-truth.test.mjs`
- `ui/tests/model-routing-runtime-dispatch.test.mjs`
- `ui/tests/packaged-router-model-registration-runtime-chat.test.mjs`

Worker-A must treat all other areas as read-only unless Commander explicitly revises this packet.

## Phase 0 - Handoff Gate

### T0.1 - Confirm Worktree And Packet Identity

- [ ] Run `pwd`.
- [ ] Run `git branch --show-current`.
- [ ] Run `git rev-parse HEAD`.
- [ ] Run `git status --short`.
- [ ] Confirm packet identity is exactly `packaged-router-model-registration-runtime-chat`.
- [ ] Confirm current dirty or untracked files are not silently attributed to this packet.

Done when:

- Worker-A can state worktree, branch, HEAD, dirty-state summary, and packet identity.

### T0.2 - Read Required Context

- [ ] Read `AGENTS.md`.
- [ ] Read `docs/项目持久化说明.md`.
- [ ] Read `docs/governance/README.md`.
- [ ] Read `docs/governance/framework-stack.md`.
- [ ] Read `.specify/memory/constitution.md`.
- [ ] Read `longrun/workspaces/opensparrow-unified/app_spec.md`.
- [ ] Read `longrun/workspaces/opensparrow-unified/feature_list.json`.
- [ ] Read `longrun/workspaces/opensparrow-unified/claude-progress.txt`.
- [ ] Read `specs/unified-model-configuration-surface/spec.md`.
- [ ] Read `specs/unified-model-configuration-surface/plan.md`.
- [ ] Read `specs/unified-model-configuration-surface/tasks.md`.
- [ ] Read `docs/runtime-flow.md`.
- [ ] Read `docs/packaged-mac-diagnostics.md`.
- [ ] Read this packet's `spec.md`.
- [ ] Read this packet's `plan.md`.
- [ ] Read this packet's `tasks.md`.

Done when:

- Worker-A understands that smart config readback is correct and this packet targets the runtime model registration / provider bridge used by packaged embedded-agent chat.

### T0.3 - Inspect Source Runtime Areas

- [ ] Read `ui/server.mjs` around router startup, provider bootstrap, auth bootstrap, `/api/config/model-routing`, and local router `/v1/chat/completions`.
- [ ] Read `ui/lib/model-routing-config.mjs`.
- [ ] Read `scripts/model-routing/lib/custom-plugin-routing.mjs`.
- [ ] Read `ui/tests/packaged-save-contract-truth.test.mjs`.
- [ ] Read `ui/tests/model-routing-runtime-dispatch.test.mjs`.
- [ ] Read vendor metadata only:
  - `vendor/mac-openclaw/AGENTS.md`
  - `vendor/mac-openclaw/lib/node_modules/openclaw/package.json`
  - `vendor/mac-openclaw/lib/node_modules/openclaw/README.md`
- [ ] If inspecting current packaged runtime config or logs, redact key-like values before recording evidence.

Done when:

- Worker-A can name the source function(s) or persistence paths that currently leave the daemon gateway without an accepted `opensparrow-router/auto` model.

### T0.4 - Confirm Serialization

- [ ] Check whether any active worker owns one of the write-set files.
- [ ] If ownership conflicts exist, stop and ask Commander for serialization.
- [ ] If no conflict exists, proceed.

Done when:

- Worker-A has exclusive ownership of the packet write-set.

## Phase 1 - Tests First

### T1.1 - Add Focused Registration Regression Test

Files:

- Create `ui/tests/packaged-router-model-registration-runtime-chat.test.mjs`

Required assertions:

- [ ] A smart-mode persisted config has `agents.defaults.model.primary = opensparrow-router/auto`.
- [ ] The pre-fix config lacks the provider/model registration required for runtime chat, or a controlled model-registry probe reports `Unknown model: opensparrow-router/auto`.
- [ ] The failure is tied to the embedded-agent/gateway model registry path, not only the direct local router HTTP endpoint.
- [ ] The test uses synthetic non-secret keys and does not print them.

Run:

- [ ] `node --test ui/tests/packaged-router-model-registration-runtime-chat.test.mjs`

Expected before implementation:

- FAIL with missing router provider/model registration or a controlled `Unknown model: opensparrow-router/auto` assertion.

### T1.2 - Extend Save Contract Regression

Files:

- Modify `ui/tests/packaged-save-contract-truth.test.mjs`

Required assertions:

- [ ] Smart-mode save still returns `effectivePrimaryModel = opensparrow-router/auto`.
- [ ] Smart-mode save persists all four `tierConnectionMap` entries.
- [ ] Smart-mode save also leaves the runtime profile with `models.providers.opensparrow-router`.
- [ ] The router provider config points at the local router base URL and exposes model id `auto`.
- [ ] Any local auth profile required for provider `opensparrow-router` exists without exposing its key through API readback.
- [ ] Existing key masking, empty-key preserve, empty-key reject, and degraded-save tests still pass.

Run:

- [ ] `node --test ui/tests/packaged-save-contract-truth.test.mjs`

Expected before implementation:

- FAIL on missing or stale `models.providers.opensparrow-router` registration if that is the confirmed bridge gap.

### T1.3 - Preserve Runtime Tier Dispatch Regression

Files:

- Modify `ui/tests/model-routing-runtime-dispatch.test.mjs` only if needed.

Required assertions:

- [ ] `SIMPLE` routes to the simple fixture.
- [ ] `MEDIUM` routes to the medium fixture.
- [ ] `COMPLEX` routes to the complex fixture.
- [ ] `REASONING` routes to the reasoning fixture.
- [ ] Each fixture receives the expected model.
- [ ] Authorization is checked internally without printing the key.
- [ ] Response headers include tier/model only, not keys.

Run:

- [ ] `node --test ui/tests/model-routing-runtime-dispatch.test.mjs`

Expected before implementation:

- May already pass; keep it as a no-regression gate.

## Phase 2 - Runtime Registration Bridge

### T2.1 - Persist Router Provider Model Registration

Files:

- Modify `ui/lib/model-routing-config.mjs`
- Modify `scripts/model-routing/lib/custom-plugin-routing.mjs` only if a shared helper needs to change

Implementation requirements:

- [ ] Reuse or extend `buildCustomRouterProviderConfig({ port })`.
- [ ] On smart-mode save, ensure `models.providers.opensparrow-router` exists in the saved profile config.
- [ ] Ensure provider `baseUrl` targets `http://127.0.0.1:<routerPort>/v1`.
- [ ] Ensure provider `api` remains `openai-completions`.
- [ ] Ensure provider model id remains `auto`.
- [ ] Preserve existing `models.providers.openai` and single-mode config.
- [ ] Preserve `plugins.entries.opensparrow-router.config.tierConnectionMap`.
- [ ] Preserve `agents.defaults.model.primary = opensparrow-router/auto`.

Done when:

- The save contract regression can inspect persisted config and find the router provider/model registration.

### T2.2 - Ensure Local Router Auth Registration If Required

Files:

- Modify `ui/server.mjs`
- Modify `ui/lib/model-routing-config.mjs` only if auth persistence belongs with model-routing save

Implementation requirements:

- [ ] Determine whether OpenClaw requires an auth profile for provider `opensparrow-router`.
- [ ] If required, ensure it exists before gateway restart or model warmup.
- [ ] Use synthetic local auth material only for the sidecar path.
- [ ] Keep the local auth key out of API readback, diagnostics, logs, headers, and test output.
- [ ] Do not overwrite unrelated auth profiles.

Done when:

- The focused test proves the gateway/model registry can authenticate or warm the local router provider without exposing secrets.

### T2.3 - Fix Startup Versus Save-Time Ordering

Files:

- Modify `ui/server.mjs`
- Modify `ui/lib/model-routing-config.mjs` if the save helper should own the persisted registration

Implementation requirements:

- [ ] Ensure router provider registration is not only attempted at UI server startup before smart mode exists.
- [ ] Ensure registration is current after `POST /api/config/model-routing` smart save.
- [ ] Ensure gateway restart happens after the profile config contains router provider/model registration.
- [ ] Ensure session rebind or restart logic does not leave the embedded agent on a stale model registry.

Done when:

- The focused registration test passes after smart save and before/after restart simulation.

### T2.4 - Resolve Or Prove Non-Fatal Plugin Allow Warning

Files:

- Modify `ui/lib/model-routing-config.mjs` or `ui/server.mjs` only if source evidence proves `plugins.allow` is on the failure path.

Implementation requirements:

- [ ] Determine whether `plugins.allow: plugin not found: opensparrow-router` is fatal after provider registration.
- [ ] If non-fatal, leave behavior unchanged and document why in Worker handoff.
- [ ] If fatal, remove or adjust only the unnecessary plugin allow behavior for the virtual router provider while preserving router config and provider ids.
- [ ] Do not create or require a vendor plugin binary.
- [ ] Do not rename `opensparrow-router`.

Done when:

- Source tests and packaged logs no longer show the plugin warning as part of the chat-failure path, or the warning is proven non-fatal with successful real chat.

## Phase 3 - Security And Readback

### T3.1 - Preserve Key Masking

Files:

- Modify `ui/server.mjs`
- Modify `ui/lib/model-routing-config.mjs`
- Modify tests as needed

Implementation requirements:

- [ ] `/api/config/model-routing` returns only `apiKeyConfigured`.
- [ ] `/api/config` redacts router tier keys.
- [ ] Diagnostics and exported bundles redact router keys and local router auth material.
- [ ] Gateway error evidence captured by tests is redacted before assertion messages or fixture output.
- [ ] No `Authorization` header value is emitted in debug headers or logs.

Done when:

- Source tests and source inspection show no plain key exposure in touched surfaces.

### T3.2 - Preserve Router Invariants

Files:

- Modify relevant tests

Required assertions:

- [ ] `providerId=opensparrow-router`.
- [ ] `modelTarget=opensparrow-router/auto`.
- [ ] `agents.defaults.model.primary=opensparrow-router/auto`.
- [ ] Provider model id is `auto`.
- [ ] No fallback rewrites traffic to `openai/gpt-4o-mini`.

Done when:

- Existing and new tests fail on identity drift.

## Phase 4 - Source Verification

### T4.1 - Run Source Commands

Run:

- [ ] `node --check ui/server.mjs`
- [ ] `node --check ui/lib/model-routing-config.mjs`
- [ ] `node --check scripts/model-routing/lib/custom-plugin-routing.mjs`
- [ ] `node --test ui/tests/packaged-router-model-registration-runtime-chat.test.mjs`
- [ ] `node --test ui/tests/packaged-save-contract-truth.test.mjs`
- [ ] `node --test ui/tests/model-routing-runtime-dispatch.test.mjs`
- [ ] `node --test ui/tests/dashboard-model-routing-ui.test.mjs`
- [ ] `node --test ui/public/replay-surfaces.test.mjs`
- [ ] `git diff --check`

Done when:

- Commands pass, or failures are documented with exact blocking reason.

### T4.2 - Verify Negative Invariants

Check:

- [ ] No vendor binary edits.
- [ ] No Windows edits.
- [ ] No wrapper edits unless explicitly approved after proof.
- [ ] No packaging strategy edits.
- [ ] No longrun closeout edits.
- [ ] No router id drift.
- [ ] No model target drift.
- [ ] No native provider routing rewrite.
- [ ] No key leakage in readback, logs, headers, errors, or evidence.

Done when:

- Worker-A can hand source evidence to review and packaged verification.

## Phase 5 - Packaged Verification Handoff

### T5.1 - Prepare Source Handoff

Worker-A must provide:

- [ ] Changed files.
- [ ] Source commands and results.
- [ ] The pre-fix reproduction failure.
- [ ] The post-fix registration proof for `opensparrow-router/auto`.
- [ ] Smart-save persistence summary.
- [ ] Per-tier dispatch summary.
- [ ] Router invariant summary.
- [ ] Statement that no real key values are included in evidence.
- [ ] Statement that this is not a `unified-model-configuration-surface` reopen.

Done when:

- Reviewer can inspect scope and verifier can run packaged checks.

### T5.2 - Packaged Verifier Checklist

Verifier must run on a fresh artifact:

- [ ] Fresh `/api/status.instance.packRoot` points to the artifact under verification.
- [ ] Dashboard smart mode saves four tier models.
- [ ] `/api/config/model-routing` readback remains correct and key-free.
- [ ] Real manual gateway path or Feishu/WeCom chat receives a reply for a simple prompt.
- [ ] Real manual gateway path or Feishu/WeCom chat receives a reply for a complex prompt.
- [ ] Real manual gateway path or Feishu/WeCom chat receives a reply for a reasoning prompt.
- [ ] Gateway logs do not show `Unknown model: opensparrow-router/auto`.
- [ ] Gateway logs do not show `Embedded agent failed before reply: Unknown model: opensparrow-router/auto`.
- [ ] Upstream logs show expected tier models rather than always `gpt-4o-mini`.
- [ ] Evidence preserves `providerId=opensparrow-router`.
- [ ] Evidence preserves `modelTarget=opensparrow-router/auto`.
- [ ] Evidence is redacted.

Done when:

- Verifier reports fresh packaged PASS or a concrete blocker.

## Closeout Gate

Closeout is allowed only after:

- [ ] Worker-A source PASS.
- [ ] Independent review confirms scope and invariants.
- [ ] Fresh packaged verifier proves real embedded-agent chat PASS.
- [ ] Gateway logs are clear of the unknown-model failure.
- [ ] Evidence is key-free.
- [ ] Closeout writer confirms this packet identity did not drift into `unified-model-configuration-surface`, `F-031`, `F-027`, native routing, `F-033`, `F-034`, install, vendor, Windows, wrappers, or packaging strategy.

## Ready For Worker-A

Ready when:

- [x] `spec.md`, `plan.md`, and `tasks.md` exist for this packet.
- [ ] Worker-A accepts the write-set.
- [ ] Worker-A has exclusive ownership of the write-set.
- [ ] Worker-A agrees to reproduce the unknown-model failure before implementing.
- [ ] Worker-A agrees to preserve router identities.
- [ ] Worker-A agrees not to expose keys.
- [ ] Worker-A can hand off packaged real chat verification instead of self-closing from source tests.

## Not Ready

Not ready if:

- [ ] The packet is described as a dashboard surface reopen.
- [ ] The packet is described as an `F-031` reopen.
- [ ] The packet is described as native provider routing.
- [ ] The worker needs vendor, Windows, wrappers, packaging, install, `F-033`, or `F-034` scope.
- [ ] The implementation cannot mask keys.
- [ ] The worker cannot produce source evidence and packaged verifier handoff.

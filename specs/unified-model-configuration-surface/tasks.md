# Tasks: Unified Model Configuration Surface

**Packet identity**: `unified-model-configuration-surface`
**Owner**: Worker-A
**Status**: completed

## Global Guards

- This is not an `F-031` reopen.
- This is not an `F-027` identity rewrite.
- This is not native provider routing.
- This is not an install, `F-033`, or `F-034` packet.
- Keep `providerId = opensparrow-router`.
- Keep `modelTarget = opensparrow-router/auto`.
- Do not touch vendor, Windows, wrappers, packaging strategy, generated artifacts, or credential files.
- Do not print or write real keys in logs, diagnostics, exports, evidence, or closeout material.
- Update existing F-031 tests for the new unified surface; do not silently delete them.

## Worker-A Write Ownership

Worker-A may write:

- `ui/public/dashboard.html`
- `ui/public/dashboard-model-routing-state.mjs`
- `ui/lib/model-routing-config.mjs`
- `ui/server.mjs`
- `scripts/model-routing/lib/custom-plugin-routing.mjs`
- `ui/public/replay-surfaces.test.mjs`
- `ui/tests/dashboard-model-routing-ui.test.mjs`
- `ui/tests/packaged-save-contract-truth.test.mjs`
- optional focused router runtime test under `ui/tests/`

Worker-A must treat all other areas as read-only unless Commander explicitly revises this packet.

## Phase 0 - Handoff Gate

### T0.1 - Confirm Packet Identity And Worktree

- [ ] Run `pwd`.
- [ ] Run `git branch --show-current`.
- [ ] Run `git rev-parse HEAD`.
- [ ] Run `git status --short`.
- [ ] Confirm the packet identity is exactly `unified-model-configuration-surface`.
- [ ] Confirm current dirty/untracked files are not silently attributed to this packet.

Done when:

- Worker-A can state the target worktree, branch, HEAD, dirty-state summary, and packet identity.

### T0.2 - Read Authority Documents

- [ ] Read `AGENTS.md`.
- [ ] Read `docs/项目持久化说明.md`.
- [ ] Read `docs/governance/README.md`.
- [ ] Read `docs/governance/framework-stack.md`.
- [ ] Read `.specify/memory/constitution.md`.
- [ ] Read `longrun/workspaces/opensparrow-unified/app_spec.md`.
- [ ] Read `longrun/workspaces/opensparrow-unified/feature_list.json`.
- [ ] Read `longrun/workspaces/opensparrow-unified/claude-progress.txt`.
- [ ] Read `specs/031-dashboard-model-routing-ui/spec.md`.
- [ ] Read `specs/031-dashboard-model-routing-ui/plan.md`.
- [ ] Read `specs/031-dashboard-model-routing-ui/tasks.md`.
- [ ] Read `specs/unified-model-configuration-surface/spec.md`.
- [ ] Read `specs/unified-model-configuration-surface/plan.md`.

Done when:

- Worker-A understands this packet consumes F-031/F-032 truth but does not reopen F-031.

### T0.3 - Confirm Serialization

- [ ] Check whether any active worker owns one of the write-set files.
- [ ] If ownership conflicts exist, stop and ask Commander for serialization.
- [ ] If no conflict exists, proceed.

Done when:

- Worker-A has exclusive ownership of the packet write-set.

## Phase 1 - Tests First

### T1.1 - Update Dashboard UI Test Expectations

Files:

- Modify `ui/tests/dashboard-model-routing-ui.test.mjs`

Required assertions:

- [ ] Dashboard primary tabs include `模型配置`.
- [ ] Dashboard primary tabs do not include `模型智能路由` as a peer primary tab.
- [ ] Dashboard primary tabs do not include `API 配置（上游连接）` as a peer primary tab.
- [ ] `单模型` mode includes `Base URL`, `API Key`, and `Model ID`.
- [ ] `模型智能路由` mode includes all four tiers.
- [ ] Each tier includes `Base URL`, `API Key`, and `Model ID`.
- [ ] The state module still freezes `opensparrow-router` and `opensparrow-router/auto`.
- [ ] The state module still uses `/api/config/model-routing` for load/save.

Run:

- [ ] `node --test ui/tests/dashboard-model-routing-ui.test.mjs`

Expected before implementation:

- FAIL on old split-tab behavior or missing per-tier fields.

### T1.2 - Update Replay Surface Tests

Files:

- Modify `ui/public/replay-surfaces.test.mjs`

Required assertions:

- [ ] `loadModelRoutingConfig` or its unified successor uses `GET /api/config/model-routing`.
- [ ] `saveModelRoutingConfig` or its unified successor uses `POST /api/config/model-routing`.
- [ ] Save performs authoritative read-after-write.
- [ ] Single-mode payload contains `baseUrl/apiKey/model`.
- [ ] Smart-mode payload contains `tierConnectionMap` with all four tiers.
- [ ] Readback state contains `apiKeyConfigured`, not plain `apiKey`.
- [ ] Existing F-031 invariant coverage remains.

Run:

- [ ] `node --test ui/public/replay-surfaces.test.mjs`

Expected before implementation:

- FAIL on missing unified payload or surface behavior.

### T1.3 - Update Save Contract Tests

Files:

- Modify `ui/tests/packaged-save-contract-truth.test.mjs`
- Optionally create a focused runtime dispatch test under `ui/tests/`

Required assertions:

- [ ] Single-mode save sets `effectivePrimaryModel = openai/<model>`.
- [ ] Single-mode GET readback masks key.
- [ ] Single-mode empty key with existing key preserves it.
- [ ] Single-mode empty key without existing key is rejected.
- [ ] Smart-mode save sets `effectivePrimaryModel = opensparrow-router/auto`.
- [ ] Smart-mode GET readback masks all tier keys.
- [ ] Smart-mode empty tier key with existing or legacy shared key preserves it.
- [ ] Smart-mode empty tier key without existing key is rejected.
- [ ] Runtime tier dispatch uses each tier's own URL/key/model.
- [ ] Test output does not print key values.

Run:

- [ ] `node --test ui/tests/packaged-save-contract-truth.test.mjs`
- [ ] Run the optional focused runtime dispatch test if created.

Expected before implementation:

- FAIL on missing per-tier save/readback behavior.

## Phase 2 - Backend Contract

### T2.1 - Extend Model Routing Helper Readback

Files:

- Modify `ui/lib/model-routing-config.mjs`

Implementation requirements:

- [ ] Return canonical `surface = model-configuration`.
- [ ] Return canonical `single` readback.
- [ ] Return canonical `smart.tiers` readback.
- [ ] Return only `apiKeyConfigured` for key state.
- [ ] Preserve compatibility aliases only where still needed.
- [ ] Mark tier sources as `tierConnectionMap`, `legacy-shared`, or `empty`.
- [ ] Preserve router object invariants.

Done when:

- `GET /api/config/model-routing` can power the unified frontend without exposing keys.

### T2.2 - Implement Single-Mode Save Semantics

Files:

- Modify `ui/lib/model-routing-config.mjs`
- Modify `ui/server.mjs` if endpoint glue changes are needed

Implementation requirements:

- [ ] Accept `{ mode: "single", baseUrl, apiKey, model }`.
- [ ] Write OpenAI-compatible provider config.
- [ ] Write OpenAI auth profile when a new key is provided.
- [ ] Preserve existing OpenAI key when `apiKey` is empty and a key exists.
- [ ] Reject when `apiKey` is empty and no key exists.
- [ ] Set primary model to `openai/<model>`.
- [ ] Do not enable smart target.
- [ ] Response does not echo key.

Done when:

- Source save contract tests prove single mode behavior.

### T2.3 - Implement Smart-Mode Save Semantics

Files:

- Modify `ui/lib/model-routing-config.mjs`
- Modify `ui/server.mjs` if endpoint glue changes are needed

Implementation requirements:

- [ ] Accept `{ mode: "smart", tierConnectionMap, routing }`.
- [ ] Require all four tiers.
- [ ] Require every tier `baseUrl` and `model`.
- [ ] Preserve existing tier keys when tier `apiKey` is empty.
- [ ] Preserve legacy shared key on first migration save when tier `apiKey` is empty.
- [ ] Reject empty tier key when no old key exists.
- [ ] Write `plugins.entries.opensparrow-router.config.tierConnectionMap`.
- [ ] Keep or derive `tierModelMap` for compatibility.
- [ ] Set primary model to `opensparrow-router/auto`.
- [ ] Response does not echo keys.

Done when:

- Source save contract tests prove smart mode behavior and migration behavior.

### T2.4 - Redact Sensitive Router Config From Readback Surfaces

Files:

- Modify `ui/server.mjs`
- Modify helper files only if necessary

Implementation requirements:

- [ ] Audit readback/export paths touched by dashboard or packaged verification.
- [ ] Redact `tierConnectionMap.<tier>.apiKey` from any response body that would expose it.
- [ ] Redact legacy `plugins.entries.opensparrow-router.config.apiKey` where relevant.
- [ ] Keep diagnostics/export evidence key-free.
- [ ] Do not redact non-sensitive model IDs or tier names needed for debugging.

Done when:

- Tests and source inspection show no plain key in model config readback.

## Phase 3 - Runtime Dispatch

### T3.1 - Preserve Per-Tier Runtime Selection

Files:

- Modify `ui/server.mjs`
- Modify `scripts/model-routing/lib/custom-plugin-routing.mjs` only if shared helper changes are necessary

Implementation requirements:

- [ ] `readRuntimeTierConnection(routerConfig, tier)` prefers `tierConnectionMap.<tier>`.
- [ ] Legacy shared fallback remains for old configs only.
- [ ] Selected tier request uses selected tier `baseUrl`.
- [ ] Selected tier request uses selected tier `model`.
- [ ] Selected tier request uses selected tier key internally without logging it.
- [ ] Debug headers include tier/model only, not keys.
- [ ] Routing classifier rules remain unchanged.

Done when:

- Focused runtime test proves all four tiers can route to distinct controlled fixtures.

## Phase 4 - Frontend Unified Surface

### T4.1 - Update State Module

Files:

- Modify `ui/public/dashboard-model-routing-state.mjs`

Implementation requirements:

- [ ] Represent `single.baseUrl`.
- [ ] Represent `single.apiKey`.
- [ ] Represent `single.model`.
- [ ] Represent `single.apiKeyConfigured`.
- [ ] Represent per-tier smart `baseUrl`.
- [ ] Represent per-tier smart `apiKey`.
- [ ] Represent per-tier smart `model`.
- [ ] Represent per-tier smart `apiKeyConfigured`.
- [ ] Build canonical single save payload.
- [ ] Build canonical smart save payload.
- [ ] Apply masked readback.
- [ ] Clear plain key draft fields after successful readback.
- [ ] Preserve invariant guard.
- [ ] Preserve authoritative read-after-write.

Done when:

- Replay tests prove payload shape and masked state.

### T4.2 - Update Dashboard HTML

Files:

- Modify `ui/public/dashboard.html`

Implementation requirements:

- [ ] Replace primary tab label with `模型配置`.
- [ ] Remove old peer primary `模型智能路由` tab.
- [ ] Remove old peer primary `API 配置（上游连接）` tab.
- [ ] Add mode controls for `单模型` and `模型智能路由`.
- [ ] Render single-mode `Base URL`, `API Key`, `Model ID`.
- [ ] Render smart-mode four tier sections.
- [ ] Render each tier `Base URL`, `API Key`, `Model ID`.
- [ ] Keep compatibility/debug API lane secondary if it remains.
- [ ] Do not render editable provider id or target controls.
- [ ] Keep existing dashboard status/channel/skill surfaces working.

Done when:

- Dashboard UI tests pass for the unified surface.

## Phase 5 - Source Verification

### T5.1 - Run Source Commands

Run:

- [ ] `node --check ui/public/dashboard-model-routing-state.mjs`
- [ ] `node --check ui/server.mjs`
- [ ] `node --test ui/tests/dashboard-model-routing-ui.test.mjs`
- [ ] `node --test ui/public/replay-surfaces.test.mjs`
- [ ] `node --test ui/tests/packaged-save-contract-truth.test.mjs`
- [ ] focused runtime dispatch test, if created
- [ ] `git diff --check`

Done when:

- Commands pass, or failures are documented with exact blocking reason.

### T5.2 - Verify Negative Invariants

Check:

- [ ] No router provider id drift.
- [ ] No model target drift.
- [ ] No native provider routing UI.
- [ ] No key returned by model-routing GET readback.
- [ ] No key in test output/evidence.
- [ ] No F-031 test deletion without equivalent replacement.
- [ ] No vendor/Windows/wrapper/packaging edits.

Done when:

- Worker-A can hand source evidence to reviewer/verifier.

## Phase 6 - Verifier Handoff

### T6.1 - Prepare Source Handoff

Worker-A must provide:

- [ ] Changed files.
- [ ] Source commands and results.
- [ ] Single-mode contract summary.
- [ ] Smart-mode contract summary.
- [ ] Empty key preserve/reject summary.
- [ ] Runtime per-tier dispatch summary.
- [ ] Router invariant summary.
- [ ] Statement that no real key values are included in evidence.

Done when:

- Reviewer can inspect scope and verifier can run packaged checks.

### T6.2 - Packaged Verifier Checklist

Verifier must run on a fresh artifact:

- [ ] Fresh dashboard shows `模型配置`.
- [ ] Fresh dashboard does not expose old `API 配置（上游连接）` as independent main upstream entry.
- [ ] Fresh packaged server saves single mode.
- [ ] Fresh packaged single readback masks key.
- [ ] Fresh packaged server saves smart mode.
- [ ] Fresh packaged smart readback masks all tier keys.
- [ ] Router `/v1/chat/completions` proves all four tiers call different URL/key/model using controlled fixtures.
- [ ] Evidence does not include keys.
- [ ] Router invariants remain `opensparrow-router` and `opensparrow-router/auto`.

Done when:

- Verifier reports fresh packaged PASS or a concrete blocker.

## Closeout Gate

Closeout is allowed only after:

- [x] Worker-A source PASS.
- [x] Independent review confirms scope and invariants.
- [x] Fresh packaged verification PASS.
- [x] Evidence is key-free.
- [x] Closeout writer confirms this packet identity did not drift into F-031, F-027, native routing, F-033, F-034, install, vendor, Windows, wrappers, or packaging strategy.

## Closeout: 2026-04-26

Facts-only closeout for `unified-model-configuration-surface` recorded:

- Worker-A source implementation complete.
- Source Verifier PASS.
- Packaged Verifier PACKAGED PASS.
- Scope / Authority Reviewer APPROVED.
- This remains a new dashboard/model-routing configuration surface packet, not an `F-031` reopen, not an `F-027` rewrite, not native provider routing, and not an `F-033` / `F-034` / install packet.

Source evidence:

- `node --check ui/server.mjs` PASS
- `node --check ui/public/dashboard-model-routing-state.mjs` PASS
- `node --check ui/lib/model-routing-config.mjs` PASS
- `node --test ui/tests/dashboard-model-routing-ui.test.mjs` PASS, `4/4`
- `node --test ui/public/replay-surfaces.test.mjs` PASS, `20/20`
- `node --test ui/tests/packaged-save-contract-truth.test.mjs` PASS, `9/9`
- `node --test ui/tests/model-routing-runtime-dispatch.test.mjs` PASS, `1/1`
- `node --test ui/tests/dashboard-status-shell.test.mjs` PASS, `9/9`
- `git diff --check` allowed files PASS

Packaged evidence:

- Artifact: `/private/tmp/unified-model-config-rebuild-x7V8BL/gtclaw-mac-release-arm64-20260426-193709/GTClaw-0.1.0-alpha-macOS-arm64`
- Zip: `/private/tmp/unified-model-config-rebuild-x7V8BL/gtclaw-mac-release-arm64-20260426-193709.zip`
- SHA256: `d32c040a7cb601561137cb47eec6aa15f77fbeb3c8915e1a7f3eb8f214cf90ea`
- UI port `19371`, gateway `19372`, router `19373`
- isolated `HOME`: `/private/tmp/unified-model-config-home-193709`
- isolated `OPENCLAW_HOME`: `/private/tmp/unified-model-config-openclaw-193709`
- profile: `unified-model-config-verifier`
- `/api/status.instance.packRoot` pointed to the fresh artifact, not a stale deleted `/private/tmp` artifact.

Packaged UI/API/runtime truth:

- `/dashboard` verified with Chrome CDP fallback because Playwright was unavailable.
- Main nav contains `模型配置`.
- No peer main tab `API 配置（上游连接）`.
- No peer main tab `模型智能路由`.
- `单模型` mode has `Base URL` / `API Key` / `Model ID`.
- Smart mode has `SIMPLE` / `MEDIUM` / `COMPLEX` / `REASONING`, each with `Base URL` / `API Key` / `Model ID`.
- Single-mode `POST /api/config/model-routing` returned `HTTP 200`, `ok=true`, `mode=single`, `saveState=saved_degraded`; response did not echo the synthetic key; GET readback showed `effectivePrimaryModel = openai/single-packaged-model-193709`, `single.apiKeyConfigured = true`, and no plain key.
- Smart-mode `POST /api/config/model-routing` returned `HTTP 200`, `ok=true`, `mode=smart`, `saveState=saved_degraded`; GET readback showed `effectivePrimaryModel = opensparrow-router/auto`, all four tiers `apiKeyConfigured=true`, distinct tier models, and no plain key or `apiKey` property.
- Runtime dispatch proved `SIMPLE -> 19411/simple-fixture-model-193709`, `MEDIUM -> 19412/medium-fixture-model-193709`, `COMPLEX -> 19413/complex-fixture-model-193709`, and `REASONING -> 19414/reasoning-fixture-model-193709`; each fixture received `/v1/chat/completions`; authorization was checked internally as `authOk=true`; no key values were printed.
- Security surfaces checked: `/api/config/model-routing`, `/api/config`, `/api/status`, `/api/install/status`, `/api/diagnostics`, `diagnostic-bundle.json`, and `ui-meta.json`.
- No synthetic tier key leakage and no plain `apiKey` property in exposed/readback surfaces.
- Router response headers contain tier/model only, no key.
- Router invariants remained `providerId = opensparrow-router` and `modelTarget = opensparrow-router/auto` through single readback, smart readback, and runtime dispatch.

Residual risks:

- `saveState=saved_degraded` is expected in the isolated verifier profile because no full daemon install matrix was run.
- Dashboard initially redirects to setup until config exists; after packaged single-mode save creates config, `/dashboard` loads normally.

## Ready For Worker-A

Ready when:

- [ ] `spec.md`, `plan.md`, and `tasks.md` exist for this packet.
- [ ] Worker-A accepts the write-set.
- [ ] Worker-A has exclusive ownership of the write-set.
- [ ] Worker-A agrees to update, not drop, F-031 tests.
- [ ] Worker-A agrees not to expose keys.
- [ ] Worker-A can hand off packaged verification instead of self-closing from source tests.

## Not Ready

Not ready if:

- [ ] The packet is described as an F-031 reopen.
- [ ] The packet is described as native provider routing.
- [ ] The worker needs vendor, Windows, wrappers, packaging, install, F-033, or F-034 scope.
- [ ] The old API config primary tab remains a peer main entry by design.
- [ ] The implementation cannot mask keys.
- [ ] The worker cannot produce source evidence and packaged verifier handoff.

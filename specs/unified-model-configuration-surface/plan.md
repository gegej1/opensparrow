# Unified Model Configuration Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax in `tasks.md` for tracking.

**Goal:** Build one dashboard `模型配置` surface that supports `单模型` and `模型智能路由`, including independent per-tier URL/key/model routing.
**Architecture:** Extend the existing authoritative `/api/config/model-routing` lane so it becomes the single dashboard model configuration contract. The frontend owns the unified surface and draft state; `ui/lib/model-routing-config.mjs` owns validation, migration, key retention, and masked readback; `ui/server.mjs` owns endpoint wiring and restart truth; runtime dispatch continues through `opensparrow-router/auto` and tier selection.
**Tech Stack:** `ui/public/dashboard.html`, browser `.mjs` state module, Node ESM server/helpers, `node:test`, OpenAI-compatible local router runtime.

---

## Packet Guard

- Packet identity: `unified-model-configuration-surface`.
- This is not an `F-031` reopen.
- This is not an `F-027` identity rewrite.
- This is not native provider routing.
- This is not an install, `F-033`, or `F-034` packet.
- Do not touch vendor, Windows, wrappers, packaging strategy, generated artifacts, or credential files.
- Do not print or write real keys in test output, evidence, specs, logs, diagnostics, or final reports.

## File Structure And Ownership

Worker-A owns:

- `ui/public/dashboard.html`
  - Rename the primary dashboard surface to `模型配置`.
  - Remove old model/API split as peer primary tabs.
  - Render `单模型` and `模型智能路由` modes with the required fields.
- `ui/public/dashboard-model-routing-state.mjs`
  - Build unified draft/readback state.
  - Build save payloads for single and smart modes.
  - Keep read-after-write refresh.
  - Never retain/display plain keys after readback.
- `ui/lib/model-routing-config.mjs`
  - Normalize payloads.
  - Preserve existing keys on empty-key saves.
  - Reject empty-key saves when no key exists.
  - Read legacy shared smart config.
  - Write canonical `tierConnectionMap`.
  - Return masked readback.
- `ui/server.mjs`
  - Wire the extended model-routing contract.
  - Preserve truthful `saved | saved_degraded | rejected` behavior.
  - Preserve router runtime dispatch and invariants.
  - Redact any newly sensitive router keys from readback/export surfaces that would otherwise expose them.
- `scripts/model-routing/lib/custom-plugin-routing.mjs`
  - Only adjust shared route helper behavior if needed for tier connection dispatch tests.
  - Do not change router IDs.
- `ui/public/replay-surfaces.test.mjs`
  - Update F-031 replay tests to the unified surface.
- `ui/tests/dashboard-model-routing-ui.test.mjs`
  - Update UI/source tests to the unified tab and mode behavior.
- `ui/tests/packaged-save-contract-truth.test.mjs`
  - Update save contract tests for single and smart mode behavior.
- Optional new focused runtime test under `ui/tests/`
  - Prove per-tier URL/key/model dispatch with controlled fixtures.

Worker-A must not write:

- `vendor/**`
- `platforms/windows/**`
- wrapper scripts
- packaging strategy files
- `dist/**`
- local credential/config files
- longrun closeout files

## Phase 0 - Baseline And Serialization

1. Confirm worktree, branch, HEAD, and dirty state.
2. Read this spec, plan, and tasks.
3. Confirm no other worker owns any file in the write-set.
4. Run a small baseline source check before edits:
   - `node --test ui/tests/dashboard-model-routing-ui.test.mjs`
   - `node --test ui/public/replay-surfaces.test.mjs`
5. Record failures as expected baseline only; do not treat current old-tab behavior as packet success.

## Phase 1 - Tests First

Update tests before implementation so the old split surface fails clearly.

Required failing expectations:

- Dashboard tabs contain `模型配置`.
- Dashboard tabs no longer contain `模型智能路由` and `API 配置（上游连接）` as peer primary tabs.
- `单模型` mode builds a save payload containing `baseUrl/apiKey/model`.
- `模型智能路由` mode builds a save payload containing all four tier `baseUrl/apiKey/model` entries.
- Readback state uses `apiKeyConfigured`, not `apiKey`.
- Existing F-031 endpoint authority tests still require `/api/config/model-routing`.
- Existing F-031 invariant tests still require:
  - `opensparrow-router`
  - `opensparrow-router/auto`

Recommended commands:

- `node --test ui/tests/dashboard-model-routing-ui.test.mjs`
- `node --test ui/public/replay-surfaces.test.mjs`

Expected before implementation:

- FAIL for old tab labels and missing per-tier connection fields.

## Phase 2 - Backend Contract And Persistence

Modify `ui/lib/model-routing-config.mjs` first, then `ui/server.mjs`.

Single mode requirements:

- Accept canonical payload `{ mode, baseUrl, apiKey, model }`.
- Normalize `baseUrl` as an OpenAI-compatible base URL.
- Normalize `model` as a model id without adding a user-visible provider prefix.
- If `apiKey` is non-empty, write it to the OpenAI auth profile.
- If `apiKey` is empty and an existing OpenAI key exists, preserve it.
- If `apiKey` is empty and no existing OpenAI key exists, reject with `saveState = rejected`.
- Write OpenAI-compatible provider config.
- Set effective primary model to `openai/<model>`.
- Do not enable smart target.

Smart mode requirements:

- Accept canonical payload `{ mode, tierConnectionMap, routing }`.
- Require exactly `SIMPLE`, `MEDIUM`, `COMPLEX`, and `REASONING`.
- Require each tier to have non-empty `baseUrl` and `model`.
- Preserve existing tier key when tier `apiKey` is empty.
- Preserve old shared smart key during migration when no tier key exists yet.
- Reject a tier with empty `apiKey` when neither tier key nor legacy shared key exists.
- Write `plugins.entries.opensparrow-router.config.tierConnectionMap`.
- Derive or preserve `tierModelMap` for compatibility.
- Set effective primary model to `opensparrow-router/auto`.
- Keep plugin allow/entry bootstrap behavior intact.

Readback requirements:

- Return canonical `single` and `smart.tiers` data.
- Return `apiKeyConfigured` only.
- Include `source` metadata for `openai-provider`, `tierConnectionMap`, `legacy-shared`, or `empty`.
- Preserve old fields only as compatibility aliases if existing tests or consumers still need them.
- Never return plain keys.

Server requirements:

- `GET /api/config/model-routing` returns unified masked readback.
- `POST /api/config/model-routing` saves both modes.
- `POST /api/config/api` remains compatibility-only.
- Save responses keep F-032 truth:
  - `saved`
  - `saved_degraded`
  - `rejected`
- If newly persisted tier keys can leak through `/api/config`, diagnostics, or exports, add targeted redaction in the relevant server response path before returning data.

## Phase 3 - Runtime Dispatch

Keep router identity frozen while proving per-tier dispatch.

Requirements:

- `readRuntimeTierConnection(routerConfig, tier)` prefers `tierConnectionMap.<tier>.baseUrl/apiKey/model`.
- Legacy fallback remains only for old config:
  - shared `baseUrl`
  - shared `apiKey`
  - `tierModelMap.<tier>`
- Runtime `/v1/chat/completions` must call the selected tier's URL with the selected tier's model.
- Test fixtures may assert authorization internally, but evidence must not print key values.
- Debug headers may include tier/model, not keys.

## Phase 4 - Frontend Unified Surface

Modify `ui/public/dashboard-model-routing-state.mjs` and `ui/public/dashboard.html`.

State module requirements:

- Keep exported `ENDPOINTS.load/save = /api/config/model-routing`.
- Keep exported invariants:
  - `providerId = opensparrow-router`
  - `modelTarget = opensparrow-router/auto`
- Represent `single` draft:
  - `baseUrl`
  - `apiKey`
  - `model`
  - `apiKeyConfigured`
- Represent `smart` draft:
  - per-tier `baseUrl`
  - per-tier `apiKey`
  - per-tier `model`
  - per-tier `apiKeyConfigured`
- After successful save, perform authoritative read-after-write.
- Clear plain `apiKey` draft fields after successful readback.
- Build canonical save payloads.

Dashboard requirements:

- One primary tab named `模型配置`.
- `单模型` and `模型智能路由` are mode controls inside that tab.
- Single mode fields are visible and editable.
- Smart mode shows four tier rows/cards with the required fields.
- The old API configuration page is not a peer primary tab.
- If a compatibility/debug API lane remains, it is secondary and not presented as routing truth.
- UI does not expose editable provider id or model target.

## Phase 5 - Verification

Source commands:

- `node --check ui/public/dashboard-model-routing-state.mjs`
- `node --check ui/server.mjs`
- `node --test ui/tests/dashboard-model-routing-ui.test.mjs`
- `node --test ui/public/replay-surfaces.test.mjs`
- `node --test ui/tests/packaged-save-contract-truth.test.mjs`
- focused runtime dispatch test proving all four tiers use distinct connections
- `git diff --check`

Source evidence must state:

- unified tab exists;
- old peer API/model-routing tabs are gone;
- single save works and masks readback;
- smart save works and masks readback;
- empty-key preserve and reject paths are covered;
- router invariants are unchanged;
- F-031 tests were updated, not dropped.

## Phase 6 - Packaged Verification Handoff

Worker-A does not close the packet from source tests alone.

The verifier needs a fresh artifact and must check:

- dashboard `模型配置` unified surface;
- no independent main `API 配置（上游连接）` upstream entry;
- packaged single-mode save/readback;
- packaged smart-mode save/readback;
- masked readback;
- controlled upstream fixtures proving `SIMPLE`, `MEDIUM`, `COMPLEX`, and `REASONING` each call their own URL/key/model;
- unchanged `opensparrow-router` and `opensparrow-router/auto`;
- no key values in captured evidence.

## Stop Conditions

Worker-A must stop and report instead of widening scope if:

- implementation requires native provider routing;
- router provider id or target must change;
- vendor, Windows, wrappers, install, packaging strategy, or F-033/F-034 surfaces become necessary;
- plain keys would appear in readback/evidence and cannot be redacted within the allowed write-set;
- old F-031 tests would need to be deleted rather than updated;
- another worker owns the same write-set.

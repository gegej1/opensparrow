# Feature Specification: Unified Model Configuration Surface

**Packet identity**: `unified-model-configuration-surface`
**Created**: `2026-04-26`
**Status**: `completed`
**Target worktree**: `/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-p0-packaged-mac-diagnostics`

## Positioning

This packet defines a new dashboard/model-routing configuration experience.

It is:

- a new `dashboard/model-routing` configuration surface packet;
- a spec-first packet under `specs/unified-model-configuration-surface/`;
- a follow-on contract that consumes the completed F-031/F-032 truth.

It is not:

- an `F-031` reopen;
- an `F-027` identity rewrite;
- native provider routing;
- an install, `F-034`, or `F-033` packet;
- a wrapper, Windows, vendor, or packaging-strategy packet.

The current browser `ENOENT` pointing at deleted `/private/tmp/packaged-channels-late-stage-rebuild-77vgKb` artifacts is an old running-process cleanup side effect and must not be attributed to this packet.

## Current Facts

- The dashboard currently has two separate primary tabs:
  - `模型智能路由`
  - `API 配置（上游连接）`
- `API 配置（上游连接）` saves a global OpenAI-compatible `Base URL`, `API Key`, and `Model`.
- `模型智能路由` configures only `tierModelMap`; it does not offer per-tier `Base URL`, `API Key`, and `Model ID` inputs.
- The authoritative model-routing endpoints are:
  - `GET /api/config/model-routing`
  - `POST /api/config/model-routing`
- The frozen router invariants are:
  - `providerId = opensparrow-router`
  - `modelTarget = opensparrow-router/auto`
- Runtime already contains a tier connection read entry:
  - `readRuntimeTierConnection(routerConfig, tier)`
- Current runtime tier fallback can read `tierConnectionMap.<tier>` and fall back to legacy shared `baseUrl/apiKey + tierModelMap`.
- Current F-031 tests must be updated for the unified surface; they must not be silently deleted.

## Frozen Routing Rules

The routing classifier remains unchanged:

- `SIMPLE`: short questions and low `max_tokens`.
- `MEDIUM`: summarization, analysis, comparison, planning, or `max_tokens >= 700`.
- `COMPLEX`: code, debugging, SQL, JSON, architecture, fixing tasks, or very long prompts.
- `REASONING`: reasoning, proof, math, logic, explicit reasoning wording, or `max_tokens >= 1600`.

## In Scope

1. Replace the two separate primary model tabs with one primary dashboard tab named `模型配置`.
2. Move `单模型` and `模型智能路由` into modes inside the `模型配置` surface.
3. In `单模型` mode, expose `Base URL`, `API Key`, and `Model ID`.
4. In `模型智能路由` mode, expose independent `Base URL`, `API Key`, and `Model ID` for every tier:
   - `SIMPLE`
   - `MEDIUM`
   - `COMPLEX`
   - `REASONING`
5. Extend the authoritative model-routing backend contract so one surface can save both modes.
6. Preserve backward compatibility for the old smart config shape:
   - legacy shared `baseUrl/apiKey`
   - legacy `tierModelMap`
7. Preserve backend compatibility for the old `/api/config/api` lane while removing it as an independent main dashboard entry.
8. Enforce key masking in readback, diagnostics, logs, exports, and verifier evidence.
9. Update source and packaged acceptance so per-tier routing proves distinct tier URL/key/model behavior.

## Out of Scope

1. No native provider routing or native provider chooser.
2. No change to `providerId = opensparrow-router`.
3. No change to `modelTarget = opensparrow-router/auto`.
4. No rewrite of true `F-027`, F-031 history, F-033, or F-034.
5. No vendor, Windows, wrappers, or packaging-strategy edits.
6. No credentials, local auth files, `.env`, `.codex/auth.json`, or `.codex/config.toml` edits.
7. No longrun closeout or feature-list pass marking in this packet.
8. No claim that source PASS equals packaged closeout.

## Write-Set Proposal

Worker-A may write:

- `ui/public/dashboard.html`
- `ui/public/dashboard-model-routing-state.mjs`
- `ui/lib/model-routing-config.mjs`
- `ui/server.mjs`
- `scripts/model-routing/lib/custom-plugin-routing.mjs`
- `ui/public/replay-surfaces.test.mjs`
- `ui/tests/dashboard-model-routing-ui.test.mjs`
- `ui/tests/packaged-save-contract-truth.test.mjs`
- optional focused router runtime test, preferably under `ui/tests/`

Worker-A must not write:

- `vendor/**`
- `platforms/windows/**`
- wrapper scripts
- packaging strategy files
- generated artifacts under `dist/**`
- credential or local configuration files

If another active worker owns one of the proposed write-set files, this packet must serialize rather than merge concurrent edits.

## UI Surface Proposal

### Primary Dashboard Navigation

The dashboard primary tab must be:

- `模型配置`

The old `API 配置（上游连接）` primary tab must no longer be the main upstream configuration entry.

Allowed compatibility handling:

- Remove the old primary tab entirely and keep all user-facing model setup inside `模型配置`.
- Or keep the old API UI only as a secondary/debug affordance inside or beneath `模型配置`, with wording that it is compatibility-only.

Not allowed:

- Keeping `API 配置（上游连接）` as a peer primary tab that asks users to jump between it and `模型智能路由`.
- Keeping `模型智能路由` as a separate primary tab from `API 配置（上游连接）`.

### `单模型` Mode

Fields:

- `Base URL`
- `API Key`
- `Model ID`

Behavior:

- Save writes OpenAI-compatible provider config.
- Save writes the OpenAI auth profile.
- Save sets the primary model to `openai/<Model ID>`.
- Save does not enable the smart target.
- Empty `API Key` means preserve an existing key if one exists; reject if no existing key exists.
- Readback must not return the plain API key; it returns `apiKeyConfigured`.

### `模型智能路由` Mode

Each tier has its own independent fields:

- `SIMPLE`: `Base URL`, `API Key`, `Model ID`
- `MEDIUM`: `Base URL`, `API Key`, `Model ID`
- `COMPLEX`: `Base URL`, `API Key`, `Model ID`
- `REASONING`: `Base URL`, `API Key`, `Model ID`

Behavior:

- Save sets the primary model to `opensparrow-router/auto`.
- The internal provider id remains `opensparrow-router`.
- The smart target remains `opensparrow-router/auto`.
- Save writes an independent `baseUrl/apiKey/model` for every tier.
- Runtime calls the URL/key/model for the selected tier.
- Smart mode no longer depends on one aggregate upstream URL/key.
- Empty `API Key` for a tier means preserve that tier's existing key if one exists; reject if no existing tier or legacy shared key exists.
- Readback must not return a plain API key; it returns per-tier `apiKeyConfigured`.

## Data Model Proposal

### Canonical Readback Shape

`GET /api/config/model-routing` should return a unified model-configuration payload:

```json
{
  "ok": true,
  "surface": "model-configuration",
  "mode": "single",
  "single": {
    "baseUrl": "https://example.invalid/v1",
    "model": "model-id",
    "apiKeyConfigured": true,
    "source": "openai-provider"
  },
  "smart": {
    "tiers": {
      "SIMPLE": {
        "baseUrl": "https://simple.example.invalid/v1",
        "model": "simple-model",
        "apiKeyConfigured": true,
        "source": "tierConnectionMap"
      },
      "MEDIUM": {
        "baseUrl": "https://medium.example.invalid/v1",
        "model": "medium-model",
        "apiKeyConfigured": true,
        "source": "tierConnectionMap"
      },
      "COMPLEX": {
        "baseUrl": "https://complex.example.invalid/v1",
        "model": "complex-model",
        "apiKeyConfigured": true,
        "source": "tierConnectionMap"
      },
      "REASONING": {
        "baseUrl": "https://reasoning.example.invalid/v1",
        "model": "reasoning-model",
        "apiKeyConfigured": true,
        "source": "tierConnectionMap"
      }
    },
    "routing": {}
  },
  "effectivePrimaryModel": "openai/model-id",
  "router": {
    "providerId": "opensparrow-router",
    "modelTarget": "opensparrow-router/auto",
    "configPresent": true
  },
  "compatibility": {
    "legacyApiEndpointAvailable": true
  }
}
```

Rules:

- `apiKey` must never appear in readback.
- `apiKeyConfigured` is the only readback key state.
- `source` may be `tierConnectionMap`, `legacy-shared`, `openai-provider`, or `empty`.
- Existing fields such as `connection`, `singleModeDefaultModel`, and `tierModelMap` may remain temporarily for compatibility, but the unified surface must treat `single` and `smart.tiers` as canonical.

### Single Mode Save Payload

Canonical payload:

```json
{
  "mode": "single",
  "baseUrl": "https://example.invalid/v1",
  "apiKey": "",
  "model": "model-id"
}
```

Rules:

- `apiKey` may be empty only when an existing OpenAI auth profile key is configured.
- The response must not echo `apiKey`.
- The saved primary model must become `openai/model-id`.

### Smart Mode Save Payload

Canonical payload:

```json
{
  "mode": "smart",
  "tierConnectionMap": {
    "SIMPLE": {
      "baseUrl": "https://simple.example.invalid/v1",
      "apiKey": "",
      "model": "simple-model"
    },
    "MEDIUM": {
      "baseUrl": "https://medium.example.invalid/v1",
      "apiKey": "",
      "model": "medium-model"
    },
    "COMPLEX": {
      "baseUrl": "https://complex.example.invalid/v1",
      "apiKey": "",
      "model": "complex-model"
    },
    "REASONING": {
      "baseUrl": "https://reasoning.example.invalid/v1",
      "apiKey": "",
      "model": "reasoning-model"
    }
  },
  "routing": {}
}
```

Rules:

- All four tiers are required.
- Every tier requires non-empty `baseUrl` and `model`.
- Empty tier `apiKey` preserves the existing tier key or the legacy shared smart key during one-time migration.
- Empty tier `apiKey` is rejected when no previous key exists for that tier.
- Save may continue to maintain `tierModelMap` as a derived compatibility field, but runtime authority must use `tierConnectionMap`.

### Persisted Smart Config

Canonical smart config should persist:

```json
{
  "plugins": {
    "entries": {
      "opensparrow-router": {
        "enabled": true,
        "config": {
          "tierConnectionMap": {
            "SIMPLE": {
              "baseUrl": "https://simple.example.invalid/v1",
              "apiKey": "<stored-sensitive-value>",
              "model": "simple-model"
            }
          },
          "tierModelMap": {
            "SIMPLE": "simple-model"
          },
          "routing": {}
        }
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "opensparrow-router/auto"
      }
    }
  }
}
```

The example above is structural only. Evidence, logs, readbacks, diagnostics, exports, and final reports must not contain real key values.

## Backend Contract Proposal

### `GET /api/config/model-routing`

Required behavior:

- Return unified surface data for both modes.
- Return `single.apiKeyConfigured`, never `single.apiKey`.
- Return `smart.tiers.<tier>.apiKeyConfigured`, never `smart.tiers.<tier>.apiKey`.
- Preserve router invariants in the `router` object.
- Read old smart config:
  - `plugins.entries.opensparrow-router.config.baseUrl`
  - `plugins.entries.opensparrow-router.config.apiKey`
  - `plugins.entries.opensparrow-router.config.tierModelMap`
- Present old smart config as `source = legacy-shared` until the next save upgrades it.

### `POST /api/config/model-routing`

Required behavior:

- Accept `mode = single | smart`.
- In `single`, save `baseUrl/apiKey/model` to the OpenAI-compatible provider and auth profile.
- In `single`, set effective primary model to `openai/<model>`.
- In `single`, do not enable `opensparrow-router/auto`.
- In `smart`, save four tier `baseUrl/apiKey/model` entries to `tierConnectionMap`.
- In `smart`, set effective primary model to `opensparrow-router/auto`.
- In `smart`, preserve `providerId = opensparrow-router` and `modelTarget = opensparrow-router/auto`.
- Return `saved`, `saved_degraded`, or `rejected` using the F-032 truthful save contract.
- Response must not echo any API key.

### `/api/config/api` Compatibility Lane

Required behavior:

- The endpoint may remain for existing callers and old tests.
- It must not be the primary dashboard model configuration surface.
- UI copy must not send users back and forth between old API config and model-routing tabs.
- Compatibility lane changes must not drift router invariants.

### Runtime Tier Dispatch

Required behavior:

- `readRuntimeTierConnection(routerConfig, tier)` must prefer `tierConnectionMap.<tier>.baseUrl/apiKey/model`.
- Legacy fallback may remain for old configs only:
  - `routerConfig.baseUrl`
  - `routerConfig.apiKey`
  - `routerConfig.tierModelMap.<tier>`
- Runtime `/v1/chat/completions` must call the selected tier's own URL/key/model.
- Runtime diagnostics and debug headers may include tier and model, but must not include keys.

## Migration And Backward Compatibility

### Legacy Smart Config

Old shape:

```json
{
  "baseUrl": "https://shared.example.invalid/v1",
  "apiKey": "<stored-sensitive-value>",
  "tierModelMap": {
    "SIMPLE": "simple-model",
    "MEDIUM": "medium-model",
    "COMPLEX": "complex-model",
    "REASONING": "reasoning-model"
  }
}
```

Migration rules:

- GET reads it and shows each tier using the shared connection with `source = legacy-shared`.
- GET masks the shared key with `apiKeyConfigured`.
- The first successful smart save writes `tierConnectionMap` for all four tiers.
- If a tier save leaves `apiKey` empty and the old shared key existed, that key is preserved into the tier's stored connection.
- After upgrade, runtime should no longer depend on the aggregate shared URL/key.

### Legacy API Config

Rules:

- `/api/config/api` remains available for backend compatibility.
- The dashboard must not keep it as an independent main tab.
- If a compatibility UI remains, it is secondary/debug only and must say it is not model-routing truth.

## Security Rules

1. No readback response returns a plain API key.
2. No dashboard state object used for display stores a plain API key after save or readback.
3. Save payloads may contain newly entered keys because the user typed them; responses must not echo them.
4. Empty key save semantics must use existing persisted key material without printing it.
5. Diagnostics, logs, debug headers, exports, and packaged verifier evidence must not expose keys.
6. If per-tier keys are persisted inside router config, any endpoint or export that can expose that config must redact them before returning data.
7. Spec, plan, tasks, and closeout evidence must not include real keys, tokens, local credentials, or local auth state.
8. Source and packaged tests may use synthetic fixture credentials internally, but test output and written evidence must not print them.

## Source Acceptance

1. Dashboard has one unified `模型配置` surface.
2. `API 配置（上游连接）` is no longer an independent primary tab.
3. `单模型` mode shows `Base URL`, `API Key`, and `Model ID`.
4. `模型智能路由` mode shows independent `Base URL`, `API Key`, and `Model ID` for all four tiers.
5. Single-mode save payload contains `baseUrl/apiKey/model`.
6. Single-mode save sets `effectivePrimaryModel = openai/<model>`.
7. Smart-mode save payload contains four tiers of `baseUrl/apiKey/model`.
8. Smart-mode save sets `effectivePrimaryModel = opensparrow-router/auto`.
9. GET readback does not return any plain API key.
10. Empty key plus existing key preserves the existing key.
11. Empty key plus no existing key is rejected.
12. Router invariants do not drift:
    - `providerId = opensparrow-router`
    - `modelTarget = opensparrow-router/auto`
13. Runtime routes `SIMPLE`, `MEDIUM`, `COMPLEX`, and `REASONING` to their own tier connection.
14. Existing F-031 tests are updated to the unified surface wording and contract, not deleted.

## Packaged Acceptance

1. Fresh artifact dashboard contains the unified `模型配置` surface.
2. Artifact does not expose old `API 配置（上游连接）` as the independent main upstream entry.
3. Fresh packaged server can save `single` mode.
4. Fresh packaged server can save `smart` mode.
5. Fresh packaged readback masks keys.
6. Router `/v1/chat/completions` can be driven with controlled upstream fixtures to prove different tiers call different URL/key/model.
7. Packaged runtime preserves:
   - `providerId = opensparrow-router`
   - `modelTarget = opensparrow-router/auto`
8. Packaged evidence must not include keys.

## Source Verification Plan

Worker-A should run at least:

- `node --check ui/public/dashboard-model-routing-state.mjs`
- `node --check ui/server.mjs`
- `node --test ui/tests/dashboard-model-routing-ui.test.mjs`
- `node --test ui/public/replay-surfaces.test.mjs`
- `node --test ui/tests/packaged-save-contract-truth.test.mjs`
- focused router runtime test proving per-tier URL/key/model dispatch
- `git diff --check`

The source verifier must additionally inspect that no expected F-031 tests were silently removed.

## Packaged Verification Plan

The packaged verifier must use a fresh artifact, not a deleted or stale `/private/tmp` process target.

Minimum packaged checks:

1. Start fresh packaged server with isolated home/profile.
2. Load `/dashboard` and verify the primary model config surface is `模型配置`.
3. Verify `API 配置（上游连接）` is not an independent main upstream entry.
4. POST single-mode payload through `/api/config/model-routing`.
5. GET readback and verify:
   - primary model is `openai/<model>`
   - `apiKeyConfigured = true`
   - no plain key appears
6. POST smart-mode payload with four tier connections.
7. GET readback and verify:
   - primary model is `opensparrow-router/auto`
   - per-tier `apiKeyConfigured = true`
   - no plain key appears
8. Drive `/v1/chat/completions` through controlled upstream fixtures for all four tiers.
9. Confirm each fixture received the expected tier model and request path without writing key values to evidence.
10. Confirm router invariants remain unchanged.

## Worker-A Ownership

Worker-A owns this packet's implementation write-set and source tests. Worker-A must:

- keep implementation within the proposed write-set;
- preserve F-031/F-032 completed truth while updating test wording for the new surface;
- stop if the contract requires native provider routing or router identity changes;
- stop if packaged, Windows, vendor, wrapper, or install scope is required;
- hand off to a verifier with source evidence and no key disclosure.

## Verifier Handoff

Worker-A must hand the verifier:

- exact source commands run and results;
- a changed-file list;
- a summary of single-mode behavior;
- a summary of smart-mode per-tier behavior;
- proof that readback masks keys;
- proof that empty key preserve/reject semantics are tested;
- proof that runtime per-tier dispatch is tested;
- explicit statement that no real key values are included in evidence.

## Closeout Gate

Closeout was allowed only after:

1. source PASS from Worker-A;
2. independent review of scope and router invariants;
3. fresh packaged verification PASS;
4. no key disclosure in evidence;
5. explicit confirmation that this was not an F-031 reopen, F-027 rewrite, native routing change, F-033/F-034 packet, or install packet;
6. only then may docs/longrun/feature tracking be updated by an authorized closeout packet.

## Closeout Evidence: 2026-04-26

This closeout records only verified facts for packet `unified-model-configuration-surface`.

Packet identity:

- `unified-model-configuration-surface`
- New dashboard/model-routing configuration surface packet.
- Not an `F-031` reopen.
- Not an `F-027` rewrite.
- Not native provider routing.
- Not an `F-033` / `F-034` / install packet.

Accepted gates:

1. Worker-A source implementation complete.
2. Source Verifier PASS.
3. Packaged Verifier PACKAGED PASS.
4. Scope / Authority Reviewer APPROVED.

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

Packaged UI truth:

- `/dashboard` verified with Chrome CDP fallback because Playwright was unavailable.
- Main nav contains `模型配置`.
- No peer main tab `API 配置（上游连接）`.
- No peer main tab `模型智能路由`.
- `单模型` mode has `Base URL` / `API Key` / `Model ID`.
- Smart mode has `SIMPLE` / `MEDIUM` / `COMPLEX` / `REASONING`, each with `Base URL` / `API Key` / `Model ID`.

Single-mode packaged API truth:

- `POST /api/config/model-routing` returned `HTTP 200`.
- `ok=true`.
- `mode=single`.
- `saveState=saved_degraded`.
- Response did not echo the synthetic key.
- GET readback:
  - `effectivePrimaryModel = openai/single-packaged-model-193709`
  - `single.apiKeyConfigured = true`
  - no plain key

Smart-mode packaged API truth:

- `POST /api/config/model-routing` returned `HTTP 200`.
- `ok=true`.
- `mode=smart`.
- `saveState=saved_degraded`.
- GET readback:
  - `effectivePrimaryModel = opensparrow-router/auto`
  - all four tiers `apiKeyConfigured=true`
  - distinct tier models read back
  - no plain key or `apiKey` property

Runtime per-tier dispatch truth:

- `SIMPLE -> port 19411`, model `simple-fixture-model-193709`
- `MEDIUM -> port 19412`, model `medium-fixture-model-193709`
- `COMPLEX -> port 19413`, model `complex-fixture-model-193709`
- `REASONING -> port 19414`, model `reasoning-fixture-model-193709`
- Each fixture received `/v1/chat/completions`.
- Authorization was checked internally as `authOk=true`.
- No key values were printed.

Security truth:

- Checked:
  - `/api/config/model-routing`
  - `/api/config`
  - `/api/status`
  - `/api/install/status`
  - `/api/diagnostics`
  - `diagnostic-bundle.json`
  - `ui-meta.json`
- No synthetic tier key leakage.
- No plain `apiKey` property in exposed/readback surfaces.
- Router response headers contain tier/model only, no key.

Router invariants:

- `providerId = opensparrow-router`
- `modelTarget = opensparrow-router/auto`
- Preserved through single readback, smart readback, and runtime dispatch.

Residual risks:

- `saveState=saved_degraded` is expected in the isolated verifier profile because no full daemon install matrix was run.
- Dashboard initially redirects to setup until config exists; after packaged single-mode save creates config, `/dashboard` loads normally.

## Ready For Worker-A Criteria

Ready when all are true:

- This spec, plan, and tasks exist under `specs/unified-model-configuration-surface/`.
- The active Worker-A receives this packet identity exactly.
- Worker-A accepts the proposed write-set and forbidden surfaces.
- No other active worker owns the same write-set.
- Worker-A agrees that readback/evidence must not expose keys.
- Worker-A agrees to update F-031 tests rather than delete them.

## Not Ready Criteria

Not ready if any are true:

- The work is described as an F-031 reopen.
- The work is described as native provider routing.
- The worker needs to modify vendor, Windows, wrappers, packaging strategy, or install packet files.
- The worker plans to keep old `API 配置（上游连接）` as a peer primary tab.
- The worker cannot prove key masking.
- The worker cannot run or hand off packaged verification.

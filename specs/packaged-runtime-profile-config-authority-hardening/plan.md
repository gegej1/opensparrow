# Packaged Runtime Profile Config Authority Hardening Implementation Plan

> **For future approved agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task only after the Spec Review Gate returns `APPROVED`. Steps use checkbox syntax in `tasks.md` for tracking.

**Goal:** Make packaged runtime daemon status, gateway health, install probes, and readiness gates use one authoritative current-profile OpenClaw config path.  
**Architecture:** Centralize OpenClaw child-process environment construction in `ui/server.mjs`, force config-reading commands to use the current packaged profile config, and classify runtime authority from same-profile daemon, health, and port evidence. Keep the fix in source truth and require fresh package rebuild verification.  
**Tech Stack:** Node ESM `ui/server.mjs`, OpenClaw CLI child processes, existing packaged runtime state helpers, `node:test`, fresh mac packaged smoke verification.

---

## Packet Guard

- Packet identity: `packaged-runtime-profile-config-authority-hardening`.
- Current dispatch state: blocked pending Spec Reviewer review.
- Spec Review Gate: Worker dispatch is forbidden until a Spec Reviewer returns `APPROVED` for `spec.md`, `plan.md`, and `tasks.md`.
- Do not edit code, tests, docs, longrun, vendor, Windows, or `dist/**` in the SpecWriter phase.
- Implementation must land in source truth. Manual `dist/**` patching is forbidden.
- Do not present `OPENCLAW_CONFIG_PATH=...` as a user workaround.
- Do not leak gateway tokens, API keys, auth profile secrets, bearer tokens, or DingTalk/WeCom credentials.
- Do not reopen packaged mac entry contract, bundled plugin archive readiness, wrapper role, or `packRoot` truth.

## Flow Gates

The packet must preserve this flow:

```text
Spec Review -> Worker -> Batch Review -> Batch Verify -> Closer
```

- **Spec Review**: Only a verdict of `APPROVED` may unlock Worker dispatch.
- **Worker**: Implements only the approved source/test write-set.
- **Batch Review**: Independent review must approve scope, boundaries, authority, and secret-safety before verification.
- **Batch Verify**: Independent verification must pass source checks and fresh packaged verification after Batch Review approval.
- **Closer**: May update docs/longrun/Mem0 only after Batch Review `APPROVED` and Batch Verify `PASS`. Closer must not modify implementation behavior.

## File Structure And Ownership

Default implementation write-set after Spec Review approval:

- `ui/server.mjs`
  - Centralizes current-profile OpenClaw child-process env.
  - Sets `OPENCLAW_CONFIG_PATH` to `CONFIG_FILE` for config-reading commands.
  - Makes daemon status, health, `/api/status`, and install probes share one authority path.
  - Adds or refines non-secret diagnostic classification.
- `ui/tests/packaged-runtime-status-authority.test.mjs`
  - Locks `/api/status` profile config authority and stale/foreign port behavior.
- `ui/tests/packaged-runtime-state-stability.test.mjs`
  - Protects stable runtime state resolution under same-profile config.
- `ui/tests/packaged-channel-probe-diagnostics.test.mjs`
  - Protects DingTalk probe/readiness diagnostics under current profile config.
- `ui/tests/packaged-install-retry-guards.test.mjs`
  - Protects install gate failure wording and secret safety.
- Optional focused source test:
  - `ui/tests/packaged-runtime-profile-config-authority.test.mjs`

Default read-set:

- `specs/032-packaged-runtime-authority-and-restart-truth/spec.md`
- `specs/packaged-mac-entry-contract-hardening/spec.md`
- `docs/packaged-mac-diagnostics.md`
- `ui/tests/packaged-mac-acceptance-matrix.test.mjs`
- `scripts/verify-packaged-mac-entry-contract.mjs`

Forbidden implementation write-set:

- `dist/**`
- `vendor/**`
- Windows files
- `platforms/**`
- mac wrappers
- `scripts/build-usb-pack.sh`
- model-routing implementation files, including `ui/lib/model-routing-config.mjs`, `scripts/model-routing/lib/custom-plugin-routing.mjs`, and model-routing runtime/chat tests unless a future SpecWriter packet re-freezes scope
- `ui/public/**`
- `longrun/**` before Closer Gate

If a Worker proves the fix cannot close without `ui/public/**` or any other forbidden file, the Worker must stop. The commander must return the packet to SpecWriter / Spec Review to re-freeze scope before any such file can be considered. A reviewer cannot independently expand write authority or approve UI scope from Batch Review.

## Phase 0 - Baseline And Failure Freeze

Confirm the packet is solving the current failure, not the previous entry-contract failure.

Required findings:

1. `packaged-mac-entry-contract-hardening` has Batch Verify `PASS`.
2. The generated package contains bundled DingTalk and WeCom archives.
3. `/api/status.instance.packRoot` points to the current package root during verification.
4. DingTalk config is persisted/enabled and credential fields exist.
5. Default `openclaw health --json` can fail by reading the wrong default config.
6. Explicit current profile config path makes health succeed.

Stop if the observed failure is actually a missing bundled archive, wrong `packRoot`, or stale UI port selection problem.

## Phase 1 - Tests First: OpenClaw Child Env Authority

Add source tests before implementation.

Required source assertions:

1. `runOc()` or the equivalent spawn helper builds a child env with current `OPENCLAW_HOME`.
2. The child env includes `OPENCLAW_PROFILE` matching server `PROFILE`.
3. The child env includes `OPENCLAW_CONFIG_PATH` equal to `CONFIG_FILE`.
4. The child env preserves `OPENCLAW_GATEWAY_PORT` for the server gateway port.
5. Tests do not assert or print actual gateway token values.

Recommended command:

```bash
node --test ui/tests/packaged-runtime-profile-config-authority.test.mjs
```

If the Worker extends an existing test instead of creating this file, the handoff must state which file owns these assertions.

## Phase 2 - Implement Child Env Authority

Implement the smallest server change that makes the source tests pass.

Implementation requirements:

1. Add a helper such as `buildOpenClawChildEnv()` in `ui/server.mjs`.
2. Use that helper from `runOc()` and any direct OpenClaw child-process spawn that reads runtime config.
3. Ensure env includes:
   - `OPENCLAW_HOME`
   - `OPENCLAW_PROFILE`
   - `OPENCLAW_CONFIG_PATH`
   - `OPENCLAW_GATEWAY_PORT`
   - `CI`
4. Preserve caller-provided safe environment values where existing behavior depends on them.
5. Do not print config contents or token values.

Do not change CLI arguments solely to work around env propagation unless tests prove the OpenClaw CLI requires both env and explicit args.

## Phase 3 - Tests First: Same-Profile Status And Probe Authority

Add or extend source tests for runtime authority classification.

Required assertions:

1. `daemon status --json` and `health --json` are invoked through the same current profile config env.
2. `/api/status` includes non-secret profile/config authority evidence.
3. `/api/status` classifies current-profile healthy daemon/gateway as `authoritative_ready` or an equivalent ready verdict.
4. `/api/status` classifies port-busy plus same-profile health failure as `foreign_gateway_port` or equivalent non-ready verdict.
5. Config path or gateway token mismatch is not collapsed into generic daemon `unknown`.
6. Install probe/readiness logic reuses the same authority helper or same env builder as `/api/status`.

Recommended commands:

```bash
node --test ui/tests/packaged-runtime-status-authority.test.mjs
node --test ui/tests/packaged-runtime-state-stability.test.mjs
node --test ui/tests/packaged-channel-probe-diagnostics.test.mjs
```

## Phase 4 - Implement Same-Profile Runtime Authority

Implement status/probe authority in `ui/server.mjs`.

Implementation requirements:

1. Ensure `readDaemonRuntimeSignal()` uses the same child env authority as `isGatewayHealthy()`.
2. Ensure `resolveRuntimeState()` can distinguish:
   - authoritative ready;
   - current-profile gateway unhealthy;
   - config path/token mismatch;
   - stale or foreign gateway port occupation.
3. Ensure `resolveStableRuntimeState()` and `/api/status` expose non-secret authority evidence.
4. Ensure DingTalk and WeCom install probe/readiness paths call OpenClaw through the same env authority.
5. Ensure `requested channels are not authoritatively ready after install` is not emitted solely because health read the default config.
6. Preserve stale/foreign gateway safety: port busy without same-profile health remains not ready.

## Phase 5 - Tests First: Secret Safety And No User Workaround

Add or extend tests and static assertions.

Required assertions:

1. Status JSON and diagnostics do not include gateway token values.
2. Install-state and diagnostic bundle helpers redact channel credentials and auth profile secrets.
3. Error wording does not instruct users to run `OPENCLAW_CONFIG_PATH=...`.
4. Diagnostic reasons may mention config path mismatch but not token material.
5. Tests use synthetic token names only when needed and assert they are absent from outputs.

Recommended commands:

```bash
node --test ui/tests/packaged-install-retry-guards.test.mjs
node --test ui/tests/packaged-channel-probe-diagnostics.test.mjs
```

## Phase 6 - Source Verification

Run targeted source checks:

```bash
node --check ui/server.mjs
node --test ui/tests/packaged-runtime-profile-config-authority.test.mjs
node --test ui/tests/packaged-runtime-status-authority.test.mjs
node --test ui/tests/packaged-runtime-state-stability.test.mjs
node --test ui/tests/packaged-channel-probe-diagnostics.test.mjs
node --test ui/tests/packaged-install-retry-guards.test.mjs
git diff --check
```

If no new focused test file is created, omit only that command and document equivalent coverage.

## Phase 7 - Fresh Packaged Verification

Batch Verify must rebuild a fresh package after Batch Review approval. It must not reuse stale `dist/**`.

Required packaged verification matrix:

1. Rebuild mac package from source truth.
2. Launch the rebuilt package with isolated `HOME` and `OPENCLAW_HOME`.
3. Use the launcher-printed UI port.
4. Confirm `/api/status.instance.packRoot` equals the rebuilt package root.
5. Confirm `/api/status` authority evidence points to the current packaged profile config path.
6. Confirm daemon status and health use the same profile config authority.
7. Perform DingTalk install/readiness replay and confirm configured/enabled/credential-persisted state is not marked not-ready due to default config token absence.
8. Run a stale/foreign gateway port negative and confirm it remains not ready.
9. Inspect status, logs, install-state, diagnostics, and final report for secret leaks.

## Phase 8 - Batch Review

Independent review must verify:

1. source changes stay inside the approved write-set;
2. no manual `dist/**` patching was used;
3. no user-facing workaround instructs `OPENCLAW_CONFIG_PATH=...`;
4. `/api/status` and install probe share the same profile/config/gateway authority;
5. stale/foreign gateway safety is preserved;
6. secret-safety assertions are present.

Non-`APPROVED` review returns the packet to Worker.

## Phase 9 - Batch Verify

Batch Verify starts only after Batch Review returns `APPROVED`.

Verifier must return `PASS` only if:

1. all required source commands pass;
2. fresh packaged rebuild verification passes;
3. DingTalk configured state is not downgraded because of default config token absence;
4. stale/foreign gateway port negative remains non-ready;
5. no secret leak is found.

Any failure returns the packet to Worker / Review / Verify flow.

## Phase 10 - Closer

Closer may run only after:

- Batch Review verdict is `APPROVED`;
- Batch Verify result is `PASS`.

Closer may update docs, platform guides/runbooks, longrun records, and Mem0 durable memory if requested by the commander. Closer must not modify implementation behavior. If Closer finds an implementation problem, closeout stops and the packet returns to Worker / Review / Verify.

## Stop Conditions

Stop and report if:

- the fix needs OpenClaw vendor changes;
- the fix needs mac wrapper or build script changes;
- the fix needs Windows changes;
- the only fix is a user workaround command;
- fresh packaged verification needs real secret values in evidence;
- stale/foreign gateway safety cannot be preserved.

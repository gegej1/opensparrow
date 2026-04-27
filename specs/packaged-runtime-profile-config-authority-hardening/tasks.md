# Tasks: Packaged Runtime Profile Config Authority Hardening

**Feature ID**: `packaged-runtime-profile-config-authority-hardening`  
**Owner**: SpecWriter  
**Status**: `pending-spec-review`

## Global Guards

- This packet is server/runtime authority work, not packaged entry contract work.
- `packaged-mac-entry-contract-hardening` is treated as completed with Batch Verify `PASS`.
- Do not modify code, tests, docs, longrun, vendor, Windows, or `dist/**` while this packet is in SpecWriter / Spec Review state.
- Do not dispatch Worker until Spec Review returns `APPROVED`.
- Do not manually patch `dist/**`; fresh packaged verification must rebuild from source truth.
- Do not modify `ui/public/**`.
- Do not modify model-routing implementation files, including `ui/lib/model-routing-config.mjs`, `scripts/model-routing/lib/custom-plugin-routing.mjs`, or model-routing runtime/chat tests.
- Do not present `OPENCLAW_CONFIG_PATH=...` as a user workaround.
- Do not leak gateway token, API key, auth profile secret, bearer token, DingTalk credential, or WeCom credential values.
- Do not let Closer update docs, longrun, or Mem0 until Batch Review is `APPROVED` and Batch Verify is `PASS`.

## Required Gates

### Spec Review Gate

- [ ] Spec Reviewer returns verdict `APPROVED` for `spec.md`, `plan.md`, and `tasks.md`.
- [ ] If verdict is `APPROVED_WITH_REQUIRED_FIXES`, `CHANGES_REQUESTED`, or any non-`APPROVED` status, return to SpecWriter revision only.
- [ ] Worker dispatch is forbidden until this gate is complete.

### Worker Gate

- [ ] Assign Worker only after Spec Review Gate is `APPROVED`.
- [ ] Confirm Worker write-set is limited to `ui/server.mjs` plus the relevant runtime authority tests named in `plan.md`.
- [ ] Confirm Worker will not edit `ui/public/**`.
- [ ] Confirm Worker will not edit model-routing implementation files, including `ui/lib/model-routing-config.mjs`, `scripts/model-routing/lib/custom-plugin-routing.mjs`, or model-routing runtime/chat tests.
- [ ] Confirm Worker will not edit `dist/**`, `vendor/**`, Windows, wrappers, build scripts, docs, longrun, or Mem0.
- [ ] If Worker needs a forbidden file, stop; commander must return the packet to SpecWriter / Spec Review for a new scope freeze.
- [ ] Confirm reviewer cannot expand write authority from this gate.

### Batch Review Gate

- [ ] After Worker completes, an independent reviewer checks scope, authority, diagnostics, negative invariants, and secret safety.
- [ ] Review verdict must be `APPROVED`.
- [ ] If review verdict is not `APPROVED`, return the packet to Worker and repeat review.

### Batch Verify Gate

- [ ] Batch Verify starts only after Batch Review Gate is `APPROVED`.
- [ ] Independent verifier runs source verification and returns `PASS`.
- [ ] Independent verifier rebuilds and verifies a fresh packaged artifact and returns `PASS`.
- [ ] If any verification result is not `PASS`, return the packet to Worker / Review / Verify flow.

### Closer Gate

- [ ] Closer starts only after Batch Review Gate is `APPROVED` and Batch Verify Gate is `PASS`.
- [ ] Closer may update docs, platform guides, runbooks, `feature_list.json`, `claude-progress.txt`, and Mem0 durable memory only if requested by the commander.
- [ ] Closer must not modify implementation behavior, source code, tests, vendor files, generated `dist/**`, or Worker-owned surfaces.
- [ ] If Closer finds an implementation issue, stop closeout and return to Worker / Review / Verify flow.

## Phase 0 - SpecWriter Handoff Context

### T0.1 - Confirm Worktree And Packet Identity

- [ ] Run `pwd`.
- [ ] Run `git branch --show-current`.
- [ ] Run `git rev-parse HEAD`.
- [ ] Run `git status --short`.
- [ ] Confirm packet identity is exactly `packaged-runtime-profile-config-authority-hardening`.
- [ ] Confirm existing dirty/untracked files are not silently attributed to this packet.

Done when:

- Worker can state worktree, branch, HEAD, dirty-state summary, and packet identity.

### T0.2 - Read Required Context

- [ ] Read `AGENTS.md`.
- [ ] Search Mem0 for related OpenSparrow memories using `user_id=opensparrow-memory` and `metadata.project=opensparrow`.
- [ ] Read `docs/项目持久化说明.md`.
- [ ] Read `docs/governance/README.md`.
- [ ] Read `docs/governance/framework-stack.md`.
- [ ] Read `.specify/memory/constitution.md`.
- [ ] Read `longrun/workspaces/opensparrow-unified/app_spec.md`.
- [ ] Read `longrun/workspaces/opensparrow-unified/feature_list.json`.
- [ ] Read `longrun/workspaces/opensparrow-unified/claude-progress.txt`.
- [ ] Read this packet's `spec.md`.
- [ ] Read this packet's `plan.md`.
- [ ] Read this packet's `tasks.md`.
- [ ] Read `specs/032-packaged-runtime-authority-and-restart-truth/spec.md`.
- [ ] Read `specs/packaged-mac-entry-contract-hardening/spec.md`.

Done when:

- Worker understands the failure is current-profile config authority drift, not missing bundled archives, wrong `packRoot`, or stale UI port selection.

### T0.3 - Inspect Relevant Source Areas

- [ ] Read `ui/server.mjs` around `PROFILE`, `OPENCLAW_HOME`, `PROFILE_DIR`, `CONFIG_FILE`, `runOc()`, `isGatewayHealthy()`, `readDaemonRuntimeSignal()`, `resolveRuntimeState()`, DingTalk probe, WeCom probe, and install readiness gates.
- [ ] Read `ui/tests/packaged-runtime-status-authority.test.mjs`.
- [ ] Read `ui/tests/packaged-runtime-state-stability.test.mjs`.
- [ ] Read `ui/tests/packaged-channel-probe-diagnostics.test.mjs`.
- [ ] Read `ui/tests/packaged-install-retry-guards.test.mjs`.

Done when:

- Worker can name the current code paths that decide OpenClaw child env, profile config path, daemon status, health, gateway port authority, and channel readiness.

## Phase 1 - Tests First: OpenClaw Child Env Authority

### T1.1 - Add Spawn Env Regression

Files:

- Create `ui/tests/packaged-runtime-profile-config-authority.test.mjs` or modify `ui/tests/packaged-runtime-status-authority.test.mjs`.

Required assertions:

- [ ] OpenClaw child-process env includes current `OPENCLAW_HOME`.
- [ ] OpenClaw child-process env includes current `OPENCLAW_PROFILE`.
- [ ] OpenClaw child-process env includes `OPENCLAW_CONFIG_PATH` equal to current `CONFIG_FILE`.
- [ ] OpenClaw child-process env includes current `OPENCLAW_GATEWAY_PORT`.
- [ ] The test uses synthetic token values only and asserts they do not appear in response/log text.

Run:

```bash
node --test ui/tests/packaged-runtime-profile-config-authority.test.mjs
```

If no new file is created, run the existing file that owns these assertions and document the substitution.

Expected red result before implementation:

- Fails if `runOc()` uses `{ ...process.env, CI: ... }` without stable current-profile `OPENCLAW_CONFIG_PATH`.

## Phase 2 - Implement Current Profile Config Propagation

### T2.1 - Add Central Child Env Helper

Files:

- Modify `ui/server.mjs`.

Implementation requirements:

- [ ] Add a single helper for OpenClaw child env construction.
- [ ] Include `OPENCLAW_HOME`.
- [ ] Include `OPENCLAW_PROFILE`.
- [ ] Include `OPENCLAW_CONFIG_PATH` pointing to `CONFIG_FILE`.
- [ ] Include `OPENCLAW_GATEWAY_PORT`.
- [ ] Include `CI`.
- [ ] Preserve safe existing environment behavior required by current tests.
- [ ] Do not print config contents or token values.

Validation:

```bash
node --check ui/server.mjs
node --test ui/tests/packaged-runtime-profile-config-authority.test.mjs
```

### T2.2 - Route Config-Reading OpenClaw Commands Through The Helper

Files:

- Modify `ui/server.mjs`.

Implementation requirements:

- [ ] `runOc()` uses the central child env helper.
- [ ] `daemon status --json` uses the helper.
- [ ] `health --json` uses the helper.
- [ ] `channels status --probe` uses the helper.
- [ ] daemon lifecycle/config write commands continue using the current profile authority.

Validation:

```bash
node --check ui/server.mjs
node --test ui/tests/packaged-runtime-profile-config-authority.test.mjs
```

## Phase 3 - Tests First: Same-Profile Status And Probe Authority

### T3.1 - Add Runtime Authority Classification Coverage

Files:

- Modify `ui/tests/packaged-runtime-status-authority.test.mjs`.
- Modify `ui/tests/packaged-runtime-state-stability.test.mjs` if stable retry behavior needs coverage.

Required assertions:

- [ ] Daemon status and health are invoked with the same profile `OPENCLAW_CONFIG_PATH`.
- [ ] Current-profile daemon running plus current-profile health success classifies as authoritative ready.
- [ ] Port busy plus same-profile health failure classifies as stale/foreign gateway or equivalent non-ready state.
- [ ] Gateway unhealthy under the correct profile remains non-ready.
- [ ] Config path/token mismatch is distinguishable from generic daemon `unknown`.
- [ ] `/api/status` exposes non-secret profile/config/gateway authority evidence.

Run:

```bash
node --test ui/tests/packaged-runtime-status-authority.test.mjs
node --test ui/tests/packaged-runtime-state-stability.test.mjs
```

### T3.2 - Add DingTalk Probe Readiness Regression

Files:

- Modify `ui/tests/packaged-channel-probe-diagnostics.test.mjs`.
- Modify `ui/tests/packaged-install-retry-guards.test.mjs` if install gate wording needs coverage.

Required assertions:

- [ ] DingTalk configured/enabled/credential-persisted state is not marked not-ready due to default config token absence.
- [ ] `channels status --probe` uses current profile config authority.
- [ ] `requested channels are not authoritatively ready after install` is not emitted solely because `health --json` read the default config.
- [ ] A real gateway failure still produces a non-ready result.
- [ ] Error/diagnostic output does not instruct users to export `OPENCLAW_CONFIG_PATH`.

Run:

```bash
node --test ui/tests/packaged-channel-probe-diagnostics.test.mjs
node --test ui/tests/packaged-install-retry-guards.test.mjs
```

## Phase 4 - Implement Runtime Authority Classification

### T4.1 - Align `/api/status` With Same-Profile Authority

Files:

- Modify `ui/server.mjs`.

Implementation requirements:

- [ ] `readDaemonRuntimeSignal()` and `isGatewayHealthy()` use the same current-profile child env.
- [ ] `resolveRuntimeState()` distinguishes authoritative ready, gateway unhealthy, config/token mismatch, and stale/foreign gateway port.
- [ ] `/api/status` includes non-secret authority evidence.
- [ ] Top-level status does not report daemon/running success when same-profile health is false and authority is contradictory.
- [ ] Existing `instance.packRoot`, `profileDir`, `configPath`, and gateway fields remain useful for verifier diagnosis.

Validation:

```bash
node --check ui/server.mjs
node --test ui/tests/packaged-runtime-status-authority.test.mjs
node --test ui/tests/packaged-runtime-state-stability.test.mjs
```

### T4.2 - Align Install Probe Readiness With Same-Profile Authority

Files:

- Modify `ui/server.mjs`.

Implementation requirements:

- [ ] DingTalk readiness gate uses same profile/config/gateway authority as `/api/status`.
- [ ] WeCom readiness gate uses same profile/config/gateway authority as `/api/status`.
- [ ] `channels status --probe` runs with current `OPENCLAW_CONFIG_PATH`.
- [ ] Config/token mismatch produces actionable non-secret diagnostics.
- [ ] Stale/foreign gateway port remains non-ready.
- [ ] Current-profile authoritative ready lets configured DingTalk proceed to readiness/probe instead of daemon `unknown`.

Validation:

```bash
node --check ui/server.mjs
node --test ui/tests/packaged-channel-probe-diagnostics.test.mjs
node --test ui/tests/packaged-install-retry-guards.test.mjs
```

## Phase 5 - Secret Safety

### T5.1 - Add Redaction And Workaround Guards

Files:

- Modify `ui/tests/packaged-install-retry-guards.test.mjs`.
- Modify `ui/tests/packaged-channel-probe-diagnostics.test.mjs`.
- Modify `ui/tests/packaged-runtime-profile-config-authority.test.mjs` if created.

Required assertions:

- [ ] Status payload does not contain synthetic gateway token value.
- [ ] Install-state or diagnostic output does not contain synthetic API key value.
- [ ] Auth profile secret values do not appear in diagnostics.
- [ ] Error wording does not include `export OPENCLAW_CONFIG_PATH` or equivalent user workaround.
- [ ] Path evidence may include sanitized config path but not config file contents.

Run:

```bash
node --test ui/tests/packaged-install-retry-guards.test.mjs
node --test ui/tests/packaged-channel-probe-diagnostics.test.mjs
node --test ui/tests/packaged-runtime-profile-config-authority.test.mjs
```

If no new file is created, omit the last command and document equivalent coverage.

## Phase 6 - Source Verification

### T6.1 - Run Targeted Source Checks

- [ ] `node --check ui/server.mjs`
- [ ] `node --test ui/tests/packaged-runtime-profile-config-authority.test.mjs` if created
- [ ] `node --test ui/tests/packaged-runtime-status-authority.test.mjs`
- [ ] `node --test ui/tests/packaged-runtime-state-stability.test.mjs`
- [ ] `node --test ui/tests/packaged-channel-probe-diagnostics.test.mjs`
- [ ] `node --test ui/tests/packaged-install-retry-guards.test.mjs`
- [ ] `git diff --check`

Done when:

- All targeted source checks pass, or any intentionally omitted command is justified by equivalent coverage.

## Phase 7 - Worker Handoff

### T7.1 - Report Source Implementation Evidence

- [ ] Report changed files.
- [ ] Report source verification commands and outcomes.
- [ ] Report how `OPENCLAW_CONFIG_PATH` is propagated.
- [ ] Report how daemon status and health share the same profile config.
- [ ] Report how DingTalk configured state avoids the default-config token-missing false negative.
- [ ] Report stale/foreign gateway negative behavior.
- [ ] Report secret-safety evidence.
- [ ] Do not claim packaged PASS.

Done when:

- Worker output is ready for Batch Review.

## Phase 8 - Batch Review Gate

### T8.1 - Independent Review

- [ ] Confirm source changes stay inside approved write-set.
- [ ] Confirm no `dist/**` manual patching.
- [ ] Confirm no `ui/public/**` files were touched.
- [ ] Confirm no model-routing implementation files were touched, including `ui/lib/model-routing-config.mjs`, `scripts/model-routing/lib/custom-plugin-routing.mjs`, or model-routing runtime/chat tests.
- [ ] Confirm no Windows, vendor, wrappers, build script, docs, or longrun edits are included.
- [ ] Confirm reviewer did not approve any scope expansion outside the frozen write-set.
- [ ] Confirm no user-facing `OPENCLAW_CONFIG_PATH` workaround was introduced.
- [ ] Confirm `/api/status` and install probe share same profile/config/gateway authority.
- [ ] Confirm stale/foreign gateway remains non-ready.
- [ ] Confirm secret values are not leaked.
- [ ] Return verdict `APPROVED` or send back to Worker.

Done when:

- Batch Review Gate is `APPROVED`.

## Phase 9 - Batch Verify Gate

### T9.1 - Source Verification

- [ ] Start only after Batch Review Gate is `APPROVED`.
- [ ] Rerun the full Phase 6 source command set.
- [ ] Confirm all required source checks return `PASS`.

### T9.2 - Fresh Packaged Verification

- [ ] Rebuild a fresh mac package from source truth.
- [ ] Do not reuse stale `dist/**` as evidence.
- [ ] Launch rebuilt package with isolated `HOME` and `OPENCLAW_HOME`.
- [ ] Use the launcher-printed UI port.
- [ ] Confirm `/api/status.instance.packRoot` equals the rebuilt package root.
- [ ] Confirm `/api/status` config authority points to the current packaged profile config.
- [ ] Confirm daemon status and health use the same profile config authority.
- [ ] Confirm packaged DingTalk configured/enabled/credential-persisted state is not marked not-ready because default config lacks gateway token.
- [ ] Confirm stale/foreign gateway port negative remains non-ready.
- [ ] Inspect status, logs, install-state, diagnostics, and final report for secret leaks.

Done when:

- Batch Verify Gate is `PASS`.

## Phase 10 - Closer Gate

### T10.1 - Confirm Closer Entry Conditions

- [ ] Confirm Batch Review Gate is `APPROVED`.
- [ ] Confirm Batch Verify Gate is `PASS`.
- [ ] Confirm Closer is not modifying implementation behavior, source code, tests, vendor files, generated `dist/**`, or Worker-owned surfaces.
- [ ] If any implementation issue is found, stop closeout and return to Worker / Review / Verify flow.

### T10.2 - Allowed Closeout Updates

- [ ] Update user-facing docs, platform guides, or runbooks only where reviewed/verified facts require it.
- [ ] Update `longrun/workspaces/opensparrow-unified/feature_list.json` only from verified facts.
- [ ] Update `longrun/workspaces/opensparrow-unified/claude-progress.txt` only from verified facts.
- [ ] Store Mem0 durable memory only after verified closeout is approved.
- [ ] Do not use closeout to repair implementation behavior.

Done when:

- Closeout records only reviewed and verified facts.

## Stop Conditions

Stop and report if:

- the fix requires OpenClaw vendor binary changes;
- the fix requires mac wrapper or build script changes;
- the fix requires Windows changes;
- the only solution is to instruct users to export `OPENCLAW_CONFIG_PATH`;
- verification requires exposing real gateway token, API key, auth profile secret, or channel credentials;
- stale/foreign gateway port safety cannot be preserved;
- fresh packaged verification cannot rebuild from source truth.

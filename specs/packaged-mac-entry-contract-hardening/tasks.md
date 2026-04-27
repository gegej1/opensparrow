# Tasks: Packaged Mac Entry Contract Hardening

**Feature ID**: `packaged-mac-entry-contract-hardening`
**Owner**: SpecWriter
**Status**: `pending-spec-review`

## Global Guards

- Only the generated package root `01-开始部署.command` is the official packaged macOS first-click path.
- `platforms/mac/wrappers/*.command` is source template / developer surface.
- Generated `mac/01-开始部署.command` is compatibility/handoff only.
- Do not modify `vendor/**`.
- Do not manually patch `dist/**`.
- Do not treat `localhost:19000` as authoritative until the printed UI port and `/api/status.instance.packRoot` match the session under test.
- Do not write credentials, API keys, bearer tokens, or unredacted local config into tests, docs, logs, or final evidence.
- Do not dispatch Worker-A/B/C or any implementation worker until the Spec Review Gate returns `APPROVED`.
- Do not let closeout update docs, longrun, or Mem0 until both Batch Review Gate and Batch Verify Gate have passed.

## Required Gates

### Spec Review Gate

- [ ] Spec Reviewer returns verdict `APPROVED` for `spec.md`, `plan.md`, and `tasks.md`.
- [ ] If verdict is `APPROVED_WITH_REQUIRED_FIXES`, `CHANGES_REQUESTED`, or any non-`APPROVED` status, return to SpecWriter revision only.
- [ ] Worker-A/B/C dispatch is forbidden until this gate is complete.

### Worker Dispatch And Disjoint Write-Set Gate

- [ ] Assign Worker-A only after Spec Review Gate is `APPROVED`.
- [ ] Assign Worker-B only after Spec Review Gate is `APPROVED`.
- [ ] Assign Worker-C only after Spec Review Gate is `APPROVED`.
- [ ] Confirm Worker-A, Worker-B, and Worker-C write-sets are disjoint before parallel work starts.
- [ ] If any file must be shared, stop parallel execution and either assign the shared file to one owner or run the affected workers sequentially.

Worker-A owns mac wrapper / build entry contract only:

- `platforms/mac/wrappers/01-开始部署.command`
- `scripts/build-usb-pack.sh`
- Wrapper/build contract tests such as `ui/tests/packaged-mac-wrapper-hardening.test.mjs` and `ui/tests/packaged-mac-entry-contract-hardening.test.mjs`
- Forbidden: `ui/server.mjs`, `ui/install-helpers.mjs`, server readiness/error implementation, Worker-B/C ownership.

Worker-B owns server/status bundled plugin readiness and missing archive error contract only:

- `ui/server.mjs`
- `ui/install-helpers.mjs`
- Status/helper/error tests such as `ui/tests/install-helpers.test.mjs`, `ui/tests/packaged-runtime-status-authority.test.mjs`, `ui/tests/packaged-install-retry-guards.test.mjs`, and `ui/tests/packaged-bundled-plugin-readiness-status.test.mjs` if needed.
- Forbidden: mac wrappers, `scripts/build-usb-pack.sh`, build-output launcher generation, Worker-A/C ownership.

Worker-C owns acceptance matrix / stale-port verification harness only:

- A dedicated packaged mac acceptance matrix test or verification script such as `ui/tests/packaged-mac-entry-acceptance-matrix.test.mjs` or `scripts/verify-packaged-mac-entry-contract.sh`.
- Forbidden: Worker-A source files, Worker-B source files, and Worker-A/B owned tests.

### Batch Review Gate

- [ ] After Worker-A/B/C complete, an independent reviewer reviews Worker-A output and returns `APPROVED`.
- [ ] After Worker-A/B/C complete, an independent reviewer reviews Worker-B output and returns `APPROVED`.
- [ ] After Worker-A/B/C complete, an independent reviewer reviews Worker-C output and returns `APPROVED`.
- [ ] If any review verdict is not `APPROVED`, return the affected work to Worker and repeat review.

### Batch Verify Gate

- [ ] Batch Verify starts only after Batch Review Gate is fully `APPROVED`.
- [ ] An independent verifier runs source verification and returns `PASS`.
- [ ] An independent verifier runs fresh packaged acceptance verification and returns `PASS`.
- [ ] If any verification result is not `PASS`, return the affected work to Worker / Review / Verify flow.

### Closer Gate

- [ ] Closer starts only after Batch Review Gate is `APPROVED` and Batch Verify Gate is `PASS`.
- [ ] Closer may update user-facing docs, platform guides, runbooks, `feature_list.json`, `claude-progress.txt`, and Mem0 durable memory.
- [ ] Closer must not modify implementation behavior, source code, tests, vendor files, generated `dist/**`, or Worker-owned surfaces.
- [ ] If Closer finds an implementation issue, stop closeout and return to Worker / Review / Verify flow.

## Phase 0 - Handoff Gate

### T0.1 - Confirm Worktree And Packet Identity

- [ ] Run `pwd`.
- [ ] Run `git branch --show-current`.
- [ ] Run `git rev-parse HEAD`.
- [ ] Run `git status --short`.
- [ ] Confirm packet identity is exactly `packaged-mac-entry-contract-hardening`.
- [ ] Confirm current dirty or untracked files are not silently attributed to this packet.

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
- [ ] Read `specs/027-mac-ui-first-release-readiness/spec.md`.
- [ ] Read `specs/027-mac-ui-first-release-readiness/plan.md`.
- [ ] Read `docs/usb-pack/INSTALL.md`.
- [ ] Read `docs/usb-pack/SOP.md`.

Done when:

- Worker understands that the bug is an entry-boundary and `packRoot` truth issue, not proof that the generated package lacks the DingTalk channels archive.

### T0.3 - Inspect Relevant Source Areas

- [ ] Read `platforms/mac/wrappers/01-开始部署.command`.
- [ ] Read `platforms/mac/wrappers/run-openclaw-usb.command`.
- [ ] Read `platforms/mac/wrappers/harden-openclaw-usb.command`.
- [ ] Read `scripts/build-usb-pack.sh` around mac wrapper copy/generation.
- [ ] Read `ui/server.mjs` around `PACK_ROOT`, `/api/status`, bundled plugin install, and missing archive error handling.
- [ ] Read `ui/install-helpers.mjs`.
- [ ] Read `ui/tests/packaged-mac-wrapper-hardening.test.mjs`.
- [ ] Read `ui/tests/packaged-install-retry-guards.test.mjs`.
- [ ] Read `ui/tests/packaged-runtime-status-authority.test.mjs`.
- [ ] Read `ui/tests/install-helpers.test.mjs`.

Done when:

- Worker can name the current source paths that decide launcher role, package root, UI port, bundled archive lookup, and status exposure.

## Phase 1 - Tests First: Source Wrapper Developer Mode

### T1.1 - Add Source Wrapper Role Regression

Files:

- Modify `ui/tests/packaged-mac-wrapper-hardening.test.mjs`.

Required assertions:

- [ ] Source wrapper contains a source/developer mode branch.
- [ ] Source/developer mode has explicit user-visible wording such as `developer` or `debug`.
- [ ] Source/developer mode does not default to `OPENSPARROW_REQUIRE_BUNDLED_PLUGINS=1`.
- [ ] Packaged mode still supports `OPENSPARROW_REQUIRE_BUNDLED_PLUGINS=1`.
- [ ] Package-root resolution still prefers `$script_dir` before ancestor fallback.
- [ ] UI free-port selection and printed `UI:` line remain covered.

Run:

```bash
node --test ui/tests/packaged-mac-wrapper-hardening.test.mjs
```

Expected red result before implementation:

- Fails on missing explicit source/developer mode if the wrapper still treats source launch as packaged hardening.

### T1.2 - Add Stale Port Guard Regression

Files:

- Modify `ui/tests/packaged-mac-wrapper-hardening.test.mjs` or create `ui/tests/packaged-mac-entry-contract-hardening.test.mjs`.

Required assertions:

- [ ] Launcher assigns `OPENSPARROW_UI_PORT` through free-port selection.
- [ ] Launcher prints the selected UI port before `exec`.
- [ ] Test wording reminds verifier not to rely on `localhost:19000`.

Run:

```bash
node --test ui/tests/packaged-mac-wrapper-hardening.test.mjs
```

Done when:

- The stale-source-UI failure mode is represented in source tests.

## Phase 2 - Tests First: Package `mac/01` Handoff

### T2.1 - Add Build Contract Test For Root And `mac/01`

Files:

- Create or modify `ui/tests/packaged-mac-entry-contract-hardening.test.mjs`.

Required assertions:

- [ ] `scripts/build-usb-pack.sh` places `01-开始部署.command` at the package root.
- [ ] `scripts/build-usb-pack.sh` creates or preserves generated `mac/01-开始部署.command` as handoff-only.
- [ ] Generated `mac/01-开始部署.command` text includes compatibility/handoff wording.
- [ ] Generated `mac/01-开始部署.command` executes `../01-开始部署.command` or the resolved package-root launcher.
- [ ] Generated `mac/01-开始部署.command` does not independently set packaged hardening and run `ui/server.mjs`.

Run:

```bash
node --test ui/tests/packaged-mac-entry-contract-hardening.test.mjs
```

Expected red result before implementation:

- Fails if package `mac/01-开始部署.command` is still an independent copy of the package-root launcher.

## Phase 3 - Tests First: Bundled Plugin Readiness

### T3.1 - Add Readiness Helper Coverage

Files:

- Modify `ui/install-helpers.mjs`.
- Modify `ui/tests/install-helpers.test.mjs`.

Required assertions:

- [ ] Helper reports DingTalk channels archive present when `plugins/openclaw-china-channels-*.tgz` exists.
- [ ] Helper reports WeCom archive present when the bundled WeCom plugin archive exists.
- [ ] Helper reports `ready=true` only when every required archive is present.
- [ ] Helper reports missing package specs by package name.
- [ ] Helper output includes checked `pluginsDir`.
- [ ] Helper output does not require real credentials.

Run:

```bash
node --test ui/tests/install-helpers.test.mjs
```

Expected red result before implementation:

- Fails because no structured readiness helper exists or it does not report the required fields.

### T3.2 - Add `/api/status` Bundled Readiness Regression

Files:

- Modify `ui/tests/packaged-runtime-status-authority.test.mjs` or create `ui/tests/packaged-bundled-plugin-readiness-status.test.mjs`.

Required assertions:

- [ ] With `OPENSPARROW_REQUIRE_BUNDLED_PLUGINS=1`, `/api/status` includes bundled plugin readiness.
- [ ] Status includes active `instance.packRoot`.
- [ ] Status includes checked `pluginsDir`.
- [ ] Status includes `ready=false` and missing `@openclaw-china/channels` when the channels archive is absent.
- [ ] Status includes `ready=true` when required archives are present.
- [ ] Status distinguishes source/developer mode from packaged hardening mode.

Run one of:

```bash
node --test ui/tests/packaged-runtime-status-authority.test.mjs
node --test ui/tests/packaged-bundled-plugin-readiness-status.test.mjs
```

Expected red result before implementation:

- Fails because `/api/status` does not expose required bundled readiness.

### T3.3 - Add Missing Archive Error Regression

Files:

- Modify `ui/tests/packaged-install-retry-guards.test.mjs`.

Required assertions:

- [ ] Missing archive error includes active `packRoot`.
- [ ] Missing archive error includes checked `pluginsDir`.
- [ ] Missing archive error says the current `packRoot` is not the delivery package root or the package is incomplete.
- [ ] Missing archive error names `@openclaw-china/channels` for DingTalk channels.
- [ ] Missing archive error tells user to run package-root `01-开始部署.command` or rebuild/reacquire a complete package.
- [ ] Missing archive error does not recommend online install fallback for packaged hardening mode.

Run:

```bash
node --test ui/tests/packaged-install-retry-guards.test.mjs
```

Expected red result before implementation:

- Fails if current wording still points to generic bundled archive absence or online-install avoidance instead of wrong `packRoot` or incomplete package.

## Phase 4 - Implement Wrapper And Build Role Contract

### T4.1 - Implement Source Versus Package Root Classification

Files:

- Modify `platforms/mac/wrappers/01-开始部署.command`.

Implementation requirements:

- [ ] Detect when resolved `packRoot` is the source/worktree root.
- [ ] Print explicit developer/debug mode for source/worktree launch.
- [ ] Do not default `OPENSPARROW_REQUIRE_BUNDLED_PLUGINS=1` in source/developer mode.
- [ ] Keep packaged hardening mode for generated package roots.
- [ ] Preserve free UI port selection.
- [ ] Preserve printed `Home`, `Profile`, `Gateway`, `Router`, `UI`, `Runtime`, and `Mode` lines.

Validation:

```bash
bash -n platforms/mac/wrappers/01-开始部署.command
node --test ui/tests/packaged-mac-wrapper-hardening.test.mjs
```

### T4.2 - Generate Package `mac/01` As Handoff

Files:

- Modify `scripts/build-usb-pack.sh`.

Implementation requirements:

- [ ] Continue placing official `01-开始部署.command` at package root.
- [ ] Ensure generated `mac/01-开始部署.command` is compatibility/handoff only.
- [ ] Ensure generated `mac/01-开始部署.command` resolves package-root `../01-开始部署.command`.
- [ ] Ensure generated `mac/01-开始部署.command` preserves arguments.
- [ ] Ensure generated `mac/01-开始部署.command` does not independently start `ui/server.mjs`.
- [ ] Leave `mac/run-openclaw-usb.command` and `mac/harden-openclaw-usb.command` as handoff-only.

Validation:

```bash
bash -n platforms/mac/wrappers/*.command
node --test ui/tests/packaged-mac-entry-contract-hardening.test.mjs
```

## Phase 5 - Implement Status And Error Contract

### T5.1 - Implement Bundled Plugin Readiness Helper

Files:

- Modify `ui/install-helpers.mjs`.
- Modify `ui/tests/install-helpers.test.mjs`.

Implementation requirements:

- [ ] Define required package specs for bundled readiness.
- [ ] Reuse existing archive normalization behavior.
- [ ] Return readiness for `@openclaw-china/channels`.
- [ ] Return readiness for the WeCom plugin archive.
- [ ] Return a `ready` summary boolean.
- [ ] Return a `missing` list.
- [ ] Return archive basenames or relative paths for present archives.

Validation:

```bash
node --check ui/install-helpers.mjs
node --test ui/tests/install-helpers.test.mjs
```

### T5.2 - Expose Readiness On `/api/status`

Files:

- Modify `ui/server.mjs`.
- Modify status tests from T3.2.

Implementation requirements:

- [ ] Include bundled readiness when `OPENSPARROW_REQUIRE_BUNDLED_PLUGINS=1`.
- [ ] Include readiness in a stable field such as `bundledPlugins`.
- [ ] Include active `PACK_ROOT` and checked `BUNDLED_PLUGINS_DIR`.
- [ ] Preserve existing `instance` fingerprint.
- [ ] Preserve existing daemon/gateway status behavior.

Validation:

```bash
node --check ui/server.mjs
node --test ui/tests/packaged-runtime-status-authority.test.mjs
```

If a new status test file is created, run that file too.

### T5.3 - Reword Missing Archive Errors

Files:

- Modify `ui/server.mjs`.
- Modify `ui/tests/packaged-install-retry-guards.test.mjs`.

Implementation requirements:

- [ ] Missing archive errors must state wrong `packRoot` or incomplete package.
- [ ] Missing archive errors must include active `packRoot`.
- [ ] Missing archive errors must include checked `pluginsDir`.
- [ ] Missing archive errors must name missing package spec.
- [ ] Missing archive errors must point to package-root `01-开始部署.command` or complete package rebuild/reacquire.
- [ ] Missing archive errors must not imply online install fallback is the packaged-mode resolution.

Validation:

```bash
node --test ui/tests/packaged-install-retry-guards.test.mjs
```

## Phase 6 - Source Verification

### T6.1 - Run Targeted Source Checks

- [ ] `bash -n platforms/mac/wrappers/*.command`
- [ ] `node --check ui/server.mjs`
- [ ] `node --check ui/install-helpers.mjs`
- [ ] `node --test ui/tests/install-helpers.test.mjs`
- [ ] `node --test ui/tests/packaged-mac-wrapper-hardening.test.mjs`
- [ ] `node --test ui/tests/packaged-mac-entry-contract-hardening.test.mjs` if created
- [ ] `node --test ui/tests/packaged-install-retry-guards.test.mjs`
- [ ] `node --test ui/tests/packaged-runtime-status-authority.test.mjs`
- [ ] `git diff --check`

Done when:

- All targeted source checks pass, or any intentionally omitted command is justified by equivalent coverage.

## Phase 7 - Fresh Package Acceptance Matrix

### T7.1 - Build Or Select Fresh Package

- [ ] Build or select a fresh generated package root under `dist/usb-pack/opensparrow-0.1.0-alpha`.
- [ ] Confirm the package root contains `01-开始部署.command`.
- [ ] Confirm the package root contains `ui/server.mjs`.
- [ ] Confirm the package root contains `plugins/openclaw-china-channels-*.tgz`.
- [ ] Confirm the package root contains the bundled WeCom plugin archive.
- [ ] Do not manually edit files under `dist/`.

Done when:

- The package root is ready for launch verification.

### T7.2 - Verify Source Wrapper Path

- [ ] Launch or dry-run `platforms/mac/wrappers/01-开始部署.command` from the source/worktree context.
- [ ] Confirm output identifies developer/debug mode.
- [ ] Confirm output does not claim official packaged install.
- [ ] If UI is launched, fetch `/api/status` from the printed UI port.
- [ ] Confirm `/api/status.instance.packRoot` is source/worktree root.
- [ ] Confirm `/api/status` distinguishes this from packaged hardening mode.

Done when:

- Source wrapper path is proven to be developer/debug mode, not a packaged install path.

### T7.3 - Verify Package Root Wrapper Path

- [ ] Leave or simulate an old source UI on `localhost:19000` if feasible.
- [ ] Launch `dist/usb-pack/opensparrow-0.1.0-alpha/01-开始部署.command` with isolated `HOME` and `OPENCLAW_HOME`.
- [ ] Set `OPENSPARROW_AUTO_OPEN=0` for repeatable terminal verification.
- [ ] Read the printed `UI:` port.
- [ ] Fetch `/api/status` from the printed UI port.
- [ ] Confirm `/api/status.instance.packRoot` equals `dist/usb-pack/opensparrow-0.1.0-alpha`.
- [ ] Confirm `/api/status.bundledPlugins.required=true`.
- [ ] Confirm `/api/status.bundledPlugins.ready=true`.
- [ ] Confirm DingTalk channels archive readiness is true.
- [ ] Confirm WeCom archive readiness is true.

Done when:

- Package root wrapper is proven to be the official packaged first-click path with correct `packRoot` and bundled readiness.

### T7.4 - Verify Package `mac/01` Handoff Path

- [ ] Launch `dist/usb-pack/opensparrow-0.1.0-alpha/mac/01-开始部署.command` with isolated `HOME` and `OPENCLAW_HOME`.
- [ ] Confirm terminal output states compatibility/handoff role.
- [ ] Confirm it transfers to package-root `01-开始部署.command`.
- [ ] Read the printed `UI:` port after handoff.
- [ ] Fetch `/api/status` from the printed UI port.
- [ ] Confirm `/api/status.instance.packRoot` equals `dist/usb-pack/opensparrow-0.1.0-alpha`.
- [ ] Confirm it does not start an independent `mac/` rooted session.

Done when:

- Package `mac/01` path is proven to be handoff-only.

### T7.5 - Verify Missing Archive Negative Path

- [ ] Create an isolated copied package fixture outside the source tree.
- [ ] Remove or hide `plugins/openclaw-china-channels-*.tgz` from that copied fixture.
- [ ] Launch package-root `01-开始部署.command` with `OPENSPARROW_REQUIRE_BUNDLED_PLUGINS=1`.
- [ ] Trigger or simulate DingTalk channel plugin install preflight.
- [ ] Confirm error says current `packRoot` is not the delivery package root or the package is incomplete.
- [ ] Confirm error includes active `packRoot`.
- [ ] Confirm error includes checked `pluginsDir`.
- [ ] Confirm error names `@openclaw-china/channels`.
- [ ] Confirm error points to package-root first-click or complete package rebuild/reacquire.
- [ ] Confirm error does not recommend online install fallback.

Done when:

- Missing bundled archive diagnostics are actionable and not misleading.

## Phase 7.6 - Batch Review Gate

- [ ] Confirm Worker-A output has independent review verdict `APPROVED`.
- [ ] Confirm Worker-B output has independent review verdict `APPROVED`.
- [ ] Confirm Worker-C output has independent review verdict `APPROVED`.
- [ ] Confirm no reviewer accepted a write-set conflict or unowned shared-file edit.

Done when:

- Batch Review Gate is fully `APPROVED`.

## Phase 7.7 - Batch Verify Gate

- [ ] Start only after Phase 7.6 is fully `APPROVED`.
- [ ] Run independent source verification for the full accepted write-set.
- [ ] Run independent fresh packaged acceptance verification for the full accepted write-set.
- [ ] Confirm source verification result is `PASS`.
- [ ] Confirm fresh packaged acceptance verification result is `PASS`.

Done when:

- Batch Verify Gate is `PASS`.

## Phase 8 - Closer Gate: Documentation, Longrun, And Memory

### T8.0 - Confirm Closer Entry Conditions

- [ ] Confirm Batch Review Gate is fully `APPROVED`.
- [ ] Confirm Batch Verify Gate is `PASS`.
- [ ] Confirm Closer is not modifying implementation behavior, source code, tests, vendor files, generated `dist/**`, or Worker-owned surfaces.
- [ ] If any implementation issue is found, stop closeout and return to Worker / Review / Verify flow.

### T8.1 - Update User-Facing Documentation

Files:

- `docs/usb-pack/INSTALL.md`
- `docs/usb-pack/SOP.md`
- `docs/runbooks/release-process.md`
- Affected platform guides or runbooks, if the approved implementation changes support wording.
- `docs/release-checklist.md`
- `docs/packaged-mac-diagnostics.md`

Required updates:

- [ ] Run only after T8.0 confirms Batch Review `APPROVED` and Batch Verify `PASS`.
- [ ] Official first-click path remains package-root `01-开始部署.command`.
- [ ] Source wrapper is developer/debug surface.
- [ ] Package `mac/01` is compatibility/handoff only.
- [ ] Bundled readiness can be checked through `/api/status`.
- [ ] Stale `localhost:19000` diagnosis uses printed UI port and `instance.packRoot`.
- [ ] Missing archive errors mean wrong `packRoot` or incomplete package.
- [ ] Do not change implementation behavior while editing docs.

### T8.2 - Update Longrun Closeout

Files:

- `longrun/workspaces/opensparrow-unified/feature_list.json`
- `longrun/workspaces/opensparrow-unified/claude-progress.txt`

Required updates:

- [ ] Run only after T8.0 confirms Batch Review `APPROVED` and Batch Verify `PASS`.
- [ ] Only write facts supported by source and fresh package evidence.
- [ ] Include source verification command results.
- [ ] Include package-root wrapper evidence.
- [ ] Include package `mac/01` handoff evidence.
- [ ] Include missing archive negative evidence.
- [ ] Record residual risks without upgrading them to PASS.
- [ ] Do not use longrun closeout to repair or reinterpret implementation behavior.

### T8.3 - Store Durable Memory

- [ ] Run only after T8.0 confirms Batch Review `APPROVED` and Batch Verify `PASS`.
- [ ] Add Mem0 memory under `user_id=opensparrow-memory`.
- [ ] Set `metadata.project=opensparrow`.
- [ ] Use type `decision` or `task_learning`.
- [ ] Store only the durable fact that packaged mac entry roles are now split into source developer surface, package root official first-click, and package `mac/01` handoff.

Done when:

- Repo docs, platform guides/runbooks if affected, longrun state, and project memory reflect only reviewed and verified facts without contradicting the feature spec.

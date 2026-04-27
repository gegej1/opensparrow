# Packaged Mac Entry Contract Hardening Implementation Plan

> **For future approved agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task only after the Spec Review Gate returns `APPROVED`. Steps use checkbox syntax in `tasks.md` for tracking.

**Goal:** Make macOS packaged entry behavior truthful across source, package root, and package `mac/` launch paths.
**Architecture:** Classify launcher context at startup, only enable packaged hardening for generated package roots, make package `mac/` launchers hand off to the root launcher, and expose bundled plugin archive readiness through `/api/status` before channel install. The build pipeline, not manual `dist/` editing, must produce the final packaged launcher roles.
**Tech Stack:** Bash `.command` wrappers, Node ESM `ui/server.mjs`, `ui/install-helpers.mjs`, `node:test`, `scripts/build-usb-pack.sh`, fresh packaged macOS smoke verification.

---

## Packet Guard

- Packet identity: `packaged-mac-entry-contract-hardening`.
- This is a documentation-driven implementation packet.
- Current dispatch state: blocked pending Spec Reviewer re-review.
- Spec Review Gate: Worker dispatch is forbidden while the verdict is `APPROVED_WITH_REQUIRED_FIXES`; implementation may start only after a Spec Reviewer returns `APPROVED` for `spec.md`, `plan.md`, and `tasks.md`.
- Do not edit `vendor/**`.
- Do not manually edit `dist/**` as source truth.
- Do not change channel install behavior except the bundled archive readiness/error path needed by this contract.
- Do not assume `localhost:19000` is the active packaged session.
- Do not claim packaged PASS unless `/api/status.instance.packRoot` points to the generated package root under verification.

## File Structure And Ownership

If the Spec Review Gate later returns `APPROVED`, implementation must use disjoint write-sets. Worker-A/B/C may run in parallel only while these ownership boundaries remain non-overlapping. If any test file or helper must be shared across workers, pause parallel execution and either assign that file to a single owner or convert the affected work to sequential execution before editing.

### Worker-A - mac wrapper / build entry contract

Allowed write-set:

- `platforms/mac/wrappers/01-开始部署.command`
  - Classifies source/developer mode versus generated package-root mode.
  - Prints role, mode, and actual UI port.
  - Keeps generated package-root behavior as the official packaged first-click path.
- `scripts/build-usb-pack.sh`
  - Ensures package root receives the official launcher.
  - Ensures generated `mac/01-开始部署.command` is handoff-only.
  - Ensures packaged launcher role differences are generated, not patched by hand in `dist/`.
- Wrapper/build contract tests owned by Worker-A, such as:
  - `ui/tests/packaged-mac-wrapper-hardening.test.mjs`
  - `ui/tests/packaged-mac-entry-contract-hardening.test.mjs`

Worker-A must not edit `ui/server.mjs`, `ui/install-helpers.mjs`, server readiness logic, missing archive error implementation, or Worker-B/C source ownership.

### Worker-B - server/status bundled plugin readiness and missing archive error contract

Allowed write-set:

- `ui/install-helpers.mjs`
  - Candidate home for a reusable bundled plugin readiness inspector.
- `ui/server.mjs`
  - Exposes bundled plugin readiness on `/api/status`.
  - Uses the readiness inspector before plugin install.
  - Rewords missing archive errors around wrong `packRoot` or incomplete package.
- Status/helper/error tests owned by Worker-B, such as:
  - `ui/tests/install-helpers.test.mjs`
  - `ui/tests/packaged-runtime-status-authority.test.mjs`
  - `ui/tests/packaged-install-retry-guards.test.mjs`
  - `ui/tests/packaged-bundled-plugin-readiness-status.test.mjs` if a new focused status test is needed.

Worker-B must not edit mac wrappers, `scripts/build-usb-pack.sh`, build-output launcher generation, or Worker-A/C source ownership.

### Worker-C - acceptance matrix / stale-port verification harness

Allowed write-set:

- A dedicated packaged mac acceptance matrix test or verification harness, such as:
  - `ui/tests/packaged-mac-entry-acceptance-matrix.test.mjs`, or
  - `scripts/verify-packaged-mac-entry-contract.sh`.

Worker-C verifies source wrapper, package-root wrapper, package `mac/01` handoff, stale-port avoidance, printed UI port usage, `instance.packRoot`, bundled plugin readiness, and missing-archive negative evidence. Worker-C must not edit Worker-A source files, Worker-B source files, or their owned tests. If Worker-C needs additional source behavior, it reports back through review instead of patching those files.

Expected documentation write-set after implementation and verification:

- `docs/usb-pack/INSTALL.md`
- `docs/usb-pack/SOP.md`
- `docs/runbooks/release-process.md`
- `docs/release-checklist.md`
- `docs/packaged-mac-diagnostics.md`
- `longrun/workspaces/opensparrow-unified/feature_list.json`
- `longrun/workspaces/opensparrow-unified/claude-progress.txt`

The current SpecWriter packet only creates `spec.md`, `plan.md`, and `tasks.md`.

## Phase 0 - Baseline And Handoff

1. Confirm worktree, branch, HEAD, and dirty state.
2. Read `AGENTS.md`, governance docs, longrun app spec, feature list, and progress log.
3. Read this feature's `spec.md`, `plan.md`, and `tasks.md`.
4. Read the existing mac release readiness docs under `specs/027-mac-ui-first-release-readiness/`.
5. Inspect current wrapper, build, server, install helper, and relevant tests.
6. Confirm no active worker owns the same write-set after the Spec Review Gate has returned `APPROVED`.

Done when the worker can state the failure as: source wrapper or stale source UI can make packaged hardening search source `packRoot/plugins`, causing a false missing bundled plugin archive error.

## Phase 1 - Tests First: Entry Role Classification

Add or extend source tests before implementation.

Required source assertions:

1. `platforms/mac/wrappers/01-开始部署.command` contains an explicit developer/debug role path when its resolved `packRoot` is a source/worktree root.
2. Source/developer mode does not export packaged hardening defaults that require bundled plugin archives from the source root.
3. Generated package-root mode still exports or preserves `OPENSPARROW_REQUIRE_BUNDLED_PLUGINS=1`.
4. The package-root candidate order prefers `$script_dir` before ancestor fallback.
5. The launcher prints the actual UI port.
6. The launcher output distinguishes source/developer mode from packaged hardening mode.

Recommended command:

```bash
node --test ui/tests/packaged-mac-wrapper-hardening.test.mjs
```

Expected before implementation: fail on missing source/developer role guard if not already present.

## Phase 2 - Tests First: Package `mac/01` Handoff

Add build-output contract tests without editing generated `dist/` directly.

Required source assertions:

1. `scripts/build-usb-pack.sh` places `01-开始部署.command` at package root as the official launcher.
2. `scripts/build-usb-pack.sh` does not ship package `mac/01-开始部署.command` as another independent packaged launcher.
3. The generated `mac/01-开始部署.command` content clearly states compatibility/handoff role.
4. The generated `mac/01-开始部署.command` resolves and executes `../01-开始部署.command`.
5. Existing `mac/run-openclaw-usb.command` and `mac/harden-openclaw-usb.command` remain handoff-only.

Recommended command:

```bash
node --test ui/tests/packaged-mac-entry-contract-hardening.test.mjs
```

Expected before implementation: fail if `mac/01-开始部署.command` is still copied as an independent copy of the root launcher.

## Phase 3 - Tests First: Bundled Plugin Readiness In `/api/status`

Add a focused status/installer readiness regression.

Required source assertions:

1. `ui/install-helpers.mjs` can inspect a `plugins/` directory for required package specs.
2. The readiness helper reports `ready=true` when both DingTalk channels archive and WeCom archive are present.
3. The readiness helper reports `ready=false` and `missing=["@openclaw-china/channels"]` when the DingTalk archive is absent.
4. `/api/status` includes bundled readiness when `OPENSPARROW_REQUIRE_BUNDLED_PLUGINS=1`.
5. `/api/status` includes `packRoot`, `pluginsDir`, readiness booleans, and missing package specs.
6. The payload is useful for stale process diagnosis by showing the active `instance.packRoot`.

Recommended commands:

```bash
node --test ui/tests/install-helpers.test.mjs
node --test ui/tests/packaged-runtime-status-authority.test.mjs
```

Expected before implementation: fail where `/api/status` does not expose readiness.

## Phase 4 - Implement Entry Contract

Implement the smallest wrapper/build changes that satisfy the role contract.

Implementation requirements:

1. `platforms/mac/wrappers/01-开始部署.command` must classify a source/worktree `packRoot` as developer/debug mode.
2. Developer/debug mode must print an explicit mode line.
3. Developer/debug mode must not silently require bundled plugin archives from source root.
4. Generated package-root mode must still run packaged hardening and require bundled plugins.
5. Package-root mode must preserve free UI port selection and printed port.
6. `scripts/build-usb-pack.sh` must produce root official launcher and `mac/01-开始部署.command` handoff role.
7. Existing `mac/run-openclaw-usb.command` and `mac/harden-openclaw-usb.command` must remain compatibility/handoff entries.

Do not edit generated `dist/` files directly. Rebuild or inspect generated output after source changes.

## Phase 5 - Implement Bundled Readiness And Error Contract

Implement the smallest server/helper changes that expose readiness and reword missing archive errors.

Implementation requirements:

1. Add a reusable readiness helper for required bundled plugin specs.
2. Use the helper in `/api/status`.
3. Use the helper in the plugin install preflight path.
4. Keep archive paths relative or sanitized where possible.
5. Include active `packRoot` and checked `pluginsDir` in missing archive errors.
6. Reword missing archive errors to say current `packRoot` is not delivery package root or package is incomplete.
7. Remove wording that points users toward online plugin install as the packaged-mode resolution.
8. Preserve existing timeout and safe-bypass behavior outside the missing archive preflight.

## Phase 6 - Source Verification

Run targeted source checks:

```bash
bash -n platforms/mac/wrappers/*.command
node --check ui/server.mjs
node --check ui/install-helpers.mjs
node --test ui/tests/install-helpers.test.mjs
node --test ui/tests/packaged-mac-wrapper-hardening.test.mjs
node --test ui/tests/packaged-mac-entry-contract-hardening.test.mjs
node --test ui/tests/packaged-install-retry-guards.test.mjs
node --test ui/tests/packaged-runtime-status-authority.test.mjs
git diff --check
```

If a proposed new test file is not needed because existing test files cover every requirement, document that decision in the worker handoff and omit that command.

## Phase 7 - Fresh Package Verification

Build or select a fresh generated package. Do not verify against a stale process.

Required verification matrix:

1. Source wrapper:
   - execute or dry-run `platforms/mac/wrappers/01-开始部署.command`;
   - confirm output/status identify developer/debug mode;
   - confirm it does not claim official packaged install.
2. Package root wrapper:
   - launch `dist/usb-pack/opensparrow-0.1.0-alpha/01-开始部署.command`;
   - keep old `localhost:19000` source UI running for at least one smoke if feasible;
   - use printed UI port;
   - confirm `/api/status.instance.packRoot` equals package root;
   - confirm `/api/status.bundledPlugins.ready=true`.
3. Package `mac/01` wrapper:
   - launch `dist/usb-pack/opensparrow-0.1.0-alpha/mac/01-开始部署.command`;
   - confirm output identifies compatibility/handoff role;
   - confirm final status is served by package-root session and package-root `packRoot`.
4. Missing archive negative:
   - create an isolated copied package or fixture missing `plugins/openclaw-china-channels-*.tgz`;
   - launch with `OPENSPARROW_REQUIRE_BUNDLED_PLUGINS=1`;
   - confirm error names wrong `packRoot` or incomplete package and does not recommend online fallback.

## Phase 8 - Documentation And Longrun Closeout

Closer may run only after both gate conditions are true:

- Batch Review Gate: Worker-A/B/C outputs have been independently reviewed and the review verdict is `APPROVED`.
- Batch Verify Gate: after Batch Review approval, an independent verifier has run the required source and fresh packaged verification and the result is `PASS`.

When those gates pass, Closer may update only facts supported by the approved review and passing verification:

1. Update user-facing docs, platform guides, runbooks, and release checklist only where this entry contract changes support wording.
2. Update `docs/packaged-mac-diagnostics.md` with the bundled readiness and stale-port diagnosis path.
3. Update `longrun/workspaces/opensparrow-unified/feature_list.json`.
4. Add a facts-only entry to `longrun/workspaces/opensparrow-unified/claude-progress.txt`.
5. Store durable Mem0 memory with `user_id=opensparrow-memory`, `metadata.project=opensparrow`, and a short durable fact.

Do not write a passing closeout unless fresh package evidence covers all three launch paths in the acceptance matrix.
Closer must not modify implementation behavior, source code, tests, vendor files, generated `dist/**`, or Worker-owned implementation surfaces. If Closer finds an implementation problem, the packet must return to the Worker / Review / Verify flow instead of being repaired during closeout.

## Stop Conditions

Stop and report if:

- the source wrapper cannot distinguish source root from generated package root without a broader packaging marker decision;
- generated `mac/01-开始部署.command` cannot be made handoff-only without changing package layout policy;
- bundled plugin readiness requires vendor internals;
- missing archive diagnosis requires real credentials or secret-bearing logs;
- the only failing evidence comes from stale `localhost:19000` and cannot be reproduced with the printed UI port and fresh `packRoot`.

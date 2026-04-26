# Tasks: Packaged Dashboard Status Recovery + Static Assets

**Packet identity**: `packaged-dashboard-status-recovery-static-assets`  
**Packet type**: new UI/dashboard packet  
**Status**: `Ready for Worker-A`  
**Not**: `F-034` reopen

## Global Guards

- Do not change install/probe truth.
- Do not change router ids:
  - `opensparrow-router`
  - `opensparrow-router/auto`
- Do not modify:
  - `vendor/**`
  - `platforms/**`
  - wrappers
  - Windows files
  - packaging scripts
  - `specs/034-*`
  - longrun closeout files
- Keep status unavailable truthful on real failures; the fix is automatic recovery from transient failures, not hiding failures.
- Keep static serving path-traversal safe.

## Ownership Freeze

### Worker-A May Modify

- `ui/public/dashboard.html`
- `ui/server.mjs`
- `ui/public/replay-surfaces.test.mjs`
- `ui/tests/dashboard-status-shell.test.mjs`
- Optional new focused test file under `ui/tests/` only if needed for static route coverage

### Worker-A Read-Only Context

- `docs/current-status.md`
- `docs/packaged-mac-diagnostics.md`
- `docs/runtime-flow.md`
- `specs/031-dashboard-model-routing-ui/spec.md`
- `specs/032-packaged-runtime-authority-and-restart-truth/spec.md`
- `specs/034-packaged-single-channel-plugin-timeout-parity/spec.md`

## Task List

### T-001 - Freeze the dashboard stale-unavailable regression in a test

**Goal:** Prove a transient status failure can recover to later live backend truth.

**Files:**

- Modify: `ui/public/replay-surfaces.test.mjs`

**Steps:**

- [ ] Add a test where the first `/api/status` call fails and the later retry returns healthy status.
- [ ] Assert the first failure keeps truthful unavailable fields.
- [ ] Assert the later healthy status restores:
  - `statusLoadState='ready'`
  - `serviceStatus='running'`
  - backend `profile`
  - backend `configPath`
  - backend `gatewayPort`
- [ ] Run `node --test ui/public/replay-surfaces.test.mjs` and confirm the new test fails before implementation.

**Done when:** the regression is represented by a failing source test.

### T-002 - Add bounded dashboard status recovery

**Goal:** Make `ui/public/dashboard.html` retry automatically after a status failure.

**Files:**

- Modify: `ui/public/dashboard.html`

**Steps:**

- [ ] Add dashboard state for one recovery timer and one in-flight guard.
- [ ] Add helper logic to schedule a single delayed recovery retry after `markStatusUnavailable()`.
- [ ] Ensure failed recovery reschedules exactly one next retry.
- [ ] Ensure successful `loadStatus()` clears stale recovery timer state.
- [ ] Ensure manual status refresh paths do not create overlapping retry loops.
- [ ] Run `node --test ui/public/replay-surfaces.test.mjs` and confirm the dashboard recovery test passes.

**Done when:** a transient status failure no longer leaves the dashboard stuck in unavailable state after `/api/status` becomes healthy.

### T-003 - Freeze the logo/static asset route regression in a test

**Goal:** Prove `logo.png` is served by the UI server static route.

**Files:**

- Modify: `ui/tests/dashboard-status-shell.test.mjs`
- Optional create: `ui/tests/dashboard-static-assets.test.mjs`

**Steps:**

- [ ] Prefer a focused HTTP/static route test proving `GET /logo.png` returns 200 and `Content-Type` includes `image/png`.
- [ ] If a direct HTTP test is too invasive for current server shape, add shell assertions that:
  - `dashboard.html` references `logo.png`;
  - `sendFile()` maps `.png` to `image/png`;
  - the static extension route allows `.png`.
- [ ] Run the selected test and confirm it fails before implementation if possible.

**Done when:** the static asset route gap is represented by a source test.

### T-004 - Serve existing public image assets safely

**Goal:** Fix `/logo.png` without broad arbitrary file serving.

**Files:**

- Modify: `ui/server.mjs`

**Steps:**

- [ ] Extend the static route extension allowlist to include `.png`.
- [ ] Keep basename-based safe lookup into `PUBLIC_DIR`.
- [ ] Do not remove existing `.css`, `.js`, or `.mjs` behavior.
- [ ] Do not open serving for arbitrary extensionless or private files.
- [ ] Run the static asset test from T-003 and confirm it passes.

**Done when:** `GET /logo.png` is allowed through the static route and served as `image/png`.

### T-005 - Run focused source verification

**Goal:** Verify the packet without claiming packaged PASS.

**Required commands:**

- [ ] `node --check ui/server.mjs`
- [ ] `node --test ui/public/replay-surfaces.test.mjs`
- [ ] `node --test ui/tests/dashboard-status-shell.test.mjs`
- [ ] `node --test <new-test-file>` if T-003 creates one

**Done when:** all fresh source commands pass.

### T-006 - Worker-A handoff

**Goal:** Report source result and remaining packaged verification need clearly.

**Required handoff content:**

- [ ] State this was `packaged-dashboard-status-recovery-static-assets`.
- [ ] State it was a new UI/dashboard packet, not `F-034` reopen.
- [ ] Summarize status recovery behavior.
- [ ] Summarize static asset route behavior.
- [ ] Include exact commands run and pass/fail status.
- [ ] Say `source PASS` only if T-005 passed.
- [ ] Say packaged PASS is not claimed unless a fresh packaged verifier was actually run.

**Done when:** Worker-A can hand off to verifier or Commander without ambiguity.

## Acceptance Summary

- Dashboard can truthfully show unavailable after a failed `/api/status` call.
- Dashboard automatically recovers to live healthy `/api/status` truth without refresh/restart/manual daemon action.
- Recovered dashboard shows running status, profile, config path, and gateway port from backend truth.
- `/logo.png` is served from `ui/public/logo.png` as `image/png`.
- Static route remains narrowly allowlisted and basename-safe.
- No `F-034`, install/probe, wrapper, vendor, Windows, or router-id changes.

## Ready / Not Ready

**Ready for Worker-A.**

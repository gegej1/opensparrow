# Packaged Dashboard Status Recovery + Static Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. This is a new UI/dashboard packet, not `F-034` reopen.

**Goal:** Make the packaged dashboard recover automatically from transient `/api/status` failures and serve the existing dashboard logo asset.  
**Architecture:** Keep `/api/status` as the authoritative truth source. Add a small, bounded recovery loop inside the dashboard Alpine state after unavailable status, and widen the existing server static route allowlist for public image assets while preserving basename-based safety.  
**Tech Stack:** Node ESM server (`ui/server.mjs`), static dashboard HTML/Alpine state (`ui/public/dashboard.html`), `node:test` source tests.

---

## 0. Packet Positioning

- Packet identity: `packaged-dashboard-status-recovery-static-assets`.
- This is a new UI/dashboard packet.
- This is not `F-034` reopen.
- This does not alter install/probe/runtime truth.
- This does not change `opensparrow-router` or `opensparrow-router/auto`.

## 1. File Structure / Ownership

### Worker-A May Modify

- `ui/public/dashboard.html`
  - Add status recovery timer state and helper methods.
  - Ensure `loadStatus()` clears unavailable state and updates UI from backend truth on recovery.
- `ui/server.mjs`
  - Extend the static asset route allowlist so existing public image assets can be served.
- `ui/public/replay-surfaces.test.mjs`
  - Add or update dashboard behavior tests for transient status failure followed by recovery.
- `ui/tests/dashboard-status-shell.test.mjs`
  - Add or update source-shell assertions for logo/static asset routing if this is enough to cover the server source contract.
- A new focused Node test may be created only if it gives stronger static route coverage than source regex checks.

### Worker-A Should Read First

- `ui/public/dashboard.html`
  - `init()`
  - `markStatusUnavailable()`
  - `loadStatus()`
  - daemon/cleanup action refresh call sites
- `ui/server.mjs`
  - `sendFile()`
  - static route block around `/`, `/dashboard`, `/setup`, and extension allowlist
- `ui/public/replay-surfaces.test.mjs`
  - existing dashboard `loadStatus()` tests around healthy status and failure
- `ui/tests/dashboard-status-shell.test.mjs`
  - existing shell assertions for status UI and server status fields

### Worker-A Must Not Modify

- `vendor/**`
- `platforms/**`
- wrappers
- Windows files
- packaging scripts
- backend install/probe truth unrelated to static asset serving
- `longrun/**` closeout files
- `specs/034-*`

## 2. Implementation Approach

### Status Recovery

Implement the smallest dashboard-side recovery mechanism:

1. Add state fields for a recovery timer and in-flight retry guard, for example:
   - `statusRecoveryTimer`
   - `statusRecoveryInFlight`
   - a fixed retry interval such as `3000` to `5000` ms
2. When `loadStatus()` fails or receives a non-OK response, call `markStatusUnavailable()` and then schedule one recovery timer if none is already active.
3. The recovery timer should call `loadStatus({ recovery: true })`.
4. If recovery succeeds, clear the timer state and leave the dashboard in `statusLoadState='ready'`.
5. If recovery fails again, reschedule a single next retry.
6. Avoid duplicate request storms:
   - do not start another recovery request while one is already in flight;
   - do not create multiple timers on repeated failures;
   - successful manual calls to `loadStatus()` should clear stale recovery timers.

Keep existing truthful semantics:

- A failed status call still shows unavailable.
- Do not silently show stopped defaults.
- Do not redirect to setup when a later healthy status says `installed=true`.

### Static Assets

Extend the request router allowlist near:

```js
if (method === 'GET' && (pathname.endsWith('.css') || pathname.endsWith('.js') || pathname.endsWith('.mjs'))) {
```

Use a narrow allowlist that includes existing public image assets, for example `.png`, and optionally `.svg` / `.ico` only if those assets are expected. Keep the existing safe basename lookup:

```js
const safeName = path.basename(pathname)
sendFile(res, path.join(PUBLIC_DIR, safeName))
```

`sendFile()` already maps `.png` to `image/png`, so the likely implementation is route allowlist expansion rather than MIME work.

## 3. Source Test Plan

### Dashboard Recovery Tests

Add a replay-surface test that models:

1. First `loadStatus()` call throws or returns non-OK.
2. Dashboard enters unavailable state:
   - `statusLoadState='error'`
   - `serviceStatus='unknown'`
   - fields are cleared
3. Recovery retry receives:
   - `installed: true`
   - `daemon: 'running'`
   - `gatewayHealthy: true`
   - `profile`
   - `configPath`
   - `gatewayPort`
4. Dashboard updates to authoritative running truth:
   - `statusLoadState='ready'`
   - `serviceStatus='running'`
   - profile/config/port match backend truth

If the current replay helper does not support real timers, test helper methods directly by stubbing `setTimeout` / `clearTimeout` in the page context or by factoring the retry scheduling into a small method on the dashboard object.

### Static Asset Route Tests

Preferred coverage:

- A Node test starts or exercises the server static handler and proves `GET /logo.png` returns 200 with `image/png`.

Fallback source-shell coverage if starting the server is too invasive:

- Assert `sendFile()` contains `.png: 'image/png'`.
- Assert the static extension route includes `.png`.
- Assert dashboard references `logo.png`.

## 4. Required Verification

Worker-A must run fresh commands after implementation:

- `node --check ui/server.mjs`
- `node --test ui/public/replay-surfaces.test.mjs`
- `node --test ui/tests/dashboard-status-shell.test.mjs`

If Worker-A adds a new focused test file, also run:

- `node --test <new-test-file>`

If shell or wrapper files remain untouched, no shell syntax gate is required for this packet.

## 5. Handoff Rules

Worker-A may report `source PASS` only after the required fresh commands pass.

Worker-A must not report packaged PASS. A separate verifier must confirm packaged behavior by checking:

- live `/api/status` is healthy;
- dashboard recovers after a transient status failure;
- `GET /logo.png` returns 200 in the packaged server;
- no F-034 install/probe behavior changed.

## Ready / Not Ready

**Ready for Worker-A.**

The packet is narrow, the write-set is clear, the current root cause is isolated to dashboard retry behavior plus static route allowlisting, and acceptance can be validated with source tests before fresh packaged verification.

# Feature Specification: Packaged Dashboard Status Recovery + Static Assets

**Packet identity**: `packaged-dashboard-status-recovery-static-assets`  
**Packet type**: new UI/dashboard packet  
**Feature branch / worktree**: `feature/p0-packaged-mac-diagnostics` at `/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-p0-packaged-mac-diagnostics`  
**Created**: `2026-04-24`  
**Status**: `Ready for Worker-A`  
**Not**: `F-034` reopen

## One-Line Definition

Fix the packaged dashboard so transient `/api/status` failures do not leave the page stuck in stale unavailable UI, and so packaged static image assets such as `/logo.png` are served by the local UI server.

## Fresh Evidence

Backend/package-local/live API is healthy:

- `GET /api/status` returns `installed=true`, `daemon=running`, `gatewayHealthy=true`.
- `GET /api/install/status` returns completed.
- `install-state.json` is completed.
- `install.log` shows plugins, config, channels, runtime, and probe all completed.

Dashboard is stale unavailable:

- After refresh/restart, the user still sees:
  - `状态不可用`
  - `PROFILE 不可用`
  - `配置路径不可用`
  - `端口不可用`
- At the same time, live `/api/status` is healthy.
- Code read:
  - `ui/public/dashboard.html` calls `loadStatus()` from `init()` and a few button actions only.
  - `markStatusUnavailable()` sets `statusLoadState='error'` and clears service/profile/config/port fields.
  - There is no automatic recovery polling after `markStatusUnavailable()`.
- Conclusion: one transient `/api/status` failure can freeze the dashboard in stale unavailable state until a narrow manual action calls `loadStatus()` again.

Logo is broken:

- `ui/public/dashboard.html` references `<img src="logo.png" ...>`.
- `ui/public/logo.png` exists.
- `ui/server.mjs` `sendFile()` already knows `.png` as `image/png`, but the static request router only allows `.css`, `.js`, and `.mjs`.
- `GET /logo.png` returns `404`.
- Conclusion: the broken logo is a server static-route allowlist gap, not a missing asset.

## Scope

### In Scope

- `ui/public/dashboard.html`
  - Add bounded automatic status recovery after status fetch failures.
  - Keep the existing truthful unavailable state for the first failure; do not hide real outages.
  - Recover to authoritative running/profile/config/port truth when `/api/status` becomes healthy again.
- `ui/server.mjs`
  - Serve existing packaged static image assets from `ui/public/` through the safe basename static route.
  - At minimum, `GET /logo.png` must return HTTP 200 with `Content-Type: image/png`.
- UI/source tests that exercise dashboard status recovery and static asset routing.

### Out of Scope

- Backend install/probe truth changes.
- `F-034` single-channel plugin timeout parity.
- Model routing, router ids, provider ids, or `opensparrow-router` / `opensparrow-router/auto`.
- Wrappers, packaging scripts, vendor binaries, Windows files, and longrun closeout.
- Rewriting dashboard layout or branding beyond restoring the existing logo asset.

## Required Behavior

### Status Recovery

1. On first `/api/status` failure, the dashboard may show truthful unavailable text exactly as it does today.
2. After entering unavailable state, the dashboard must schedule automatic retry without requiring refresh, restart, or button actions.
3. When a later `/api/status` response is healthy, the dashboard must:
   - set `statusLoadState='ready'`;
   - set service status to running when `daemon='running'`, `runtimeMode='gateway-fallback'`, or `gatewayHealthy=true`;
   - restore `profile`, `configPath`, `gatewayPort`, and version from backend truth;
   - stop or back off recovery polling so the dashboard does not hammer the local server.
4. Recovery polling must be bounded and idempotent:
   - no duplicate overlapping status requests;
   - no timer leak across repeated failures or repeated successful recoveries;
   - no redirect loop to setup when the backend says `installed=true`.

### Static Assets

1. Existing dashboard asset references must work in packaged mode.
2. `GET /logo.png` must serve `ui/public/logo.png`.
3. Static routing must remain path-traversal safe by continuing to resolve through `path.basename(pathname)` or an equivalent safe allowlist.
4. The route extension allowlist should include only expected public asset extensions, not arbitrary files.

## Acceptance Summary

Worker-A acceptance is source-level only unless a separate verifier packet performs fresh packaged replay.

- `GET /logo.png` returns `HTTP 200` and `Content-Type: image/png`.
- Dashboard first status failure still enters truthful unavailable state.
- Dashboard then auto-recovers when a later `/api/status` call returns `installed=true`, `daemon=running`, `gatewayHealthy=true`.
- Recovered UI shows running state plus backend profile, config path, and gateway port.
- No regression to fake stopped/default values when `/api/status` is unavailable.
- Existing dashboard status behavior remains compatible with gateway fallback mode.
- No changes are made to backend install/probe truth, F-034, wrappers, vendor, or Windows surfaces.

## Ready / Not Ready

**Ready for Worker-A.**

Worker-A has enough frozen evidence, scope, and acceptance criteria to implement this as a narrow UI/dashboard packet.

**Not ready if** any new evidence changes the authoritative source away from live `/api/status`, if Commander reopens `F-034`, or if the requested scope expands into wrappers, packaging, vendor, Windows, or model routing.

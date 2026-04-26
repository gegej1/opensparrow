# Feature Specification: Packaged Channels Late-Stage Authority Closure

**Packet identity**: `packaged-channels-late-stage-authority-closure`  
**Created**: `2026-04-24`  
**Status**: `completed`  
**Authority worktree**: `/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-p0-packaged-mac-diagnostics`  

## Positioning

This is a new packaged install authority packet.

It is not:

- `F-034` reopen
- `dashboard-dingtalk-diagnostics-timeout-readback` reopen
- frontend display work
- wrappers / vendor / Windows / packaging strategy work
- docs closeout or longrun writeback

This packet inherits one explicit `F-034` residual risk: the `dingtalk-only` fresh PASS observed a staged-shell to final-authority lag signature, but did not directly exercise the packaged timeout plus grace-wait path. Fresh E2E on `2026-04-24` now exercised that path and failed before authority closure.

## Frozen Fresh E2E Evidence

### User-visible failure

The E2E screenshot shows install failure:

- `plugin install failed before requested channel dingtalk was ready`
- `plugin install blocked at channels: timed out after 120000ms, and safe bypass authority was not established`

The UI is treated as a truthful reporter of backend install authority failure. Browser/UI evidence is secondary; backend install authority is primary.

### Runtime artifact

Current running package:

- `/private/tmp/dashboard-dingtalk-diagnostics-rebuild-oPvzTr/gtclaw-mac-release-arm64-20260424-213049/GTClaw-0.1.0-alpha-macOS-arm64`

Running process uses bundled node from that artifact:

- `/private/tmp/dashboard-dingtalk-diagnostics-rebuild-oPvzTr/gtclaw-mac-release-arm64-20260424-213049/GTClaw-0.1.0-alpha-macOS-arm64/vendor/mac-openclaw/bin/node`

### install-state.json evidence

Path:

- `/private/tmp/dashboard-dingtalk-diagnostics-rebuild-oPvzTr/gtclaw-mac-release-arm64-20260424-213049/GTClaw-0.1.0-alpha-macOS-arm64/.gtclaw-state/.openclaw-gtclaw-portable/install-state.json`

Frozen truth:

- `status=error`
- `installState=failed`
- `currentStep=plugins`
- `blockingStep=plugins`
- `blockingPlugin=channels`
- `requestedChannelReadiness={dingtalk:false,wecom:false}`
- `channelProbes={dingtalk:null,wecom:null}`
- `bypass={verdict:failed,used:false,plugin:channels,reason:"plugin install timed out after 120000ms without structurally ready packaged footprint"}`

### install.log evidence

Path:

- `/private/tmp/dashboard-dingtalk-diagnostics-rebuild-oPvzTr/gtclaw-mac-release-arm64-20260424-213049/GTClaw-0.1.0-alpha-macOS-arm64/.gtclaw-state/.openclaw-gtclaw-portable/install.log`

Key facts:

- `2026-04-24T14:38:08.184Z requested plugin channels started`
- `2026-04-24T14:42:38.611Z channels install failed at plugins`
- error: `safe bypass authority was not established`

### Staged footprint evidence

Staged directory:

- `/private/tmp/dashboard-dingtalk-diagnostics-rebuild-oPvzTr/gtclaw-mac-release-arm64-20260424-213049/GTClaw-0.1.0-alpha-macOS-arm64/.gtclaw-state/.openclaw/extensions/.openclaw-install-stage-cqdNfk`

Observed staged footprint:

- `package.json` mtime: `2026-04-24T22:38:12Z`
- `openclaw.plugin.json` mtime: `2026-04-24T22:38:12Z`
- `dist/index.js` mtime: `2026-04-24T22:38:12Z`
- `node_modules/@openclaw-china/dingtalk/dist/index.js` mtime: `2026-04-24T22:48:27Z`
- final shared `extensions/channels`: missing
- final profile `extensions/channels`: missing

### Interpretation

The packaged install timeout killed or returned before authority closure.

The staged plugin shell existed at timeout, but the complete dependency footprint arrived late. The current runtime only checked authority at or near timeout and did not close the late staged footprint into final shared/profile authority. As a result, backend install authority remained failed even though the requested channel dependency became structurally ready later.

## Authority / Truth Source

Authority order for this packet:

1. User-frozen fresh E2E evidence in this packet.
2. `AGENTS.md` and `.specify/memory/constitution.md`.
3. This packet's `spec.md`, `plan.md`, and `tasks.md`.
4. `F-034` closeout residual risk and acceptance matrix.
5. Runtime install contract in `ui/server.mjs`.
6. Backend/runtime source harnesses under `ui/tests/`.

If historical PASS conflicts with this fresh evidence, this fresh evidence wins for this packet. If `F-034` completed state conflicts with this packet, preserve `F-034` as completed and treat this as new late-stage authority work.

## Scope

### In Scope

- Packaged `channels` plugin authority closure after timeout when a matching staged footprint becomes structurally ready shortly after timeout.
- Runtime behavior around:
  - `inspectPluginInstallAuthority()`
  - `closeInstalledPluginAuthority()`
  - `waitForInstalledPluginAuthority()`
  - staged footprint promotion
  - shared/profile authority closure
  - `installPluginPackage()` timeout handling
- Source harness that faithfully replays:
  - staged shell exists at timeout
  - critical DingTalk dependency arrives late
  - final shared/profile `extensions/channels` are missing
- Packaged verifier requirement that intentionally exercises or strongly proves the late-stage path.
- Preservation of `F-034` acceptance:
  - `dingtalk-only` default target truthful success
  - `wecom-only` default target truthful success
  - `dingtalk+wecom` exact frozen `F-033` probe truth
  - six surfaces consistent
  - router invariants stay `providerId=opensparrow-router` and `modelTarget=opensparrow-router/auto`

### Out of Scope

- Code changes in this SpecWriter packet.
- Docs closeout or longrun writeback.
- `ui/public/*` display changes.
- Windows.
- wrappers.
- `vendor/**`.
- packaging strategy.
- secrets, credentials, local auth, or token material.
- root worktree noisy state cleanup.
- Rewriting `F-034`, `F-033`, `dashboard-dingtalk-diagnostics-timeout-readback`, or dashboard UI packet identities.

## Functional Requirements

- **FR-001**: `dingtalk-only` packaged E2E MUST NOT hard-fail at `plugins/channels` when a matching staged `channels` footprint becomes structurally ready shortly after timeout.
- **FR-002**: Runtime MUST close/promote late staged `channels` authority into final shared/profile authority and continue to `completed` or `probe` as appropriate when the late footprint becomes structurally ready within a bounded window.
- **FR-003**: Runtime MUST produce precise durable non-success when late authority never becomes structurally ready within the bounded window.
- **FR-004**: Runtime MUST NOT fake success when no structurally ready footprint exists.
- **FR-005**: Runtime MUST NOT turn `step=plugins` into indefinite running.
- **FR-006**: Runtime MUST preserve `F-034` single-channel success targets for normal packaged paths.
- **FR-007**: Runtime MUST preserve the combined `dingtalk+wecom` exact frozen `F-033` probe contract.
- **FR-008**: `/api/install`, `/api/install/status`, `install-state.json`, `/api/diagnostics`, `/api/diagnostics/export`, and `diagnostic-bundle.json` MUST agree on the final authority truth.
- **FR-009**: Router invariants MUST remain `providerId=opensparrow-router` and `modelTarget=opensparrow-router/auto`.
- **FR-010**: The source harness MUST prove the late-stage shape, not only a normal fast install:
  - staged shell exists at timeout
  - `package.json`, `openclaw.plugin.json`, and `dist/index.js` exist first
  - `node_modules/@openclaw-china/dingtalk/dist/index.js` arrives late
  - final shared/profile `extensions/channels` are initially missing
  - bounded catch-up either promotes authority or fails durably
- **FR-011**: Packaged verifier MUST intentionally exercise or strongly prove the late-stage path. A normal fast install replay alone is insufficient.

## Write-Set Proposal

Worker-A proposed write-set:

- `ui/server.mjs`
- `ui/tests/packaged-single-channel-plugin-timeout-parity.test.mjs`
- `ui/tests/packaged-plugin-install-hang-bypass.test.mjs`
- `ui/tests/packaged-install-retry-guards.test.mjs`
- Optional focused runtime test if Worker-A can keep it backend/runtime-only and within this packet's ownership.

Worker-A may read but should not modify:

- `specs/034-packaged-single-channel-plugin-timeout-parity/spec.md`
- `specs/034-packaged-single-channel-plugin-timeout-parity/plan.md`
- `specs/034-packaged-single-channel-plugin-timeout-parity/tasks.md`
- `docs/current-status.md`
- `docs/packaged-mac-diagnostics.md`
- `docs/runtime-flow.md`

Any need to touch `ui/public/*`, wrappers, vendor, Windows, packaging strategy, docs closeout, or longrun is a stop and return-to-Commander event.

## Acceptance Matrix

| Lane | Required result |
| --- | --- |
| `dingtalk-only` late staged `channels` footprint | MUST close/promote late staged authority and continue to truthful success/probe when the footprint becomes structurally ready within the bounded window. |
| `dingtalk-only` no structurally ready footprint | MUST end in precise non-success with durable evidence; MUST NOT fake success. |
| `dingtalk-only` normal fast install | MUST preserve `F-034` truthful success. |
| `wecom-only` normal packaged path | MUST preserve `F-034` truthful success. |
| `dingtalk+wecom` combined | MUST preserve exact frozen `F-033` probe truth and six-surface consistency. |
| `plugins` stage | MUST remain bounded; no indefinite running. |
| router identity | MUST preserve `opensparrow-router` and `opensparrow-router/auto`. |

## Test Plan

Source-level required commands for Worker-A:

- `node --check ui/server.mjs`
- `node --test ui/tests/packaged-plugin-install-hang-bypass.test.mjs`
- `node --test ui/tests/packaged-install-retry-guards.test.mjs`
- `node --test ui/tests/packaged-single-channel-plugin-timeout-parity.test.mjs`
- Any focused runtime test added by Worker-A

Recommended regression commands if touched behavior overlaps:

- `node --test ui/tests/packaged-channel-probe-diagnostics.test.mjs`
- `node --test ui/tests/packaged-plugin-profile-sync.test.mjs`
- `node --test ui/tests/packaged-dingtalk-install-gate.test.mjs`
- `node --test ui/tests/packaged-wecom-install-gate.test.mjs`

Packaged verifier must capture:

- artifact path and bundled node path
- install-state path and terminal fields
- install.log plugin start/fail/close lines
- staged footprint path and mtimes
- final shared/profile `extensions/channels` presence or absence
- six-surface consistency
- router invariants

## Worker-A Ownership

Worker-A owns only backend/runtime late-stage authority closure for this packet.

Worker-A must not:

- reinterpret this as `F-034` reopen
- declare packaged PASS from source tests
- touch frontend display
- touch vendor / Windows / wrappers / packaging strategy
- write docs closeout or longrun completion
- include secrets or local auth material in evidence

Worker-A may report only:

- `source PASS / ready for packaged verifier`
- `source blocked / return to Commander`
- `scope escape required / return to Commander`

## Verifier Handoff

Verifier must independently prove one of these:

1. **PASS path**: late staged `channels` authority becomes structurally ready within the bounded window, runtime promotes/closes it into final shared/profile authority, install proceeds to truthful completion/probe, six surfaces agree, and router invariants hold.
2. **Truthful non-success path**: late authority never becomes structurally ready within the bounded window, runtime ends with precise durable non-success, no fake success, no indefinite running, six surfaces agree, and router invariants hold.

Verifier must not accept a fast-path-only packaged replay as sufficient for this packet.

## Closeout Gate

Closeout is allowed only after:

- Worker-A source PASS is complete.
- Packaged verifier intentionally exercises or strongly proves the late-stage path.
- The verifier records fresh artifact, bundled node, install-state, install.log, staged footprint, final authority dirs, six surfaces, and router invariants.
- No forbidden write-set was touched.
- `F-034` and `F-033` identities remain intact.

Closeout is not allowed from:

- stale historical PASS
- source harness only
- normal fast install only
- UI screenshot alone
- noisy root worktree state

## Closeout Evidence: 2026-04-25

This closeout records only verified facts for packet `packaged-channels-late-stage-authority-closure`.

This remains a new packaged install authority packet. It is not an `F-034` reopen, not a dashboard/UI patch, and not a rewrite of `F-033` or `F-034` history.

### Source PASS

- `node --check ui/server.mjs` PASS
- `node --test ui/tests/packaged-single-channel-plugin-timeout-parity.test.mjs` PASS, `3/3`
- `node --test ui/tests/packaged-plugin-install-hang-bypass.test.mjs` PASS, `10/10`
- `node --test ui/tests/packaged-plugin-profile-sync.test.mjs` PASS, `5/5`
- `git diff --check` packet write-set PASS

### Source Implementation Truth

- Added bounded late-stage authority grace via `OPENSPARROW_PLUGIN_LATE_STAGE_AUTHORITY_GRACE_MS`.
- Packaged default late-stage grace = `600000ms`.
- Staged shell matching is required before late-stage wait activates.
- Structural readiness requires:
  - `openclaw.plugin.json`
  - `package.json`
  - `dist/index.js`
  - package/id match
  - for channels, `node_modules/@openclaw-china/dingtalk/dist/index.js`
- Promotion closes final shared/profile authority only after structural readiness.
- Negative no-authority lane remains precise failed truth, not fake success.

### Fresh Packaged PASS

- build exit code：`0`
- build root：`/private/tmp/packaged-channels-late-stage-rebuild-77vgKb`
- artifact dir：`/private/tmp/packaged-channels-late-stage-rebuild-77vgKb/gtclaw-mac-release-arm64-20260424-235728/GTClaw-0.1.0-alpha-macOS-arm64`
- artifact zip：`/private/tmp/packaged-channels-late-stage-rebuild-77vgKb/gtclaw-mac-release-arm64-20260424-235728.zip`
- zip SHA256：`d30c2b29023ac118c688eed3e7e109227fef84c229e6e2c6561fce11086a10d9`
- artifact `ui/server.mjs` `node --check` PASS
- artifact inspection PASS

### Replay Method

- replay root：`/private/tmp/packaged-channels-late-stage-replay-UrwTeG`
- Fresh artifact started with bundled node.
- Each lane used isolated `HOME`, `OPENCLAW_HOME`, profile, UI/gateway/router ports.
- Controlled runtime fixture was used only to force deterministic plugin timing.
- DingTalk late-stage lane used:
  - plugin timeout `250ms`
  - normal authority grace `300ms`
  - late-stage grace `1500ms`
  - DingTalk dependency delay `800ms`
- This was explicitly not a fast install replay.

### Lane Results

`dingtalk-only` late-stage path:

- `HTTP 200`
- `status=completed`
- `installState=completed`
- `blockingStep=null`
- `blockingPlugin=null`
- `requestedChannelReadiness.dingtalk=true`
- `channelProbes.dingtalk={status:ok,ready:true}`

`wecom-only` preservation:

- `HTTP 200`
- `status=completed`
- `installState=completed`
- no plugin indefinite running
- six surfaces consistent

`dingtalk+wecom` combined `F-033` preservation:

- `HTTP 500`
- `status=error`
- `installState=failed`
- `blockingStep=probe`
- `blockingPlugin=wecom-openclaw-plugin`
- `requestedChannelReadiness={dingtalk:false,wecom:false}`
- `channelProbes.dingtalk={status:warning,ready:false}`
- `channelProbes.wecom={status:error,ready:false}`

### Late-Stage Authority Evidence

- DingTalk install start：`2026-04-25T08:09:19.545Z`
- staged shell created：`2026-04-25T08:09:19.546Z`
- timeout boundary：`2026-04-25T08:09:19.795Z`
- late DingTalk dependency created：`2026-04-25T08:09:20.373Z`
- Final shared/profile `extensions/channels` both exist with all required files.
- `install.log` includes safe bypass reason: timed out after `250ms`, footprint structurally ready, plus late-stage catch-up closed after timeout wait.

### Cross-Surface Truth

- All three lanes are consistent across `/api/install`, `/api/install/status`, `install-state.json`, `/api/diagnostics`, `/api/diagnostics/export`, and `diagnostic-bundle.json`.
- Router invariants held in all lanes:
  - `providerId=opensparrow-router`
  - `modelTarget=opensparrow-router/auto`

### Risks

- Packaged replay used controlled runtime fixture to force timeout and late dependency timing; this was intentional for this packet.
- `init.sh` still stops on missing legacy frozen dir `opensparrow_win` in isolated worktree; non-blocking for this packet.

## Ready For Worker-A / Not Ready Criteria

### Ready for Worker-A

- This spec, plan, and tasks exist under `specs/packaged-channels-late-stage-authority-closure/`.
- Worker-A accepts the backend/runtime-only write-set.
- Worker-A accepts the late-stage harness requirement.
- Worker-A accepts that packaged PASS belongs to a separate verifier.
- Worker-A accepts all stop conditions.

### Not Ready

- The task is reframed as `F-034` reopen or dashboard/UI work.
- The proposed fix requires `ui/public/*`, vendor, Windows, wrappers, or packaging strategy.
- The proposed verifier will only run a normal fast install.
- The proposed implementation would fake success without structurally ready authority.
- The proposed implementation can leave `step=plugins` running indefinitely.

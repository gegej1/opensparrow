# Tasks: Packaged Channels Late-Stage Authority Closure

**Packet identity**: `packaged-channels-late-stage-authority-closure`  
**Owner**: Worker-A for backend/runtime source work only  
**Verifier**: separate packaged verifier  

## Global Guards

- [ ] Treat this as a new packaged install authority packet, not `F-034` reopen.
- [ ] Keep browser/UI evidence secondary to backend install authority.
- [ ] Do not modify `ui/public/*`, vendor, Windows, wrappers, packaging strategy, docs closeout, or longrun.
- [ ] Do not include secrets, tokens, local auth, or credential values in evidence.
- [ ] Do not count noisy root or unrelated worktree state as this packet's change set.
- [ ] Preserve `F-034` single-channel acceptance and exact frozen `F-033` combined truth.
- [ ] Preserve router invariants: `providerId=opensparrow-router`, `modelTarget=opensparrow-router/auto`.

## Worker-A Ownership

### Allowed write-set

- [ ] `ui/server.mjs`
- [ ] `ui/tests/packaged-single-channel-plugin-timeout-parity.test.mjs`
- [ ] `ui/tests/packaged-plugin-install-hang-bypass.test.mjs`
- [ ] `ui/tests/packaged-install-retry-guards.test.mjs`
- [ ] Optional focused backend/runtime test if useful and still scoped to this packet.

### Stop and return to Commander

- [ ] Any need to edit `ui/public/*`.
- [ ] Any need to edit `vendor/**`, wrappers, Windows, or packaging strategy.
- [ ] Any need to write docs closeout or longrun completion.
- [ ] Any fix that would fake success without structurally ready footprint.
- [ ] Any behavior that can leave `step=plugins` running indefinitely.

## T0 - Confirm Context

- [ ] Re-read this packet's `spec.md`, `plan.md`, and `tasks.md`.
- [ ] Re-read `specs/034-packaged-single-channel-plugin-timeout-parity/{spec,plan,tasks}.md`.
- [ ] Inspect `ui/server.mjs` around:
  - `inspectPluginInstallAuthority()`
  - `closeInstalledPluginAuthority()`
  - `waitForInstalledPluginAuthority()`
  - `installPluginPackage()`
  - staged footprint promotion helpers
- [ ] Inspect the existing source harnesses in:
  - `ui/tests/packaged-single-channel-plugin-timeout-parity.test.mjs`
  - `ui/tests/packaged-plugin-install-hang-bypass.test.mjs`
  - `ui/tests/packaged-install-retry-guards.test.mjs`

## T1 - Freeze Replay-Faithful Source Harness

- [ ] Add or tighten a source test where staged `channels` shell exists at timeout.
- [ ] Ensure the staged shell initially has:
  - `package.json`
  - `openclaw.plugin.json`
  - `dist/index.js`
- [ ] Ensure `node_modules/@openclaw-china/dingtalk/dist/index.js` arrives after the timeout boundary.
- [ ] Ensure final shared/profile `extensions/channels` are missing at timeout.
- [ ] Assert pre-fix failure shape or current guarded behavior:
  - `status=error`
  - `installState=failed`
  - `blockingStep=plugins`
  - `blockingPlugin=channels`
  - `requestedChannelReadiness.dingtalk=false`
  - `channelProbes.dingtalk=null`
  - `bypass.verdict=failed`

## T2 - Implement Bounded Late Authority Closure

- [ ] In `ui/server.mjs`, make matching staged-shell detection drive a bounded catch-up window.
- [ ] Poll for structural readiness only within the bounded window.
- [ ] Promote the staged footprint only after structural readiness is true.
- [ ] Close final shared/profile authority after promotion.
- [ ] Continue to requested-channel readiness/probe only after final authority is established.
- [ ] Record warnings/evidence when authority closes after timeout.
- [ ] Return precise non-success when authority never becomes structurally ready.

## T3 - Protect Negative Paths

- [ ] Test that staged shell alone does not establish safe bypass.
- [ ] Test that missing late dependency produces durable non-success.
- [ ] Test that failed promotion produces durable non-success.
- [ ] Test that requested-not-ready never returns success.
- [ ] Test that timeout-like wording cannot become pseudo-success.
- [ ] Test that `step=plugins` always reaches a terminal bounded state.

## T4 - Preserve F-034 / F-033 Acceptance

- [ ] Assert `dingtalk-only` default target remains truthful success when authority becomes structurally ready.
- [ ] Assert `wecom-only` default target remains truthful success.
- [ ] Assert combined `dingtalk+wecom` exact frozen `F-033` truth:
  - `status=error`
  - `installState=failed`
  - `blockingStep=probe`
  - `blockingPlugin=wecom-openclaw-plugin`
  - `requestedChannelReadiness={dingtalk:false,wecom:false}`
  - `channelProbes.dingtalk.status=warning`
  - `channelProbes.dingtalk.ready=false`
  - `channelProbes.wecom.status=error`
  - `channelProbes.wecom.ready=false`
- [ ] Assert six-surface consistency:
  - `/api/install`
  - `/api/install/status`
  - `install-state.json`
  - `/api/diagnostics`
  - `/api/diagnostics/export`
  - `diagnostic-bundle.json`
- [ ] Assert router invariants remain unchanged.

## T5 - Source Verification

- [ ] Run `node --check ui/server.mjs`.
- [ ] Run `node --test ui/tests/packaged-plugin-install-hang-bypass.test.mjs`.
- [ ] Run `node --test ui/tests/packaged-install-retry-guards.test.mjs`.
- [ ] Run `node --test ui/tests/packaged-single-channel-plugin-timeout-parity.test.mjs`.
- [ ] Run any optional focused runtime test added for this packet.
- [ ] If overlap risk exists, run:
  - `node --test ui/tests/packaged-channel-probe-diagnostics.test.mjs`
  - `node --test ui/tests/packaged-plugin-profile-sync.test.mjs`
  - `node --test ui/tests/packaged-dingtalk-install-gate.test.mjs`
  - `node --test ui/tests/packaged-wecom-install-gate.test.mjs`

## T6 - Worker-A Handoff

- [ ] Report changed files.
- [ ] Report source commands and outcomes.
- [ ] Report the exact late-stage behavior proven by source harness.
- [ ] Report whether final shared/profile authority is closed only after structural readiness.
- [ ] Report any precise non-success evidence.
- [ ] Do not claim packaged PASS.
- [ ] Mark handoff as `source PASS / ready for packaged verifier`, `source blocked`, or `scope escape required`.

## Verifier Handoff

Verifier must use fresh packaged evidence and must not accept a fast-path-only replay.

- [ ] Capture artifact path.
- [ ] Capture bundled node path.
- [ ] Capture install-state path and terminal fields.
- [ ] Capture install.log plugin start/fail/authority-closure lines.
- [ ] Capture staged footprint path and mtimes.
- [ ] Confirm whether final shared/profile `extensions/channels` exists after closure.
- [ ] Confirm late-stage path was intentionally exercised or strongly proved.
- [ ] Confirm six surfaces agree.
- [ ] Confirm router invariants.
- [ ] Confirm combined `dingtalk+wecom` exact frozen `F-033` truth.

## Closeout Gate

- [ ] Worker-A source PASS exists.
- [ ] Packaged verifier late-stage proof exists.
- [ ] No forbidden write-set was touched.
- [ ] No secrets were recorded.
- [ ] `F-034` identity remains completed and not reopened.
- [ ] `F-033` exact frozen combined truth remains intact.
- [ ] Packet can be closed only after verifier evidence, not from source tests alone.

## Ready for Worker-A / Not Ready

### Ready for Worker-A

- [ ] `spec.md`, `plan.md`, and `tasks.md` are present.
- [ ] Worker-A accepts backend/runtime-only ownership.
- [ ] Worker-A accepts replay-faithful late-stage source harness requirement.
- [ ] Worker-A accepts separate verifier authority for packaged PASS.

### Not Ready

- [ ] Proposed implementation requires forbidden write-set.
- [ ] Proposed verification only proves fast install.
- [ ] Proposed runtime can fake success from staged-shell presence.
- [ ] Proposed runtime can leave `plugins` indefinite.
- [ ] Proposed runtime changes router identities.

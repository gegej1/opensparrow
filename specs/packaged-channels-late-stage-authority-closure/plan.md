# Packaged Channels Late-Stage Authority Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use the active implementation workflow task-by-task. This packet is backend/runtime-only. Steps use checkbox syntax in `tasks.md` for tracking.

**Goal:** Close packaged `channels` late staged authority when a matching staged footprint becomes structurally ready shortly after timeout, without fake success or indefinite `plugins` running.

**Architecture:** Keep `ui/server.mjs` as the authoritative runtime install contract. Add or tighten source harnesses so staged shell at timeout, late DingTalk dependency arrival, and missing final shared/profile dirs are replayed before implementation is trusted. Preserve `F-034` single-channel acceptance and exact `F-033` combined probe truth.

**Tech Stack:** Node ESM backend, package-local install state, staged OpenClaw extension footprints, `node:test` source harnesses, fresh packaged verifier.

---

## 0. Packet Freeze

- Packet identity: `packaged-channels-late-stage-authority-closure`
- Not `F-034` reopen.
- Not dashboard diagnostics timeout readback reopen.
- Not frontend display work.
- Not packaging/vendor/wrapper/Windows work.
- Browser/UI evidence is secondary; backend install authority is primary.

## 1. File Structure / Write-Set Proposal

### Worker-A modify

- `ui/server.mjs`
  - Owns runtime authority inspection, staged promotion, grace wait, timeout handling, final shared/profile closure, and durable install state.
- `ui/tests/packaged-single-channel-plugin-timeout-parity.test.mjs`
  - Owns same-artifact channel matrix and six-surface parity for this packet if extending the existing single-channel harness is the smallest fit.
- `ui/tests/packaged-plugin-install-hang-bypass.test.mjs`
  - Owns plugin timeout/safe-bypass negative and late-stage authority cases.
- `ui/tests/packaged-install-retry-guards.test.mjs`
  - Owns bounded timeout/terminal-state guards.
- Optional focused runtime test
  - Allowed only if it stays backend/runtime-only and directly models late staged authority closure.

### Worker-A read-only

- `specs/034-packaged-single-channel-plugin-timeout-parity/spec.md`
- `specs/034-packaged-single-channel-plugin-timeout-parity/plan.md`
- `specs/034-packaged-single-channel-plugin-timeout-parity/tasks.md`
- `docs/current-status.md`
- `docs/packaged-mac-diagnostics.md`
- `docs/runtime-flow.md`

### Forbidden

- `ui/public/*`
- `platforms/**`
- `vendor/**`
- Windows files
- wrappers
- packaging strategy
- docs closeout
- longrun writeback
- secrets / local auth material

## 2. Implementation Phases

### Phase A: Source Reproduction First

Create or tighten a replay-faithful source harness that freezes the actual failure shape:

- staged `channels` shell exists at timeout
- `package.json`, `openclaw.plugin.json`, and `dist/index.js` exist at the initial staged timestamp
- `node_modules/@openclaw-china/dingtalk/dist/index.js` arrives late
- final shared/profile `extensions/channels` are missing at timeout
- runtime gets a timeout-like plugin install result before final authority exists

Expected failing-before-fix behavior:

- `status=error`
- `installState=failed`
- `blockingStep=plugins`
- `blockingPlugin=channels`
- `requestedChannelReadiness.dingtalk=false`
- `channelProbes.dingtalk=null`
- `bypass.verdict=failed`

### Phase B: Runtime Authority Closure

In `ui/server.mjs`, make the late-stage authority flow explicit:

- detect a matching staged shell as a reason to enter bounded catch-up
- keep polling only within a bounded grace window
- promote a staged footprint only after it is structurally ready
- close final shared/profile authority after promotion
- continue the install flow when requested channel readiness can be proven
- return precise non-success when structural readiness never arrives

The implementation must keep success dependent on structural authority, not on the mere presence of a staged shell.

### Phase C: Negative Authority Path

Add or preserve tests proving:

- weak staged shell is not enough for safe bypass
- late dependency never arriving ends in non-success
- failed promotion records durable evidence
- no requested-not-ready lane returns success
- no timeout-like wording turns into UI pseudo-success
- `step=plugins` remains bounded

### Phase D: F-034 / F-033 Regression Guard

Run and preserve source assertions for:

- `dingtalk-only` default target truthful success
- `wecom-only` default target truthful success
- `dingtalk+wecom` exact frozen `F-033` probe truth:
  - `status=error`
  - `installState=failed`
  - `blockingStep=probe`
  - `blockingPlugin=wecom-openclaw-plugin`
  - `requestedChannelReadiness={dingtalk:false,wecom:false}`
  - `channelProbes.dingtalk={status:warning, ready:false}`
  - `channelProbes.wecom={status:error, ready:false}`
- six-surface consistency
- router invariants:
  - `providerId=opensparrow-router`
  - `modelTarget=opensparrow-router/auto`

### Phase E: Source Handoff

Worker-A stops at source evidence and hands off to packaged verifier. Worker-A must not claim packaged PASS.

## 3. Test Plan

Worker-A required source verification:

- `node --check ui/server.mjs`
- `node --test ui/tests/packaged-plugin-install-hang-bypass.test.mjs`
- `node --test ui/tests/packaged-install-retry-guards.test.mjs`
- `node --test ui/tests/packaged-single-channel-plugin-timeout-parity.test.mjs`
- any optional focused runtime test added for this packet

Recommended overlap regression:

- `node --test ui/tests/packaged-channel-probe-diagnostics.test.mjs`
- `node --test ui/tests/packaged-plugin-profile-sync.test.mjs`
- `node --test ui/tests/packaged-dingtalk-install-gate.test.mjs`
- `node --test ui/tests/packaged-wecom-install-gate.test.mjs`

Verifier required packaged proof:

- use a fresh packaged artifact, not stale historical PASS
- intentionally exercise or strongly prove late-stage `channels` authority closure
- capture bundled node path
- capture install-state terminal fields
- capture install.log plugin start/fail/closure lines
- capture staged footprint mtimes
- capture final shared/profile `extensions/channels`
- verify six surfaces agree
- verify router invariants

## 4. Verifier Handoff

Verifier must answer these questions from fresh evidence:

1. Did a matching staged `channels` shell exist at timeout?
2. Did the DingTalk dependency arrive only after the timeout boundary?
3. Did runtime promote/close the staged footprint into final shared/profile authority?
4. If promotion did not happen, was non-success precise, durable, and bounded?
5. Did the install proceed only when requested channel readiness was structurally proven?
6. Did all six surfaces agree?
7. Did router identity remain unchanged?
8. Did combined `dingtalk+wecom` preserve exact frozen `F-033` truth?

Verifier must mark the packet not ready for closeout if only a normal fast install was exercised.

## 5. Closeout Gate

Closeout is permitted only when all are true:

- Worker-A source verification passed.
- Fresh packaged verifier intentionally exercised or strongly proved the late-stage path.
- No forbidden write-set was touched.
- No secrets or local auth material were recorded.
- `F-034` and `F-033` identities remained intact.
- Six surfaces and router invariants were verified.

Closeout must remain blocked when:

- source tests pass but packaged late-stage proof is missing
- verifier only replayed a fast install
- runtime success can occur without structurally ready footprint
- `step=plugins` can remain indefinite
- final shared/profile authority remains missing after claimed success

## 6. Ready / Not Ready

### Ready for Worker-A

- Worker-A accepts the proposed write-set.
- Worker-A agrees to source-test the replay-faithful late-stage shape before or alongside implementation.
- Worker-A agrees source PASS is not packaged PASS.
- Worker-A agrees to stop on any scope escape.

### Not Ready

- The work is reframed as frontend, packaging, wrapper, Windows, vendor, or docs closeout.
- The implementation plan relies on fast install proof only.
- The design would fake success from staged-shell presence alone.
- The design cannot keep `plugins` bounded.
- The design changes router identities.

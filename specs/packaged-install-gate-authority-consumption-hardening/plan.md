# packaged-install-gate-authority-consumption-hardening Plan

Status: pending-spec-review

No Worker may start from this plan until Spec Review returns APPROVED.

## Objective

Harden packaged install-gate readiness so it consumes the latest same-profile
runtime authority before terminal requested-channel failure. The target failure
mode is a manual packaged DingTalk install where an early transient
`daemon=unknown` probe persisted terminal failure even though the same live
instance later reached `authoritative_ready`.

## Non-Goals

- Do not reopen OpenClaw config path propagation unless new evidence proves it
  regressed.
- Do not modify vendor assets.
- Do not modify platforms, wrappers, or build scripts.
- Do not modify `ui/public/**`.
- Do not modify model-routing implementation or tests.
- Do not patch `dist` manually.
- Do not change DingTalk credential requirements.
- Do not add user workaround text.
- Do not leak secrets.
- Do not update docs, longrun, or Mem0 before Closer.

## Source Truth

All implementation must land in source:

- Runtime/install gate source: `ui/server.mjs`
- Source tests:
  - `ui/tests/packaged-install-retry-guards.test.mjs`
  - `ui/tests/packaged-channel-probe-diagnostics.test.mjs`
  - `ui/tests/packaged-runtime-state-stability.test.mjs`
  - optional `ui/tests/packaged-install-gate-authority-consumption.test.mjs`

Fresh packaged verification must rebuild from source and must not rely on stale
`dist` content.

## Approved Worker Write-Set, Pending Spec Review

If Spec Review approves this packet, Worker may only write:

- `ui/server.mjs`
- `ui/tests/packaged-install-retry-guards.test.mjs`
- `ui/tests/packaged-channel-probe-diagnostics.test.mjs`
- `ui/tests/packaged-runtime-state-stability.test.mjs`
- optional new test:
  `ui/tests/packaged-install-gate-authority-consumption.test.mjs`

If any other file appears necessary, Worker must stop and return to SpecWriter
for scope refreeze and Spec Review. A reviewer cannot independently expand the
write-set.

## Forbidden Write-Set

The following paths are forbidden throughout Worker, Batch Review, and Batch
Verify for this packet:

- `dist/**`
- `vendor/**`
- `platforms/**`
- `scripts/build-usb-pack.sh`
- `ui/public/**`
- model-routing implementation files and tests
- `docs/**`
- `longrun/**`
- `specs/**` after Spec Review unless explicitly returning to SpecWriter
- Mem0 before Closer

## Implementation Shape For Future Worker

This section defines the expected behavior without authorizing work before Spec
Review.

1. Preserve existing same-profile runtime authority propagation.
   - Continue using one packaged profile/config/gateway authority across
     `/api/status`, daemon status, health, install probe, and requested-channel
     readiness.
   - Preserve `daemonStatusUsesProfileConfig` and `healthUsesProfileConfig`
     evidence.

2. Add bounded convergence before terminal requested-channel failure.
   - When requested DingTalk readiness is false because of transient runtime
     authority evidence such as `daemon=unknown`, re-check the same-profile
     authority and probe result inside a bounded wait.
   - Consume the latest converged authority for final install-state success or
     failure.
   - Do not silently loop forever. The bound must be deterministic and testable.

3. Separate authority failures from channel configuration failures.
   - DingTalk configured/enabled/credential-present plus
     `authoritative_ready` should pass requested readiness unless the channel
     probe reports a real channel config failure.
   - Missing DingTalk config or credentials should remain a channel
     configuration failure.
   - Persistent `foreign_gateway_port`, `gateway_unhealthy`, and
     `config_path_token_mismatch` must remain non-ready with distinct
     diagnostics.

4. Preserve diagnostic evidence.
   - Final install-state failure should record the latest authority
     classification, daemon/health profile-config evidence, and channel probe
     reason.
   - The evidence must make it clear whether the failure is authority,
     gateway-health, stale/foreign port, config/token mismatch, or channel
     configuration.

5. Preserve redaction.
   - No gateway token, API key, auth profile secret, DingTalk credential, or raw
     sensitive config value may appear in logs, install-state, API responses, or
     diagnostics.

## TDD Plan

Worker must create or update tests first:

- Add a RED test where install sees transient `daemon=unknown`, then the same
  instance reaches `authoritative_ready`, and install completes.
- Add a RED test where stale `channelProbes.dingtalk.ready=false` is not
  terminal once final authority converges.
- Add or preserve negative tests for persistent `foreign_gateway_port`.
- Add or preserve negative tests for persistent `gateway_unhealthy`.
- Add or preserve a distinct diagnostic test for
  `config_path_token_mismatch`.
- Add or preserve secret-safety assertions across install-state, channel probe,
  and status responses.

## Acceptance Matrix

| Case | Expected Outcome |
| --- | --- |
| transient `daemon=unknown` then `authoritative_ready` | install completes; final state is not terminal `daemon=unknown` |
| stale `channelProbes.dingtalk.ready=false` then final authority ready | DingTalk requested readiness becomes true if channel config is valid |
| persistent `foreign_gateway_port` | install fails non-ready with stale/foreign gateway diagnostic |
| persistent `gateway_unhealthy` | install fails non-ready with gateway unhealthy diagnostic |
| persistent `config_path_token_mismatch` | install fails non-ready with config/token mismatch diagnostic |
| missing DingTalk config/credential | install fails channel config, not authority |
| credential-bearing success/failure paths | no secret leakage |

## Verification Plan

Source verification required from Worker and Batch Verify:

- `node --check ui/server.mjs`
- `node --test ui/tests/packaged-install-gate-authority-consumption.test.mjs`
  if created
- `node --test ui/tests/packaged-install-retry-guards.test.mjs`
- `node --test ui/tests/packaged-channel-probe-diagnostics.test.mjs`
- `node --test ui/tests/packaged-runtime-state-stability.test.mjs`
- `node --test ui/tests/packaged-runtime-profile-config-authority.test.mjs`
- `git diff --check`

Fresh packaged verification required from Batch Verify:

- Rebuild mac package from source.
- Launch package root `01-开始部署.command` with isolated `HOME` and
  `OPENCLAW_HOME`.
- Use the printed UI port.
- Reproduce DingTalk install with controlled or safe credentials.
- Prove no terminal `daemon=unknown` when the same instance reaches
  `authoritative_ready`.
- Prove persistent foreign gateway port still fails.
- Inspect install-state, `/api/status`, diagnostics, logs, and channel probe
  reports for secret safety.

## Delivery Gates

### 1. Spec Review

Required verdict: APPROVED.

Reviewer must confirm:

- Frozen root cause is install-gate authority consumption.
- This packet is not treating stale package, wrong pack root, missing archive, or
  config env propagation as the root cause.
- Authority contract preserves same-profile config/gateway consumption.
- Negative safety for persistent foreign port, gateway unhealthy, and
  config/token mismatch is explicit.
- Worker write-set and forbidden write-set are explicit and disjoint.

### 2. Worker

Worker may start only after Spec Review APPROVED.

Worker must:

- Begin with RED tests.
- Keep writes inside the approved write-set.
- Preserve source truth and avoid manual `dist` patching.
- Stop and return to SpecWriter if scope expansion is required.

### 3. Batch Review

Independent review must approve:

- Test coverage for the transient-to-authoritative path.
- Negative safety for persistent authority failures.
- Diagnostic distinction between authority and channel config failures.
- Redaction of all secret surfaces.
- No forbidden write-set touched.

### 4. Batch Verify

Independent verification must pass:

- Source commands listed in this plan.
- Fresh packaged verification rebuilt from source.
- DingTalk manual-path reproduction with controlled or safe credentials.
- Persistent foreign gateway negative proof.
- Secret-safety inspection.

### 5. Closer

Closer may run only after Batch Review APPROVED and Batch Verify PASS.

Closer may update:

- docs and runbooks
- platform guides
- `longrun/workspaces/opensparrow-unified/feature_list.json`
- `longrun/workspaces/opensparrow-unified/claude-progress.txt`
- durable Mem0 memory

Closer must not change implementation behavior. Any implementation issue found
at closeout returns the packet to Worker, Batch Review, and Batch Verify.

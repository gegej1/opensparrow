# packaged-install-gate-authority-consumption-hardening Tasks

Status: pending-spec-review

Worker is blocked until Spec Review returns APPROVED. These tasks define the
future execution sequence only.

## Gate 0: SpecWriter

- [x] Freeze root cause as install-gate authority consumption of stale/transient
  probe evidence.
- [x] Exclude stale package, wrong `packRoot`, missing bundled archive, and
  OpenClaw config env propagation as current root causes.
- [x] Define authority contract for requested-channel readiness.
- [x] Define allowed Worker write-set.
- [x] Define forbidden write-set.
- [x] Define acceptance matrix.
- [x] Define TDD and verification requirements.
- [ ] Spec Review verdict is APPROVED.

## Gate 1: Spec Review

Reviewer must approve before Worker starts.

- [ ] Confirm frozen background matches live forensics.
- [ ] Confirm previous packet is treated as passed and not reopened without
  regression evidence.
- [ ] Confirm terminal install readiness must consume fresh same-profile
  authority, not a stale first probe.
- [ ] Confirm `channelProbes.dingtalk.ready=false` cannot be terminal solely
  because of transient `daemon=unknown` when same-instance authority converges.
- [ ] Confirm persistent `foreign_gateway_port`, `gateway_unhealthy`, and
  `config_path_token_mismatch` remain non-ready.
- [ ] Confirm missing DingTalk config/credential remains channel configuration
  failure.
- [ ] Confirm no user workaround is specified.
- [ ] Confirm no secret leakage is permitted.
- [ ] Confirm Worker allowed write-set is only:
  - `ui/server.mjs`
  - `ui/tests/packaged-install-retry-guards.test.mjs`
  - `ui/tests/packaged-channel-probe-diagnostics.test.mjs`
  - `ui/tests/packaged-runtime-state-stability.test.mjs`
  - optional `ui/tests/packaged-install-gate-authority-consumption.test.mjs`
- [ ] Confirm forbidden write-set includes:
  - `dist/**`
  - `vendor/**`
  - `platforms/**`
  - `scripts/build-usb-pack.sh`
  - `ui/public/**`
  - model-routing implementation files and tests
  - `docs/**`
  - `longrun/**`
  - `specs/**` after Spec Review unless returning to SpecWriter
  - Mem0 before Closer

## Gate 2: Worker TDD

Blocked until Gate 1 is APPROVED.

Worker must write RED tests first inside the allowed write-set.

- [ ] RED: transient `daemon=unknown` followed by same-instance
  `authoritative_ready` completes requested DingTalk install.
- [ ] RED: stale `channelProbes.dingtalk.ready=false` is not terminal if final
  same-profile authority converges.
- [ ] RED/PRESERVE: persistent `foreign_gateway_port` remains install failure.
- [ ] RED/PRESERVE: persistent `gateway_unhealthy` remains install failure.
- [ ] RED/PRESERVE: persistent `config_path_token_mismatch` remains distinct
  install failure.
- [ ] RED/PRESERVE: missing DingTalk credential/config fails as channel config,
  not authority.
- [ ] RED/PRESERVE: install-state, API status, diagnostics, logs, and channel
  probe reports do not leak gateway token, API key, auth profile secret, or
  DingTalk credential values.

## Gate 3: Worker Implementation

Blocked until Gate 2 has RED coverage.

- [ ] Add bounded same-profile authority convergence before terminal
  requested-channel failure.
- [ ] Re-evaluate requested DingTalk readiness with latest authority after
  convergence.
- [ ] Treat configured/enabled/credential-present DingTalk plus
  `authoritative_ready` as ready unless a real channel config failure exists.
- [ ] Preserve persistent `foreign_gateway_port` as non-ready with distinct
  stale/foreign gateway diagnostic.
- [ ] Preserve persistent `gateway_unhealthy` as non-ready with distinct gateway
  diagnostic.
- [ ] Preserve persistent `config_path_token_mismatch` as non-ready with
  distinct config/token diagnostic.
- [ ] Persist latest authority evidence in terminal install-state failures.
- [ ] Preserve all secret redaction behavior.
- [ ] Keep writes inside allowed write-set only.
- [ ] Stop and return to SpecWriter if any forbidden file appears necessary.

## Gate 4: Worker Source Verification

Worker must run and report:

- [ ] `node --check ui/server.mjs`
- [ ] `node --test ui/tests/packaged-install-gate-authority-consumption.test.mjs`
  if created
- [ ] `node --test ui/tests/packaged-install-retry-guards.test.mjs`
- [ ] `node --test ui/tests/packaged-channel-probe-diagnostics.test.mjs`
- [ ] `node --test ui/tests/packaged-runtime-state-stability.test.mjs`
- [ ] `node --test ui/tests/packaged-runtime-profile-config-authority.test.mjs`
- [ ] `git diff --check`

## Gate 5: Batch Review

Blocked until Worker reports DONE.

Independent reviewer must verify:

- [ ] Source changes are limited to the allowed write-set.
- [ ] Forbidden paths are untouched:
  - `dist/**`
  - `vendor/**`
  - `platforms/**`
  - `scripts/build-usb-pack.sh`
  - `ui/public/**`
  - model-routing implementation files and tests
  - `docs/**`
  - `longrun/**`
  - `specs/**` unless explicitly returned to SpecWriter
  - Mem0 before Closer
- [ ] Tests cover transient `daemon=unknown` followed by
  `authoritative_ready`.
- [ ] Tests cover stale `channelProbes.dingtalk.ready=false` not being terminal
  after final authority convergence.
- [ ] Persistent `foreign_gateway_port` cannot be misclassified as ready.
- [ ] Persistent `gateway_unhealthy` cannot be misclassified as ready.
- [ ] Persistent `config_path_token_mismatch` remains distinct.
- [ ] Missing DingTalk config/credential remains channel-config failure.
- [ ] Final install-state failure carries latest authority evidence.
- [ ] Secret surfaces remain redacted.

Required verdict: APPROVED.

## Gate 6: Batch Verify

Blocked until Batch Review verdict is APPROVED.

Independent verifier must run source verification:

- [ ] `node --check ui/server.mjs`
- [ ] `node --test ui/tests/packaged-install-gate-authority-consumption.test.mjs`
  if created
- [ ] `node --test ui/tests/packaged-install-retry-guards.test.mjs`
- [ ] `node --test ui/tests/packaged-channel-probe-diagnostics.test.mjs`
- [ ] `node --test ui/tests/packaged-runtime-state-stability.test.mjs`
- [ ] `node --test ui/tests/packaged-runtime-profile-config-authority.test.mjs`
- [ ] `git diff --check`

Independent verifier must run fresh packaged verification:

- [ ] Rebuild mac package from source.
- [ ] Do not reuse stale `dist`.
- [ ] Launch package root `01-开始部署.command` with isolated `HOME` and
  `OPENCLAW_HOME`.
- [ ] Use the printed UI port.
- [ ] Reproduce DingTalk install path with controlled or safe credentials.
- [ ] Prove no terminal `daemon=unknown` when the same instance reaches
  `authoritative_ready`.
- [ ] Prove persistent foreign gateway port still fails.
- [ ] Inspect install-state, `/api/status`, diagnostics, logs, and channel probe
  output for secret safety.

Required verdict: PASS.

## Gate 7: Closer

Blocked until Batch Review is APPROVED and Batch Verify is PASS.

Closer may update only after both gates pass:

- [ ] usage docs, runbooks, or platform guides as needed
- [ ] `longrun/workspaces/opensparrow-unified/feature_list.json`
- [ ] `longrun/workspaces/opensparrow-unified/claude-progress.txt`
- [ ] durable Mem0 memory

Closer must not modify implementation behavior. If Closer discovers an
implementation issue, the packet returns to Worker, Batch Review, and Batch
Verify.

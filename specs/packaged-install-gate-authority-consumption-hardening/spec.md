# packaged-install-gate-authority-consumption-hardening Spec

Status: pending-spec-review

SpecWriter only. This packet must not enter Worker until Spec Review returns
APPROVED.

## Frozen Background

The previous packet, `packaged-runtime-profile-config-authority-hardening`, has
completed all gates:

- Spec Review: APPROVED
- Worker: DONE
- Batch Review: APPROVED
- Batch Verify: PASS
- Closer: DONE
- Durable memory: `41e27c78-3f48-4e3a-951b-0ffc0e4d743d`

That packet closed the OpenClaw child-process authority gap: `runOc`, daemon
status, health, and channel probe commands use the same packaged profile
authority, including `OPENCLAW_CONFIG_PATH`. `/api/status` can now expose
`authoritative_ready`, `gateway_unhealthy`, `config_path_token_mismatch`, and
`foreign_gateway_port` diagnostics.

The real manual packaged path still exposed a new install-gate consumption gap.
The user clicked the package root entry and install failed with:

```text
requested channels are not authoritatively ready after install
plugin install gate did not close cleanly for requested channel dingtalk:
daemon current status: unknown
```

Live forensics classify this packet as:

- category: `install_gate_not_using_authority_result`
- confidence: high

This is not stale package usage, wrong `packRoot`, bundled archive absence, or
OpenClaw config environment propagation failure:

- UI port was `19001`.
- `packRoot` was
  `/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-p0-packaged-mac-diagnostics/dist/usb-pack/opensparrow-0.1.0-alpha`.
- Source and package `ui/server.mjs` matched.
- Bundled plugin archive state was `required=true`, `ready=true`, `missing=[]`.
- The same live instance later reported:
  - `installed=true`
  - `daemon=running`
  - `runtimeMode=daemon`
  - `gatewayHealthy=true`
  - `statusAuthority.classification=authoritative_ready`
  - `daemonStatusUsesProfileConfig=true`
  - `healthUsesProfileConfig=true`

The persisted install-state failure carried older probe evidence:

- `status=error`
- `installState=failed`
- `blockingStep=probe`
- `blockingPlugin=channels`
- `requestedChannelReadiness.dingtalk=false`
- `channelProbes.dingtalk.ready=false`
- `channelProbes.dingtalk.status=warning`
- `channelProbes.dingtalk.daemon=unknown`
- embedded authority was observed as `foreign_gateway_port`

The frozen root cause is that the install gate can persist terminal requested
channel failure from a stale or transient probe snapshot instead of performing a
bounded same-profile authority convergence and consuming the latest authority
result before deciding readiness.

This packet does not reopen `OPENCLAW_CONFIG_PATH` propagation unless new
evidence shows that propagation regressed.

## Authority Contract

The install gate is an authority consumer. Its terminal readiness decision must
consume fresh same-profile runtime authority instead of a stale first probe.

For requested DingTalk install readiness:

- `channelProbes.dingtalk.ready` must not be terminal `false` solely because an
  early probe saw transient `daemon=unknown`.
- If the same live instance reaches `statusAuthority.classification =
  authoritative_ready` inside the bounded convergence window, the install gate
  must re-evaluate channel readiness with that latest authority.
- `/api/status`, daemon status, health, install probe, and requested-channel
  readiness must agree on the same profile/config/gateway authority surface.
- Terminal install-state success or failure must include the latest authority
  evidence used for the decision.

Authority classifications are consumed as follows:

- `authoritative_ready`: the current profile daemon/gateway is authoritative.
- `foreign_gateway_port`: non-ready; the gateway port belongs to a stale or
  foreign authority.
- `gateway_unhealthy`: non-ready; the current profile gateway is not healthy.
- `config_path_token_mismatch`: non-ready; the health path/config/token authority
  does not match.
- missing channel config or credentials: non-ready channel configuration failure,
  not an authority failure.

## Functional Requirements

FR-1: Before failing requested channel readiness, `handleInstall()` must perform
a bounded same-profile authority convergence for requested channels.

FR-2: Convergence must re-check the current profile authority and channel probe
state before terminal failure. It must not preserve an early
`daemon=unknown`/`ready=false` snapshot as final if later same-instance authority
becomes `authoritative_ready` within the bounded wait.

FR-3: DingTalk readiness must pass when all of the following are true:

- DingTalk is requested.
- DingTalk is configured.
- DingTalk is enabled.
- Required DingTalk credential fields are present.
- Same-profile runtime authority is `authoritative_ready`.
- The channel probe does not report a real DingTalk channel configuration
  failure.

FR-4: DingTalk readiness must fail as a channel configuration failure, not an
authority failure, when required DingTalk config or credentials are missing.

FR-5: Persistent `foreign_gateway_port` must remain non-ready and must produce a
distinct stale/foreign gateway diagnostic.

FR-6: Persistent `gateway_unhealthy` must remain non-ready and must produce a
distinct gateway-health diagnostic.

FR-7: Persistent `config_path_token_mismatch` must remain non-ready and must
produce a distinct config/token authority diagnostic.

FR-8: Final install-state failure must carry latest authority evidence, including
the final classification and whether daemon status and health used the packaged
profile config.

FR-9: Secret material must never be logged, persisted, or returned through UI
diagnostic surfaces. This includes gateway tokens, API keys, auth profile
secrets, DingTalk credentials, and raw config values that contain secrets.

FR-10: No user workaround is allowed. The fix must land in source truth and must
not instruct users to run `OPENCLAW_CONFIG_PATH=...` or patch `dist` manually.

## Acceptance Matrix

| Scenario | Setup | Required Result | Diagnostic Contract |
| --- | --- | --- | --- |
| Transient daemon unknown then authoritative ready | First requested-channel probe observes `daemon=unknown`; same live instance reaches `authoritative_ready` inside bounded convergence | Install completes | Final install state must not persist terminal `daemon=unknown` |
| Stale DingTalk ready false then authority converges | Early `channelProbes.dingtalk.ready=false`; DingTalk is configured/enabled/credential-present; final authority is `authoritative_ready` | DingTalk requested readiness becomes true | Final evidence references latest authority |
| Persistent foreign gateway port | Gateway port remains occupied by stale/foreign authority through convergence | Install fails non-ready | Classification remains `foreign_gateway_port` with stale/foreign gateway diagnostic |
| Persistent gateway unhealthy | Same-profile gateway remains unhealthy through convergence | Install fails non-ready | Classification remains `gateway_unhealthy` with gateway health diagnostic |
| Persistent config path/token mismatch | Health/config/token authority remains mismatched through convergence | Install fails non-ready | Classification remains `config_path_token_mismatch` with config/token mismatch diagnostic |
| Missing DingTalk credential/config | DingTalk is requested but required config or credential fields are absent | Install fails non-ready | Failure is channel configuration, not authority |
| Secret safety | Any success or failure path with credentials configured | No secret leakage | Gateway token, API key, auth profile secret, and DingTalk credential values are redacted or absent |

## Worker Allowed Write-Set After Spec Review APPROVED

Worker may only modify:

- `ui/server.mjs`
- `ui/tests/packaged-install-retry-guards.test.mjs`
- `ui/tests/packaged-channel-probe-diagnostics.test.mjs`
- `ui/tests/packaged-runtime-state-stability.test.mjs`
- optional new focused test:
  `ui/tests/packaged-install-gate-authority-consumption.test.mjs`

If implementation proves another file is required, Worker must stop and return
to SpecWriter/Spec Review. Reviewer cannot independently expand this write-set.

## Forbidden Write-Set

Worker and reviewers must treat these paths as forbidden for this packet:

- `dist/**`
- `vendor/**`
- `platforms/**`
- `scripts/build-usb-pack.sh`
- `ui/public/**`
- model-routing implementation files and tests
- `docs/**`
- `longrun/**`
- `specs/**` after Spec Review unless the work explicitly returns to SpecWriter
- Mem0 before Closer

## TDD Requirements

Worker must start with failing source tests before implementation:

- RED test: transient `daemon=unknown` followed by `authoritative_ready` still
  completes requested DingTalk install.
- RED test: stale `channelProbes.dingtalk.ready=false` is not terminal when
  final same-profile authority converges to `authoritative_ready`.
- Negative RED/PRESERVE tests: persistent `foreign_gateway_port` remains failed.
- Negative RED/PRESERVE tests: persistent `gateway_unhealthy` remains failed.
- Diagnostic test: persistent `config_path_token_mismatch` remains distinct from
  gateway-unhealthy and channel-config failures.
- Secret-safety test: install-state, probe reports, and API responses do not
  expose gateway tokens, API keys, auth profile secrets, or DingTalk secrets.

## Verification Requirements

Source verification:

- `node --check ui/server.mjs`
- `node --test ui/tests/packaged-install-gate-authority-consumption.test.mjs`
  if the optional file is created
- `node --test ui/tests/packaged-install-retry-guards.test.mjs`
- `node --test ui/tests/packaged-channel-probe-diagnostics.test.mjs`
- `node --test ui/tests/packaged-runtime-state-stability.test.mjs`
- `node --test ui/tests/packaged-runtime-profile-config-authority.test.mjs`
- `git diff --check`

Fresh packaged verification:

- Rebuild the mac package from source.
- Do not reuse stale `dist` output.
- Launch package root `01-开始部署.command` with isolated `HOME` and
  `OPENCLAW_HOME`.
- Use the printed UI port.
- Reproduce the DingTalk install path with controlled or safe credentials.
- Prove there is no terminal `daemon=unknown` when the same instance reaches
  `authoritative_ready`.
- Prove persistent foreign gateway port still fails.
- Inspect secret safety across install-state, `/api/status`, diagnostics, logs,
  and channel probe surfaces.

## Gate Requirements

Spec Review Gate:

- Reviewer must confirm the frozen root cause is install-gate authority
  consumption, not package freshness, bundled archive, pack root, or config env
  propagation.
- Reviewer must confirm the Worker write-set is limited to the allowed files and
  that forbidden paths remain forbidden.
- Worker cannot start until verdict is APPROVED.

Worker Gate:

- Worker must use TDD and keep all writes inside the allowed write-set.
- Worker must stop if `ui/public/**`, model-routing files/tests, wrappers,
  build scripts, docs, longrun, dist, vendor, or any unspecified source file
  appears necessary.

Batch Review Gate:

- Independent reviewer must verify behavior, tests, diagnostics, redaction, and
  write-set compliance.
- Review must fail if stale/transient `daemon=unknown` can still become terminal
  after same-instance `authoritative_ready`.

Batch Verify Gate:

- Independent verifier must run source verification and fresh packaged
  verification.
- Verify must fail if stale `dist` is reused or if a persistent foreign gateway
  can be misclassified as ready.

Closer Gate:

- Closer may run only after Batch Review is APPROVED and Batch Verify is PASS.
- Closer may update docs, runbooks, platform guides, feature list,
  `claude-progress.txt`, and durable Mem0 memory.
- Closer must not modify implementation behavior. If implementation behavior is
  wrong, return to Worker/Review/Verify instead.

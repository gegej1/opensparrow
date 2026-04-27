# Feature Specification: Packaged Runtime Profile Config Authority Hardening

**Feature ID**: `packaged-runtime-profile-config-authority-hardening`  
**Created**: `2026-04-27`  
**Status**: `pending-spec-review`  
**Target worktree**: `/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-p0-packaged-mac-diagnostics`

## One Sentence

Harden packaged runtime authority so every OpenClaw child process spawned by `ui/server.mjs` reads the current packaged profile config, and `/api/status`, install probes, and readiness gates make daemon/gateway decisions from one profile/config/gateway truth source.

## Frozen Background

The previous packet `packaged-mac-entry-contract-hardening` has completed and passed Batch Verify. The current manual packaged deployment failure is not caused by missing bundled plugin archives and is not caused by wrong `packRoot`.

Observed UI failure:

```text
requested channels are not authoritatively ready after install
plugin install gate did not close cleanly for requested channel dingtalk:
daemon 当前状态: unknown
```

Observed state:

- `/api/install/status` shows DingTalk configured, enabled, and credential fields persisted.
- `channels status --probe` can identify DingTalk as configured.
- Runtime authority fails before it can prove current-profile gateway truth:
  - port `18929` is occupied;
  - the server/CLI health path does not stably propagate the current profile config;
  - the health command reads the default config instead of the packaged profile config;
  - the default config lacks the gateway token, so health fails against the wrong authority source.

Low-level reproduction:

- `openclaw daemon status --json` can see daemon/gateway running.
- `openclaw health --json` without an explicit config path reads `.gtclaw-state/.openclaw/openclaw.json`, which lacks the gateway token.
- The actual daemon config is `.gtclaw-state/.openclaw-gtclaw-portable/openclaw.json`.
- Explicitly setting `OPENCLAW_CONFIG_PATH` to `.gtclaw-state/.openclaw-gtclaw-portable/openclaw.json` makes `openclaw health --json` succeed.
- That explicit env setting is diagnostic evidence only; it must not become a user workaround.

Frozen conclusion:

- The server-side `runOc()` child process path does not stably propagate the current packaged profile's authoritative `OPENCLAW_CONFIG_PATH`.
- Health/probe commands can fall back to the default config and misclassify the current profile daemon as `unknown`.
- This packet freezes config authority drift as the failure, not a proven true current-profile gateway unhealthy state.
- The durable fix must live in source truth. It must not be a user workaround command.

## Authority And Scope

This packet is a packaged runtime profile/config authority packet.

It is in scope to define and implement:

- `ui/server.mjs` OpenClaw child process environment authority;
- current packaged profile config path propagation;
- same-profile daemon status and gateway health authority;
- `/api/status` authority evidence tied to the same profile/config/gateway;
- install readiness and channel probe authority tied to the same profile/config/gateway;
- diagnostics that distinguish true gateway failure, config/token mismatch, stale or foreign port occupation, and authoritative current-profile readiness;
- source tests and fresh packaged verification proving the config authority contract.

It is not in scope to:

- patch `dist/**` manually;
- edit `vendor/**`;
- edit Windows files;
- change mac wrapper role/entry behavior;
- reopen bundled plugin archive readiness or `packRoot` truth;
- change DingTalk plugin implementation or credentials contract;
- use `OPENCLAW_CONFIG_PATH=...` as a user-facing workaround;
- leak gateway tokens, API keys, auth profile secrets, or local credential values;
- write longrun closeout before the Closer Gate.

## Profile Config Authority Contract

The server must treat the current packaged profile as the single authority tuple:

- `OPENCLAW_HOME`
- `OPENCLAW_PROFILE`
- `PROFILE_DIR`
- `CONFIG_FILE`
- `OPENCLAW_GATEWAY_PORT`
- `PACK_ROOT`

For packaged profile `gtclaw-portable`, the authoritative config path is:

```text
<OPENCLAW_HOME>/.openclaw-gtclaw-portable/openclaw.json
```

`ui/server.mjs` must ensure OpenClaw child processes that read config, daemon status, gateway health, channel status, daemon lifecycle, or config writes use the current profile authority tuple. At minimum, spawned OpenClaw commands must receive:

- `OPENCLAW_HOME` for the current isolated packaged state root;
- `OPENCLAW_PROFILE` matching the server profile;
- `OPENCLAW_CONFIG_PATH` pointing to `CONFIG_FILE`;
- `OPENCLAW_GATEWAY_PORT` matching the server gateway port, where applicable.

The profile config path may be exposed as a path in diagnostics after normal path sanitization. Secret values from that config must never be emitted.

## Runtime Authority Contract

`/api/status`, install probes, and readiness gates must use the same profile/config/gateway authority. It is invalid for:

- `daemon status --json` to read one profile/config while `health --json` reads a different config;
- `/api/status` to report current-profile health from one config while install probe uses another;
- DingTalk readiness to be marked not ready solely because a CLI subprocess read the default config missing the gateway token.

The runtime authority decision must preserve negative safety:

- a stale or foreign listener on the gateway port must not be accepted as current-profile ready;
- a true current-profile gateway failure must remain a failure;
- token/config mismatch must be identified as a config authority problem, not collapsed into generic daemon `unknown`;
- authoritative current-profile daemon readiness must be recognized when daemon status and health agree under the current profile config.

## Diagnostic Classification Contract

Status and install/probe diagnostics must distinguish these cases:

1. `gateway_unhealthy`: current profile config is being used, but the gateway health check fails.
2. `config_path_token_mismatch`: daemon or port signals exist, but health fails because the process read the wrong config or a config without the current gateway token.
3. `foreign_gateway_port`: the gateway port is occupied by a stale or foreign process and same-profile health does not pass.
4. `authoritative_ready`: current profile daemon/gateway is authoritative and ready.

The exact field names may follow existing `ui/server.mjs` conventions, but diagnostics must expose enough non-secret evidence for verifiers to understand the decision:

- profile name;
- sanitized `profileDir`;
- sanitized authoritative `configPath`;
- gateway port;
- whether daemon status was collected under the profile config;
- whether health was collected under the same config;
- gateway port busy/healthy booleans;
- authority verdict or classification;
- redacted reason strings.

Diagnostics must not include:

- gateway token values;
- API keys;
- auth profile secrets;
- DingTalk/WeCom credential values;
- bearer tokens;
- unredacted config file contents.

## Functional Requirements

- **FR-001**: `ui/server.mjs` OpenClaw child processes must propagate the current packaged profile `OPENCLAW_CONFIG_PATH` rather than relying on OpenClaw's default config resolution.
- **FR-002**: `daemon status --json` and `health --json` must evaluate the same current profile/config/gateway authority.
- **FR-003**: `/api/status` and install readiness/probe logic must share the same runtime authority path.
- **FR-004**: Packaged DingTalk configured/enabled/credential-persisted state must not be downgraded to not-ready solely because `health --json` read the default config without a gateway token.
- **FR-005**: A stale or foreign gateway port must not be misclassified as authoritative current-profile readiness.
- **FR-006**: A true current-profile gateway failure must remain distinguishable from config path or gateway token mismatch.
- **FR-007**: Runtime diagnostics must classify `gateway_unhealthy`, `config_path_token_mismatch`, `foreign_gateway_port`, and `authoritative_ready`.
- **FR-008**: The fix must land in source truth and be carried by a rebuilt package; manual `dist/**` patching is not acceptable.
- **FR-009**: The product must not instruct users to run `OPENCLAW_CONFIG_PATH=...` as the workaround for this failure.
- **FR-010**: No status, install, diagnostic, test fixture, or verification evidence may leak gateway tokens, API keys, auth profile secrets, or channel credentials.

## Acceptance Matrix

| Scenario | Required authority behavior | Expected result |
| --- | --- | --- |
| Current profile daemon running and health reads current profile config | daemon status and health agree on the same profile/config/gateway | `authoritative_ready`; DingTalk readiness may proceed if channel config/probe is otherwise valid |
| Default config lacks gateway token but profile config is valid | server child process forces profile `OPENCLAW_CONFIG_PATH` | no false daemon `unknown` caused by default config token absence |
| Gateway port occupied by stale/foreign process | same-profile health fails and port is busy | `foreign_gateway_port` or equivalent non-ready classification |
| Current profile gateway truly unhealthy | current config is used and health still fails | `gateway_unhealthy`, not false success |
| Daemon status sees running but health used wrong config/token | mismatch is detected and reported without secrets | `config_path_token_mismatch` or equivalent diagnostic |

## Source Acceptance

Source-level acceptance requires tests proving:

1. `runOc()` or its equivalent OpenClaw spawn helper includes the current profile `OPENCLAW_CONFIG_PATH` in child env.
2. `daemon status --json` and `health --json` calls are executed through the same profile config authority.
3. `/api/status` exposes non-secret profile/config authority evidence.
4. Install readiness/probe logic uses the same profile/config/gateway authority as `/api/status`.
5. DingTalk configured/enabled/credentials-present state is not marked not-ready due to default config gateway token absence.
6. A stale or foreign gateway port remains not-ready.
7. Diagnostic classification covers `gateway_unhealthy`, `config_path_token_mismatch`, `foreign_gateway_port`, and `authoritative_ready`.
8. Tests and fixtures do not expose gateway token, API key, auth profile secret, or channel credentials.

Recommended source verification commands after implementation:

```bash
node --check ui/server.mjs
node --test ui/tests/packaged-runtime-status-authority.test.mjs
node --test ui/tests/packaged-runtime-state-stability.test.mjs
node --test ui/tests/packaged-channel-probe-diagnostics.test.mjs
node --test ui/tests/packaged-install-retry-guards.test.mjs
git diff --check
```

If a new focused test is created, include it in the verification command set.

## Fresh Packaged Acceptance

Packaged acceptance must rebuild a fresh package. It must not reuse stale `dist/**` output.

Required packaged verification:

1. rebuild a fresh mac package from source truth;
2. launch the rebuilt package with isolated `HOME` and `OPENCLAW_HOME`;
3. verify `/api/status.instance.packRoot` points to the rebuilt package root;
4. verify `/api/status.instance.configPath` or equivalent status evidence points to the current packaged profile config;
5. verify `openclaw daemon status --json` and `openclaw health --json` succeed or fail against the same profile config authority;
6. perform packaged DingTalk install/readiness replay with configured/enabled/credential-persisted evidence;
7. prove DingTalk is not marked not-ready due to default config token absence;
8. prove stale/foreign gateway port occupation still does not produce false ready;
9. prove no gateway token, API key, auth profile secret, or channel credential is present in logs, status JSON, install-state, diagnostics, or final report.

## Negative Acceptance

Reject the implementation if any of these happen:

- `runOc()` leaves config-reading OpenClaw child processes to default config discovery.
- `health --json` can read `.gtclaw-state/.openclaw/openclaw.json` while the active profile config is `.gtclaw-state/.openclaw-gtclaw-portable/openclaw.json`.
- `/api/status` and install probe use different profile/config/gateway authority.
- DingTalk configured/enabled/credential-persisted state is reported not-ready only because default config lacks the gateway token.
- A stale or foreign listener on the gateway port is marked current-profile ready.
- User-facing docs or errors tell users to run `OPENCLAW_CONFIG_PATH=...` as the fix.
- Any secret value leaks into status, logs, diagnostics, tests, or reports.
- The fix depends on manual edits under `dist/**`.

## Suggested Read Areas For Approved Worker

These paths are suggested read areas only after the Spec Review Gate returns `APPROVED`; they do not authorize Worker dispatch while this packet remains `pending-spec-review`.

Read:

- `ui/server.mjs`
- `ui/tests/packaged-runtime-status-authority.test.mjs`
- `ui/tests/packaged-runtime-state-stability.test.mjs`
- `ui/tests/packaged-channel-probe-diagnostics.test.mjs`
- `ui/tests/packaged-install-retry-guards.test.mjs`
- `specs/032-packaged-runtime-authority-and-restart-truth/spec.md`
- `specs/packaged-mac-entry-contract-hardening/spec.md`
- `docs/packaged-mac-diagnostics.md`

Do not modify code, tests, docs, longrun, or Mem0 while the packet is still in SpecWriter / Spec Review state.

## Stop Rules

Stop and report if:

1. the fix requires OpenClaw vendor binary changes;
2. the fix requires mac wrapper or package entry contract changes;
3. the fix requires Windows changes;
4. the only proposed solution is to tell users to export `OPENCLAW_CONFIG_PATH` manually;
5. required verification needs unredacted gateway token, API key, auth profile secret, or DingTalk credential values;
6. source and packaged verification cannot prove stale/foreign gateway ports remain non-ready.

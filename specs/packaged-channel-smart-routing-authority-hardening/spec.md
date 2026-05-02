# Feature Specification: Packaged Channel Smart Routing Authority Hardening

**Packet identity**: `packaged-channel-smart-routing-authority-hardening`
**Created**: `2026-04-30`
**Status**: `closed-facts-only`
**Target worktree**: `/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-p0-packaged-mac-diagnostics`
**Branch**: `feature/p0-packaged-mac-diagnostics`

## One Sentence

Harden packaged Feishu, DingTalk, and WeCom smart-routing input boundaries so router tier selection uses raw or sanitized current user text, while stale gateway/session/provider evidence is filtered by the active package instance, profile, and config authority.

## Background / Frozen Facts

- This is a new packet under `specs/packaged-channel-smart-routing-authority-hardening/`.
- This packet is a SpecWriter revision after SpecReviewer returned `APPROVED_WITH_REQUIRED_FIXES`.
- The active instance facts currently available to this spec are:
  - UI port: `19000`
  - gateway port: `18930`
  - router port: `18412`
  - current provider/model: `opensparrow-router/auto`
  - smart tier map:
    - `SIMPLE -> gpt-4o`
    - `MEDIUM -> gpt-4o`
    - `COMPLEX -> gpt-5.4-nano`
    - `REASONING -> gpt-5.5`
- Feishu `4o-mini` evidence must not be accepted as active post-reload inbound truth. It is currently only stale/pre-reload evidence, old gateway/session/provider evidence, or a log/UI confusion risk until a post-reload Feishu inbound turn proves otherwise.
- DingTalk and WeCom current session snapshots already show `opensparrow-router/auto`. Their nano behavior is therefore not frozen as a router bypass. It is frozen as router tier selection classifying channel-wrapped messages as `COMPLEX`, which maps to `gpt-5.4-nano`.
- This packet is not a simple model configuration save failure.
- This packet must not hardcode all channels to one concrete model. The smart authority remains the current profile/config router target, and tier selection must decide between the configured tiers.
- In smart mode, Feishu, DingTalk, and WeCom must consume the current profile/config authority:
  - provider id: `opensparrow-router`
  - model target: `opensparrow-router/auto`
- The existing internal IDs must remain stable:
  - `opensparrow-router`
  - `opensparrow-router/auto`
- Prior closed packet facts remain authority context:
  - `unified-model-configuration-surface` established the authoritative model-routing surface and preserved router IDs.
  - `packaged-router-model-registration-runtime-chat` preserved `opensparrow-router/auto` registration against the packaged runtime schema.
  - `packaged-router-latest-turn-routing-hotfix` fixed latest non-empty user-message extraction for direct router requests and pure backend channel-shaped simulation.
  - `packaged-runtime-profile-config-authority-hardening` and `packaged-install-gate-authority-consumption-hardening` closed packaged profile/config and install-gate authority drift.
- The remaining risk is downstream: live packaged channel ingress may still feed the router a channel envelope, JSON metadata, session history, system/tool context, or other non-current-turn material as the complexity signal.
- Routing decisions must be based on raw or sanitized current user text only.
- No user workaround is acceptable. Users must not be told to export environment variables, manually delete config, manually clear sessions, or manually restart stale processes as the durable fix.
- Secret material must remain protected. API keys, auth profiles, gateway tokens, Feishu secrets, DingTalk secrets, WeCom secrets, bearer tokens, and channel callback secrets must not be emitted.

## Root Cause

The frozen root cause is:

1. **Channel smart-routing input-boundary bug**: channel-originated router requests can let channel envelopes, literal JSON metadata, history, tool/system context, or old messages become the main complexity signal. Router tier selection must instead use raw or sanitized current user text.
2. **Stale-instance evidence hazard**: Feishu `4o-mini` and similar evidence can come from stale/pre-reload instances, old gateway/session/provider state, stale logs, or UI confusion. Such evidence must be filtered by active `packRoot`, `configPath`, `profile`, current provider/model, current ports, and current instance identity before it is accepted as current runtime truth.

The Worker focus must be:

- make router tier selection consume raw/sanitized current user text;
- prevent channel envelope, literal JSON metadata, history, tool/system context, or unrelated messages from acting as the complexity judgment body;
- filter stale gateway/session/provider evidence by active `packRoot`, `configPath`, `profile`, and current instance identity;
- preserve current smart authority `opensparrow-router/auto` and existing tier map behavior.

A fix that only changes displayed model names, only changes tier defaults, only rewrites saved config, or treats stale Feishu evidence as current truth does not satisfy this packet.

## In Scope

- Packaged Feishu, DingTalk, and WeCom smart-routing input boundaries.
- Current profile/config authority verification for channel message handling in smart mode.
- Sanitized current-user-text extraction for channel-originated router requests.
- Protection against channel envelope, literal JSON metadata, history, and tool/system context being classified as the user task.
- Active-instance filtering for stale gateway/session/provider evidence using `packRoot`, `configPath`, `profile`, ports, and current provider/model.
- Source tests that reproduce wrapped-channel SIMPLE prompts incorrectly entering `COMPLEX`.
- Source tests and packaged verification that prove DingTalk and WeCom simple wrapped channel prompts route to `SIMPLE/gpt-4o`.
- Feishu current post-reload inbound verification or explicit stale-evidence classification.
- Secret-safe diagnostics and verifier evidence.
- Existing single-model mode regression protection.

## Out of Scope

- Hardcoding Feishu, DingTalk, and WeCom to the same concrete model.
- Replacing `opensparrow-router` or renaming `opensparrow-router/auto`.
- Reopening the dashboard model-routing UI shape from `unified-model-configuration-surface`.
- Reopening packaged plugin install, bundled archive readiness, mac entry contract, profile config authority, or install-gate authority packets.
- Editing `vendor/**`, generated `dist/**`, platform wrappers, build scripts, UI public files, docs, longrun, or `.gtclaw-state/**`.
- Changing Feishu, DingTalk, or WeCom credential contracts.
- Requiring live user credentials for source tests.
- Adding user-facing workaround instructions such as manual env exports, manual config cleanup, manual session deletion, or manual stale-process cleanup.
- Writing longrun closeout, docs closeout, or Mem0 from the SpecWriter role.

## Functional Requirements

- **FR-001**: Smart mode channel turns must keep the effective model target as `opensparrow-router/auto` from the current packaged profile/config.
- **FR-002**: DingTalk simple wrapped channel prompts must route to `SIMPLE/gpt-4o`, not `COMPLEX/gpt-5.4-nano`, when the current user text is simple.
- **FR-003**: WeCom simple wrapped channel prompts must route to `SIMPLE/gpt-4o`, not `COMPLEX/gpt-5.4-nano`, when the current user text is simple.
- **FR-004**: Literal JSON metadata, channel envelope fields, sender metadata, plugin metadata, and transport wrapper text must not trigger `COMPLEX` by themselves.
- **FR-005**: Router classification for channel-originated requests must use raw or sanitized current user text as the classification body.
- **FR-006**: OpenClaw system context, assistant history, tool descriptions, old user turns, and unrelated channel messages must be excluded from the complexity judgment body.
- **FR-007**: A prior complex turn or shared `agent:main:main` history must not affect a latest simple prompt.
- **FR-008**: Complex and reasoning current user text must still route to the configured higher tiers.
- **FR-009**: Feishu `4o-mini` stale/pre-reload evidence must not be accepted as current authority unless current post-reload inbound evidence proves it under the active instance.
- **FR-010**: Active-instance evidence must be filtered by active `packRoot`, `configPath`, `profile`, UI/gateway/router ports, and current provider/model before it is accepted.
- **FR-011**: Existing single-model mode must remain supported. When single-model mode is active, channel turns must continue using the configured single-model authority rather than `opensparrow-router/auto`.
- **FR-012**: Router provider registration must remain schema-compatible with the packaged OpenClaw runtime and preserve `opensparrow-router` plus `opensparrow-router/auto`.
- **FR-013**: Diagnostics must expose only redacted classification evidence, length, hash, source label, selected tier, and selected model by default.
- **FR-014**: Diagnostics must not output raw channel envelopes or user original text.
- **FR-015**: Tests must use synthetic fake secrets and assert no API key, auth profile key, gateway token, channel secret, bearer token, or callback secret leaks.

## Diagnostic / Observability Requirements

Observability must make channel smart-routing decisions inspectable without exposing raw user text or secrets.

Required non-secret evidence for each channel smart-routing decision:

- channel id: `feishu`, `dingtalk`, or `wecom`;
- active instance identity:
  - sanitized `packRoot`;
  - sanitized `configPath`;
  - `profile`;
  - UI port;
  - gateway port;
  - router port;
  - current provider/model;
- smart tier map snapshot without keys:
  - `SIMPLE -> gpt-4o`;
  - `MEDIUM -> gpt-4o`;
  - `COMPLEX -> gpt-5.4-nano`;
  - `REASONING -> gpt-5.5`;
- classification evidence:
  - source label, such as `raw-current-user-text` or `sanitized-current-user-text`;
  - redacted evidence label;
  - character length;
  - stable hash;
  - excluded input categories, such as `channel-envelope`, `json-metadata`, `history`, `tool-context`, and `system-context`;
- router decision:
  - selected tier;
  - selected model;
  - fallback tier attempts, if any;
- stale-evidence classification:
  - stale/pre-reload evidence;
  - stale package;
  - stale gateway/session/provider;
  - old log/UI evidence;
  - current post-reload inbound evidence missing.

Diagnostics must not include:

- raw channel envelope;
- raw user original text;
- raw JSON metadata payload;
- API keys;
- auth profile key values;
- gateway tokens;
- Feishu `appSecret`;
- DingTalk `clientSecret`;
- WeCom `secret`, `corpSecret`, callback token, or encoding AES key;
- bearer tokens;
- unredacted config file contents.

Existing router headers such as `x-opensparrow-router-tier` and `x-opensparrow-router-model` may remain, but they are not sufficient by themselves for packaged authority proof.

## Security / Secret Safety Requirements

- Plain `apiKey` values must never appear in readback, logs, diagnostics, diagnostic bundles, install state, test output, response summaries, response headers, or final evidence.
- Auth profile files may be referenced by sanitized path only. Their contents and key values must not be printed.
- Gateway tokens and bearer tokens must never be printed.
- Channel credentials must never be printed:
  - Feishu `appSecret`;
  - DingTalk `clientSecret`;
  - WeCom `secret`, `corpSecret`, callback token, and encoding AES key.
- Diagnostics must not output raw channel envelopes or raw user original text.
- Default diagnostic output is limited to redacted classification evidence, length, hash, source label, selected tier, and selected model.
- Synthetic fixtures must use fake secrets and must include assertions that those fake API keys, auth profile keys, gateway tokens, and channel secrets do not appear in observable output.
- Verifier reports must use credential-present booleans or redacted fingerprints, not raw credential values.

## Acceptance Matrix

| Scenario | Required behavior | Acceptance evidence |
| --- | --- | --- |
| Active instance facts | Verification records UI `19000`, gateway `18930`, router `18412`, provider/model `opensparrow-router/auto`, and tier map `SIMPLE/MEDIUM -> gpt-4o`, `COMPLEX -> gpt-5.4-nano`, `REASONING -> gpt-5.5` | Source or packaged evidence includes these facts without secrets |
| Smart routing active, Feishu current inbound | Feishu uses current profile/config `opensparrow-router/auto` only if evidence is from the active post-reload instance | Current post-reload inbound evidence or explicit stale-evidence classification |
| Smart routing active, DingTalk snapshot | DingTalk current session snapshot remains `opensparrow-router/auto` | Evidence confirms issue is tier selection, not router bypass |
| Smart routing active, WeCom snapshot | WeCom current session snapshot remains `opensparrow-router/auto` | Evidence confirms issue is tier selection, not router bypass |
| DingTalk simple wrapped channel prompt | Router uses raw/sanitized current user text and routes `SIMPLE/gpt-4o` | DingTalk wrapped prompt fixture returns tier `SIMPLE` and model `gpt-4o` |
| WeCom simple wrapped channel prompt | Router uses raw/sanitized current user text and routes `SIMPLE/gpt-4o` | WeCom wrapped prompt fixture returns tier `SIMPLE` and model `gpt-4o` |
| Literal JSON metadata / channel envelope | Envelope or metadata does not trigger `COMPLEX` by itself | JSON/channel wrapper fixture with simple user text routes `SIMPLE/gpt-4o` |
| Prior complex turn / shared `agent:main:main` history | Prior complex turn and shared history do not affect latest simple prompt | Latest simple prompt routes `SIMPLE/gpt-4o` after prior complex/reasoning history |
| Complex current user text | Current user text that is genuinely complex routes to configured complex tier | Feishu, DingTalk, and WeCom complex fixtures route to `COMPLEX/gpt-5.4-nano` |
| Reasoning current user text | Current user text that is genuinely reasoning routes to configured reasoning tier | Feishu, DingTalk, and WeCom reasoning fixtures route to `REASONING/gpt-5.5` |
| Feishu `4o-mini` stale/pre-reload evidence | Stale/pre-reload Feishu evidence cannot be counted as current authority | Verifier rejects evidence lacking active `packRoot/configPath/profile/current instance` match |
| Active-instance filtering | Evidence is accepted only when active `packRoot`, `configPath`, `profile`, ports, and current provider/model match | Stale package/source listener evidence is classified separately |
| Single-model mode active | Existing single-model mode behavior is preserved | Feishu, DingTalk, and WeCom use the configured single-model target, not router auto |
| Router ID invariants | `opensparrow-router` and `opensparrow-router/auto` remain present and effective | Config readback, runtime dispatch, and packaged evidence preserve both IDs |
| Secret safety | No secret values or raw user/channel envelopes leak | Secret scans over status, logs, install state, diagnostics, bundles, headers, and verifier output return no hits |

## Test Plan

Source-level tests must be written before implementation changes and must fail against the unsafe behavior.

Required source test coverage:

1. Current-turn sanitizer:
   - Feishu, DingTalk, and WeCom channel-shaped payloads;
   - literal JSON metadata and channel envelopes;
   - polluted system context, tool descriptions, assistant history, and older user messages;
   - latest simple prompt remains `SIMPLE/gpt-4o`;
   - current complex/reasoning prompt still enters the configured higher tier.
2. DingTalk and WeCom wrapped prompts:
   - simple wrapped DingTalk prompt routes `SIMPLE/gpt-4o`;
   - simple wrapped WeCom prompt routes `SIMPLE/gpt-4o`;
   - wrapper metadata alone does not trigger `COMPLEX`.
3. Shared history:
   - prior complex or reasoning turn under shared `agent:main:main` does not affect the latest simple prompt.
4. Active-instance filtering:
   - stale Feishu `4o-mini` evidence is rejected unless active post-reload inbound evidence matches `packRoot`, `configPath`, `profile`, ports, and current provider/model.
5. Single-model regression:
   - existing single-model mode still uses the configured single-model provider/model for all three channels.
6. Secret safety:
   - fixtures use synthetic fake secrets;
   - tests assert no fake API key, auth profile key, gateway token, channel secret, raw channel envelope, or raw user original text appears in observable output.

Recommended future source command set:

- `node --check ui/server.mjs`
- `node --check scripts/model-routing/lib/custom-plugin-routing.mjs`
- `node --test ui/tests/model-routing-runtime-dispatch.test.mjs`
- `node --test ui/tests/custom-openai-provider-rebind.test.mjs`
- `node --test ui/tests/packaged-channel-smart-routing-authority.test.mjs`
- `node --test ui/tests/custom-router-current-turn-routing.test.mjs`
- `git diff --check`

If the final Worker changes different tests, the Worker must explain why the substitute tests cover every acceptance row.

## Fresh Packaged Verification Plan

Packaged verification must use a fresh rebuilt mac package from source truth. Reusing a stale `dist/**` service, stale browser tab, old package, or default evidence without active-instance proof is invalid.

Required packaged verification:

1. Rebuild the mac package from the worktree source.
2. Launch the package only through the package-root `01-开始部署.command`.
3. Use isolated `HOME` and `OPENCLAW_HOME`.
4. Use the launcher-printed or active UI port and verify instance identity:
   - UI port `19000` for the current active evidence, unless a later verifier records a new active port;
   - gateway port `18930`;
   - router port `18412`;
   - `packRoot` equals the active package root;
   - `configPath` belongs to the active profile;
   - profile matches the current packaged profile;
   - current provider/model is `opensparrow-router/auto`.
5. Configure or confirm smart routing with:
   - `SIMPLE -> gpt-4o`;
   - `MEDIUM -> gpt-4o`;
   - `COMPLEX -> gpt-5.4-nano`;
   - `REASONING -> gpt-5.5`.
6. For DingTalk and WeCom, verify channel-wrapped simple prompts route `SIMPLE/gpt-4o`.
7. For Feishu, classify model evidence by active instance identity before accepting it. If only old `4o-mini` evidence exists, classify it as stale/pre-reload or ambiguous and block current-authority claims.
8. Verify literal JSON metadata and channel envelopes do not trigger `COMPLEX`.
9. Verify prior complex/reasoning turn and shared `agent:main:main` history do not affect the latest simple prompt.
10. Verify complex and reasoning current user text still reaches configured higher tiers.
11. Verify single-model mode still works after smart-routing tests.
12. Run secret scans over:
   - `/api/status`;
   - `/api/install/status`;
   - `/api/diagnostics`;
   - `/api/diagnostics/export`;
   - diagnostic bundle;
   - install state;
   - install log;
   - router/channel response headers;
   - verifier output.

Packaged verification may use controlled channel-plugin replay only if it exercises the same packaged gateway/session/provider path as live channel ingress. A direct router-only simulation is useful source evidence but is not enough for Batch Verify PASS.

## Worker Allowed Write-Set Proposal

This is a proposal only. It does not authorize Worker edits.

- `ui/server.mjs`
- `scripts/model-routing/lib/custom-plugin-routing.mjs`
- `ui/lib/session-rebind.mjs`
- `ui/tests/model-routing-runtime-dispatch.test.mjs`
- `ui/tests/custom-openai-provider-rebind.test.mjs`
- New: `ui/tests/packaged-channel-smart-routing-authority.test.mjs`
- New: `ui/tests/custom-router-current-turn-routing.test.mjs`

If a Worker needs any additional file, they must pause and request scope review before editing.

## Forbidden Write-Set

Forbidden for this packet unless a later SpecWriter revision and Spec Review explicitly changes scope:

- `vendor/**`
- `dist/**`
- `platforms/**`
- `scripts/build-usb-pack.sh`
- `scripts/**` except proposed `scripts/model-routing/lib/custom-plugin-routing.mjs`
- `ui/public/**`
- `ui/**` except the proposed Worker files above
- `docs/**`
- `longrun/**`
- `.gtclaw-state/**`
- `.codex/auth.json`
- `.codex/config.toml`
- `.env` or `.env.*`
- credential files and auth profile files
- any generated binary, package archive, `node_modules/**`, `bin/**`, `lib/**`, `share/**`, or `*.exe`
- Mem0 writes by Worker, Reviewer, Verifier, or SpecWriter

After Spec Review is fully approved, `specs/**` is frozen for Worker, Reviewer, and Verifier. Any spec change after that must return to SpecWriter and Spec Review.

Only the Closer may write Mem0, and only after Batch Review is `APPROVED` and Batch Verify is `PASS`.

## Gate Requirements

### Spec Review Requirements

- Confirm the frozen root cause is input-boundary bug plus stale-instance evidence hazard.
- Confirm Feishu `4o-mini` is not claimed as current post-reload inbound truth.
- Confirm DingTalk/WeCom nano behavior is framed as router `COMPLEX` tier selection, not router bypass.
- Confirm no model hardcoding is being requested.
- Confirm the proposed Worker write-set is sufficient and does not overlap active owners.
- Confirm current-turn sanitizer, active-instance filtering, stale evidence classification, single-model regression, and secret safety are all covered.

### Worker Gate

- Entry requires Spec Review approval of the spec and Worker write-set.
- Worker must follow the approved write-set only.
- Worker must add failing source tests before implementation changes.
- Worker must preserve `opensparrow-router` and `opensparrow-router/auto`.
- Worker must preserve single-model mode.
- Worker must add or update diagnostics without raw channel envelopes, raw user text, or secrets.
- Worker must run approved source verification commands.
- Worker must not patch `dist/**` manually.
- Worker must not write docs, longrun, Mem0, or frozen `specs/**`.
- If Worker Gate is not `DONE`, the packet returns to Worker scope or Spec Review if scope is wrong.

### Batch Review Gate

- Batch Review must review scope drift, authority drift, input-boundary behavior, active-instance filtering, diagnostics, and forbidden write-set.
- Batch Review must verify no model hardcoding was introduced.
- Batch Review must verify source tests cover every source-coverable acceptance matrix row.
- Batch Review must verify no secret-shaped values, raw channel envelopes, or raw user text appear in diff, fixtures, logs, or test output.
- If Batch Review is not `APPROVED`, the packet returns to Worker Gate or Spec Review, depending on the finding.

### Batch Verify Gate

- Batch Verify must build and launch a fresh mac package.
- Batch Verify must prove active instance identity before collecting channel evidence.
- Batch Verify must verify DingTalk and WeCom simple wrapped prompts route `SIMPLE/gpt-4o`.
- Batch Verify must reject stale/pre-reload Feishu `4o-mini` evidence as current authority unless active post-reload inbound evidence exists.
- Batch Verify must verify literal JSON metadata and channel envelopes do not trigger `COMPLEX`.
- Batch Verify must verify prior complex turn/shared `agent:main:main` history does not affect latest simple prompt.
- Batch Verify must verify single-model regression.
- Batch Verify must run secret scans and report exact surfaces inspected.
- If Batch Verify is not `PASS`, the packet returns to Worker Gate or Batch Review Gate, depending on the failure.

### Closer Gate

- Closer Gate entry requires Spec Review approval, Worker Gate `DONE`, Batch Review Gate `APPROVED`, and Batch Verify Gate `PASS`.
- Closer writes facts-only closeout to allowed docs/longrun surfaces after verification, not before.
- Closer may write durable Mem0 facts only after Batch Review `APPROVED` and Batch Verify `PASS`, with `metadata.project = opensparrow`.
- Closer must not rewrite spec truth from closeout notes.
- If Closer Gate cannot be satisfied, the packet remains open and returns to the failed prior gate.

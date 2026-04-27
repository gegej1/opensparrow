# Feature Specification: Packaged Mac Entry Contract Hardening

**Feature ID**: `packaged-mac-entry-contract-hardening`
**Created**: `2026-04-27`
**Status**: `pending-spec-review`
**Target worktree**: `/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-p0-packaged-mac-diagnostics`

## One Sentence

Harden the macOS packaged entry contract so source wrappers, generated package-root launchers, and package-local compatibility launchers each expose a truthful role, a truthful `packRoot`, and truthful bundled plugin readiness before any channel install runs.

## Background

User-visible failure:

- User double-clicked `platforms/mac/wrappers/01-开始部署.command`.
- The UI/server ran with source/worktree `packRoot`.
- Packaged hardening then searched the source root for `plugins/`.
- Source/worktree root has no generated `plugins/` directory.
- DingTalk install failed before requested channel readiness:
  - `plugin install failed before requested channel dingtalk was ready`
  - `未在 plugins/ 中找到 @openclaw-china/channels`

Known package truth:

- `platforms/mac/wrappers/*.command` is source template / developer surface.
- The official user first-click path is generated package root:
  - `dist/usb-pack/opensparrow-0.1.0-alpha/01-开始部署.command`
- The generated package root contains bundled archives:
  - `plugins/openclaw-china-channels-*.tgz`
  - WeCom plugin archive, currently shaped like `plugins/wecom-wecom-openclaw-plugin-*.tgz`
- The source/worktree root does not contain `plugins/`.
- `localhost:19000` can still be an old source UI. Verifiers must use the launcher-printed UI port and `/api/status.instance.packRoot`, not assume `19000` is the fresh package session.

## Authority And Scope

This feature defines an entry-contract hardening packet. It is:

- a macOS packaged entry contract packet;
- a wrapper role and runtime status truth packet;
- a bundled plugin archive diagnostics packet;
- a follow-up to the packaged mac wrapper `packRoot` and UI-port failure mode.

Spec Review state:

- The current packet is not dispatchable to Worker while the reviewer verdict is `APPROVED_WITH_REQUIRED_FIXES`.
- Worker implementation may start only after a Spec Reviewer returns verdict `APPROVED` on `spec.md`, `plan.md`, and `tasks.md`.
- Until then, changes are limited to SpecWriter revisions of this packet.

It is not:

- a channel implementation packet;
- a model routing packet;
- a Windows packet;
- a vendor binary edit packet;
- a manual hotfix to `dist/`;
- a request to make source templates a user packaged install surface.

## Entry Role Contract

### 1. Source wrapper developer/debug surface

`platforms/mac/wrappers/01-开始部署.command` is a source template and developer surface.

If it is double-clicked or executed from the source/worktree root, it must:

1. explicitly identify itself as developer/debug mode;
2. not pretend the session is a packaged user install;
3. not silently set a generated package-root contract against the source root;
4. not require generated package bundled plugin archives unless the operator explicitly opts into that mode;
5. expose in `/api/status` that the active `packRoot` is a source/worktree root;
6. guide the user to run the generated package-root launcher for packaged validation.

Acceptable developer-mode behavior may still launch the UI for debugging, but it must not be indistinguishable from the official packaged first-click path.

### 2. Generated package root official first-click path

The only official user first-click path for packaged macOS install is:

```text
dist/usb-pack/opensparrow-0.1.0-alpha/01-开始部署.command
```

When copied into a generated package root, this launcher must:

1. resolve `packRoot` to the generated package root containing `ui/server.mjs`;
2. prefer the script directory as package root before ancestor fallbacks;
3. run in packaged runtime hardening mode;
4. set or preserve `OPENSPARROW_REQUIRE_BUNDLED_PLUGINS=1`;
5. select a free UI port if `19000` is occupied;
6. print the actual UI port before launching;
7. ensure `/api/status.instance.packRoot` points to the package root under verification;
8. never use a stale source UI on `localhost:19000` as proof of packaged readiness.

### 3. Generated `mac/01-开始部署.command` compatibility/handoff path

`dist/usb-pack/opensparrow-0.1.0-alpha/mac/01-开始部署.command` may exist for compatibility, but it is not an independent official first-click path.

It must:

1. clearly state that it is a compatibility / handoff entry;
2. find and hand off to the package root `../01-开始部署.command`;
3. preserve arguments and relevant environment;
4. avoid running a second independent packaged session from the `mac/` subdirectory;
5. avoid resolving `packRoot` to `mac/` or to the source/worktree root;
6. fail with an actionable handoff error if the package root launcher is missing.

## Bundled Plugin Readiness Status Contract

When `OPENSPARROW_REQUIRE_BUNDLED_PLUGINS=1`, `/api/status` must expose bundled plugin readiness before channel install is attempted.

The status surface must include enough structured data for the UI and verifier to distinguish these cases:

1. packaged mode with all required archives present;
2. packaged mode with a missing archive;
3. source/developer mode where bundled archives are not required;
4. source/developer mode where bundled archives were explicitly required and are missing;
5. stale UI process whose `packRoot` does not match the launcher being verified.

The exact field names may follow existing `ui/server.mjs` conventions, but the status payload must expose these facts:

- whether bundled plugins are required;
- the active `packRoot`;
- the checked `pluginsDir`;
- readiness for `@openclaw-china/channels`;
- readiness for the WeCom plugin archive;
- a `ready` boolean summarizing required bundled archive readiness;
- a `missing` list naming required package specs that were not found;
- archive basenames or relative paths for present archives, without leaking absolute local secrets.

Recommended shape:

```json
{
  "bundledPlugins": {
    "required": true,
    "ready": false,
    "pluginsDir": "<packRoot>/plugins",
    "archives": {
      "@openclaw-china/channels": {
        "required": true,
        "ready": false,
        "archive": null
      },
      "@wecom/wecom-openclaw-plugin": {
        "required": true,
        "ready": true,
        "archive": "plugins/wecom-wecom-openclaw-plugin-2026.4.22.tgz"
      }
    },
    "missing": ["@openclaw-china/channels"]
  }
}
```

## Missing Archive Error Contract

If `OPENSPARROW_REQUIRE_BUNDLED_PLUGINS=1` and a required archive is missing, the error must name the entry-contract problem.

Required error meaning:

- the current `packRoot` is not the generated delivery package root; or
- the generated delivery package is incomplete.

The error must include:

1. active `packRoot`;
2. checked `pluginsDir`;
3. missing package spec;
4. the official package-root first-click path requirement;
5. a clear instruction to relaunch from the generated package root or rebuild/reacquire a complete package.

The error must not imply that a new Mac should fall back to online plugin install. Online install is not the packaged hardening path when bundled archives are required.

Acceptable user-facing wording:

```text
打包安装要求使用随包插件归档，但当前 packRoot 不是交付包根或交付包不完整。
当前 packRoot: <path>
已检查 plugins 目录: <path>/plugins
缺少归档: @openclaw-china/channels
请从交付包根目录的 01-开始部署.command 启动，或重新生成/获取包含 plugins/ 的完整交付包。
```

## Functional Requirements

- **FR-001**: Direct source wrapper launch must be explicitly developer/debug mode and must not masquerade as packaged install.
- **FR-002**: Generated package-root `01-开始部署.command` is the only official packaged macOS first-click path.
- **FR-003**: Generated `mac/01-开始部署.command` is compatibility/handoff only and must transfer to the package-root launcher.
- **FR-004**: `/api/status` must expose bundled plugin readiness whenever `OPENSPARROW_REQUIRE_BUNDLED_PLUGINS=1`.
- **FR-005**: Missing bundled archive errors must point to wrong `packRoot` or incomplete package, not to new-Mac online install fallback.
- **FR-006**: Verification must cover source wrapper, package-root wrapper, and package `mac/01-开始部署.command`.
- **FR-007**: Verification must treat `localhost:19000` as untrusted until `/api/status.instance.packRoot` and the printed UI port match the session under test.
- **FR-008**: The build pipeline must generate the package-root and `mac/` launcher roles without requiring manual edits in `dist/`.
- **FR-009**: No implementation may modify `vendor/**`, checked-in credentials, or generated `dist/**` as the source of truth.

## Acceptance Matrix

| Launch path | Required role | Expected mode | Expected `packRoot` | Bundled plugin requirement | Required observable evidence |
| --- | --- | --- | --- | --- | --- |
| `platforms/mac/wrappers/01-开始部署.command` | Source template / developer surface | Developer/debug | Source/worktree root | Off by default unless explicitly requested | Launcher output and `/api/status` identify developer/source mode. It must not claim official packaged install. |
| `dist/usb-pack/opensparrow-0.1.0-alpha/01-开始部署.command` | Only official packaged first-click path | Packaged hardening | Generated package root | Required | Launcher prints actual UI port. `/api/status.instance.packRoot` equals generated package root. `/api/status.bundledPlugins.ready=true` when required archives exist. |
| `dist/usb-pack/opensparrow-0.1.0-alpha/mac/01-开始部署.command` | Compatibility / handoff | Handoff to package root | Generated package root after handoff | Required after handoff | Output states handoff role, transfers to `../01-开始部署.command`, and final `/api/status.instance.packRoot` equals generated package root. |

## Source Acceptance

Source-level acceptance requires:

1. a test proving source wrapper launch is classified as developer/debug mode;
2. a test proving package-root launcher candidate resolution prefers script directory before source ancestor fallback;
3. a test proving generated `mac/01-开始部署.command` is handoff-only;
4. a test proving `/api/status` exposes bundled plugin readiness when `OPENSPARROW_REQUIRE_BUNDLED_PLUGINS=1`;
5. a test proving missing archive errors name wrong `packRoot` or incomplete package;
6. existing packaged install guard tests still pass;
7. `bash -n platforms/mac/wrappers/*.command` passes;
8. no code or test depends on mutating `dist/` manually.

## Packaged Acceptance

Packaged acceptance requires a fresh generated package, not a stale running source process:

1. build or select a fresh package root;
2. launch package-root `01-开始部署.command` with `OPENSPARROW_AUTO_OPEN=0` and isolated state;
3. leave any old source UI on `19000` running during at least one smoke to prove free UI port selection and stale-port avoidance;
4. use the printed UI port for status checks;
5. verify `/api/status.instance.packRoot` equals the generated package root;
6. verify `/api/status.bundledPlugins.ready=true` for the package containing required archives;
7. verify DingTalk archive readiness for `@openclaw-china/channels`;
8. verify WeCom archive readiness for the bundled WeCom plugin;
9. launch generated `mac/01-开始部署.command` and verify it hands off to the package-root launcher;
10. simulate or create an incomplete package without `plugins/openclaw-china-channels-*.tgz` and verify the error points to wrong `packRoot` or incomplete package.

## Negative Acceptance

Reject the implementation if any of these happen:

- source wrapper launch reports itself as official packaged install;
- source wrapper launch requires bundled archives by default and fails against the source root `plugins/`;
- package-root launch resolves `packRoot` to the source/worktree root;
- package `mac/01-开始部署.command` starts an independent session instead of handoff;
- `/api/status` hides bundled plugin readiness while `OPENSPARROW_REQUIRE_BUNDLED_PLUGINS=1`;
- missing archive error suggests online install as the fix for packaged hardening mode;
- verifier uses `localhost:19000` without checking the printed UI port and `instance.packRoot`;
- the fix edits `vendor/**` or manually patches `dist/**` as source truth.

## Suggested Read Areas For Approved Worker

These paths are suggested read areas only after the Spec Review Gate returns `APPROVED`; they do not authorize Worker dispatch while this packet remains `pending-spec-review`.

Read:

- `platforms/mac/wrappers/01-开始部署.command`
- `platforms/mac/wrappers/run-openclaw-usb.command`
- `platforms/mac/wrappers/harden-openclaw-usb.command`
- `scripts/build-usb-pack.sh`
- `ui/server.mjs`
- `ui/install-helpers.mjs`
- `ui/tests/packaged-mac-wrapper-hardening.test.mjs`
- `ui/tests/packaged-install-retry-guards.test.mjs`
- `ui/tests/packaged-runtime-status-authority.test.mjs`
- `docs/usb-pack/INSTALL.md`
- `docs/usb-pack/SOP.md`
- `docs/runbooks/release-process.md`
- `docs/release-checklist.md`

Do not modify `vendor/**` or generated `dist/**` directly.

## Stop Rules

Stop and report if:

1. satisfying the contract requires editing OpenClaw vendor binaries;
2. the build pipeline cannot produce separate package-root and `mac/` roles without a packaging design decision;
3. a live failure can only be reproduced through a stale source UI and not a fresh package-root launch;
4. fixing this requires channel-specific install changes outside bundled archive readiness and error reporting;
5. evidence includes secrets, bearer tokens, or unredacted local credential files.

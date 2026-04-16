# Packaged Mac Release Surface Inventory

## 1. A1 scope / non-goals

- Scope: only the packaged macOS candidate artifact at `dist/handoff/opensparrow-mac-ui-full-arm64-20260414-162747/opensparrow-0.1.0-alpha-mac-ui-arm64`.
- Goal: freeze tonight's packaged official support surface, wrapper roles, packaged wording boundary, WeCom outward promise boundary, and runtime/plugin/artifact blocker attribution.
- This packet is inventory-only. It does not modify source, package contents, runtime, plugins, or release process.
- This packet does not reopen `F-026`, does not merge `F-025-B`, and does not reframe true `F-014` away from bot-first long-connection semantics.
- This packet does not extend into broader docs parity, Windows support, callback/self-built-app enhancement work, companion full support, or packaging rebuild execution.

## 2. Candidate artifact overview

- Candidate root includes the packaged UI surface, packaged docs, packaged runbooks, packaged plugins, and packaged runtime under `vendor/mac-openclaw/`.
- Present first-click entries:
  - root `01-开始部署.command`
  - `mac/01-开始部署.command`
  - `mac/run-openclaw-usb.command`
  - `mac/harden-openclaw-usb.command`
- Present UI surface:
  - `ui/server.mjs`
  - `ui/public/index.html`
  - `ui/public/dashboard.html`
- Present packaged docs / runbooks:
  - `README.md`
  - `README.txt`
  - `docs/INSTALL.md`
  - `docs/SOP.md`
  - `runbooks/F-005-ui-install-reset.md`
  - `runbooks/release-process.md`
- Present plugin archives:
  - `plugins/openclaw-china-channels-2026.3.29.tgz`
  - `plugins/sunnoy-wecom-3.0.0.tgz`
- Present runtime payload:
  - `vendor/mac-openclaw/lib/node_modules/openclaw/package.json` with version `2026.3.23`
- No packaged `companion/` entry was found in the candidate root. On the current reread, companion is not a first-order packaged support surface.

## 3. Official support surface

### 3.1 Frozen official first-click path

- Tonight's only admissible packaged official first-click path is root `01-开始部署.command`.
- `ui/server.mjs` plus `ui/public/index.html` and `ui/public/dashboard.html` remain the packaged UI-first control surface behind that launcher.
- This is consistent with the already frozen `F-003` direction: UI-first launcher remains the authority, and secondary wrappers must not drift back into direct install/control ownership.

### 3.2 Current packaged role drift

- The candidate still ships `mac/run-openclaw-usb.command` and `mac/harden-openclaw-usb.command` as executable surfaces.
- `docs/SOP.md` still instructs users to run `mac/run-openclaw-usb.command` directly as the macOS install path.
- `README.txt` still presents hardening wrappers as ordinary quick-start-visible surfaces.
- Therefore the current package has not yet frozen secondary wrappers into handoff / advanced compatibility only. They are still outwardly exposed close to a primary path.

### 3.3 Companion exposure conclusion

- No packaged `companion/` chain was observed in the candidate root.
- Based on this reread, companion is not currently an unavoidable entry for tonight's package.
- No companion-specific Commander decision is required unless later packaging cuts re-expose companion files or instructions.

## 4. Packaged wording inventory

### 4.1 Primary-path wording

- `README.txt` points mac users to root `01-开始部署.command`, which matches the desired official first-click path.
- `docs/INSTALL.md` also uses root `01-开始部署.command` for the mac install walkthrough.
- `docs/SOP.md` conflicts with that by routing mac install through `mac/run-openclaw-usb.command`, which is now only admissible as handoff / advanced compatibility.
- `runbooks/F-005-ui-install-reset.md` and `runbooks/release-process.md` still describe repo-internal paths such as `platforms/mac/wrappers/...`, which are not the packaged artifact surface.

### 4.2 Windows / legacy / source-repo leakage

- `README.md`, `README.txt`, `docs/INSTALL.md`, `docs/SOP.md`, and `runbooks/release-process.md` still outwardly expose Windows paths or Windows operational steps.
- The packaged candidate does not include the referenced Windows wrapper files such as `one-click-deploy.cmd`, `one-click-deploy.ps1`, or `windows/run-openclaw-usb.cmd`.
- `README.md` still behaves like a unified source-repo landing page, including references like `docs/usb-pack/INSTALL.md`, `platforms/`, `specs/`, `longrun/`, `.specify/`, and `.codex/`, rather than a packaged release README.
- This is a packaged wording problem, not a new Windows feature scope. The package is over-promising surfaces that the candidate does not actually ship tonight.

### 4.3 Channel wording boundary

- `README.txt` outwardly claims support for `Feishu / DingTalk / WeCom`.
- `docs/INSTALL.md` only walks through Feishu and DingTalk credentials and install flow.
- `ui/public/index.html` exposes WeCom as an installable UI channel.
- On the current packaged reread, the UI wording itself still stays within true `F-014` boundaries: WeCom is presented as a bot-first, long-connection path with `Bot ID + Bot Secret` as the main chain, while callback / self-built-app fields are treated as enhancement-only.
- Current packaged wording therefore does not yet present a single release-grade channel promise boundary.

## 5. Runtime / plugin readiness inventory

### 5.1 Packaged runtime state

- The packaged runtime includes `openclaw` version `2026.3.23` at `vendor/mac-openclaw/lib/node_modules/openclaw/package.json`.
- Packaged `ui/server.mjs` sets `WECOM_MIN_OPENCLAW_VERSION = '2026.3.23'`, so the candidate's own preflight threshold is nominally satisfied.
- The packaged launcher scripts are syntactically valid, and packaged `ui/server.mjs` passes `node --check`.

### 5.2 Packaged plugin state

- The WeCom plugin archive `plugins/sunnoy-wecom-3.0.0.tgz` is present.
- Its `package.json` declares `peerDependencies.openclaw = ^2026.3.23-2`.
- The packaged runtime is only `2026.3.23`, so the bundled runtime/plugin pair is internally inconsistent on the candidate reread.
- This is a runtime/plugin compatibility blocker for outward WeCom promise. It is not evidence that true `F-014` failed; it is evidence that tonight's bundled artifact pair is not yet release-ready for WeCom promise.

### 5.3 China channels bundle state

- `plugins/openclaw-china-channels-2026.3.29.tgz` is present and packaged as a general unified channel bundle.
- This packet does not assert live install success for that archive; it only records archive presence and packaged metadata.

## 6. Divergence / blocker table

| ID | Surface | Finding | Type | Current attribution | Release impact | A2 admissible? |
| --- | --- | --- | --- | --- | --- | --- |
| PKG-DIV-001 | official support / wrappers | Root `01-开始部署.command` is the only admissible official first-click path, but `docs/SOP.md` still routes mac install through `mac/run-openclaw-usb.command` | release wording gap | packaged reread | blocker | yes |
| PKG-DIV-002 | secondary wrappers | `mac/run-openclaw-usb.command` is still a legacy Feishu direct-install path, not handoff / advanced compatibility only | implementation gap + packaged role drift | packaged reread | blocker | yes |
| PKG-DIV-003 | secondary wrappers | `mac/harden-openclaw-usb.command` is still a legacy Feishu hardening path, not handoff / advanced compatibility only | implementation gap + packaged role drift | packaged reread | blocker | yes |
| PKG-DIV-004 | launcher / dashboard authority | Candidate launcher/dashboard surface still predates `F-026` closeout behavior: packaged launcher keeps older runtime-root logic and packaged dashboard still hardcodes gateway port `18889` | artifact-generation gap | packaged reread against frozen `F-026` baseline | blocker | yes |
| PKG-DIV-005 | packaged docs | `README.md` is still source-repo oriented and points to missing packaged paths such as `docs/usb-pack/INSTALL.md` | release wording gap | packaged reread | blocker | yes |
| PKG-DIV-006 | packaged docs | `README.txt`, `docs/INSTALL.md`, `docs/SOP.md`, `runbooks/release-process.md` still expose Windows paths/steps that the candidate does not ship tonight | release wording gap | packaged reread | blocker | yes |
| PKG-DIV-007 | channel promise | `README.txt` promises WeCom, `docs/INSTALL.md` omits it, and UI exposes it; packaged outward promise boundary is inconsistent | release wording gap | packaged reread | blocker | yes |
| PKG-DIV-008 | runtime / plugin | Bundled WeCom plugin requires `openclaw ^2026.3.23-2` while packaged runtime is `2026.3.23` | runtime/plugin blocker | packaged reread | blocker | yes, after Commander scope decision |
| PKG-DIV-009 | support policy | Secondary wrappers are still visible enough that a user can reasonably mistake them for supported primary operational paths | Commander decision + wording/packaging boundary | packaged reread | decision point | no, needs Commander policy freeze |

## 7. A2 admissible set

### 7.1 Directly admissible for `PKT-027-A2`

- Recut the packaged Mac artifact so the shipped launcher and dashboard replay the already frozen `F-026` authority rather than an older pre-closeout state.
- Demote `mac/run-openclaw-usb.command` and `mac/harden-openclaw-usb.command` to handoff / advanced compatibility only, or otherwise stop exposing them as install-primary surfaces.
- Rewrite packaged-facing docs so tonight's packaged release only promises the actual Mac UI-first support surface that is shipped in the artifact.
- Remove or neutralize packaged Windows references that over-promise non-shipped paths in this Mac-only release candidate.
- Align packaged channel wording so outward promise, install docs, and UI surface do not contradict each other.

### 7.2 Admissible only after Commander direction

- WeCom can remain in tonight's outward release promise only if Commander chooses to keep WeCom in-scope **and** A2 (or its dependent packaging follow-up) resolves the bundled runtime/plugin incompatibility.
- If Commander chooses to de-scope WeCom for tonight, A2 may instead narrow packaged wording so the candidate no longer outwardly promises packaged WeCom readiness.
- A2 should not guess between those two release positions without Commander instruction because this changes the outward first-release support promise.

## 8. Commander decision points

- Decide whether tonight's packaged release outwardly promises WeCom at all.
  - If yes: bundled runtime/plugin compatibility must be treated as a release blocker and cleared before release.
  - If no: packaged wording and UI-facing promise must be narrowed accordingly for the release cut.
- Decide whether secondary wrappers should remain visibly shipped in the artifact root/menu path or be retained only as advanced compatibility assets with explicit demotion.
- Decide whether source-repo-oriented documents (`README.md`, packaged runbooks) stay in the release artifact at all, or whether tonight's release should carry only release-facing docs.

## 9. Explicit out-of-scope items

- No Windows release readiness conclusions beyond packaged over-promise attribution.
- No reopening of `F-026`; this packet only records that the packaged candidate appears to predate the already frozen `F-026` closeout state.
- No reopening of true `F-014`; WeCom bot-first + long-connection remains the only admissible interpretation when WeCom is promised.
- No callback / self-built-app enhancement expansion.
- No broader docs parity beyond directly packaged release wording.
- No companion full-support decision beyond the current observation that companion is not directly exposed in this candidate.
- No packaging rebuild, runtime replacement, plugin replacement, or live install verification.

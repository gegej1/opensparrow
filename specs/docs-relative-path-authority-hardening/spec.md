# Feature Specification: Docs Relative Path Authority Hardening

**Feature ID**: `docs-relative-path-authority-hardening`
**Created**: `2026-05-02`
**Status**: `closed-facts-only`
**Target worktree evidence, not user command**: `/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-p0-packaged-mac-diagnostics`

## One Sentence

Harden source pull, build, and packaged macOS run documentation so user-facing instructions use repo-relative or package-relative paths, while historical and verifier absolute paths remain preserved only as labeled evidence.

## Background

The current OpenSparrow / GTClaw packaged mac documentation has two different path needs:

- User and developer operation instructions must be portable across machines.
- Historical diagnostics, spec target worktrees, build artifacts, and verifier evidence sometimes need absolute paths for traceability.

The failure mode is mixing those two surfaces. A reader can see `/Users/eduardogan/...`, `/private/tmp/...`, `.config/superpowers`, or `Desktop/GHJProject` near pull/build/run instructions and infer that those local paths are required. This packet freezes the authority rule: user-visible commands must be relative; evidence paths may remain only when clearly labeled as evidence and not presented as instructions.

## Authority And Scope

This packet governs documentation path authority for:

- root `README.md` source pull, build, and packaged mac run instructions;
- release-facing install and SOP docs copied into the generated package;
- generated package `README.md` and `README.txt` templates emitted by `scripts/build-usb-pack.sh`;
- docs that tell operators how to build, open, or run the packaged mac artifact;
- verification commands that prove those docs remain path-portable after a fresh build.

This packet does not implement runtime behavior, channel behavior, router behavior, wrapper behavior, vendor binary changes, or package layout changes.

## Scope

In scope:

- Classify local absolute paths in docs as `MUST FIX`, `ALLOWED WITH LABEL`, or `GENERATED DOCS`.
- Make user-facing pull/build/run instructions use repo-relative or package-relative commands.
- Require README to state that `dist/` is generated and not committed.
- Require README to state that `vendor/` runtime is not currently in GitHub source checkout, so a source pull alone cannot fully build/run on a new machine.
- Ensure generated packaged docs stay package-relative after `bash scripts/build-usb-pack.sh --platform mac`.
- Add verification commands for local path leakage, generated docs, fresh build output, diff hygiene, and secret safety.

Out of scope:

- Editing `dist/**` directly.
- Editing `vendor/**`, runtime binaries, `node_modules/**`, `bin/**`, `lib/**`, `share/**`, or `*.exe`.
- Changing macOS launcher behavior or package runtime behavior.
- Rewriting historical evidence or deleting diagnostic records only because they contain absolute paths.
- Declaring DingTalk, WeCom, Feishu, model routing, or packaged install PASS.
- Writing Mem0 in this SpecWriter round.

## Path Classification Rules

### 1. MUST FIX

Any local absolute path is a blocker when it appears in user-facing operation instructions, including:

- README quick start or source checkout instructions;
- pull / build / run guides;
- release process instructions telling users or developers what to type;
- delivery package install guides;
- generated package `README.md`, `README.txt`, `docs/INSTALL.md`, or `docs/SOP.md`;
- any command block that tells the reader to `cd` into, open, launch, or inspect a local maintainer path.

Forbidden in these surfaces:

- `cd /Users/...`
- `open /Users/.../dist/...`
- `bash /Users/.../scripts/build-usb-pack.sh`
- `/private/tmp/...` as a user action target
- `.config/superpowers/...` as a user action target
- `Desktop/GHJProject/...` as a required action target

Required replacements:

```bash
bash scripts/build-usb-pack.sh --platform mac
PACK_ROOT="dist/usb-pack/opensparrow-$(cat VERSION)"
open "$PACK_ROOT"
bash "$PACK_ROOT/01-开始部署.command"
```

Package-root instructions must be relative to the package root:

```bash
./01-开始部署.command
file ./vendor/mac-openclaw/bin/node
cat ./vendor/mac-openclaw/RUNTIME_TRUTH.json
find . -type d -name ".gtclaw-state"
```

MUST FIX also includes any historical or verifier path that is written as the next thing a user should run. If an absolute path appears in an operation step, command block, checklist item, or quick start without an evidence label, treat it as user instruction and fix it.

### 2. ALLOWED WITH LABEL

Absolute paths may remain when they are evidence, not instructions. Allowed examples:

- spec target worktree identity;
- historical artifact paths;
- historical Desktop bundle paths;
- local verifier evidence;
- local isolated `HOME` / `OPENCLAW_HOME` fixtures;
- prior `/private/tmp` rebuild, replay, capture, screenshot, or zip evidence;
- longrun progress entries preserving exact historical state.

Required label semantics:

- `Target worktree evidence, not user command`
- `Historical artifact evidence`
- `Local verifier evidence`
- `Historical diagnostic evidence`
- `Do not run this path as an install command`

If a current document keeps an absolute path for evidence, the surrounding paragraph must make it clear that the path is not a current user operation. If the paragraph tells the reader to execute, open, or launch that path, the item moves to `MUST FIX`.

### 3. GENERATED DOCS

Generated package docs are governed at their source, not by hand-editing `dist/**`.

`scripts/build-usb-pack.sh` currently copies or emits release-facing docs into:

- `dist/usb-pack/opensparrow-$(cat VERSION)/README.md`
- `dist/usb-pack/opensparrow-$(cat VERSION)/README.txt`
- `dist/usb-pack/opensparrow-$(cat VERSION)/docs/INSTALL.md`
- `dist/usb-pack/opensparrow-$(cat VERSION)/docs/SOP.md`

Those generated docs must:

- use package-relative paths;
- never tell users to `cd` to `/Users/...`;
- never require `.config/superpowers`, `Desktop/GHJProject`, or `/private/tmp` paths;
- keep package-root first-click instructions as `01-开始部署.command` or `./01-开始部署.command`;
- keep runtime checks package-relative, such as `file ./vendor/mac-openclaw/bin/node`;
- keep package-local diagnostics package-relative, such as `find ./.gtclaw-state ...`.

`dist/` is not an artificial source of truth. Do not edit generated files under `dist/**` directly to make the scan pass. Fix source docs or generated doc templates, then rebuild.

## Vendor And Dist Boundary

README and related source pull/build instructions must state:

- `dist/` is generated output and is not committed to Git.
- After pulling source from GitHub, a maintainer must run a local build to recreate `dist/usb-pack/opensparrow-$(cat VERSION)`.
- `vendor/` runtime is currently not committed to GitHub.
- A new machine with only a GitHub source checkout cannot fully build or run packaged mac without first restoring the required vendor runtime or using a complete exported delivery package.
- The source pull path must not be described as "pull and run directly" unless vendor runtime and generated package prerequisites are explicitly satisfied.

Acceptable wording:

```text
GitHub source checkout contains docs, scripts, UI source, specs, and longrun state. It does not currently include generated `dist/` output or `vendor/` runtime binaries. To build locally, restore the required vendor runtime first, then run `bash scripts/build-usb-pack.sh --platform mac`.
```

## Functional Requirements

- **FR-001**: README pull/build/run instructions use only repo-relative paths and commands.
- **FR-002**: README states `dist/` is generated output, not committed, and must be rebuilt after source pull.
- **FR-003**: README states `vendor/` runtime is not currently in GitHub source checkout and source pull alone cannot fully build/run on a new machine.
- **FR-004**: Release-facing install docs use package-relative paths for user actions.
- **FR-005**: `scripts/build-usb-pack.sh` generated package README templates remain package-relative.
- **FR-006**: Historical and verifier absolute paths in spec, closeout, current-status, longrun, or diagnostics may remain only with evidence labels.
- **FR-007**: Any absolute path currently written as an operation step is reclassified as `MUST FIX`.
- **FR-008**: Verification includes source doc scans, README command review, fresh mac build, generated doc scans, `git diff --check`, and secret/raw-payload safety checks.
- **FR-009**: No worker directly edits `dist/**` to fix generated docs.
- **FR-010**: No packet role writes raw user text, raw channel envelopes, raw JSON metadata, API keys, auth profiles, gateway tokens, bearer tokens, or channel secrets.

## Acceptance Criteria

1. `README.md` source pull/build/run section contains no local maintainer absolute path in command blocks or action steps.
2. `README.md` uses `bash scripts/build-usb-pack.sh --platform mac`, `PACK_ROOT="dist/usb-pack/opensparrow-$(cat VERSION)"`, `open "$PACK_ROOT"`, and package-root launcher examples.
3. `README.md` clearly says `dist/` is generated and not committed.
4. `README.md` clearly says `vendor/` runtime is not currently in GitHub source checkout, and a fresh source pull needs vendor runtime or a full delivery package.
5. `docs/usb-pack/INSTALL.md` and `docs/usb-pack/SOP.md` contain no user-action command requiring local maintainer absolute paths.
6. Any absolute paths retained in `docs/current-status.md`, `docs/packaged-mac-diagnostics.md`, specs, closeouts, or longrun are labeled as historical artifact evidence, target worktree evidence, or local verifier evidence.
7. `scripts/build-usb-pack.sh` generated `README.md` and `README.txt` templates contain only package-relative user instructions.
8. Fresh generated package docs under `dist/usb-pack/opensparrow-$(cat VERSION)` pass the local path scan for user-visible docs.
9. `git diff --check` passes.
10. Secret/raw-payload scan finds no committed raw credentials, raw channel envelopes, raw user text, raw JSON metadata, gateway tokens, bearer tokens, or channel secrets introduced by this packet.

## Negative Acceptance

Reject the implementation if any of these are true:

- README tells users to `cd` into `/Users/...` or `.config/superpowers/...`.
- README implies source pull alone is enough to run packaged mac on a new machine without `vendor/` runtime or a complete delivery package.
- Generated package docs require `/Users/...`, `/private/tmp/...`, `.config/superpowers`, or `Desktop/GHJProject` as user action paths.
- A worker fixes generated docs by editing `dist/**` directly.
- Historical evidence paths are deleted wholesale without preserving traceability.
- Historical evidence paths remain unlabeled in a way that reads like an operation step.
- Verification scans all historical evidence and then treats expected labeled evidence as failure without classification.
- Any credentials, tokens, raw user text, raw channel envelopes, or raw JSON metadata are written into specs, docs, logs, or final evidence.

## Suggested Future Worker Write-Set

Future Worker should keep changes documentation-only except for generated documentation templates inside the build script:

- `README.md`
- `docs/usb-pack/INSTALL.md`
- `docs/usb-pack/SOP.md`
- `docs/runbooks/release-process.md` if it contains build/release user commands needing relative-path governance
- `docs/release-checklist.md` if present and if it contains release commands needing relative-path governance
- `docs/architecture-overview.md` or `docs/runtime-flow.md` only if they present absolute paths as user operation guidance
- `docs/current-status.md` only to add evidence labels, not to delete historical evidence
- `docs/packaged-mac-diagnostics.md` only to add evidence labels, not to rewrite accepted closeout facts
- `scripts/build-usb-pack.sh` only for generated `README.md` / `README.txt` text, not runtime or packaging behavior
- `longrun/workspaces/opensparrow-unified/feature_list.json` and `longrun/workspaces/opensparrow-unified/claude-progress.txt` only at closeout after review and verify gates

Do not write:

- `dist/**`
- `vendor/**`
- `ui/**`
- `platforms/**`
- runtime scripts outside generated documentation text
- credentials or local auth/config files

## Batch Review And Batch Verify Required Commands

Batch Review must inspect:

```bash
git diff -- README.md docs/usb-pack/INSTALL.md docs/usb-pack/SOP.md scripts/build-usb-pack.sh specs/docs-relative-path-authority-hardening
```

Batch Verify must run at minimum:

```bash
rg -n '/Users/|/private/tmp/|\.config/superpowers|Desktop/GHJProject' README.md docs/usb-pack/INSTALL.md docs/usb-pack/SOP.md
rg -n 'cd /Users|bash /Users|open /Users|\.config/superpowers|Desktop/GHJProject' README.md
bash -n scripts/build-usb-pack.sh
bash scripts/build-usb-pack.sh --platform mac
PACK_ROOT="dist/usb-pack/opensparrow-$(cat VERSION)"
test -d "$PACK_ROOT"
rg -n '/Users/|/private/tmp/|\.config/superpowers|Desktop/GHJProject' "$PACK_ROOT/README.md" "$PACK_ROOT/README.txt" "$PACK_ROOT/docs/INSTALL.md" "$PACK_ROOT/docs/SOP.md"
git diff --check
```

Batch Verify must also perform a secrets/raw-payload safety review on changed files. The exact command can be expanded by the verifier, but it must include changed specs/docs/templates and must reject raw API keys, bearer tokens, auth profiles, gateway tokens, channel secrets, raw channel envelopes, raw user text, and raw JSON metadata.

## Current SpecWriter Round Boundary

This SpecWriter round only creates:

- `specs/docs-relative-path-authority-hardening/spec.md`
- `specs/docs-relative-path-authority-hardening/plan.md`
- `specs/docs-relative-path-authority-hardening/tasks.md`

This round does not:

- modify business code;
- modify runtime behavior;
- directly edit `dist/**`;
- edit README or any actual product docs;
- write Mem0.

The packet stops at Spec Review gate.

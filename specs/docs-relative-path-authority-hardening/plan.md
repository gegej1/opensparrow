# Docs Relative Path Authority Hardening Implementation Plan

> **For future approved agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task only after the Spec Review Gate returns `APPROVED`. Steps use checkbox syntax in `tasks.md` for tracking.

**Goal:** Make source pull, local build, and packaged mac run documentation portable by using repo-relative or package-relative paths while preserving labeled historical evidence.
**Architecture:** Treat docs as three surfaces: user operation docs, labeled evidence docs, and generated package docs. Fix operation docs at their maintained source, keep evidence paths only with labels, and verify fresh generated package docs after rebuilding from source.
**Tech Stack:** Markdown docs, Bash-generated release README templates in `scripts/build-usb-pack.sh`, `rg`, `bash -n`, fresh `scripts/build-usb-pack.sh --platform mac`, `git diff --check`.

---

## Packet Guard

- Packet identity: `docs-relative-path-authority-hardening`.
- Current state: `pending-spec-review`.
- This is a documentation authority packet.
- Do not implement runtime behavior.
- Do not edit generated `dist/**` directly.
- Do not edit `vendor/**`.
- Do not remove historical evidence only because it contains local absolute paths.
- Do not write raw user text, raw channel envelopes, raw JSON metadata, API keys, auth profiles, gateway tokens, bearer tokens, or channel secrets.
- This SpecWriter round does not write Mem0.

## File Structure And Ownership

Future implementation should use serial or disjoint write-sets.

### Worker-A: README source pull/build/run authority

Allowed write-set:

- `README.md`

Responsibilities:

- Ensure source pull/build/run commands are repo-relative.
- Preserve package-root `PACK_ROOT="dist/usb-pack/opensparrow-$(cat VERSION)"` pattern.
- State `dist/` generated-output boundary.
- State `vendor/` runtime source-checkout boundary.
- Avoid "pull and run directly" wording.

Forbidden:

- `docs/**`
- `scripts/**`
- `dist/**`
- runtime code

### Worker-B: Release-facing docs and evidence labels

Allowed write-set:

- `docs/usb-pack/INSTALL.md`
- `docs/usb-pack/SOP.md`
- `docs/current-status.md` only for evidence labels
- `docs/packaged-mac-diagnostics.md` only for evidence labels
- optional operation docs such as `docs/runbooks/release-process.md`, `docs/release-checklist.md`, `docs/architecture-overview.md`, or `docs/runtime-flow.md` only when they contain user operation paths that violate the spec

Responsibilities:

- Keep install/SOP instructions package-relative.
- Add labels when retained absolute paths are target worktree, historical artifact, or local verifier evidence.
- Do not rewrite accepted historical closeout truth.

Forbidden:

- Deleting historical evidence wholesale.
- Editing source code or generated `dist/**`.

### Worker-C: Generated package README templates and verification harness

Allowed write-set:

- `scripts/build-usb-pack.sh` only in generated `README.md` / `README.txt` text blocks.
- Optional verification helper only if the team chooses to codify the `rg` checks, such as `scripts/verify-doc-path-authority.sh`.

Responsibilities:

- Keep generated package README text package-relative.
- Rebuild fresh mac package after source changes.
- Verify generated docs under `dist/usb-pack/opensparrow-$(cat VERSION)`.

Forbidden:

- Changing packaging behavior outside release-facing doc text.
- Editing generated package docs directly.

### Closeout Writer

Allowed only after Batch Review and Batch Verify pass:

- `longrun/workspaces/opensparrow-unified/feature_list.json`
- `longrun/workspaces/opensparrow-unified/claude-progress.txt`

Responsibilities:

- Record facts supported by review and fresh verify only.
- Keep local verifier absolute paths labeled as evidence if they are recorded.
- Write no raw secrets or raw payloads.

## Phase 0: Baseline And Classification

1. Confirm worktree, branch, HEAD, and dirty state.
2. Read project rules, governance docs, constitution, longrun app spec, feature list, progress log, README, install/SOP docs, current-status, packaged diagnostics, and build script.
3. Search Mem0 read-only with `user_id=opensparrow-memory` and `metadata.project=opensparrow`.
4. Run an initial path inventory:

```bash
rg -n '/Users/|/private/tmp/|\.config/superpowers|Desktop/GHJProject' README.md docs specs scripts platforms longrun --glob '!dist/**' --glob '!vendor/**' --glob '!node_modules/**'
```

5. Classify each hit as `MUST FIX`, `ALLOWED WITH LABEL`, or unrelated frozen/reference context.

Done when the worker can explain which paths are user operation blockers and which paths are historical evidence.

## Phase 1: README Source Pull/Build/Run

Edit `README.md` only.

Required source pull/build/run command shape:

```bash
git pull --ff-only
bash scripts/build-usb-pack.sh --platform mac
PACK_ROOT="dist/usb-pack/opensparrow-$(cat VERSION)"
open "$PACK_ROOT"
bash "$PACK_ROOT/01-开始部署.command"
```

Required README boundary wording:

- `dist/` is generated and not committed.
- `vendor/` runtime is not currently in GitHub checkout.
- New machines with only source checkout need vendor runtime restored or a complete delivery package.
- `platforms/mac/wrappers/*.command` remains source template / developer debug surface.

Validation:

```bash
rg -n '/Users/|/private/tmp/|\.config/superpowers|Desktop/GHJProject' README.md
rg -n 'cd /Users|bash /Users|open /Users|Desktop/GHJProject|\.config/superpowers' README.md
```

Expected result: no matches in README user-operation text.

## Phase 2: Release-Facing Install And SOP Docs

Edit `docs/usb-pack/INSTALL.md` and `docs/usb-pack/SOP.md` only unless inventory shows another operation doc that must be fixed.

Required package-relative command shape:

```bash
./01-开始部署.command
file ./vendor/mac-openclaw/bin/node
cat ./vendor/mac-openclaw/RUNTIME_TRUTH.json
find . -type d -name ".gtclaw-state"
find ./.gtclaw-state -maxdepth 3 \( -name "install-state.json" -o -name "install.log" -o -name "diagnostic-bundle.json" \)
```

Forbidden in install/SOP user action steps:

- `/Users/...`
- `/private/tmp/...`
- `.config/superpowers/...`
- `Desktop/GHJProject/...`

Validation:

```bash
rg -n '/Users/|/private/tmp/|\.config/superpowers|Desktop/GHJProject' docs/usb-pack/INSTALL.md docs/usb-pack/SOP.md
```

Expected result: no matches in release-facing install/SOP docs.

## Phase 3: Evidence Labels In Status And Diagnostics

Edit `docs/current-status.md` and `docs/packaged-mac-diagnostics.md` only where a retained absolute path could be mistaken for a user command.

Allowed label patterns:

```text
Historical artifact evidence:
Local verifier evidence:
Target worktree evidence, not user command:
Historical diagnostic evidence, not an install command:
```

Rules:

- Do not delete accepted closeout evidence.
- Do not rewrite prior PASS or residual-risk statements.
- Do not turn historical artifact paths into current user instructions.
- If a path is in a command block or numbered operation step, convert the instruction to relative form or move the path under an evidence label.

Validation:

```bash
rg -n '/Users/|/private/tmp/|\.config/superpowers|Desktop/GHJProject' docs/current-status.md docs/packaged-mac-diagnostics.md
```

Expected result: matches may remain, but reviewer must confirm every retained match is labeled as evidence and not written as an operation step.

## Phase 4: Generated Package README Templates

Edit `scripts/build-usb-pack.sh` only inside generated `README.md` and `README.txt` content.

Generated docs must use package-relative wording:

- "Open the package root."
- `01-开始部署.command`
- `docs/INSTALL.md`
- `docs/SOP.md`
- `runbooks/F-005-ui-install-reset.md`

Generated docs must not introduce:

- source worktree paths;
- `/private/tmp` verifier paths;
- `.config/superpowers` paths;
- `Desktop/GHJProject` paths;
- commands requiring a local maintainer directory.

Validation:

```bash
bash -n scripts/build-usb-pack.sh
```

## Phase 5: Fresh Build And Generated Docs Verification

Run a fresh mac package build:

```bash
bash scripts/build-usb-pack.sh --platform mac
PACK_ROOT="dist/usb-pack/opensparrow-$(cat VERSION)"
test -d "$PACK_ROOT"
```

Verify generated docs:

```bash
rg -n '/Users/|/private/tmp/|\.config/superpowers|Desktop/GHJProject' "$PACK_ROOT/README.md" "$PACK_ROOT/README.txt" "$PACK_ROOT/docs/INSTALL.md" "$PACK_ROOT/docs/SOP.md"
```

Expected result: no matches in generated package user-visible docs.

Important: If this scan fails, do not edit files under `dist/**`. Fix the maintained source doc or template and rebuild.

## Phase 6: Secrets And Raw Payload Safety

Review changed files for forbidden material.

Forbidden:

- raw user text from live channels;
- raw channel event envelopes;
- raw JSON metadata payloads;
- API keys;
- auth profile files or secret values;
- gateway tokens;
- bearer tokens;
- channel secrets.

Suggested review command for changed files:

```bash
git diff --name-only
git diff -- README.md docs/usb-pack/INSTALL.md docs/usb-pack/SOP.md docs/current-status.md docs/packaged-mac-diagnostics.md scripts/build-usb-pack.sh specs/docs-relative-path-authority-hardening
```

Verifier may add a stricter local pattern scan, but must inspect context to avoid false positives from placeholder names.

## Phase 7: Diff Hygiene

Run:

```bash
git diff --check
git status --short
```

Expected result:

- `git diff --check` exits 0.
- `git status --short` contains only approved packet files and any explicitly authorized docs/longrun closeout files.

## Phase 8: Closeout

Closeout starts only after:

- Spec Review Gate: `APPROVED`;
- Worker implementation completed;
- Batch Review Gate: `APPROVED`;
- Batch Verify Gate: `PASS`.

Closeout may update `feature_list.json` and `claude-progress.txt` with:

- modified files;
- exact verification commands and outcomes;
- any remaining labeled evidence paths;
- statement that no `dist/**` was directly edited;
- statement that no raw secrets or raw payloads were written.

This SpecWriter round stops before Worker dispatch and before closeout.

## Stop Conditions

Stop and return to review if:

- a required user-facing doc still needs a local maintainer absolute path;
- generated docs can only be fixed by editing `dist/**`;
- the only remaining evidence paths cannot be clearly labeled without changing accepted historical truth;
- source checkout wording cannot accurately describe the `vendor/` boundary;
- verification finds a real secret, raw event envelope, raw user text, or raw JSON metadata in changed files.

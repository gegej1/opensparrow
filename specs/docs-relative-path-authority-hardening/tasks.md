# Tasks: Docs Relative Path Authority Hardening

**Feature ID**: `docs-relative-path-authority-hardening`
**Owner**: SpecWriter
**Status**: `closed-facts-only`

## Closeout Record

- [x] Packet recorded: `docs-relative-path-authority-hardening`.
- [x] Gates recorded: Spec Review `APPROVED`, Worker `DONE`, Batch Review `APPROVED`, Batch Verify `PASS`, Closer `ALLOWED`.
- [x] Source docs absolute-path scan recorded PASS for `README.md`, `docs/usb-pack/INSTALL.md`, and `docs/usb-pack/SOP.md`.
- [x] README repo-relative pull/build/run commands recorded: `git pull --ff-only`, `bash scripts/build-usb-pack.sh --platform mac`, `PACK_ROOT="dist/usb-pack/opensparrow-$(cat VERSION)"`, `open "$PACK_ROOT"`, and `bash "$PACK_ROOT/01-开始部署.command"`.
- [x] README boundary recorded: `dist/` is generated and not in git; pull requires build.
- [x] README boundary recorded: `vendor/` runtime is not currently in GitHub source checkout; a new machine needs restored vendor runtime or a complete delivery package.
- [x] INSTALL/SOP package-relative launcher examples recorded: `./01-开始部署.command`.
- [x] Fresh build evidence recorded: `bash scripts/build-usb-pack.sh --platform mac`, generated root `dist/usb-pack/opensparrow-0.1.0-alpha`, and generated `README.md`, `README.txt`, `docs/INSTALL.md`, `docs/SOP.md` with no forbidden local absolute paths.
- [x] No `dist/**` hand edit recorded; package docs were generated from source/template.
- [x] Secret/raw-payload safety recorded PASS.
- [x] Residual risk recorded: this packet only verifies docs-relative-path authority and generated package docs; it does not claim new runtime startup, packaged channel, or model-routing PASS.
- [x] Residual risk recorded: GitHub source still does not include vendor runtime; a new machine still needs restored vendor runtime or a complete delivery package.

## Global Guards

- User operation instructions must use repo-relative or package-relative paths.
- Historical and verifier absolute paths may remain only when labeled as evidence.
- `dist/**` is generated output and must not be directly edited.
- `vendor/**` runtime is not in GitHub source checkout and must not be modified by this packet.
- Do not implement business code or runtime behavior.
- Do not write raw user text, raw channel envelopes, raw JSON metadata, API keys, auth profiles, gateway tokens, bearer tokens, or channel secrets.
- This SpecWriter round writes only `spec.md`, `plan.md`, and `tasks.md`.
- This SpecWriter round does not write Mem0.
- Stop at Spec Review Gate. Do not enter Worker.

## Required Gates

### Spec Review Gate

- [ ] Spec Reviewer returns verdict `APPROVED` for `specs/docs-relative-path-authority-hardening/spec.md`.
- [ ] Spec Reviewer returns verdict `APPROVED` for `specs/docs-relative-path-authority-hardening/plan.md`.
- [ ] Spec Reviewer returns verdict `APPROVED` for `specs/docs-relative-path-authority-hardening/tasks.md`.
- [ ] If verdict is not `APPROVED`, return to SpecWriter revision only.
- [ ] Do not dispatch Worker until this gate is complete.

### Worker Write-Set Gate

- [ ] Assign exactly one owner per write-set before editing.
- [ ] Worker-A owns `README.md`.
- [ ] Worker-B owns release-facing docs and evidence labels.
- [ ] Worker-C owns generated README template text and generated-doc verification.
- [ ] If two workers need the same file, serialize that file and assign one owner.
- [ ] Confirm no worker edits `dist/**` directly.

### Batch Review Gate

- [ ] Independent reviewer reviews README source pull/build/run wording.
- [ ] Independent reviewer reviews release-facing docs and evidence labels.
- [ ] Independent reviewer reviews generated README template changes.
- [ ] Review confirms `MUST FIX`, `ALLOWED WITH LABEL`, and `GENERATED DOCS` classifications were applied correctly.
- [ ] Review confirms historical evidence was not blindly deleted.

### Batch Verify Gate

- [ ] Verifier runs source doc path scans.
- [ ] Verifier reviews README commands for relative path form.
- [ ] Verifier runs `bash -n scripts/build-usb-pack.sh`.
- [ ] Verifier runs fresh `bash scripts/build-usb-pack.sh --platform mac`.
- [ ] Verifier scans generated package docs under `dist/usb-pack/opensparrow-$(cat VERSION)`.
- [ ] Verifier runs `git diff --check`.
- [ ] Verifier confirms no secrets or raw payloads were introduced.

### Closeout Gate

- [ ] Closeout starts only after Batch Review is `APPROVED` and Batch Verify is `PASS`.
- [ ] Closeout updates longrun only with verified facts.
- [ ] Closeout records that `dist/**` was not directly edited.
- [ ] Closeout records any retained absolute paths as evidence, not user commands.
- [ ] Closeout does not rewrite runtime truth, channel truth, model routing truth, or historical packet identity.

## Phase 0: Read And Inventory

### T0.1 - Confirm Worktree

- [ ] Run `pwd`.
- [ ] Run `git branch --show-current`.
- [ ] Run `git rev-parse HEAD`.
- [ ] Run `git status --short`.
- [ ] Confirm packet identity is `docs-relative-path-authority-hardening`.

Done when:

- Worker can state target worktree, branch, HEAD, dirty state, and packet identity.

### T0.2 - Read Required Context

- [ ] Read `AGENTS.md`.
- [ ] Search Mem0 read-only with `user_id=opensparrow-memory` and `metadata.project=opensparrow`.
- [ ] Read `docs/项目持久化说明.md`.
- [ ] Read `docs/governance/README.md`.
- [ ] Read `docs/governance/framework-stack.md`.
- [ ] Read `.specify/memory/constitution.md`.
- [ ] Read `longrun/workspaces/opensparrow-unified/app_spec.md`.
- [ ] Read `longrun/workspaces/opensparrow-unified/feature_list.json`.
- [ ] Read `longrun/workspaces/opensparrow-unified/claude-progress.txt`.
- [ ] Read `README.md`.
- [ ] Read `docs/usb-pack/INSTALL.md`.
- [ ] Read `docs/usb-pack/SOP.md`.
- [ ] Read `docs/current-status.md`.
- [ ] Read `docs/packaged-mac-diagnostics.md`.
- [ ] Read `scripts/build-usb-pack.sh`.
- [ ] Read this packet `spec.md`, `plan.md`, and `tasks.md`.

Done when:

- Worker understands that this packet fixes documentation path authority, not packaged runtime behavior.

### T0.3 - Inventory Local Path Hits

Run:

```bash
rg -n '/Users/|/private/tmp/|\.config/superpowers|Desktop/GHJProject' README.md docs specs scripts platforms longrun --glob '!dist/**' --glob '!vendor/**' --glob '!node_modules/**'
```

- [ ] Mark README operation hits as `MUST FIX`.
- [ ] Mark install/SOP operation hits as `MUST FIX`.
- [ ] Mark generated README template hits as `GENERATED DOCS`.
- [ ] Mark spec target worktree hits as `ALLOWED WITH LABEL`.
- [ ] Mark current-status / diagnostics artifact evidence as `ALLOWED WITH LABEL` if clearly labeled.
- [ ] Reclassify any evidence path written as an operation step to `MUST FIX`.

Done when:

- Worker has a short hit list by category.

## Phase 1: README Path Authority

### T1.1 - Fix README Pull/Build/Run Commands

File:

- Modify `README.md`.

Required command examples:

```bash
git pull --ff-only
bash scripts/build-usb-pack.sh --platform mac
PACK_ROOT="dist/usb-pack/opensparrow-$(cat VERSION)"
open "$PACK_ROOT"
bash "$PACK_ROOT/01-开始部署.command"
```

- [ ] Remove or rewrite any README user action using `/Users/...`.
- [ ] Remove or rewrite any README user action using `.config/superpowers`.
- [ ] Remove or rewrite any README user action using `Desktop/GHJProject`.
- [ ] Keep all source commands relative to repo root.
- [ ] Keep all package run commands relative to `PACK_ROOT`.

Validate:

```bash
rg -n '/Users/|/private/tmp/|\.config/superpowers|Desktop/GHJProject' README.md
rg -n 'cd /Users|bash /Users|open /Users|Desktop/GHJProject|\.config/superpowers' README.md
```

Expected:

- No matches.

### T1.2 - Freeze README `dist/` And `vendor/` Boundaries

File:

- Modify `README.md`.

- [ ] State `dist/` is generated output and not committed.
- [ ] State pulling from GitHub requires local build to recreate `dist/usb-pack/opensparrow-$(cat VERSION)`.
- [ ] State `vendor/` runtime is not currently in GitHub source checkout.
- [ ] State a new machine with only source pull cannot fully build/run packaged mac until vendor runtime is restored.
- [ ] State using a complete exported delivery package is the alternative.
- [ ] Avoid wording that implies "pull source and directly run packaged mac".

Done when:

- README accurately describes source checkout boundaries without local maintainer paths.

## Phase 2: Release-Facing Docs

### T2.1 - Fix Install Guide User Paths

File:

- Modify `docs/usb-pack/INSTALL.md`.

- [ ] Use package-root wording for double-click instructions.
- [ ] Use `./01-开始部署.command` if a command-line package launcher example is needed.
- [ ] Use `file ./vendor/mac-openclaw/bin/node`.
- [ ] Use `cat ./vendor/mac-openclaw/RUNTIME_TRUTH.json`.
- [ ] Use package-local diagnostics paths beginning with `.`.
- [ ] Do not introduce `/Users/`, `/private/tmp/`, `.config/superpowers`, or `Desktop/GHJProject` in user action steps.

Validate:

```bash
rg -n '/Users/|/private/tmp/|\.config/superpowers|Desktop/GHJProject' docs/usb-pack/INSTALL.md
```

Expected:

- No matches.

### T2.2 - Fix SOP User Paths

File:

- Modify `docs/usb-pack/SOP.md`.

- [ ] Keep release gate checks package-relative.
- [ ] Keep `file ./vendor/mac-openclaw/bin/node`.
- [ ] Keep `cat ./vendor/mac-openclaw/RUNTIME_TRUTH.json`.
- [ ] Keep package-local log checks relative to package root.
- [ ] Do not introduce local maintainer absolute paths in standard operation or troubleshooting steps.

Validate:

```bash
rg -n '/Users/|/private/tmp/|\.config/superpowers|Desktop/GHJProject' docs/usb-pack/SOP.md
```

Expected:

- No matches.

## Phase 3: Evidence Labels

### T3.1 - Label Current Status Evidence

File:

- Modify `docs/current-status.md` only if needed.

- [ ] Keep historical artifact paths if they support traceability.
- [ ] Add labels such as `Historical artifact evidence` or `Local verifier evidence` near retained absolute paths.
- [ ] Ensure retained paths are not written as current user run commands.
- [ ] Do not remove accepted historical closeout evidence just to pass an unscoped scan.

Review command:

```bash
rg -n '/Users/|/private/tmp/|\.config/superpowers|Desktop/GHJProject' docs/current-status.md
```

Expected:

- Matches may remain only as labeled evidence.

### T3.2 - Label Packaged Diagnostics Evidence

File:

- Modify `docs/packaged-mac-diagnostics.md` only if needed.

- [ ] Keep target worktree and artifact paths if they are evidence.
- [ ] Label fresh package root paths as verifier or historical evidence when absolute.
- [ ] Keep current user operation instructions package-relative.
- [ ] Do not rewrite accepted packet closeouts.

Review command:

```bash
rg -n '/Users/|/private/tmp/|\.config/superpowers|Desktop/GHJProject' docs/packaged-mac-diagnostics.md
```

Expected:

- Matches may remain only as labeled evidence.

## Phase 4: Generated Package Docs

### T4.1 - Fix Generated README Templates

File:

- Modify `scripts/build-usb-pack.sh` only inside generated `README.md` and `README.txt` heredocs.

- [ ] Generated mac `README.md` uses package-relative user instructions.
- [ ] Generated mac `README.txt` uses package-relative user instructions.
- [ ] Generated docs do not mention local maintainer roots.
- [ ] Generated docs do not tell users to use `/private/tmp` paths.
- [ ] Generated docs do not require `.config/superpowers`.
- [ ] Generated docs do not require `Desktop/GHJProject`.
- [ ] No packaging behavior outside documentation text changes.

Validate:

```bash
bash -n scripts/build-usb-pack.sh
```

Expected:

- Exit 0.

### T4.2 - Fresh Build Generated Docs Scan

Run:

```bash
bash scripts/build-usb-pack.sh --platform mac
PACK_ROOT="dist/usb-pack/opensparrow-$(cat VERSION)"
test -d "$PACK_ROOT"
rg -n '/Users/|/private/tmp/|\.config/superpowers|Desktop/GHJProject' "$PACK_ROOT/README.md" "$PACK_ROOT/README.txt" "$PACK_ROOT/docs/INSTALL.md" "$PACK_ROOT/docs/SOP.md"
```

- [ ] Build exits 0.
- [ ] `PACK_ROOT` exists.
- [ ] Generated doc scan returns no matches.
- [ ] If scan fails, fix source docs/templates and rebuild.
- [ ] Do not edit generated `dist/**` files directly.

## Phase 5: Batch Verify Commands

### T5.1 - Source Doc Scans

Run:

```bash
rg -n '/Users/|/private/tmp/|\.config/superpowers|Desktop/GHJProject' README.md docs/usb-pack/INSTALL.md docs/usb-pack/SOP.md
rg -n 'cd /Users|bash /Users|open /Users|\.config/superpowers|Desktop/GHJProject' README.md
```

Expected:

- No matches.

### T5.2 - Generated Docs And Build Script

Run:

```bash
bash -n scripts/build-usb-pack.sh
bash scripts/build-usb-pack.sh --platform mac
PACK_ROOT="dist/usb-pack/opensparrow-$(cat VERSION)"
test -d "$PACK_ROOT"
rg -n '/Users/|/private/tmp/|\.config/superpowers|Desktop/GHJProject' "$PACK_ROOT/README.md" "$PACK_ROOT/README.txt" "$PACK_ROOT/docs/INSTALL.md" "$PACK_ROOT/docs/SOP.md"
```

Expected:

- `bash -n` exits 0.
- build exits 0.
- generated doc scan returns no matches.

### T5.3 - Diff Hygiene And Secret Safety

Run:

```bash
git diff --check
git status --short
git diff --name-only
```

- [ ] `git diff --check` exits 0.
- [ ] Diff contains only approved write-set files.
- [ ] Changed files contain no raw user text.
- [ ] Changed files contain no raw channel event envelopes.
- [ ] Changed files contain no raw JSON metadata.
- [ ] Changed files contain no API keys.
- [ ] Changed files contain no auth profile secrets.
- [ ] Changed files contain no gateway tokens.
- [ ] Changed files contain no bearer tokens.
- [ ] Changed files contain no channel secrets.

## Phase 6: Closeout

### T6.1 - Update Longrun After Gates

Files:

- `longrun/workspaces/opensparrow-unified/feature_list.json`
- `longrun/workspaces/opensparrow-unified/claude-progress.txt`

- [ ] Start only after Batch Review `APPROVED` and Batch Verify `PASS`.
- [ ] Record changed files.
- [ ] Record verification commands and outcomes.
- [ ] Record that `dist/**` was not directly edited.
- [ ] Record any retained absolute paths only as labeled evidence.
- [ ] Record no raw secrets or raw payloads were written.

### T6.2 - Stop At Spec Review For This Round

Current SpecWriter round:

- [ ] Create `specs/docs-relative-path-authority-hardening/spec.md`.
- [ ] Create `specs/docs-relative-path-authority-hardening/plan.md`.
- [ ] Create `specs/docs-relative-path-authority-hardening/tasks.md`.
- [ ] Run packet self-review.
- [ ] Run `git diff --check`.
- [ ] Stop and request Spec Review.
- [ ] Do not enter Worker.
- [ ] Do not edit README or actual product docs.
- [ ] Do not edit `dist/**`.
- [ ] Do not write Mem0.

## ROLE: Continuation Session Scaffold (Compatibility Template)

This is a fresh context window. Assume no memory.
Use this template to re-enter the project's fact layer quickly and safely.
It is a continuation-session scaffold, not a complete Execution Layer authority.

Authority boundary:
- `app_spec.md`, `feature_list.json`, `claude-progress.txt`, and `init.sh` are longterm project-fact artifacts.
- `feature_list.json` and `claude-progress.txt` are subordinate longrun ledgers: they may record only facts supported by `specs/`, code, tests, or fresh evidence.
- Current feature delivery still follows the project's `specs/` path.
- Current runtime execution method still follows project rules plus the active `superpowers` workflow.
- This template helps you recover context; it does not replace feature specs, session execution methods, or verified truth.
- If the user explicitly activates commander mode for the main thread, that activation is a coordination contract, not an authority upgrade.
- `feature_list.json` and `claude-progress.txt` do not promote truth and must not override governance, `specs/`, code, tests, or fresh evidence.
- Closeout, summary, and continuation notes remain non-authoritative artifacts.

### 1) Get bearings (mandatory)
Run and inspect:
- `pwd`
- `ls -la`
- `cat app_spec.md`
- `cat feature_list.json`
- `cat claude-progress.txt`
- `git log --oneline -20`

### 2) Re-establish workspace baseline
Run:
- `chmod +x init.sh`
- `./init.sh`

If `init.sh` fails, record that fact and the verification output before attempting new delivery work.

### 3) Confirm the active feature context
Before implementation work begins:
- identify the current target feature from user instructions or project memory,
- locate the corresponding feature delivery artifact in `specs/`,
- if the feature delivery artifact is missing or stale, refresh it there before implementation,
- treat `feature_list.json` as a project-level summary ledger rather than a fine-grained execution plan.

### 4) Commander Mode activation and dispatch order
Only when the user explicitly assigns the main thread as commander:
- classify the work into packets before implementation begins,
- freeze `ownership`, `write-set`, `read-set`, and frozen assumptions before execution,
- assign distinct `worker`, `reviewer`, `verifier`, and `closer` roles before any packet starts,
- dispatch in order: implementation ownership first, then review coverage, then verification coverage, then closeout coverage,
- keep commander focused on decomposition, dispatch, boundary control, and close decisions,
- when multiple packets converge on one feature, final cross-packet consistency must run as a separate `integration packet`; commander must not hand-stitch that integration on the main thread,
- do not treat commander as the default implementation owner; if commander edits a packet write-set, that packet must be reviewed and verified by other non-commander roles.

If commander mode is not explicitly activated by the user, continue through the normal execution path.

### 5) Execute through the active method
- Follow the active feature delivery artifact from `specs/`.
- Follow the active execution method from `superpowers` and current project rules.
- Do not let this continuation scaffold replace `specs/`, replace `superpowers`, or overwrite verified truth.
- If your changes affect previously passing project behavior, re-verify the affected items before handoff.

### 6) Update pass state only with traceable evidence
- Keep or restore `passes: false` when acceptance evidence is missing, incomplete, or invalidated.
- Change an item to `passes: true` only when the corresponding acceptance evidence or equivalent verification record is traceable.
- Review notes can support context, but review does not substitute for verification.
- Acceptable traceability can point to the relevant feature acceptance evidence, or to equivalent verification records recorded in `claude-progress.txt`.
- Record concrete commands, outputs, screenshots, logs, or review notes when updating longterm state.

### 7) Close session cleanly
- Update `claude-progress.txt` with:
  - what changed,
  - evidence references,
  - remaining risks,
  - next recommended feature context.
- Treat closeout and summary as non-authoritative handoff artifacts: they may index verified facts, but they must not override `specs/`, code, tests, or fresh evidence.
- Keep `feature_list.json` synchronized with verified longterm state.
- Record only facts that remain supported by `specs/`, code, tests, or fresh evidence; never use longrun notes to promote truth or overwrite governance / `specs/` / code / tests.
- Leave the workspace runnable and handoff-safe.

Hard rules:
- Do not activate commander mode unless the user explicitly says the main thread is commander.
- Do not start implementation in commander mode before task grading, ownership freeze, and `worker` / `reviewer` / `verifier` / `closer` assignment are complete.
- Do not treat commander as the default implementation owner.
- Do not treat this template as a replacement for `specs/`.
- Do not treat this template as a replacement for `superpowers`.
- Do not treat this template as a replacement for verified truth.
- Do not let review stand in for verification.
- Do not hand-stitch final cross-packet consistency on the main thread; use a separate `integration packet`.
- Do not treat `feature_list.json` or `claude-progress.txt` as authority upgrades, truth promotion, or replacements for governance, `specs/`, code, tests, or fresh evidence.
- Do not treat closeout or summary as truth promotion, or as a replacement for fresh evidence.
- Do not mark `passes: true` without traceable acceptance evidence or equivalent verification record.
- Do not delete or rewrite completed project facts without updating the corresponding longterm artifacts.
- Do not break existing project contracts listed in `app_spec.md`.

## ROLE: Coding Agent (Continuation Session)

This is a fresh context window. Assume no memory.
This workspace may be connected to an existing project; avoid broad refactors unless required for the selected feature.

### 1) Get bearings (mandatory)
Run and inspect:
- `pwd`
- `ls -la`
- `cat app_spec.md`
- `cat feature_list.json`
- `cat claude-progress.txt`
- `git log --oneline -20`

### 2) Start environment
Run:
- `chmod +x init.sh`
- `./init.sh`

### 3) Verify baseline first
Re-test 1-2 already passing core features.
If any regression appears:
- set affected feature back to `passes: false`,
- fix regression before new work.

### 4) Pick exactly one failing feature
Choose highest-priority item with `passes: false`.
Prefer an unblocked item whose `depends_on` items are already passing.
Work only that feature in this session.

### 5) Implement + end-to-end verify
- Implement code changes.
- Verify via real user flow in browser/tooling.
- Only after full verification, update that item to `passes: true`.
- Record concrete evidence in `claude-progress.txt` (commands, UI checks, outputs).

### 6) Close session cleanly
- Update `claude-progress.txt` with:
  - what changed,
  - evidence,
  - remaining risks,
  - next feature.
- Commit with clear message.
- Leave workspace runnable.

Hard rules:
- Do not delete or rewrite completed feature definitions.
- Do not mark passing without end-to-end verification.
- Do not break existing project contracts listed in `app_spec.md`.

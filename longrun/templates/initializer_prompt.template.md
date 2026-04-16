## ROLE: Initializer Session Scaffold (Session 1 Compatibility Template)

You are the first session establishing a longterm workspace for an existing or new project.
This template is a Session 1 scaffold for creating durable project-fact artifacts.
It is not a complete project behavior system or development methodology by itself.

Authority boundary:
- `app_spec.md`, `feature_list.json`, `claude-progress.txt`, and `init.sh` belong to the longterm project-fact layer.
- Later feature delivery still belongs to the project's `specs/` path.
- Later runtime execution method still belongs to project rules plus the active `superpowers` workflow.
- This template prepares project memory and compatibility artifacts so later sessions can continue safely.

### 1) Read the project facts first
Read `app_spec.md` completely.
Pay special attention to project scope, migration constraints, commands contract, and non-negotiable boundaries.
If the workspace is attached to an existing project, document current reality before suggesting structural change.

### 2) Create `feature_list.json` as a project-level summary ledger
Generate an initial feature list from `app_spec.md`.
Rules:
- Include required workflows, migration obligations, and longterm checkpoints.
- Each item must include `id`, `priority`, `category`, `description`, `steps`, `passes`.
- Prefer also including `component`, `depends_on`, `acceptance_criteria`, `evidence_hint`, and `risk`.
- Keep `steps` at project-summary level; do not turn them into detailed feature implementation tasks.
- Initialize every item as `"passes": false`.
- Future sessions may only change `passes` from false to true when acceptance evidence or equivalent verification records are traceable.

### 3) Create `init.sh` as a compatibility bootstrap
Create an idempotent script that:
- installs or checks required dependencies,
- runs safely across repeated sessions,
- documents how to start required services,
- prints where to access the project,
- supports workspace recovery without becoming a second delivery framework.

### 4) Create handoff artifacts for project memory
- Add `claude-progress.txt` with what was created, what remains unknown, and what later sessions must verify.
- Keep the initial workspace artifacts aligned with `app_spec.md`.
- If current project workflow expects an initial commit, make one with a clear bootstrap message; otherwise leave the decision to project rules.

### 5) Handoff to the proper downstream paths
Before ending Session 1, make it clear that:
- project facts now live in longterm artifacts,
- later feature delivery should proceed through `specs/`,
- later runtime execution method should proceed through project rules plus `superpowers`.

### 6) End in clean state
Before finishing:
- no broken startup path,
- artifacts saved,
- no violation of migration constraints,
- next session can identify project facts, feature-delivery path, and execution-method path with no ambiguity.

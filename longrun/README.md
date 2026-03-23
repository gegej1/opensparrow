# Longrun Harness Kit

This directory provides a reusable, migration-friendly long-running development template.
Use it as a standardized workspace contract across projects.

## Quick start
1. Bootstrap a workspace:
   ```bash
   ./longrun/scripts/bootstrap.sh my-first-project
   ```
2. Fill `longrun/workspaces/my-first-project/app_spec.md`.
3. Run Session 1 with `longrun/templates/initializer_prompt.template.md`.
4. Run continuation sessions with `longrun/templates/coding_prompt.template.md`.
5. Track progress:
   ```bash
   python3 longrun/scripts/progress_report.py longrun/workspaces/my-first-project/feature_list.json
   ```
6. Pick next feature:
   ```bash
   python3 longrun/scripts/next_feature.py longrun/workspaces/my-first-project/feature_list.json
   ```

## Migration playbook (for existing projects)
1. Copy `longrun/` into the target repository root.
2. Create workspace:
   ```bash
   ./longrun/scripts/bootstrap.sh <project-key>
   ```
3. In `app_spec.md`, fill "Existing-project migration constraints" first.
4. Customize workspace `init.sh`:
- set `PROJECT_ROOT` if workspace is not inside the repo root.
- optionally set `SMOKE_TEST_CMD` and `APP_START_CMD`.
5. Run a dry start:
   ```bash
   cd longrun/workspaces/<project-key>
   ./init.sh
   ```
6. Start Session 1 and generate a complete `feature_list.json`.

## Feature schema contract
Required fields:
- `id`, `priority`, `category`, `description`, `steps`, `passes`

Recommended fields for stronger handoff:
- `component`, `depends_on`, `acceptance_criteria`, `evidence_hint`, `risk`

Compatibility rule:
- Existing scripts remain compatible as long as required fields are present.

## Directory map
- `METHOD.md`: localized methodology and operating rules.
- `METHOD.zh-CN.md`: Chinese version of core method.
- `CHECKLIST.md`: per-session checklist.
- `templates/`: canonical artifacts and prompt templates.
- `scripts/`: bootstrap and progress utilities.
- `workspaces/`: generated project workspaces.

## Session contract
Every coding session must:
- read bearings (`app_spec`, `feature_list`, `claude-progress`, git log),
- run environment startup from `init.sh`,
- re-verify previously passing behavior,
- complete one unpassed feature end-to-end,
- update `passes`, notes, and commit.

# App Spec Template (Longrun Standard v2)

Use this file as the single source of truth for a project workspace.
Fill every section before Session 1 ends.

## 0) Project metadata
- Project name:
- Workspace name:
- Existing repo path (if migrating):
- Primary owner:
- Last updated (YYYY-MM-DD):

## 1) Product goal
Describe the product and business value in 3-6 sentences.

## 2) In-scope user workflows
List concrete, testable workflows.
1. Workflow 1
2. Workflow 2
3. Workflow 3

## 3) Out of scope
- Explicitly excluded behavior 1
- Explicitly excluded behavior 2

## 4) Technical baseline
- Runtime:
- Framework:
- Package manager:
- Data store:
- External APIs/services:
- Required environment variables:
- Allowed ports:

## 5) Existing-project migration constraints
If this workspace is attached to an existing codebase, define non-negotiables:
- Stable modules that must not break:
- APIs/contracts that must remain backward compatible:
- Files/directories that cannot be touched:
- Required coding conventions:
- Required review/testing gates:

## 6) Commands contract
Keep these commands synchronized with `init.sh`.
- Install:
- Start app/service:
- Test:
- Lint:
- Build:
- E2E or smoke:

## 7) Quality and non-functional requirements
- Performance:
- Security:
- Accessibility:
- Observability:
- Reliability:

## 8) Definition of done
- [ ] All in-scope workflows have matching entries in `feature_list.json`.
- [ ] Each workflow is verifiable end-to-end through real user flow.
- [ ] Migration constraints are respected (if applicable).
- [ ] `init.sh` can prepare the environment in a repeatable way.
- [ ] Session handoff is clear from `claude-progress.txt`.

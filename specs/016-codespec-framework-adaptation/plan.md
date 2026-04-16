# Implementation Plan: codeSPEC Framework Full Adaptation for OpenSparrow

**Branch**: `016-codespec-framework-adaptation` | **Date**: 2026-04-14 | **Spec**: `specs/016-codespec-framework-adaptation/spec.md`

## Summary

上一轮 `F-021` 已经把 `codeSPEC` 的 `UnifiedFramework` 白名单模板镜像到了当前仓，并补上了 `longrun` 的基础边界说明。本轮的目标是从“有 reference”推进到“当前仓真的把这套框架当底层在用”：把 `UnifiedFramework` 和 `AgentTeam` 中适合当前仓长期使用的部分本地化重写成治理文档，把 `AGENTS` / constitution / `longrun` prompt scaffold 接上，并扩展 reference import，让底层框架栈在当前仓闭环。

本轮完成后，OpenSparrow 将具备以下底座：

1. 显式的框架层次与 authority order；
2. 本地化的项目接管 SOP、派工模板与速查表；
3. 与框架栈一致的 `longrun` 初始化 / continuation scaffold；
4. 更完整但仍可控的 `codeSPEC` reference 镜像；
5. 可作为后续“优雅改项目”的统一开发底层。

## Technical Context

- **Repository root**: `/Users/eduardogan/Desktop/GHJProject/opensparrow`
- **Source repo**: `/Users/eduardogan/Desktop/GHJProject/codeSPEC`
- **Nature of change**: Framework adaptation / governance docs / reference sync / prompt scaffold alignment
- **Primary write targets**:
  - `specs/016-codespec-framework-adaptation/spec.md`
  - `specs/016-codespec-framework-adaptation/plan.md`
  - `specs/016-codespec-framework-adaptation/tasks.md`
  - `docs/governance/README.md`
  - `docs/governance/framework-stack.md`
  - `docs/governance/project-onboarding-sop.md`
  - `docs/governance/dispatch-templates.md`
  - `docs/governance/quick-reference.md`
  - `AGENTS.md`
  - `.specify/memory/constitution.md`
  - `longrun/templates/initializer_prompt.template.md`
  - `longrun/templates/coding_prompt.template.md`
  - `scripts/import-codespec-template.sh`
  - `scripts/tests/import-codespec-template.test.mjs`
  - `docs/reference/codeSPEC-template/README.md`
  - `docs/reference/codeSPEC-template/IMPORT_SCOPE.md`
  - `docs/runbooks/F-022-codespec-framework-adaptation.md`
  - `README.md`
  - `longrun/workspaces/opensparrow-unified/feature_list.json`
  - `longrun/workspaces/opensparrow-unified/claude-progress.txt`
- **Validation anchors**:
  - `node --test scripts/tests/import-codespec-template.test.mjs`
  - `bash -n scripts/import-codespec-template.sh`
  - `./scripts/import-codespec-template.sh /Users/eduardogan/Desktop/GHJProject/codeSPEC`
  - `./longrun/workspaces/opensparrow-unified/init.sh`
  - `python3 longrun/scripts/progress_report.py longrun/workspaces/opensparrow-unified/feature_list.json`

## Design

### A. Local Governance Surface

新增 `docs/governance/` 作为当前仓真正使用的底层治理文档面：

- `README.md`：治理文档索引与使用顺序
- `framework-stack.md`：适配版四层框架栈、authority order、推荐工作流
- `project-onboarding-sop.md`：基于 `AgentTeam/02` 本地化的项目接手 SOP
- `dispatch-templates.md`：基于 `AgentTeam/03` 本地化的派工模板
- `quick-reference.md`：基于 `AgentTeam/04` 本地化的执行速查表

这些文件是当前仓活跃治理面，不能直接保留 `codeSPEC/spec规范/longterm` 旧路径，而应全部指向当前仓自己的 `specs/`、`longrun/`、`superpowers`、`docs/runbooks/`。

### B. Authority Wiring

当前仓的显式入口要接到新的治理面：

- `AGENTS.md`：在“开始任何开发前必须先看”或治理章节中加入 `docs/governance/README.md`
- `.specify/memory/constitution.md`：补一节“框架栈与 authority order”，说明项目规则层 / feature 交付层 / 项目记忆层 / 执行方法层 / 协作治理层的关系
- `README.md`：增加治理框架入口

### C. Longrun Scaffold Alignment

把 `codeSPEC` 里更完整的 continuation scaffolds 同步到当前仓活跃模板：

- `longrun/templates/initializer_prompt.template.md`
- `longrun/templates/coding_prompt.template.md`

目标是让这些模板明确自己只是 project-memory compatibility scaffold，而不是替代 `specs/` 或 `superpowers`。

### D. Reference Mirror Expansion

扩展 `scripts/import-codespec-template.sh` 的白名单，使其在 `docs/reference/codeSPEC-template/upstream/` 下镜像：

- `UnifiedFramework/12-Superpower-Execution-Bridge.md`
- `AgentTeam/README.md`
- `AgentTeam/02-Project-Onboarding-SOP.md`
- `AgentTeam/03-Dispatch-Templates.md`
- `AgentTeam/04-Quick-Reference.md`

仍保持：

- source repo 只读
- 白名单复制
- 不覆盖 `docs/reference/codeSPEC-template/` 本地说明文档
- 不把 `AgentTeam/01-Commander-SOP.md` 引入为活动 authority

### E. Record Sync

- 新增 `docs/runbooks/F-022-codespec-framework-adaptation.md`
- 在 `feature_list.json` 新增 `F-022`
- 在 `claude-progress.txt` 记录“底层框架适配已完成，可开始下一阶段项目优雅化改造”

## Validation Plan

1. 先修改 `scripts/tests/import-codespec-template.test.mjs` 让它对新增 reference 白名单红灯。
2. 实现脚本扩展并跑到绿灯。
3. 运行真实导入命令，确认 `docs/reference/codeSPEC-template/upstream/` 出现新增镜像。
4. 人工复查 `docs/governance/` 与 `AGENTS` / constitution / `README` / `longrun templates` 的口径一致。
5. 运行 `./longrun/workspaces/opensparrow-unified/init.sh` 与 `progress_report.py`，证明框架适配没有破坏当前长期骨架。

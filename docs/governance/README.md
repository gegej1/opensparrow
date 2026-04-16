# OpenSparrow Governance Stack

本目录是 OpenSparrow 当前仓真正使用的底层开发治理面。

它不是 `codeSPEC` 的原样拷贝，而是把其中适合当前 unified repo 的框架层次、接管 SOP 和派工模板，改写成 OpenSparrow 自己的工作底座。

## 先读顺序

1. `AGENTS.md`
2. `.specify/memory/constitution.md`
3. `docs/governance/framework-stack.md`
4. `longrun/workspaces/opensparrow-unified/app_spec.md`
5. `longrun/workspaces/opensparrow-unified/feature_list.json`
6. `longrun/workspaces/opensparrow-unified/claude-progress.txt`
7. 当前 feature 对应的 `specs/<feature>/spec.md`、`plan.md`、`tasks.md`

## 本目录包含什么

- `framework-stack.md`：当前仓的框架层次、authority order 与标准工作流
- `project-onboarding-sop.md`：总司令/协作者第一次接手项目时的标准接管动作
- `dispatch-templates.md`：读项目、写 spec、做实现、做验证、做收口时的派工模板
- `quick-reference.md`：会话中快速判断“先读什么、派给谁、如何收口”的速查表

## 与其他目录的关系

- `specs/`：feature 交付主路径，负责 `spec -> plan -> tasks`
- `longrun/`：项目事实与长期状态主路径
- `docs/runbooks/`：已经落地到当前仓的可执行操作手册
- `docs/reference/codeSPEC-template/`：上游 `codeSPEC` 的镜像参考层，不是当前仓 authority

## 一句话定位

- 项目规则 → `AGENTS.md` + constitution
- feature 交付 → `specs/`
- 项目事实 → `longrun/`
- 执行方法 → 当前会话使用的 `superpowers` 工作流
- 多 Agent 调度 → 本目录 + `docs/runbooks/F-019-commander-orchestration-governance.md`

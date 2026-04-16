# codeSPEC 导入范围说明

## A. 本次镜像导入的 upstream 白名单

导入脚本 `scripts/import-codespec-template.sh` 当前同步以下文件到 `docs/reference/codeSPEC-template/upstream/`：

### UnifiedFramework

- `README.md`
- `01-Unified-Framework-Architecture.md`
- `02-Pruning-Checklist.md`
- `03-Interface-Contracts.md`
- `04-New-Project-Integration-Flow.md`
- `05-Migration-Playbook.md`
- `06-Future-Extension-Policy.md`
- `12-Superpower-Execution-Bridge.md`
- `export-manifest.authoring.yaml`

这些文件的价值在于：它们专门解释“规则层 / feature 交付层 / 项目记忆层 / 协作增强层”的边界，以及如何做统一框架清洗和迁移。

### AgentTeam

同步到 `docs/reference/codeSPEC-template/upstream/AgentTeam/`：

- `README.md`
- `02-Project-Onboarding-SOP.md`
- `03-Dispatch-Templates.md`
- `04-Quick-Reference.md`

这些文件的价值在于：它们为当前仓治理面提供了项目接管、派工和速查模板的上游参考。

## B. 已直接合并到当前仓活跃文档的内容

以下内容没有做 `upstream` 镜像，而是把其中对当前仓确实有价值的边界说明，直接并入当前仓活跃文档：

- `codeSPEC/longterm/longrun/README.md` → 已吸收边界说明到 `longrun/README.md`
- `codeSPEC/longterm/longrun/CHECKLIST.md` → 已吸收边界说明到 `longrun/CHECKLIST.md`
- `codeSPEC/longterm/longrun/METHOD.zh-CN.md` → 已吸收边界说明到 `longrun/METHOD.zh-CN.md`

这样做的原因是：这三份文档本来就是当前仓的活跃规则说明，直接合并比保留第二份平行副本更清晰。

## C. 明确跳过的内容

### 1) 当前仓已经存在的同构 authoring 面

- `codeSPEC/spec规范/.specify/`
- `codeSPEC/spec规范/.codex/prompts/`
- `codeSPEC/spec规范/scripts/codex`

跳过原因：当前仓已经拥有本地化后的 `.specify/`、`.codex/prompts/`、`scripts/codex`，直接覆盖会制造权威冲突。

### 2) 仍然跳过的 AgentTeam 内容

- `codeSPEC/AgentTeam/01-Commander-SOP.md`

跳过原因：当前仓已经通过 `docs/runbooks/F-019-commander-orchestration-governance.md` 落盘了自己的 Commander 治理基线；保留 `01` 只会制造平行 authority。`02/03/04` 已经以 reference + 本地化治理文档的方式吸收。

### 3) source-specific / 审计 / 实验残留

- `codeSPEC/UnifiedFramework/07-Current-State-Audit.md`
- `codeSPEC/UnifiedFramework/09-Session-Handoff.md`
- `codeSPEC/UnifiedFramework/10-Resume-Prompt.md`
- `codeSPEC/UnifiedFramework/11-Mispatch-Reference.md`
- `codeSPEC/UnifiedFramework/13-Batch-2-Execution-Design.md`
- `codeSPEC/memory_context_recovery/`
- `codeSPEC/longterm/mcp/`
- `codeSPEC/longterm/research/`
- `codeSPEC/longterm/sources/`
- 各类 `node_modules/`、截图、replay、临时输出

跳过原因：这些内容要么是 `codeSPEC` 自身会话/发布上下文，要么是研究/实验区，不适合作为当前仓长期模板真源。

## D. 当前仓映射关系

- `codeSPEC/spec规范` 的功能，在当前仓由 `.specify/`、`.codex/prompts/`、`scripts/codex`、`docs/开发流程（Spec‑Kit）.md` 承担
- `codeSPEC/longterm/longrun` 的功能，在当前仓由 `longrun/` 承担
- `codeSPEC/AgentTeam` 的治理目标，在当前仓由 `docs/governance/` 与 `docs/runbooks/F-019-commander-orchestration-governance.md` 共同承接
- `codeSPEC/UnifiedFramework` 的边界与清洗视角，本轮一部分沉淀为 `docs/governance/framework-stack.md`，一部分继续通过 `docs/reference/codeSPEC-template/upstream/UnifiedFramework/` 保留参考镜像

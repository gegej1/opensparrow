# OpenSparrow Project Onboarding SOP

## 目标

当总司令或新协作者第一次进入 OpenSparrow，或当前上下文已经失真时，先完成项目接管，再开始派工或实现。

项目接管的目标不是立刻写代码，而是建立一个能支持后续 feature 开发的项目模型。

## 触发条件

以下场景必须先跑接管 SOP：

- 第一次进入 OpenSparrow 当前 unified repo
- 切换到一个此前没维护过的模块
- 继承别人做了一半的工作，但上下文不完整
- 仓库结构或主线目标发生明显变化

## 接管后必须回答的 6 个问题

### A. 项目画像

至少回答：

- OpenSparrow 当前是什么项目
- 当前主线目标是什么
- 当前阶段是什么
- 当前主要用户 / 维护者 / 风险承担者是谁

### B. 仓库地图

至少识别：

- 核心逻辑目录：`ui/`、`scripts/openclaw-usb/`、`platforms/`
- 文档与治理目录：`docs/`、`specs/`、`longrun/`、`.specify/`
- 只读 / 冻结 / 生成物目录：`vendor/`、`dist/`、历史冻结目录

### C. 规则地图

至少读取：

- `AGENTS.md`
- `.specify/memory/constitution.md`
- `docs/governance/framework-stack.md`
- `longrun/workspaces/opensparrow-unified/app_spec.md`
- `longrun/workspaces/opensparrow-unified/feature_list.json`
- `longrun/workspaces/opensparrow-unified/claude-progress.txt`

### D. 验证入口

至少确认：

- `./longrun/workspaces/opensparrow-unified/init.sh`
- `./longrun/scripts/session_start.sh longrun/workspaces/opensparrow-unified`
- `python3 longrun/scripts/progress_report.py longrun/workspaces/opensparrow-unified/feature_list.json`
- 若改 shell：`bash -n ...`
- 若改 Node 代码：对应 `node --test` / `node --check`

### E. Agent 路由图

至少区分：

- 侦察 / 接管任务
- 规划 / spec 任务
- 实现任务
- 验证任务
- 文档 / 收口任务

### F. 初始行动建议

至少产出：

- 当前最值得做的下一步 feature
- 推荐编队
- 当前最大风险
- 哪些文档或记录需要先补齐

## 标准接管步骤

### 步骤 1：读规则

先读不能做什么、必须先做什么。

### 步骤 2：画仓库地图

把真源、冻结区、生成物和高风险区域区分开。

### 步骤 3：找验证入口

明确哪些命令能证明“本轮真的完成了”。

### 步骤 4：读近期上下文

确认最近完成项、当前主线和剩余风险，避免重复劳动。

### 步骤 5：建立派工边界

决定哪些任务可以并行，哪些必须串行，哪些文件必须单 owner。

### 步骤 6：输出接管摘要

至少包括：

- 当前项目状态
- 下一步建议
- 推荐编队
- 风险与注意事项

## 接管完成前不要做什么

- 不要大规模并行派工
- 不要让多个实现 Agent 同改同一文件集
- 不要高确定性地声称“已经完全理解项目”
- 不要直接套用别的项目的节奏

## 建议落点

接管结果可以写入：

- 当前 feature 的 `specs/`
- `docs/runbooks/` 中对应 runbook
- `longrun/workspaces/opensparrow-unified/claude-progress.txt`

只要保证后续会话能继续复用即可。

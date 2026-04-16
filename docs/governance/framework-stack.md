# OpenSparrow Framework Stack

## 目标

把 OpenSparrow 当前仓的开发底座收束为一套可执行、可解释、不会互相争权的框架栈。

这套栈回答 5 个问题：

1. 这个项目什么规则优先？
2. 一个 feature 应该在哪里定义？
3. 项目长期事实应该写到哪里？
4. 当前会话怎么执行？
5. 多 Agent 协作时谁来调度、谁来收口？

## 层次结构

### 1. Project Rules Layer

主定义：

- `AGENTS.md`
- `.specify/memory/constitution.md`
- 当前用户最新指令

负责：

- 禁改区
- 质量门槛
- 文档优先级
- 安全边界
- 当前仓的权威入口

不负责：

- 单个 feature 的详细拆分
- 项目事实台账
- 会话内具体执行步骤

### 2. Feature Delivery Layer

主定义：

- `specs/<feature>/spec.md`
- `specs/<feature>/plan.md`
- `specs/<feature>/tasks.md`

负责：

- 当前 feature 的范围、边界、验收标准
- 任务拆解
- 非 trivial 需求的实现前置文档

不负责：

- 长期项目状态
- 多 Agent 编队制度本身
- 通用执行方法论

### 3. Project Memory Layer

主定义：

- `longrun/workspaces/opensparrow-unified/app_spec.md`
- `longrun/workspaces/opensparrow-unified/feature_list.json`
- `longrun/workspaces/opensparrow-unified/claude-progress.txt`
- `longrun/workspaces/opensparrow-unified/init.sh`

负责：

- 项目画像
- feature 全景与通过状态
- 会话交接事实
- workspace 启动合同

不负责：

- 代替 `specs/` 做 feature 定义
- 代替执行方法选择当前会话行为

### 4. Execution Layer

主定义：

- 当前会话使用的 `superpowers` 工作流
- 当前用户即时指令下的执行模式

负责：

- 当前会话如何思考和推进
- 是否先 brainstorming / TDD / verification
- 如何在会话内组织验证纪律

不负责：

- 定义项目长期事实
- 跳过 feature 交付主路径
- 直接把无证据结果写回长期通过状态

### 5. Orchestration Layer

主定义：

- `docs/governance/`
- `docs/runbooks/F-019-commander-orchestration-governance.md`

负责：

- 项目接手方式
- 总司令如何派工
- 文件所有权与并行边界
- 审阅、升级、收口与写回节奏

不负责：

- 取代项目规则层
- 取代 `specs/`
- 取代 `longrun/`
- 复制 `superpowers` 实现本体

## Authority Order

在 OpenSparrow 当前仓，遇到冲突时按以下顺序判断：

1. 当前用户最新明确指令
2. `AGENTS.md` 与 constitution
3. 当前 feature 的 `spec.md / plan.md / tasks.md`
4. `longrun` 项目事实与通过状态
5. 当前会话执行方法（`superpowers`）
6. 调度与协作模板（`docs/governance/` 与 F-019 runbook）
7. `docs/reference/codeSPEC-template/` 上游镜像参考

## 标准工作流

### 正常 feature 路径

1. 先读规则层
2. 再读 `longrun` 当前事实
3. 选择当前 feature，并完善 `spec -> plan -> tasks`
4. 进入执行层完成实现与验证
5. 按治理层模板派工、审阅、收口
6. 用证据写回 `feature_list.json` 与 `claude-progress.txt`

### 项目接管路径

1. 先跑 `docs/governance/project-onboarding-sop.md`
2. 形成项目接管摘要
3. 明确下一步 feature 与推荐编队
4. 再回到正常 feature 路径

## 什么时候算“底层框架适配完成”

满足以下条件即可视为当前仓已经把这套框架用起来：

- 入口文档能把人带到正确层次
- feature 开发默认先走 `specs/`
- 长期状态默认写回 `longrun/`
- 会话执行默认受 `superpowers` 约束
- 多 Agent 协作默认受 `docs/governance/` 与 F-019 runbook 约束
- `codeSPEC` 上游内容只作为 reference，不再与当前仓 authority 并列

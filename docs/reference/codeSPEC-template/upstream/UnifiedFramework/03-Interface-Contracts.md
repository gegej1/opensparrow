# Interface Contracts

## 1. 目的
在统一总框架中，真正导致混乱的往往不是“模块太多”，而是：
- 不知道谁该读谁
- 不知道谁能写谁
- 不知道什么时候该切换到下一层
- 不知道某层是否越权

因此，本文件定义四层之间的接口契约：
- 输入来自哪里
- 输出写到哪里
- 哪些内容只能读不能写
- 哪些动作会触发层切换
- 出现冲突时如何裁决

这份文档是对 `01-Unified-Framework-Architecture.md` 的执行化补充。

---

## 2. 上游规则层与接口概览

### 2.0 上游规则层（Project Rules Layer）
- 主定义：项目自己的 `AGENTS.md` / constitution / repo rules
- 角色：统一框架所有下游层的前提输入
- 说明：它不属于三件套，也不属于可选协作增强层，但它是所有层的共同上游


### 2.1 Execution Layer → `superpower skill`
- 主要角色：会话执行引擎
- 主要输入：
  - 当前用户目标
  - 当前项目规则
  - 当前 feature 的 `spec / plan / tasks`
  - 当前项目长期事实
- 主要输出：
  - 会话内行动顺序
  - 行为约束
  - 验证纪律
  - 对下一步动作的执行建议

### 2.2 Feature Delivery Layer → `spec规范`
- 主要角色：feature 交付工厂
- 主要输入：
  - 当前项目目标与边界
  - longterm 中选中的 feature
  - 项目规则与约束
- 主要输出：
  - `spec.md`
  - `plan.md`
  - `tasks.md`
  - feature 级验收标准

### 2.3 Project Memory Layer → `longterm`
- 主要角色：项目事实源
- 主要输入：
  - 项目现状
  - 历史进度
  - 每轮 feature 结果
  - 关键验证证据
- 主要输出：
  - `app_spec`
  - `feature_list`
  - `progress`
  - `init` / session contract

### 2.4 Orchestration Layer → `AgentTeam`（可选 overlay）
- 主要角色：总司令调度系统
- 主要输入：
  - 用户当前目标
  - 项目规则
  - 项目事实
  - 当前 feature 规格
  - 当前会话执行方法
- 主要输出：
  - 派工决策
  - ownership 分配
  - 并行策略
  - 验收顺序
  - 上下文更新动作

---

## 3. 核心接口原则

### 原则 1：读可以跨层，写必须克制
- 各层都可以读取自己所需的上游事实
- 但不是每层都可以写所有下游工件
- 写权限必须遵循“唯一职责”

### 原则 2：主定义只有一份
- 同一类事实只能有一个主定义层
- 其他层只能消费、引用或补充局部状态

### 原则 3：任何写入都必须可回溯
- 写入项目事实时，应能说明依据是什么
- 写入 feature 状态时，应能追溯到验证证据
- 写入派工状态时，应能追溯到当前目标与边界

### 原则 4：层切换必须由触发条件驱动
- 不是“想切就切”
- 必须满足明确的前置条件，才能从一层进入下一层

---

## 4. 允许的读写关系

## 4.1 `Project Rules Layer` ↔ 三件套

### 三件套都必须先读取项目规则层
允许读取：
- 项目规则
- 禁改区
- 质量门槛
- 项目代码风格
- 安全与合规约束

限制：
- 三件套都不应把这些规则复制成第二主定义
- `spec规范` 中的规则模板是 seed；一旦落入具体项目，项目本地 `AGENTS.md / constitution` 才是 authority

### 接口结论
- Project Rules Layer 是统一框架的显式上游层
- 其权威高于 `longterm`、`spec规范`、`AgentTeam` 与 `superpower skill`

---

## 4.2 `AgentTeam` ↔ `longterm`

### `AgentTeam` 可以读取 `longterm`
允许读取：
- 项目画像
- feature 全景
- 当前进度
- 当前推荐下一任务
- 初始化与验证入口

目的：
- 让总司令知道项目现在在哪
- 判断该拆什么、派什么、先做什么

### `AgentTeam` 可以触发写回 `longterm`
允许写回的内容：
- feature 是否通过
- 本轮进度记录
- 下一步建议
- 关键验证证据摘要

限制：
- `AgentTeam` 不应自己发明新的长期事实结构
- 应写回既有的 `longterm` 工件，而不是在别处复制一份

### 接口结论
- `AgentTeam` 是 `longterm` 的主要使用者之一
- `AgentTeam` 可以驱动更新 `longterm`
- 但 `longterm` 仍然是项目事实主定义

---

## 4.3 `spec规范` ↔ `longterm`

### `spec规范` 可以读取 `longterm`
允许读取：
- 项目目标
- 当前 feature 候选
- 项目约束
- 历史风险
- 当前阶段状态

目的：
- 保证 feature 规格不是凭空写出来的
- 保证计划符合项目的长期现实

### `spec规范` 不直接拥有 `longterm` 主写权限
允许间接写回：
- 当 feature 完成后，由执行/收口流程把结果写回 `longterm`

限制：
- `spec` 不应直接变成项目 backlog 总表
- `spec` 不应自己维护长期 passes 状态

### 接口结论
- `spec规范` 消费 `longterm` 的项目事实
- `longterm` 不应被 `spec` 替代

---

## 4.4 `superpower skill` ↔ `spec规范`

### `skill` 可以读取 `spec`
允许读取：
- 当前 feature 的目标
- 任务拆分
- 验收标准
- 限制与边界

目的：
- 决定当前会话的推进方式
- 决定是否要 brainstorming / planning / debugging / verification

### `skill` 不写 `spec` 主内容
限制：
- `skill` 可以指导“先写 spec、再写 plan、再写 tasks”
- 但 `skill` 本身不是 feature 规格文件的主定义层
- `skill` 的方法不能覆盖具体 feature 的边界定义

### 接口结论
- `skill` 把 `spec` 当作任务输入
- `spec` 是 feature 事实，`skill` 是执行方法

---

## 4.5 `superpower skill` ↔ `longterm`

### `skill` 可以读取 `longterm`
允许读取：
- 项目事实
- 当前 feature 状态
- 历史进度
- init / session contract

目的：
- 让当前会话从真实状态开始，而不是从记忆开始

### `skill` 不写长期项目事实
限制：
- `skill` 可以要求“应更新 progress / feature_list”
- 但长期事实的主写入动作应落在项目工作流和记录层上

### 接口结论
- `skill` 依赖 `longterm`
- 但 `skill` 不应取代 `longterm`

---

## 4.6 `AgentTeam` ↔ `spec规范`

### `AgentTeam` 可以读取 `spec`
允许读取：
- feature 范围
- plan
- tasks
- 验收标准
- 风险点

目的：
- 作为派工依据
- 决定哪些任务可以并行
- 决定哪些任务必须串行

### `AgentTeam` 可以驱动 `spec` 流程启动
允许动作：
- 在 feature 开工前，要求先补 `spec / plan / tasks`
- 在 feature 边界不清时，暂停实现，回到 `spec` 阶段

限制：
- `AgentTeam` 不应在没有 `spec` 的情况下长期承担 feature 定义工作
- `AgentTeam` 不应把自己的派单模板当成 `spec`

### 接口结论
- `AgentTeam` 用 `spec` 来派工
- `spec` 不由 `AgentTeam` 替代

---

## 4.7 `AgentTeam` ↔ `superpower skill`

### `AgentTeam` 可以消费 `skill` 的行为规则
例如：
- 先 brainstorming 再实现
- 先验证再宣称完成
- 遇到 bug 先 debugging
- 需要 plan 时先写 plan

目的：
- 让总司令知道在当前阶段应如何驱动工作方式

### `AgentTeam` 不应复制 skill 本体
限制：
- `AgentTeam` 可以说“进入规划阶段时调用 planning 技能”
- 但不应在自己的文档里再写一整套 skill

### 接口结论
- `AgentTeam` 负责调度谁来做
- `skill` 负责告诉 Agent 做的时候怎么做

---

## 4.8 `longterm feature` ↔ `spec feature` 的对象绑定契约

### 为什么需要对象绑定
层级接口解决了“谁负责什么”，但项目落地时还需要解决：
- `feature_list` 里的某个 feature 对应哪一个 `spec` 目录？
- `passes: true` 到底在说哪个 feature 已完成？

### 绑定规则
- `longterm` 中被选中的 feature，必须能唯一映射到一个 feature 规格目录或等价的 feature 工件集合
- 该映射至少应让接手者能回答：
  - 这个 feature 的 `spec.md` 在哪里
  - 这个 feature 的 `plan.md` / `tasks.md` 在哪里
  - 这个 feature 的 acceptance evidence 指向哪里
- 名称不一定必须完全一致，但映射关系必须可追踪、可解释、可落盘

### 推荐做法
- 在 `feature_list` 条目中保留足够稳定的 `id/component/description` 组合，便于映射到 `specs/<feature>/`
- 在 `spec` 或项目记录中保留对 feature id 的引用

### 接口结论
- 没有对象绑定，层级边界仍会在落地时漂移
- 对象绑定是 `longterm` 与 `spec规范` 之间的最小握手要求

---

## 5. 典型生命周期中的接口顺序


## 场景 A：新项目第一次接入（最小内核模式）
1. 用户提出目标
2. 先读取项目规则层
3. 初始化或接入 `longterm`
4. 在 `longterm` 中建立项目画像、feature 全景与 progress 入口
5. 选择首个 feature
6. 再进入 `spec规范` 与 `superpower` 的执行闭环

**结论：**
新项目第一次接入时，当前 v1 的最小内核主路径是：
`项目规则 -> longterm -> spec规范 -> superpower -> 写回 longterm`

---

## 场景 B：已接管项目启动一个新 feature
1. 从 `longterm` 中选择当前 feature
2. 建立该 feature 与 `spec` 目录的唯一映射
3. `spec规范` 生成该 feature 的 `spec / plan / tasks`
4. `skill` 根据当前阶段选择执行方法
5. 如项目启用了多 Agent 协作，则由 `AgentTeam` 按 tasks 派工；否则按单 Agent 主路径执行
6. 验证通过后，将 acceptance evidence 与 `passes: true` 的写回动作同步到 `longterm`

**结论：**
标准 feature 生命周期是：
`longterm -> spec规范 -> superpower -> 写回 longterm`
若启用协作增强层，则变为：
`longterm -> spec规范 -> superpower + AgentTeam overlay -> 写回 longterm`

---

## 场景 C：bug 修复 / 临时任务
1. 先依据项目规则和 `longterm` 判断是否属于 trivial
2. 如果不 trivial，仍然回到 `spec` 路线
3. `skill` 决定调试与验证方法
4. 如启用 `AgentTeam`，则由其派工并控制边界
5. 结果写回 `longterm`

**结论：**
即使是 bugfix，也不应跳过层间契约，只能根据任务规模走轻量路径。

---

## 5.1 `passes` 与 acceptance evidence 的握手规则

- `feature_list` 中某一条改为 `passes: true` 之前，应能追溯到该 feature 对应 `spec` 的 acceptance evidence、等价验证证据，或项目明确记录的替代验收结果
- `passes: true` 是长期事实更新，不应只依据会话内主观判断或单个 Agent 的完成宣言
- 如项目启用 `AgentTeam`，它负责组织验收顺序；但是否允许写回 `passes: true`，仍应回到 `spec` 与 `longterm` 的握手规则

## 6. 禁止越权表

### `skill` 禁止越权
- 禁止维护项目 backlog 主定义
- 禁止定义项目唯一代码风格
- 禁止替代项目长期进度记录

### `spec规范` 禁止越权
- 禁止维护整个项目全量状态
- 禁止定义多 Agent 长期治理框架
- 禁止替代 longterm 充当项目事实库

### `longterm` 禁止越权
- 禁止承担 feature 细任务拆分主职责
- 禁止承担多 Agent ownership 管理
- 禁止承担会话级执行方法体系

### `AgentTeam` 禁止越权
- 禁止自己维护第二份项目事实数据库
- 禁止把派单模板当成 feature 规格主定义
- 禁止替代项目规范文件
- 禁止在未启用协作增强层的项目里被默认当成前置依赖

---

## 7. 接口异常时如何处理

### 异常 1：两个层都在维护同一种事实
处理方式：
- 先定位谁拥有最终职责
- 保留主定义层
- 另一层改为引用或删除

### 异常 2：某层缺关键输入，无法继续
处理方式：
- 不要强行越权补充
- 回到拥有该职责的层补齐

### 异常 3：某层输出无法被下游直接消费
处理方式：
- 补“接口适配”而不是改写职责边界
- 如果需要反复适配，说明接口定义不够清楚，应修文档

### 异常 4：新系统进来后与现有层重叠
处理方式：
- 先用 `01` 和 `02` 文档定位它属于哪层
- 若仍与现有层高度重叠，默认不接入，除非它能替代并简化现有某层

---

## 8. 对未来接入其他框架的意义
以后无论是：
- 新的 prompt system
- 新的 agent orchestration system
- 新的 project memory system
- 新的 planning / spec system

都先问：
- 它接在哪一层？
- 它提供新能力，还是只是在重复旧能力？
- 它的输入输出是否能接上这四层接口？

如果不能回答，就先不要整合。

---

## 9. 最小接口心智模型
只记住这四条就足够：

- `longterm` 提供项目事实
- `spec规范` 提供 feature 定义
- `AgentTeam` 负责调度和回收
- `superpower skill` 负责具体执行方法

任何层如果开始管理它不该管理的东西，就是接口溢出。

---

## 10. 下一步建议
最适合继续补的文档有两个：

1. `04-New-Project-Integration-Flow.md`
   - 让任何新项目都能按同一顺序接入这套总框架

2. `05-Migration-Playbook.md`
   - 让已有项目能从多套平行方法迁到统一框架

如果要开始真正剪枝，应以本文件和 `02-Pruning-Checklist.md` 为双依据。

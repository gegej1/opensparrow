# Superpower as Execution Layer Bridge

## 1. Why this document exists
现有 Unified Framework 已经明确把 `superpower skill` 定位为 Execution Layer，但它的实际实现位于仓库外部，不应被复制进本仓库，也不应在仓库内再造第二份执行系统。

这份文档的作用只有一个：
- 在 `UnifiedFramework` 内显式补出一份**薄桥接定义**
- 让运行时执行方法在仓库内**可见、可引用、可审计**
- 但只定义**角色、边界、调用契约与降级方式**，不复制 skill 实现

它回答的是：
- `superpower` 在统一框架里放在哪一层
- 它可以读取什么、输出什么
- 什么时候应被调用
- 上游输入缺失时如何降级
- 未来如果替换 Execution Layer，应保持什么不变

它**不**回答 skill 内部如何实现，也**不**把 skill 本体变成仓库内真源。

---

## 2. Layer placement
Unified Framework 当前最小内核仍然是：

- Project Rules Layer → 项目本地 `AGENTS.md` / constitution / repo rules
- Project Memory Layer → `longterm`
- Feature Delivery Layer → `spec规范`
- Execution Layer → `superpower skill`
- Optional Orchestration Overlay → `AgentTeam`

用最短口径表达就是：

- `project facts -> longterm`
- `feature delivery -> spec规范`
- `execution methods -> superpower`

因此，`superpower` 在统一框架中的位置不是项目规则层，也不是 feature 交付层，更不是项目事实层；它是**把上游已存在的目标、约束、规格和事实，转换成当前会话执行行为的运行时桥接层**。

当前标准主路径仍然是：

`Project Rules -> longterm -> spec规范 -> superpower -> acceptance evidence -> 写回 longterm`

如果启用了 `AgentTeam`，它只是 overlay，不改变 `superpower` 的基础层级定位。

---

## 3. Authority boundary
`superpower` 的 authority 仅限于**执行方法**。

它可以决定：
- 当前会话应该采用什么执行模式
- 下一步动作顺序如何收敛
- 验证纪律应如何施加
- 在缺输入时应先补哪一层

它不能决定：
- 项目事实的主定义是什么
- 某个 feature 的主定义工件是什么
- 项目规则本身是什么
- 哪些长期状态可以绕过证据直接写回

换句话说：

- 项目事实 authority 仍然属于 `longterm`
- feature 交付 authority 仍然属于 `spec规范`
- 项目规则 authority 仍然属于项目本地规则文件
- `superpower` 只拥有 runtime execution authority

这也意味着：
- `superpower` 可以要求“先读规则 / 再读 longterm / 再读 spec”
- `superpower` 可以要求“先验证，再宣布完成”
- 但 `passes: true` 仍然必须追溯到 acceptance evidence 或等价验证证据，不能仅由执行层自我宣告生成

---

## 4. Invocation contract
`superpower` 的调用契约应保持为**消费上游、产出会话执行行为**，而不是反向生成上游真源。

### 前置输入
在进入 `superpower` 前，至少应尽量具备以下输入：

1. 当前用户目标
2. 当前项目规则
3. 当前项目事实或对应的 `longterm` 状态
4. 若是非 trivial 的 feature 工作，则应有对应的 `spec / plan / tasks` 或等价 feature 验收约束

### 标准调用顺序
- 新 feature / 正常 feature 路径：`longterm -> spec规范 -> superpower`
- 已有 feature 的执行会话：先读取该 feature 的 `longterm` 状态与 `spec` 工件，再进入 `superpower`
- 临时任务 / bugfix：先判断是否 trivial；若不 trivial，仍回到 `spec规范` 路径，再由 `superpower` 选择调试与验证方式

### 契约限制
- 若 `spec` 尚未存在，`superpower` 可以输出“应先补 spec / plan”这一程序性结论
- 但它不应直接把会话内行为提示提升为 durable feature 定义
- 若 `longterm` 状态缺失，`superpower` 可以要求先补项目事实入口
- 但它不应自行成为项目事实存储层

因此，这里的 bridge 是：
**Execution Layer 只接收上游真源，并把它们转成当前会话的执行方法。**

---

## 5. Inputs and outputs
### Inputs
`superpower` 在统一框架中可消费的输入包括：

- 当前用户任务与优先级
- 项目规则层给出的硬边界
- `longterm` 提供的项目事实、feature 状态、历史进度、session contract
- `spec规范` 提供的 feature 范围、计划、任务拆分、验收标准
- 当前代码库现状与已有验证证据

### Outputs
`superpower` 在统一框架中的输出应限定为会话内、运行时、可降级的执行信息，例如：

- 当前会话的动作顺序
- 选用的执行模式或方法类别
- 需要遵守的验证纪律
- 对下一步动作的程序性建议
- 对写回动作的前置要求（例如先补 acceptance evidence）

### Not outputs
它不直接输出这些主定义工件：

- 不输出项目事实主定义
- 不输出 feature 主定义真源
- 不输出项目规则主定义
- 不直接输出无证据的 `passes: true`

---

## 6. Fallback mode
当 `superpower` 所需上游输入不完整，或运行时执行系统不可用时，应进入**降级模式**，而不是越权补位。

### 缺 `longterm`
- 先回到 Project Memory Layer
- 补项目事实入口、feature 状态或 session contract
- 再进入执行层

### 缺 `spec`
- 若工作并非 trivial，则回到 Feature Delivery Layer
- 先补 `spec / plan / tasks` 或等价验收约束
- 不允许 execution layer 单独承担 durable feature 定义

### 运行时 skill 不可用
- 退回到仓库内已存在的 Unified Framework 主文档与项目规则
- 继续遵守相同的 authority order 与接口边界
- 以人工显式方式执行最小路径：读规则、读 `longterm`、读 `spec`、收集证据、再写回

### 降级时仍不变的规则
- 不能因为缺 skill 就让 `longterm` 变成执行框架
- 不能因为缺 skill 就让 `spec规范` 变成项目事实库
- 不能因为会话推进压力而跳过 evidence 要求

---

## 7. Future replacement / extension
未来若出现更成熟的运行时行为系统，可以替换或增强 `superpower`，但只能按 Execution Layer 规则接入。

允许的方向：
- Execution Layer replacement：用新的运行时方法系统替代 `superpower`
- Execution Layer augmentation：在不改变主 authority 的前提下，为 `superpower` 增加辅助手段

替换或增强时，应保持以下不变量：

1. 不新增第二份项目事实真源
2. 不新增第二份 feature 交付真源
3. 不把运行时方法提升为项目规则层
4. 仍能解释输入、输出、降级与验证路径
5. 兼容期内必须明确主从，不能长期双真源并存

因此，这份文档绑定的是**Execution Layer contract**，不是某个 skill 文件的具体实现细节。

---

## 8. Non-goals / anti-patterns
以下都不属于这份桥接文档要做的事：

- 把 `.codex/skills/*` 复制进仓库
- 在 `UnifiedFramework` 内重写一套 `superpower`
- 把 skill 行为说明升级成项目规则主定义
- 让 `longterm` 的 prompt / template 再次膨胀成第二套执行框架
- 让 `spec规范` 承担 runtime behavior authority
- 把 `AgentTeam` 重新抬成 minimum kernel 前置层
- 让单个 Agent 的“我完成了”取代 acceptance evidence

这份文档的目标是**显式桥接**，不是**复制实现**，也不是**重新分层**。

---

## 9. Minimal practical usage
最小实践口径可以保持为下面这条链路：

1. 先读项目规则，确认禁区与硬边界
2. 从 `longterm` 确认当前项目事实与目标 feature
3. 从 `spec规范` 读取该 feature 的 `spec / plan / tasks` 与 acceptance 要求
4. 再调用 `superpower` 选择当前会话的执行方法
5. 执行并收集 acceptance evidence 或等价验证证据
6. 仅在证据可追溯时，才把结果写回 `longterm`

如果任务很小，也只能做轻量化，而不能改写层级：

- 可以轻量执行
- 不能跳过 authority boundary
- 不能把执行层变成事实层或交付层

一句话记忆：

- `project facts -> longterm`
- `feature delivery -> spec规范`
- `execution methods -> superpower`

这就是 `superpower` 在 Unified Framework 中作为 Execution Layer bridge 的最小定义。

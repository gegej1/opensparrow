# Unified Framework Architecture

## 1. 背景
当前我们手上有三套当前最小内核体系，以及一个可选协作增强层，会共同影响 Agent 工作方式：

- `superpower skill`
- `spec规范`
- `longterm`
- `AgentTeam`（可选增强层）

它们并非完全冲突，但存在明显重叠：
- 都会影响任务拆分
- 都会涉及上下文管理
- 都会触及规则或约束
- 都会影响 Agent 的执行方式

问题不在于“谁错了”，而在于：
**如果没有唯一职责边界，一个项目里就会出现重复定义、口径漂移、甚至同一问题被多套系统同时管理。**

因此，这份文档的目标不是删掉某个系统，而是把它们整合成一个总框架，并定义清楚：
- 每层负责什么
- 每层不负责什么
- 每层输出什么工件
- 每层在什么时候触发
- 发生重叠时谁说了算

---

## 2. 设计目标
统一总框架必须同时满足 5 个目标：

1. **统一外观**
   - 对用户和总司令来说，它应当表现为一个框架，而不是四套互相竞争的方法。

2. **唯一职责**
   - 同一类问题，只能有一个模块拥有最终职责。

3. **低重复**
   - 不允许多个模块重复维护项目事实、代码风格、长期状态或同一层级的任务拆分。

4. **可迁移**
   - 这套总框架应可被带入新项目，并通过一次“项目适配”完成落地。

5. **可演进**
   - 后续出现新的系统、新的 Agent 机制或新的 Best Practice 时，能够被纳入同一框架，而不是再平行长出第五套方法论。

---

## 3. 总体结构
统一总框架采用“**一层上游规则 + 三层最小内核 + 一层可选协作增强**”结构：

### 3.1 上游规则层（Project Rules Layer）
- 由项目自己的 `AGENTS.md` / constitution / repo rules 构成
- 它不是三件套的一部分，但它是统一框架运行的前提层
- 它负责定义项目规则、禁改区、质量门槛、代码风格和治理边界

### 3.2 最小内核（三件套）
1. **Execution Layer** → `superpower skill`
2. **Feature Delivery Layer** → `spec规范`
3. **Project Memory Layer** → `longterm`

### 3.3 可选增强层
4. **Orchestration Layer** → `AgentTeam`
   - 默认作为多 Agent 协作场景下的 overlay 使用
   - 不属于新项目接入的最小前提层

它们不是平级竞争关系，而是不同时间尺度上的职责分工：

- 项目规则层解决“这个项目什么是允许的、什么是权威规则”
- `skill` 解决“这一个会话里怎么做”
- `spec规范` 解决“这个 feature 怎么交付”
- `longterm` 解决“这个项目长期处于什么状态”
- `AgentTeam` 解决“在需要多 Agent 时，如何协作完成任务”

---

## 4. 唯一职责定义

### 4.1 Execution Layer：`superpower skill`
**负责：**
- 会话内行为规则
- 思考顺序
- 验证纪律
- 常见工作模式（如 brainstorming、debugging、planning、verification）
- 如何执行一个任务，而不是任务本身的长期记录

**不负责：**
- 项目的长期状态存储
- 项目的 feature 总表
- 项目的长期进度日志
- 项目的唯一代码风格规范
- 多 Agent 的全局项目调度状态

**核心定位：**
`superpower skill` 是执行行为引擎，不是项目数据库。

---

### 4.2 Feature Delivery Layer：`spec规范`
**负责：**
- 将一个 feature 变成 `spec -> plan -> tasks -> implement`
- 定义某个 feature 的范围、边界、验收标准、执行计划
- 把 feature 从“想法”变成“可执行交付单元”

**不负责：**
- 维护整个项目长期 backlog
- 记录整个项目所有已完成 / 未完成状态
- 持久维护跨会话项目上下文
- 定义总司令与子 Agent 的长期编队制度

**核心定位：**
`spec规范` 是 feature 交付工厂，不是项目记忆系统。

---

### 4.3 Project Memory Layer：`longterm`
**负责：**
- 项目画像（如 `app_spec`）
- 项目 feature 全景（如 `feature_list`）
- 项目长期进度（如 `progress` / `claude-progress`）
- 项目初始化入口（如 `init.sh`）
- 跨会话事实持久化

**不负责：**
- 把单个 feature 细拆成开发步骤
- 替代 `spec -> plan -> tasks`
- 直接承担多 Agent 分工与 ownership 管理
- 定义会话级执行技巧

**核心定位：**
`longterm` 是项目事实源与长期记忆层，不是 feature 任务执行器。

---

### 4.4 Orchestration Layer：`AgentTeam`
**负责：**
- 总司令如何接管项目
- 如何进行项目适配
- 如何分发任务给不同 Agent
- 如何分配文件所有权
- 如何控制并行边界
- 如何回收结果、审阅、验收与更新上下文

**不负责：**
- 替代项目长期事实存储
- 替代 feature 规格文档
- 替代会话内执行技能体系
- 直接定义项目代码风格本身

**核心定位：**
`AgentTeam` 是协作与调度层，不是项目事实层，也不是 feature 规格层。

---

## 5. 权威顺序（Authority Order）
当多个系统同时对某件事发声时，按以下顺序决定谁是最终权威：

1. **当前用户指令**
2. **当前项目的 AGENTS / constitution / repo rules**
3. **Unified Framework 的职责边界定义**（本文件）
4. **项目中落地的 `longterm` / `spec` 工件**
5. **可选的 `AgentTeam` 协作工件**
6. **`superpower skill` 的执行方法**

解释：
- `skill` 可以告诉 Agent “怎么做”，但不能推翻项目自己的规范
- `longterm` 可以记录项目事实，但不能推翻当前用户的最新目标
- `AgentTeam` 只在项目启用多 Agent 协作时参与派工，且不能替代项目宪法
- `spec` 可以定义某个 feature 的边界，但不能覆盖整个项目治理规则

---

## 6. 冲突最多的 4 个领域

### 6.1 任务拆分
这是最容易重复的地方。

统一规则：
- **项目级拆分** → `longterm`
  - 负责决定：项目有哪些 feature、先做什么、依赖关系如何
- **feature 级拆分** → `spec规范`
  - 负责决定：这个 feature 的 spec、plan、tasks 是什么
- **会话内执行拆分** → `superpower skill`
  - 负责决定：当前会话里如何一步步推进这项工作
- **多 Agent 分发拆分** → `AgentTeam`（仅在启用协作增强层时）
  - 负责决定：哪些任务由哪些 Agent 执行，如何并行，如何收口

**结论：**
同一个层级的任务拆分，不能由两个模块同时拥有。

---

### 6.2 上下文管理
统一规则：
- **长期项目事实** → `longterm`
- **feature 级上下文** → `spec规范`
- **当前会话临时推理上下文** → `superpower skill`
- **多 Agent 协作状态** → `AgentTeam`

**结论：**
不要让 `AgentTeam` 自己维护一份独立“项目事实库”；它应该依赖 `longterm`。

---

### 6.3 宪法 / 规范 / 代码风格
统一规则：
- 项目层面的规范、禁改区、质量门槛、代码风格，必须由项目自己的 `AGENTS.md` / constitution 定义
- 其他三层只能引用，不应重复发明一套项目规则

**结论：**
以后如果发现 `longterm`、`AgentTeam`、`spec模板` 里出现大量项目代码风格定义，应优先删除或改为“遵循项目规范”。

---

### 6.4 完成判定
统一规则：
- `skill` 负责要求“没有验证证据不能宣布完成”
- `spec规范` 负责定义某个 feature 的验收标准
- `longterm` 负责在 feature 通过后更新长期状态
- `AgentTeam` 负责组织验证与验收顺序（若启用）

**补充握手规则：**
- `feature_list` 中某个条目改为 `passes: true` 之前，应能指向该 feature 对应 `spec` 中的 acceptance evidence 或等价验证证据
- `passes: true` 不只是会话成功标记，而是对 feature 级验收已经完成的长期事实记录

**结论：**
完成判定是协作动作，但“是否满足目标”要回到 `spec` 与项目事实，而不是只听某个 Agent 说“完成了”。

---

## 7. 统一工作流

### 阶段 A：接手项目
由 `AgentTeam` 启动：
- 运行项目适配
- 识别规则、目录、上下文、验证入口
- 建立总司令视角的项目模型

### 阶段 B：建立项目记忆
由 `longterm` 承接：
- 建立 / 更新 `app_spec`
- 建立 / 更新 `feature_list`
- 建立 / 更新 `progress`
- 明确 `init` 和 session 合同

### 阶段 C：定义 feature
由 `spec规范` 承接：
- 选择一个 feature
- 生成 `spec`
- 完善 `plan`
- 生成 `tasks`

### 阶段 D：执行 feature
由 `superpower skill` + `AgentTeam` 共同承接：
- `skill` 提供执行纪律
- `AgentTeam` 负责派工、ownership、并行控制、回收结果

### 阶段 E：收尾更新
由 `AgentTeam` 驱动，写回 `longterm`：
- 更新长期记录
- 标记 feature 状态
- 更新当前项目上下文
- 为下一次会话留下可继承事实

---

## 8. 对“是否可以只保留 Superpower”的结论
当前结论是：**不能。**

原因不是 `superpower` 不够强，而是它的职责不对。

如果只保留 `superpower`：
- 会有强执行力
- 会有很好的会话方法
- 但会弱化项目长期事实源
- 会弱化跨会话 backlog 与进度记忆
- 会让很多“项目状态”变成隐式知识，而不是显式文件

因此：
- `superpower` 应该成为统一框架里的执行引擎
- 但不应替代 `longterm`
- 也不应替代 `spec规范`

---

## 9. 当前建议的修剪原则
在做具体剪枝前，先遵守以下总原则：

### 原则 1：项目事实只保留一份
- 项目当前状态、feature 全景、progress，只能以 `longterm` 为主事实源

### 原则 2：feature 规格只保留一套流程
- feature 交付一律走 `spec -> plan -> tasks`

### 原则 3：执行技巧不要冒充项目规则
- `skill` 只定义执行方法，不定义项目自己的宪法

### 原则 4：调度层不维护第二份项目数据库
- `AgentTeam` 应当读写项目事实，而不是在自己的模板里复制一份项目状态

### 原则 5：所有项目特定约束都应落到项目本身
- 最终项目规则必须沉淀到项目自己的 `AGENTS.md` / constitution 中
- 总框架只提供结构，不替项目定义具体风格细节

---

## 10. 后续演进方向
本架构文档落地后，下一步最值得做的是：

1. **剪枝清单**
   - 找出四层中哪些内容重复定义了
   - 明确该删、该迁、该保留什么

2. **项目适配入口规范**
   - 定义一个“新项目接入统一框架”的标准顺序

3. **模块间接口定义**
   - 明确 `AgentTeam` 如何读取 `longterm`
   - 明确 `spec规范` 如何消费 `longterm` 的项目事实
   - 明确 `skill` 如何只做执行而不越权

4. **最小可复制版本**
   - 最终形成一个对新项目足够轻的整合包，而不是让新项目背上所有历史资产

---

## 11. 一句话总结
统一总框架的核心不是“把所有东西揉成一坨”，而是：

- **项目事实归 `longterm`**
- **功能交付归 `spec规范`**
- **多 Agent 协作归 `AgentTeam`**
- **执行纪律归 `superpower skill`**

只有这样，重叠才会变成分层协作，而不是重复建设。

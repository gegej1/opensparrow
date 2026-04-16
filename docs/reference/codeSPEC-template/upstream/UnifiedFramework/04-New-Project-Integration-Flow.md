# New Project Integration Flow

## 1. 目的
这份文档定义：
**一个全新的项目，如何以最小成本接入统一框架。**

当前这版只聚焦三件套：
- `spec规范`
- `longterm`
- `superpower skill`

说明：
- `AgentTeam` 在当前 v1 中被定义为可选 orchestration overlay，而不是新项目接入的硬依赖
- 可以把它看成后续在多 Agent 协作成熟后再叠加的增强层

因此，本文件描述的是：
**最小内核接入流程。**

---

## 2. 最小内核是什么
对于一个新项目，统一框架的最小内核不是四层全开，而是：

1. **项目规则层**
   - 项目的 `AGENTS.md` / constitution / README / repo rules
2. **Project Memory Layer**
   - `longterm`
3. **Feature Delivery Layer**
   - `spec规范`
4. **Execution Layer**
   - `superpower skill`

其中：
- 项目规则层是前提，不属于三件套，但必须先存在
- `longterm` 负责项目事实
- `spec规范` 负责 feature 交付
- `superpower skill` 负责执行方法

如果以后项目确实进入多 Agent 协作阶段，再叠加 `AgentTeam` 作为 overlay，而不是重写三件套主路径。

---

## 3. 接入时机
应当执行这份流程的场景：
- 第一次把统一框架带入一个新项目
- 一个已有项目原来没有统一的长期记忆和 feature 交付机制
- 一个项目已经存在部分流程，但想和统一框架对齐

不必完整重跑的场景：
- 同一个项目里的后续普通 feature 开发
- 只是继续上一次已经接管完成的项目
- 当前项目的框架接入方式未发生本质变化

---

## 4. 总原则

### 原则 1：先立项目规则，再立工具骨架
如果项目自己的 `AGENTS / constitution / repo rules` 还不清楚，不要急着拷贝 `longterm` 或 `spec规范`。

### 原则 2：先建项目事实层，再建 feature 交付层
没有 `longterm`，就没有稳定的项目事实源；没有项目事实源，`spec` 很容易漂。

### 原则 3：`superpower skill` 不用“安装到仓库里”才算接入
它更像运行时行为系统。
对新项目的真正接入动作是：
- 确保 Agent 在会话中会先读项目规则
- 确保 Agent 会从 `longterm` 和 `spec` 读取事实
- 确保 Agent 不越权替代项目事实源

### 原则 4：先跑通第一条完整链路
不要一开始就追求所有模块齐全。
新项目接入的成功标准是：
- 能完成一次从“项目事实 → spec → 执行 → 写回事实”的闭环。

---

## 5. 标准接入流程

## Step 0：确认项目规则主定义
在任何框架接入之前，先确认以下内容是否存在：
- `AGENTS.md` 或等价规则文件
- README / docs 中的运行说明
- 是否有禁改目录、生成物目录、凭证规则、验证要求

如果不存在，先补最小规则：
- 项目结构说明
- 运行 / 测试 / 验证入口
- 禁改区域
- 基本质量门槛

**目标：**
先明确“这个项目自己的规则是什么”，而不是把通用框架当项目规则本身。

---

## Step 1：接入 `longterm`
把 `longterm` 作为项目事实层接入。

最小需要具备：
- `app_spec`
- `feature_list`
- `progress`
- `init`

接入动作：
1. 在项目根目录放入 `longterm`
2. 创建该项目对应的 workspace
3. 填写 `app_spec`
4. 生成初始 `feature_list`
5. 生成或定制 `init`
6. 建立第一条 `progress` 记录

**目标：**
把项目从“口头记忆”变成“文件事实”。

---

## Step 2：完成项目画像
在 `longterm` 里至少沉淀出以下信息：
- 这个项目是干什么的
- 当前阶段是什么
- 哪些目录是核心区域
- 哪些目录不能动
- 当前验证入口是什么
- backlog 的粗粒度结构是什么

**目标：**
让任何后续会话都有一个稳定的起点。

---

## Step 3：选择第一个 feature
不要一开始做“大一统接入任务”。
应从 `feature_list` 中选一个：
- 边界清晰
- 风险可控
- 能验证
- 能作为接入样板的 feature

并建立该 feature 与 `specs/` 下目录或等价 feature 工件的唯一映射。

**目标：**
让统一框架先跑通一条真实业务链，而不是停留在骨架搭建。

---

## Step 4：接入 `spec规范`
为选中的 feature 启动 `spec规范`：
- 生成 `spec`
- 生成 `plan`
- 生成 `tasks`

使用规则：
- `spec` 必须读取项目规则与 `longterm` 提供的项目事实
- `spec` 不得脱离 `longterm` 凭空定义项目状态
- `tasks` 只拆当前 feature，不替代整个项目 backlog

**目标：**
让 feature 从“项目候选项”变成“可执行交付单元”。

---

## Step 5：使用 `superpower skill` 执行
在 feature 进入执行阶段后，`superpower skill` 开始发挥作用：
- 决定是否先 brainstorming
- 决定是否要 planning
- 决定是否要 debugging
- 决定如何做 verification

关键约束：
- `skill` 只能指导执行方式
- `skill` 不替代 `longterm`
- `skill` 不替代 `spec`
- `skill` 不创建第二份项目事实

**目标：**
让执行变得稳定、严谨、可验证，而不是依赖临场发挥。

---

## Step 6：写回 `longterm`
当 feature 完成并验证后，必须写回项目事实层：
- 更新 `feature_list`
- 更新 `progress`
- 记录关键验证证据
- 记录当前状态和下一步建议
- 仅在能追溯到该 feature 的 acceptance evidence 时，才将对应条目标记为 `passes: true`

**目标：**
把一次成功的会话结果沉淀成可继承事实。

---

## Step 7：形成闭环
如果以下闭环已经跑通，则说明新项目接入成功：

`项目规则 -> longterm -> spec规范 -> superpower 执行 -> 写回 longterm`

这就是统一框架在新项目中的**最小成功路径**。

---

## 6. 新项目接入成功标准
一个新项目不需要“把所有模板都复制完”才算接入成功。

真正的成功标准是：
- 项目规则已明确
- `longterm` 已成为项目事实源
- 至少有一个 feature 通过 `spec -> plan -> tasks` 落地
- `superpower skill` 在执行中没有越权替代项目事实层
- 完成结果已经写回 `longterm`

---

## 7. 常见误区

### 误区 1：先把所有框架都塞进去再说
问题：
- 新项目一开始就太重
- 很难知道哪些是必须的，哪些只是历史包袱

正确做法：
- 先用最小内核接入
- 先跑通一条闭环
- 再决定是否叠加增强层

### 误区 2：把 `superpower skill` 当成项目事实层
问题：
- skill 再强，也不等于长期记忆

正确做法：
- 所有长期状态仍然回写到 `longterm`

### 误区 3：只有 `longterm`，没有 `spec`
问题：
- 项目有了 backlog，但 feature 落地方式不清楚

正确做法：
- `longterm` 负责“做什么”
- `spec规范` 负责“这个 feature 怎么做”

### 误区 4：`spec` 不读项目事实，直接开写
问题：
- 容易做出脱离项目现实的 feature 方案

正确做法：
- `spec` 必须建立在项目规则和 `longterm` 事实上

### 误区 5：把 `AgentTeam` 当成最小接入依赖
问题：
- 会把本来简单的新项目接入变重

正确做法：
- 当前最小接入只看三件套
- 需要多 Agent 协作时，再叠加 `AgentTeam`

---

## 8. `AgentTeam` 什么时候再加进来
以下情况成立时，再把 `AgentTeam` 叠加进项目：
- 项目已经进入多 Agent 协作阶段
- 已经存在稳定的 `longterm` 和 `spec` 路径
- 已经有足够复杂的任务需要 ownership 和并行控制
- 总司令角色真的能带来效率提升

换句话说：
- `AgentTeam` 是增强层，不是新项目接入的前提层。

---

## 9. 推荐落地顺序（最简版）
如果你要把统一框架带进一个全新项目，推荐只按这个顺序做：

1. 建立项目规则
2. 接入 `longterm`
3. 选一个小 feature
4. 用 `spec规范` 把这个 feature 定义清楚
5. 用 `superpower skill` 执行
6. 把结果写回 `longterm`
7. 需要时再引入 `AgentTeam`

---

## 10. 一句话总结
新项目接入统一框架时，当前最小主路径不是四件套全开，而是：

- **先明确项目规则**
- **再建立 `longterm` 事实层**
- **再用 `spec规范` 落 feature**
- **再用 `superpower skill` 执行**
- **最后把结果写回 `longterm`**

这条链先跑通，再谈扩展和增强。

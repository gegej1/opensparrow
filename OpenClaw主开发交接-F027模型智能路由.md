# OpenClaw 主开发交接：F-027 模型智能路由

## 1. 本次交付是什么

这次交付不是改 OpenClaw 内核 schema，也不是证明 OpenClaw 原生支持智能路由。
这次交付的实际结果是：

- 在仓库内新增一套 **repo-local custom plugin** 方案
- plugin id / provider 为：`opensparrow-router`
- 默认模型入口为：`opensparrow-router/auto`
- 路由决策复用 `@blockrun/clawrouter` 的 `route()` / `DEFAULT_ROUTING_CONFIG`
- 实际模型执行不走官方 wallet / x402，而是走用户自有 OpenAI-compatible 上游
- 已提供 mac 本地最小双终端演示链路

一句话：

**这是一个“挂在 OpenClaw 里的模型智能路由 plugin 接入方案”，不是 OpenClaw 原生内置路由。**

## 2. 为什么这么做

原因很直接：

- 当前仓库版本的 OpenClaw schema 不认：
  - `models.routing`
  - `routingConfigPath`
  - `classifier_model`
  - `strategy: "llm"`
- 所以不能靠原生配置直接落模型语义路由
- 但用户目标已经很明确：
  - 简单任务走轻模型
  - 复杂任务走强模型
  - 需要可运行、可演示、可接入 OpenClaw 的代码

因此本轮选择的是：

- 不改 `vendor/`
- 不等内核 schema 扩展
- 直接通过 plugin/provider 形式，把模型路由挂进 OpenClaw

## 3. 当前代码入口

### 3.1 plugin 主入口

- `scripts/model-routing/custom-plugin/src/index.mjs`

关键点：

- 在这里注册 `opensparrow-router`
- 在这里把 provider model 暴露成 `opensparrow-router/auto`
- 在这里起本地 proxy service
- 在这里执行 tier 选择并透传到上游模型

### 3.2 路由公共逻辑

- `scripts/model-routing/lib/custom-plugin-routing.mjs`
- `scripts/model-routing/custom-plugin/src/lib.mjs`

关键点：

- 统一 provider/model id 常量
- tierModelMap 默认值
- port/baseUrl 生成
- payload 和 header 清洗

### 3.3 启停管理

- `scripts/model-routing/manage-custom-routing-plugin.mjs`

关键点：

- 安装 / 复用隔离 runtime
- 把 plugin 同步到隔离 profile 的 extension 目录
- 写入 plugin config
- 输出隔离 OpenClaw 启动所需环境变量

### 3.4 演示入口

- `scripts/model-routing/run-openclaw-custom-plugin.sh`
- `scripts/model-routing/watch-custom-routing-plugin-log.sh`
- `scripts/model-routing/chat-custom-routing-plugin.sh`
- `scripts/model-routing/open-custom-routing-demo-terminals.sh`
- `platforms/mac/wrappers/06-模型智能路由双终端演示.command`

### 3.5 文档入口

- `docs/runbooks/F-027-custom-model-routing-plugin.md`
- `specs/027-custom-model-routing-plugin/spec.md`
- `specs/027-custom-model-routing-plugin/plan.md`
- `specs/027-custom-model-routing-plugin/tasks.md`

## 4. 现在真实已经打通的链路

当前已经真实打通的是：

`OpenClaw gateway -> opensparrow-router plugin -> plugin 内 proxy -> 用户自有 OpenAI-compatible upstream`

已知可工作事实：

- plugin 可以被隔离 lab runtime 真正加载
- `opensparrow-router/auto` 可作为模型入口
- plugin 会输出 tier / selected model / provider model
- 可以基于自然语言输入产生不同路由决策
- 已在本地用真实上游接口做过调用验证

## 5. 当前最稳定的展示入口

不要优先拿 `openclaw tui` / 厚 agent 协议链路做第一现场展示。

当前最稳定的是：

- 终端 A：`bash scripts/model-routing/watch-custom-routing-plugin-log.sh`
- 终端 B：`bash scripts/model-routing/chat-custom-routing-plugin.sh`

原因：

- 这条链路直接打到 plugin 起的本地 proxy
- 更容易看清楚：
  - tier
  - selected model
  - provider model
  - reasoning
- 已经证实它是真 plugin 路线，不是独立 fake demo 进程

## 6. 当前边界和遗留问题

### 6.1 这不是原生 schema 级支持

当前仍然不是：

- OpenClaw 原生 `models.routing`
- OpenClaw 内置 classifier 路由
- OpenClaw 官方 schema 认可的 task-type 自动路由

而是：

- 通过 custom plugin/provider 实现的工程接入

### 6.2 `openclaw tui` / agent 链路还不建议作为稳定展示面

本轮处理过 streaming / usage / provider cost 等问题，但厚 agent reply payload 仍有契约边界。

结论：

- 模型路由本身已经真实跑通
- 但 `tui/agent` 不是当前这轮最稳的 demo 面

### 6.3 当前仓里还有其他并行改动

本次 PR 应只关注 F-027 相关资产。
不要把其他未收口的 UI / WeCom / USB / governance 改动混进对 F-027 的判断里。

## 7. 如果主开发要继续推进，推荐顺序

### 路线 A：继续保持 plugin 路线（推荐短期）

适用目标：

- 先把“模型智能路由”以最小侵入方式稳定下来
- 继续保留对当前 OpenClaw 主体的低改动

建议动作：

1. 收口 `F-027` 的启动入口和演示入口
2. 决定是否把这套 plugin 变成正式可分发插件
3. 决定默认 profile / config 注入策略
4. 把后续飞书/CLI 等调用统一指到这套路由 provider

### 路线 B：把它继续并入 USB portable 交付链

这不是本轮完成项，但下一轮很好接：

1. 把 `scripts/model-routing/` 和 plugin 资产加入 USB 打包清单
2. 增加 USB 专用 enable/start 入口
3. 固定 USB 独立 profile、端口、日志目录
4. 明确凭据注入方式

另见：

- `模型智能路由-USB打包注意事项.md`

### 路线 C：如果未来要内化为 OpenClaw 原生能力

那将是另外一个层级的任务，不是本轮 patch 延伸一下就能完成的。

需要单独做：

- schema 扩展
- routing config 设计
- classifier / policy 契约
- provider / agent / channel 的交互边界定义
- 文档和配置迁移路径

## 8. 本轮不建议动的东西

- 不建议直接改 `vendor/`
- 不建议先把注意力放到 Agent 智能路由
- 不建议先做渠道绑定层复杂扩展
- 不建议在还没决定内核方案前就把 plugin 逻辑散落到多处

## 9. 本轮已经产出的工程资产

### 代码

- `scripts/model-routing/custom-plugin/`
- `scripts/model-routing/lib/`
- `scripts/model-routing/manage-custom-routing-plugin.mjs`
- `scripts/model-routing/run-openclaw-custom-plugin.sh`
- `scripts/model-routing/watch-custom-routing-plugin-log.sh`
- `scripts/model-routing/chat-custom-routing-plugin.sh`
- `scripts/model-routing/open-custom-routing-demo-terminals.sh`

### 文档

- `docs/runbooks/F-027-custom-model-routing-plugin.md`
- `specs/027-custom-model-routing-plugin/`
- `模型智能路由-USB打包注意事项.md`

### 项目记忆

- `longrun/workspaces/opensparrow-unified/feature_list.json`
- `longrun/workspaces/opensparrow-unified/claude-progress.txt`

## 10. 最后一句话

如果只问主开发一个最重要的判断题，那么答案是：

**当前这套“模型智能路由”已经以 OpenClaw custom plugin 的形式落地，可继续沿 plugin/provider 方向收口；如果后续要做成原生内核能力，需要单独立项，不建议把两件事混在同一个 patch 里。**

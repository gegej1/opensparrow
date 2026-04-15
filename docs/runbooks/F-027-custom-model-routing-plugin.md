# F-027：自定义 OpenClaw 模型智能路由 Plugin

## 目标

把官方 `ClawRouter` 的 `route()` / `DEFAULT_ROUTING_CONFIG` 复用到我们自己的 OpenClaw plugin 里，执行层改走用户自己的 OpenAI-compatible `baseUrl + apiKey`，并提供一套可直接截图演示的双终端链路。

主链路：

`OpenClaw gateway -> opensparrow-router plugin -> plugin 内本地 proxy -> 用户自己的上游模型`

## 产物

- `specs/027-custom-model-routing-plugin/`
- `scripts/model-routing/custom-plugin/`
- `scripts/model-routing/manage-custom-routing-plugin.mjs`
- `scripts/model-routing/run-openclaw-custom-plugin.sh`
- `scripts/model-routing/watch-custom-routing-plugin-log.sh`
- `scripts/model-routing/chat-custom-routing-plugin.sh`
- `scripts/model-routing/wait-chat-custom-routing-plugin.sh`
- `scripts/model-routing/open-custom-routing-demo-terminals.sh`
- `platforms/mac/wrappers/06-模型智能路由双终端演示.command`

## 当前默认模型映射

- `SIMPLE -> gemini-2.0-flash-ssvip`
- `MEDIUM -> kimi-k2-0711-preview`
- `COMPLEX -> deepseek-r1-250528`
- `REASONING -> deepseek-r1-250528`

## 启用 / 检查 / 关闭

```bash
bash scripts/model-routing/enable-custom-routing-plugin.sh
bash scripts/model-routing/status-custom-routing-plugin.sh
bash scripts/model-routing/disable-custom-routing-plugin.sh
```

说明：

- `enable` 会把 repo 内的 plugin 源码同步到隔离 lab profile，并写入 plugin config。
- 之后再次启动时，如果 shell 里没再显式 export `OPENSPARROW_ROUTER_BASE_URL` / `OPENSPARROW_ROUTER_API_KEY`，脚本会自动回读隔离 profile 里已保存的 plugin 配置。
- 不修改 `vendor/`，也不污染主 profile。

## 最短双终端演示

推荐入口：

```bash
bash scripts/model-routing/open-custom-routing-demo-terminals.sh
```

或者双击：

```bash
platforms/mac/wrappers/06-模型智能路由双终端演示.command
```

启动结果：

- 终端 A：只显示 plugin 路由关键日志
  - `OpenSparrow custom router proxy listening ...`
  - `agent model: opensparrow-router/auto`
  - `[opensparrow-router] [SIMPLE|MEDIUM|COMPLEX|REASONING] ...`
- 终端 B：自然语言聊天 UI
  - 直接输入中文任务
  - 会打印 `tier` / `selected` / `provider` / `reasoning`

## 三个推荐演示问题

### 1) 简单任务

```text
帮我把这段话改得更礼貌一点：今天下午我要晚到半小时，麻烦你先帮我顶一下会。
```

预期：`SIMPLE`

### 2) 中等任务

```text
请帮我设计一个会议纪要模板，包含：背景、关键决策、风险、行动项四部分，并给一个 JSON 示例。
```

预期：`MEDIUM`

### 3) 偏复杂 / 需要比较与判断

```text
请严格按照下面步骤进行推导，并在最后输出结论与公式：
1. 我们有三档模型：S 成本 0.2、M 成本 1、R 成本 4。
2. 请求分布如下：文本润色 4200 次、结构化总结 1300 次、带代码的排障 260 次、带数学计算的决策分析 140 次。
3. 平均输出 tokens 分别是：180、450、900、1200。
4. 如果全部走 R，总成本是多少？
5. 如果前两类分别走 S / M，后两类走 R，总成本是多少？
6. 如果把“带代码的排障”也降到 M，会节省多少成本？风险是什么？
7. 请给一个包含公式、代入过程、结果对比表、推荐方案与理由的完整答案。
```

预期：`REASONING`

## 已验证事实

- plugin 已被 `OpenClaw 2026.4.14` 真正加载。
- plugin provider 是 `opensparrow-router/auto`。
- 路由内核真实使用 `@blockrun/clawrouter` 的 `route()` / `DEFAULT_ROUTING_CONFIG`。
- 执行层真实调用用户自己的 OpenAI-compatible 上游，而不是 BlockRun wallet / x402。
- 流式请求已经透传，中文 prompt 可以正常返回。
- provider model 条目已补 `cost` 结构，避免 usage 归一化阶段崩溃。

## 当前边界

### 稳定演示面

当前最稳定、最适合现场截图的链路是：

- 终端 A：`watch-custom-routing-plugin-log.sh`
- 终端 B：`chat-custom-routing-plugin.sh`

这条链路是真实 plugin 路线，因为：

- 本地 `8412` 端口不是独立 demo 进程
- 它由 `opensparrow-router` plugin 在 OpenClaw gateway 内启动
- 路由日志由 OpenClaw plugin 自己打印

### 尚未收口的边界

`openclaw tui` / `openclaw agent` 这条“厚 agent 协议”链路，在当前通用模型上仍会遇到 OpenClaw 自身的 agent reply payload 契约问题；模型能流出可见文本，但最终 turn 仍可能被判成不完整。

因此：

- **本轮已经完成“真实 plugin 模型智能路由 + 双终端演示”**
- **但不把 `openclaw tui` 当成当前版本的稳定演示入口**

如果后续要继续打通 `tui/agent`，需要单独收口 OpenClaw agent payload 协议适配，这不属于本轮最小可用范围。

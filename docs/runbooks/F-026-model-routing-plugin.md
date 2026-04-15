# F-026：OpenClaw 官方 ClawRouter Plugin 接入

## 目标

把 `@blockrun/clawrouter` 作为 **OpenClaw 官方 plugin** 接入当前副本工作区，并通过本地隔离 lab 提供可执行的：

- runtime bootstrap
- plugin enable / disable / status
- CLI 验证

## 路线说明

本方案与 `F-025` 的区别：

- `F-026`：走官方 plugin，模型由 `blockrun/auto` 智能路由
- `F-025`：走 standalone/proxy + custom provider，适合继续复用自定义 `URL + API Key`

**重要**：
`F-026` 默认走 BlockRun wallet / x402 体系，**不直接消费你给的 OpenAI-compatible URL + Key**。
如果你要继续复用自定义上游，请走 `F-025`。

## 本地隔离目录

默认 lab 根目录：`dist/model-running-lab/`

关键子目录：

- runtime：`dist/model-running-lab/runtime/`
- home：`dist/model-running-lab/home/`
- cache：`dist/model-running-lab/cache/`
- logs：`dist/model-running-lab/logs/`

之所以这样做，是因为 `ClawRouter` plugin 在运行时会写入：

- `HOME/.openclaw/openclaw.json`
- `HOME/.openclaw/blockrun/wallet.key`
- `HOME/.openclaw-<profile>/extensions/clawrouter/`

所以这里不直接用你的真实 `~`，而是把 `HOME` 收口到 repo 内的隔离 lab。

## 最短入口

### 开启

```bash
bash scripts/model-routing/enable-clawrouter-plugin.sh
```

或点击：

- `platforms/mac/wrappers/02-开启模型智能路由.command`

### 查看状态

```bash
bash scripts/model-routing/status-clawrouter-plugin.sh
```

或点击：

- `platforms/mac/wrappers/04-检查模型智能路由.command`

### 关闭

```bash
bash scripts/model-routing/disable-clawrouter-plugin.sh
```

或点击：

- `platforms/mac/wrappers/03-关闭模型智能路由.command`

### 验证

```bash
bash scripts/model-routing/test-clawrouter-plugin.sh
```

或点击：

- `platforms/mac/wrappers/05-验证模型智能路由.command`

## 直接跑 OpenClaw CLI

先保证 runtime 已 bootstrap 完成：

```bash
bash scripts/model-routing/enable-clawrouter-plugin.sh
```

然后通过 wrapper 进入隔离 lab 的 OpenClaw：

```bash
bash scripts/model-routing/run-openclaw-plugin.sh gateway run --allow-unconfigured --force --port 19191 --token model-routing-lab-token --verbose
```

另开一个终端：

```bash
bash scripts/model-routing/run-openclaw-plugin.sh agent --agent main --message "Reply with exactly OK." --thinking off --json
```

## 验证预期

`test-clawrouter-plugin.sh` 会先创建/复用一个专用 `clawrouter-probe` agent，再输出 JSON 摘要，避免误用 `main` agent 的旧 provider 状态。核心看这些字段：

- `runtimeVersion`
- `requests[].routedTier`
- `requests[].routedModel`
- `agent.provider`
- `agent.model`

在未充值钱包时，常见现象是：

- tier 会正常变成 `SIMPLE` / `MEDIUM` / `REASONING`
- 但实际模型会回退到免费模型，例如 `free/gpt-oss-120b`

这说明：

- **智能路由决策已经生效**
- 只是由于钱包余额为 `0`，强模型请求被降级到免费模型执行

## 已验证事实

在当前 lab 里已经验证到：

- `OpenClaw 2026.4.14` 可以承载该 plugin
- plugin 自动把默认模型切到 `blockrun/auto`
- 简单 / 中等 / 推理任务会打出不同的 `x-clawrouter-tier`
- `openclaw agent` CLI 请求真实走到了 `provider=blockrun, model=auto`
- 已在 lab stage 流程中修复官方 plugin 的一个实际边界：`x-clawrouter-reasoning` 原先会原样写入中文 reasoning，导致 Node 因非法 header 字符返回 `502`；现在启用脚本会在隔离 lab 内对官方 plugin dist 做最小补丁，把该 header 清洗为 ASCII-safe 文本，因此中文 prompt 也能稳定走完全链路

## 已知限制

1. `@blockrun/clawrouter` 当前官方 `plugins install` 路径会触发额外 peer 依赖解析，比较慢。
   因此本仓当前采用：
   - 官方 plugin 目录格式
   - 手工 stage 到 `extensions/clawrouter`
   - 再用兼容 runtime 的 `corepack pnpm` 安装插件依赖

2. 即使 plugin 已开启，如果钱包没充值，复杂任务也会 fallback 到免费模型。

3. `disable` 目前做的是：
   - 删除 plugin 目录
   - 清理隔离 lab 内的 blockrun 注入配置
   - 不动主用户 home

## 回退方案

如果你要用自定义 `URL + API Key` 而不是 BlockRun wallet：

- 回退到 `F-025`
- 入口仍然是 `scripts/model-routing/enable-clawrouter.sh`
- 那条路是 `custom provider + standalone proxy`

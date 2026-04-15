# F-025 模型智能路由代理接入

## 结论

本轮不升级 OpenClaw core，不走 plugin 模式，采用：

`OpenClaw -> provider: clawrouter -> ClawRouter standalone proxy -> 智能选模型`

## 最短入口

### macOS

- `platforms/mac/wrappers/02-开启模型智能路由.command`
- `platforms/mac/wrappers/03-关闭模型智能路由.command`
- `platforms/mac/wrappers/04-检查模型智能路由.command`

### Shell

```bash
bash scripts/model-routing/enable-clawrouter.sh
bash scripts/model-routing/status-clawrouter.sh
bash scripts/model-routing/disable-clawrouter.sh
```

## 默认行为

### enable

1. 在 `~/.openclaw-<profile>/model-routing/clawrouter-runtime/` 安装 `@blockrun/clawrouter`。
2. 在本地起 `http://127.0.0.1:8402/v1` 代理。
3. 写入 `models.providers.clawrouter`。
4. 写入 `clawrouter:default` auth profile，key 为 `x402`。
5. 把 primary model 切到 `clawrouter/blockrun/auto`。
6. 保留原有 fallback，并把“启用前 primary model”追加为 fallback（若原列表里还没有）。

### disable

1. 恢复启用前 primary / fallback / auth / provider。
2. 若代理由本脚本启动，则同时停止代理。

### status

输出 JSON，至少包含：

- `enabled`
- `primaryModel`
- `fallbacks`
- `providerConfigured`
- `proxyHealthy`
- `stateFile`
- `logFile`

## 环境变量

- `OPENCLAW_PROFILE` / `OPENCLAW_PROFILE_NAME`：默认 `usb-portable`
- `OPENCLAW_HOME`：默认当前用户 HOME
- `OPENSPARROW_CLAWROUTER_PORT`：默认 `8402`
- `OPENSPARROW_CLAWROUTER_VERSION`：默认 `0.12.149`
- `USB_RUNTIME_ROOT`：可显式指定 bundled runtime 根目录

## 回退策略

### 安装 / 启动失败

- 启用脚本会 best-effort 回滚到启用前 primary / fallback / auth / provider 状态。

### 运行中代理失效

- OpenClaw 仍保留原 fallback 机制。
- 本脚本会把“启用前 primary model”临时追加到 fallback 列表，因此智能路由挂掉时仍可回退到原模型链路。

### 完全放弃智能路由

```bash
bash scripts/model-routing/disable-clawrouter.sh
```


## 双终端真实 Demo

### 终端 A：启动本地 DMX router

```bash
export OPENSPARROW_DMX_BASE_URL='https://www.dmxapi.cn/v1'
export OPENSPARROW_DMX_API_KEY='替换成你的 key'
bash scripts/model-routing/run-dmx-router-demo.sh
```

启动后会监听：`http://127.0.0.1:18602`

终端 A 会实时打印：

- `tier`
- `classifierModel`
- `selectedModel`
- `providerModel`
- `durationMs`

### 终端 B：发送任务

```bash
bash scripts/model-routing/send-dmx-router-demo.sh simple
bash scripts/model-routing/send-dmx-router-demo.sh medium
bash scripts/model-routing/send-dmx-router-demo.sh reasoning
```

如果你希望第二终端只负责输入消息，可以直接跑：

```bash
bash scripts/model-routing/chat-dmx-router-demo.sh
```

也可以发自定义任务：

```bash
bash scripts/model-routing/send-dmx-router-demo.sh custom '请设计一个支持多租户隔离和审计追踪的任务编排系统。' 220
```

### 预期现象

- `simple`：通常落到 `SIMPLE -> gemini-2.0-flash-ssvip`
- `medium`：通常落到 `MEDIUM -> kimi-k2-0711-preview`
- `reasoning`：通常落到 `REASONING -> deepseek-r1-250528`

这套 demo 不是 fake：

- 终端 A 是本地真实 router 服务
- 终端 B 可以是 shell 请求，也可以直接进入交互输入模式
- 上游是你提供的 `URL + API Key`
- 返回内容来自真实上游模型响应

## 当前边界

- 本轮没有做 Dashboard 开关。
- 本轮没有做 ClawRouter plugin 模式。
- 本轮没有做 OpenClaw core 升级。
- 本轮只解决模型智能路由，不扩到 Agent 智能路由。

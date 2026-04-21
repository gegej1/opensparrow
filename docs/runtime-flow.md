# OpenSparrow Runtime Flow

## 1. 启动入口

### Root repo

开发/审查常用入口：

```bash
bash scripts/run-root-dashboard.sh
```

### Packaged macOS

对外交付入口：

```text
01-开始部署.command
```

两者最终都会把控制权交给：

```text
ui/server.mjs
```

## 2. 运行时路径解析

`ui/server.mjs` 启动后首先建立运行上下文：

- `PACK_ROOT`
- `RUNTIME_ROOT`
- `OPENCLAW_HOME`
- `PROFILE`
- `CONFIG_FILE`
- `AUTH_PROFILES_FILE`

关键逻辑：

1. 若存在 `runtime/`，优先把它当成 runtime root
2. 否则按平台回退到 `vendor/<platform>-openclaw`
3. 找 bundled Node binary
4. 找 OpenClaw entry

已知当前风险：

- mac runtime 存在 `bin/node_modules/openclaw` 与 `lib/node_modules/openclaw` 双版本分叉
- 这会影响 packaged WeCom preflight

## 3. 安装向导链路

前端入口：

- `ui/public/index.html`

主要流程：

1. 用户选择 channel
2. 填写凭据
3. 填写 API 连接
4. 前端 `POST /api/install`
5. server 执行：
   - plugin install
   - config write
   - daemon install/restart
   - post-install probe

当前实现特征：

- 安装步骤 UI 会轮询 `GET /api/install/status` 读取后端真实 step 状态
- 但完成判定现在会接受：
  - `daemon=running`
  - `runtimeMode=gateway-fallback`
  - `gatewayHealthy=true`
- `/api/install` 会优先安装包内离线 `plugins/*.tgz`
- package-local 诊断文件：
  - `install-state.json`
  - `install.log`
  - `diagnostic-bundle.json`

## 4. Dashboard 链路

前端入口：

- `ui/public/dashboard.html`

主要 API：

- `GET /api/status`
- `GET /api/config/api`
- `POST /api/config/api`
- `GET /api/config/model-routing`
- `POST /api/config/model-routing`

Dashboard 用 `/api/status` 回读：

- profile
- configPath
- gatewayPort
- daemon/runtime state

## 5. Model Routing 链路

### 保存面

关键文件：

- `ui/public/dashboard-model-routing-state.mjs`
- `ui/lib/model-routing-config.mjs`

智能路由 smart mode 保存时会写入：

- `plugins.entries.opensparrow-router.config`
- `models.providers.opensparrow-router`
- `agents.defaults.model.primary = opensparrow-router/auto`

### 运行面

关键文件：

- `scripts/model-routing/lib/custom-plugin-routing.mjs`
- `ui/server.mjs`

server 会拉起本地 sidecar：

- `GET /v1/models`
- `POST /v1/chat/completions`

sidecar 再根据 tier connection map 访问真实 upstream。

## 6. Session / Auth Rebind

关键文件：

- `ui/lib/session-rebind.mjs`

当 provider config、auth profile、runtime restart 同时发生时，会删除主 session binding，强制下次 turn 以 fresh config 重新绑定。

这属于当前 repo 明确存在的 session/context 管理点。

## 7. Packaging / Release Flow

关键文件：

- `scripts/build-usb-pack.sh`
- `longrun/workspaces/openclaw-usb-portable/execution/scripts/create-mac-handoff-copy.sh`
- `longrun/workspaces/openclaw-usb-portable/execution/scripts/lib/export-common.sh`

职责：

1. 复制 release-facing 真源
2. 打入离线 plugin archive
3. strip 本机状态、测试文件、残留 runtime state
4. 生成 Desktop folder + zip

当前最新对外候选：

- `/Users/eduardogan/Desktop/gtclaw-mac-release-arm64-20260420-132429.zip`

但当前仍有一个明确 blocker：

- packaged WeCom 安装会命中 mac bundled runtime split-brain

### P0 diagnostics additions

- `GET /api/diagnostics`
- `GET /api/diagnostics/export`
- build-time mac runtime drift guard
- export-time bundled OpenClaw version probe 优先 `lib/node_modules/openclaw`

## 8. Docker Flow

关键文件：

- `deploy/docker/Dockerfile`
- `deploy/docker/docker-compose.yml`
- `deploy/docker/bin/*.sh`

Docker baseline 存在，但不是当前最紧急的 blocker 面。当前优先级更高的是 packaged mac runtime / channel closure。

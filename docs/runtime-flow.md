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

历史说明：

- mac runtime 曾出现 `bin/node_modules/openclaw` 与 `lib/node_modules/openclaw` 双版本分叉风险
- `2026-04-23` fresh combined packaged verification 已不再把这条风险记录为当前 blocker

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

当前冻结 truth：

- `/api/status` 是 packaged runtime 的 authoritative status surface
- `2026-04-23` fresh packaged verifier 已确认 authoritative status truth PASS
- `POST /api/config/api` 继续存在，但只保留为 upstream connection / compatibility lane
- `POST /api/config/api` 当前 truthful save contract 允许：
  - `saved`
  - `saved_degraded`
  - `rejected`

## 5. Model Routing 链路

### 保存面

关键文件：

- `ui/public/dashboard-model-routing-state.mjs`
- `ui/lib/model-routing-config.mjs`

智能路由 smart mode 保存时会写入：

- `plugins.entries.opensparrow-router.config`
- `models.providers.opensparrow-router`
- `agents.defaults.model.primary = opensparrow-router/auto`

当前冻结 truth：

- dashboard 已存在 dedicated model-routing UI surface
- `2026-04-26` `unified-model-configuration-surface` closeout 后，dashboard 主模型配置入口统一为 `模型配置`
- `模型配置` 内部包含 `单模型` 与 `模型智能路由` 两种 mode
- `API 配置（上游连接）` 不再作为 peer main tab
- `模型智能路由` 不再作为 peer main tab
- routing UI load/save 只走 `GET /api/config/model-routing` / `POST /api/config/model-routing`
- save 后必须再读 authoritative read-back；follow-up `GET` / reopen 继续以 persisted truth 为准
- `POST /api/config/model-routing` 当前 truthful save contract 允许：
  - `saved`
  - `saved_degraded`
  - `rejected`
- internal ids 仍固定为：
  - `opensparrow-router`
  - `opensparrow-router/auto`

### unified model configuration surface closeout

Packet identity：

- `unified-model-configuration-surface`
- 新 dashboard/model-routing configuration surface packet
- 不是 `F-031` reopen
- 不是 `F-027` rewrite
- 不是 native provider routing
- 不是 `F-033` / `F-034` / install packet

Source evidence：

- `node --check ui/server.mjs` PASS
- `node --check ui/public/dashboard-model-routing-state.mjs` PASS
- `node --check ui/lib/model-routing-config.mjs` PASS
- `node --test ui/tests/dashboard-model-routing-ui.test.mjs` PASS, `4/4`
- `node --test ui/public/replay-surfaces.test.mjs` PASS, `20/20`
- `node --test ui/tests/packaged-save-contract-truth.test.mjs` PASS, `9/9`
- `node --test ui/tests/model-routing-runtime-dispatch.test.mjs` PASS, `1/1`
- `node --test ui/tests/dashboard-status-shell.test.mjs` PASS, `9/9`
- `git diff --check` allowed files PASS

Fresh packaged evidence：

- Artifact：`/private/tmp/unified-model-config-rebuild-x7V8BL/gtclaw-mac-release-arm64-20260426-193709/GTClaw-0.1.0-alpha-macOS-arm64`
- Zip：`/private/tmp/unified-model-config-rebuild-x7V8BL/gtclaw-mac-release-arm64-20260426-193709.zip`
- SHA256：`d32c040a7cb601561137cb47eec6aa15f77fbeb3c8915e1a7f3eb8f214cf90ea`
- UI port `19371`, gateway `19372`, router `19373`
- isolated `HOME`：`/private/tmp/unified-model-config-home-193709`
- isolated `OPENCLAW_HOME`：`/private/tmp/unified-model-config-openclaw-193709`
- profile：`unified-model-config-verifier`
- `/api/status.instance.packRoot` pointed to fresh artifact, not stale deleted `/private/tmp` artifact

Packaged UI/API truth：

- `/dashboard` verified with Chrome CDP fallback because Playwright unavailable
- main nav contains `模型配置`
- no peer main tab `API 配置（上游连接）`
- no peer main tab `模型智能路由`
- `单模型` mode has `Base URL` / `API Key` / `Model ID`
- smart mode has `SIMPLE` / `MEDIUM` / `COMPLEX` / `REASONING`, each with `Base URL` / `API Key` / `Model ID`
- single-mode `POST /api/config/model-routing` returned `HTTP 200`, `ok=true`, `mode=single`, `saveState=saved_degraded`; GET readback returned `effectivePrimaryModel = openai/single-packaged-model-193709`, `single.apiKeyConfigured = true`, and no plain key
- smart-mode `POST /api/config/model-routing` returned `HTTP 200`, `ok=true`, `mode=smart`, `saveState=saved_degraded`; GET readback returned `effectivePrimaryModel = opensparrow-router/auto`, all four tiers `apiKeyConfigured=true`, distinct tier models, and no plain key or `apiKey` property

Runtime per-tier dispatch truth：

- `SIMPLE -> port 19411`, model `simple-fixture-model-193709`
- `MEDIUM -> port 19412`, model `medium-fixture-model-193709`
- `COMPLEX -> port 19413`, model `complex-fixture-model-193709`
- `REASONING -> port 19414`, model `reasoning-fixture-model-193709`
- each fixture received `/v1/chat/completions`
- Authorization was checked internally as `authOk=true`
- no key values were printed

Security and invariant truth：

- Checked `/api/config/model-routing`, `/api/config`, `/api/status`, `/api/install/status`, `/api/diagnostics`, `diagnostic-bundle.json`, `ui-meta.json`.
- no synthetic tier key leakage
- no plain `apiKey` property in exposed/readback surfaces
- router response headers contain tier/model only, no key
- `providerId = opensparrow-router`
- `modelTarget = opensparrow-router/auto`
- invariants preserved through single readback, smart readback, and runtime dispatch

Residual risks：

- `saveState=saved_degraded` is expected in isolated verifier profile because no full daemon install matrix was run.
- dashboard initially redirects to setup until config exists; after packaged single-mode save creates config, `/dashboard` loads normally.

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

当前 fresh combined verifier artifact：

- `/tmp/f032-packaged-rebuild-botvDw/gtclaw-mac-release-arm64-20260423-141103/GTClaw-0.1.0-alpha-macOS-arm64`
- `/tmp/f032-packaged-rebuild-botvDw/gtclaw-mac-release-arm64-20260423-141103.zip`

`2026-04-23` 已确认的 combined packaged truth：

- GTClaw branding PASS
- authoritative status truth PASS
- dedicated model-routing UI surface exists PASS
- API config limited to compatibility lane PASS
- authoritative model-routing load/save PASS
- truthful save contract PASS
- internal ids unchanged PASS
- new files included in fresh artifact PASS

当前结论：

- packaged-mac 这条线已拿到 fresh combined packaged PASS
- 对外再次分发前仍建议补一轮独立新机 smoke，而不是把单机 fresh evidence写成跨机器 guarantee

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

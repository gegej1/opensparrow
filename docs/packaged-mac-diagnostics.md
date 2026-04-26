# Packaged mac Diagnostics

## 目标

P0 目标不是直接宣布 packaged WeCom / DingTalk 已闭环，而是先把 mac packaged deployment 变成：

- 可诊断
- 可定位
- 可导出证据
- 可回归验证

## 当前诊断面

### 安装状态

- `GET /api/install/status`
- package-local file: `install-state.json`
- package-local file: `install.log`

安装向导不再只依赖前端模拟进度；它会轮询后端真实 step 状态，并把状态映射到：

1. 安装渠道插件
2. 写入基础配置
3. 配置渠道
4. 启动服务
5. 验证连接

当前 timeout budget 也已按 slower clean-machine path 放宽：

- `POST /api/install`：前端等待 `300000ms`
- timeout 后的 terminal-state wait：`600000ms`
- install-complete wait：`600000ms`

这不是为了让页面无限转圈，而是为了避免“后端仍在合法慢路径内、前端却先到总预算上限”的 machine-specific 误报。

### 诊断信息

- `GET /api/diagnostics`
- `GET /api/diagnostics/export`
- package-local file: `diagnostic-bundle.json`

诊断 bundle 当前包含：

- profile / config / runtime path
- packaged instance fingerprint（`uiPort` / `packRoot` / `openclawHome` / `profileDir` / `pid` / `serverStartedAt`）
- resolved OpenClaw entry
- bundled OpenClaw version
- daemon / runtime / gateway health
- install-state snapshot
- install log tail
- 渠道 probe 回读快照

### Channel Probe Persistence

`/api/install` 在完成 channel probe 后，会把结构化结果写入以下 surface：

- `/api/install` response
- `GET /api/install/status`
- package-local `install-state.json`
- `GET /api/diagnostics`
- `GET /api/diagnostics/export`
- package-local `diagnostic-bundle.json`

字段形状为：

```json
{
  "channelProbes": {
    "dingtalk": null,
    "wecom": null
  }
}
```

如果某个 probe 返回 warning / error，结果不会被吞掉，而是继续进入 `channelProbes`，供 packaged WeCom / DingTalk fresh evidence 使用。probe snapshot 会做 secret redaction，不导出 token / secret / apiKey / authorization / password 明文。

### Instance Fingerprint

以下 surface 现在都会带同一份 non-secret instance fingerprint，便于判断浏览器是否连到了错实例 / 旧实例：

- `GET /api/status`
- `GET /api/install/status`
- `GET /api/diagnostics`
- `GET /api/diagnostics/export`
- package-local `install-state.json`
- package-local `diagnostic-bundle.json`

建议优先核对：

1. `uiPort` 是否等于当前浏览器地址栏端口
2. `packRoot` 是否等于当前正在使用的 release 目录
3. `openclawHome` / `profileDir` 是否落在预期 package-local `.gtclaw-state`
4. `serverStartedAt` / `pid` 是否对应当前这次启动，而不是旧进程

### Delivery Media Truth

对外交付时要区分：

- **clean zip**：可以作为 authoritative shipping artifact
- **expanded directory**：一旦本机跑过 `01-开始部署.command`，就会生成 package-local `.gtclaw-state`，不再等同于干净 release 目录

因此，若需要把 `221144` 再交给另一台机器：

- 优先交付未运行过的 zip；
- 或者重新从 clean zip 解压得到新目录；
- 不要直接复用已经在本机验证过的展开目录。

### Wrapper Preflight Hardening

mac `01-开始部署.command` 现在在真正拉起 UI 之前，先做四类 machine-specific 预检：

1. 清理 release 目录上的 `com.apple.quarantine`
2. 校验 bundled Node 是否包含当前 Mac 的 CPU slice
3. 校验 `npm` / `npx` / `corepack` 仍然是 symlink，避免外层 zip 被压扁
4. 为 gateway / router 选择空闲端口，降低旧 listener 干扰当前实例的概率

这些预检的目标不是“替代安装流程”，而是把 fake arm64、flattened symlink、端口冲突这类会把 packaged 行为变成 machine-specific 的问题，尽量提前在 wrapper 阶段 fail-fast。

### Gateway Port Truth

gateway fallback 启动路径现在不再把“端口已占用”直接视为成功：

- 先看当前端口上的 listener 是否真的是当前 profile 的 OpenClaw gateway；
- 只有 health check 通过，才会认定为 already running；
- 如果端口忙但健康检查不通过，会直接按 foreign listener 处理，而不是让 UI 假设服务已就绪。

这样可以直接收敛“浏览器连到了旧实例 / 别的进程占了目标端口，前端却误判安装完成”的问题。

### Bundled Plugin Truth

当 wrapper 以 packaged runtime hardening 模式启动时，server 现在会要求渠道插件必须来自包内 `plugins/`：

- `@openclaw-china/channels`
- `@wecom/wecom-openclaw-plugin`

如果缺少对应 bundled tarball，会直接 fail-fast，而不是悄悄退回在线安装。这样可以避免“本机缓存或联网条件掩盖问题，但新 Mac / 离线环境失败”的行为分叉。

## runtime truth

当前 packaged mac 的 runtime truth 规则：

- `ui/server.mjs` 优先从 `vendor/mac-openclaw/lib/node_modules/openclaw` 解析 entry / version
- `bin/node_modules/openclaw` 只作为 fallback
- build/export 阶段必须有 drift guard，防止 `lib` 与 `bin` 出现版本分叉仍被打包

## 2026-04-23 fresh combined packaged truth

fresh verifier 本轮实际验证的 rebuild artifact：

- `/tmp/f032-packaged-rebuild-botvDw/gtclaw-mac-release-arm64-20260423-141103/GTClaw-0.1.0-alpha-macOS-arm64`
- `/tmp/f032-packaged-rebuild-botvDw/gtclaw-mac-release-arm64-20260423-141103.zip`

已确认：

- GTClaw branding PASS
- `/api/status` authoritative status truth PASS
- dashboard 存在 dedicated model-routing UI surface
- `POST /api/config/api` 只保留为 compatibility lane，不再承担 routing truth
- `GET /api/config/model-routing` / `POST /api/config/model-routing` 是 authoritative model-routing load/save surface
- truthful save contract 允许：
  - `saved`
  - `saved_degraded`
  - `rejected`
- fresh verifier 实际拿到：
  - `POST /api/config/api` → `HTTP 200`, `ok:true`, `persisted:true`, `saveState:"saved_degraded"`
  - `POST /api/config/model-routing` → `HTTP 200`, `ok:true`, `persisted:true`, `saveState:"saved_degraded"`
- follow-up `GET` / reopen 都能读回 persisted truth
- internal ids 维持：
  - `opensparrow-router`
  - `opensparrow-router/auto`
- new files 已包含在 fresh artifact 中
- combined packaged truth PASS

## 2026-04-24 F-034 fresh packaged replay closeout

本轮 closeout 只基于 fresh packaged replay，不基于 stale historical PASS。

fresh closeout evidence roots：

- artifact dir：`/private/tmp/f034-packaged-rebuild-lT3AVc/gtclaw-mac-release-arm64-20260424-003358/GTClaw-0.1.0-alpha-macOS-arm64`
- artifact zip：`/private/tmp/f034-packaged-rebuild-lT3AVc/gtclaw-mac-release-arm64-20260424-003358.zip`
- replay root：`/private/tmp/f034-packaged-round5-replays-MOZFDx`
- capture root：`/private/tmp/f034-packaged-round5-captures-rhqPgf`

已确认：

- `F-034` 已 source PASS + fresh packaged PASS
- `step=plugins` 没有 regression 回到 indefinite running / fake success
- router invariants 保持：
  - `providerId=opensparrow-router`
  - `modelTarget=opensparrow-router/auto`

fresh replay matrix：

`dingtalk-only`

- `/api/install = HTTP 200`
- final `status=completed`
- final `installState=completed`
- `blockingStep=null`
- `blockingPlugin=null`
- `bypass={verdict:none, used:false}`
- `requestedChannelReadiness={dingtalk:true,wecom:true}`
- `channelProbes.dingtalk={status:ok, ready:true}`
- `six-surface consistency=true`
- passing replay 观察到 `staged-shell -> critical-dist -> final-authority lag` signature
- 这次 passing replay 没有真的跨过 `120000ms` timeout，因此 fresh PASS 不是靠 timeout safe_bypass 触发的

`wecom-only`

- `/api/install = HTTP 200`
- final `status=completed`
- final `installState=completed`
- `blockingStep=null`
- `blockingPlugin=null`
- `bypass={verdict:none, used:false}`
- `requestedChannelReadiness={dingtalk:true,wecom:true}`
- `channelProbes.wecom={status:ok, ready:true}`
- `six-surface consistency=true`

`dingtalk+wecom`

- `/api/install = HTTP 500`
- final `status=error`
- final `installState=failed`
- `blockingStep=probe`
- `blockingPlugin=wecom-openclaw-plugin`
- `bypass={verdict:failed, used:false, plugin:wecom-openclaw-plugin}`
- `requestedChannelReadiness={dingtalk:false,wecom:false}`
- `channelProbes.dingtalk={status:warning, ready:false}`
- `channelProbes.wecom={status:error, ready:false}`
- `six-surface consistency=true`
- 这是 exact frozen `F-033` probe truth，已保持

residual facts only：

- `dingtalk-only` 这次 passing replay 没直接 exercise packaged timeout+grace-wait path
- `wecom-only` 是 config-only probe summary，但在当前 acceptance 下仍是 packaged PASS
- 这些 residual risks 不升格为 blocker

## 2026-04-25 packaged channels late-stage authority closure

本节只记录 `packaged-channels-late-stage-authority-closure` 的 fresh closeout truth。它是新的 packaged install authority packet，不是 `F-034` reopen，也不是 dashboard/UI patch；`F-033` / `F-034` 历史身份保持不变。

Source PASS：

- `node --check ui/server.mjs` PASS
- `node --test ui/tests/packaged-single-channel-plugin-timeout-parity.test.mjs` PASS, `3/3`
- `node --test ui/tests/packaged-plugin-install-hang-bypass.test.mjs` PASS, `10/10`
- `node --test ui/tests/packaged-plugin-profile-sync.test.mjs` PASS, `5/5`
- `git diff --check` packet write-set PASS

Source implementation truth：

- `OPENSPARROW_PLUGIN_LATE_STAGE_AUTHORITY_GRACE_MS` provides bounded late-stage authority grace.
- Packaged default late-stage grace = `600000ms`.
- Staged shell matching is required before late-stage wait activates.
- Structural readiness requires `openclaw.plugin.json`, `package.json`, `dist/index.js`, package/id match, and for channels `node_modules/@openclaw-china/dingtalk/dist/index.js`.
- Promotion closes final shared/profile authority only after structural readiness.
- Negative no-authority lane remains precise failed, not fake success.

Fresh packaged PASS：

- build exit code：`0`
- build root：`/private/tmp/packaged-channels-late-stage-rebuild-77vgKb`
- artifact dir：`/private/tmp/packaged-channels-late-stage-rebuild-77vgKb/gtclaw-mac-release-arm64-20260424-235728/GTClaw-0.1.0-alpha-macOS-arm64`
- artifact zip：`/private/tmp/packaged-channels-late-stage-rebuild-77vgKb/gtclaw-mac-release-arm64-20260424-235728.zip`
- zip SHA256：`d30c2b29023ac118c688eed3e7e109227fef84c229e6e2c6561fce11086a10d9`
- artifact `ui/server.mjs` `node --check` PASS
- artifact inspection PASS

Replay method：

- replay root：`/private/tmp/packaged-channels-late-stage-replay-UrwTeG`
- fresh artifact started with bundled node
- each lane used isolated `HOME`, `OPENCLAW_HOME`, profile, UI/gateway/router ports
- controlled runtime fixture used only to force deterministic plugin timing
- dingtalk late-stage lane used plugin timeout `250ms`, normal authority grace `300ms`, late-stage grace `1500ms`, DingTalk dependency delay `800ms`
- explicitly not fast install replay

Lane results：

`dingtalk-only` late-stage path：

- `HTTP 200`
- `status=completed`
- `installState=completed`
- `blockingStep=null`
- `blockingPlugin=null`
- `requestedChannelReadiness.dingtalk=true`
- `channelProbes.dingtalk={status:ok,ready:true}`

`wecom-only` preservation：

- `HTTP 200`
- `status=completed`
- `installState=completed`
- no plugin indefinite running
- six surfaces consistent

`dingtalk+wecom` combined `F-033` preservation：

- `HTTP 500`
- `status=error`
- `installState=failed`
- `blockingStep=probe`
- `blockingPlugin=wecom-openclaw-plugin`
- `requestedChannelReadiness={dingtalk:false,wecom:false}`
- `channelProbes.dingtalk={status:warning,ready:false}`
- `channelProbes.wecom={status:error,ready:false}`

Late-stage authority evidence：

- DingTalk install start：`2026-04-25T08:09:19.545Z`
- staged shell created：`2026-04-25T08:09:19.546Z`
- timeout boundary：`2026-04-25T08:09:19.795Z`
- late DingTalk dependency created：`2026-04-25T08:09:20.373Z`
- final shared/profile `extensions/channels` both exist with all required files
- `install.log` includes safe bypass reason: timed out after `250ms`, footprint structurally ready, plus late-stage catch-up closed after timeout wait

Six-surface and router truth：

- all three lanes consistent across `/api/install`, `/api/install/status`, `install-state.json`, `/api/diagnostics`, `/api/diagnostics/export`, `diagnostic-bundle.json`
- all lanes preserve `providerId=opensparrow-router`
- all lanes preserve `modelTarget=opensparrow-router/auto`

Risks：

- Packaged replay used controlled runtime fixture to force timeout and late dependency timing; intentional for this packet.
- `init.sh` still stops on missing legacy frozen dir `opensparrow_win` in isolated worktree; non-blocking.

## 当前边界

- P0 packaged diagnostics endpoints 已走通，channel probe persistence 已补齐
- 2026-04-23 fresh rebuild artifact 已完成 combined packaged verification，但这不改写 true `F-027` 的历史身份
- 本文同步的是 packaged-mac diagnostics / runtime authority / save-contract truth，不是 Windows support truth
- DingTalk / WeCom 的 channel-specific closure 仍以 `F-030` 的既有 historical closeout 为准，不在本文重写
- `packaged-channels-late-stage-authority-closure` 只同步 late-stage authority closure truth，不重写 `F-033` / `F-034` 历史身份

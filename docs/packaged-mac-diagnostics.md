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

当 `OPENSPARROW_REQUIRE_BUNDLED_PLUGINS=1` 时，`GET /api/status` 的 `bundledPlugins` 字段是 packaged readiness evidence：

- `required=true` 表示当前实例按 packaged hardening contract 要求随包插件归档
- `ready=true` 且 `missing=[]` 表示所需归档齐备
- `ready=false` 且 `missing` 非空表示当前 `packRoot` 不是交付包根目录，或交付包不完整

source/worktree 根目录没有 `plugins/` 是预期边界；它不能被当成 fresh `dist` 交付包缺少插件的证据。遇到缺 archive 错误时，优先核对 `/api/status.instance.packRoot` 是否等于交付包根目录，以及包内是否存在：

- `plugins/openclaw-china-channels-2026.4.24.tgz`
- `plugins/wecom-wecom-openclaw-plugin-2026.4.22.tgz`

## runtime truth

当前 packaged mac 的 runtime truth 规则：

- `ui/server.mjs` 优先从 `vendor/mac-openclaw/lib/node_modules/openclaw` 解析 entry / version
- `bin/node_modules/openclaw` 只作为 fallback
- build/export 阶段必须有 drift guard，防止 `lib` 与 `bin` 出现版本分叉仍被打包

## 2026-04-27 packaged mac entry contract hardening closeout

本节只记录 `packaged-mac-entry-contract-hardening` 的 closeout truth。它是 packaged mac entry contract hardening packet，不重写 `F-027`、DingTalk、WeCom 或 router 历史身份。

Accepted gates：

- Spec Review APPROVED
- Batch Review APPROVED
- Batch Verify PASS

Source checks 全部 PASS：

- wrapper `bash -n`
- build script `bash -n`
- server/helper `node --check`
- 相关 `node --test`
- `git diff --check`

Fresh package evidence：

- 由 `scripts/build-usb-pack.sh --platform mac` 重建
- Fresh package root：`/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-p0-packaged-mac-diagnostics/dist/usb-pack/opensparrow-0.1.0-alpha`
- package root stat：`Apr 27 10:45:47 2026`
- root launcher 与 `mac/01` stat：`Apr 27 10:45:43 2026`
- root launcher SHA 匹配 source wrapper，`mac/01` 是独立 handoff SHA
- package root launcher PASS：打印 UI `19001`，Mode `packaged runtime hardening`
- stale `localhost:19000` 存在，PID `11496`，`packRoot` 是 source/worktree root；验证只使用 launcher 打印的 `19001`
- `/api/status.instance.packRoot` 精确匹配 fresh package root

Bundled plugin readiness：

- `bundledPlugins.required=true`
- `bundledPlugins.ready=true`
- `bundledPlugins.missing=[]`
- DingTalk archive ready：`plugins/openclaw-china-channels-2026.4.24.tgz`
- WeCom archive ready：`plugins/wecom-wecom-openclaw-plugin-2026.4.22.tgz`

Entry contract：

- `platforms/mac/wrappers/*.command` 是 source template / developer debug surface，不是用户 packaged install 入口
- 交付包根目录 `01-开始部署.command` 是唯一官方 packaged first-click path
- 交付包 `mac/01-开始部署.command` 是 compatibility / handoff path，有 compatibility / handoff wording，转交 root launcher，不直接运行 `ui/server.mjs`
- 验证 packaged install 时必须使用 launcher 打印的 UI port，不得默认信任 `localhost:19000`

Missing archive negative：

- isolated fixture 删除 DingTalk archive 后 `ready=false`
- `missing` 包含 `@openclaw-china/channels`
- `/api/install` 返回 `HTTP 500`
- 文案指向 wrong `packRoot` / incomplete package、root `01-开始部署.command` 或重新生成 / 获取完整包
- 文案没有 online install、ClawHub、在线安装 fallback wording

## 2026-04-27 packaged runtime profile config authority hardening closeout

本节只记录 `packaged-runtime-profile-config-authority-hardening` 的 closeout truth。它是 packaged runtime profile/config authority packet，不重写 packaged entry contract、bundled archive、router、DingTalk/WeCom credential contract 或 model-routing 历史身份。

Accepted gates：

- Spec Review APPROVED
- Worker DONE
- Batch Review APPROVED
- Batch Verify PASS

Source verification PASS：

- `node --check ui/server.mjs` PASS
- `node --test ui/tests/packaged-runtime-profile-config-authority.test.mjs` PASS, `3/3`
- `node --test ui/tests/packaged-runtime-status-authority.test.mjs` PASS, `6/6`
- `node --test ui/tests/packaged-runtime-state-stability.test.mjs` PASS, `3/3`
- `node --test ui/tests/packaged-channel-probe-diagnostics.test.mjs` PASS, `3/3`
- `node --test ui/tests/packaged-install-retry-guards.test.mjs` PASS, `6/6`
- `git diff --check` PASS

Fresh package verification PASS：

- build command：`scripts/build-usb-pack.sh --platform mac`
- fresh package root：`/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-p0-packaged-mac-diagnostics/dist/usb-pack/opensparrow-0.1.0-alpha`
- build removed previous staging dir and printed `USB pack built successfully`
- packaged `ui/server.mjs` and root launcher matched source via `diff -q`
- package root stat：`2026-04-27 14:05:26 +0800`
- root launcher stat：`2026-04-27 14:05:23 +0800`
- bundled plugin tgz stats：`2026-04-27 14:04:34 / 14:04:35 +0800`
- build script did not generate zip

Runtime profile/config authority：

- launched via package root `01-开始部署.command`
- baseline isolated `HOME`：`/private/tmp/packaged-runtime-authority-verify-20260427-140622-baseline/home`
- baseline isolated `OPENCLAW_HOME`：`/private/tmp/packaged-runtime-authority-verify-20260427-140622-baseline/openclaw`
- printed UI ports：baseline `54486`, DingTalk controlled replay `54490`, foreign-port negative `55752`
- gateway/router ports：baseline `54487/54488`, DingTalk replay `54489/54491`, foreign negative `55753/55754`
- `/api/status.instance.packRoot` matched the fresh package root exactly
- profile：`gtclaw-portable`
- profileDir：isolated `.openclaw-gtclaw-portable`
- configPath：isolated `.openclaw-gtclaw-portable/openclaw.json`
- `daemon status`, `health`, and `channels status --probe` received the same server-side current-profile config env authority
- `/api/status.statusAuthority.daemonStatusUsesProfileConfig=true`
- `/api/status.statusAuthority.healthUsesProfileConfig=true`
- source test coverage includes `config_path_token_mismatch`

Status authority classifications：

- baseline：`gateway_unhealthy`
- DingTalk replay：`authoritative_ready`
- foreign negative：`foreign_gateway_port`
- gatewayPort readback：baseline `54487`, DingTalk replay `54489`, foreign negative `55753`

DingTalk readiness replay PASS：

- controlled fresh-package install persisted DingTalk config with `enabled=true`
- credential-present and metadata-present readback was verified without printing credential values
- wrong config would fail health/probe in controlled runtime
- server-side env log showed daemon status, health, and channels probe all used current profile config authority
- `/api/install` returned `HTTP 200`
- `installState=completed`
- `requestedChannelReadiness.dingtalk=true`
- direct `/api/dingtalk/probe` returned `ready=true`
- classification：`authoritative_ready`
- no real DingTalk credential used or printed

Stale / foreign gateway negative PASS：

- external HTTP listener occupied gateway port `55753`
- fresh package launched with isolated state and the same gateway port
- `/api/status` returned `installed=false`
- `runtimeMode=port-occupied`
- `gatewayPortBusy=true`
- classification：`foreign_gateway_port`
- daemon was not reported as authoritative running
- `gatewayHealthy=false`

Secret safety PASS：

- inspected `/api/status`, `/api/install/status`, `/api/diagnostics`, `/api/diagnostics/export`, `diagnostic-bundle.json`, `install-state.json`, `install.log`, and install response summary
- no synthetic secret values found
- no token/API key/auth profile secret/channel credential printed
- server-side current-profile config env authority is recorded as implementation truth only; no user操作步骤 was added

## 2026-04-27 packaged install gate authority consumption hardening closeout

本节只记录 `packaged-install-gate-authority-consumption-hardening` 的 closeout truth。它是 packaged install gate authority consumption packet，不重开上一包 profile config propagation，也不改写 packaged entry contract、bundled archive、router、DingTalk/WeCom credential contract 或 model-routing 历史身份。

Accepted gates：

- Spec Review APPROVED
- Worker DONE
- Batch Review APPROVED
- Batch Verify PASS

Root cause：

- install gate 将 stale/transient probe snapshot 当 terminal requested-channel failure 消费。
- 同一 live instance 后续已到 `authoritative_ready`，但 install-state 已持久化早期 `daemon=unknown` / `ready=false`。
- 本 packet 修的是 install gate authority consumption，不是重开上一包 profile config propagation。

Source verification PASS：

- `node --check ui/server.mjs` PASS
- `node --test ui/tests/packaged-install-gate-authority-consumption.test.mjs` PASS, `5/5`
- `node --test ui/tests/packaged-install-retry-guards.test.mjs` PASS, `6/6`
- `node --test ui/tests/packaged-channel-probe-diagnostics.test.mjs` PASS, `3/3`
- `node --test ui/tests/packaged-runtime-state-stability.test.mjs` PASS, `3/3`
- `node --test ui/tests/packaged-runtime-profile-config-authority.test.mjs` PASS, `3/3`
- `git diff --check` PASS

Fresh package verification PASS：

- build command：`scripts/build-usb-pack.sh --platform mac`
- fresh package root：`/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-p0-packaged-mac-diagnostics/dist/usb-pack/opensparrow-0.1.0-alpha`
- no zip generated by build script
- package root mtime：`Apr 27 16:24:49 2026`
- root launcher mtime：`Apr 27 16:24:44 2026`
- source/package `ui/server.mjs` match SHA256：`13ff72e8425ceb1b9a22d045c6e66fab50fc77a5d49f81778959127c121f6bfd`
- build output included previous staging dir removal and `USB pack built successfully`
- package plugins tgz mtime matched this build

Launch evidence：

- launched fresh package root `01-开始部署.command`
- used printed UI port `19003`, not default `19000`
- isolated `HOME`：`/var/folders/.../opensparrow-packaged-gate-transient-2ad1Hp/home`
- isolated `OPENCLAW_HOME`：`/var/folders/.../opensparrow-packaged-gate-transient-2ad1Hp/openclaw`
- success replay gateway/router ports：`18931/18414`
- foreign negative gateway/router ports：`18929/18414`
- cleanup completed: launcher terminated, temp dirs deleted, foreign listener PID `64983` killed, and no LISTEN residue on `19003/18929/18931/18414`

DingTalk install gate replay PASS：

- method: controlled fixture with safe synthetic credentials and controlled fake runtime
- path: real fresh package launcher + packaged `/api/install`
- `/api/install` returned `HTTP 200`
- `installState=completed`
- `requestedChannelReadiness.dingtalk=true`
- `channelProbes.dingtalk.status=ok`
- `channelProbes.dingtalk.ready=true`
- `channelProbes.dingtalk.daemon=running`
- `channelProbes.dingtalk.authorityClassification=authoritative_ready`
- `channelProbes.dingtalk` warnings/errors `0/0`
- `statusAuthority.classification=authoritative_ready`
- event log observed transient sequence: daemon `unknown -> running`, health `gateway_unhealthy -> ok`
- final install state completed with latest probe/authority evidence
- no real DingTalk credential used or printed

Status authority：

- `/api/status.instance.packRoot` matched the fresh package root
- profile：`gtclaw-portable`
- profileDir：isolated packaged profile under transient replay `OPENCLAW_HOME`
- configPath：isolated packaged profile `openclaw.json`
- gatewayPort：`18931`
- `statusAuthority.classification=authoritative_ready`
- `daemonStatusUsesProfileConfig=true`
- `healthUsesProfileConfig=true`

Negative verification PASS：

- foreign port: external Node listener occupied gateway port, packaged `/api/install` returned `500`, `installState=failed`, DingTalk readiness `false`, classification `foreign_gateway_port`, runtime `port-occupied`, `gatewayHealthy=false`
- gateway unhealthy: packaged `/api/install` returned `500`, classification `gateway_unhealthy`
- config path token mismatch: packaged `/api/install` returned `500`, classification `config_path_token_mismatch`
- missing DingTalk credential remains source-covered as `400` input validation

Secret safety PASS：

- inspected `/api/status`, `/api/install/status`, `/api/diagnostics`, `/api/diagnostics/export`, `install-state.json`, `diagnostic-bundle.json`, `install.log`, and install response summary
- secret scan hits `[]`
- no token/API key/auth profile secret/channel credential printed
- closeout records only server/internal authority convergence facts; no user-facing config-env action instruction was added

## 2026-05-02 packaged channel smart routing authority hardening closeout

本节只记录 `packaged-channel-smart-routing-authority-hardening` 的 facts-only closeout truth。它是 packaged channel smart-routing authority hardening packet，不重写 `unified-model-configuration-surface`、`packaged-router-latest-turn-routing-hotfix`、DingTalk/WeCom live closure、vendor marker cleanup 或旧 packet 历史身份。

Accepted gates：

- Spec Review APPROVED
- Worker Rounds 8-16 DONE
- Batch Review APPROVED
- Batch Verify PASS

Fresh package root：

- `dist/usb-pack/opensparrow-0.1.0-alpha`

Active instance：

- profile：`gtclaw-portable`
- configPath：packaged `.gtclaw-state/.openclaw-gtclaw-portable/openclaw.json`
- UI / router / gateway：`19000 / 18412 / 18929`
- runtimeOwnership：
  - `gatewayOwner=current`
  - `daemonOwner=current`
  - `routerOwner=current`
  - `liveChannelOwner=current_only`

Smart authority：

- `effectivePrimaryModel=opensparrow-router/auto`
- `singleModelMode=false`
- tier map：
  - `SIMPLE -> gpt-4o`
  - `MEDIUM -> gpt-5.4-nano`
  - `COMPLEX -> gpt-5.4`
  - `REASONING -> gpt-5.5`

Feishu live external inbound PASS：

- Feishu side actual reply was observed.
- Only redacted live evidence is recorded here.
- `routerInvocation.invokedSinceStart=true`
- `inputSource=sanitized-current-user-text`
- input length and hash were recorded in verifier evidence; raw text is not copied.
- `selectedTier=SIMPLE`
- `outboundTier=SIMPLE`
- `outboundModel=gpt-4o`

Carry-forward Batch Verify evidence：

- `MEDIUM -> gpt-5.4-nano`
- `COMPLEX -> gpt-5.4`
- `REASONING -> gpt-5.5`
- post-history `SIMPLE -> gpt-4o`
- single-model regression PASS
- secret safety PASS
- Round 13 vendor marker cleanup PASS

Residual risk：

- DingTalk / WeCom live external inbound was not rerun in the final live continuation.
- This closeout does not claim DingTalk / WeCom live PASS.
- DingTalk / WeCom are recorded only with diagnostics/readiness/current-owner coverage plus supplemental package-path routing evidence.

Security：

- No raw Feishu event envelope, raw user text, sender/chat/message IDs, tokens, secrets, bearer tokens, API keys, or raw JSON metadata are written in this closeout.

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

## 2026-04-26 unified model configuration surface closeout

本节只记录 `unified-model-configuration-surface` 的 fresh closeout truth。它是新的 dashboard/model-routing configuration surface packet，不是 `F-031` reopen，不是 `F-027` rewrite，不是 native provider routing，也不是 `F-033` / `F-034` / install packet。

Accepted gates：

- Worker-A source implementation complete
- Source Verifier PASS
- Packaged Verifier PACKAGED PASS
- Scope / Authority Reviewer APPROVED

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

Packaged evidence：

- Artifact：`/private/tmp/unified-model-config-rebuild-x7V8BL/gtclaw-mac-release-arm64-20260426-193709/GTClaw-0.1.0-alpha-macOS-arm64`
- Zip：`/private/tmp/unified-model-config-rebuild-x7V8BL/gtclaw-mac-release-arm64-20260426-193709.zip`
- SHA256：`d32c040a7cb601561137cb47eec6aa15f77fbeb3c8915e1a7f3eb8f214cf90ea`
- UI port `19371`, gateway `19372`, router `19373`
- isolated `HOME`：`/private/tmp/unified-model-config-home-193709`
- isolated `OPENCLAW_HOME`：`/private/tmp/unified-model-config-openclaw-193709`
- profile：`unified-model-config-verifier`
- `/api/status.instance.packRoot` pointed to fresh artifact, not stale deleted `/private/tmp` artifact

Packaged UI truth：

- `/dashboard` verified with Chrome CDP fallback because Playwright unavailable
- main nav contains `模型配置`
- no peer main tab `API 配置（上游连接）`
- no peer main tab `模型智能路由`
- `单模型` mode has `Base URL` / `API Key` / `Model ID`
- smart mode has `SIMPLE` / `MEDIUM` / `COMPLEX` / `REASONING`, each with `Base URL` / `API Key` / `Model ID`

Single-mode packaged API truth：

- `POST /api/config/model-routing` → `HTTP 200`
- `ok=true`
- `mode=single`
- `saveState=saved_degraded`
- response did not echo synthetic key
- GET readback：
  - `effectivePrimaryModel = openai/single-packaged-model-193709`
  - `single.apiKeyConfigured = true`
  - no plain key

Smart-mode packaged API truth：

- `POST /api/config/model-routing` → `HTTP 200`
- `ok=true`
- `mode=smart`
- `saveState=saved_degraded`
- GET readback：
  - `effectivePrimaryModel = opensparrow-router/auto`
  - all four tiers `apiKeyConfigured=true`
  - distinct tier models read back
  - no plain key or `apiKey` property

Runtime per-tier dispatch truth：

- `SIMPLE -> port 19411`, model `simple-fixture-model-193709`
- `MEDIUM -> port 19412`, model `medium-fixture-model-193709`
- `COMPLEX -> port 19413`, model `complex-fixture-model-193709`
- `REASONING -> port 19414`, model `reasoning-fixture-model-193709`
- each fixture received `/v1/chat/completions`
- Authorization was checked internally as `authOk=true`
- no key values were printed

Security truth：

- checked `/api/config/model-routing`, `/api/config`, `/api/status`, `/api/install/status`, `/api/diagnostics`, `diagnostic-bundle.json`, `ui-meta.json`
- no synthetic tier key leakage
- no plain `apiKey` property in exposed/readback surfaces
- router response headers contain tier/model only, no key

Router invariants：

- `providerId = opensparrow-router`
- `modelTarget = opensparrow-router/auto`
- preserved through single readback, smart readback, and runtime dispatch

Residual risks：

- `saveState=saved_degraded` is expected in isolated verifier profile because no full daemon install matrix was run; it is not a full daemon install matrix PASS.
- dashboard initially redirects to setup until config exists; after packaged single-mode save creates config, `/dashboard` loads normally

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
- 2026-04-26 `unified-model-configuration-surface` fresh packaged verification 已完成 unified `模型配置` surface、single/smart save-readback、per-tier runtime dispatch、key masking 与 router invariants；这不重写 `F-031` 或 `F-027`
- 2026-04-27 `packaged-runtime-profile-config-authority-hardening` 已完成 source PASS + fresh package PASS，server-side current-profile config authority 已覆盖 daemon status、health、channel probe 与 status/readiness classification，同时保留 stale/foreign gateway negative safety；这不是用户操作步骤
- 2026-04-27 `packaged-install-gate-authority-consumption-hardening` 已完成 source PASS + fresh package PASS，install gate 会在 terminal requested-channel failure 前消费 bounded same-profile authority convergence，避免 transient `daemon=unknown` 被持久化成最终失败，同时保留 `foreign_gateway_port`、`gateway_unhealthy`、`config_path_token_mismatch` 与缺凭据 negative safety
- 2026-04-27 用户人工复测包根 `01-开始部署.command` 后确认当前包可正常完成 DingTalk 安装路径；当前最新可用 packaged mac 根目录保留为 `dist/usb-pack/opensparrow-0.1.0-alpha`，验证时仍以 launcher 打印的 UI 端口为准，不默认信任 `localhost:19000`
- 本文同步的是 packaged-mac diagnostics / runtime authority / save-contract truth，不是 Windows support truth
- DingTalk / WeCom 的 channel-specific closure 仍以 `F-030` 的既有 historical closeout 为准，不在本文重写
- `packaged-channels-late-stage-authority-closure` 只同步 late-stage authority closure truth，不重写 `F-033` / `F-034` 历史身份

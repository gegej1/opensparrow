# OpenSparrow Current Status

更新时间：`2026-05-02`

## 严重事故记录

### 2026-04-22 mac packaged 假 arm64 事故

已确认发生过一轮严重 packaged 回归：

- Desktop bundle：`opensparrow-mac-full-package-20260422-170758-skills100`
- 对应 release：`gtclaw-mac-release-arm64-20260422-170758`

这轮包名虽然标记为 `arm64`，但 bundled `vendor/mac-openclaw/bin/node` 实际只有 `x86_64` slice。

在新的 Apple Silicon Mac（未安装 Rosetta）上，这会直接表现为：

- `Bad CPU type in executable`
- `01-开始部署.command` 立即退出

该事故已经固化为长期 anti-pattern：

- 不得再把 artifact 命名规则当成 CPU 架构 truth
- 必须以 bundled runtime 二进制自身的 `file` 结果为准
- build/export 必须在 shipping 前做 runtime CPU 架构 fail-fast
- 旧错误 Desktop bundle 只能保留作事故证据，不得继续外发

### 2026-04-22 mac packaged 安装假转圈 / retry 不幂等事故

在后续 fresh 新机验证中，又确认了一轮独立严重回归：

- 用户侧表现：安装页在“正在部署中…”停留约 20 分钟，看起来像后端一直没结束
- 后端真实结论：`install-state.json.status = error`，并且已经在约 `171s` 时结束
- 首次暴露路径：`opensparrow-mac-full-package-20260422-180702-skills100`
- package-local 状态目录：`GTClaw-*/.gtclaw-state/.openclaw-gtclaw-portable/`

真实根因链已确认：

1. package-local Sparrow / OpenClaw 状态在一次失败后会残留旧插件目录；
2. 后续 retry / reinstall 再次安装 bundled plugin 时，`channels` / `wecom-openclaw-plugin` 会报 `plugin already exists`；
3. 前端 `POST /api/install` 仅等待 `120000ms`，超时后假定“后台仍在继续”，继续显示“正在部署中…”；
4. 页面没有把后端已经完成的 `status=error` authoritative verdict 及时展示出来，于是造成“假转圈”。

从这一轮起，以下规则同样升级为 release blocker：

- package-local `.gtclaw-state`、`.openclaw`、`.openclaw-*` 不得进入任何对外交付包
- packaged install retry / reinstall 必须对旧 plugin 目录幂等
- 安装页在 `/api/install` 超时后，必须继续轮询 `/api/install/status` 的 terminal state，而不是无限等待 `installed=true`
- 安装失败时，UI 必须尽快显示失败，而不是继续显示“正在部署中…”

### 2026-04-22 外层桌面总包 zip symlink 压扁事故

同日还确认了一轮“外层汇总包”级别的打包事故：

- 内层 handoff zip 本身保留了 `vendor/mac-openclaw/bin/npm`、`npx`、`corepack` 的 symlink
- 但如果再用普通 `zip -qr` 去打最外层桌面总包，会把这些 symlink 压扁成普通文件
- 新机器从这个错误外层 zip 解压后，插件安装会报：
  - `npm install failed`
  - `Cannot find module '../lib/cli.js'`

从这一轮起，以下规则同样升级为 release blocker：

- 最外层汇总包 zip 也必须保留 symlink
- 不允许再用普通 `zip -qr` 去打包含 `vendor/mac-openclaw/bin/npm|npx|corepack` 的外层交付包
- 外层汇总包应使用 `ditto -c -k --keepParent` 或其他明确保留 symlink 的归档方式

## 总体状态

项目当前处于：

- **统一真源仓已建立**
- **root repo 可运行**
- **关键 Node / shell 回归链存在**
- **macOS packaged diagnostics / runtime truth / first-click 已有 fresh evidence**
- **latest packaged mac artifact 已完成 combined packaged verification fresh evidence**
- **unified model configuration surface 已完成 source PASS + fresh packaged PASS**
- **latest mac release candidate 已恢复到可重新 cut RC 的状态，但对外发放前仍建议做独立新机复核**
- **packaged channel smart-routing authority hardening 已完成 facts-only closeout；Feishu live external inbound PASS，DingTalk / WeCom final live continuation 未重跑**
- **Windows-specific evidence 仍是独立后续线，不被当前 mac packaged PASS 自动覆盖**

## 已确认完成的面

### 1. Unified repo / governance / longrun

以下层级已经存在并可读：

- `AGENTS.md`
- `.specify/memory/constitution.md`
- `docs/governance/`
- `specs/`
- `longrun/workspaces/opensparrow-unified/`

### 2. GTClaw branding + dashboard model routing

已完成并有 fresh evidence 的范围：

- Dashboard / install shell 已切换 GTClaw branding
- dashboard 已存在独立的 model-routing UI surface，而不是只剩旧 `API 配置` 表单
- `GET /api/config/model-routing` / `POST /api/config/model-routing` 已成为 dashboard 的 authoritative load/save surface
- `POST /api/config/api` 已被限制为 upstream connection / compatibility lane，不再冒充 routing truth
- source truth 与 fresh packaged verification 都保持 internal ids 不变：
  - `opensparrow-router`
  - `opensparrow-router/auto`

注意：

- 这不等于 Windows 线已完成
- 也不等于 officialization 全部完成

### 2.1 unified model configuration surface

本轮 closeout 只基于 `unified-model-configuration-surface` 的四个 accepted gates：

1. Worker-A source implementation complete
2. Source Verifier PASS
3. Packaged Verifier PACKAGED PASS
4. Scope / Authority Reviewer APPROVED

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

Packaged evidence：

- Artifact：`/private/tmp/unified-model-config-rebuild-x7V8BL/gtclaw-mac-release-arm64-20260426-193709/GTClaw-0.1.0-alpha-macOS-arm64`
- Zip：`/private/tmp/unified-model-config-rebuild-x7V8BL/gtclaw-mac-release-arm64-20260426-193709.zip`
- SHA256：`d32c040a7cb601561137cb47eec6aa15f77fbeb3c8915e1a7f3eb8f214cf90ea`
- UI port `19371`, gateway `19372`, router `19373`
- isolated `HOME`：`/private/tmp/unified-model-config-home-193709`
- isolated `OPENCLAW_HOME`：`/private/tmp/unified-model-config-openclaw-193709`
- profile：`unified-model-config-verifier`
- `/api/status.instance.packRoot` 指向 fresh artifact，不是 stale deleted `/private/tmp` artifact

Packaged UI truth：

- `/dashboard` 使用 Chrome CDP fallback 验证，因为 Playwright unavailable
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

- `saveState=saved_degraded` 是 isolated verifier profile 下的 expected truth，因为没有跑 full daemon install matrix；不得写成完整 daemon install matrix PASS
- dashboard initially redirects to setup until config exists; after packaged single-mode save creates config, `/dashboard` loads normally

### 2.2 packaged channel smart routing authority hardening

本轮 closeout 只基于 `packaged-channel-smart-routing-authority-hardening` 的 accepted gates，不改写旧 packet 身份，也不把 Feishu evidence 借给 DingTalk / WeCom。

Accepted gates：

- Spec Review APPROVED
- Worker Rounds 8-16 DONE
- Batch Review APPROVED
- Batch Verify PASS

Active packaged truth：

- fresh package root：`dist/usb-pack/opensparrow-0.1.0-alpha`
- profile：`gtclaw-portable`
- configPath：packaged `.gtclaw-state/.openclaw-gtclaw-portable/openclaw.json`
- UI / router / gateway：`19000 / 18412 / 18929`
- runtimeOwnership：`gatewayOwner=current`, `daemonOwner=current`, `routerOwner=current`, `liveChannelOwner=current_only`

Smart authority：

- `effectivePrimaryModel=opensparrow-router/auto`
- `singleModelMode=false`
- `SIMPLE -> gpt-4o`
- `MEDIUM -> gpt-5.4-nano`
- `COMPLEX -> gpt-5.4`
- `REASONING -> gpt-5.5`

Feishu live external inbound：

- PASS with Feishu-side actual reply observed
- evidence is redacted only
- `routerInvocation.invokedSinceStart=true`
- `inputSource=sanitized-current-user-text`
- input length/hash recorded without raw text
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
- 当前状态不得写成 DingTalk / WeCom live PASS；只能记录 diagnostics/readiness/current-owner coverage 与 supplemental package-path routing evidence.

### 3. macOS packaged diagnostics / runtime truth / first-click

已确认：

- packaged launch isolation 已修正
- packaged install wizard 不再依赖前端假进度，改为轮询真实 `/api/install/status`
- packaged runtime dependency closure 已补齐：`ui/lib/model-routing-config.mjs`、`ui/lib/openai-provider.mjs`、`scripts/model-routing/lib/custom-plugin-routing.mjs`
- packaged first-click 已能启动 server
- packaged build/export 已新增 runtime CPU 架构 fail-fast，不再允许把 x86_64 `node` 误打成 `arm64` 包
- latest mac packaged runtime `vendor/mac-openclaw/bin/node` 现为 universal binary，包含 `arm64` slice
- `2026-04-23` fresh combined verifier artifact：
  - `/tmp/f032-packaged-rebuild-botvDw/gtclaw-mac-release-arm64-20260423-141103/GTClaw-0.1.0-alpha-macOS-arm64`
  - `/tmp/f032-packaged-rebuild-botvDw/gtclaw-mac-release-arm64-20260423-141103.zip`
- `/api/status`、`/api/install/status`、`/api/diagnostics`、`/api/diagnostics/export` 都已在 fresh artifact 中可达
- `/api/status` authoritative status truth 已在 fresh packaged verification 中通过
- truthful save contract 已在 fresh packaged verification 中通过，允许：
  - `saved`
  - `saved_degraded`
  - `rejected`
- package-local `install-state.json`、`install.log`、`diagnostic-bundle.json` 已能真实生成
- artifact 内已固定 `vendor/mac-openclaw/RUNTIME_TRUTH.json`
- clean-state 下，bundled `channels` 与官方 `wecom-openclaw-plugin` 插件都能在 fresh 临时 profile 中成功安装
- build/export 与 handoff export 已新增 package-local `.gtclaw-state` / `.openclaw*` 清理逻辑，避免把 Sparrow 状态目录重新打进 release
- install retry / reinstall 现改用 `openclaw plugins install --force` 的原生替换语义，不再依赖手工删目录，也不再命中 `plugin already exists`
- 安装页超时后会继续轮询 `/api/install/status` 的 terminal state，而不是无限等待 `installed=true`
- 在同一 fresh artifact `gtclaw-mac-release-arm64-20260422-193047` 上，same-package 第 1 次与第 2 次 real `/api/install` 都得到 `completed`
- 上述第 2 次 same-package `/api/install` 未再复现 `plugin already exists` 或 `unknown channel id`
- fresh packaged verifier 实际拿到：
  - `POST /api/config/api` → `HTTP 200`, `ok:true`, `persisted:true`, `saveState:"saved_degraded"`
  - `POST /api/config/model-routing` → `HTTP 200`, `ok:true`, `persisted:true`, `saveState:"saved_degraded"`
- follow-up `GET` / reopen 已能读回 persisted truth
- combined packaged verification 已确认：
  - GTClaw branding PASS
  - authoritative status truth PASS
  - static fake version removed PASS
  - model-routing UI surface exists PASS
  - API config limited to compatibility lane PASS
  - authoritative model-routing load/save PASS
  - truthful save contract PASS
  - internal ids unchanged PASS
  - new files included in fresh artifact PASS

### 4. packaged DingTalk / WeCom support closure

当前历史 clean-state packaged lineage：

- artifact lineage：`gtclaw-mac-release-arm64-20260422-150245`
- preserved handoff bundle：`/Users/eduardogan/Desktop/GHJProject/opensparrow-gptpro-handoff-20260422-1518-dingtalk-wecom-pass.zip`

已确认：

- DingTalk real `/api/install` → `completed`
- WeCom real `/api/install` → `completed`
- 两条 channel 的 `runtimeMode` 都是 `daemon`
- `channelProbes.dingtalk.status = ok` 且 `ready = true`
- `channelProbes.wecom.status = ok` 且 `ready = true`
- `/api/install`、`/api/install/status`、`install-state.json`、`diagnostic-bundle.json`、`/api/diagnostics`、`/api/diagnostics/export` 已对同一条 packaged session 给出一致结论
- packaged WeCom 当前已切到官方插件路线：`@wecom/wecom-openclaw-plugin`
- bundled archive 已切到 `plugins/wecom-wecom-openclaw-plugin-2026.4.22.tgz`
- 旧 `@sunnoy/wecom` packaged blocker 与 `unknown channel id: wecom` follow-on error 未在最新 fresh evidence 中复现
- DingTalk 旧 `daemon unknown / gateway fallback` 假阳性 probe warning 未在最新 fresh evidence 中复现

但当前必须额外保留一个更高优先级的 release 现实：

- `F-030` 的 clean-state packaged evidence 仍然是有效的 historical truth
- 同日后续暴露的 packaged install retry / timeout / package-local Sparrow state hygiene regression 也已经在 fresh artifact `193047` 上完成 re-verify
- 现阶段可以重新 cut mac RC，但在新的外部机器再次分发前，仍建议补一轮独立新机 smoke

### 5. F-034 packaged single-channel plugin timeout parity closeout

本轮 closeout 只基于 `2026-04-24` fresh packaged replay，不基于 stale historical PASS。

fresh closeout evidence roots：

- artifact dir：`/private/tmp/f034-packaged-rebuild-lT3AVc/gtclaw-mac-release-arm64-20260424-003358/GTClaw-0.1.0-alpha-macOS-arm64`
- artifact zip：`/private/tmp/f034-packaged-rebuild-lT3AVc/gtclaw-mac-release-arm64-20260424-003358.zip`
- replay root：`/private/tmp/f034-packaged-round5-replays-MOZFDx`
- capture root：`/private/tmp/f034-packaged-round5-captures-rhqPgf`

已确认：

- `F-034` 已 source PASS + fresh packaged PASS
- `step=plugins` 没有 regression 回到 indefinite running / fake success
- router invariants 维持：
  - `providerId=opensparrow-router`
  - `modelTarget=opensparrow-router/auto`

`dingtalk-only`：

- `/api/install = HTTP 200`
- final `status=completed`
- final `installState=completed`
- `blockingStep=null`
- `blockingPlugin=null`
- `bypass={verdict:none, used:false}`
- `requestedChannelReadiness={dingtalk:true,wecom:true}`
- `channelProbes.dingtalk={status:ok, ready:true}`
- `six-surface consistency=true`
- passing replay 观察到 `staged-shell -> critical-dist -> final-authority lag` signature，但这次没有真的跨过 `120000ms` timeout，因此 fresh PASS 不是靠 timeout safe_bypass 触发的

`wecom-only`：

- `/api/install = HTTP 200`
- final `status=completed`
- final `installState=completed`
- `blockingStep=null`
- `blockingPlugin=null`
- `bypass={verdict:none, used:false}`
- `requestedChannelReadiness={dingtalk:true,wecom:true}`
- `channelProbes.wecom={status:ok, ready:true}`
- `six-surface consistency=true`

`dingtalk+wecom`：

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

residual risks 只作 facts-only 记录：

- `dingtalk-only` 这次 passing replay 没直接 exercise packaged timeout+grace-wait path
- `wecom-only` 是 config-only probe summary，但在当前 acceptance 下仍是 packaged PASS
- 上述 residual risks 不升格为 current blocker

### 6. packaged channels late-stage authority closure

本轮 closeout 只基于 `packaged-channels-late-stage-authority-closure` 的 source PASS 与 fresh packaged verifier PASS。它是新的 packaged install authority packet，不是 `F-034` reopen，也不是 dashboard/UI patch；`F-033` / `F-034` 历史身份保持不变。

Source PASS：

- `node --check ui/server.mjs` PASS
- `node --test ui/tests/packaged-single-channel-plugin-timeout-parity.test.mjs` PASS, `3/3`
- `node --test ui/tests/packaged-plugin-install-hang-bypass.test.mjs` PASS, `10/10`
- `node --test ui/tests/packaged-plugin-profile-sync.test.mjs` PASS, `5/5`
- `git diff --check` packet write-set PASS

Source implementation truth：

- 新增 bounded late-stage authority grace：`OPENSPARROW_PLUGIN_LATE_STAGE_AUTHORITY_GRACE_MS`
- packaged default late-stage grace = `600000ms`
- late-stage wait 只有在 staged shell matching 后才会激活
- structural readiness 需要 `openclaw.plugin.json`、`package.json`、`dist/index.js`、package/id match；channels 还需要 `node_modules/@openclaw-china/dingtalk/dist/index.js`
- promotion 只在 structural readiness 后关闭 final shared/profile authority
- no-authority negative lane 保持 precise failed，不 fake success

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
- fresh artifact 使用 bundled node 启动
- 每条 lane 都使用 isolated `HOME`、`OPENCLAW_HOME`、profile、UI/gateway/router ports
- controlled runtime fixture 只用于强制 deterministic plugin timing
- dingtalk late-stage lane 使用 plugin timeout `250ms`、normal authority grace `300ms`、late-stage grace `1500ms`、DingTalk dependency delay `800ms`
- 这不是 fast install replay

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

Cross-surface and router truth：

- all three lanes consistent across `/api/install`, `/api/install/status`, `install-state.json`, `/api/diagnostics`, `/api/diagnostics/export`, `diagnostic-bundle.json`
- all lanes preserve `providerId=opensparrow-router`
- all lanes preserve `modelTarget=opensparrow-router/auto`

Risks：

- packaged replay used controlled runtime fixture to force timeout and late dependency timing; intentional for this packet
- `init.sh` still stops on missing legacy frozen dir `opensparrow_win` in isolated worktree; non-blocking for this packet

## 当前实际可运行性

### Root repo

- **可运行**：是
- **可测试**：是（Node tests + shell syntax + init 合同）
- **可继续开发**：是

### GitHub 仓库

- **代码与 docs 可审阅**：是
- **完整 runtime 可复现**：否

原因：

- `vendor/` 被 `.gitignore` 排除，不在 GitHub tree 中

### Latest mac release candidate

- **可启动**：是
- **runtime CPU 架构 truth**：是（latest artifact bundled `node` includes `arm64` slice and passes launch smoke）
- **clean-state plugin install smoke**：是（DingTalk / WeCom bundled plugin 可装）
- **same-package retry / reinstall**：是（fresh artifact `193047` 上第 1 次与第 2 次 real `/api/install` 都为 `completed`）
- **install timeout authority**：是（前端超时后会继续轮询 `/api/install/status` 的 terminal state）
- **combined packaged truth**：是（branding / status authority / model-routing surface / truthful save contract 均已 fresh PASS）
- **unified model configuration surface**：是（`模型配置` unified surface、single/smart save-readback、per-tier runtime dispatch、key masking、router invariants 均已 fresh packaged PASS）
- **F-034 single-channel parity replay**：是（`dingtalk-only` / `wecom-only` fresh packaged PASS，combined lane 精确保持 `F-033` probe truth）
- **packaged channels late-stage authority closure**：是（`dingtalk-only` timeout + late dependency path 已 fresh packaged PASS，WeCom-only 与 combined `F-033` truth 已保持）
- **RC 级恢复**：是
- **对外正式发放**：建议先补独立新机 smoke

### 不可再使用的旧桌面包

以下 Desktop bundle 仅保留作事故证据，不得继续发给新机器：

- `opensparrow-mac-full-package-20260422-170758-skills100`

### package-local 日志定位

当安装页停在“正在部署中…”或用户报告 retry 异常时，优先读取 package-local 日志，而不是盲猜：

- `GTClaw-*/.gtclaw-state/.openclaw-gtclaw-portable/install-state.json`
- `GTClaw-*/.gtclaw-state/.openclaw-gtclaw-portable/install.log`
- `GTClaw-*/.gtclaw-state/.openclaw-gtclaw-portable/diagnostic-bundle.json`

如果 `install-state.json.status = error` 而前端仍显示“正在部署中…”，应直接按 packaged install regression 处理。

另一个必须记住的分发纪律：

- 展开后的 artifact 目录一旦在本机启动过，就会生成 package-local `.gtclaw-state`
- 之后不应把这个“已经跑过”的展开目录继续作为干净 release 目录发给别人
- 对外交付应优先使用未运行过的 zip，或重新从 zip 解压得到的干净目录

### 2026-04-23 交付介质与错实例诊断新增事实

围绕 `opensparrow-mac-delivery-20260422-221144` 的继续排查，现已额外确认：

- `opensparrow-mac-delivery-20260422-221144.zip` 仍然是 clean shipping artifact：zip 内没有 release 运行后生成的 package-local `.gtclaw-state`
- 但桌面上的同名展开目录在本机完成 real install / follow-up smoke 后，已经重新生成 package-local `.gtclaw-state`
- 当前桌面还残留一个额外展开目录：`opensparrow-mac-delivery-20260422-213211`；它也已经不是干净 release 目录

因此，后续如果另一台机器出现“本机成功、远端异常”的行为分叉，必须先判断它拿到的是：

1. clean zip；
2. 从 clean zip 新解压出来的目录；
3. 还是已经在本机运行过、带 package-local 状态的旧展开目录。

同一轮诊断还补了一个新的 wrong-instance 证据面：

- `GET /api/status`
- `GET /api/install/status`
- `GET /api/diagnostics`
- `GET /api/diagnostics/export`
- package-local `install-state.json`
- package-local `diagnostic-bundle.json`

现在都会返回同一份 non-secret instance fingerprint，至少包含：

- `uiPort`
- `packRoot`
- `openclawHome`
- `profileDir`
- `pid`
- `serverStartedAt`

这使得“浏览器实际连到旧 UI 服务 / 错 release 目录 / 错 package-local profile”可以直接通过状态面定位，不再只靠猜。

### 2026-04-23 入口预检与 foreign-listener 进一步加固

继续围绕“本机成功、远端新 Mac 超时”的分叉排查，现已再补一层 packaged-mac hardening：

- `platforms/mac/wrappers/01-开始部署.command`
  - 启动前自动清理 `com.apple.quarantine`
  - 启动前校验 bundled Node 是否包含当前 Mac 的 CPU slice
  - 启动前校验 `npm` / `npx` / `corepack` 仍是 symlink，防止外层 zip flatten 后才在安装中途失败
  - gateway / router 端口改为优先选择空闲端口，减少旧 listener 干扰当前实例
- `ui/server.mjs`
  - `openclaw` 子进程统一以 `PACK_ROOT` 为 `cwd`
  - packaged hardening 模式下可要求渠道插件必须来自包内 bundled tarball；缺失时直接 fail-fast
  - gateway fallback 启动前必须先做 health check：只有当前端口 listener 确认是本 profile OpenClaw gateway，才会认 already running
  - 若端口忙但 health check 不通过，则直接按 foreign listener 处理，不再把“端口有人占用”误判成成功
- `ui/public/index.html`
  - 安装向导初始加载 `init()` 现在也接受 `runtimeMode = gateway-fallback` 或 `gatewayHealthy = true` 的已安装状态，不再只认 `daemon = running`

这轮加固的意图很明确：把“错实例 / 旧 listener / 被压扁的 runtime symlink / 架构不匹配 / 在线插件回退”这些典型新机分叉点尽量前移成 fail-fast，而不是等到 UI 长时间旋转后才暴露。

## 当前主要剩余事项

### 1. Windows-specific evidence 仍需独立推进

当前已确认：

- mac packaged channel closure 已完成
- 这不能反向证明 Windows 已完成
- `F-025-B` 仍应按 `blocked on Windows-specific evidence` 处理，直到 Windows 线拿到自己的 fresh proof

### 2. GitHub tree 仍不是完整 runtime 复现面

当前已确认：

- GitHub 上可审代码、文档、spec、longrun
- 但 bundled runtime 不在 GitHub tree 中
- 因此真实 packaged rerun 仍需要本地 artifact / evidence bundle，而不是只靠 GitHub 浏览

### 3. 当前收尾重点已从“证明 channels”转向“同步 truth / handoff / writeback”

当前不是继续猜 channel blocker，而是：

1. 把 fresh packaged DingTalk / WeCom truth 同步到 active docs / spec / longrun
2. 保留 handoff bundle 供后续 Windows / GPT Pro 只读参考
3. 继续把 Windows 线与当前 mac packaged/channel 线拆开处理

## 对 ChatGPT Pro 最重要的判断

### 已确认

- 当前 repo 的 authority order 已冻结
- `F-031` 已完成 source truth PASS + combined packaged PASS
- `F-032` 已完成 source truth PASS + combined packaged PASS
- `unified-model-configuration-surface` 已完成 source PASS + fresh packaged PASS；它是新 dashboard/model-routing configuration surface packet，不重写 `F-031` / `F-027`
- `F-034` 已完成 source truth PASS + fresh packaged replay PASS，且 closeout 只锚到 `2026-04-24` artifact/replay
- `packaged-channels-late-stage-authority-closure` 已完成 source truth PASS + fresh packaged replay PASS，且 closeout 只锚到 `2026-04-25` late-stage authority evidence
- `packaged-channel-smart-routing-authority-hardening` 已完成 facts-only closeout：Feishu live external inbound PASS；DingTalk / WeCom final live continuation 未重跑，不能声明 live PASS
- F-035 packaged isolation + install stall hotfix 已有 fresh evidence
- packaged runtime truth / first-click / diagnostics export 已有 fresh evidence
- latest packaged mac artifact 已完成 DingTalk / WeCom channel-specific closure，且同日后续 combined packaged verification 已 fresh PASS
- packaged WeCom 当前 authoritative route 是官方插件，不再是旧 `sunnoy-wecom` packaged blocker 口径
- Windows 线必须单独拿自己的 truth inventory、test matrix、implementation 与 fresh evidence

### 未确认

- GitHub tree 之外是否还有未整理的旧 release / Notion 口径
- Windows-specific surfaces 的真实验证闭环何时完成
- DingTalk / WeCom live external inbound final continuation 何时重跑

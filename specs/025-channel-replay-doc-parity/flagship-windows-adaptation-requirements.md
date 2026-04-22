# Flagship Windows Adaptation Requirements

**Feature Context**: `F-025-B windows replay fidelity` plus later Windows packaged adaptation work  
**Current Baseline**: `feature/p0-packaged-mac-diagnostics` @ `f333554867d443c85a6ec83ca8a4720e6e75420b`  
**Document Type**: requirement and design envelope for Windows full-surface work  
**Status**: draft for design freeze, not implementation evidence

## 1. 为什么要单独写这份文档

Windows 现在不能再被表述成“后面顺手适配一下”。  
如果按旗舰版目标推进，Windows 不是一个 patch，而是一整套 surface：

1. wrapper / PowerShell / `.cmd` / companion；
2. replay fidelity；
3. runtime truth；
4. packaged first-click；
5. diagnostics；
6. artifact integrity；
7. lifecycle；
8. Windows-specific host behavior。

mac 这轮给了我们一条很清楚的经验：

> 真正稳定的 packaged 支持，不是把功能代码搬过去，而是把 authority、diagnostics、fail-fast、runtime truth、isolated verification、secret redaction、lifecycle evidence 全套带过去。

所以这份文档的目标不是给出“Windows 先做哪两行”，而是把 Windows 的 full-surface 旗舰版需求和测试点讲透。

## 2. 一句话目标

让 Windows 平台达到如下定义：

> 相同的 replay contract、相同的 install truth、相同的 diagnostics truth、相同的 packaged artifact integrity，在 Windows 的 `.cmd` / PowerShell / packaged / fallback / UAC / 非标准 home / 多实例环境下仍然可复现、可解释、可导出、可验证。

## 3. 这份文档不是在做什么

这份文档不是：

1. 直接把 `F-025-B` 写成完成；
2. 偷偷把 Windows 并进当前 mac packet；
3. 一个只修 `one-click-deploy.ps1` 某一处字段的最小实现说明；
4. 一个把 Windows 线简化成“和 mac 一样做一遍”的乐观假设；
5. 一个只讨论 UI，不讨论 runtime / packaging / host behavior 的文档。

## 4. 旗舰版 Windows 的目标状态

### 4.1 authority 必须单一

Windows 旗舰版必须做到：

1. authoritative replay truth 仍在：
   - `ui/server.mjs`
   - `ui/public/index.html`
   - `ui/public/dashboard.html`
   - `ui/public/channel-helpers.js`
   - `ui/lib/channel-canonical.mjs`
2. Windows wrapper 不能再长期保留自己的“第二套 authority”；
3. wrapper 可以负责 orchestration，但不能长期负责定义 channel replay contract。

### 4.2 Windows 与 mac 要共享同一套真状态面

Windows 旗舰版不应只有“能跑起来”，而应拥有与 mac 同等级的诊断能力：

1. `/api/install/status`
2. `/api/diagnostics`
3. `/api/diagnostics/export`
4. `install-state.json`
5. `install.log`
6. `diagnostic-bundle.json`
7. `channelProbes.*`
8. secret redaction

### 4.3 packaged integrity 必须前置到 build/export

Windows 不能等到目标机双击才发现 artifact 不完整。  
旗舰版要求：

1. runtime truth manifest；
2. 关键 runtime deps presence；
3. wrapper / helper / plugin archive presence；
4. required diagnostics helper presence；
5. build/export fail-fast。

### 4.4 Windows-specific host behavior 必须被视为一等公民

Windows 不是 mac 的语法移植；它有独立宿主现实：

1. PowerShell 5 / 7 差异；
2. `.cmd` 与 `.ps1` 双入口；
3. `schtasks` 权限；
4. `gateway-fallback`；
5. `HOME / USERPROFILE / HOMEDRIVE / HOMEPATH`；
6. UAC / 提权启动；
7. Defender / SmartScreen；
8. 非标准用户目录；
9. 多实例、多 profile、多 worktree attach 风险；
10. 编码、换行、stderr/body 读取差异。

旗舰版需求必须把这些写进 truth surface，而不是当“后续环境问题”。

## 5. 旗舰版 Windows 需要覆盖的五层能力

### 5.1 Layer 1 — replay fidelity

目标：

1. install replay；
2. dashboard replay；
3. read-back replay；
4. channel field preservation；
5. alias / optional field handling；
6. server-side canonical handling 不被 wrapper 重写。

最关键的 channel-specific 要求：

1. Feishu
   - `appId + appSecret` 正常 replay。
2. DingTalk
   - `clientId + clientSecret` 为最小主链；
   - `corpId` 仍是 optional metadata；
   - `robotCode` 可作为 alias / baggage；
   - 不得把 `corpId` 反向升级为 default blocker。
3. WeCom
   - `botId + secret` 为最小主链；
   - 若 profile 中已有 `corpId / corpSecret / agentId / replyFormat / callback*`，Windows replay 必须能保留这些字段；
   - 不得把 callback 反写成默认 blocking gate。

### 5.2 Layer 2 — diagnostics parity

Windows 旗舰版必须拥有可复查诊断面，而不是靠 PowerShell 文本输出猜测状态：

1. install step 真实状态；
2. runtimeMode 真实状态；
3. daemon / gatewayHealthy / gatewayPortBusy 区分；
4. channel probe persistence；
5. artifact / profile / runtime path 可读；
6. export bundle 可直接交给协作者复查。

### 5.3 Layer 3 — packaged runtime truth

Windows artifact 必须回答：

1. 运行时来自哪里；
2. `canonicalRuntimeSource` 是什么；
3. `lib/bin` 是否一致；
4. node/openclaw/helper 是否完整；
5. wrapper 使用的是哪个 runtime root；
6. packaged 与 repo-root 双入口的差异是否被明确定义。

### 5.4 Layer 4 — first-click and lifecycle truth

Windows 旗舰版不能只测一次安装，还必须测：

1. first-click；
2. relaunch；
3. reset / cleanup；
4. historical profile replay；
5. handoff artifact 导出；
6. one-click rerun；
7. packaged / repo-root 双布局切换。

### 5.5 Layer 5 — host reality and resilience

以下场景必须被当成正式验证面：

1. PowerShell 5；
2. PowerShell 7；
3. current user；
4. elevated shell；
5. 非标准 home；
6. 域用户或重定向 profile；
7. `schtasks` 可用；
8. `schtasks` 不可用且 `gateway-fallback`；
9. Defender / SmartScreen 干预；
10. 多实例 UI server。

## 6. 需要覆盖的代码与资产面

### 6.1 wrapper / companion / shared installer

重点读写面：

1. `platforms/windows/wrappers/one-click-deploy.cmd`
2. `platforms/windows/wrappers/one-click-deploy.ps1`
3. `platforms/windows/wrappers/install-local-feishu.ps1`
4. `platforms/windows/wrappers/harden-local-feishu.ps1`
5. `platforms/windows/wrappers/run-openclaw-usb.cmd`
6. `platforms/windows/wrappers/harden-openclaw-usb.cmd`
7. `platforms/windows/companion/*.ps1`
8. `scripts/openclaw-usb/*.ps1`

### 6.2 shared authority and diagnostics

重点读面：

1. `ui/server.mjs`
2. `ui/public/index.html`
3. `ui/public/dashboard.html`
4. `ui/public/channel-helpers.js`
5. `ui/lib/channel-canonical.mjs`
6. `ui/lib/wecom.mjs`
7. packaged diagnostics docs

### 6.3 build/export and artifact

重点读写面：

1. `scripts/build-usb-pack.sh`
2. `longrun/workspaces/openclaw-usb-portable/execution/scripts/create-windows-handoff-copy.sh`
3. `longrun/workspaces/openclaw-usb-portable/execution/scripts/lib/export-common.sh`
4. `dist/handoff/*windows*`
5. `vendor/windows-openclaw/*`

## 7. 从 mac 必须迁过去的机制

Windows 不该只迁“功能”，而必须迁这些机制：

1. runtime truth manifest
2. build/export fail-fast
3. first-click truth
4. install-state persistence
5. install.log persistence
6. diagnostic-bundle persistence
7. diagnostics export
8. channel probe persistence
9. secret redaction
10. isolated `OPENCLAW_HOME` / profile verification
11. authority-first diagnostics，而不是 wrapper-side 猜测状态

## 8. Windows 不能直接照抄 mac 的地方

以下地方不能机械复用 mac：

1. `schtasks` 与 `gateway-fallback` 语义；
2. `.cmd` 与 `.ps1` 双入口；
3. PowerShell WebException / response body 读取；
4. Windows profile / user home 解析；
5. Defender / SmartScreen / UAC；
6. PowerShell 版本差异；
7. 进程 attach / endpoint discovery；
8. CRLF / UTF-8 / BOM / 路径引号。

## 9. 旗舰版测试矩阵

### 9.1 Entry Matrix

每个入口都应被单独验证：

1. repo-root `one-click-deploy.cmd`
2. repo-root `one-click-deploy.ps1`
3. packaged `one-click-deploy.cmd`
4. packaged `one-click-deploy.ps1`
5. direct bridge `.ps1`
6. `.cmd` bridge to packaged runtime

### 9.2 User / Host Matrix

每种宿主态都要有单独结论：

1. 当前用户
2. 提权用户
3. 非标准 home
4. 历史 profile 已存在
5. 多 profile 并存
6. 多 worktree / 多实例

### 9.3 Runtime Matrix

至少区分：

1. daemon install success
2. daemon restart success
3. `gateway-fallback`
4. daemon stop / uninstall
5. gateway healthy
6. gateway port busy but not healthy

### 9.4 Replay Matrix

每条 channel 都要跑：

1. install replay
2. dashboard replay
3. read-back replay
4. rerun after existing profile

channel-specific cases：

1. Feishu
   - `appId + appSecret`
2. DingTalk
   - `clientId + clientSecret`
   - `clientId + clientSecret + corpId`
   - `clientId + clientSecret + corpId + robotCode`
3. WeCom
   - `botId + secret`
   - `botId + secret + corpId + corpSecret + agentId`
   - `botId + secret + agent/reply fields`
   - `botId + secret + callback*` pre-existing profile preservation

### 9.5 Diagnostics Matrix

每种失败层都要验证 diagnostics：

1. missing runtime
2. missing helper
3. bad artifact
4. plugin install reject
5. channel validation fail
6. daemon start fail
7. probe fail

必须检查：

1. `/api/install/status`
2. `/api/diagnostics`
3. `/api/diagnostics/export`
4. `install-state.json`
5. `install.log`
6. `diagnostic-bundle.json`

### 9.6 Lifecycle Matrix

至少验证：

1. first install
2. relaunch
3. reset
4. reinstall
5. handoff unpack then run
6. repo-root run after packaged run

## 10. Windows 线最容易踩的坑

1. wrapper 继续维护第二套 replay authority。
2. `Find-UiEndpoint()` 绑错实例。
3. blanket kill 杀错 UI server。
4. `Resolve-OpenClawHome()` 在提权 / 域用户场景漂移。
5. PowerShell 版本不同导致 4xx/5xx 错误体丢失。
6. `.cmd` 和 `.ps1` 在 repo-root / packaged layout 下解析不同 runtime。
7. `gateway-fallback` 被误写成失败，而不是受限宿主下的预期形态。
8. Defender / SmartScreen 导致 artifact 可执行性和日志解释失真。
9. CRLF / BOM / 编码问题让 seemingly-correct 脚本在目标机异常。
10. 没有 isolated verification，导致历史本机状态污染结论。
11. 只做正向 happy path，不做 negative invariant。
12. 拿 mac 经验直接宣称 Windows 也“差不多可以”。

## 11. 推荐的旗舰版推进顺序

### Packet W1 — Windows truth inventory freeze

目标：

1. 把全部 Windows truth surface 列清；
2. 明确 authority、write-set、read-set；
3. 形成 Commander 可派工的 inventory。

### Packet W2 — replay authority convergence

目标：

1. 消除 wrapper-side duplicate authority；
2. 让 Windows replay 跟随 server/browser frozen baseline；
3. 保证 WeCom/DingTalk optional field fidelity。

### Packet W3 — diagnostics parity

目标：

1. 让 Windows 拥有与 mac 同级 diagnostics surface；
2. 让 install-state / export / package-local files 成为一等证据。

### Packet W4 — packaged runtime truth and fail-fast

目标：

1. 把 runtime truth 与 build/export fail-fast 带进 Windows artifact；
2. 把 incomplete artifact 问题提前到构建期。

### Packet W5 — first-click and lifecycle closure

目标：

1. 做 Windows first-click truth；
2. 做 relaunch / reset / handoff / rerun closure。

### Packet W6 — Windows-specific fresh evidence close gate

目标：

1. 收 Windows-specific fresh evidence；
2. 不再用历史 runbook / 截图 / 推断性文本替代；
3. 再决定哪些 feature 可以写 PASS。

## 12. 这份文档对执行方的要求

后续无论是 GPT Pro 还是同事执行，都必须遵守：

1. 不允许把 Windows 设计偷写成“已实现”。
2. 不允许把没有 Windows-specific evidence 的项写 PASS。
3. 不允许只修 wrapper 文案，不修 authority semantics。
4. 不允许只看 happy path，不看 diagnostics 和 lifecycle。
5. 不允许把 callback 提升成默认 WeCom 阻断门槛。
6. 不允许把 `gateway-fallback` 的真实含义写坏。
7. 不允许只做 repo-root，不做 packaged。
8. 不允许只做 packaged，不做 repo-root。

## 13. 成功定义

只有当以下条件同时成立时，才有资格说 Windows 旗舰版适配真正进入稳定态：

1. replay fidelity 在 Windows 上与 frozen baseline 一致；
2. diagnostics surface 与 mac 同等级；
3. packaged artifact 具备 runtime truth 和 fail-fast；
4. first-click / lifecycle 在 Windows 上可复现；
5. PowerShell / host 差异被纳入真验证面；
6. 结论基于 fresh Windows evidence，而不是文本推断；
7. channel-specific packaged 结论不再依赖模糊话术，而能落到明确的 gate 和 artifact lineage。

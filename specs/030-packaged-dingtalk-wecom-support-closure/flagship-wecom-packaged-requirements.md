# Flagship Packaged WeCom Requirements

**Feature Context**: `F-030 packaged dingtalk / wecom support closure`  
**Current Baseline**: `feature/p0-packaged-mac-diagnostics` @ `f333554867d443c85a6ec83ca8a4720e6e75420b`  
**Document Type**: requirement addendum / flagship target definition / closeout reference  
**Status**: requirement frozen and matched by latest fresh packaged evidence (`2026-04-22`)

## 1. 为什么单独写这份文档

当前 packaged WeCom 的真实状态已经从“缺 secret，无法启动真实安装”推进到了“同一轮 fresh packaged artifact 上已完成 real `/api/install`、diagnostics/export、package-local evidence，并通过 packaged gate”。

fresh packaged evidence 已确认：

1. real WeCom + LLM secret injection 已存在；
2. fresh packaged artifact 可以启动；
3. packaged WeCom 当前 authoritative route 已切到官方插件：`@wecom/wecom-openclaw-plugin`；
4. bundled archive 已切到 `plugins/wecom-wecom-openclaw-plugin-2026.4.22.tgz`；
5. real `/api/install` 已执行且 `installStatus.status = completed`；
6. `runtimeMode = daemon`；
7. `channelProbes.wecom.status = ok` 且 `ready = true`；
8. `/api/install`、`/api/install/status`、`install-state.json`、`diagnostic-bundle.json`、`/api/diagnostics`、`/api/diagnostics/export` 已对同一 packaged session 给出一致结论；
9. 旧 `@sunnoy/wecom` install-time scanner blocker 与 `unknown channel id: wecom` follow-on error 未在当前路线下复现。

因此，这份文档不再只是“未来想怎么做”的草案。  
它同时承担两层作用：

1. 作为 packaged WeCom 旗舰版设计的冻结目标；
2. 作为 `2026-04-22` latest packaged PASS 为什么成立、以及未来 regression 不能回退到哪些旧坑的 reference。

## 2. 一句话目标

让 OpenSparrow 的 packaged WeCom 支持达到如下标准：

> 对真实 `Bot ID + Secret` 输入，packaged artifact 能稳定执行 WeCom 安装；若 runtime / plugin / channel gate 任一层失败，系统会在正确层级 fail-fast、导出一致诊断、且绝不伪造 ready；若全部成功，则 `wecomProbe`、status、read-back、lifecycle、export surface 对同一 packaged state 给出一致结论。

## 3. 这份文档明确不要的东西

这份文档不是：

1. 一个“先过再说”的最小实现草案；
2. 一个绕过 runtime 安全扫描的临时 bypass 提案；
3. 一个把 true `F-014` 改写成 callback-first 或自建应用 first 的文档；
4. 一个把 Windows packaged 需求偷带进来的混合文档；
5. 一个只收 UI 文案或 handoff 说辞的 closeout 文档。

## 4. 旗舰版目标状态

### 4.1 安装 gate 必须真实分层

packaged WeCom 安装必须被拆成可观测的真实 gate，而不是一条长链糊在一起：

1. artifact gate
   - artifact 内 runtime truth、plugin archive、server helper、router helper、diagnostics helper 都完整；
   - build/export 阶段就能 fail-fast，不允许 incomplete artifact 进入 packaged evidence。
2. runtime compatibility gate
   - bundled runtime 版本与 WeCom plugin 要求兼容；
   - runtime 安全扫描结果被明确识别并归类，而不是被吞掉。
3. plugin install gate
   - packaged WeCom plugin 成功安装，且扩展目录真实存在；
   - 如果失败，必须以 plugin gate 结束，不允许继续写 channel config。
4. channel config gate
   - 只有 plugin gate 成功后，才允许写 `plugins.entries.wecom.*` / `channels.wecom.*`；
   - 不允许在 `unknown channel id` 这种 follow-on error 中丢失上游真实 blocker。
5. runtime start gate
   - daemon / fallback / gateway health 被真实区分；
   - packaged install 结果不能靠端口占用假装成 ready。
6. probe gate
   - probe 只在 plugin + channel config + runtime gate 成功后才有资格成为 real proof；
   - probe 失败要能给出真实失败原因，不得被 placeholder 冒充。

### 4.2 packaged 安装结果必须“要么成功，要么在正确层失败”

旗舰版实现的核心不是“尽量往后跑”，而是：

1. 成功时：
   - `/api/install` 返回 `ok=true`；
   - `channelProbes.wecom` 存在真实结构化 snapshot；
   - `/api/install/status`、`install-state.json`、`diagnostic-bundle.json`、`/api/diagnostics`、`/api/diagnostics/export` 对同一次安装给出一致结论。
2. 失败时：
   - `/api/install` 在第一真实失败层停止；
   - install-state / export 明确标记失败层级；
   - 下游步骤不继续产生误导性的二次错误；
   - diagnostics 中保留足够 attribution 信息供人复查。

### 4.3 packaged WeCom 必须延续 true `F-014` 的 bot-first floor

旗舰版 packaged WeCom 只能建立在已冻结的主链上：

1. 最小真实入口仍然是 `botId + secret`；
2. `corpId / corpSecret / agentId / replyFormat / callback*` 仍然是增强字段；
3. callback 不是默认 blocking gate；
4. 不允许为了 packaged closure 反向改写 true `F-014` 的业务主链定义。

### 4.4 packaged lifecycle 必须纳入目标，而不是只看单次安装

旗舰版实现必须覆盖：

1. first-click；
2. install 完成后的 status / dashboard read-back；
3. relaunch；
4. reset / cleanup；
5. handoff artifact 导出；
6. diagnostics export 复查。

也就是说，单次 `/api/install` 成功不等于旗舰版 packaged WeCom 已完成。

## 5. 必须具备的产品效果

如果这条线实现完成，最终应该达到以下产品效果：

1. 用户在 packaged artifact 中填写真实 WeCom 凭据后，不会再看到“plugin 明明没装上，但 UI 还继续往后跑”的假进展。
2. 如果 packaged WeCom 真可用，用户能在同一条 packaged 会话内看到：
   - 安装成功；
   - status/read-back 一致；
   - diagnostics/export 有真实 `wecomProbe`；
   - lifecycle 再次启动后结论不漂。
3. 如果 packaged WeCom 不可用，用户能从 diagnostics 直接看出：
   - 是 artifact 不完整；
   - 还是 runtime / plugin 安全扫描拦截；
   - 还是 channel config gate；
   - 还是 daemon / probe 问题。
4. 支持人员不需要翻源码，也不需要凭猜测判断卡点。

## 6. 当前已落地的 packaged WeCom authoritative route

### 6.1 官方插件路线

当前 packaged WeCom authoritative route 已固定为：

1. plugin package：`@wecom/wecom-openclaw-plugin`
2. bundled archive：`wecom-wecom-openclaw-plugin-2026.4.22.tgz`
3. plugin entry id：`wecom-openclaw-plugin`
4. enabled path：`plugins.entries.wecom-openclaw-plugin.enabled`
5. channel id 仍然是：`wecom`

### 6.2 当前 authoritative outcome

在 latest fresh packaged evidence 中，以下结论已成立：

1. official plugin 可安装；
2. plugin entry 能被真实启用；
3. `plugins.allow` 已显式包含 `wecom-openclaw-plugin`；
4. bot-first credentials 已写入；
5. probe/read-back 已不再是 placeholder；
6. `runtimeMode = daemon`，且 packaged status / diagnostics / package-local facts 一致。

## 7. 需要覆盖的实现面

### 7.1 服务端 authority 面

重点责任面：

1. `ui/server.mjs`
   - plugin install outcome classification；
   - WeCom channel config gating；
   - install-state persistence；
   - diagnostic-bundle/export；
   - fail-fast 与 post-failure stop semantics。
2. `ui/install-helpers.mjs`
   - bundled plugin archive resolution；
   - packaged artifact 内 plugin path 解释。
3. `ui/lib/wecom.mjs`
   - bot-first canonical handling 与 read-back enrichment；
   - 不扩大成 callback-first。

### 7.2 packaged artifact / build-export 面

重点责任面：

1. `scripts/build-usb-pack.sh`
2. `longrun/workspaces/openclaw-usb-portable/execution/scripts/create-mac-handoff-copy.sh`
3. `longrun/workspaces/openclaw-usb-portable/execution/scripts/lib/export-common.sh`
4. `vendor/mac-openclaw/RUNTIME_TRUTH.json`
5. `dist/handoff/*`

这里的要求不是“能打包”，而是：

1. plugin archive 真进入 artifact；
2. runtime truth 真进入 artifact；
3. 关键 runtime deps 真进入 artifact；
4. incompatible artifact 在 build/export 阶段就 fail-fast。

### 7.3 诊断与导出面

必须统一的 surface：

1. `/api/install`
2. `/api/install/status`
3. `/api/diagnostics`
4. `/api/diagnostics/export`
5. `install-state.json`
6. `install.log`
7. `diagnostic-bundle.json`

旗舰版要求是：  
这些 surface 必须承载同一份 truth，而不是各说各话。

## 8. 必须冻结的失败语义

### 7.1 plugin install 被拒绝时

旗舰版语义必须是：

1. plugin gate 直接失败；
2. install state 明确标记 `plugins=error`；
3. WeCom channel config step 不再继续；
4. 不允许再产生 `channels.wecom unknown channel id` 这种次生误导错误；
5. diagnostics/export 明确保留 plugin rejection 的原始归因摘要。

### 7.2 channel config 被拒绝时

必须能区分：

1. plugin 未安装导致的 channel id 不存在；
2. 字段缺失导致的 config validation；
3. callback 组内校验；
4. runtime 本身不认该 channel schema。

### 7.3 probe 不存在时

必须明确：

1. `wecomProbe = null` 是 placeholder；
2. placeholder 不能被描述成 real proof；
3. diagnostics/export 必须能让人知道“为什么 probe 还没资格执行”。

## 9. 旗舰版验证面

### 8.1 正向验证

至少应有：

1. fresh artifact 完整性验证；
2. fresh isolated packaged launch；
3. real `/api/install`；
4. fresh `/api/install/status`；
5. fresh `/api/diagnostics`；
6. fresh `/api/diagnostics/export`；
7. package-local `install-state.json`；
8. package-local `install.log`；
9. package-local `diagnostic-bundle.json`；
10. relaunch / restart 后的 read-back consistency。

### 8.2 负向验证

至少应有：

1. plugin install rejection 时不继续写 channel config；
2. plugin install rejection 时 diagnostics 仍能导出；
3. secret redaction 不失守；
4. missing plugin archive / incomplete artifact 能在 build/export 阶段 fail-fast；
5. 不存在 real probe 时不误写 PASS；
6. runtimeMode / daemon / gatewayHealthy 不互相冒充。

### 8.3 证据等级

只有下面这些证据能支撑 packaged WeCom closure：

1. Commander 指定 artifact lineage；
2. same-session fresh install evidence；
3. same-session fresh diagnostics/export evidence；
4. package-local evidence；
5. 如需宣称 full closure，还需 real packaged channel-side proof。

以下不能单独支撑 closure：

1. bounded probe；
2. dashboard 可读；
3. old screenshot；
4. old source-tree install；
5. 旧 longrun 文本；
6. 没有 real `wecomProbe` 的 placeholder diagnostics。

## 10. 最稳定的旗舰版实现应如何拆包

### Packet A — install gate truth hardening

目标：

1. 明确 plugin rejection、channel config rejection、runtime rejection 的 stop semantics；
2. 做到 fail-fast；
3. 做到 diagnostics 一致。

这是旗舰版稳定性的第一层，不是可选项。

### Packet B — official plugin compatibility closure

目标：

1. 明确 packaged WeCom authoritative route 是官方插件，而不是继续围绕旧 `@sunnoy/wecom` 路线做 packaged closeout；
2. 让 packaged build、install、read-back、diagnostics、package-local facts 全部围绕官方插件 entry/id/path 对齐；
3. 拿到 Commander 可接受的 packaged runtime/plugin compatibility truth。

这一步没做通，就不能真正拿到 packaged WeCom PASS；当前 fresh evidence 已证明这一步在官方插件路线上成立。

### Packet C — real packaged evidence closure

目标：

1. 在成功 artifact 上重跑 real `/api/install`；
2. 收 real `wecomProbe`；
3. 收 read-back / lifecycle / export consistency；
4. 再决定是否能进 packaged closure。

## 11. 最容易踩的坑

1. 为了“先让安装过”而偷偷绕过 runtime 安全扫描。
2. plugin rejection 后仍继续写 `channels.wecom.*`，把真 blocker 冲淡。
3. 在官方插件路线已经成立后，又把 packaged truth 倒回旧 `@sunnoy/wecom` community blocker 口径。
4. 把 callback 反写成默认 blocking gate。
5. 只验证 `/api/install` response，不验证 package-local files。
6. 只验证单次安装，不验证 relaunch / reset / export。
7. secret redaction 做在部分 surface，而不是全 surface。
8. 把 source-tree success 误当 packaged success。

## 12. 这份文档对 GPT Pro / 同事的要求

后续执行这条线时，必须满足：

1. 不接受“最小能跑”作为终点；
2. 不接受只修 UI 提示、不修 authority semantics；
3. 不接受没有 fresh packaged evidence 的 PASS；
4. 不接受拿 Windows 线混入当前包；
5. 不接受通过关闭安全扫描来“证明 packaged WeCom 可用”；
6. 不接受只给 patch，不给 failure model 和 verification matrix。

## 13. 成功定义

只有当以下条件同时成立时，才有资格谈 packaged WeCom 旗舰版支持成立：

1. plugin gate、channel gate、runtime gate、probe gate 都有清晰语义；
2. 失败时在正确层 fail-fast；
3. 成功时 `wecomProbe` 进入所有要求的 evidence surface；
4. package-local 与 HTTP diagnostics/export 一致；
5. relaunch / reset / handoff 不破坏 truth；
6. secrets 全程不泄露；
7. 结论基于 fresh packaged evidence，而不是历史 carryover。

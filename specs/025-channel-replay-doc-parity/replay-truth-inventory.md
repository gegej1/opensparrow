# Replay Truth Inventory

## 1. Scope

- 本清单只覆盖 `install replay`、`dashboard replay`、`read-back replay` 三个 surface。
- 本清单只做 truth inventory / parity matrix，不修实现、不改 `ui/*`、不扩到 Windows fidelity、不扩到 broader docs parity。
- 本清单以 `F-024 unified channel contract baseline` 为冻结基线；若某差异已被 `F-024` 明确冻结，则在本清单中只记录，不再重定义 contract。

## 2. Channel-by-channel inventory

### Feishu

- `install replay`：
  - `ui/public/index.html` 当前安装向导字段集为 `appId + appSecret`。
  - `ui/public/channel-helpers.js` 对飞书只接受 `appId/appSecret`，并在安装前要求二者同时存在。
  - 向 `/api/install` 发送的 payload 也是 `appId + appSecret`，无额外 alias baggage。
  - 当前安装页不会从已有配置做回放预填；install surface 本质上是“空表单 + 当前输入 replay”。
- `dashboard replay`：
  - `ui/public/dashboard.html` 卡片、弹窗、保存逻辑都围绕 `appId + appSecret`。
  - 保存/启用时经由统一 helper 构造 payload，再发往 `/api/config/channels`。
  - 字段解释在 dashboard surface 内一致，无 alias 翻译层。
- `read-back replay`：
  - `ui/server.mjs` 通过 `/api/config` 与 `/api/config/channels` 返回飞书配置时，无需额外 enrich。
  - `ui/lib/channel-canonical.mjs` 将飞书视为直接持久化并直接读回的通道；read-back 不依赖 sidecar metadata。
  - 结论：Feishu 三个 surface 的 contract 已基本同构。

### DingTalk

- `install replay`：
  - `ui/public/index.html` 当前安装向导展示字段为 `corpId + clientId + robotCode + clientSecret`。
  - `ui/public/channel-helpers.js` 对钉钉接受 `clientId/appKey/robotCode` 与 `clientSecret/appSecret` alias；`corpId/cropId` 仅作为可选 metadata。
  - 当前 requiredness 是：`clientId(或 robotCode 兜底映射) + clientSecret` 必填；`corpId` 非默认阻塞项。
  - 安装 payload 会携带 `corpId + clientId + robotCode + clientSecret`，但其中 `corpId` 不属于强制 core contract。
- `dashboard replay`：
  - `ui/public/dashboard.html` 仍展示 `CorpId / AppKey / RobotCode / AppSecret` 这一组 label。
  - dashboard 保存/启用时也走统一 helper，因此 requiredness 与 alias acceptance 与 install surface 基本一致。
  - 但 dashboard 的本地保存后回显，是基于刚提交的 payload 本地重放，不是强制 read-after-write 拉取 authoritative read-back。
- `read-back replay`：
  - `ui/lib/channel-canonical.mjs` 的 canonical core 是 `clientId + clientSecret`；`robotCode` 被当作 display/alias baggage；`corpId` 被当作 optional tenant metadata。
  - 持久化时，`clientId/clientSecret/robotCode` 写入 `channels.dingtalk.*`；`corpId` 不进入主配置树，而是写入 `ui meta patch`。
  - `ui/server.mjs` 在 `/api/config` 与 `/api/config/channels` 返回前会做 enrich：`corpId` 从 `channels.dingtalk.corpId/cropId` 或 dingtalk UI meta 合并回放，`robotCode` 则从 `robotCode -> uiMeta.robotCode -> clientId` 回放。
  - 结论：钉钉三 surface 的“字段解释”大体已经向 `F-024` baseline 对齐，但 read-back 依赖 `config + ui-meta` 双源合成，不是单源直读。

### WeCom

- `install replay`：
  - `ui/public/index.html` 当前安装向导展示平铺字段：`botId + secret + corpId + corpSecret + agentId + replyFormat + callbackToken + encodingAESKey + callbackPath`。
  - `ui/public/wecom-helpers.js` 明确当前主链 requiredness 为 `botId + secret`；agent 三元组与 callback 三元组属于增强链路，只有在用户填入相关字段时才触发组内完整性校验。
  - 安装 payload 以平铺字段发往 `/api/install`，不会把 callback 当作默认必经门槛。
- `dashboard replay`：
  - `ui/public/dashboard.html` 的卡片、弹窗、保存/启用逻辑与安装页使用同一套 WeCom helper 语义。
  - dashboard surface 也以平铺字段编辑，但保存目标允许服务端将 agent/callback 收敛到嵌套 persisted schema。
  - dashboard 保存后本地回显同样是基于已提交 payload 的本地 replay，而不是强制重新读取 authoritative read-back。
- `read-back replay`：
  - `ui/lib/wecom.mjs` 与 `ui/lib/channel-canonical.mjs` 共同负责把 persisted WeCom 配置从嵌套 schema flatten 回 UI 字段。
  - persisted core 仍是 `channels.wecom.botId + secret`；若配置了 agent，则落到 `channels.wecom.agent.*`；若配置了 callback，则落到 `channels.wecom.agent.callback.*`。
  - `/api/config` 与 `/api/config/channels` 在返回前会做 WeCom enrich，因此 UI read-back surface 看到的是 flatten 后字段，而不是 persisted nested shape。
  - 结论：WeCom 三个 surface 的主链 contract 已与 `F-024` 一致：`botId + secret` 为最小主链；callback 不是默认阻塞项。

## 3. Parity Matrix

| Channel | Surface | Field set | Requiredness | Alias acceptance | Persist target | Read-back / enrich | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Feishu | install replay | `appId`, `appSecret` | 二者必填 | 无 | `/api/install` -> `channels.feishu.*` | 无额外 enrich | 安装页不做已有配置预填 |
| Feishu | dashboard replay | `appId`, `appSecret` | 二者必填 | 无 | `/api/config/channels` -> `channels.feishu.*` | `GET /api/config*` 直接回放 | 三 surface 基本同构 |
| Feishu | read-back replay | `appId`, `appSecret` | 同上 | 无 | `channels.feishu.*` | 直接读回 | 已被 `F-024` 冻结 |
| DingTalk | install replay | `corpId`, `clientId`, `robotCode`, `clientSecret` | `clientId(或 robotCode 兜底)` + `clientSecret` 必填；`corpId` 可选 | `clientId/appKey/robotCode`，`clientSecret/appSecret`，`corpId/cropId` | `/api/install` -> config + dingtalk ui meta | install 只 replay 当前输入 | install label 仍带 `AppKey/AppSecret` baggage |
| DingTalk | dashboard replay | `corpId`, `clientId`, `robotCode`, `clientSecret` | 与 install 一致 | 与 install 一致 | `/api/config/channels` -> config + dingtalk ui meta | 保存后先本地 replay；刷新后读 authoritative read-back | display wording 与 canonical 名称不完全一致 |
| DingTalk | read-back replay | `clientId`, `clientSecret`, `robotCode`, `corpId` | core 为 `clientId + clientSecret` | 读回时兼容 `corpId/cropId` 与 `robotCode/clientId` 兜底 | `clientId/clientSecret/robotCode` 在 config；`corpId` 在 ui meta | `enrichChannelsForUi()` 合成回放 | 双源 read-back 是当前真实实现 |
| WeCom | install replay | `botId`, `secret`, `corpId`, `corpSecret`, `agentId`, `replyFormat`, `callbackToken`, `encodingAESKey`, `callbackPath` | `botId + secret` 必填；agent/callback 仅在对应链路启用时组内必填 | 无外部 alias，只有 flat UI shape | `/api/install` -> `channels.wecom.*` | install 只 replay 当前输入 | callback 非默认必经 |
| WeCom | dashboard replay | 同 install flat 字段集 | 与 install 一致 | 同 install | `/api/config/channels` -> nested persisted schema | 保存后先本地 replay；刷新后读 flatten read-back | flat edit / nested persist 已是现状 |
| WeCom | read-back replay | flat UI fields from nested config | core 仍是 `botId + secret` | 兼容 nested agent/callback flatten | `botId/secret` 直存；agent/callback nested persist | `normalizeWecomCredentials` / enrich flatten 回放 | 已被 `F-024` 冻结为允许现状 |

## 4. Difference Classification

- `Contract difference`：
  - 当前未发现需要推翻 `F-024` baseline 的 contract 差异。
  - 飞书已基本 parity。
  - 钉钉的核心 contract 已冻结为 `clientId + clientSecret`；`corpId` 为 optional metadata；`robotCode` 为 alias / display baggage。
  - 企业微信的核心 contract 已冻结为 `botId + secret`；agent/callback 为增强链路，不是默认必经。
- `Surface behavior difference`：
  - install surface 当前普遍是“空表单 + 当前输入 replay”，并不会从已有 persisted config 预填，这属于 surface 行为差异，不是 contract 差异。
  - dashboard 保存/启用后当前先做本地 replay，再等待下次 `loadConfig()` 才看到 authoritative read-back；这会影响 replay 观感，但不必然构成 contract 漂移。
  - DingTalk read-back 依赖 `config + ui-meta` 双源合成；若后续出现“可选字段清空后回放残留”，这是 server/read-back parity 问题，不是 baseline contract 变更。
- `Docs wording difference`：
  - DingTalk UI 当前仍显式使用 `AppKey / AppSecret` 展示词，而 baseline canonical 名称是 `clientId / clientSecret`；这是 wording/display 差异。
  - install/dashboard 若文案继续把 optional metadata 写成“默认必填”，应归为 wording drift，而不是 contract 重定义。
  - WeCom callback 若在局部文案里被写成默认安装门槛，应归为 wording drift；该点已被 `F-024` 与 `F-014` 后续口径明确冻结。
- `Non-issues / already frozen by F-024`：
  - Feishu 继续使用 `appId + appSecret` 单一路径。
  - DingTalk 允许 `robotCode` 作为 alias / display baggage，并允许 `corpId` 仅作为 optional metadata。
  - WeCom 继续允许“flat edit / nested persist / flatten read-back”三者并存。
  - callback / 自建应用增强链路、动态表单引擎、persisted schema 全迁移，都不是 `F-025-A` 本包问题。

## 5. Commander Input for Next Packets

- `PKT-025-A2` 应负责：
  - 以 server / canonical / read-back 为中心，核对三通道在 `/api/config` 与 `/api/config/channels` 的 authoritative replay 是否与 `F-024` baseline 完整闭环。
  - 重点处理 DingTalk `config + ui-meta` 双源回放是否存在“清空 optional 字段后仍旧读回旧值”的 blocker 候选。
  - 补齐或明确 Feishu / DingTalk / WeCom 的 read-back parity 断言与最小测试归属。
  - 不改 broader docs，不扩到 Windows fidelity。
- `PKT-025-A3` 应负责：
  - 以 install/dashboard browser surface 为中心，处理回放体验 parity：是否需要已有配置预填、是否需要 read-after-write、是否需要统一字段展示词。
  - 处理 DingTalk install/dashboard 上 `clientId/clientSecret` 与 `AppKey/AppSecret` 的 display 统一。
  - 处理仅与 install/dashboard replay 直接相关的最小 docs wording 补齐。
  - 不改 server persisted schema，不扩到 callback / 自建应用增强链路专项。
- `F-025-A` 明确不应解决：
  - Windows 专项 replay fidelity、PowerShell / Windows 环境差异 —— `redirect to F-025-B`。
  - broader docs parity、教程/交付文档全量收口 —— `redirect to F-025-C`。
  - callback / 自建应用增强链路专项扩战。
  - persisted schema 全迁移、动态表单引擎、泛化 cleanup / architecture refactor。

## 6. Blocker-driven small cleanup candidates (record only)

- DingTalk `ui meta` 当前更像增量 patch；若用户清空 `corpId` 或 `robotCode`，存在旧值残留并继续参与 read-back replay 的风险。该项如确认，需要进入 `PKT-025-A2`。
- install 页面当前没有“从已有配置回放预填”的机制；若 Commander 要求 install replay 与 dashboard/read-back 完全对齐，需要进入 `PKT-025-A3`。
- dashboard 当前保存成功后的卡片更新优先采用本地 payload replay，而不是强制重新读取服务端 enrich 结果；若这影响用户对 authoritative state 的判断，应进入 `PKT-025-A3`。

## 7. F-025-B / PKT-025-B1 Windows replay truth / divergence inventory

> Freeze guard: 上文 `## 1` 到 `## 6` 继续承载 `F-025-A / PKT-025-A1` 的已冻结 inventory。以下内容只新增 `F-025-B / PKT-025-B1` 的 Windows divergence inventory，不重写 `F-024`、不重开 `F-025-A`。

### 7.1 B1 scope and non-goals

- 只盘点 Windows replay fidelity 相对 `F-025-A` baseline 的新增 truth surface。
- 只区分四类 surface：
  - `wrapper/powershell/env`：问题发生在 replay contract 进入 `/api/install` 或 `/api/config*` 之前，表现为路径、runtime、profile、cwd、env、进程选择差异。
  - `replay behavior`：问题已经改变 install / dashboard / read-back replay 的字段集合、保留语义或回写结果。
  - `shared replay authority-adjacent`：Windows wrapper 自己复制了本应由 authoritative replay surface 解释的 mapping / normalization / read-back 语义。
  - `server/browser wiring`：Windows wrapper 选择或重启 UI server / browser attach 的方式可能让 replay 绑定到错误的实例或错误的 authoritative source。
- 不做实现修复，不改 `spec.md / plan.md / tasks.md`，不做 longrun 写回。
- 不把 callback、自建应用增强、schema migration、cleanup、broader docs parity 写成当前 packet 目标。

### 7.2 Windows truth surfaces

- `platforms/windows/wrappers/*.cmd`
  - 当前 `.cmd` bridge 已显式区分 repo-root 与 packaged runtime，并会在 repo 路径下设置 `USB_RUNTIME_ROOT`。
- `platforms/windows/wrappers/*.ps1`
  - 当前承载两类入口：direct bridge（`install-local-feishu.ps1` / `harden-local-feishu.ps1`）与 one-click replay（`one-click-deploy.ps1`）。
- `scripts/openclaw-usb/*.ps1`
  - 当前是共享 PowerShell 真源；Windows wrapper 是否命中正确 profile / state / runtime，最终会落到这些 shared scripts。
- `platforms/windows/companion/*.ps1`
  - 已 fresh reread；当前只看到 runtime/PATH 解析与 `npx openclaw ...` 调用面，没有拿到足够 Windows-specific fresh evidence 把它们直接归因为 install / dashboard / read-back replay divergence。
- authoritative replay read surface
  - `ui/public/index.html`
  - `ui/public/dashboard.html`
  - `ui/public/channel-helpers.js`
  - `ui/lib/channel-canonical.mjs`
  - `ui/server.mjs`
  - 这些 surface 在 `F-025-A` 中已经冻结为 replay baseline；`B1` 只检查 Windows wrapper 是否偏离它们。

### 7.3 Divergence inventory table

| ID | Status | Files / surface | Class | Relative to `F-025-A` baseline | Current evidence source | Enough for `B2`? | Must go back Commander first? | Exclusion / guard |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `WIN-ENV-001` | `ready` | `platforms/windows/wrappers/install-local-feishu.ps1`; `platforms/windows/wrappers/harden-local-feishu.ps1`; contrast `platforms/windows/wrappers/run-openclaw-usb.cmd` / `platforms/windows/wrappers/harden-openclaw-usb.cmd` | `wrapper/powershell/env` | 不属于 `F-025-A` contract 重开；它是 Windows direct PowerShell entrypoint 与 `.cmd` bridge 的 repo/runtime 解析分叉。当前 direct `.ps1` bridge 只认 packaged 父目录，repo-root 下可能在 replay 开始前就失效。 | `fresh reread` | `yes` | `no` | 只允许收口 path/runtime bridge；不扩大为 docs/cleanup。 |
| `WIN-REPLAY-001` | `ready` | `platforms/windows/wrappers/one-click-deploy.ps1` `Build-InstallPayload()`；对照 `ui/server.mjs` `GET /api/config*`、`ui/public/index.html` prefill、`ui/public/dashboard.html` load/save | `shared replay authority-adjacent` | `F-025-A` 已冻结 browser/server replay 以 `/api/config` / `/api/config/channels` + helper/canonical 为 authority；Windows one-click 仍从本地 `openclaw.json` / `auth-profiles.json` / `ui-meta.json` 手工重组 replay payload，形成 wrapper-side duplicate authority。 | `fresh attribution note` | `yes` | `no` | 当前归因首先落在 wrapper duplication，不等于 `channel-helpers.js` / `channel-canonical.mjs` 自身有 bug。 |
| `WIN-REPLAY-002` | `ready` | `platforms/windows/wrappers/one-click-deploy.ps1:469-475`; 对照 `ui/public/channel-helpers.js`、`ui/public/index.html`、`ui/lib/channel-canonical.mjs`、`ui/server.mjs` | `replay behavior` | `F-025-A` baseline 明确 WeCom install / dashboard / read-back 都承认 `botId + secret + corpId + corpSecret + agentId + replyFormat + callback*` 的 flat replay surface；Windows one-click 当前只 replay `botId + secret`，会把已存在的 agent/reply/callback 增强字段从 install replay 中丢掉。 | `fresh attribution note` | `yes` | `no` | 允许为 replay fidelity 保留已存在的 optional 字段；不允许把 callback 反写成默认 blocking gate。 |
| `WIN-ENV-002` | `pending attribution` | `platforms/windows/wrappers/one-click-deploy.ps1` `Resolve-OpenClawHome()` / env export；对照 `scripts/openclaw-usb/install-local-feishu.ps1` 的 `$HOME` state 路径 | `wrapper/powershell/env` | 不属于 `F-025-A` replay contract；它是 Windows profile targeting 的 shell/env 候选分叉。one-click 有多 home 探测与 `OPENCLAW_HOME` 注入，shared installer 仍直接落到 `$HOME\\.openclaw-<profile>`。是否在提权/域用户/非标准 home 下产生真实 divergence，当前没有 Windows-specific fresh evidence。 | `fresh attribution note` | `no` | `no` | 保持 `pending attribution`；没有 Windows fresh evidence 前不得算入 `B2` 完成面。 |
| `WIN-WIRE-001` | `pending attribution` | `platforms/windows/wrappers/one-click-deploy.ps1` `Find-UiEndpoint()` / `Stop-DeployService()` / restart flow | `server/browser wiring` | `F-025-A` 假定 browser replay 对的是 intended authoritative server；Windows wrapper 当前按端口扫描 + 进程命令行通配去接管 `ui/server.mjs`，可能在多实例 / 多 profile / 多 worktree 环境下绑定或杀错 UI server。 | `fresh attribution note` | `no` | `no` | 没有 Windows-specific fresh reproduction 前，只能保留为 wiring candidate；不得提前扩大为全局 server cleanup。 |

### 7.4 Attribution notes

- 本 packet 可直接归因的观察：
  - `WIN-ENV-001`：fresh reread 已足够说明 direct `.ps1` bridge 与 `.cmd` bridge 的 repo/runtime 解析不一致。
  - `WIN-REPLAY-001`：fresh reread 已足够说明 Windows one-click 没有复用 `F-025-A` authoritative read-back，而是在 wrapper 内复制 mapping。
  - `WIN-REPLAY-002`：fresh reread 已足够说明 WeCom replay payload 在 Windows one-click 路径中被截断。
- 当前只能标记为 `pending attribution` 的观察：
  - `WIN-ENV-002`：需要 Windows 主机上的提权 / 非标准 home / 历史 profile 场景 fresh evidence，才能判断 profile targeting 是否真的漂移。
  - `WIN-WIRE-001`：需要 Windows 主机上的多实例 / 多 profile / 端口碰撞 fresh evidence，才能判断 endpoint discovery / blanket kill 是否真的打到错误实例。
- repo 背景噪音 / historical only：
  - 当前 `git status --short` 显示的大量脏文件不是本 packet 可归因 truth，不直接算进 `B1` divergence。
  - 历史 `F-016`（去掉 `C:\Users` 假设）与更早的 DingTalk `ui-meta` 合并问题，只作为背景说明；`B1` 不重开这些旧包。
  - `platforms/windows/companion/*.ps1` 已 fresh reread，但当前只看到 `npx` / PATH / cwd 依赖，未拿到足够 Windows-specific fresh evidence 把它们单独升级成 `B2` replay divergence；先记为背景，不纳入当前 admissible set。

### 7.5 B2 admissible set

- 当前可直接进入 `B2` 的最小实现边界只有三项：
  - `WIN-ENV-001`
  - `WIN-REPLAY-001`
  - `WIN-REPLAY-002`
- `B2` 默认应先收口 wrapper 层：
  - `platforms/windows/wrappers/install-local-feishu.ps1`
  - `platforms/windows/wrappers/harden-local-feishu.ps1`
  - `platforms/windows/wrappers/one-click-deploy.ps1`
- `ui/server.mjs` 只在 wrapper 无法直接复用现有 authoritative read path 时，才允许做最小 server-side exposure；当前 `B1` 证据还不足以要求 server 必改。
- `ui/public/channel-helpers.js` 与 `ui/lib/channel-canonical.mjs` 当前只作为 read authority / attribution anchor：
  - `B1` 没有把 bug 明确归因到这两个 shared surface 本体；
  - 因此 `B2` 不得为了“预防性统一”而顺手修改它们；
  - 只有当 `B2` 或后续 Windows-specific fresh evidence 明确证明 divergence 落在这两个文件中，才允许触达。
- 以下项当前不进入 `B2`：
  - `WIN-ENV-002`
  - `WIN-WIRE-001`
  - companion runtime/PATH 归一化

### 7.6 Out-of-scope / defer-to-F-025-C

- 明确留给 `F-025-C`：
  - broader docs parity
  - tutorial / walkthrough / handoff / SOP wording
  - runbook 全量修订
- 明确不允许在 `F-025-B` 偷带：
  - 把 callback / 自建应用增强链路改写成默认 blocking gate
  - persisted schema migration
  - 动态表单引擎
  - 泛化 cleanup / refactor
- 需要特别守住的边界：
  - `WIN-REPLAY-002` 若进入 `B2`，其目标是“保留 Windows replay 对已存在 optional 字段的 fidelity”，不是“抬高 callback requiredness”。

### 7.7 Commander gate notes

- `B3` 未来必须拿到的 Windows-specific fresh evidence：
  - direct PowerShell wrapper 在 repo-root 与 packaged layout 下都能命中正确 shared script / runtime 的 dry-run 或 targeted command evidence；
  - Windows one-click replay 对已有 profile 的 fresh install replay evidence，至少覆盖：
    - DingTalk `corpId` / `robotCode`
    - WeCom `corpId` / `corpSecret` / `agentId` / `replyFormat`
    - 若 profile 里已有 callback 字段，则要证明 replay preserves them without turning them into default blockers
  - one-click 完成后，对 `/api/config` 或 `/api/config/channels` 的 fresh read-back evidence，证明 authoritative state 与 replay 结果一致。
- `B3` 不得判 PASS 的情况：
  - 只有历史截图、旧 longrun、旧日志，没有本轮 Windows fresh evidence；
  - 只验证了 `botId + secret`，没有验证 WeCom 已存在增强字段的 replay 保留；
  - 只验证 wrapper 启动成功，没有验证 authoritative read-back；
  - 试图用 docs wording、callback 说明或 cleanup 结果替代 Windows replay evidence。
- `pending attribution` gate：
  - `WIN-ENV-002` 与 `WIN-WIRE-001` 在没有 Windows-specific fresh evidence 前，不能被写成 PASS，也不能偷偷算进 `B2` 已完成。
- 当前结论：
  - `B1` 已形成可派工 inventory，但不是 `F-025-B` closeout；
  - 当前 packet 不全局 `BLOCKED`，只是保留了 `2` 个 `pending attribution` 候选，等待后续 Windows-specific evidence 决定是否升级。

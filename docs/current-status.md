# OpenSparrow Current Status

更新时间：`2026-04-22`

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
- **latest packaged mac artifact 已完成 clean-state + same-package retry hardening fresh evidence**
- **latest mac release candidate 已恢复到可重新 cut RC 的状态，但对外发放前仍建议做独立新机复核**
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
- `ui/server.mjs` / `ui/lib/model-routing-config.mjs` / `ui/public/dashboard-model-routing-state.mjs` 已接入 model routing
- root repo live router 已打通

注意：

- 这不等于 Windows 线已完成
- 也不等于 officialization 全部完成

### 3. macOS packaged diagnostics / runtime truth / first-click

已确认：

- packaged launch isolation 已修正
- packaged install wizard 不再依赖前端假进度，改为轮询真实 `/api/install/status`
- packaged runtime dependency closure 已补齐：`ui/lib/model-routing-config.mjs`、`ui/lib/openai-provider.mjs`、`scripts/model-routing/lib/custom-plugin-routing.mjs`
- packaged first-click 已能启动 server
- packaged build/export 已新增 runtime CPU 架构 fail-fast，不再允许把 x86_64 `node` 误打成 `arm64` 包
- latest mac packaged runtime `vendor/mac-openclaw/bin/node` 现为 universal binary，包含 `arm64` slice
- latest valid artifact lineage 已切到：`gtclaw-mac-release-arm64-20260422-193047`
- `/api/status`、`/api/install/status`、`/api/diagnostics`、`/api/diagnostics/export` 都已在 fresh artifact 中可达
- package-local `install-state.json`、`install.log`、`diagnostic-bundle.json` 已能真实生成
- artifact 内已固定 `vendor/mac-openclaw/RUNTIME_TRUTH.json`
- clean-state 下，bundled `channels` 与官方 `wecom-openclaw-plugin` 插件都能在 fresh 临时 profile 中成功安装
- build/export 与 handoff export 已新增 package-local `.gtclaw-state` / `.openclaw*` 清理逻辑，避免把 Sparrow 状态目录重新打进 release
- install retry / reinstall 现改用 `openclaw plugins install --force` 的原生替换语义，不再依赖手工删目录，也不再命中 `plugin already exists`
- 安装页超时后会继续轮询 `/api/install/status` 的 terminal state，而不是无限等待 `installed=true`
- 在同一 fresh artifact `gtclaw-mac-release-arm64-20260422-193047` 上，same-package 第 1 次与第 2 次 real `/api/install` 都得到 `completed`
- 上述第 2 次 same-package `/api/install` 未再复现 `plugin already exists` 或 `unknown channel id`

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
- F-031 root repo 最小前后端闭环已存在
- F-035 packaged isolation + install stall hotfix 已有 fresh evidence
- packaged runtime truth / first-click / diagnostics export 已有 fresh evidence
- latest packaged mac artifact 已完成 DingTalk / WeCom channel-specific closure
- packaged WeCom 当前 authoritative route 是官方插件，不再是旧 `sunnoy-wecom` packaged blocker 口径
- Windows 线必须单独拿自己的 truth inventory、test matrix、implementation 与 fresh evidence

### 未确认

- GitHub tree 之外是否还有未整理的旧 release / Notion 口径
- Windows-specific surfaces 的真实验证闭环何时完成

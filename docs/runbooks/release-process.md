# OpenSparrow Mac UI-first Packaged Release Process

## 适用范围

本 runbook 随交付包分发，只覆盖今晚的 **Mac UI-first packaged 首发 cut**。

冻结口径：

- 只发 Mac
- 唯一官方 first-click path 是根目录 `01-开始部署.command`
- `mac/run-openclaw-usb.command` 与 `mac/harden-openclaw-usb.command` 仅是 advanced compatibility / handoff
- packaged outward promise 当前已覆盖企业微信，且 authoritative packaged route 是 bundled official plugin archive
- companion 不纳入今晚正式支持面

## 关键事故防线

`2026-04-22` 已发生过一次严重打包事故：

- 旧错误 Desktop bundle：`opensparrow-mac-full-package-20260422-170758-skills100`
- 旧错误 release：`gtclaw-mac-release-arm64-20260422-170758`
- artifact 名称标记为 `arm64`
- 但 bundled `vendor/mac-openclaw/bin/node` 实际只有 `x86_64` slice
- 新 Apple Silicon Mac 无 Rosetta 时直接报 `Bad CPU type in executable`

从这一轮起，以下检查是 **release blocker**，任何一项失败都不得外发：

- `file ./vendor/mac-openclaw/bin/node` 必须显示 `arm64` 或包含 `arm64` slice
- `vendor/mac-openclaw/RUNTIME_TRUTH.json` 必须存在，并记录 `nodeBinaryArchitectures`
- build/export 过程若发现 runtime CPU 架构不匹配，必须直接 fail-fast，而不是继续切包
- 已知旧错误包只能保留作事故证据，不得继续发给任何新机器

`2026-04-22` 同日又确认了一轮独立 release blocker：

- package-local Sparrow / OpenClaw 状态残留会让 retry / reinstall 命中 `plugin already exists`
- 安装页在 `/api/install` 超时后会误把“后端已失败”显示成“正在部署中…”

从这一轮起，以下规则也已经升级为硬门槛：

- 任何对外交付包都不得包含 `.gtclaw-state`、`.openclaw`、`.openclaw-*`
- 前端安装页必须以 `/api/install/status` 的 terminal state 为最终 authority，不能无限等待 `installed=true`

## 1. 打开 candidate

进入当前交付包根目录，并确认至少存在：

```text
./01-开始部署.command
./README.txt
./README.md
./docs/INSTALL.md
./docs/SOP.md
./runbooks/F-005-ui-install-reset.md
./ui/public/dashboard.html
./mac/run-openclaw-usb.command
./mac/harden-openclaw-usb.command
```

## 2. 核对 packaged official support surface

至少确认：

- 根目录存在 `01-开始部署.command`
- `mac/run-openclaw-usb.command` 与 `mac/harden-openclaw-usb.command` 仍在，但只承担 handoff 角色
- `ui/public/dashboard.html` 不再把服务端口写死为 `18889`
- 交付包内没有任何 package-local Sparrow/OpenClaw 状态目录
- packaged docs 只承诺 Mac UI-first 支持面
- packaged docs 不再把 `mac/run-openclaw-usb.command` 当作主安装路径
- packaged docs 已与最新 DingTalk / WeCom PASS truth 对齐

新增必查项：

- `file ./vendor/mac-openclaw/bin/node`
- `cat ./vendor/mac-openclaw/RUNTIME_TRUTH.json`
- `find . -type d \( -name '.gtclaw-state' -o -name '.openclaw' -o -name '.openclaw-*' \)`

可直接使用的只读检查：

```bash
test -f ./01-开始部署.command
bash -n ./01-开始部署.command
bash -n ./mac/run-openclaw-usb.command
bash -n ./mac/harden-openclaw-usb.command
file ./vendor/mac-openclaw/bin/node
cat ./vendor/mac-openclaw/RUNTIME_TRUTH.json
find . -type d \( -name '.gtclaw-state' -o -name '.openclaw' -o -name '.openclaw-*' \)
rg -n "18889" ./ui/public/dashboard.html
rg -n "Windows|windows|WeCom|企业微信|run-openclaw-usb.command" \
  ./README.txt \
  ./README.md \
  ./docs/INSTALL.md \
  ./docs/SOP.md \
  ./runbooks/F-005-ui-install-reset.md
```

## 3. 官方使用方式

统一口径：

1. 从交付包根目录双击 `01-开始部署.command`
2. 在浏览器安装向导中只按今晚正式支持面完成配置
3. 安装完成后在 Dashboard 中继续操作
4. 若误点 `mac/run-openclaw-usb.command` 或 `mac/harden-openclaw-usb.command`，应只看到 handoff 回根目录入口
5. shipping 前必须单独确认 bundled runtime CPU 架构 truth，不得只看 artifact 名称中的 `arm64`

## 4. 何时视为 blocker

以下任一命中，都应阻止继续外发：

- 根目录缺少 `01-开始部署.command`
- bundled `vendor/mac-openclaw/bin/node` 缺少 `arm64` slice
- `RUNTIME_TRUTH.json` 缺少 `nodeBinaryArchitectures`
- 交付包内出现 `.gtclaw-state`、`.openclaw`、`.openclaw-*`
- Dashboard 仍把 gateway port 写死为 `18889`
- 安装页在 install timeout 后仍可能无限显示“正在部署中…”
- 文档仍把 Windows 写成今晚正式支持面
- 文档仍把 `mac/run-openclaw-usb.command` 写成主安装入口
- secondary wrapper 仍像主安装 / 主 hardening 入口

## 5. 边界提醒

- 这份 runbook 不把 Windows 纳入今晚正式支持面
- 这份 runbook 当前已把企业微信写入 latest packaged ready 支持面，但该结论只适用于 mac packaged 线，不自动外推到 Windows
- 这份 runbook 不把 companion 纳入今晚正式支持面
- bundled runtime / plugin mismatch 不能被反写成真正 `F-014` 失败
- 若用户报告“正在部署中…”超过预期，应优先检查 `GTClaw-*/.gtclaw-state/.openclaw-gtclaw-portable/{install-state.json,install.log,diagnostic-bundle.json}`，不要盲猜是网速问题
额外纪律：

- 一旦你在某个展开后的 artifact 目录里执行过 `01-开始部署.command`，该目录就会生成 package-local `.gtclaw-state`；
- **不要把一个已经启动过的展开目录直接继续发给别人**；
- 对外交付应优先使用未运行过的 zip，或重新从 zip 解压得到的干净目录。

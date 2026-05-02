# OpenSparrow Mac UI-first 安装指南

当前版本：`0.1.0-alpha`

这份指南只覆盖今晚的 **Mac UI-first 首发 cut**。

## 严重事故提示

`2026-04-22` 已发生过一轮严重 packaged 事故：

- 旧错误 Desktop bundle：`opensparrow-mac-full-package-20260422-170758-skills100`
- 旧错误 release：`gtclaw-mac-release-arm64-20260422-170758`

它们的包名虽然写着 `arm64`，但 bundled `vendor/mac-openclaw/bin/node` 实际只有 `x86_64` slice。

在新的 Apple Silicon Mac（未安装 Rosetta）上，这会直接报：

- `Bad CPU type in executable`
- `01-开始部署.command` first-click 立即退出

从这一轮起，任何人都不得再把 artifact 名称当成 CPU 架构 truth。
真正的检查方式只有两个：

- `file ./vendor/mac-openclaw/bin/node`
- `cat ./vendor/mac-openclaw/RUNTIME_TRUTH.json`

如果你拿到的是上面那份旧错误包，直接停止使用，改用最新有效包。

## 今晚正式支持面

- 平台：`macOS 12+`
- 唯一官方 packaged first-click path：交付包根目录 `01-开始部署.command`
- 交付包 `mac/01-开始部署.command` 只作为 compatibility / handoff path，必须转交根目录 launcher
- source checkout 中的 `platforms/mac/wrappers/*.command` 是 source template / developer debug surface，不是用户 packaged install 入口
- 今晚正式支持渠道：`飞书`、`钉钉`、`企业微信`
- `mac/run-openclaw-usb.command` 与 `mac/harden-openclaw-usb.command` 仅作为高级兼容 / handoff 入口
- 企业微信 packaged 路线使用随包官方插件归档
- companion 不纳入今晚正式支持面

## 开始前准备

请先准备你实际要接入的渠道凭据：

- 飞书：`App ID` + `App Secret`
- 钉钉：`Client ID / AppKey` + `Client Secret / AppSecret`
- 企业微信：`Bot ID / 企业 ID` + `Secret`

同时确认：

- 设备可以联网
- 启动终端会打印实际 UI 地址；验证 packaged install 时必须使用 launcher 打印的端口，不得默认信任 `http://localhost:19000`
- 你将从交付包根目录启动，而不是从 `mac/run-openclaw-usb.command` 直接开始安装
- bundled `vendor/mac-openclaw/bin/node` 的 `file` 结果包含 `arm64`，或显示为包含 `arm64` slice 的 universal binary
- 交付包内不存在 `.gtclaw-state`、`.openclaw`、`.openclaw-*` 等 package-local 状态目录

## 安装步骤

1. 打开交付包根目录。
2. 双击 `01-开始部署.command`。
3. 若 macOS 弹出安全提示，到“系统设置 → 隐私与安全性”中选择“仍要打开”。
4. 稍等片刻，浏览器会自动打开安装向导：
   - 以命令窗口打印的 `UI: <port>` 或浏览器自动打开的地址为准
   - 不要默认信任 `localhost:19000`；若 `19000` 已被旧 source UI 占用，packaged launcher 会切到下一个可用端口
5. 在安装向导中选择 **飞书**、**钉钉** 或 **企业微信**。
6. 按页面提示填写对应凭据。
7. 点击“安装”并等待流程完成。
8. 安装成功后，页面会自动跳转到 Dashboard。

如果需要从终端启动，请先进入交付包根目录，再运行 package-relative launcher：

```bash
./01-开始部署.command
```

## 安装完成后应看到什么

至少确认以下几点：

- Dashboard 可以正常打开
- 服务状态显示为运行中
- 你选择的渠道显示已启用
- “基本信息”卡片中的端口与实际启动端口一致，而不是默认写死某个值

## 高级兼容入口说明

交付包中仍会保留：

- `mac/01-开始部署.command`
- `mac/run-openclaw-usb.command`
- `mac/harden-openclaw-usb.command`

它们今晚只承担 **advanced compatibility / handoff** 角色：

- 不再是主安装路径
- 不再是独立 hardening 主路径
- 运行后应回到根目录 `01-开始部署.command` 所代表的 canonical UI / Dashboard 控制面

## 常见问题

### 1. 浏览器没有自动打开

- 先看启动终端输出中的实际地址
- 手动在浏览器访问该地址
- 若 `19000` 被占用，UI 可能已切到 `19001`、`19002` 等后续端口
- 若本机已有旧 `localhost:19000` 页面，不要把它当成当前 packaged 实例；应以当前 launcher 打印的端口和 `/api/status.instance.packRoot` 为准

### 1.1 启动后立刻退出并出现 `Bad CPU type in executable`

这不是正常现象，说明你拿到的 packaged runtime CPU 架构是错的。

立即执行：

```bash
file ./vendor/mac-openclaw/bin/node
cat ./vendor/mac-openclaw/RUNTIME_TRUTH.json
```

若 `file` 结果里没有 `arm64`，或者 `RUNTIME_TRUTH.json` 没记录 `nodeBinaryArchitectures`，直接停止使用该包并回收；不要再继续尝试安装。

### 2. 想重新安装

- 进入 Dashboard
- 使用“重置配置 / 全量重置”
- 页面会回到安装向导

### 2.1 安装页长时间停在“正在部署中…”

如果页面超过预期时间仍停在“正在部署中…”，不要继续盲等，先检查 package-local 日志：

```bash
find . -type d -name ".gtclaw-state"
find ./.gtclaw-state -maxdepth 3 \( -name "install-state.json" -o -name "install.log" -o -name "diagnostic-bundle.json" \)
```

默认日志位置是：

- `GTClaw-*/.gtclaw-state/.openclaw-gtclaw-portable/install-state.json`
- `GTClaw-*/.gtclaw-state/.openclaw-gtclaw-portable/install.log`
- `GTClaw-*/.gtclaw-state/.openclaw-gtclaw-portable/diagnostic-bundle.json`

如果 `install-state.json.status = error`，说明后端已经失败结束，不是“还在继续安装”。
这时应直接按 packaged install regression 处理。

### 3. 误点了 `mac/run-openclaw-usb.command`

这是高级兼容入口，不是今晚正式主路径。
当前脚本会把你转回根目录 `01-开始部署.command`。

### 4. 企业微信如何走 packaged 安装

当前 packaged 线路会优先使用随包官方插件归档完成企业微信安装。
若安装失败，应以 UI / diagnostics 给出的真实错误为准，而不是回退到旧的手动 CLI 假路径。

### 5. 提示缺少 bundled plugin archive

在 packaged runtime hardening 模式下，缺 archive 通常表示当前浏览器连到的 `packRoot` 不是交付包根目录，或当前交付包不完整。
source/worktree 根目录没有 `plugins/` 是预期边界，不等于 fresh `dist` 交付包缺插件。
先确认 `/api/status.instance.packRoot` 等于交付包根目录，再确认包内存在：

- `plugins/openclaw-china-channels-2026.4.24.tgz`
- `plugins/wecom-wecom-openclaw-plugin-2026.4.22.tgz`

## 问题反馈建议

如需反馈问题，请一并提供：

- 当前 macOS 版本
- 当前打开的本地地址
- 页面报错截图
- 启动终端最近输出
- `install-state.json`、`install.log`、`diagnostic-bundle.json`

# OpenSparrow Mac UI-first 首发 SOP

## 元数据

- 日期：`2026-04-22`
- Feature：`F-027`
- 适用对象：今晚 Mac packaged release 的操作者 / 支持人员

## 今晚边界

- 这是 **Mac-only UI-first 首发 cut**
- 唯一官方 packaged first-click path：交付包根目录 `01-开始部署.command`
- 交付包 `mac/01-开始部署.command` 只作为 compatibility / handoff path，必须转交根目录 launcher
- source checkout 中的 `platforms/mac/wrappers/*.command` 是 source template / developer debug surface，不是用户 packaged install 入口
- 今晚正式支持渠道：`飞书`、`钉钉`、`企业微信`
- `mac/run-openclaw-usb.command` 与 `mac/harden-openclaw-usb.command` 只保留为 **advanced compatibility / handoff**
- 企业微信 packaged 路线使用随包官方插件归档
- companion 不纳入今晚正式支持面
- 不把 bundled runtime / plugin mismatch 反写成真正 `F-014` 失败

## 严重事故防线

`2026-04-22` 已确认发生过一轮严重 packaged 事故：

- 旧错误 Desktop bundle：`opensparrow-mac-full-package-20260422-170758-skills100`
- 旧错误 release：`gtclaw-mac-release-arm64-20260422-170758`
- 根因：artifact 名称虽然是 `arm64`，但 bundled `vendor/mac-openclaw/bin/node` 实际只有 `x86_64`
- 新 Apple Silicon Mac 无 Rosetta 时会直接报：`Bad CPU type in executable`

这轮事故后，以下规则已经升级为 SOP 级硬门槛：

- 不得只看 artifact 名称中的 `arm64`
- 必须执行 `file ./vendor/mac-openclaw/bin/node`
- 必须执行 `cat ./vendor/mac-openclaw/RUNTIME_TRUTH.json`
- 只要 bundled runtime CPU 架构与宣称平台不一致，立即阻断外发
- 旧错误包仅保留作事故证据，不得再次发给任何新机器

同日还确认了一轮安装态严重回归：

- package-local `.gtclaw-state/.openclaw*` 残留会让 retry / reinstall 命中 `plugin already exists`
- `/api/install` 超时后，页面若仍无限显示“正在部署中…”，说明 UI 没有正确回读 terminal install state

从这一轮起，以下也属于 SOP 级 blocker：

- 对外交付包中出现 `.gtclaw-state`、`.openclaw`、`.openclaw-*`
- 用户侧 install failure 已结束，但页面仍继续显示“正在部署中…”

## 交付包应包含什么

至少应看到：

```text
opensparrow-<version>-mac-ui-<arch>/
├── 01-开始部署.command
├── README.md
├── README.txt
├── docs/
│   ├── INSTALL.md
│   └── SOP.md
├── mac/
│   ├── 01-开始部署.command
│   ├── run-openclaw-usb.command
│   └── harden-openclaw-usb.command
├── plugins/
├── runbooks/
└── ui/
```

重点口径：

- 根目录 `01-开始部署.command` 是唯一官方 packaged 起点
- `mac/01-开始部署.command` 是 compatibility / handoff 入口，不得直接运行 `ui/server.mjs`
- `mac/run-openclaw-usb.command` 与 `mac/harden-openclaw-usb.command` 不是主安装路径
- 文档不得继续把 Windows 当作今晚支持面
- 文档不得把企业微信重新写回旧 `sunnoy-wecom` 阻断口径

## 标准操作

1. 进入交付包根目录。
2. 双击 `01-开始部署.command`。
3. 等待浏览器打开安装向导，并记录 launcher 打印的实际 `UI` 端口。
4. 只按今晚正式支持面选择：
   - 飞书
   - 钉钉
   - 企业微信
5. 完成安装后进入 Dashboard。
6. 如需重置或再次安装，在 Dashboard 中完成，不回退到 legacy CLI 流程。

终端等价启动方式仅使用 package-relative 路径：

```bash
./01-开始部署.command
```

## 高级兼容入口的处理方式

如果用户误点：

- `mac/run-openclaw-usb.command`
- `mac/harden-openclaw-usb.command`

当前期望行为是：

- 明确提示这只是高级兼容 / handoff 入口
- 提示今晚正式支持面仍是根目录 `01-开始部署.command`
- 自动转交到 canonical UI / Dashboard 链路

## 快速核对项

在今晚 release gate 中，至少确认：

- 根目录 `01-开始部署.command` 存在
- `file ./vendor/mac-openclaw/bin/node` 明确包含 `arm64` slice
- `RUNTIME_TRUTH.json` 明确带 `nodeBinaryArchitectures`
- 交付包内没有 package-local `.gtclaw-state`、`.openclaw`、`.openclaw-*`
- root launcher 与 `mac/01-开始部署.command` 都能通过 shell syntax check；`mac/01` 只能 handoff 到 root launcher
- 验证 packaged install 时使用 launcher 打印的 UI port；不得默认信任 `localhost:19000`
- `/api/status.instance.packRoot` 精确等于当前交付包根目录
- `OPENSPARROW_REQUIRE_BUNDLED_PLUGINS=1` 时，`/api/status.bundledPlugins` 显示 `required=true`、`ready=true`、`missing=[]`
- 包内存在 `plugins/openclaw-china-channels-2026.4.24.tgz` 与 `plugins/wecom-wecom-openclaw-plugin-2026.4.22.tgz`
- Dashboard “基本信息”卡片中的端口来自 authoritative read-back，而不是前端写死 `18889`
- `README.txt`、`docs/INSTALL.md`、`docs/SOP.md` 不再把 Windows 写成今晚正式支持面
- `docs/SOP.md` 不再把 `mac/run-openclaw-usb.command` 写成主安装入口
- packaged outward promise 已与最新 WeCom packaged PASS 事实一致

## 故障排查

### 浏览器地址不是 `19000`

这是允许的。若默认端口占用，系统会自动切到下一个可用端口。
以启动输出和 Dashboard 展示的实际端口为准。
如果本机已有旧 source UI 监听 `19000`，当前 packaged 验证必须使用 launcher 打印的新端口，并用 `/api/status.instance.packRoot` 排除错实例。

### 启动后立刻退出并出现 `Bad CPU type in executable`

这代表 packaged runtime CPU 架构 truth 已经失真。

处置方式：

1. 立即停止继续安装。
2. 执行：
   - `file ./vendor/mac-openclaw/bin/node`
   - `cat ./vendor/mac-openclaw/RUNTIME_TRUTH.json`
3. 若缺少 `arm64` slice，直接判定为 release blocker。
4. 回收该包，不允许继续外发或让用户自行安装 Rosetta 作为“正式解决方案”。

### 仍然看到高级兼容入口

这是允许的，但它们只能作为 handoff surface。
若脚本仍直接收凭据、直跑 legacy CLI、或绕开 UI / Dashboard，则应视为 blocker。

### 报缺少 bundled plugin archive

在 `OPENSPARROW_REQUIRE_BUNDLED_PLUGINS=1` 下，`/api/status.bundledPlugins` 是 readiness evidence。
缺 archive 错误表示当前 `packRoot` 不是交付包根，或当前交付包不完整；source/worktree 根没有 `plugins/` 是预期边界，不能反写成 fresh `dist` 包缺插件。
错误文案应指向 root `01-开始部署.command`、正确交付包根目录、或重新生成 / 获取完整包，不得引导 online install、ClawHub 或在线安装 fallback。

### 用户问到企业微信

统一口径：

- 真正 `F-014` 没有被改写
- 当前 packaged cut 已有企业微信 fresh evidence
- 企业微信 authoritative packaged route 是随包官方插件归档，不再是旧 `sunnoy-wecom` 路线

### 安装页长时间停在“正在部署中…”

先查 package-local 日志，而不是继续让用户盲等：

```bash
find . -type d -name ".gtclaw-state"
find ./.gtclaw-state -maxdepth 3 \( -name "install-state.json" -o -name "install.log" -o -name "diagnostic-bundle.json" \)
```

权威日志位置：

- `GTClaw-*/.gtclaw-state/.openclaw-gtclaw-portable/install-state.json`
- `GTClaw-*/.gtclaw-state/.openclaw-gtclaw-portable/install.log`
- `GTClaw-*/.gtclaw-state/.openclaw-gtclaw-portable/diagnostic-bundle.json`

若 `install-state.json.status = error`，说明后端已经结束失败，不能继续把页面当成“还在部署中”。

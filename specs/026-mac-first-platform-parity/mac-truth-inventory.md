# mac truth inventory / divergence inventory

## 1. A1 scope and non-goals

- 本文只服务 `PKT-026-A1 = mac truth inventory / divergence inventory`，只盘 `mac direct user-path` 当前 truth surface 与 divergence attribution。
- 本文只覆盖四类 surface：`primary launcher`、`secondary wrappers`、`companion control chain`、`UI service binding surface`。
- 本文不实现修复，不改 `spec.md / plan.md / tasks.md`，不写 `longrun/*`，不改 `ui/*`、`platforms/*`、`docs/runbooks/*`。
- 本文不重开 `F-003` 的 `/api/status` / reset / `?force=1` / `/setup` 契约，不重开真正的 `F-014 = wecom-channel-integration`，也不把 `specs/014-mac-arm64-installer-hardening/` 升格成当前 authority feature id。
- 本文不吸收 `F-025-B`；所有 Windows-specific fidelity 继续保持 `blocked on Windows-specific evidence`。
- 本文的 fresh evidence 仅包括：
  - Darwin/arm64 主机属性；
  - 指定 surface 的 fresh reread；
  - `bash -n` 对 mac wrapper / companion 脚本的语法检查；
  - `node --check ui/server.mjs`；
  - 当前 bundled mac runtime 版本文件的只读探针。
- 本文没有执行任何 mac launcher / companion / UI 的真实启动链路，因此所有“可运行 / 可达 / 可见”结论都只到 attribution gate，不等于 A3 fresh verification。

## 2. mac truth surfaces

### 2.1 Primary launcher

- 文件：`platforms/mac/wrappers/01-开始部署.command`
- 当前角色：这是当前 mac direct user-path 的 canonical UI-first launcher。它解析 pack root、选择 bundled Node、注入 profile / gateway / runtime env，然后直接 `exec` `ui/server.mjs`。
- 关键衔接点：
  - `OPENCLAW_PROFILE`
  - `OPENCLAW_GATEWAY_PORT`
  - `USB_RUNTIME_ROOT`
  - `OPENSPARROW_AUTO_OPEN`
- surface 类型：`launcher/shell/env` + `cwd/runtime-path` bridge。
- 与冻结边界的关系：
  - 消费 `F-003` 的 UI-first 入口冻结事实，但不改 `/api/status` 状态机；
  - 不改真正 `F-014` 的 WeCom bot-first / callback boundary；
  - 若 bundled runtime 本身过旧，则那是 `specs/014-mac-arm64-installer-hardening/` 提供的历史 package/runtime 层 blocker，而不是当前 packet 里重开的 contract；
  - 与 `F-025-B` 无关。

### 2.2 Secondary wrappers

- 文件：
  - `platforms/mac/wrappers/run-openclaw-usb.command`
  - `platforms/mac/wrappers/harden-openclaw-usb.command`
- 当前角色：这两者不是 canonical launcher，而是历史 CLI / hardening bridge。它们绕过 UI 安装向导与 Dashboard，直接把用户带入 shell installer / harden 脚本。
- 关键衔接点：
  - 通过 repo-root 或 packaged-root 去找 `scripts/openclaw-usb/*.sh`
  - 注入 `USB_RUNTIME_ROOT`
  - `run-openclaw-usb.command` 直接收集 Feishu/OpenAI 凭据
- surface 类型：`launcher/shell/env`，且带 `cwd/runtime-path` 选择。
- 与冻结边界的关系：
  - `F-003` 只冻结 top-level UI-first；secondary wrapper 的存在本身不是要重开 `F-003`，但其角色若继续被误当 direct user-path，就会形成 role drift；
  - 它们当前仍是 Feishu-specific 历史链路，不属于真正 `F-014` 主链；
  - 若要把它们重新塑形成 pack entrypoint 或重新打包导出，则会滑向 `specs/014-mac-arm64-installer-hardening/` 的 package/export 层；
  - 与 `F-025-B` 无关。

### 2.3 Companion control chain

- 文件：
  - `platforms/mac/companion/start`
  - `platforms/mac/companion/stop`
  - `platforms/mac/companion/gateway`
  - `platforms/mac/companion/onboard`
- 当前角色：这些更像 historical companion source template，而不是当前 repo 内 direct UI-first launcher。它们各自 `cd "$SCRIPT_DIR"/bin`，再调用 `npx openclaw onboard|gateway --force|gateway stop`。
- 关键衔接点：
  - `bin` 相对目录
  - 系统 PATH 上的 `node` / `npx`
  - `openclaw onboard` 与 `openclaw gateway*` CLI 子命令
- surface 类型：`companion-control` + `cwd/runtime-path`。
- 与冻结边界的关系：
  - 若把 companion `onboard` / `gateway` 当成当前主入口，会与 `F-003` 的 UI-first 冻结事实冲突；
  - 它们不应反写真正 `F-014` 的 WeCom acceptance；
  - 若要通过 archive / bundled runtime / source-template repack 才能让它们重新对齐，那是 `specs/014-mac-arm64-installer-hardening/` 或 `F-026` 外 packaging 事项；
  - 与 `F-025-B` 无关。

### 2.4 UI service binding surface

- 文件：
  - `ui/server.mjs`
  - `ui/public/index.html`
  - `ui/public/dashboard.html`
- 当前角色：这是 canonical direct user-path 的 authoritative service surface。它负责：
  - UI 静态页绑定；
  - `/api/status`、`/api/install`、`/api/config`、`/api/config/channels`；
  - 安装向导 prefill / install；
  - Dashboard 的 load / save / toggle / reset / cleanup；
  - macOS 上的浏览器 auto-open。
- 关键衔接点：
  - `ui/server.mjs` 从 env 与 bundled runtime 解析 runtime root、profile 与 port；
  - `index.html` 用 `/api/status` + `/api/config` 决定 install surface 行为；
  - `dashboard.html` 用 `/api/status` + `/api/config` 做 read-after-write 与 reset 跳转。
- surface 类型：`ui-service-binding` + `install/dashboard/read-back`。
- 与冻结边界的关系：
  - 必须严格消费 `F-003` 的 `/api/status` 与 `/setup` / `?force=1`；
  - 必须严格消费真正 `F-014` 的 bot-first / callback non-default gate，而不是重写 channel contract；
  - 若被 WeCom plugin minimum runtime version 挡住，那是 bundled runtime blocker，不是 `F-014` contract 重开；
  - 不吸收 `F-025-B`。

## 3. Divergence inventory table

| ID | Divergence | Files / surface | Class | Relative to frozen baseline | Evidence type | Packet attribution | A2 admissible | Commander / out-of-scope note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `MAC-DIV-001` | primary launcher 与 `ui/server.mjs` 的 runtime-root precedence 不一致：launcher 先选 `vendor/mac-openclaw`，server fallback 先选 `runtime`。 | `platforms/mac/wrappers/01-开始部署.command`; `ui/server.mjs` | `cwd/runtime-path` | 不重开 `F-003`；这是同一 mac UI-first 链里的 runtime authority 分叉。 | `fresh reread` | `current packet attributable` | `yes` | 只允许收口“谁是 authoritative runtime root”；若需要重做 archive/runtime layout，则切出当前 feature。 |
| `MAC-DIV-002` | secondary `run-openclaw-usb.command` 仍是 Feishu/OpenAI CLI 凭据桥，直接调用 `install-local-feishu.sh`，绕过 install/dashboard/read-back。 | `platforms/mac/wrappers/run-openclaw-usb.command` | `launcher/shell/env` | 不应重开 `F-003`；问题是 secondary wrapper role drift，而不是 status/reset contract 漂移。 | `fresh reread` | `current packet attributable` | `yes` | A2 只能处理 wrapper role/handoff；若扩成 broader docs parity 或整体交付重构，则越界。 |
| `MAC-DIV-003` | secondary `harden-openclaw-usb.command` 仍是 Feishu-only hardening bridge，未进入当前 canonical UI/dashboard control surface。 | `platforms/mac/wrappers/harden-openclaw-usb.command` | `launcher/shell/env` | 不重开 `F-003`；这是 legacy hardening surface 与当前 mac direct user-path 的角色分离问题。 | `fresh reread` | `current packet attributable` | `yes` | A2 只能决定其是否继续被 direct path 暴露或如何受控 handoff，不做 broader docs parity。 |
| `MAC-DIV-004` | companion `start` / `onboard` 仍通过 `cd .../bin` + `npx openclaw onboard` 走交互式 CLI，而不是 bundled-runtime-aware UI-first chain。 | `platforms/mac/companion/start`; `platforms/mac/companion/onboard` | `companion-control` | 若被当 direct first-launch path，会与 `F-003` UI-first 冻结事实冲突；但当前是否仍是 shipped user-facing surface，缺少 fresh packaged evidence。 | `fresh reread` | `pending attribution` | `conditional` | 若 A2 继续处理，只能在 commander 确认它们仍属当前 mac shipped surface 后做最小收口；否则保留为 template/background。 |
| `MAC-DIV-005` | companion `gateway` / `stop` 仍绑定旧式 CLI gateway semantics：`npx openclaw gateway --force|stop`、`bin` cwd、日志宣称 3000/3001/9090/8080 等历史端口，而 UI/server 当前固定写 `18889` loopback gateway。 | `platforms/mac/companion/gateway`; `platforms/mac/companion/stop`; contrast `ui/server.mjs` | `companion-control` | 不改 `F-003`；这是 companion control semantics 与 current UI service binding 的分叉。 | `fresh reread` | `pending attribution` | `conditional` | 若没有 packaged mac companion fresh evidence，A2 不应直接宣称 close；A3 才能决定其是否仍属 direct user-path。 |
| `MAC-DIV-006` | Dashboard 服务信息把 gateway port 硬编码成 `18889`，未从 authoritative read-back / env surface 取值。 | `ui/public/dashboard.html`; `ui/server.mjs`; `platforms/mac/wrappers/01-开始部署.command` | `ui-service-binding` | 不重开 `F-003` / `F-014`；这是 direct browser surface 与 authoritative runtime env 的 read-back 不一致。 | `fresh reread` | `current packet attributable` | `yes` | 这是典型 A2 最小实现项：read-after-read / authoritative display 对齐。 |
| `MAC-DIV-007` | 当前 bundled mac runtime 版本为 `2026.3.12`，低于 server 中 WeCom 最低要求 `2026.3.23`；若走企业微信安装，当前 direct user-path 会被 bundled runtime gate 挡住。 | `vendor/mac-openclaw/bin/node_modules/openclaw/package.json`; `ui/server.mjs` | `install/dashboard/read-back` | 这不是重开真正 `F-014`；它是 package / bundled runtime blocker。 | `macOS-specific fresh attribution note` | `blocked` | `no` | 必须留在 `F-026` 外的 packaging/runtime 事项；若 A3 复现 plugin API mismatch 或 version gate，直接回 Commander 切包。 |

## 4. Attribution notes

### 4.1 当前 packet 可归因的观察

- Darwin/arm64 主机 fresh context 已确认。
- 指定 mac wrapper / companion 文件已 fresh reread。
- `bash -n` 已通过：
  - `platforms/mac/wrappers/01-开始部署.command`
  - `platforms/mac/wrappers/run-openclaw-usb.command`
  - `platforms/mac/wrappers/harden-openclaw-usb.command`
  - `platforms/mac/companion/*`（排除 `*.md`）
- `node --check ui/server.mjs` 已通过。
- 因此本文里的 divergence 归因是“语义 / role / runtime-path / binding divergence”，不是“脚本语法损坏”。

### 4.2 noisy workspace 背景噪音

- 当前仓库存在大量与本 packet 无关的 dirty / untracked 项，覆盖 `longrun/*`、Windows surface、docs、其他 specs、`ui/*` 等。
- 这些全仓脏状态不自动归因为 `PKT-026-A1`。
- 本 packet 只把指定 read-set 中的 mac surface fresh reread 结果写入 inventory。

### 4.3 pending attribution

- `platforms/mac/companion/*` 是否仍在当前 shipped mac direct user-path 中可见、可点、可执行，缺少 fresh packaged mac artifact evidence。
- 因此 `MAC-DIV-004` / `MAC-DIV-005` 被标为 `pending attribution`：它们在 source-template 级别已明显 stale，但是否应进入 A2 直接修，需要 Commander 先确认其仍属当前发货路径。

## 5. A2 admissible set

### 5.1 可直接进入 A2 的最小集合

- `MAC-DIV-001`
  - 目标只允许对齐 launcher 与 server 的 runtime-root authority；
  - 不扩大成 archive / runtime rebuild。
- `MAC-DIV-002`
  - 目标只允许处理 `run-openclaw-usb.command` 的角色与 handoff；
  - 不重开 `F-003` 的 UI-first 定义。
- `MAC-DIV-003`
  - 目标只允许处理 `harden-openclaw-usb.command` 的 direct-path 暴露边界；
  - 不扩成 broader docs parity。
- `MAC-DIV-006`
  - 目标只允许把 dashboard 里的 port/read-back 改成 authoritative surface；
  - 不改 channel contract，不改 reset/status state machine。

### 5.2 不能直接进入 A2 的内容

- `MAC-DIV-004` / `MAC-DIV-005`
  - 在 Commander 确认 companion 仍属当前 mac shipped direct path 之前，只能保留 `conditional`；
  - 否则会把 source-template/background 误当 current user-path。
- `MAC-DIV-007`
  - 这是 bundled runtime / packaging blocker；
  - 继续处理会落到 `specs/014-mac-arm64-installer-hardening/` 的历史 package/runtime 层或新 packaging packet；
  - 明确不属于 A2。

### 5.3 明确不得在 A2 重开的边界

- 不重开 `F-003`：
  - `/api/status` installed-state 定义；
  - reset / cleanup / `?force=1` / `/setup` 行为；
  - UI-first canonical 定义本身。
- 不重开真正的 `F-014`：
  - WeCom bot-first 主链；
  - callback 非默认 gate；
  - 真实凭据 evidence boundary。
- 不把 `specs/014-mac-arm64-installer-hardening/` 写成真正 `F-014`。
- 不吸收 `F-025-B` 的 Windows fidelity。

## 6. Out-of-scope / future blockers

- bundled runtime / archive / export / packaging rebuild
  - 当前最直接的是 `MAC-DIV-007`：bundled mac runtime 版本落后于 WeCom minimum gate。
- broader docs parity
  - 包括仓内仍把 legacy wrapper 当 direct install path 的所有文档收口。
- callback / 自建应用增强专项
  - 继续保持真正 `F-014` 外的扩展链路，不并入 `F-026`。
- persisted schema migration / dynamic form engine / cleanup-refactor / containerization
  - 不属于本 feature。
- Windows-specific evidence
  - 继续留在 `F-025-B`。

## 7. Commander gate notes

### 7.1 A3 必须拿到的 macOS-specific fresh evidence

- 双击或等效执行 `platforms/mac/wrappers/01-开始部署.command` 后：
  - UI 服务实际启动；
  - 浏览器实际落点；
  - 实际 runtime root；
  - 实际 UI port。
- 若 `OPENCLAW_GATEWAY_PORT` 被显式覆盖：
  - Dashboard 是否回显 authoritative port，而不是固定 `18889`。
- 若 current shipped mac artifact 仍暴露 secondary wrapper：
  - `run-openclaw-usb.command` 是否仍被当 direct user entry；
  - `harden-openclaw-usb.command` 是否仍被当 direct post-install control surface。
- 若 current shipped mac artifact 仍暴露 companion：
  - `start` / `onboard` / `gateway` / `stop` 是否真的处于用户可见路径；
  - 它们是否解析 bundled runtime，而不是 PATH + `bin` 假定。
- 若要碰 WeCom：
  - 必须先验证 bundled runtime version / plugin API 是否跨过 `2026.3.23` minimum gate；
  - 否则 A3 只能判 `blocked on packaging/runtime`, 不得判 PASS。

### 7.2 A3 不得越过的 gate

- 没有 macOS-specific fresh execution evidence，不得宣称 companion parity close。
- 没有 macOS-specific fresh execution evidence，不得宣称 launcher/runtime-path parity close。
- 命中 WeCom runtime version / plugin API blocker 时，不得把失败回写成真正 `F-014` 主链失败。
- 命中需要 archive / bundle rebuild 的问题时，不得硬塞进 `F-026-A2/A3`。

### 7.3 给 Commander 的派工输入

- `A2` 应只收：
  - `MAC-DIV-001`
  - `MAC-DIV-002`
  - `MAC-DIV-003`
  - `MAC-DIV-006`
- `A2` 只有在 Commander 明确确认 companion 仍属 current shipped path 时，才可追加 `MAC-DIV-004` / `MAC-DIV-005`。
- `A3` 必须把所有 companion 相关 close 结论建立在 fresh packaged mac evidence 上。
- `MAC-DIV-007` 应直接保留为 `F-026` 外 packaging/runtime blocker，而不是继续在本 feature 内扩战。

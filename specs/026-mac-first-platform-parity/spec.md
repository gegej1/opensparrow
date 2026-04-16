# F-026 Mac-first Platform Parity

**Feature Branch**: `026-mac-first-platform-parity`  
**Created**: 2026-04-15  
**Status**: Draft (Scope Freeze Only)  
**Input**: Commander 已冻结 `F-025-B` 为 `blocked on Windows-specific evidence` 且禁止把 Mac 偷塞进 `F-025-B`；本轮单开新 feature，只做 mac-first scope freeze。

## F-026 一句话定义

`F-026 = 在不重开 F-003、F-014 = wecom-channel-integration、F-025，也不把 specs/014-mac-arm64-installer-hardening/ 误写成当前 authority feature id 的前提下，把当前 repo 中用户直接可达的 macOS wrapper / companion / UI service binding parity surface 冻结成可派工、可验证、非无限扩张的独立 feature。`

## Truth Source / Governance Authority

- authority 仍然是：用户最新指令 → `AGENTS.md` / `.specify/memory/constitution.md` → 本 feature 的 `spec.md / plan.md / tasks.md`。
- `longrun/*` 在本 feature 中只作为项目记忆与上下文，不作为 truth source。
- 本轮只冻结 `F-026` 自己的边界，不改写既有 feature 的 passing / blocked / closeout 事实。

## 与已冻结 feature 的关系

### 与 `F-003` 的关系

- `F-003` 已冻结的是 UI-first 启动、`/api/status` 安装态判定、reset / force-setup 路由与 canonical macOS launcher 的基础契约。
- `F-026` 只消费这些已冻结契约，不重写 `/api/status` 的状态机，不重开 factory reset / `?force=1` / `/setup` 行为定义。
- 若某个 mac 差异必须改写 `F-003` 已冻结契约，`F-026` 必须停止并回到 Commander gate，而不是在本 feature 内顺手重开旧战役。

### 与 `F-014 = wecom-channel-integration` 的关系

- 真正的 `F-014` 是已冻结的 `wecom-channel-integration`；`F-026` 不重开其企业微信 bot-first 主链、callback 非默认 gate、真实凭据 evidence 边界。
- `F-026` 若发现问题实际需要改写真正的 `F-014` 结论，必须停包并回到 Commander gate，不能借 mac-first 战役顺手改写企业微信 feature 身份。

### 与 `specs/014-mac-arm64-installer-hardening/` 的关系

- `specs/014-mac-arm64-installer-hardening/` 只是历史 spec 目录编号；在当前仓 authority 中，它不是 `F-014`，只提供既有 mac arm64 package / bundled plugin / skill copy / plugin-ready gating 的上游结论。
- `F-026` 不重开 arm64 ZIP replacement、本地 `.tgz` 插件优先、recursive skill copy、plugin-ready gating 等既有 package hardening 结论。
- 若 mac parity 问题实际落在“重新打包 / 重建 archive / 重整 bundled runtime”层，`F-026` 只记录为 blocker，不在本 feature 内扩成 packaging 重构。

### 与 `F-025-B` 的关系

- `F-025-B` 继续保持 `blocked on Windows-specific evidence`，不 close，不改状态，不写 longrun。
- `F-026` 是与 `F-025-B` 平行的新 mac-first feature，不把 Mac 作为 `F-025-B` 的子包，也不复用 `F-025-B` 的 truth surface。
- `F-026` 不提前并入 `F-025-C`，也不把 broader docs parity 写成当前 mac 战役的一部分。

## Scope

### In Scope

1. **macOS primary launcher surface**
   - `platforms/mac/wrappers/01-开始部署.command`
   - 目标是冻结 canonical UI-first 启动路径在 macOS 上的 parity 范围，而不是重写其产品定位。
2. **macOS secondary active wrapper surface**
   - `platforms/mac/wrappers/run-openclaw-usb.command`
   - `platforms/mac/wrappers/harden-openclaw-usb.command`
   - 只覆盖仍对当前用户路径有直接影响的 secondary launcher / hardening surface。
3. **macOS companion control surface**
   - `platforms/mac/companion/start`
   - `platforms/mac/companion/stop`
   - `platforms/mac/companion/gateway`
   - `platforms/mac/companion/onboard`
   - 只覆盖当前 repo 中活跃、可验证的 macOS control / launcher shell surface。
4. **macOS UI service binding surface**
   - `ui/server.mjs`
   - `ui/public/index.html`
   - `ui/public/dashboard.html`
   - 只覆盖与 macOS launcher / install / dashboard / read-back / daemon binding 直接相关的 UI service surface。
5. **macOS shell / `.command` / env / cwd / runtime path 差异**
   - 包括 runtime root 选择、working directory、browser auto-open、profile / gateway port / shell 行为差异。
6. **Commander 可派工的 packet 切分与 close gate**
   - 只冻结 packets、truth surface、DONE / BLOCKED / stop rule，不进入实现。

### Out of Scope

- broader docs parity。
- callback / 自建应用增强专项。
- persisted schema 全迁移。
- 动态表单引擎。
- 泛化 cleanup / refactor。
- architecture overhaul。
- 容器化大规划。
- Windows replay fidelity 或 `F-025-B` 所需的 Windows-specific evidence。
- 重开 `F-003`、`F-014 = wecom-channel-integration`、`F-025-A/B/C`，或把 `specs/014-mac-arm64-installer-hardening/` 升格成错误的当前 feature id。
- 全仓 mac 打包体系重整、重建 bundle / archive / export 体系；若它是当前用户路径 direct blocker，也只能作为 future exclusion / blocker 记录，不能在本 feature 内扩战。

## Truth Surface

### 1. macOS wrapper / launcher truth surface

- `platforms/mac/wrappers/01-开始部署.command`
- `platforms/mac/wrappers/run-openclaw-usb.command`
- `platforms/mac/wrappers/harden-openclaw-usb.command`
- 关注点：入口角色、runtime root 选择、环境变量注入、interactive 与 UI-first 的边界、cwd/path 解析。

### 2. macOS companion truth surface

- `platforms/mac/companion/start`
- `platforms/mac/companion/stop`
- `platforms/mac/companion/gateway`
- `platforms/mac/companion/onboard`
- 关注点：launcher / gateway / onboard / stop control chain、bin cwd、npx openclaw 调用方式、macOS shell/runtime assumptions。

### 3. macOS UI service binding truth surface

- `ui/server.mjs`
- `ui/public/index.html`
- `ui/public/dashboard.html`
- 关注点：`process.platform === 'darwin'` 的 runtime 绑定、launcher 到 UI service 的衔接、install / dashboard / read-back / daemon control 在 macOS 用户路径下的契约一致性。

### 4. macOS fresh evidence surface

- 只接受来自 macOS 主机的 fresh verification evidence。
- 历史 longrun、旧 handoff、旧截图只能作为背景，不构成 `F-026` 的 DONE 证据。

## 推荐最小 packet 切分

1. **`PKT-026-A1 = mac truth inventory / divergence inventory`**
   - 只负责把 mac wrapper / companion / UI binding surface 的当前用户路径与 divergence attribution 盘清楚。
2. **`PKT-026-A2 = mac wrapper / launcher / replay fidelity closure`**
   - 只负责收口 A1 已归因的 mac direct user-path fidelity 差异，不扩大到 broader cleanup 或 packaging 重整。
3. **`PKT-026-A3 = mac verification-only closure`**
   - 只负责 mac-specific fresh evidence、negative invariants 与 Commander close gate，不承担新的实现写面。

## Requirements

### Functional Requirements

- **FR-001**: 必须把 `F-026` 明确定义为独立的 mac-first feature，而不是 `F-025-B` 的 Mac 分支，也不是“Mac 的所有内容”。
- **FR-002**: 必须明确 `F-026` 与 `F-003`、`F-014 = wecom-channel-integration`、`specs/014-mac-arm64-installer-hardening/`、`F-025-B` 的关系，并冻结“不重开旧 feature、也不混淆历史 spec 目录与真实 feature id”的 stop rule。
- **FR-003**: 必须把 macOS truth surface 收敛到当前 repo 中用户直接可达、可验证、仍然活跃的 wrapper / companion / UI binding surface。
- **FR-004**: 必须为 `F-026` 定义最小 packet 切分，并为每个 packet 冻结 goal / read-set / write-set / DONE / BLOCKED / stop rule。
- **FR-005**: `PKT-026-A1` 必须只允许写 packet-local inventory artifact；若发现 design gap / authority gap，必须回到单独的 Commander gate，不能顺手改 authority 文档。
- **FR-006**: `PKT-026-A2` 只能处理 A1 已归因的 mac direct user-path divergence；不得为了“统一一下”而顺手重整 UI、packaging 或更广的 mac 体系。
- **FR-007**: `PKT-026-A3` 必须是 verification-only closure；任何 PASS / DONE 声明都必须依赖 macOS-specific fresh verification evidence。
- **FR-008**: `F-026` 必须明确保留 broader docs parity、callback / 自建应用增强、schema migration、cleanup / refactor、containerization 等内容在当前 feature 之外。

### Non-Goals

- **NG-001**: 本轮不做 broader docs parity。
- **NG-002**: 本轮不做 callback / 自建应用增强专项。
- **NG-003**: 本轮不做 schema migration、动态表单引擎或 architecture overhaul。
- **NG-004**: 本轮不重开 `F-003`、`F-014 = wecom-channel-integration`、`F-025-A/B/C`，也不把 `specs/014-mac-arm64-installer-hardening/` 写成当前 authority 里的 `F-014`。
- **NG-005**: 本轮不把 `F-025-B` 改成 closed，也不写 longrun。

## Success Criteria

- **SC-001**: `specs/026-mac-first-platform-parity/` 下存在可用的 `spec.md`、`plan.md`、`tasks.md`，且 `F-026` 的一句话定义、truth surface 与 packet 切分明确。
- **SC-002**: Commander 阅读文档后，可以直接把 `F-026` 派成最小 3 包，而无需再补 scope freeze。
- **SC-003**: 任一 worker 阅读文档后，不会把 `F-026` 误读成“Mac 的所有内容”、“重开 F-003 / F-014 = wecom-channel-integration / F-025”，也不会把 `specs/014-mac-arm64-installer-hardening/` 误认成真正的 `F-014`。
- **SC-004**: 文档明确写出哪些内容继续后置，不会把 broader docs parity、cleanup、callback、schema、Windows evidence 偷带进 `F-026`。
- **SC-005**: 文档不会让人误解 `F-025-B` 已 close，也不会让人误解 `F-026` 已完成实现。

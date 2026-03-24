# F-005 / W-005 UI Reset & Hardening 收口说明

## 元数据
- 日期：`2026-03-23`
- 作者/Agent：`Codex-B`
- 关联 spec：`specs/003-opensparrow-ui-reset-hardening/spec.md`

## 概述
- 修复 USB/UI 链路里的三个高频问题：`openclaw.json` 残留时的安装态误判、全量重置后无法回到安装向导，以及 macOS 双击入口误走 CLI 交互。
- 本文记录 UI-first 状态契约、cleanup/reset 语义、推荐入口与验证口径。

## 前置条件
- 当前位于仓库根目录 `/Users/eduardogan/Desktop/GHJProject/opensparrow`。
- `ui/server.mjs`、`platforms/mac/wrappers/01-开始部署.command`、`platforms/mac/wrappers/run-openclaw-usb.command` 已存在。
- 需要理解以下当前约束：
  - `installed=true` 仅在 `configExists=true` 且 `daemon === 'running'` 时成立。
  - `gateway` 端口被占用不再等价于 `daemon running`。
  - `gateway fallback` 仍会保留在 `runtimeMode` 字段中，但只作为诊断信息，不参与 `installed` 判定。

## 操作步骤
1. 验证 `/api/status` 契约

   ```bash
   node --check ui/server.mjs
   OPENCLAW_HOME="$(mktemp -d)" OPENSPARROW_AUTO_OPEN=0 node ui/server.mjs
   curl http://127.0.0.1:19000/api/status
   ```

   - 重点检查空 profile 与仅残留 `openclaw.json` 的场景都不会被误判为 `installed=true`。

2. 验证前端路由约定

   ```bash
   # 手工在浏览器访问以下路径：
   # http://127.0.0.1:19000/
   # http://127.0.0.1:19000/setup
   # http://127.0.0.1:19000/dashboard?force=1
   ```

   - 应满足的前端路由约定：
     - `/`：仅在后端确认 `installed=true` 且 `daemon=running` 时自动跳到 `/dashboard`。
     - `/setup`：始终打开安装向导。
     - `?force=1`：强制停留安装向导；若从 `/dashboard?force=1` 进入，会立即回跳 `/setup?force=1`。
     - `/dashboard`：若检测到 `configExists=false`（例如刚做完全量重置），自动回到 `/setup?force=1`。

3. 验证 cleanup / reset 语义

   ```bash
   curl -sS -X POST http://127.0.0.1:19000/api/cleanup
   curl -sS -X POST http://127.0.0.1:19000/api/reset \
     -H 'Content-Type: application/json' \
     --data '{"cleanupSkills":true}'
   ```

   - 当前语义：
     - `POST /api/cleanup`：轻量清理，只处理旧 daemon / 端口占用，不删除 profile 配置。
     - `POST /api/reset`：全量重置，负责卸载 service、删除 profile state/workspace，并让 `/api/status.installed=false`。

4. 验证推荐入口

   ```bash
   bash -n platforms/mac/wrappers/01-开始部署.command
   bash -n platforms/mac/wrappers/run-openclaw-usb.command
   ```

   - 当前推荐入口：
     - macOS UI-first：`platforms/mac/wrappers/01-开始部署.command`
     - Windows UI-first：`platforms/windows/wrappers/one-click-deploy.cmd`
     - 高级兼容入口（CLI）：`platforms/mac/wrappers/run-openclaw-usb.command`

## 验证方法
- 启动后可用：

  ```bash
  curl http://127.0.0.1:19000/api/status
  ```

- 重点观察：
  - 空 profile 时 `installed` 为 `false`。
  - 仅残留 `openclaw.json` 时 `installed` 仍为 `false`。
  - reset 后重新访问 `/dashboard` 会被送回 `/setup?force=1`。

## 故障排查
- `/api/status` 仍返回 `installed=true`：先检查返回体中的 `configExists`、`daemon`、`runtimeMode`，确认是否把“端口占用”误当成“daemon 运行”。
- reset 后仍停留 Dashboard：检查 profile 目录是否已删除，以及前端是否命中 `/dashboard?force=1` → `/setup?force=1` 的回跳逻辑。
- 双击入口仍出现 CLI 凭据提示：确认实际启动的是 `platforms/mac/wrappers/01-开始部署.command`，而不是高级兼容入口 `run-openclaw-usb.command`。

## 参考资料
- `specs/003-opensparrow-ui-reset-hardening/spec.md`
- `docs/usb-pack/SOP.md`
- `docs/usb-pack/windows-native-delivery.md`
- `platforms/mac/wrappers/01-开始部署.command`

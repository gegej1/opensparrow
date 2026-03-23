# F-005 / W-005 UI Reset & Hardening 收口说明

## 目标

修复 USB/UI 链路里的三个高频问题：

1. `openclaw.json` 残留时，`/api/status` 不再误判为已安装。
2. 全量重置后，Dashboard 刷新可回到安装向导。
3. macOS 双击入口默认走 UI-first，而不是 CLI 凭据问答。

## 当前约束

- `installed=true` 仅在 `configExists=true` 且 `daemon === 'running'` 时成立。
- `gateway` 端口被占用不再等价于 `daemon running`。
- `gateway fallback` 仍会保留在 `runtimeMode` 字段中，但只作为诊断信息，不参与 `installed` 判定。

## 前端路由约定

- `/`：仅在后端确认 `installed=true` 且 `daemon=running` 时自动跳到 `/dashboard`。
- `/setup`：始终打开安装向导。
- `?force=1`：强制停留安装向导；若从 `/dashboard?force=1` 进入，会立即回跳 `/setup?force=1`。
- `/dashboard`：若检测到 `configExists=false`（例如刚做完全量重置），自动回到 `/setup?force=1`。

## 清理语义

- `POST /api/cleanup`：轻量清理，只处理旧 daemon / 端口占用，不删除 profile 配置。
- `POST /api/reset`：全量重置，负责卸载 service、删除 profile state/workspace，并让 `/api/status.installed=false`。

## 推荐入口

- macOS UI-first：`platforms/mac/wrappers/01-开始部署.command`
- Windows UI-first：`platforms/windows/wrappers/one-click-deploy.cmd`
- 高级兼容入口（CLI）：`platforms/mac/wrappers/run-openclaw-usb.command`

## 验证命令

```bash
node --check ui/server.mjs
bash -n platforms/mac/wrappers/01-开始部署.command
bash -n platforms/mac/wrappers/run-openclaw-usb.command
OPENCLAW_HOME="$(mktemp -d)" OPENSPARROW_AUTO_OPEN=0 node ui/server.mjs
```

启动后可用：

```bash
curl http://127.0.0.1:19000/api/status
```

重点观察：

- 空 profile 时 `installed` 为 `false`
- 仅残留 `openclaw.json` 时 `installed` 仍为 `false`
- reset 后重新访问 `/dashboard` 会被送回 `/setup?force=1`

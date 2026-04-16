# F-005 UI Install / Reset Runbook（Mac packaged cut）

## 元数据

- 日期：`2026-04-15`
- 关联 feature：`F-003`、`F-026`、`F-027`
- 适用范围：今晚 packaged Mac UI-first 首发

## 当前冻结事实

- 唯一官方 first-click path：根目录 `01-开始部署.command`
- `/setup` 是安装向导入口
- `/dashboard` 是安装后的 canonical 控制面
- `?force=1` 仍用于强制回到安装向导
- Dashboard “基本信息”卡片中的端口来自 `/api/status.gatewayPort`
- `mac/run-openclaw-usb.command` 与 `mac/harden-openclaw-usb.command` 只保留为 handoff，不再承担主安装 / 主 hardening 路径

## 标准使用方式

1. 从交付包根目录双击 `01-开始部署.command`。
2. 浏览器进入 `/setup` 后完成安装。
3. 安装完成后进入 `/dashboard`。
4. 如需重新安装或清理，优先在 Dashboard 内完成 reset / cleanup。

## 推荐检查

### 1. 状态接口

访问：

```text
http://127.0.0.1:<实际端口>/api/status
```

重点确认：

- `installed=true` 只在安装成功且 daemon 正常运行时出现
- `gatewayPort` 与 Dashboard 展示一致

### 2. 前端路由

重点确认：

- `/setup` 能稳定打开安装向导
- `/dashboard` 在未安装或 reset 后不会假装已完成安装
- `/dashboard?force=1` 会回到安装向导

### 3. Reset / Cleanup

期望语义：

- `cleanup`：轻量处理旧 daemon / 端口占用
- `reset`：清除当前配置并回到安装向导

### 4. 高级兼容入口

若用户误点：

- `mac/run-openclaw-usb.command`
- `mac/harden-openclaw-usb.command`

当前期望行为：

- 明确提示这些只是 handoff
- 自动回到根目录 `01-开始部署.command`
- 不再直接收凭据或直跑 legacy installer / harden

## 故障排查

### Dashboard 端口看起来不对

- 先看 `/api/status.gatewayPort`
- 再看 Dashboard “基本信息”卡片
- 若前端仍固定展示 `18889`，这是 blocker，不是可接受差异

### Reset 后没有回到安装向导

- 先确认状态接口是否已经反映未安装态
- 再确认浏览器是否仍停在旧的 `/dashboard` 页面缓存

### 误点高级兼容入口后出现 CLI 凭据提示

这是不符合当前冻结事实的。
正确行为应是脚本只做 handoff，并把用户带回根目录 `01-开始部署.command`。

## 边界提醒

- 本 runbook 不把 Windows 纳入今晚正式支持面
- 本 runbook 不把企业微信写成今晚 packaged ready 支持面
- 本 runbook 不把 companion 纳入今晚正式支持面

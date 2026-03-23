# F-006 Runbook - DingTalk Stream Win/Mac Parity

## 目标

修复并验证钉钉 Stream 长连接在 Windows 与 Mac 的部署与运行一致性，确保：

- Windows 一键部署不再因 DingTalk `corpId` 缺失失败；
- Win 端可稳定建立 DingTalk Stream 长连接；
- 飞书与企微链路无回归。

## 前置条件

- 同一套钉钉应用参数用于 Win/Mac 对照（`clientId/clientSecret`，可选 `corpId`）。
- 已有可复现 profile：`~/.openclaw-usb-portable/`。
- UI 服务可访问（默认 `http://127.0.0.1:19000`）。
- 执行环境可运行 `openclaw`、PowerShell、Node bundled runtime。

## Phase A - 现状冻结（修复前）

1. 复现 Windows 一键部署失败：

```powershell
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File usb-pack\one-click-deploy.ps1 -NoPause
```

2. 复现 DingTalk 缺少 `corpId` 的后端拒绝：

```powershell
$body = @{
  channels = @(@{ type='dingtalk'; clientId='dummy_client_id'; clientSecret='dummy_client_secret' })
  api = @{ baseUrl='https://api.openai.com/v1'; apiKey='dummy'; model='gpt-4o-mini' }
} | ConvertTo-Json -Depth 8
Invoke-WebRequest -Method Post -Uri 'http://127.0.0.1:19000/api/install' -ContentType 'application/json' -Body $body -UseBasicParsing
```

3. 记录配置事实：`openclaw.json` 中 DingTalk 仅有 `clientId/clientSecret`，`corpId` 在 `ui-meta.json`。

## Phase B - 修复后验证

1. 重跑一键部署，确认历史配置可成功：

```powershell
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File usb-pack\one-click-deploy.ps1 -NoPause
```

2. 验证 API 契约放宽：`/api/install` 与 `/api/config/channels` 在 DingTalk 无 `corpId` 时不再 400。
3. 验证错误可观测性：故意构造非法请求时，终端能看到后端 `errors[]/message`。

## Phase C - 跨渠道与跨平台回归

1. Feishu 回归：安装/`channels status --probe`/消息 smoke。
2. WeCom 回归：安装/`channels status --probe`/消息 smoke。
3. DingTalk 回归：
   - Windows：启动后观察 Stream 连接状态、人工消息回环。
   - Mac：同参数复跑同一 checklist，对照差异。

## 通过标准

- Windows 一键部署不再出现 “Install failed: HTTP 400（corpId 缺失）”。
- DingTalk 最小契约与插件 schema 对齐：`clientId/clientSecret` 必填，`corpId` 可选。
- 4xx/5xx 错误能输出可读后端原因。
- Feishu 与 WeCom 全量回归通过。
- Win/Mac 对照结果有证据归档并给出差异归因。

## 证据归档清单

- `execution/evidence/f006-*/deploy-one-click-*.txt`
- `execution/evidence/f006-*/install-api-400-raw.txt`
- `execution/evidence/f006-*/channels-probe-feishu.json`
- `execution/evidence/f006-*/channels-probe-wecom.json`
- `execution/evidence/f006-*/channels-probe-dingtalk.json`
- `execution/evidence/f006-*/dingtalk-message-loop-session.txt`
- `execution/evidence/f006-*/win-mac-diff-summary.md`

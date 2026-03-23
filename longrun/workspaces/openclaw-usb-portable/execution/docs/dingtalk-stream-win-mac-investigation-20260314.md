# DingTalk Stream Win/Mac 差异调研报告（2026-03-14）

## 1) 调研目标

围绕“钉钉 Stream 长连接在 Mac 可用、Windows 不可用”问题，先完成事实核查与根因收敛，形成可审核的 spec + longrun tasks，再进入代码实现。

## 2) 调研范围

- 代码范围：
  - `usb-pack/ui/server.mjs`
  - `usb-pack/one-click-deploy.ps1`
- 运行态范围：
  - `C:\Users\menglandan\.openclaw-usb-portable\openclaw.json`
  - `C:\Users\menglandan\.openclaw-usb-portable\ui-meta.json`
  - `@openclaw-china/dingtalk` 插件 schema
- 官方参考：
  - `https://open.dingtalk.com/document/development/configure-stream-push`
  - `https://opensource.dingtalk.com/developerpedia/docs/learn/stream/overview`
  - `https://opensource.dingtalk.com/developerpedia/docs/learn/stream/protocol/`

## 3) 已确认事实（带证据）

### 3.1 后端把 DingTalk `corpId` 设为硬性必填

- `usb-pack/ui/server.mjs`：
  - `POST /api/install` 分支中，DingTalk 缺 `corpId` 会直接报错（约 1363-1366 行）。
  - `POST /api/config/channels` 同样要求 `corpId`（约 1741-1745 行）。

结论：当前服务端契约要求 `clientId/clientSecret/corpId` 三者并存。

### 3.2 实际运行配置并不持久化 `corpId` 到 `openclaw.json`

- `configureChannel('dingtalk')` 只写入 `channels.dingtalk.clientId/clientSecret/...`（约 1583-1592 行）。
- `corpId/robotCode` 仅写入 `ui-meta.json`（约 1593-1594 行调用 `saveDingtalkUiMeta`）。
- 本地 profile 现状：
  - `openclaw.json` 的 `channels.dingtalk` 键集不含 `corpId`。
  - `ui-meta.json` 的 `dingtalk` 键集中存在 `corpId`、`robotCode`。

结论：DingTalk 关键字段在“安装校验层”与“配置持久化层”存在契约割裂。

### 3.3 Windows 一键脚本只从 `openclaw.json` 组装 DingTalk payload

- `usb-pack/one-click-deploy.ps1` 的 `Build-InstallPayload`（约 125-212 行）：
  - DingTalk 仅读取 `clientId/clientSecret`（约 175-181 行）。
  - 不读取 `ui-meta.json`。

结论：重跑安装时，DingTalk payload 天然不带 `corpId`，会触发 400。

### 3.4 已实测复现 Windows 一键失败

执行命令（2026-03-14）：

```powershell
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File usb-pack\one-click-deploy.ps1 -NoPause
```

关键输出：

```text
[deploy] Running one-click install...
[error] Install failed: HTTP 400
```

### 3.5 400 错误体存在，但在当前 PowerShell 路径下常被丢失

用 `Invoke-RestMethod/Invoke-WebRequest` 直接测 `/api/install`（故意不传 `corpId`）时：

- `ErrorDetails.Message` 可拿到 JSON：`{"ok":false,"errors":["钉钉 CorpId 不能为空"]}`
- `Exception.Response.GetResponseStream()` 读取为空字符串。

对应脚本现状：

- `Read-WebExceptionBody`（约 214-236 行）仅从 response stream 读 body；
- 未优先读取 `ErrorDetails.Message`；
- 结果是 `Get-InstallErrorText` 最终常回退到 `HTTP 400`。

结论：Windows 端“看不到真实错误”的直接原因是错误体提取策略不完整。

### 3.6 插件 schema 未把 `corpId` 作为必填

本地已安装插件：

- 文件：`C:\Users\menglandan\.openclaw-usb-portable\extensions\channels\node_modules\@openclaw-china\dingtalk\openclaw.plugin.json`
- `configSchema.required = []`
- 属性中包含 `clientId/clientSecret`，但未声明 `corpId` 必填。

结论：服务端硬性要求 `corpId` 与插件运行契约不一致。

## 4) 根因链路（确定性）

1. UI/后端校验把 `corpId` 定义为 DingTalk 必填。  
2. 安装后配置持久化与一键重跑 payload 都不保证携带 `corpId`。  
3. Windows 重跑一键部署时触发 400。  
4. 脚本在当前 PowerShell 错误对象上未读取 `ErrorDetails.Message`，最终仅显示 `HTTP 400`。  

这 4 点叠加，形成“Windows 不可用且难定位”的现象。

## 5) 为什么 Mac 目前可用、Win 不可用（当前阶段判断）

以下为基于本地证据的推断：

- Mac 侧“可用”更可能走的是首装 UI 配置/直连流程，现场有完整表单上下文，未触发“历史配置重跑 + corpId 缺失”路径。
- Windows 侧更常见的是 `one-click-deploy.ps1` 重跑路径，payload 来源单一（`openclaw.json`），因此更容易命中 `corpId` 缺失。
- 同时 Windows 脚本错误提示弱化为 `HTTP 400`，放大了排障难度。

备注：若后续在 Mac 侧也强制走同样“历史配置重跑”路径，理论上也可能暴露同类契约问题；需在 F-006 对照回归中验证。

## 6) 已输出的规划产物

- `specs/004-dingtalk-stream-win-parity/spec.md`
- `specs/004-dingtalk-stream-win-parity/plan.md`
- `specs/004-dingtalk-stream-win-parity/tasks.md`
- `execution/runbooks/F-006-dingtalk-stream-win-parity.md`
- `feature_list.json` 新增 `F-006`

## 7) 下一步（待审核后执行）

1. 对齐 DingTalk 契约：`clientId/clientSecret` 必填，`corpId` 改可选元数据。  
2. 一键脚本补 `ui-meta.json` 可选字段读取，并修复错误体提取优先级。  
3. 执行 Feishu/WeCom 回归 + DingTalk Win/Mac 对照，产出证据闭环。  

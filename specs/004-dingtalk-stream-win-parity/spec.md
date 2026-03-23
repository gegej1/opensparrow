# Feature Specification: DingTalk Stream Win/Mac Parity

**Feature Branch**: `004-dingtalk-stream-win-parity`  
**Created**: 2026-03-14  
**Status**: Draft (Planning)  
**Input**: 用户要求定位“钉钉 Stream 长连接在 mac 可用、在 Windows 不可用”的根因，并先形成可审核的 spec + longrun tasks。

## Context & References

- DingTalk Stream 推送配置（用户指定）: `https://open.dingtalk.com/document/development/configure-stream-push`
- DingTalk Stream official overview: `https://opensource.dingtalk.com/developerpedia/docs/learn/stream/overview`
- DingTalk Stream protocol details: `https://opensource.dingtalk.com/developerpedia/docs/learn/stream/protocol/`
- Local code evidence:
  - UI backend enforces `corpId` as required for DingTalk install/update.
  - `one-click-deploy.ps1` builds DingTalk payload from `openclaw.json` only, which does not persist `corpId`.
  - Installed `@openclaw-china/dingtalk` schema requires `clientId/clientSecret`, not `corpId`.

## User Scenarios & Testing

### User Story 1 - Windows one-click deploy must not fail on DingTalk historical config (Priority: P1)

作为 Windows 运维人员，我希望在已有 `openclaw.json` 的情况下重新执行一键部署时，不会因为 DingTalk `corpId` 缺失而失败。

**Why this priority**: 这是当前“Win 不可用”的高概率阻断路径，且会影响交付包重复部署。  
**Independent Test**: 在 `channels.dingtalk` 已存在 `clientId/clientSecret`、但无 `corpId` 的 profile 上执行 `usb-pack/one-click-deploy.ps1`，应返回成功而不是 HTTP 400。  

**Acceptance Scenarios**:
1. **Given** `openclaw.json` 只有 `clientId/clientSecret`，**When** 执行一键部署，**Then** `/api/install` 不再因 `corpId` 校验失败。
2. **Given** `ui-meta.json` 存在 `corpId`，**When** 一键部署，**Then** 可选传递该字段但不作为硬性失败条件。
3. **Given** DingTalk 未启用，**When** 一键部署，**Then** 行为与当前一致，不新增副作用。

---

### User Story 2 - DingTalk stream runtime behavior on Windows must match Mac baseline (Priority: P1)

作为实施人员，我希望在 Windows 上完成部署后，钉钉 Stream 能稳定连接并收发消息，行为与 Mac 侧一致。

**Why this priority**: 目标是“跨平台可交付”，不是仅配置写入成功。  
**Independent Test**: Windows 与 Mac 使用同一钉钉应用参数，对照执行“连接建立 + 人工消息回环”并留证据。  

**Acceptance Scenarios**:
1. **Given** Windows profile 配置完成，**When** 启动 gateway，**Then** DingTalk 不出现持续重连/注册失败。
2. **Given** 钉钉群内 @bot 消息，**When** 触发处理，**Then** 产生可追踪 session 更新与回复。
3. **Given** 同版本配置在 Mac 可工作，**When** 在 Windows 复现，**Then** 排除脚本层契约问题后对比剩余平台差异。

---

### User Story 3 - Deployment errors must be diagnosable (Priority: P1)

作为排障人员，我希望一键部署失败时看到明确后端错误，而不是仅 `HTTP 400`。

**Why this priority**: 当前错误信息被吞掉，导致问题定位成本高。  
**Independent Test**: 触发一个已知参数错误（例如故意缺少字段），输出中应包含后端 `errors[]` 文本。  

**Acceptance Scenarios**:
1. **Given** `/api/install` 返回 4xx JSON 错误体，**When** `one-click-deploy.ps1` 处理异常，**Then** 输出可读错误原因。
2. **Given** timeout-like 错误，**When** 走现有收敛逻辑，**Then** 不影响成功路径。
3. **Given** 非 JSON 错误体，**When** 脚本解析失败，**Then** 仍回退显示原始文本片段。

---

### User Story 4 - Feishu/WeCom regression must be zero (Priority: P1)

作为系统维护者，我希望钉钉修复不会破坏已跑通的飞书和企微长连接链路。

**Independent Test**: 同一次回归执行 Feishu + WeCom probe/message smoke，与修复前结果一致。  

## Edge Cases

- `ui-meta.json` 不存在或损坏（无法提供 `corpId`）。
- `openclaw.json` 来自旧版本，仅有 `channels.dingtalk.clientId/clientSecret`。
- Windows `gateway-fallback` 模式下部署重跑（无 `schtasks` 权限）。
- `one-click-deploy.ps1` 在 PowerShell 5 与 PowerShell 7 下错误体读取行为不同。

## Requirements

### Functional Requirements

- **FR-001**: DingTalk 安装契约必须与插件真实 schema 对齐；`clientId/clientSecret` 为必填，`corpId` 为可选元数据。
- **FR-002**: `POST /api/install` 与 `POST /api/config/channels` 不得因缺少 `corpId` 直接拒绝 DingTalk 配置。
- **FR-003**: `corpId/robotCode` 继续作为 UI 辅助字段保留，不影响已有配置兼容。
- **FR-004**: `one-click-deploy.ps1` 组装 DingTalk payload 时应支持从 `ui-meta.json` 读取可选字段，但即使读取不到也不应阻断安装。
- **FR-005**: `one-click-deploy.ps1` 必须在 4xx/5xx 场景输出后端错误体中的 `errors/message`。
- **FR-006**: 钉钉修复后，Feishu 与 WeCom 安装、probe、消息链路行为不回退。
- **FR-007**: 变更需补齐 spec/plan/tasks 与 longrun runbook/evidence 要求，满足文档先行流程。

### Key Entities

- **DingTalk Channel Contract**: `channels.dingtalk` 的最小可运行字段集合与可选元数据集合。
- **One-Click Install Payload**: Windows 一键部署提交到 `/api/install` 的 JSON 契约。
- **Longrun Evidence Set**: Win/Mac 对照验证所需命令输出、日志、时间戳证据。

## Success Criteria

### Measurable Outcomes

- **SC-001**: Windows 一键部署在“DingTalk 无 `corpId` 旧配置”场景下成功率 100%（样本 >= 5 次重跑）。
- **SC-002**: 一键部署失败时输出可读错误原因，不再只显示 `HTTP 400`。
- **SC-003**: 钉钉在 Windows 上至少完成 1 条人工端到端消息回环并留下 session/log 证据。
- **SC-004**: Feishu、WeCom 回归检查全部通过，结果与修复前一致。
- **SC-005**: longrun 文档补齐 F-006 的 runbook、调查结论、回归证据链接。

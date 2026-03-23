# Tasks: DingTalk Stream Win/Mac Parity

**Input**: `specs/004-dingtalk-stream-win-parity/spec.md`, `specs/004-dingtalk-stream-win-parity/plan.md`  
**Prerequisites**: `spec.md`, `plan.md`

## Phase 1: Baseline Reproduction & Evidence Freeze (P1)

- [ ] T001 固化当前失败基线：Windows 执行 `usb-pack/one-click-deploy.ps1` 记录 `HTTP 400` 复现证据
- [ ] T002 记录 `/api/install` 在 DingTalk 缺 `corpId` 的真实返回体证据
- [ ] T003 采集当前 Feishu/WeCom 可用性基线（status/probe + 会话时间戳）用于回归对照

## Phase 2: Backend Contract Alignment (P1)

- [x] T004 修改 `usb-pack/ui/server.mjs` 中 DingTalk 输入校验：`corpId` 由必填改为可选
- [x] T005 保持 `corpId/robotCode` 作为 UI metadata 存储，不影响运行必要字段写入
- [x] T006 为 `/api/install` 与 `/api/config/channels` 增加最小契约回归测试脚本/命令清单

## Phase 3: Windows One-Click Payload Hardening (P1)

- [x] T007 在 `usb-pack/one-click-deploy.ps1` 中补充 `ui-meta.json` 读取逻辑（DingTalk 可选字段）
- [x] T008 调整 `Build-InstallPayload`：DingTalk 最小字段提交可运行，metadata 有则附带
- [ ] T009 验证一键部署在“仅有 clientId/clientSecret”场景可成功重跑

## Phase 4: Error Observability Upgrade (P1)

- [x] T010 修复 `Read-WebExceptionBody` 在 4xx/5xx 场景下的兼容性，确保能读到后端 JSON 错误体
- [x] T011 优化 `Get-InstallErrorText` 输出优先级（`errors[]` > `message` > `rawBody` > `HTTP code`）
- [ ] T012 增加 1 个故障注入回归：确认脚本不再只显示 `HTTP 400`

## Phase 5: Cross-Channel Regression (P1)

- [ ] T013 回归 Feishu 长连接链路（安装后 probe/消息 smoke）
- [ ] T014 回归 WeCom 长连接链路（安装后 probe/消息 smoke）
- [ ] T015 回归 DingTalk Stream 链路（连接建立 + 人工消息回环 + session 证据）

## Phase 6: Longrun Deliverables (P1)

- [x] T016 更新 `longrun/.../feature_list.json` 新增 F-006 任务项并标注风险与验收标准
- [x] T017 新增 `execution/runbooks/F-006-dingtalk-stream-win-parity.md`（命令、通过标准、证据清单）
- [x] T018 新增调查报告 `execution/docs/dingtalk-stream-win-mac-investigation-20260314.md`
- [x] T019 在 `claude-progress.txt` 追加本次规划与后续实施入口

## Validation Checklist

- [ ] V001 Windows 一键部署不再因 DingTalk `corpId` 缺失失败
- [ ] V002 一键部署失败时能输出具体后端错误文本
- [x] V003 DingTalk 最小配置契约与插件 schema 对齐
- [x] V004 DingTalk metadata（corpId/robotCode）可选且不影响运行
- [ ] V005 Feishu 回归通过
- [ ] V006 WeCom 回归通过
- [ ] V007 DingTalk Win 端到端消息回环通过
- [ ] V008 longrun 文档与证据清单完整可复验

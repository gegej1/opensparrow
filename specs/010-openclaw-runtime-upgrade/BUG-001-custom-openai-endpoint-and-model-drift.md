# BUG-001: 自定义 OpenAI 兼容地址缺少 `/v1` 且 Dashboard 保存 API 不同步当前模型

## 问题描述

**当前行为**：
- 用户在安装向导或 Dashboard 中填写自定义 OpenAI 兼容地址 `https://llm.wtsht.cn/mosuanguichao/qwen3-32b-api` 与模型 `Qwen3-32B` 后，真实聊天会失败。
- 观测到两类失败：
  - 初次链路：`404 status code (no body)`
  - 后续链路：`500 not implemented`
- Dashboard 的 API 表单可能已经显示为新的 provider 配置，但实际运行时仍在使用旧的当前模型别名，形成“表单已更新，真实模型未切换”的错位。

**期望行为**：
- 自定义 OpenAI 兼容地址在写入前应做兼容性校验，至少能明确提示是否需要 `/v1`。
- Dashboard 保存 API 配置后，provider 配置与“当前激活模型”应保持一致。
- 若 provider 不支持 `responses`，UI 或后端应明确提示兼容性限制，而不是让用户在聊天时才看到失败。

## 根本原因

1. `ui/server.mjs` 的 `normalizeOpenAIBaseUrl()` 会保留自定义非根路径，不会自动把 `https://llm.wtsht.cn/mosuanguichao/qwen3-32b-api` 归一化成带 `/v1` 的地址。
2. 该 provider 的实测兼容性并不完整：
   - `POST /v1/chat/completions` 可用
   - `POST /v1/completions` 可用
   - `POST /chat/completions` 不可用（404）
   - `POST /v1/responses` 不可用（400，按 chat-completions 解析失败）
3. `POST /api/config/api` 的保存逻辑只更新 `models.providers.openai`，不会像安装流程那样再执行一次 `models set ...`，导致“当前激活模型”可能仍停留在旧别名。
4. 实际会话日志证明运行时确实先后走过 `openai-completions` 与 `openai-responses`，而该 provider 至少不完整支持 `responses`，最终导致聊天失败。

## 证据

### A. 本仓当前归一化逻辑不会自动补 `/v1`

输入：
- `https://llm.wtsht.cn/mosuanguichao/qwen3-32b-api`

当前 `normalizeOpenAIBaseUrl()` 的归一化结果：
- `https://llm.wtsht.cn/mosuanguichao/qwen3-32b-api`

### B. 2026-04-08 实测矩阵（同一组 URL + Model）

| Case | HTTP | 结果摘要 |
| --- | --- | --- |
| `POST /chat/completions` | 404 | `{"detail":"Not Found"}` |
| `POST /v1/chat/completions` | 200 | 正常返回 assistant 内容 |
| `POST /responses` | 400 | 按 chat-completions 解析失败 |
| `POST /v1/responses` | 400 | 按 chat-completions 解析失败 |
| `POST /completions` | 404 | `{"detail":"Not Found"}` |
| `POST /v1/completions` | 200 | 正常返回文本 |
| `POST /v1/chat/completions` + `stream=true` | 200 | 正常返回 SSE chunk |

### C. 真实运行时错误证据

- `~/.openclaw-usb-portable/agents/main/sessions/e908d44e-35f2-4f74-8acb-088c2d8bbd29.jsonl`
  - 记录过 `api:"openai-completions"` + `errorMessage:"404 status code (no body)"`
  - 也记录过多次 `api:"openai-responses"` + `errorMessage:"500 not implemented (...)"`
- `~/.openclaw-usb-portable/logs/gateway.err.log`
  - 记录 `embedded run agent end ... model=Qwen3-32B provider=openai error=404 status code (no body)`
  - 以及后续多次 `500 not implemented`

### D. 模型错位证据

- `GET /api/config` 当前可读到 provider 表单层显示的配置为：
  - `baseUrl = https://www.dmxapi.cn/v1`
  - `model = gpt-5.4`
- 但 `openclaw models list` 当前默认模型仍显示：
  - `openai/Qwen3-32B`（default, configured）

这说明“Dashboard 表单配置”与“运行时当前激活模型”已经漂移。

## 用户影响

- **严重程度**: P0（核心聊天能力不可用）
- **用户体验**:
  - 安装/保存后表面看似成功，但真实消息发送失败
  - 用户难以理解为什么 Dashboard 表单与真实运行模型不一致
  - provider 兼容性问题直到真实聊天时才暴露

## 复现步骤

1. 在安装向导中填写：
   - `baseUrl = https://llm.wtsht.cn/mosuanguichao/qwen3-32b-api`
   - `model = Qwen3-32B`
2. 完成安装并启动 gateway。
3. 从飞书向机器人发送任意文本（如“你好”或“ping”）。
4. 观察会话日志与 `gateway.err.log`：
   - 先可出现 `404 status code (no body)`
   - 后续重试可出现 `500 not implemented`
5. 再在 Dashboard 中修改 API 配置为其他模型/地址。
6. 观察 `/api/config` 与 `openclaw models list`：两者可能显示不同模型，出现模型错位。

## 修复方案

### 后端

1. 在安装向导与 Dashboard 保存 API 时加入 provider 预检：
   - 明确验证 `POST <baseUrl>/chat/completions` 或 `POST <baseUrl>/v1/chat/completions` 的可用性
   - 若 provider 不支持 `responses`，明确返回兼容性告警
2. `POST /api/config/api` 保存成功后，同步执行一次 `models set <provider/model>`，避免当前模型漂移。
3. 对自定义路径型 baseUrl 提供更严格的归一化/探测逻辑，而不是单纯保留原路径。

### UI

1. 在 API 配置页展示“当前激活模型”和“provider 表单模型”两个状态，避免用户误解。
2. 在保存或安装完成前增加一条“连通性测试”或“兼容性测试”结果展示。
3. 若检测到 provider 仅兼容 `chat/completions`，在 UI 中明确提示。

## 验收标准

- [ ] 对 `https://llm.wtsht.cn/mosuanguichao/qwen3-32b-api` 这类地址，UI/后端能在保存前明确指出是否需要 `/v1`
- [ ] 保存 API 配置后，`/api/config` 与 `openclaw models list` 显示的当前模型一致
- [ ] 不再出现“表单已切换到新模型，但实际仍调用旧模型”的漂移
- [ ] 对不支持 `responses` 的 provider，系统能在真实聊天前给出明确提示

---

**报告人**: Codex
**发现时间**: 2026-04-08
**优先级**: P0
**状态**: Open

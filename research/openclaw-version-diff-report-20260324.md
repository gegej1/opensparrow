# OpenClaw 2026.3.7/3.12 → 2026.3.23 实操对比报告

## 调研日期与方法

| 项目 | 内容 |
|------|------|
| 调研日期 | 2026-03-24 |
| 本地旧版本（macOS） | 2026.3.7（`~/.npm-global/lib/node_modules/openclaw/`） |
| 本地旧版本（Windows） | 2026.3.12（`vendor/windows-openclaw/node_modules/openclaw/`） |
| 目标新版本 | 2026.3.23（npm latest，2026-03-24 发布） |
| 调研方法 | 本地 vendor 文件读取 + npm/GitHub CHANGELOG + Web 搜索 |
| 关联报告 | `research/openclaw-version-upgrade-report-20260324.md`（概要版） |

### 数据来源

- 本地文件：`vendor/windows-openclaw/node_modules/openclaw/package.json` (v2026.3.12)
- 本地文件：`~/.npm-global/lib/node_modules/openclaw/package.json` (v2026.3.7)
- 本地文件：两个版本的 `CHANGELOG.md`
- Web：[npm openclaw](https://www.npmjs.com/package/openclaw)、[GitHub Releases](https://github.com/openclaw/openclaw/releases)、[ClawCloud 升级指南](https://www.clawcloud.sh/blog/openclaw-2026-3-13-upgrade-guide)、[gateway.auth.mode 指南](https://www.clawcloud.sh/guides/openclaw-3-7-gateway-auth-mode)

---

## 一、依赖变更对比表（完整 diff）

### 1.1 v2026.3.7 → v2026.3.12 依赖变更（本地实测）

| 依赖包 | v2026.3.7 | v2026.3.12 | 变更说明 |
|--------|-----------|------------|---------|
| `@agentclientprotocol/sdk` | 0.15.0 | 0.16.1 | ACP SDK 升级，新增 session_yield |
| `@aws-sdk/client-bedrock` | ^3.1004.0 | ^3.1008.0 | AWS Bedrock SDK 小升级 |
| `@discordjs/voice` | ^0.19.0 | ^0.19.1 | Discord 语音 patch 修复 |
| `@larksuiteoapi/node-sdk` | 未列入 | ^1.59.0 | **新增**：飞书 SDK 从内部依赖提升为显式依赖 |
| `@mariozechner/pi-agent-core` | 0.55.3 | 0.57.1 | PocketInfinity agent 框架升级 |
| `@mariozechner/pi-ai` | 0.55.3 | 0.57.1 | 同上 |
| `@mariozechner/pi-coding-agent` | 0.55.3 | 0.57.1 | 同上 |
| `@mariozechner/pi-tui` | 0.55.3 | 0.57.1 | 同上 |
| `discord-api-types` | ^0.38.41 | ^0.38.42 | Discord API 类型 patch |
| `file-type` | ^21.3.0 | ^21.3.1 | 文件类型检测 patch |
| `hono` | 未列入 | 4.12.7 | **新增**：Hono HTTP 框架（替代部分 Express 路由） |
| `https-proxy-agent` | ^7.0.6 | ^8.0.0 | **主版本升级**：代理 agent 升到 v8 |
| `strip-ansi` | ^7.2.0 | 移除 | 不再直接依赖 |
| `tar` | 7.5.10 | 7.5.11 | tar 包 patch |
| `undici` | ^7.22.0 | ^7.24.0 | HTTP 客户端 minor 升级 |

### 1.2 v2026.3.12 → v2026.3.23 依赖变更（npm registry 实测，2026-03-24 补全）

> 以下数据通过 `npm view openclaw@2026.3.23 dependencies --json` 与 `npm view openclaw@2026.3.12 dependencies --json` 对比获得，为精确 diff。

#### 新增依赖（v2026.3.23 有，v2026.3.12 无）

| 依赖包 | v2026.3.23 版本 | 说明 |
|--------|----------------|------|
| `uuid` | ^13.0.0 | UUID 生成库，可能用于会话/消息 ID |
| `gaxios` | 7.1.4 | Google HTTP 客户端（Vertex AI / Gemini 集成） |
| `@anthropic-ai/vertex-sdk` | ^0.14.4 | **Anthropic Vertex SDK**——通过 Google Vertex AI 访问 Claude |
| `@modelcontextprotocol/sdk` | 1.27.1 | **MCP SDK**——Model Context Protocol 集成 |

#### 移除依赖（v2026.3.12 有，v2026.3.23 无）

| 依赖包 | v2026.3.12 版本 | 说明 |
|--------|----------------|------|
| `grammy` | ^1.41.1 | Telegram bot 框架（可能迁移到 extensions） |
| `@grammyjs/runner` | ^2.0.3 | Grammy 运行器（同上） |
| `@grammyjs/transformer-throttler` | ^1.2.1 | Grammy 限流器（同上） |
| `opusscript` | ^0.1.1 | Opus 音频编码（可能迁移到 voice-call extension） |
| `@slack/bolt` | ^4.6.0 | Slack Bolt 框架（可能迁移到 extensions） |
| `@slack/web-api` | ^7.14.1 | Slack Web API（同上） |
| `@buape/carbon` | 0.0.0-beta-20260216184201 | Discord Carbon 框架（迁移到 extensions） |
| `@discordjs/voice` | ^0.19.1 | Discord 语音（迁移到 extensions） |
| `discord-api-types` | ^0.38.42 | Discord API 类型（同上） |
| `https-proxy-agent` | ^8.0.0 | HTTPS 代理（可能由 undici 内置替代） |
| `@larksuiteoapi/node-sdk` | ^1.59.0 | **飞书 SDK**（迁移到 feishu extension 内部依赖） |
| `@whiskeysockets/baileys` | 7.0.0-rc.9 | WhatsApp 库（迁移到 @openclaw/whatsapp 独立包） |

#### 版本升级

| 依赖包 | v2026.3.12 | v2026.3.23 | 变更说明 |
|--------|------------|------------|---------|
| `ws` | ^8.19.0 | ^8.20.0 | WebSocket minor 升级 |
| `tar` | 7.5.11 | 7.5.12 | tar 包 patch |
| `hono` | 4.12.7 | 4.12.8 | Hono HTTP 框架 patch |
| `yaml` | ^2.8.2 | ^2.8.3 | YAML 解析 patch |
| `undici` | ^7.24.0 | ^7.24.5 | HTTP 客户端 patch |
| `file-type` | ^21.3.1 | 21.3.4 | 文件类型检测（锁定版本） |
| `sqlite-vec` | 0.1.7-alpha.2 | 0.1.7 | SQLite 向量扩展（alpha → stable） |
| `@aws-sdk/client-bedrock` | ^3.1008.0 | ^3.1014.0 | AWS Bedrock SDK minor |
| `@mariozechner/pi-ai` | 0.57.1 | **0.61.1** | PocketInfinity AI 框架（+4 minor） |
| `@mariozechner/pi-tui` | 0.57.1 | **0.61.1** | PocketInfinity TUI（+4 minor） |
| `@mariozechner/pi-agent-core` | 0.57.1 | **0.61.1** | PocketInfinity agent 核心（+4 minor） |
| `@mariozechner/pi-coding-agent` | 0.57.1 | **0.61.1** | PocketInfinity coding agent（+4 minor） |

#### 未变化依赖（版本完全相同）

`ajv`, `zod`, `jiti`, `long`, `chalk`, `json5`, `jszip`, `sharp`, `tslog`, `croner`, `dotenv`, `express`, `chokidar`, `linkedom`, `commander`, `ipaddr.js`, `pdfjs-dist`, `markdown-it`, `osc-progress`, `@line/bot-sdk`, `cli-highlight`, `node-edge-tts`, `@clack/prompts`, `playwright-core`, `qrcode-terminal`, `@homebridge/ciao`, `@lydell/node-pty`, `@sinclair/typebox`, `@mozilla/readability`, `@agentclientprotocol/sdk`

#### 依赖数量变化

| 版本 | 依赖数量 |
|------|---------|
| v2026.3.7 | 53 |
| v2026.3.12 | 52 |
| v2026.3.23 | **46** |

v2026.3.23 减少了 6 个直接依赖，主要是将 Telegram (grammy)、Slack、Discord、WhatsApp、飞书等渠道 SDK 从根依赖迁移到各自 extension 的内部依赖，体现了插件化架构的推进。

### 1.3 完整三版本 diff 表（v2026.3.7 → v2026.3.12 → v2026.3.23）

| 依赖包 | v2026.3.7 | v2026.3.12 | v2026.3.23 | 趋势 |
|--------|-----------|------------|------------|------|
| `@agentclientprotocol/sdk` | 0.15.0 | 0.16.1 | 0.16.1 | 3.7→3.12 升级 |
| `@anthropic-ai/vertex-sdk` | — | — | ^0.14.4 | **3.23 新增** |
| `@aws-sdk/client-bedrock` | ^3.1004.0 | ^3.1008.0 | ^3.1014.0 | 持续升级 |
| `@buape/carbon` | 0.0.0-beta | 0.0.0-beta | — | **3.23 移除** |
| `@discordjs/voice` | ^0.19.0 | ^0.19.1 | — | **3.23 移除** |
| `@grammyjs/runner` | ^2.0.3 | ^2.0.3 | — | **3.23 移除** |
| `@grammyjs/transformer-throttler` | ^1.2.1 | ^1.2.1 | — | **3.23 移除** |
| `@homebridge/ciao` | ^1.3.5 | ^1.3.5 | ^1.3.5 | 不变 |
| `@larksuiteoapi/node-sdk` | — | ^1.59.0 | — | 3.12 新增 → **3.23 移除**（迁入 extension） |
| `@lydell/node-pty` | 1.2.0-beta.3 | 1.2.0-beta.3 | 1.2.0-beta.3 | 不变 |
| `@mariozechner/pi-*` | 0.55.3 | 0.57.1 | **0.61.1** | 持续升级（+6 minor 跨三版本） |
| `@modelcontextprotocol/sdk` | — | — | 1.27.1 | **3.23 新增** |
| `@slack/bolt` | ^4.6.0 | ^4.6.0 | — | **3.23 移除** |
| `@slack/web-api` | ^7.14.1 | ^7.14.1 | — | **3.23 移除** |
| `@whiskeysockets/baileys` | — | 7.0.0-rc.9 | — | 3.12 新增 → **3.23 移除** |
| `discord-api-types` | ^0.38.41 | ^0.38.42 | — | **3.23 移除** |
| `file-type` | ^21.3.0 | ^21.3.1 | **21.3.4** | 3.23 锁定版本 |
| `gaxios` | — | — | 7.1.4 | **3.23 新增** |
| `grammy` | ^1.41.1 | ^1.41.1 | — | **3.23 移除** |
| `hono` | — | 4.12.7 | **4.12.8** | 3.12 新增，3.23 patch |
| `https-proxy-agent` | ^7.0.6 | ^8.0.0 | — | **3.23 移除** |
| `opusscript` | ^0.1.1 | ^0.1.1 | — | **3.23 移除** |
| `sqlite-vec` | 0.1.7-alpha.2 | 0.1.7-alpha.2 | **0.1.7** | 3.23 alpha→stable |
| `strip-ansi` | ^7.2.0 | — | — | 3.12 已移除 |
| `tar` | 7.5.10 | 7.5.11 | **7.5.12** | 持续 patch |
| `undici` | ^7.22.0 | ^7.24.0 | **^7.24.5** | 持续升级 |
| `uuid` | — | — | ^13.0.0 | **3.23 新增** |
| `ws` | ^8.19.0 | ^8.19.0 | **^8.20.0** | 3.23 minor 升级 |
| `yaml` | ^2.8.2 | ^2.8.2 | **^2.8.3** | 3.23 patch |

> 数据来源：`npm view openclaw@{version} dependencies --json`，2026-03-24 实测。

### 1.4 engine 要求变更（已确认）

| 字段 | v2026.3.7 | v2026.3.12 | v2026.3.23 |
|------|-----------|------------|------------|
| `engines.node` | `>=22.12.0` | `>=22.16.0` | `>=22.16.0`（已确认） |
| `peerDependencies.node-llama-cpp` | — | 3.16.2 (optional) | 3.16.2 (optional) |
| `peerDependencies.@napi-rs/canvas` | — | ^0.1.89 | ^0.1.89 |

**影响评估**：OpenSparrow vendor 中已使用 Node v24.14.0，满足所有版本要求。无需更换 Node.js runtime。peerDependencies 均为 optional，不影响基本运行。

---

## 二、配置 Schema 变更

### 2.1 gateway.auth.mode（破坏性变更，v2026.3.7 引入）

| 项目 | 旧行为 | 新行为 |
|------|--------|--------|
| **触发条件** | `gateway.auth.token` 和 `gateway.auth.password` 同时存在 | 必须显式设置 `gateway.auth.mode` |
| **缺省值** | 无（自动推断） | **无缺省值，网关拒绝启动** |
| **合法值** | — | `"token"` 或 `"password"` |
| **影响范围** | 所有使用 `openclaw.json` 配置文件的安装 | — |

**修复方法**：在 `openclaw.json` 的 `gateway.auth` 块中添加 `"mode": "token"` 或 `"mode": "password"`。

**验证命令**：
```bash
openclaw config validate
openclaw doctor
openclaw gateway restart
openclaw health
```

参考：[ClawCloud gateway.auth.mode 指南](https://www.clawcloud.sh/guides/openclaw-3-7-gateway-auth-mode)、[Medium 详解](https://medium.com/openclawcloud/openclaw-2026-3-7-the-gateway-auth-mode-fix-you-need-before-upgrading-4f487a052d1a)

### 2.2 默认模型变更（v2026.3.22 引入）

| 项目 | 旧值 | 新值 |
|------|------|------|
| 默认 OpenAI setup 模型 | `openai/gpt-4o-mini` | `openai/gpt-5.4` |
| Codex 默认 | — | `openai-codex/gpt-5.4` |

**影响**：OpenSparrow 安装脚本硬编码了 `openai/gpt-4o-mini`，升级后不影响已有安装，但新安装的默认行为会与脚本预设不同。

### 2.3 Config migration (v2026.3.2→3.3 遗留)

部分旧配置键（如 `autoApproveDevices`、`requirePairing`）在 v2026.3.3+ 中被标记为非法。如果配置中存在这些键，网关启动会失败。

**修复方法**：`openclaw doctor --fix` 自动迁移。

### 2.4 Agent 默认超时（v2026.3.22 引入）

| 项目 | 旧值 | 新值 |
|------|------|------|
| 默认 agent 超时 | 10 分钟（600 秒） | 48 小时 |

### 2.5 图片生成配置（v2026.3.22 引入）

| 项目 | 旧配置 | 新配置 |
|------|--------|--------|
| 图片生成 | `openai-image-gen` skill | `agents.defaults.imageGenerationModel.primary` |
| 推荐值 | — | `"google/gemini-3-pro-image-preview"` |

### 2.6 CLAWDBOT_*/MOLTBOT_* 环境变量（v2026.3.22 移除）

所有 `CLAWDBOT_*` 和 `MOLTBOT_*` 环境变量已被移除。必须使用 `OPENCLAW_*` 前缀。

---

## 三、CLI 命令变更

### 3.1 新增命令

| 命令 | 版本 | 说明 |
|------|------|------|
| `openclaw backup create` | 3.8+ | 创建配置备份 |
| `openclaw backup verify` | 3.8+ | 验证备份完整性 |
| `openclaw skills search` | 3.22+ | 从 ClawHub 搜索 skills |
| `openclaw skills install` | 3.22+ | 安装 ClawHub skills |
| `openclaw skills update` | 3.22+ | 更新 ClawHub skills |
| `openclaw plugins install clawhub:<pkg>` | 3.22+ | 指定从 ClawHub 安装 |
| `/btw` | 3.22+ | 会话内快速提问（不影响上下文） |
| `/migrate-skills` | 3.22+ | 迁移旧格式 skills |
| `/legacy-skills list` | 3.22+ | 列出旧格式 skills |

### 3.2 行为变更

| 命令 | 旧行为 | 新行为 |
|------|--------|--------|
| `openclaw plugins install <pkg>` | npm 优先 | **ClawHub 优先，npm 回退** |
| `openclaw doctor --fix` | 基本诊断 | 新增浏览器配置迁移 + cron 存储迁移 + Mistral 配置修复 |
| `openclaw config validate` | 基本验证 | 增加 gateway.auth.mode 验证 |

### 3.3 移除/废弃命令

| 命令/功能 | 版本 | 说明 |
|----------|------|------|
| `driver: "extension"` 浏览器配置 | 3.22 移除 | Chrome 扩展 relay 完全移除 |
| `browser.relayBindHost` | 3.22 移除 | 同上 |
| `api.registerHttpHandler()` | 3.2 移除 | 改用 `registerHttpRoute()` |

---

## 四、内置插件/Extensions 变更

### 4.1 v2026.3.7 → v2026.3.12 Extensions 差异（本地实测）

| Extensions | v2026.3.7 | v2026.3.12 | 状态 |
|------------|-----------|------------|------|
| `google-antigravity-auth` | 有 | **移除** | 已删除 |
| `ollama` | 无 | **新增** | 迁移到 provider-plugin 架构 |
| `sglang` | 无 | **新增** | 迁移到 provider-plugin 架构 |
| `vllm` | 无 | **新增** | 迁移到 provider-plugin 架构 |

其他 extensions（共 43 个）保持一致：acpx, bluebubbles, copilot-proxy, device-pair, diagnostics-otel, diffs, discord, feishu, google-gemini-cli-auth, googlechat, imessage, irc, line, llm-task, lobster, matrix, mattermost, memory-core, memory-lancedb, minimax-portal-auth, msteams, nextcloud-talk, nostr, open-prose, phone-control, qwen-portal-auth, shared, signal, slack, synology-chat, talk-voice, telegram, test-utils, thread-ownership, tlon, twitch, voice-call, whatsapp, zalo, zalouser

### 4.2 v2026.3.12 → v2026.3.23 Extensions 变更（基于 Web 调研）

| 变更 | 说明 |
|------|------|
| WhatsApp 独立包迁移 | v2026.3.22 中 WhatsApp 迁移到 `@openclaw/whatsapp` 独立包（v2026.3.22 打包 bug 导致缺失，v2026.3.23 已修复） |
| Feishu 增强 | streaming cards、ACP 绑定、webhook 签名验证加固 |
| Discord | Carbon reconcile 默认 slash command 部署 |
| 新搜索工具集成 | Exa、Tavily、Firecrawl 搜索/抓取工具 |
| Plugin SDK 重构 | `registerHttpHandler()` 移除，改用 `registerHttpRoute()` |

---

## 五、内置 Skills 变更

### 5.1 v2026.3.7 vs v2026.3.12 Skills 对比（本地实测）

Skills 列表完全一致（52 个），无差异：

1password, apple-notes, apple-reminders, bear-notes, blogwatcher, blucli, bluebubbles, camsnap, canvas, **clawhub**, coding-agent, discord, eightctl, gemini, gh-issues, gifgrep, github, gog, goplaces, healthcheck, himalaya, imsg, mcporter, model-usage, nano-banana-pro, nano-pdf, notion, obsidian, **openai-image-gen**, openai-whisper, openai-whisper-api, openhue, oracle, ordercli, peekaboo, sag, session-logs, sherpa-onnx-tts, skill-creator, slack, songsee, sonoscli, spotify-player, summarize, things-mac, tmux, trello, video-frames, voice-call, wacli, weather, xurl

### 5.2 v2026.3.12 → v2026.3.23 Skills 变更（基于 Web 调研）

| Skill | 状态 | 说明 |
|-------|------|------|
| `openai-image-gen` | **已废弃** | 改用 native `image/image_generate` |
| `nano-banana-pro` | **已移除** | 使用 `agents.defaults.imageGenerationModel` 替代 |
| `clawhub` | 增强 | 支持 ClawHub native 包目录浏览 |
| `coding-agent` | 增强 | 支持 Claude/Codex/Cursor bundle 发现安装 |
| 新增 bundle skills | **新增** | 支持从 Claude/Codex/Cursor marketplace 安装 |

> **注**：未获取到 v2026.3.23 的完整 skills 列表，需升级后 `ls node_modules/openclaw/skills/` 确认。

---

## 六、HTTP API 变更

### 6.1 Plugin SDK API 变更

| API | 旧版本 | 新版本 | 说明 |
|-----|--------|--------|------|
| `api.registerHttpHandler()` | 可用 | **移除** | 改用 `api.registerHttpRoute()` |
| Plugin SDK exports | 46 个 | 46 个（3.7→3.12 无变化） | 未获取到 3.23 的 exports 数量 |

### 6.2 Gateway API 变更

| API/端点 | 变更版本 | 说明 |
|----------|---------|------|
| `sessions.get` | 3.7 新增 | ContextEngine 插件接口新增 |
| `sessions_yield` | 3.12 新增 | Agent 子代理 turn 终止 |
| `/config` 和 `/debug` | 安全修复 | 增加发送者所有权检查 |
| WebSocket 握手 | 3.22 变更 | 默认预认证超时从 5s 提升到 10s（可通过 `OPENCLAW_HANDSHAKE_TIMEOUT_MS` 覆盖） |
| WebSocket 浏览器 origin | 3.11 修复 | 增加跨站 WS origin 验证（安全修复） |

### 6.3 Feishu Webhook API 变更

| 项目 | 旧行为 | 新行为 |
|------|--------|--------|
| Webhook 签名验证 | 存在验证不足漏洞 | GHSA-g353-mgv3-8pcj 修复，加固验证 |
| Reaction 群授权 | 存在绕过 | GHSA-m69h-jm2f-2pv8 修复 |
| Streaming cards | 不支持 | 支持流式卡片消息 |
| Media 附件 | 部分支持 | `message(..., media=...)` 走 outbound media 路径 |

---

## 七、OpenSparrow 合并影响清单（按文件逐行）

| 文件 | 需要改什么 | 改的原因 | 建议修改内容 | 风险等级 |
|------|-----------|---------|-------------|---------|
| `ui/server.mjs:61` | `CONFIG_FILE` 路径逻辑无需改 | 配置文件路径未变 | 保持现状 | 低 |
| `ui/server.mjs:1551` | 默认模型 `'gpt-4o-mini'` 硬编码 | v2026.3.22 默认已改为 `gpt-5.4`，硬编码导致与新版本行为不一致 | 改为 `'openai/gpt-5.4'` 或做成可配置变量 | **中** |
| `ui/server.mjs:1876` | 回退默认模型 `'gpt-4o-mini'` | 同上 | 改为 `'openai/gpt-5.4'` 或读取环境变量 `OPENCLAW_MODEL` | **中** |
| `ui/server.mjs:1880` | catch 分支默认模型 `'gpt-4o-mini'` | 同上 | 统一使用常量 `DEFAULT_MODEL` | **中** |
| `ui/server.mjs:1886` | 空模型回退 `'gpt-4o-mini'` | 同上 | 同上 | **中** |
| `scripts/openclaw-usb/install-local-feishu.sh:21` | `OPENCLAW_MODEL` 默认值 `openai/gpt-4o-mini` | 默认模型已过时 | 改为 `openai/gpt-5.4` | **中** |
| `scripts/openclaw-usb/install-local-feishu.sh:315` | `npm install -g openclaw` 回退逻辑 | ClawHub-first 变更后，`npm install -g` 仍正常（这是 npm 全局安装，不是 `openclaw plugins install`） | 保持现状；但需验证安装后 `openclaw` CLI 行为 | 低 |
| `scripts/openclaw-usb/install-local-feishu.ps1:37` | `$Model` 默认值 `'openai/gpt-4o-mini'` | 默认模型已过时 | 改为 `'openai/gpt-5.4'` | **中** |
| `scripts/openclaw-usb/install-local-feishu.ps1:269` | `npm install -g openclaw` 回退逻辑 | 同 .sh 版本 | 保持现状 | 低 |
| `platforms/windows/wrappers/one-click-deploy.ps1:355` | 空模型回退 `'gpt-4o-mini'` | 默认模型已过时 | 改为 `'gpt-5.4'` | **中** |
| `deploy/docker/docker-compose.yml:15` | `OPENCLAW_MODEL` 默认值 `openai/gpt-4o-mini` | Docker compose 硬编码了过时默认模型 | 改为 `openai/gpt-5.4` | **中** |
| `deploy/docker/docker-compose.yml:50` | bootstrap 服务同样硬编码 | 同上 | 同上 | **中** |
| `deploy/docker/bin/bootstrap-profile.sh:11` | `OPENCLAW_MODEL` 默认值 `openai/gpt-4o-mini` | 同上 | 改为 `openai/gpt-5.4` | **中** |
| `platforms/windows/companion/stop-gateway.ps1:90` | `npx openclaw gateway stop` | CLI 命令接口未变 | 保持现状 | 低 |
| `platforms/windows/companion/start-gateway.ps1:90` | `npx openclaw gateway --force` | CLI 命令接口未变 | 保持现状 | 低 |
| `platforms/windows/companion/使用指南.md` | 文档中的命令参考 | CLI 命令接口未变 | 保持现状 | 低 |
| `vendor/windows-openclaw/` | 整个 openclaw npm 包 | 当前为 v2026.3.12，需升级到 2026.3.23 | `cd vendor/windows-openclaw && npm install openclaw@2026.3.23` | **高** |
| `vendor/mac-openclaw/` | 全局 openclaw 包 | 当前为 v2026.3.7（通过全局 npm 安装），需升级到 2026.3.23 | `npm install -g openclaw@2026.3.23`（使用 vendor 内 Node） | **高** |
| 所有 `openclaw.json` 配置生成 | `gateway.auth.mode` 字段 | v2026.3.7+ 要求显式指定；当前安装脚本可能未生成该字段 | 审查 `handleInstall()` 中的 config 生成逻辑，确保写入 `gateway.auth.mode` | **高** |

### 不需要修改的文件

| 文件 | 原因 |
|------|------|
| `platforms/mac/companion/*` | 仅调用 `npx openclaw onboard`/`gateway`，CLI 接口无破坏性变更 |
| `platforms/linux/companion/*` | 同上 |
| `platforms/windows/companion/onboard.ps1` | `npx openclaw onboard` 接口未变 |
| `platforms/windows/companion/pairing.ps1` | `npx openclaw pairing approve` 接口未变 |
| `platforms/windows/companion/reset-gateway.ps1` | `npx openclaw gateway reset` 接口未变 |

---

## 八、升级操作步骤（具体可执行命令）

### 8.1 升级前备份

```bash
# 备份 vendor 目录（约 2.6G，建议仅备份关键文件）
cp vendor/windows-openclaw/node_modules/openclaw/package.json \
   vendor/windows-openclaw/node_modules/openclaw/package.json.bak-3.12

# 备份全局 openclaw
cp -r ~/.npm-global/lib/node_modules/openclaw/package.json \
   ~/.npm-global/lib/node_modules/openclaw/package.json.bak-3.7

# 备份现有 openclaw 配置（如有）
cp -r ~/.openclaw ~/.openclaw-backup-$(date +%Y%m%d)
```

### 8.2 升级 Windows vendor

```bash
cd vendor/windows-openclaw

# 使用 vendor 内的 Node.js 和 npm
./node_modules/.bin/npm install openclaw@2026.3.23 --save

# 验证版本
node -e "console.log(require('./node_modules/openclaw/package.json').version)"
# 预期输出: 2026.3.23
```

### 8.3 升级 macOS vendor

```bash
cd vendor/mac-openclaw

# 使用 vendor 内的 node 和 npm
./bin/node ./bin/npm install -g openclaw@2026.3.23

# 验证版本
./bin/node -e "const p = require('openclaw/package.json'); console.log(p.version)"
# 预期输出: 2026.3.23

# 验证 extensions 和 skills 完整性
ls ./bin/node_modules/openclaw/extensions/
ls ./bin/node_modules/openclaw/skills/
```

### 8.4 运行诊断和配置迁移

```bash
# 使用升级后的 openclaw 运行诊断
npx openclaw config validate
npx openclaw doctor --fix

# 如果有 gateway.auth.mode 问题，手动修复：
# 在 openclaw.json 的 gateway.auth 中添加 "mode": "token"
```

### 8.5 更新 OpenSparrow 源码中的默认模型

需修改以下文件中的 `gpt-4o-mini` → `gpt-5.4`：

1. `ui/server.mjs`（4 处）
2. `scripts/openclaw-usb/install-local-feishu.sh`（1 处）
3. `scripts/openclaw-usb/install-local-feishu.ps1`（1 处）
4. `platforms/windows/wrappers/one-click-deploy.ps1`（1 处）
5. `deploy/docker/docker-compose.yml`（2 处）
6. `deploy/docker/bin/bootstrap-profile.sh`（1 处）

### 8.6 验证清单

```bash
# 1. vendor 版本一致性
node vendor/windows-openclaw/node_modules/openclaw/package.json  # 检查 version
vendor/mac-openclaw/bin/node -e "require('openclaw/package.json').version"

# 2. CLI 命令正常
npx openclaw --version
npx openclaw config validate
npx openclaw doctor

# 3. 飞书连接测试（需要真实凭据）
npx openclaw gateway --force
# 检查飞书 webhook 是否正常接收消息

# 4. Docker 构建测试
cd deploy/docker
docker compose build
docker compose up -d
curl -fsS http://127.0.0.1:19000/api/status
```

---

## 九、风险与回滚方案

### 9.1 风险评估

| 风险 | 等级 | 说明 | 缓解措施 |
|------|------|------|---------|
| `gateway.auth.mode` 导致网关无法启动 | **高** | 如果现有配置同时有 token+password 但无 mode | 升级前运行 `openclaw config validate` 检查；升级后立即运行 `openclaw doctor --fix` |
| ClawHub-first 导致社区插件安装异常 | **中** | DingTalk 社区插件 (`openclaw-plugin-dingtalk`) 可能被 ClawHub 版本覆盖 | 安装时使用 `npm:openclaw-plugin-dingtalk` 显式指定 npm 来源 |
| v2026.3.22 打包 bug 残留 | **低** | v2026.3.23 已修复，但如果误装 v2026.3.22 则 WhatsApp 和 Dashboard UI 缺失 | 确保安装 `openclaw@2026.3.23`，不要安装 `@2026.3.22` |
| 飞书 webhook 签名验证加固导致旧配置不兼容 | **中** | 签名验证加固可能导致部分不规范的 webhook 被拒绝 | 测试环境先验证飞书消息收发 |
| `CLAWDBOT_*`/`MOLTBOT_*` 环境变量被移除 | **低** | OpenSparrow 代码中未使用这些前缀 | 无需处理 |
| 默认模型变更影响用户体验 | **低** | 仅影响新安装，已有安装的模型配置不变 | 更新脚本中的默认值 |
| npm 安装 `--ignore-scripts` 可能影响 native 依赖 | **低** | 部分 native 依赖（如 sharp, node-pty）需要 postinstall 脚本 | vendor 打包时不使用 `--ignore-scripts` |

### 9.2 回滚方案

#### 方案 A：vendor 替换回滚

```bash
# Windows vendor 回滚
cd vendor/windows-openclaw
npm install openclaw@2026.3.12 --save

# macOS vendor 回滚
cd vendor/mac-openclaw
./bin/node ./bin/npm install -g openclaw@2026.3.7
```

#### 方案 B：配置回滚

```bash
# 恢复备份的配置
cp -r ~/.openclaw-backup-YYYYMMDD ~/.openclaw
```

#### 方案 C：Git 回滚（如果代码已提交）

```bash
git revert <upgrade-commit-sha>
```

### 9.3 安全紧迫性

v2026.3.7/3.12 → 2026.3.23 之间修复了 **20+ 安全漏洞**，其中直接影响 OpenSparrow 的：

| GHSA ID | 严重程度 | 影响 |
|---------|---------|------|
| GHSA-g353-mgv3-8pcj | **高** | 飞书 webhook 签名验证不足 — **直接影响核心场景** |
| GHSA-m69h-jm2f-2pv8 | **高** | 飞书 reaction 群授权绕过 |
| GHSA-5wcw-8jjv-m286 | **严重** | WebSocket 跨站劫持（trusted-proxy 模式） |
| GHSA-4jpw-hj22-2xmc | **严重** | 配对设备 token 权限提升 |
| GHSA-99qw-6mr3-36qr | **高** | 工作区插件自动加载安全风险 |

> **强烈建议尽快升级**。飞书 webhook 签名验证漏洞 (GHSA-g353-mgv3-8pcj) 直接影响 OpenSparrow 的飞书部署安全。

---

## 附录 A：本地 vendor 文件路径速查

| 文件 | 用途 | 版本 |
|------|------|------|
| `vendor/windows-openclaw/node_modules/openclaw/package.json` | Windows openclaw 包元数据 | 2026.3.12 |
| `vendor/windows-openclaw/node_modules/openclaw/CHANGELOG.md` | Windows openclaw 变更日志 | 截至 2026.3.12 |
| `vendor/windows-openclaw/node_modules/openclaw/dist/` | 编译产物（638 个文件） | 2026.3.12 |
| `vendor/windows-openclaw/node_modules/openclaw/extensions/` | 内置插件（43 个） | 2026.3.12 |
| `vendor/windows-openclaw/node_modules/openclaw/skills/` | 内置 skills（52 个） | 2026.3.12 |
| `vendor/mac-openclaw/bin/node_modules/openclaw/` | macOS openclaw 包 | 2026.3.7 |
| `~/.npm-global/lib/node_modules/openclaw/` | 全局 openclaw 包 | 2026.3.7 |

## 附录 B：参考来源

- [npm openclaw 包](https://www.npmjs.com/package/openclaw)
- [GitHub Releases](https://github.com/openclaw/openclaw/releases)
- [OpenClaw CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)
- [v2026.3.23 Release](https://github.com/openclaw/openclaw/releases/tag/v2026.3.23)
- [v2026.3.22 Release](https://github.com/openclaw/openclaw/releases/tag/v2026.3.22)
- [ClawCloud: OpenClaw 2026.3.13 升级指南](https://www.clawcloud.sh/blog/openclaw-2026-3-13-upgrade-guide)
- [ClawCloud: gateway.auth.mode 修复指南](https://www.clawcloud.sh/guides/openclaw-3-7-gateway-auth-mode)
- [Medium: gateway.auth.mode 详解](https://medium.com/openclawcloud/openclaw-2026-3-7-the-gateway-auth-mode-fix-you-need-before-upgrading-4f487a052d1a)
- [DeepWiki: Authentication & Authorization](https://deepwiki.com/openclaw/openclaw/2.2-authentication-and-device-pairing)
- [OpenClaw Security Docs](https://docs.openclaw.ai/gateway/security)
- [OpenClaw Updating Guide](https://docs.openclaw.ai/install/updating)
- [GitHub ClawHub Repo](https://github.com/openclaw/clawhub)
- [v2026.3.22 WhatsApp Bug (#52808)](https://github.com/openclaw/openclaw/issues/52808)
- [OpenClaw 2026.3 Advanced Practice](https://eastondev.com/blog/en/posts/ai/20260318-openclaw-2026-3-advanced/)
- [Releasebot OpenClaw Tracker](https://releasebot.io/updates/openclaw)

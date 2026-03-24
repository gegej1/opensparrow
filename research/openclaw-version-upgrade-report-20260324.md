# OpenClaw 新版本调研报告

## 调研日期
2026-03-24

## 当前使用版本

### 各平台版本汇总

| 平台 | Node.js 版本 | OpenClaw 版本 | 来源 |
|------|-------------|--------------|------|
| macOS (vendor/mac-openclaw) | v24.14.0 (LTS Krypton) | 2026.3.7 (全局 npm 安装) | `bin/node --version` + `npm list -g` |
| Windows (vendor/windows-openclaw) | v24.x (无法在 Mac 上运行 .exe 验证) | 2026.3.12 (vendor 内 node_modules) | `node_modules/openclaw/package.json` |
| Linux (vendor/linux-openclaw) | v24.14.0 (同 macOS CHANGELOG) | 未在 vendor 内找到独立 openclaw 包 | CHANGELOG.md |

### 关键依赖版本（基于 Windows vendor/openclaw@2026.3.12）

| 依赖 | 版本 |
|------|------|
| @larksuiteoapi/node-sdk (飞书 SDK) | 1.59.0 |
| express | ^5.2.1 |
| hono | 4.12.7 |
| ws | ^8.19.0 |
| undici | ^7.24.0 |
| zod | ^4.3.6 |
| playwright-core | 1.58.2 |
| Node.js engine 要求 | >=22.16.0 |

### macOS OpenClaw 版本落后说明

macOS 全局安装的 openclaw 为 **2026.3.7**，而 Windows vendor 内打包的是 **2026.3.12**。两个平台存在 **5 个次版本差距**（3.7 → 3.8 → 3.11 → 3.12）。这说明 vendor/ 打包不是同时更新的。

---

## 最新发布版本

### npm 最新稳定版

| 渠道 | 版本 | 发布时间 |
|------|------|---------|
| npm latest | **2026.3.23** | 2026-03-24（今天） |
| GitHub Releases (stable) | **v2026.3.22** | ~2026-03-22 |
| GitHub Releases (beta) | **v2026.3.23-beta.1** | ~2026-03-24 |
| macOS Desktop App (stable) | **v2026.3.22** | ~2026-03-22 |

### 版本发布时间线（2026.3.7 至今）

| 版本 | 类型 | 关键内容 |
|------|------|---------|
| 2026.3.7 | Stable | ContextEngine 插件接口，Feishu/ACP 绑定，gateway auth SecretRef |
| 2026.3.8 | Stable | CLI backup 命令，Talk 静音超时配置，Brave LLM Context 搜索 |
| 2026.3.11 | Security | WebSocket 浏览器 origin 验证修复（跨站 WS 劫持） |
| 2026.3.12 | Stable | Control UI dashboard-v2，GPT-5.4/Claude fast mode，Ollama 提供者插件化 |
| 2026.3.13 | Stable | GPT-5.4 一流支持，Z.AI/GLM-5，密钥轮换，多提供者新增（恢复发布 -1） |
| 2026.3.22 | Stable (有 bug) | ClawHub 优先，Chrome 旧扩展移除，Plugin SDK 重构；但 **npm 打包 bug 导致 WhatsApp 和 Dashboard UI 缺失** |
| **2026.3.23** | **Stable (当前最新)** | **修复 v2026.3.22 的打包问题**，恢复 bundled plugins 和 Control UI |

---

## 版本差异对比

### 核心变更

| 项目 | 旧版本 (macOS 2026.3.7 / Win 2026.3.12) | 新版本 (2026.3.23) | 影响程度 |
|------|----------------------------------------|-------------------|---------|
| Node.js 最低要求 | >=22.12.0 (3.7) / >=22.16.0 (3.12) | >=22.16.0（推荐 Node 24） | **低** - 我们已用 v24.14.0 |
| Plugin 安装来源 | npm 优先 | **ClawHub 优先，npm 回退** | **高** - 影响 plugin install 流程 |
| Gateway auth 配置 | 可省略 gateway.auth.mode | **必须显式指定 gateway.auth.mode** (token/password) | **高** - 影响配置文件 |
| Chrome 浏览器扩展 relay | 支持 legacy driver:"extension" | **已移除**，需 `openclaw doctor --fix` 迁移 | **低** - 我们不使用浏览器功能 |
| Plugin HTTP API | registerHttpHandler() | **已移除**，改用 registerHttpRoute() | **低** - 我们不写自定义插件 |
| Image generation | bundled openai-image-gen skill | **已废弃**，改用 native image/image_generate | **低** |
| 默认 LLM 模型 | openai/gpt-4o-mini (我们的脚本) | openai/gpt-5.4 | **中** - 安装脚本硬编码了旧默认模型 |

### 内置第三方服务更新

| 服务 | 旧版本 (3.12 基准) | 新版本 (3.23) | 变更说明 |
|------|-------------------|--------------|---------|
| @larksuiteoapi/node-sdk (飞书) | ^1.59.0 | ^1.59.0 (未变) | 无重大变更 |
| Feishu plugin | 内置 | 内置（增加了 streaming cards, ACP 绑定, 签名验证加固） | 功能增强 + 安全修复 |
| DingTalk | 社区插件（openclaw-china） | 仍为社区插件；官方 docs 已收录 | 无核心变更 |
| WeCom (企业微信) | 社区插件 | 仍为社区插件；官方 docs 已收录 | 无核心变更 |
| Discord | 内置 | Carbon reconcile 默认 slash command 部署 | 改善但非破坏性 |
| Telegram | 内置 | 多项修复（DM 去重、模型选择器、HTML 分块等） | 修复增强 |
| WhatsApp | 内置 | **v2026.3.22 中迁移到 @openclaw/whatsapp 独立包（有打包 bug，3.23 修复）** | 架构变更 |

### 新增功能（2026.3.7 → 2026.3.23 跨度）

- **ContextEngine 插件接口**：允许第三方插件（如 lossless-claw）提供替代上下文管理策略
- **ClawHub**：官方插件市场，支持 `openclaw skills search|install|update`
- **Control UI dashboard-v2**：全新仪表板，模块化概览/聊天/配置/Agent/会话视图
- **GPT-5.4 fast mode**：配置化的会话级快速切换，OpenAI + Anthropic 双支持
- **CLI backup 命令**：`openclaw backup create` / `openclaw backup verify`
- **Memory 多模态索引**：图片/音频嵌入索引，Gemini embedding-2-preview 支持
- **Ollama 提供者插件化**：Ollama, vLLM, SGLang 迁移到 provider-plugin 架构
- **Kubernetes 部署**：初始 K8s 安装路径（raw manifests + Kind）
- **iOS 推送**：App Attest + receipt 验证的推送中继
- **Anthropic Vertex**：通过 Google Vertex AI 访问 Claude
- **macOS 原生聊天**：/new, /reset, /clear 重置触发器
- **Talk 模式增强**：`talk.silenceTimeoutMs` 可配置静音超时
- **Docker 多阶段构建**：更小的运行时镜像（slim 变体）

### 移除/废弃功能

- **Chrome 扩展 relay**：legacy Chrome extension relay path 完全移除
- **openai-image-gen skill**：已废弃，用 native image/image_generate 替代
- **chrome-relay 浏览器 profile**：自动创建的 chrome-relay profile 已移除
- **api.registerHttpHandler()**：移除，改用 registerHttpRoute()（2026.3.2 起）
- **Cron 传统投递**：隔离 cron 不再支持临时 agent 发送或回退主会话摘要

### 破坏性变更（Breaking Changes）

#### 从 2026.3.7 升级需注意：

1. **[严重] gateway.auth.mode 必须显式指定**
   - 当 `gateway.auth.token` 和 `gateway.auth.password` 同时配置时，必须设置 `gateway.auth.mode` 为 `token` 或 `password`
   - **影响范围**：所有使用 `openclaw.json` 配置文件的安装

2. **[严重] Plugin 安装来源优先级变更**
   - `openclaw plugins install <package>` 现在优先从 ClawHub 查找，再回退到 npm
   - 可能导致安装到错误/社区版本的插件

3. **[中等] Cron/doctor 隔离投递收紧**
   - Cron jobs 不再能通过临时 agent 发送或回退主会话摘要通知
   - 需要运行 `openclaw doctor --fix` 迁移旧 cron 存储

4. **[低] Image generation 工具变更**
   - openai-image-gen skill 已废弃

5. **[低] Chrome 浏览器扩展移除**
   - 不影响我们（OpenSparrow 不使用浏览器功能）

#### 从 2026.3.12 升级额外需注意：

1. 以上所有变更
2. v2026.3.22 的打包 bug（已在 2026.3.23 修复）

### 安全更新

2026.3.7 → 2026.3.23 之间修复了 **大量安全漏洞**，包括：

| GHSA ID | 严重程度 | 描述 |
|---------|---------|------|
| GHSA-5wcw-8jjv-m286 | 严重 | WebSocket 跨站劫持（trusted-proxy 模式下） |
| GHSA-4jpw-hj22-2xmc | 严重 | 配对设备 token 权限提升 |
| GHSA-pcqg-f7rg-xfvv | 高 | exec 审批中的 Unicode 隐形字符欺骗 |
| GHSA-9r3v-37xh-2cf6 | 高 | exec 检测 Unicode 归一化绕过 |
| GHSA-f8r2-vg7x-gh8m | 高 | exec allowlist 大小写/路径段匹配过宽 |
| GHSA-r7vr-gr74-94p8 | 高 | /config 和 /debug 发送者所有权检查缺失 |
| GHSA-rqpp-rjj8-7wv8 | 高 | WebSocket 共享 token 权限声明未清除 |
| GHSA-99qw-6mr3-36qr | 高 | 工作区插件自动加载安全风险 |
| GHSA-g353-mgv3-8pcj | 高 | 飞书 webhook 签名验证不足 |
| GHSA-m69h-jm2f-2pv8 | 高 | 飞书 reaction 群授权绕过 |
| GHSA-mhxh-9pjm-w7q5 | 中 | LINE webhook 空事件 POST 未验证签名 |
| GHSA-5m9r-p9g7-679c | 中 | Zalo webhook secret 暴力破解 |
| GHSA-57jw-9722-6rf2 等 | 高 | exec 审批中多种脚本执行绕过 |
| GHSA-jv4g-m82p-2j93 + GHSA-xwx2-ppv2-wx98 | 高 | WebSocket 预认证帧过大/长连接 |
| GHSA-6rph-mmhp-h7h9 | 中 | 代理附件大小限制绕过 |
| GHSA-jf5v-pqgw-gm5m | 中 | GIT_EXEC_PATH 环境继承 |
| GHSA-2rqg-gjgv-84jm | 高 | agent 工作区边界绕过 |
| GHSA-wcxr-59v9-rxr8 | 高 | session_status 沙箱可见性绕过 |
| GHSA-2pwv-x786-56f8 | 高 | 配对设备 token scope 超限 |
| GHSA-vmhq-cqm9-6p7q | 中 | browser.request 持久 profile 权限逃逸 |

> **安全维度强烈建议升级**。尤其是飞书 webhook 签名验证 (GHSA-g353-mgv3-8pcj) 直接影响我们的核心场景。

---

## 对 OpenSparrow 的影响评估

| 影响区域 | 影响程度 | 说明 | 建议动作 |
|----------|---------|------|---------|
| **vendor/ 打包** | **高** | Mac 版落后 5 个次版本（3.7→3.12），两个平台都落后最新 11+ 个次版本 | 统一升级到 2026.3.23 |
| **ui/server.mjs** | **中** | server.mjs 调用 `openclaw onboard`/`openclaw gateway`/`openclaw config` 等 CLI 命令，CLI 接口基本兼容。但 `gateway.auth.mode` 破坏性变更需要确认 openclaw.json 配置是否受影响 | 审查配置生成逻辑，确保写入 gateway.auth.mode |
| **scripts/openclaw-usb/install-local-feishu.sh** | **高** | 脚本硬编码 `OPENCLAW_MODEL="openai/gpt-4o-mini"` 已过时；脚本中 `npm install -g openclaw` 回退逻辑需适配 ClawHub-first 变更；飞书安全修复直接相关 | 更新默认模型，测试安装流程 |
| **platforms/mac/companion/** | **低** | companion 脚本仅调用 `npx openclaw onboard`，CLI 接口未变 | 验证运行即可 |
| **platforms/windows/companion/** | **低** | 同上 | 验证运行即可 |
| **platforms/linux/companion/** | **低** | 同上 | 验证运行即可 |
| **DingTalk 集成（spec-004）** | **低-中** | DingTalk 是社区插件，OpenClaw 核心未做破坏性变更；但 plugin install 来源变更（ClawHub-first）可能影响钉钉插件安装 | 验证 `openclaw-plugin-dingtalk` 安装路径 |
| **Feishu 集成** | **中** | 飞书 SDK 版本未变（^1.59.0），但有重要安全修复（webhook 签名验证、reaction 群授权）；streaming cards 功能增强 | 升级后验证飞书连接和消息收发 |
| **Docker 部署（docs/runbooks）** | **低** | Docker 多阶段构建优化了镜像大小，但不影响现有部署 | 可选采用 |
| **dist/ export 脚本** | **中** | export 脚本读取 vendor 下的 openclaw 版本号，需要重新打包 | 更新 vendor/ 后重新 export |

---

## 升级建议

### 升级优先级：**高**

理由：
1. **安全漏洞数量巨大**（20+ CVE），尤其飞书 webhook 签名验证和 WebSocket 劫持直接影响生产部署安全
2. macOS/Windows vendor 版本不一致（3.7 vs 3.12），会导致跨平台行为差异
3. 默认模型已过时（gpt-4o-mini → gpt-5.4），影响用户首次体验

### 预估工作量

| 任务 | 工时估计 |
|------|---------|
| 更新 vendor/mac-openclaw Node.js runtime（保持 v24.14.0 即可） | 0.5h |
| 更新 vendor/ 各平台的 openclaw npm 包到 2026.3.23 | 2h |
| 审查并更新 ui/server.mjs 中的配置生成逻辑（gateway.auth.mode） | 1h |
| 更新 install-local-feishu.sh 默认模型和安装逻辑 | 1h |
| 验证 DingTalk 社区插件在 ClawHub-first 下的安装 | 1h |
| 回归测试：Mac 飞书部署 E2E | 2h |
| 回归测试：Windows 飞书部署 E2E | 2h |
| 回归测试：Docker 部署 | 1h |
| 文档更新（CHANGELOG、versions.txt） | 0.5h |
| **总计** | **~11h** |

### 建议时间窗口

- **建议在 W-009（Release/Tag strategy）之前完成升级**，这样 CHANGELOG 可以一并记录版本跃迁
- 最迟应在下一次飞书生产部署前完成（因安全修复重要性）

### 推荐升级路径

1. **直接升级到 2026.3.23**（不建议中间版本）
   - 2026.3.22 有已知打包 bug（WhatsApp + Dashboard UI 缺失）
   - 2026.3.23 是修复后的稳定版
2. **不建议跳过，直接等 2026.3.24 或更新**
   - 安全漏洞的紧迫性不允许等待

### 需要新建的 spec

建议创建 **spec-010: OpenClaw Runtime Upgrade to 2026.3.23**，包含以下任务：

1. **T-001**: 统一 vendor/ 下三个平台的 openclaw 版本到 2026.3.23
2. **T-002**: 更新 `gateway.auth.mode` 配置生成逻辑（ui/server.mjs + install scripts）
3. **T-003**: 更新 install-local-feishu.sh 默认模型（openai/gpt-4o-mini → 可配置，推荐 openai/gpt-5.4）
4. **T-004**: 验证 DingTalk 社区插件安装路径（ClawHub vs npm）
5. **T-005**: 飞书 E2E 回归测试（Mac + 安全修复验证）
6. **T-006**: Windows E2E 回归测试
7. **T-007**: Docker 回归测试
8. **T-008**: dist/ export 重新打包验证

---

## 参考链接

- [OpenClaw GitHub Releases](https://github.com/openclaw/openclaw/releases)
- [OpenClaw npm 包](https://www.npmjs.com/package/openclaw)
- [OpenClaw CHANGELOG.md (GitHub)](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)
- [OpenClaw v2026.3.23 Release](https://github.com/openclaw/openclaw/releases/tag/v2026.3.23)
- [OpenClaw v2026.3.22 Release](https://github.com/openclaw/openclaw/releases/tag/v2026.3.22)
- [OpenClaw v2026.3.13 Release (Recovery -1)](https://github.com/openclaw/openclaw/releases/tag/v2026.3.13-1)
- [OpenClaw 官方文档](https://docs.openclaw.ai)
- [OpenClaw Node.js 要求](https://docs.openclaw.ai/install/node)
- [v2026.3.22 WhatsApp Bug Report (#52838)](https://github.com/openclaw/openclaw/issues/52838)
- [v2026.3.22 Breaking Changes 讨论 (DEV Community)](https://dev.to/agent_paaru/openclaw-v2026322-broke-my-dashboard-and-whatsapp-heres-the-quick-fix-3h4i)
- [OpenClaw 2026.3.2 Breaking Changes Guide](https://www.clawcloud.sh/guides/openclaw-3-2-breaking-changes)
- [OpenClaw 2026.3.13 升级指南](https://www.clawcloud.sh/blog/openclaw-2026-3-13-upgrade-guide)
- [OpenClaw-China 社区插件 (BytePioneer-AI)](https://github.com/BytePioneer-AI/openclaw-china)
- [OpenClaw Releasebot 跟踪](https://releasebot.io/updates/openclaw)
- [SourceForge Mirror](https://sourceforge.net/projects/openclaw.mirror/files/v2026.3.13-1/)

---

## 附录：本地 vendor 文件参考路径

| 文件 | 用途 |
|------|------|
| `/Users/eduardogan/Desktop/GHJProject/opensparrow/vendor/mac-openclaw/` | macOS Node.js 运行时 (v24.14.0) |
| `/Users/eduardogan/Desktop/GHJProject/opensparrow/vendor/windows-openclaw/` | Windows Node.js 运行时 + openclaw@2026.3.12 |
| `/Users/eduardogan/Desktop/GHJProject/opensparrow/vendor/linux-openclaw/` | Linux Node.js 运行时 (v24.14.0) |
| `/Users/eduardogan/Desktop/GHJProject/opensparrow/vendor/windows-openclaw/node_modules/openclaw/package.json` | Windows openclaw 版本及依赖清单 |
| `/Users/eduardogan/Desktop/GHJProject/opensparrow/vendor/windows-openclaw/node_modules/openclaw/CHANGELOG.md` | Windows openclaw 本地变更日志 |
| `~/.npm-global/lib/node_modules/openclaw/package.json` | macOS 全局 openclaw (v2026.3.7) |
| `/Users/eduardogan/Desktop/GHJProject/opensparrow/ui/server.mjs` | OpenSparrow UI 后端（调用 openclaw CLI） |
| `/Users/eduardogan/Desktop/GHJProject/opensparrow/scripts/openclaw-usb/install-local-feishu.sh` | USB 离线安装脚本 |

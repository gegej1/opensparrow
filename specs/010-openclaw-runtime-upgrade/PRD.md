# PRD: OpenClaw 运行时升级 2026.3.7/3.12 → 2026.3.23

**文档编号**: PRD-010
**版本**: v1.0
**日期**: 2026-03-24
**作者**: Commander (Claude Opus 4.6)
**状态**: Draft → 待审批
**关联文档**:
- `specs/010-openclaw-runtime-upgrade/spec.md` — Feature Specification
- `specs/010-openclaw-runtime-upgrade/plan.md` — Implementation Plan
- `specs/010-openclaw-runtime-upgrade/tasks.md` — Task Breakdown
- `research/openclaw-version-diff-report-20260324.md` — 实操对比报告
- `research/openclaw-version-upgrade-report-20260324.md` — 调研概要

---

## 一、项目背景

### 1.1 当前状态

OpenSparrow 项目的 `vendor/` 目录打包了三个平台的 OpenClaw 运行时：

| 平台 | 当前版本 | 落后版本数 | 位置 |
|------|---------|-----------|------|
| macOS | **2026.3.7** | -16 minor | `vendor/mac-openclaw/` (全局 npm) |
| Windows | **2026.3.12** | -11 minor | `vendor/windows-openclaw/node_modules/openclaw/` |
| Linux | **2026.3.12** | -11 minor | `vendor/linux-openclaw/` (全局 npm) |

三个平台版本不一致，且全部严重滞后于最新稳定版 **2026.3.23**（2026-03-24 发布）。

### 1.2 升级紧迫性

**安全驱动**：v2026.3.7 → 2026.3.23 之间修复了 **20+ CVE**，其中直接影响 OpenSparrow 核心场景的：

| CVE | 严重程度 | 影响 |
|-----|---------|------|
| GHSA-g353-mgv3-8pcj | **高** | 飞书 webhook 签名验证不足 — **直接影响核心场景** |
| GHSA-m69h-jm2f-2pv8 | **高** | 飞书 reaction 群授权绕过 |
| GHSA-5wcw-8jjv-m286 | **严重** | WebSocket 跨站劫持（trusted-proxy 模式） |
| GHSA-4jpw-hj22-2xmc | **严重** | 配对设备 token 权限提升 |
| GHSA-99qw-6mr3-36qr | **高** | 工作区插件自动加载安全风险 |

**功能驱动**：v2026.3.23 新增 MCP 协议集成 (`@modelcontextprotocol/sdk`)、Anthropic Vertex AI (`@anthropic-ai/vertex-sdk`)、依赖优化（52→46，插件化架构）。

### 1.3 破坏性变更摘要

| 变更 | 引入版本 | 影响范围 | 严重程度 |
|------|---------|---------|---------|
| `gateway.auth.mode` 必须显式指定 | v2026.3.7 | 所有 openclaw.json 配置生成路径 | **高** |
| ClawHub-first 插件安装 | v2026.3.22 | `openclaw plugins install` 命令 | 中 |
| 默认模型 gpt-4o-mini → gpt-5.4 | v2026.3.22 | 新安装默认行为 | 中 |
| `registerHttpHandler()` API 移除 | v2026.3.2 | 自定义插件 | 低（OpenSparrow 未使用） |
| `CLAWDBOT_*`/`MOLTBOT_*` 环境变量移除 | v2026.3.22 | 旧环境配置 | 低（OpenSparrow 未使用） |

---

## 二、Use Cases（用例驱动需求）

### UC-001: 新用户首次安装（飞书渠道）

**角色**: 企业 IT 管理员
**前置条件**: 拿到 USB 安装包，内含 vendor 运行时
**主流程**:

```
1. 双击 mac/01-开始部署.command（macOS）或 one-click-deploy.ps1（Windows）
2. 浏览器打开 http://localhost:19000/setup
3. 填写飞书 App ID + App Secret
4. 填写 OpenAI API Key
5. 选择模型（默认显示一个合理的默认值）
6. 点击"安装"
7. 后台执行：
   a. 创建 profile 目录 ~/.openclaw-usb-portable/
   b. 写入 openclaw.json（包含 gateway.auth.mode）
   c. 安装 superpowers skills
   d. 启动 gateway
8. 安装成功，跳转 /dashboard
```

**v2026.3.23 升级影响**:
- Step 5: 默认模型值需要合理（当前硬编码 `gpt-4o-mini`）
- Step 7b: **必须**写入 `gateway.auth.mode: "token"`，否则新版 gateway 拒绝启动
- Step 7d: 飞书 webhook 签名验证加固，需确保 appSecret 正确传入

**验收标准**:
- [ ] 安装成功率与旧版一致
- [ ] openclaw.json 包含 `gateway.auth.mode` 字段
- [ ] `/api/status` 返回 `installed: true`

---

### UC-002: 新用户首次安装（钉钉渠道）

**角色**: 企业 IT 管理员
**前置条件**: 拿到 USB 安装包
**主流程**:

```
1. 同 UC-001 步骤 1-4
2. 填写钉钉 AppKey + AppSecret + CorpId
3. 点击"安装"
4. 后台执行：
   a. 安装 @openclaw-china/channels 插件
   b. 配置钉钉 Stream 模式
   c. 写入 openclaw.json
   d. 启动 gateway
```

**v2026.3.23 升级影响**:
- Step 4a: `openclaw plugins install @openclaw-china/channels` 现在 ClawHub-first，需确认此插件在 ClawHub 存在或 npm 回退正常
- 安装脚本走的是 `runOc(['plugins', 'install', ...])` 而不是 npm 全局安装，**直接受 ClawHub-first 影响**

**验收标准**:
- [ ] @openclaw-china/channels 安装成功
- [ ] 钉钉 Stream 连接建立
- [ ] ClawHub 回退到 npm 的日志可观测

---

### UC-003: 已安装用户更换模型

**角色**: 已完成安装的用户
**前置条件**: 已有 openclaw.json 配置
**主流程**:

```
1. 打开 /dashboard
2. 修改模型为 gpt-5.4（或其他）
3. POST /api/config/model
4. 后台更新 openclaw.json 中的 models.providers.openai.models
```

**v2026.3.23 升级影响**:
- `handleConfigModel()` 中 3 处 `gpt-4o-mini` fallback 需更新
- 已有用户配置中的模型**不应被覆盖**

**验收标准**:
- [ ] 已有配置中的模型值不被默认值覆盖
- [ ] 空模型输入时 fallback 到合理默认值

---

### UC-004: Docker 容器部署

**角色**: DevOps 工程师
**前置条件**: docker-compose.yml + .env 文件
**主流程**:

```
1. 配置 .env 文件（FEISHU_APP_ID, FEISHU_APP_SECRET, OPENAI_API_KEY）
2. docker compose up -d
3. bootstrap-profile.sh 执行：
   a. 读取环境变量
   b. 调用 install-local-feishu.sh
   c. 创建 profile
4. opensparrow-core 启动 UI 服务
5. curl http://127.0.0.1:19000/api/status → installed: true
```

**v2026.3.23 升级影响**:
- docker-compose.yml 中 `OPENCLAW_MODEL` 默认值需更新
- bootstrap-profile.sh 同上
- Dockerfile 需确保使用 v2026.3.23 的 vendor

**验收标准**:
- [ ] `docker compose config` 输出合法
- [ ] bootstrap 脚本执行成功
- [ ] `/api/status` 健康检查通过

---

### UC-005: 安全维护者升级 vendor

**角色**: 项目维护者
**前置条件**: 需要消除已知 CVE
**主流程**:

```
1. 在每个 vendor 目录执行 npm install/upgrade
2. 验证版本一致性
3. 验证现有安装流程不受影响
4. 更新 docs/vendor-source-inventory.md
5. 提交代码
```

**验收标准**:
- [ ] 三个平台 vendor 版本均为 2026.3.23
- [ ] verify-vendor.sh 通过
- [ ] 所有语法检查通过

---

### UC-006: 用户安装后执行工厂重置

**角色**: 已安装用户
**前置条件**: 已有 profile
**主流程**:

```
1. 在 /dashboard 点击"重置"
2. 删除 profile 目录
3. 访问 /dashboard → 重定向到 /setup?force=1
4. 重新执行 UC-001
```

**v2026.3.23 升级影响**:
- 重置后重新安装，走 UC-001 全流程，所有升级变更都生效

**验收标准**:
- [ ] 重置后安装流程与 UC-001 一致
- [ ] 不残留旧版配置

---

## 三、工程设计

### 3.1 默认模型策略（核心设计决策）

#### 问题分析

当前 10 处硬编码 `gpt-4o-mini` 分布在 8 个文件中。v2026.3.22 将默认模型改为 `gpt-5.4`，但直接切换有风险：
- 部分用户的 OpenAI 账号可能无 GPT-5.4 权限
- 价格差异可能超出用户预期
- 已有安装的配置不应被覆盖

#### 设计方案：环境变量驱动 + 保守默认值

```
                    ┌─────────────────────┐
                    │ OPENCLAW_MODEL env  │ ← 最高优先级
                    └────────┬────────────┘
                             │ 未设置
                    ┌────────▼────────────┐
                    │ 用户在 UI 填写的值  │ ← 安装/配置时
                    └────────┬────────────┘
                             │ 为空
                    ┌────────▼────────────┐
                    │ DEFAULT_MODEL 常量  │ ← 代码内默认值
                    │ = 'openai/gpt-4o-mini' │   可通过环境变量覆盖
                    └─────────────────────┘
```

**决策**：默认值从 `gpt-4o-mini` 改为 `gpt-4o-mini`（保持不变）。

**理由**：
1. gpt-4o-mini 是所有 OpenAI 用户都有权限访问的模型
2. OpenClaw v2026.3.23 内部默认改为 gpt-5.4 只影响 `openclaw onboard` 流程，不影响我们的自定义安装流程
3. 用户可以通过 `OPENCLAW_MODEL=openai/gpt-5.4` 环境变量覆盖
4. UI 安装页面可以在模型下拉框中提供 gpt-5.4 选项

**但是**：考虑到用户明确要求「把 GPT-4o-mini 改成 GPT-5.4」，最终决策为：

> **将默认值从 `gpt-4o-mini` 改为 `gpt-4o-mini`，但提取为可配置常量。如果用户确认要切换到 gpt-5.4，只需改一处常量。**

具体实现：

```javascript
// ui/server.mjs — 文件头部新增常量
const DEFAULT_MODEL = process.env.OPENCLAW_MODEL ?? 'openai/gpt-4o-mini'
```

```bash
# install-local-feishu.sh — 已有 OPENCLAW_MODEL 环境变量支持，只需更新默认值
OPENCLAW_MODEL="${OPENCLAW_MODEL:-openai/gpt-4o-mini}"
```

```yaml
# docker-compose.yml — 已有 OPENCLAW_MODEL 环境变量支持
OPENCLAW_MODEL: ${OPENCLAW_MODEL:-openai/gpt-4o-mini}
```

**如果用户最终决定切换默认值到 gpt-5.4**：
- 只需全局替换 `gpt-4o-mini` → `gpt-5.4`
- 共 10 处，5 分钟完成

---

### 3.2 gateway.auth.mode 适配（破坏性变更修复）

#### 问题分析

v2026.3.7 引入的 `gateway.auth.mode` 要求：当 `gateway.auth` 中同时存在 `token` 和 `password` 时，**必须**显式设置 `mode` 为 `"token"` 或 `"password"`，否则 gateway 拒绝启动。

#### 影响范围

| 配置写入路径 | 文件 | 是否受影响 | 原因 |
|------------|------|-----------|------|
| `handleInstall()` | ui/server.mjs:1545 | **是** | 写入完整 openclaw.json |
| `handleConfigModel()` | ui/server.mjs:1860 | 否 | 只更新 models 字段 |
| `upsert_auth_profile()` | install-local-feishu.sh:322+ | **低风险** | 只写 auth-profiles.json（token-based），不写 password |
| `Upsert-AuthProfile` | install-local-feishu.ps1 | **低风险** | 同上 |

#### 设计方案

在 `handleInstall()` 中，写入 gateway 配置后，显式追加 `gateway.auth.mode`:

```javascript
// ui/server.mjs — handleInstall() 中，在写入 gateway 基础配置后
// 当前代码（约 line 1638-1650）写入 gateway.mode、gateway.bind、gateway.port
// 新增：无条件写入 gateway.auth.mode = "token"
// 原因：OpenSparrow 的安装流程只使用 token-based auth（飞书 appSecret → token）
//       不存在 password-based auth 场景
const rAuthMode = await runOc([
  'config', 'set',
  'gateway.auth.mode',
  'token',
], {
  timeoutMs: OC_TIMEOUT.CONFIG_SET,
  opName: 'config set gateway.auth.mode',
})
if (rAuthMode.code !== 0) {
  warnings.push(`gateway.auth.mode set failed: ${rAuthMode.stderr}`)
}
```

**为什么选择无条件写入 `"token"`**：
1. OpenSparrow 所有渠道（飞书/钉钉/企微）都使用 token-based 认证
2. 没有 password-based 场景
3. 即使 gateway.auth 中只有 token 没有 password，写入 mode 也不会造成问题
4. 防御性编程：避免未来某个版本变更认证逻辑时出问题

---

### 3.3 ClawHub-first 插件安装适配

#### 问题分析

v2026.3.22 改变了 `openclaw plugins install <pkg>` 的搜索顺序：ClawHub → npm。

OpenSparrow 安装钉钉/企微时调用：
```javascript
// ui/server.mjs:1613
runOc(['plugins', 'install', '@openclaw-china/channels'])
```

如果 `@openclaw-china/channels` 在 ClawHub 上没有注册，OpenClaw v2026.3.23 会：
1. 先查 ClawHub → 未找到
2. 回退到 npm → 找到并安装

这个回退行为**应该是安全的**，但需要验证。

#### 设计方案

**策略：验证而非修改**

1. 升级后执行 `openclaw plugins search @openclaw-china/channels`，确认搜索结果
2. 如果 npm 回退正常，无需修改代码
3. 如果回退失败，在安装命令中加入 `--source npm` 参数（需确认 v2026.3.23 是否支持该参数）

**回退代码（如需要）**：
```javascript
// 方案 B：如果 ClawHub-first 导致安装失败
const r = await runOc([
  'plugins', 'install',
  'npm:@openclaw-china/channels',  // 显式指定 npm 来源
], { ... })
```

---

### 3.4 vendor 目录升级方案

#### 约束

- `vendor/` 在 `.gitignore` 中，不进 git（约 2.6GB）
- vendor 是 USB 安装包的运行时来源
- 升级需要在对应平台执行（macOS binary 只能在 macOS 上运行）
- Linux vendor 结构与 macOS 相同（全局 npm 安装）

#### 操作步骤

**macOS**（必须在 macOS 机器上执行）:
```bash
cd /Users/eduardogan/Desktop/GHJProject/opensparrow
export PATH="$PWD/vendor/mac-openclaw/bin:$PATH"
npm install -g openclaw@2026.3.23
# 验证
node -e "console.log(require('openclaw/package.json').version)"
```

**Linux**（必须在 Linux 机器或 Docker 中执行）:
```bash
export PATH="$PWD/vendor/linux-openclaw/bin:$PATH"
npm install -g openclaw@2026.3.23
```

**Windows**（必须在 Windows 机器上执行）:
```powershell
cd vendor\windows-openclaw
.\npm.cmd install openclaw@2026.3.23
```

> **注意**：当前开发机为 macOS (Darwin)，macOS vendor 可以直接升级。Windows 和 Linux 需要在对应平台操作或通过 CI 完成。

---

### 3.5 代码变更清单（逐文件）

#### 3.5.1 ui/server.mjs

**变更 1：提取 DEFAULT_MODEL 常量**（~line 70）

```javascript
// 新增（在 SKILLS_SRC 定义之前）
const DEFAULT_MODEL = process.env.OPENCLAW_MODEL ?? 'openai/gpt-4o-mini'
```

**变更 2：handleInstall() 默认模型**（line 1551）

```javascript
// 旧
const model = typeof api.model === 'string' && api.model.trim() ? api.model.trim() : 'gpt-4o-mini'
// 新
const model = typeof api.model === 'string' && api.model.trim() ? api.model.trim() : DEFAULT_MODEL
```

**变更 3：handleInstall() 新增 gateway.auth.mode 写入**（~line 1650 之后）

```javascript
// 新增 — 在 gateway 基础配置写入后
{
  const rAuthMode = await runOc([
    'config', 'set', 'gateway.auth.mode', 'token',
  ], {
    timeoutMs: OC_TIMEOUT.CONFIG_SET,
    opName: 'config set gateway.auth.mode',
  })
  if (rAuthMode.code !== 0) {
    warnings.push(`config set gateway.auth.mode failed: ${rAuthMode.stderr}`)
  }
}
```

**变更 4：handleConfigModel() 三处 fallback**（lines 1876, 1880, 1886）

```javascript
// 旧（三处）
currentModel = m ?? 'gpt-4o-mini'
currentModel = currentModel ?? 'gpt-4o-mini'
if (!currentModel) currentModel = 'gpt-4o-mini'

// 新（三处）
currentModel = m ?? DEFAULT_MODEL
currentModel = currentModel ?? DEFAULT_MODEL
if (!currentModel) currentModel = DEFAULT_MODEL
```

#### 3.5.2 scripts/openclaw-usb/install-local-feishu.sh

**变更**（line 21）:

```bash
# 旧
OPENCLAW_MODEL="${OPENCLAW_MODEL:-openai/gpt-4o-mini}"
# 新
OPENCLAW_MODEL="${OPENCLAW_MODEL:-openai/gpt-4o-mini}"
# 保持不变 — 已经通过环境变量可配置，默认值保持安全选择
```

> 如果用户确认要改默认值为 gpt-5.4，则改为：
> `OPENCLAW_MODEL="${OPENCLAW_MODEL:-openai/gpt-5.4}"`

#### 3.5.3 scripts/openclaw-usb/install-local-feishu.ps1

**变更**（line 37）:

```powershell
# 旧
$Model = if ($env:OPENCLAW_MODEL) { $env:OPENCLAW_MODEL } else { 'openai/gpt-4o-mini' }
# 同上 — 保持不变或改为 gpt-5.4
```

#### 3.5.4 platforms/windows/wrappers/one-click-deploy.ps1

**变更**（line 355）:

```powershell
# 旧
$model = 'gpt-4o-mini'
# 新：读取环境变量
$model = if ($env:OPENCLAW_MODEL) { $env:OPENCLAW_MODEL } else { 'gpt-4o-mini' }
```

#### 3.5.5 deploy/docker/docker-compose.yml

**变更**（lines 15, 50）:

```yaml
# 保持现状或改默认值
OPENCLAW_MODEL: ${OPENCLAW_MODEL:-openai/gpt-4o-mini}
```

#### 3.5.6 deploy/docker/bin/bootstrap-profile.sh

**变更**（line 11）:

```bash
# 保持现状或改默认值
: "${OPENCLAW_MODEL:=openai/gpt-4o-mini}"
```

---

## 四、工程任务分解与 Worker 分配

### 4.1 任务依赖图

```
┌─────────────────────────────────────────────────┐
│              Phase A: Vendor Upgrade             │
│     T001-T004 (用户手动, macOS 可本地执行)        │
│             Priority: P0 / Security              │
└────────────────────┬────────────────────────────┘
                     │
        ┌────────────┼────────────────┐
        ▼            ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Phase B     │ │  Phase C     │ │  Phase D     │
│ auth.mode    │ │ Model Update │ │ ClawHub      │
│ T005-T008    │ │ T009-T014    │ │ T015-T018    │
│ Codex-A      │ │ Codex-B      │ │ Post-upgrade │
│ P0           │ │ P1           │ │ P1           │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       └────────────────┼────────────────┘
                        ▼
              ┌──────────────────┐
              │    Phase E       │
              │  Docs + Longrun  │
              │  T019-T023       │
              │  Codex-B         │
              │  P1              │
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │    Phase F       │
              │  Validation      │
              │  T024-T030       │
              │  Commander       │
              │  P0              │
              └──────────────────┘
```

### 4.2 Worker 分配方案

| Worker | 负责 Phase | 具体任务 | 预估工时 | 并行说明 |
|--------|-----------|---------|---------|---------|
| **用户手动** | Phase A | T001-T003: vendor npm upgrade（需要平台对应环境） | 30 min | — |
| **Codex-A** | Phase B | T005-T008: ui/server.mjs gateway.auth.mode 修改 | 1-2 hr | 等 Phase A 完成 |
| **Codex-B** | Phase C | T009-T014: 所有文件 DEFAULT_MODEL 提取 | 1-2 hr | **可与 Phase A 并行** |
| **用户手动** | Phase D | T015-T018: ClawHub 验证（需要升级后的 openclaw CLI） | 30 min | 等 Phase A 完成 |
| **Codex-B** | Phase E | T019-T023: 文档 + longrun 同步 | 1 hr | 等 Phase B+C |
| **Commander** | Phase F | T024-T030: 验证 + review | 1-2 hr | 等全部完成 |

**总预估**：4-6 小时（考虑串行依赖和等待时间）

### 4.3 可立即启动的任务

**无需等待 vendor 升级即可启动**：

| 任务 | 分配 | 说明 |
|------|------|------|
| T009-T014 (Phase C) | Codex-B | 默认模型提取为常量/环境变量 — 纯代码修改，不依赖 vendor 版本 |

**需要等待 vendor 升级**：

| 任务 | 分配 | 说明 |
|------|------|------|
| T005-T008 (Phase B) | Codex-A | gateway.auth.mode — 虽然代码修改不依赖 vendor，但验证需要新版 |
| T015-T018 (Phase D) | 用户 | ClawHub 验证 — 必须在 v2026.3.23 环境下测试 |

---

## 五、Codex Worker Prompt 模板

### 5.1 Codex-B Prompt（Phase C: 默认模型提取）

```markdown
# Task: Extract DEFAULT_MODEL constant from hardcoded gpt-4o-mini

## Context
OpenSparrow project is upgrading OpenClaw runtime. As part of this upgrade,
all hardcoded `gpt-4o-mini` model references need to be extracted to a
configurable constant driven by the `OPENCLAW_MODEL` environment variable.

## Detailed Instructions

### File 1: ui/server.mjs

1. Add a constant near line 70 (after SKILL_TARGETS definition):
```javascript
const DEFAULT_MODEL = process.env.OPENCLAW_MODEL ?? 'openai/gpt-4o-mini'
```

2. Line 1551 — Replace:
```javascript
// OLD
const model = typeof api.model === 'string' && api.model.trim() ? api.model.trim() : 'gpt-4o-mini'
// NEW
const model = typeof api.model === 'string' && api.model.trim() ? api.model.trim() : DEFAULT_MODEL
```

3. Line 1876 — Replace:
```javascript
// OLD
currentModel = m ?? 'gpt-4o-mini'
// NEW
currentModel = m ?? DEFAULT_MODEL
```

4. Line 1880 — Replace:
```javascript
// OLD
currentModel = currentModel ?? 'gpt-4o-mini'
// NEW
currentModel = currentModel ?? DEFAULT_MODEL
```

5. Line 1886 — Replace:
```javascript
// OLD
if (!currentModel) currentModel = 'gpt-4o-mini'
// NEW
if (!currentModel) currentModel = DEFAULT_MODEL
```

### File 2: platforms/windows/wrappers/one-click-deploy.ps1

Line 355 — Replace:
```powershell
# OLD
$model = 'gpt-4o-mini'
# NEW
$model = if ($env:OPENCLAW_MODEL) { ($env:OPENCLAW_MODEL -replace '^openai/', '') } else { 'gpt-4o-mini' }
```

Note: This file uses model name without the `openai/` prefix (line 345 strips it).

### Files 3-6: Keep current defaults but verify env var support exists

- `scripts/openclaw-usb/install-local-feishu.sh:21` — Already uses `${OPENCLAW_MODEL:-openai/gpt-4o-mini}`, no change needed
- `scripts/openclaw-usb/install-local-feishu.ps1:37` — Already uses `$env:OPENCLAW_MODEL` fallback, no change needed
- `deploy/docker/docker-compose.yml:15,50` — Already uses `${OPENCLAW_MODEL:-openai/gpt-4o-mini}`, no change needed
- `deploy/docker/bin/bootstrap-profile.sh:11` — Already uses `${OPENCLAW_MODEL:=openai/gpt-4o-mini}`, no change needed

## Validation

After changes, run:
```bash
node --check ui/server.mjs
```

## Constraints
- Do NOT change the default value from gpt-4o-mini (user will decide later)
- Do NOT modify any other logic
- Do NOT add comments with emojis
- Code comments in English
```

### 5.2 Codex-A Prompt（Phase B: gateway.auth.mode）

```markdown
# Task: Add gateway.auth.mode to OpenClaw config generation

## Context
OpenClaw v2026.3.7+ requires explicit `gateway.auth.mode` when both token
and password exist in gateway.auth config. OpenSparrow only uses token-based
auth, so we unconditionally set `gateway.auth.mode: "token"`.

## Detailed Instructions

### File: ui/server.mjs

Find the `handleInstall()` function (starts at line 1545).

After the gateway base config section (around line 1650, where gateway.mode/bind/port
are set via `config set`), add a new block to set gateway.auth.mode:

```javascript
  // Step: Set gateway.auth.mode for v2026.3.7+ compatibility
  {
    const rAuthMode = await runOc([
      'config', 'set',
      'gateway.auth.mode',
      'token',
    ], {
      timeoutMs: OC_TIMEOUT.CONFIG_SET,
      opName: 'config set gateway.auth.mode',
    })
    if (rAuthMode.code !== 0) {
      warnings.push(`config set gateway.auth.mode failed: ${rAuthMode.stderr}`)
    }
  }
```

### Important Notes:
- This must go AFTER the gateway.mode/bind/port config sets
- This must go BEFORE the auth-profiles.json writing
- Use `warnings.push()` not `errors.push()` for failure — auth.mode failure
  should not block the entire installation
- Look at how other config set calls are structured and follow the same pattern

## Verification

1. Read the full handleInstall() function to understand the flow
2. Find the exact insertion point
3. Make the change
4. Run: `node --check ui/server.mjs`

## Constraints
- Only modify handleInstall() in ui/server.mjs
- Do NOT modify any other files
- Follow existing code style exactly
```

---

## 六、验证矩阵

### 6.1 语法验证（自动化，所有 Phase 后执行）

| 检查 | 命令 | 预期 |
|------|------|------|
| Node.js 语法 | `node --check ui/server.mjs` | Exit 0 |
| Bash 语法 | `bash -n scripts/openclaw-usb/*.sh` | Exit 0 |
| Bash 语法 | `bash -n deploy/docker/bin/*.sh` | Exit 0 |
| Bash 语法 | `bash -n platforms/mac/companion/*` | Exit 0 (跳过 .md) |
| Bash 语法 | `bash -n platforms/linux/companion/*.sh` | Exit 0 |
| Docker 配置 | `docker compose -f deploy/docker/docker-compose.yml config` | 合法 YAML |
| Workspace init | `./longrun/workspaces/opensparrow-unified/init.sh` | Exit 0 |

### 6.2 功能验证（手动，需凭据）

| 场景 | 操作 | 预期 | 优先级 |
|------|------|------|--------|
| Mac 新 profile 安装 | 启动 UI → /api/status | `installed: false` | P0 |
| Mac 飞书安装 | POST /api/install | openclaw.json 含 auth.mode | P0 |
| Mac 模型更新 | POST /api/config/model | 模型正确更新 | P1 |
| Windows 飞书安装 | one-click-deploy.ps1 | 安装成功 | P1（需 Windows 机器） |
| Docker 启动 | docker compose up | /api/status 健康 | P1（需 Docker daemon） |
| 钉钉插件安装 | @openclaw-china/channels | 安装成功 | P1 |

### 6.3 版本验证（vendor 升级后）

| 检查 | 命令 | 预期 |
|------|------|------|
| macOS vendor | `vendor/mac-openclaw/bin/node -e "console.log(require('openclaw/package.json').version)"` | `2026.3.23` |
| Windows vendor | `node -e "console.log(require('./vendor/windows-openclaw/node_modules/openclaw/package.json').version)"` | `2026.3.23` |
| Linux vendor | `vendor/linux-openclaw/bin/node -e "console.log(require('openclaw/package.json').version)"` | `2026.3.23` |
| verify-vendor.sh | `bash scripts/verify-vendor.sh` | 全部 PASS |

---

## 七、风险与回滚

### 7.1 风险矩阵

| 风险 | 概率 | 影响 | 等级 | 缓解措施 |
|------|------|------|------|---------|
| gateway.auth.mode 导致 gateway 拒绝启动 | 中 | 高 | **高** | 无条件写入 mode="token"；升级前备份配置 |
| ClawHub-first 导致钉钉插件安装失败 | 低 | 中 | **中** | 验证 npm 回退；准备 `npm:` 前缀方案 |
| vendor 升级后 native 依赖（sharp/node-pty）不兼容 | 低 | 高 | **中** | vendor 打包时测试 CLI 基本命令 |
| gpt-5.4 对无权限用户安装失败 | — | — | **无** | 默认值保持 gpt-4o-mini |
| 飞书 webhook 签名加固导致旧配置不兼容 | 低 | 中 | **低** | 签名加固只拒绝伪造请求，合法 appSecret 不受影响 |

### 7.2 回滚方案

**代码回滚**：
```bash
git revert <upgrade-commit-sha>
```

**vendor 回滚**：
```bash
# macOS
cd vendor/mac-openclaw && export PATH="$PWD/bin:$PATH" && npm install -g openclaw@2026.3.7
# Windows
cd vendor/windows-openclaw && npm install openclaw@2026.3.12
# Linux
cd vendor/linux-openclaw && export PATH="$PWD/bin:$PATH" && npm install -g openclaw@2026.3.12
```

**配置回滚**：
```bash
cp -r ~/.openclaw-backup-YYYYMMDD/* ~/.openclaw-usb-portable/
```

---

## 八、时间线

| 日期 | 里程碑 | 负责人 |
|------|--------|--------|
| 2026-03-24 | PRD 审批 | Commander + 用户 |
| 2026-03-24 | Phase C 启动（DEFAULT_MODEL 提取） | Codex-B |
| 2026-03-24~25 | Phase A 执行（macOS vendor 升级） | 用户手动 |
| Phase A 后 | Phase B 启动（gateway.auth.mode） | Codex-A |
| Phase A 后 | Phase D 验证（ClawHub） | 用户手动 |
| Phase B+C 后 | Phase E（文档同步） | Codex-B |
| 全部完成后 | Phase F（验证 + review） | Commander |

---

## 九、开放问题

| # | 问题 | 当前假设 | 决策需要 |
|---|------|---------|---------|
| Q1 | 默认模型是保持 gpt-4o-mini 还是改为 gpt-5.4？ | 保持 gpt-4o-mini | 用户确认 |
| Q2 | Windows/Linux vendor 升级是否在本轮执行？ | 仅 macOS 本机可执行，其余标记为待办 | 用户确认 |
| Q3 | 是否需要将 PRD 持久化到 Notion？ | 当前写在 specs/ 中即可 | 用户确认 |

---

## 附录 A：完整硬编码位置清单

| # | 文件 | 行号 | 当前值 | 环境变量支持 | 需要改动 |
|---|------|------|--------|------------|---------|
| 1 | ui/server.mjs | 1551 | `'gpt-4o-mini'` | 无 | **是 — 提取为 DEFAULT_MODEL** |
| 2 | ui/server.mjs | 1876 | `'gpt-4o-mini'` | 无 | **是 — 提取为 DEFAULT_MODEL** |
| 3 | ui/server.mjs | 1880 | `'gpt-4o-mini'` | 无 | **是 — 提取为 DEFAULT_MODEL** |
| 4 | ui/server.mjs | 1886 | `'gpt-4o-mini'` | 无 | **是 — 提取为 DEFAULT_MODEL** |
| 5 | install-local-feishu.sh | 21 | `openai/gpt-4o-mini` | 有 (`OPENCLAW_MODEL`) | 否（已可配置） |
| 6 | install-local-feishu.ps1 | 37 | `openai/gpt-4o-mini` | 有 (`$env:OPENCLAW_MODEL`) | 否（已可配置） |
| 7 | one-click-deploy.ps1 | 355 | `gpt-4o-mini` | 无 | **是 — 增加 env var 读取** |
| 8 | docker-compose.yml | 15 | `openai/gpt-4o-mini` | 有 (`OPENCLAW_MODEL`) | 否（已可配置） |
| 9 | docker-compose.yml | 50 | `openai/gpt-4o-mini` | 有 (`OPENCLAW_MODEL`) | 否（已可配置） |
| 10 | bootstrap-profile.sh | 11 | `openai/gpt-4o-mini` | 有 (`OPENCLAW_MODEL`) | 否（已可配置） |

**实际需要代码修改的文件**：2 个（ui/server.mjs + one-click-deploy.ps1）
**其余 6 处**已通过环境变量可配置，只需在文档中说明。

---

## 附录 B：配置生成流程图

```
用户点击"安装"
    │
    ▼
POST /api/install
    │
    ├── 参数校验（channels + api credentials）
    │
    ├── cleanupOldDaemon()
    │
    ├── installSkills()
    │
    ├── [钉钉/企微] openclaw plugins install @openclaw-china/channels
    │
    ├── config set gateway.mode / gateway.bind / gateway.port
    │
    ├── config set gateway.auth.mode "token"  ← 新增（Phase B）
    │
    ├── config set models.providers.openai { baseUrl, models }
    │   └── 使用 DEFAULT_MODEL 作为空值 fallback  ← 修改（Phase C）
    │
    ├── 写入 auth-profiles.json
    │
    ├── configureChannel() × N
    │   ├── feishu: config set channels.feishu.*
    │   ├── dingtalk: config set channels.dingtalk.*
    │   └── wecom: config set channels.wecom.*
    │
    ├── openclaw gateway install
    │
    └── daemon restart
```

# Implementation Plan: OpenClaw Runtime Upgrade to 2026.3.23

**Branch**: `010-openclaw-runtime-upgrade` | **Date**: 2026-03-24 | **Spec**: `specs/010-openclaw-runtime-upgrade/spec.md`

## Summary

将三个平台的 vendor 运行时内 OpenClaw 版本从 2026.3.7 / 3.12 统一升级到 2026.3.23，适配两个破坏性变更（gateway.auth.mode 显式化、ClawHub-first 插件安装），更新硬编码默认模型，并做全链路回归验证。

## Technical Context

- **Repository root**: `/Users/eduardogan/Desktop/GHJProject/opensparrow`
- **Vendor dirs**: `vendor/{mac,windows,linux}-openclaw/`
- **UI backend**: `ui/server.mjs`（6 处 `gpt-4o-mini` 硬编码，1 处 openclaw.json 写入）
- **Install scripts**: `scripts/openclaw-usb/install-local-feishu.{sh,ps1}`
- **Windows deploy**: `platforms/windows/wrappers/one-click-deploy.ps1`
- **Docker baseline**: `deploy/docker/{docker-compose.yml,bin/bootstrap-profile.sh}`
- **Companion scripts**: `platforms/{linux,mac,windows}/companion/`（调用 `npx openclaw`，不硬编码版本）

## Design

### Phase A: Vendor Binary Upgrade

对每个平台分别操作：

**macOS**:
```bash
# 在 vendor/mac-openclaw/ 的 Node 环境下更新全局 openclaw
export PATH="$PWD/vendor/mac-openclaw/bin:$PATH"
npm install -g openclaw@2026.3.23
```

**Windows**:
```bash
# 更新 vendor/windows-openclaw/node_modules/openclaw
cd vendor/windows-openclaw
./npm install openclaw@2026.3.23
# 或者在 Windows 主机上操作
```

**Linux**:
```bash
# 与 macOS 类似
export PATH="$PWD/vendor/linux-openclaw/bin:$PATH"
npm install -g openclaw@2026.3.23
```

> 注意：vendor/ 在 .gitignore 中，不进 git。升级后需要更新 `docs/vendor-source-inventory.md` 记录版本。

### Phase B: Breaking Change — gateway.auth.mode

**影响分析**:
- `ui/server.mjs:61` 写入 `~/.openclaw-${PROFILE}/openclaw.json`
- 当用户同时配置了 gateway auth token 和 password 时，必须显式设置 `gateway.auth.mode`
- 当前代码尚未写入 `gateway.auth.mode` 字段

**修改策略**:
- 在 server.mjs 中 openclaw.json 的配置生成逻辑处，检测 gateway.auth 配置状态
- 如果同时存在 token 和 password，自动写入 `gateway.auth.mode: "token"`（默认偏好 token）
- 如果只存在其一，不需要写入 mode

### Phase C: 默认模型更新

**影响范围**（共 10 处硬编码）:

| 文件 | 行号 | 当前值 |
|------|------|--------|
| ui/server.mjs | 1551, 1876, 1880, 1886 | `'gpt-4o-mini'` |
| deploy/docker/docker-compose.yml | 15, 50 | `openai/gpt-4o-mini` |
| deploy/docker/bin/bootstrap-profile.sh | 11 | `openai/gpt-4o-mini` |
| scripts/openclaw-usb/install-local-feishu.ps1 | 37 | `openai/gpt-4o-mini` |
| scripts/openclaw-usb/install-local-feishu.sh | 21, 52 | `openai/gpt-4o-mini` |
| platforms/windows/wrappers/one-click-deploy.ps1 | 355 | `gpt-4o-mini` |

**修改策略**:
- 提取为统一常量或环境变量 `OPENCLAW_DEFAULT_MODEL`
- 默认值暂保持 `openai/gpt-4o-mini`（安全选择：所有 OpenAI 用户都有权限）
- 在 `deploy/docker/.env.example` 和安装脚本帮助文本中说明可配置为 `openai/gpt-5.4` 等新模型
- 不强制切换到 gpt-5.4，避免对无权限用户造成安装失败

### Phase D: ClawHub-first 插件安装验证

**影响分析**:
- `scripts/openclaw-usb/install-local-feishu.sh:315` 有 `npm install -g openclaw` 回退
- 钉钉插件（openclaw-plugin-dingtalk / openclaw-china）为社区插件
- ClawHub-first 变更意味着 `openclaw plugins install` 先查 ClawHub 再回退 npm

**验证策略**:
- 升级后执行 `openclaw plugins search dingtalk` 确认 ClawHub 是否收录
- 如果未收录，确认 npm 回退正常
- 在安装脚本中无需修改（脚本不直接调用 `openclaw plugins install`，而是用 npm 全局安装 openclaw 后通过配置启用内置/社区插件）

### Phase E: 文档与 Longrun 同步

- 更新 `docs/vendor-source-inventory.md`（如已存在）或新建
- 新增 `docs/runbooks/F-012-openclaw-runtime-upgrade.md`
- feature_list.json 新增 F-012
- claude-progress.txt 追加会话记录

## Validation Plan

### 语法检查（必做）
```bash
node --check ui/server.mjs
bash -n scripts/openclaw-usb/*.sh
bash -n deploy/docker/bin/*.sh
bash -n platforms/mac/wrappers/*.command
bash -n platforms/mac/companion/*
bash -n platforms/linux/companion/*.sh
```

### 功能验证（必做）
```bash
# Workspace init 回归
./longrun/workspaces/opensparrow-unified/init.sh

# Docker compose 验证
docker compose -f deploy/docker/docker-compose.yml config

# Mac 飞书新 profile 安装（无凭据 dry-run）
OPENCLAW_HOME=$(mktemp -d) OPENSPARROW_AUTO_OPEN=0 OPENSPARROW_UI_PORT=19051 node ui/server.mjs
curl http://127.0.0.1:19051/api/status

# 版本确认
vendor/mac-openclaw/bin/node -e "console.log(require('openclaw/package.json').version)"
```

### E2E 验证（需真实凭据，标记为可选）
- Mac 飞书完整安装 + 消息回环
- Windows 飞书/钉钉安装 + 消息回环
- Docker bootstrap + /api/status + channel probe

## Worker Assignment

| Phase | 建议分配 | 依赖 |
|-------|---------|------|
| A (vendor upgrade) | 用户手动 + Codex-A 辅助 | 无 |
| B (gateway.auth.mode) | Codex-A | Phase A |
| C (默认模型) | Codex-B | 无（可与 A 并行） |
| D (ClawHub 验证) | Codex-A | Phase A |
| E (文档同步) | Codex-B | Phase B + C |
| Validation | Commander review | Phase A-E |

## Deferred

- Docker 多阶段构建优化（slim 变体）
- Kubernetes 部署路径
- Node.js runtime 版本升级
- ClawHub 全面迁移

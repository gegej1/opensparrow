# Tasks: OpenClaw Runtime Upgrade to 2026.3.23

**Input**: `specs/010-openclaw-runtime-upgrade/spec.md`, `specs/010-openclaw-runtime-upgrade/plan.md`
**Prerequisites**: `research/openclaw-version-upgrade-report-20260324.md`

## Phase 1: Vendor Binary Upgrade (P0)

- [ ] T001 升级 `vendor/mac-openclaw/` 内的 openclaw 至 2026.3.23（`npm install -g openclaw@2026.3.23`，使用 vendor 内 Node 环境）
- [ ] T002 升级 `vendor/linux-openclaw/` 内的 openclaw 至 2026.3.23（同上）
- [ ] T003 升级 `vendor/windows-openclaw/node_modules/openclaw/` 至 2026.3.23（需在 Windows 主机或使用 vendor 内 npm）
- [ ] T004 验证三个平台的 openclaw 版本一致：`openclaw --version` 或 `package.json` 均显示 2026.3.23

## Phase 2: Breaking Change — gateway.auth.mode (P0)

- [ ] T005 审查 `ui/server.mjs` 中所有写入 `openclaw.json` 的路径，定位 gateway.auth 配置生成逻辑
- [ ] T006 修改配置生成：当 `gateway.auth.token` 和 `gateway.auth.password` 同时存在时，显式写入 `gateway.auth.mode: "token"`
- [ ] T007 为 gateway.auth.mode 逻辑增加单元测试或 smoke 验证脚本
- [ ] T008 确认 `scripts/openclaw-usb/install-local-feishu.sh` 生成的 profile 配置不受影响（该脚本只写 token 不写 password，无需 mode）

## Phase 3: Default Model Update (P1)

- [ ] T009 更新 `ui/server.mjs` 中 4 处 `gpt-4o-mini` 硬编码为环境变量驱动（`OPENCLAW_DEFAULT_MODEL`，默认值保持 `openai/gpt-4o-mini`）
- [ ] T010 更新 `scripts/openclaw-usb/install-local-feishu.sh` 中的默认模型注释和帮助文本，说明可配置为新模型
- [ ] T011 更新 `scripts/openclaw-usb/install-local-feishu.ps1` 中的默认模型
- [ ] T012 更新 `platforms/windows/wrappers/one-click-deploy.ps1` 中的默认模型
- [ ] T013 更新 `deploy/docker/docker-compose.yml` 和 `deploy/docker/bin/bootstrap-profile.sh` 中的默认模型
- [ ] T014 更新 `deploy/docker/.env.example` 增加 `OPENCLAW_DEFAULT_MODEL` 说明

## Phase 4: ClawHub-first Plugin Verification (P1)

- [ ] T015 升级后执行 `openclaw plugins search dingtalk`，确认 ClawHub 是否收录钉钉社区插件
- [ ] T016 验证 npm 回退路径：`openclaw plugins install openclaw-plugin-dingtalk` 在 ClawHub 未收录时回退到 npm
- [ ] T017 确认飞书内置插件在 2026.3.23 中的签名验证加固不影响现有配置
- [ ] T018 如 ClawHub-first 导致钉钉插件安装异常，在安装脚本中增加显式 `--source npm` 回退

## Phase 5: Documentation & Longrun Sync (P1)

- [ ] T019 更新（或新建）`docs/vendor-source-inventory.md`，记录 2026.3.23 版本信息、来源、校验和
- [ ] T020 新增 `docs/runbooks/F-012-openclaw-runtime-upgrade.md`，包含升级步骤、回滚方案、验证命令
- [ ] T021 在 `longrun/workspaces/opensparrow-unified/feature_list.json` 新增 F-012
- [ ] T022 在 `longrun/workspaces/opensparrow-unified/claude-progress.txt` 追加本轮会话记录
- [ ] T023 更新 `agent-hub/projects/opensparrow/tasks.md` 新增 W-010 条目

## Phase 6: Regression Validation (P0)

- [ ] T024 语法检查全量通过：`node --check ui/server.mjs` + `bash -n` 全部脚本
- [ ] T025 `./longrun/workspaces/opensparrow-unified/init.sh` 通过
- [ ] T026 `docker compose -f deploy/docker/docker-compose.yml config` 通过
- [ ] T027 Mac 飞书新 profile dry-run：启动 UI → /api/status → 确认 installed=false → 空 profile 安装向导可用
- [ ] T028 （可选，需凭据）Mac 飞书完整安装 E2E：安装 → channel probe → 消息回环
- [ ] T029 （可选，需 Windows）Windows 飞书/钉钉 E2E
- [ ] T030 （可选，需 Docker daemon）Docker bootstrap E2E

## Validation Checklist

- [ ] V001 三个平台 vendor 内 openclaw 版本均为 2026.3.23
- [ ] V002 `ui/server.mjs` 生成的 openclaw.json 在双 auth 场景下包含 `gateway.auth.mode`
- [ ] V003 所有 `gpt-4o-mini` 硬编码已改为环境变量驱动
- [ ] V004 安装脚本默认模型可通过 `OPENCLAW_DEFAULT_MODEL` 或 `--model` 覆盖
- [ ] V005 ClawHub-first 下钉钉插件安装路径可用
- [ ] V006 飞书 webhook 签名验证加固不影响现有部署
- [ ] V007 所有语法检查通过
- [ ] V008 Workspace init 回归通过
- [ ] V009 feature_list.json + progress log + runbook 已同步

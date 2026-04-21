# OpenSparrow Architecture Overview

## 仓库定位

`opensparrow/` 不是单一应用仓，而是一个统一真源仓，负责把以下能力放在同一 authority 下：

- 多平台 runtime/vendor
- 本地控制面 UI
- 安装/重置/hardening 脚本
- release/export 打包链
- specs + longrun 项目治理与进度

核心分层：

1. **Project Rules**
   - `AGENTS.md`
   - `.specify/memory/constitution.md`
2. **Feature Delivery**
   - `specs/<feature>/spec.md`
   - `specs/<feature>/plan.md`
   - `specs/<feature>/tasks.md`
3. **Project Memory**
   - `longrun/workspaces/opensparrow-unified/`
4. **Execution Surface**
   - `ui/`
   - `scripts/openclaw-usb/`
   - `platforms/*/wrappers`
5. **Packaging / Delivery**
   - `scripts/build-usb-pack.sh`
   - `longrun/workspaces/openclaw-usb-portable/execution/scripts/`

## 关键目录

### `ui/`

当前最关键的运行面。

- `ui/server.mjs`
  - 启动本地 HTTP 控制面
  - 管理 install wizard / dashboard API
  - 调用 bundled OpenClaw runtime
  - 管理 profile/config/auth/session state
  - 提供 model routing sidecar
- `ui/public/`
  - `index.html`：安装向导
  - `dashboard.html`：管理面板
  - `dashboard-model-routing-state.mjs`：前端智能路由状态机
- `ui/lib/`
  - `model-routing-config.mjs`
  - `wecom.mjs`
  - `session-rebind.mjs`
  - `openai-provider.mjs`
- `ui/tests/`
  - Node 原生测试
  - 覆盖 packaging shell、routing endpoint、live router、dashboard shell 等

### `scripts/openclaw-usb/`

共享安装与 hardening 真源。

- `install-local-feishu.sh`
- `install-local-feishu.ps1`
- `harden-local-feishu.sh`
- `harden-local-feishu.ps1`

这些脚本不是简单示例，而是多个平台复用的契约面。

### `scripts/model-routing/`

当前智能路由运行面的核心逻辑树。

- `lib/custom-plugin-routing.mjs`
  - 自定义 provider id / model target contract
  - upstream payload 组装
  - local sidecar 行为辅助

### `platforms/`

平台入口与用户交互面。

- `platforms/mac/wrappers/01-开始部署.command`
  - macOS packaged 官方 first-click path
- `platforms/windows/wrappers/one-click-deploy.ps1/.cmd`
- `platforms/*/companion/`
  - 原生 companion / helper 资产

### `vendor/`

上游 runtime 二进制分发目录。当前 GitHub 默认不含这部分内容。

已知重要事实：

- `vendor/mac-openclaw` 当前存在 `bin/lib` 双 openclaw 版本分叉
- 这直接影响 packaged WeCom install preflight

### `longrun/`

长期记忆与会话交接层。

- `app_spec.md`
- `feature_list.json`
- `claude-progress.txt`
- `init.sh`

这些文件回答“项目是什么”“做到了哪”“还有什么风险”。

## 核心运行模型

### 1. Root repo / packaged launcher

启动入口来自：

- root repo: `scripts/run-root-dashboard.sh`
- packaged macOS: `01-开始部署.command`

它们最终都会拉起 `ui/server.mjs`。

### 2. `ui/server.mjs`

server 负责：

- 解析 `PACK_ROOT / RUNTIME_ROOT / OPENCLAW_HOME / PROFILE`
- 定位 bundled Node 与 OpenClaw entry
- 通过 `runOc(...)` 执行 `openclaw` 子命令
- 对外暴露：
  - `/`
  - `/dashboard`
  - `/api/status`
  - `/api/install`
  - `/api/config/*`
  - `/v1/models`
  - `/v1/chat/completions`

### 3. Profile state

实际状态写入：

- `OPENCLAW_HOME/.openclaw-<profile>/openclaw.json`
- `ui-meta.json`
- `auth-profiles.json`
- `workspace/`

这意味着运行问题经常同时涉及：

- 前端状态
- runtime profile state
- packaged/runtime root

### 4. Model routing

当前智能路由不是 OpenClaw core native routing 改造，而是自定义 provider / plugin-provider 路线。

关键约束：

- 内部 provider id 仍是 `opensparrow-router`
- target model 仍是 `opensparrow-router/auto`
- Dashboard 的 smart routing 保存后，会切到这个 target
- 本地 sidecar 负责把请求再路由到具体 tier upstream

### 5. Packaging

release/export 链负责：

- 复制 `ui/`、`scripts/`、`platforms/`、release-facing docs
- 打包离线 plugin archives
- 产出 Desktop folder + zip
- 清理 runtime residue

当前最新 release 线索与风险，见 [docs/current-status.md](/Users/eduardogan/Desktop/GHJProject/opensparrow/docs/current-status.md)。

## 当前最值得重点读的文件

1. `ui/server.mjs`
2. `ui/lib/model-routing-config.mjs`
3. `ui/public/index.html`
4. `ui/public/dashboard.html`
5. `scripts/model-routing/lib/custom-plugin-routing.mjs`
6. `scripts/build-usb-pack.sh`
7. `platforms/mac/wrappers/01-开始部署.command`
8. `longrun/workspaces/opensparrow-unified/feature_list.json`
9. `longrun/workspaces/opensparrow-unified/claude-progress.txt`

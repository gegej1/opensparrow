# Feature Specification: GitHub Windows Direct-Run Runtime Closure

**Feature Branch**: `012-github-windows-direct-run`  
**Created**: 2026-04-08  
**Status**: Implementing  
**Input**: 用户要求把 Windows 运行时依赖同步到 GitHub，并让用户从 GitHub 下载 `opensparrow` 仓库后，直接点击 Windows `CMD` 入口即可启动，而无需再额外安装 Node.js / npm / OpenClaw；同时明确不需要把本机 Skill 大包一并上传。

## Context & References

- `AGENTS.md`
- `.specify/memory/constitution.md`
- `docs/项目持久化说明.md`
- `docs/usb-pack/SOP.md`
- `docs/usb-pack/windows-native-delivery.md`
- `platforms/windows/wrappers/one-click-deploy.*`
- `platforms/windows/wrappers/run-openclaw-usb.cmd`
- `scripts/openclaw-usb/install-local-feishu.ps1`
- `vendor/windows-openclaw/AGENTS.md`

## User Stories

### User Story 1 - Windows 用户需要从 GitHub 下载后直接双击启动（P1）

作为 Windows 用户，我希望从 GitHub 下载仓库 ZIP 后，不需要额外安装 Node.js 或 OpenClaw，就能直接双击 `CMD` 入口启动安装 / 部署流程。

**Acceptance**:

1. GitHub 仓库内包含 Windows 所需 bundled runtime。
2. 根目录提供可直接双击的 Windows `CMD` 入口。
3. `one-click-deploy` 在 repo-root 模式下可解析 `vendor/windows-openclaw/` 并启动 UI。

### User Story 2 - Windows repo 模式安装链需要兼容 vendor 布局（P1）

作为维护者，我希望 `run-openclaw-usb.cmd` 与 `install-local-feishu.ps1` 在 repo-root 模式下能直接复用 `vendor/windows-openclaw/`，而不是误判为缺少 runtime 或退回系统 Node。

**Acceptance**:

1. `scripts/openclaw-usb/install-local-feishu.ps1` 同时支持 `runtime/` 布局与 `vendor/windows-openclaw/` 布局。
2. repo 模式下能识别 `node.exe`、`npm.cmd`、`node_modules/openclaw/openclaw.mjs`。
3. 缺失 bundled runtime 时，报错信息能明确指出需要 `runtime/` 或 `vendor/windows-openclaw/`。

### User Story 3 - 仓库边界需要保持清晰（P1）

作为统一仓维护者，我希望这次直跑能力只补 Windows 运行时，不把本机 `My_Skills/` 之类的大型本地技能目录一起带进 GitHub，避免仓库边界再次失控。

**Acceptance**:

1. `.gitignore` 继续屏蔽本机 `My_Skills/` 与其他本地技能目录。
2. 仅 `vendor/windows-openclaw/` 被纳入 Git 跟踪；其他 `vendor/` 子目录仍默认忽略。
3. 文档明确 GitHub 直跑包含 Windows runtime，但不包含本机 Skill 大包。

## Functional Requirements

- FR-001：GitHub 仓库必须跟踪 `vendor/windows-openclaw/`，使 Windows 源码下载包自带 bundled runtime。
- FR-002：仓库根目录必须提供 `one-click-deploy.cmd` 作为 Windows 直接双击入口，并转发到 canonical `platforms/windows/wrappers/one-click-deploy.cmd`。
- FR-003：`scripts/openclaw-usb/install-local-feishu.ps1` 必须同时兼容 handoff `runtime/` 布局与 repo-root `vendor/windows-openclaw/` 布局。
- FR-004：`.gitignore` 必须继续排除 `My_Skills/`、`skills/My_Skills/`、`superpowers/` 等本机技能目录，避免随本次提交进入 GitHub。
- FR-005：Windows 交付 / 安装文档必须说明 GitHub 直跑的前提与边界。
- FR-006：`feature_list.json` 与 `claude-progress.txt` 必须记录本次收口。

## Non-Goals

- 不把顶层 `My_Skills/` 或其他本机技能镜像提交到 GitHub。
- 不改动 `vendor/windows-openclaw/` 内部二进制与 `node_modules/` 内容。
- 不在本阶段把 macOS / Linux vendor runtime 一并改为 Git 跟踪。

## Success Criteria

1. `git status --short --ignored vendor/windows-openclaw My_Skills` 显示 Windows runtime 可跟踪，而 `My_Skills/` 仍被忽略。
2. `scripts/openclaw-usb/install-local-feishu.ps1` 的静态审查显示同时支持 `runtime/` 与 `vendor/windows-openclaw/` 两种布局。
3. 根目录 `one-click-deploy.cmd` 存在并可转发到 canonical Windows wrapper。
4. 相关文档、feature list 与 progress 记录完成同步。

# Implementation Plan: Mem0 Project Memory Integration

**Branch**: `028-mem0-project-memory-integration` | **Date**: 2026-04-15 | **Spec**: `specs/028-mem0-project-memory-integration/spec.md`

## Summary

本次实现是一个独立 sidecar tooling 任务，只做三件事：

1. 以最少本机改动把 Mem0 接到 Codex；
2. 把当前 repo 的长期规则、长期经验、过期噪音做 A/B/C 分类；
3. 把 A 类补进规则文件，把 B 类整理成精炼 memory 导入 Mem0，并留下最小但可执行的操作文档与验收证据。

本轮不进入 F-027 主线实现，不动 Windows 线，不自建任何 memory backend。

## Technical Context

- **Repository root**: `/Users/eduardogan/Desktop/GHJProject/opensparrow`
- **Primary write targets**:
  - `AGENTS.md`
  - `docs/memory-setup.md`
  - `memory/mem0_import.json`
  - `specs/028-mem0-project-memory-integration/spec.md`
  - `specs/028-mem0-project-memory-integration/plan.md`
  - `specs/028-mem0-project-memory-integration/tasks.md`
  - `longrun/workspaces/opensparrow-unified/feature_list.json`（如按项目规则做最小记账）
  - `longrun/workspaces/opensparrow-unified/claude-progress.txt`（如按项目规则做最小记账）
- **Local write targets**:
  - `~/.codex/config.toml`
- **Primary read targets**:
  - `AGENTS.md`
  - `.specify/memory/constitution.md`
  - `docs/governance/{README.md,framework-stack.md}`
  - `docs/项目持久化说明.md`
  - `docs/runbooks/F-005-ui-install-reset.md`
  - `docs/runbooks/F-019-commander-orchestration-governance.md`
  - `specs/003-*`
  - `specs/014-*`
  - `specs/026-*`
  - `specs/027-*`
  - `longrun/workspaces/opensparrow-unified/{app_spec.md,feature_list.json,claude-progress.txt}`
  - legacy workspace `app_spec / feature_list / claude-progress`
- **Namespace contract**:
  - `user_id = opensparrow-memory`
  - `app_id = opensparrow`
  - `project_id = opensparrow`
  - metadata `project = opensparrow`

## Design

### A. Mem0 access path

- 优先采用官方 Mem0 方案。
- Codex 侧通过 `~/.codex/config.toml` 注册 Mem0 HTTP MCP。
- 认证只走环境变量，不把 token/header 写入 repo。
- CLI 侧安装官方 `mem0` 工具，用于导入与验收。

### B. Memory classification

- `A / 永久规则类`：
  - 只保留每次任务都应知道的稳定规则、authority、流程边界、验收纪律。
  - 主要写回 `AGENTS.md` 的 `Memory Operating Rules`。
- `B / 长期经验类`：
  - 只保留稳定项目事实、冻结结论、长期约定、环境发现、用户偏好。
  - 整理后写入 `memory/mem0_import.json` 并导入 Mem0。
- `C / 过期/噪音类`：
  - 一次性对话、命令回显、长日志、重复状态、过期活跃态。
  - 仅在 `docs/memory-setup.md` 标明不导入。

### C. Import strategy

- 逐条提炼 durable memory，避免全文灌库。
- 对重复项做合并。
- 对冲突项保留最新、最具体、最可执行版本。
- 当前会变的 packaged candidate 或 session-only 状态仅在必要时写成 `session_state`。

### D. Acceptance strategy

- 先验证本机 Codex/Mem0 配置可用。
- 再做最小 `system test memory` 的 add/search/get/update。
- 再导入 curated project memories。
- 最后用 CLI 和新 Codex 会话各证明一次“能读到已导入记忆”。

## Validation Plan

1. 检查 `MEM0_API_KEY` / `MEM0_AUTH_HEADER` 的存在性，不回显 secret。
2. 验证 `~/.codex/config.toml` 中的 Mem0 MCP 配置存在且无 repo 泄漏。
3. 运行：
   - `mem0 status`
   - `mem0 list --user-id opensparrow-memory`
   - `mem0 search "OpenSparrow authority order" --user-id opensparrow-memory`
4. 写入并验证一条 system test memory：
   - add
   - search
   - get
   - update（若支持）
5. 导入 `memory/mem0_import.json` 中的 curated memories 并抽查检索结果。
6. 若新 Codex 会话能读 MCP，则额外做一次 agent-side search 验证。

## Risks & Controls

- **Risk**: worktree 已有大量脏改动。  
  **Control**: 只做增量补写，不回退现有改动。

- **Risk**: 把会变的主线状态误导入 durable memory。  
  **Control**: 只把稳定规则/冻结结论写成 `decision` / `convention` / `environmental`，活动态最多写 `session_state`。

- **Risk**: Codex MCP 配置语法或认证头字段不匹配。  
  **Control**: 先用官方 Mem0/Codex 文档确认配置，再用 `codex mcp get` 和新会话验证。

- **Risk**: CLI 不存在。  
  **Control**: 安装官方 CLI，仅用于导入与验收，不引入后台服务。

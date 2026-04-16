# Tasks: Mem0 Project Memory Integration

**Input**: `specs/028-mem0-project-memory-integration/spec.md`, `specs/028-mem0-project-memory-integration/plan.md`  
**Prerequisites**: `AGENTS.md`, `.specify/memory/constitution.md`, `docs/governance/framework-stack.md`, `docs/项目持久化说明.md`

## Phase 1: Scope Freeze & Access (P0)

- [ ] T001 确认 `MEM0_API_KEY` 存在；若缺失则立即停止
- [ ] T002 盘点当前 `~/.codex/config.toml` 的 MCP 配置能力与本机 `mem0` CLI 状态
- [ ] T003 补齐 `specs/028-mem0-project-memory-integration/{spec,plan,tasks}.md`

## Phase 2: Legacy Memory Audit (P0)

- [ ] T004 搜索 repo 内 memory / governance / runbook / spec / longrun / legacy workspace 候选来源
- [ ] T005 提炼 A 类永久规则，确定写回规则文件的最小集合
- [ ] T006 提炼 B 类长期经验，整理为去重、短句、可执行的 durable memory
- [ ] T007 标注 C 类噪音/过期内容，明确不导入

## Phase 3: Repo Rules & Artifacts (P0)

- [ ] T008 在 `AGENTS.md` 新增 `Memory Operating Rules`
- [ ] T009 生成 `memory/mem0_import.json`
- [ ] T010 编写 `docs/memory-setup.md`
- [ ] T011 如项目规则要求，最小同步 unified longrun 账本

## Phase 4: Local Mem0 Integration (P0)

- [ ] T012 安装或启用官方 Mem0 CLI
- [ ] T013 在 `~/.codex/config.toml` 中最小接入 Mem0 MCP，使用环境变量注入认证头
- [ ] T014 验证 `codex mcp get mem0` 或等价状态输出

## Phase 5: Import & Acceptance (P0)

- [ ] T015 执行最小 system test memory 的 add/search/get/update（若支持）
- [ ] T016 导入 `memory/mem0_import.json` 中的 curated project memories
- [ ] T017 运行 `mem0 status`
- [ ] T018 运行 `mem0 list --user-id opensparrow-memory`
- [ ] T019 运行 `mem0 search "OpenSparrow authority order" --user-id opensparrow-memory`
- [ ] T020 如可行，用新 Codex 会话验证 agent-side 能读到至少 1 条项目记忆

## Validation Checklist

- [ ] V001 repo 中未写入任何明文 secret / auth header
- [ ] V002 `AGENTS.md` 的新规则与 authority order、longrun subordinate 边界不冲突
- [ ] V003 `memory/mem0_import.json` 只包含 durable facts，不含长日志、命令回显、一次性聊天
- [ ] V004 B 类 memory 至少覆盖 authority、Commander 边界、目录职责、F-014/F-024/F-025/F-026/F-027 冻结结论、用户偏好
- [ ] V005 `mem0` CLI 与 Codex MCP 至少有一条可工作的检索路径
- [ ] V006 今天已达到“可稳定使用的最低标准”

# 开发流程（Spec‑Kit / Codex）

本仓库采用 Spec‑Kit 的“文档驱动开发”骨架：每个功能都必须按 `spec → plan → tasks → implement` 推进。

## 1) 初始化（只需一次）

在项目根目录：

```bash
./scripts/codex
```

或手动：

```bash
export CODEX_HOME="$PWD/.codex"
codex
```

验证：在 Codex 里输入 `/`，应能看到 `/speckit.specify`、`/speckit.plan`、`/speckit.tasks` 等命令。

## 2) 开发一个新功能（每次都走）

1. 创建 feature 目录（生成 `specs/001-xxx/spec.md`）：

```bash
./.specify/scripts/bash/create-new-feature.sh "一句话需求" --short-name your-feature
```

2. 完善 `spec.md`（范围/验收/边界），生成并完善 `plan.md`：

```bash
./.specify/scripts/bash/setup-plan.sh
```

3. 在 Codex 里生成 `tasks.md`：

```text
/speckit.tasks
```

4. 按 `tasks.md` 小步实现：一次只做一条任务；每做完就跑测试并勾选任务。

5. 提交 PR 前更新仓库入口文档：
   - `docs/PRD.md`：追加 1 条“变更记录”（必填）
   - `README.md` / `AGENTS.md`：按影响面同步更新

## 3) 规范来源

- 工程/质量约束以 `.specify/memory/constitution.md` 为准。

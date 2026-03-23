# OpenSparrow Constitution（Unified Source Repo Baseline）

> 本文件是统一仓的开发宪法：约束 AI 与团队如何在 `opensparrow/` 根目录中推进多平台收口、验证与后续容器化。
> 本项目采用 Spec‑Kit（Codex）文档驱动工作流：需求 → 方案 → 任务 → 实现。

## 1) 核心原则（非协商）

1. **简单至上（保留关键信息）**
   - 优先保留现有平台入口名和用户操作习惯，不为“形式统一”牺牲稳定性。
   - 文档优先给出可执行命令、目录路径、平台差异与验证方法。

2. **模块化与清晰边界**
   - 统一仓只统一真源，不强行统一平台 wrapper。
   - `platforms/`、`scripts/`、`ui/`、`docs/`、`specs/`、`longrun/` 为人工维护面；`dist/` 为生成物；`vendor/` 为只读分发包。

3. **面向接口编程（契约优先）**
   - 入口脚本名、平台使用指南、安装参数、验证链、导出结构都属于契约。
   - 变更契约前先改文档，再改实现。

4. **文档驱动：先改文档，再改代码**
   - 非 trivial 需求必须先在 `specs/<feature>/spec.md` → `plan.md` → `tasks.md` 中落文档。
   - 每个完成的功能都要同步更新 `longrun/workspaces/opensparrow-unified/feature_list.json` 与 `claude-progress.txt`。
   - 若影响 legacy 上下文，也同步更新对应 workspace 的 handoff 记录。

5. **测试驱动 & 可复现**
   - 所有会话至少先跑一次 `./longrun/workspaces/opensparrow-unified/init.sh`。
   - Shell / `.command` 改动优先做 `bash -n`；PowerShell 改动记录 dry-run 或语法验证方式。
   - 验证方式必须落盘，不留在对话里。

6. **易用性与健壮性**
   - 尽量把复杂流程沉淀为脚本、runbook 或长效文档。
   - 保持平台入口差异存在，但让共享逻辑、配置契约与验证链收敛。

7. **风格与一致性**
   - 文档以中文为主，命令和路径写全。
   - 保持 UTF-8；修改尽量小而聚焦，不重写上游 vendor 内容。

8. **做确定的动作**
   - 不确定平台行为时，先看现有脚本、README、runbook，再决定是否改动。
   - 不凭空假设运行时内部实现；涉及内部路径时，以仓内已有资产为准。

## 2) 项目补充约束（Project Addendum）

1. **形态与边界**
   - 项目形态：统一真源仓 + 多平台 companion/wrapper + USB/Feishu 安装链 + UI 控制面 + 长期工作区。
   - 不做清单：当前阶段不重写 OpenClaw 内核、不强行统一所有入口脚本、不跳过边界冻结直接大删目录。
   - 外部接口边界：当前对外主要提供本地脚本、文档、导出产物与后续容器化运行基线。

2. **质量门槛**
   - 测试策略：以路径存在性检查、脚本语法检查、workspace init、说明文档核对为主。
   - 验证方式落盘：统一先跑 `./longrun/workspaces/opensparrow-unified/init.sh`，并在 `claude-progress.txt` 记录证据。
   - 版本与兼容：保持现有平台入口名稳定；若 wrapper 行为改变，必须同步更新文档与迁移说明。

3. **安全与合规**
   - 数据分级：仓库内只保留公开/内部脚本与文档，不落盘或提交配对凭证、API 密钥、登录态。
   - 日志与审计：默认不把敏感配置写进日志；生成的本地日志、导出产物、临时配置应进入忽略目录。
   - 依赖与供应链：`vendor/` 中的运行时包视为外部分发资产，修改必须谨慎。
   - 访问控制：任何密钥、本机配置、`.codex` 登录态文件不得提交。

4. **工程约定**
   - 根目录结构：
     - `platforms/`：平台 source-of-truth
     - `vendor/`：运行时包
     - `scripts/openclaw-usb/`：共享安装/收口逻辑
     - `ui/`：控制面
     - `docs/`：方案、runbook、说明
     - `specs/`：特性文档
     - `longrun/`：长期工作区
     - `deploy/docker/`：后续容器化基线
     - `dist/`：生成物输出
   - 冻结目录：`opensparrow_win/`、`_push_opensparrow_win/`、`openclaw-usb-feishu-delivery/`、`openclawtest/` 当前不再作为长期编辑面。
   - 子项目约定：若未来在 `ui/` 或其他目录形成独立子项目根，必须补充更深层 `AGENTS.md`。

## 3) 工作流（Spec‑Kit）

1. 生成 feature 文档：`./.specify/scripts/bash/create-new-feature.sh "一句话需求" --short-name xxx`
2. 完善 `spec.md` → 生成并完善 `plan.md`：`./.specify/scripts/bash/setup-plan.sh`
3. 在 Codex 内生成 `tasks.md`：`/speckit.tasks`
4. 按 `tasks.md` 小步实现；每步跑验证并更新 `feature_list.json` / `claude-progress.txt`

## Governance

- 本宪法优先级高于临时习惯与历史目录结构；若需变更，必须先更新本文件与相关说明文档。

**Version**: 2.0.0 | **Ratified**: 2026-03-23 | **Last Amended**: 2026-03-23

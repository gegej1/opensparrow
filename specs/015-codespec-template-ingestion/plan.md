# Implementation Plan: codeSPEC Template Ingestion & Repo Cleanup Mapping

**Branch**: `015-codespec-template-ingestion` | **Date**: 2026-04-14 | **Spec**: `specs/015-codespec-template-ingestion/spec.md`

## Summary

本次实现的目标不是“把 `codeSPEC` 整仓搬进来”，而是安全地把其中适合当前 unified repo 使用的模板层抽出来，落到一个独立的 reference 命名空间，并用脚本把同步范围固定下来。这样后续清洗和重整当前仓时，可以直接查阅和刷新模板，而不会污染当前仓的权威目录，也不会回写 source 项目。

本轮交付包含：

1. 为本轮迁移补齐 `spec.md`、`plan.md`、`tasks.md`；
2. 用 TDD 方式新增 `scripts/import-codespec-template.sh` 与自动化测试；
3. 在 `docs/reference/codeSPEC-template/` 下建立本地说明层与 upstream 模板镜像；
4. 把 `codeSPEC` 中更清晰的 `longrun` 边界说明吸收到当前仓活跃文档；
5. 更新 `README.md` 与 unified longrun 记录，使后续协作者能直接找到这一参考模板入口；
6. 通过脚本测试、`bash -n`、workspace init 与 progress report 做收口验证。

## Technical Context

- **Repository root**: `/Users/eduardogan/Desktop/GHJProject/opensparrow`
- **Source project**: `/Users/eduardogan/Desktop/GHJProject/codeSPEC`
- **Nature of change**: Documentation / repo-maintenance / helper script（无运行时代码改动）
- **Primary write targets**:
  - `specs/015-codespec-template-ingestion/spec.md`
  - `specs/015-codespec-template-ingestion/plan.md`
  - `specs/015-codespec-template-ingestion/tasks.md`
  - `scripts/import-codespec-template.sh`
  - `scripts/tests/import-codespec-template.test.mjs`
  - `docs/reference/codeSPEC-template/README.md`
  - `docs/reference/codeSPEC-template/IMPORT_SCOPE.md`
  - `docs/reference/codeSPEC-template/upstream/UnifiedFramework/*`
  - `docs/runbooks/F-021-codespec-template-ingestion.md`
  - `longrun/README.md`
  - `longrun/CHECKLIST.md`
  - `longrun/METHOD.zh-CN.md`
  - `README.md`
  - `longrun/workspaces/opensparrow-unified/feature_list.json`
  - `longrun/workspaces/opensparrow-unified/claude-progress.txt`
- **Validation anchors**:
  - `node --test scripts/tests/import-codespec-template.test.mjs`
  - `bash -n scripts/import-codespec-template.sh`
  - `./scripts/import-codespec-template.sh /Users/eduardogan/Desktop/GHJProject/codeSPEC`
  - `./longrun/workspaces/opensparrow-unified/init.sh`
  - `python3 longrun/scripts/progress_report.py longrun/workspaces/opensparrow-unified/feature_list.json`
  - `python3 -m json.tool longrun/workspaces/opensparrow-unified/feature_list.json`

## Design

### A. Curated Import Boundary

- 仅同步 `codeSPEC/UnifiedFramework/` 中适合当前仓“清洗/重整参考”的文档与 manifest：
  - `README.md`
  - `01-Unified-Framework-Architecture.md`
  - `02-Pruning-Checklist.md`
  - `03-Interface-Contracts.md`
  - `04-New-Project-Integration-Flow.md`
  - `05-Migration-Playbook.md`
  - `06-Future-Extension-Policy.md`
  - `export-manifest.authoring.yaml`
- 明确跳过：
  - `07-Current-State-Audit.md` 与 `13-Batch-2-Execution-Design.md` 等 source-specific 审计/批次残留
  - `spec规范/.specify`、`.codex/prompts`、`scripts/codex`（当前仓已存在本地化版本）
  - `AgentTeam/`（当前仓已有 `F-019` 治理文档，应避免双 authority）
  - `memory_context_recovery/`、`longterm/mcp/`、`node_modules/`、实验截图与 replay 残留

### B. Import Script Contract

- 导入脚本使用白名单复制策略，而不是目录级粗拷贝。
- 脚本默认从本机 `codeSPEC` 路径读取，但允许注入自定义 source/target 路径用于测试和未来刷新。
- 脚本只重建 `docs/reference/codeSPEC-template/upstream/`，不覆盖同级本地 `README.md` 与 `IMPORT_SCOPE.md`。
- 脚本生成简短 manifest，记录 source 路径与白名单文件，便于审计。

### C. Local Reference Surface

- 新增 `docs/reference/codeSPEC-template/README.md`：说明为什么导入、当前仓如何使用、哪些目录是权威面、哪些只是参考镜像。
- 新增 `docs/reference/codeSPEC-template/IMPORT_SCOPE.md`：列出导入白名单、跳过清单、与当前仓已有目录的对应关系。
- 新增 `docs/runbooks/F-021-codespec-template-ingestion.md`：记录一次完整刷新动作、命令、验证和风险边界。
- 将 `codeSPEC` 的 `longrun` 边界说明吸收到当前仓的 `longrun/README.md`、`longrun/CHECKLIST.md`、`longrun/METHOD.zh-CN.md`。
- `README.md` 增加 reference 入口，便于后续清洗/重整直接定位。

### D. Record Sync & Validation

- `feature_list.json` 新增 `F-021`，记录这次模板迁入和边界说明。
- `claude-progress.txt` 增加本轮时间线、导入范围、跳过项和验证证据。
- 验证顺序：
  1. 先写 failing test；
  2. 实现脚本到 green；
  3. 执行真实 source 同步；
  4. 运行 `bash -n`、workspace init、progress report 与 JSON 校验；
  5. 人工核对 reference 文档与 longrun 记录一致。

## Validation Plan

1. 新增并运行 `node --test scripts/tests/import-codespec-template.test.mjs`，先看到 red，再把脚本实现到 green。
2. 运行 `bash -n scripts/import-codespec-template.sh`，确认 shell 语法合法。
3. 运行 `./scripts/import-codespec-template.sh /Users/eduardogan/Desktop/GHJProject/codeSPEC`，确认当前仓 reference 目录生成成功。
4. 运行 `python3 -m json.tool longrun/workspaces/opensparrow-unified/feature_list.json >/dev/null`，确认 feature list JSON 合法。
5. 运行 `./longrun/workspaces/opensparrow-unified/init.sh`，确认 unified workspace 初始化链仍然可用。
6. 运行 `python3 longrun/scripts/progress_report.py longrun/workspaces/opensparrow-unified/feature_list.json`，确认 feature 汇总报告可生成。
7. 人工检查 `README.md`、runbook、reference README、IMPORT_SCOPE、feature list 与 progress 文本的口径一致，且都明确“不修改 codeSPEC source”。

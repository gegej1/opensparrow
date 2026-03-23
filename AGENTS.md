# OpenSparrow Unified Repo Guide

本仓库现在作为 `OpenClaw/OpenSparrow` 的统一真源工作目录，根路径为 `/Users/eduardogan/Desktop/GHJProject/opensparrow`。

## 开始任何开发前必须先看

- `docs/项目持久化说明.md`
- `.specify/memory/constitution.md`
- `longrun/workspaces/opensparrow-unified/app_spec.md`
- `longrun/workspaces/opensparrow-unified/feature_list.json`
- `longrun/workspaces/opensparrow-unified/claude-progress.txt`

如果你要修改迁入的旧上下文，也一并查看：

- `longrun/workspaces/openclaw-native/app_spec.md`
- `longrun/workspaces/openclaw-usb-portable/app_spec.md`

## 仓库定位

- `platforms/`：平台源文件，包含 companion 脚本与 wrapper 模板。
- `vendor/`：上游运行时二进制，只读处理。
- `scripts/openclaw-usb/`：共享安装/收口逻辑真源。
- `ui/`：USB/UI 控制面源文件。
- `docs/`、`specs/`、`longrun/`、`.specify/`、`.codex/`：文档驱动与持久化骨架。
- `dist/`：生成物输出目录，不作为人工维护面。

## 已冻结的历史目录

以下目录当前视为历史快照、push copy 或实验区，不再承担真源角色：

- `opensparrow_win/`
- `_push_opensparrow_win/`
- `openclaw-usb-feishu-delivery/`
- `openclawtest/`

若确实需要从这些目录抽取漏迁资产，必须先落 spec，再在进度记录中写明来源与去向。

## 必须遵守

- 非 trivial 需求先落文档：`specs/<feature>/spec.md` → `plan.md` → `tasks.md`，再改代码。
- 每次完成一个功能后，至少同步更新：
  - `longrun/workspaces/opensparrow-unified/feature_list.json`
  - `longrun/workspaces/opensparrow-unified/claude-progress.txt`
  - 受影响的使用文档、平台指南或 runbook
- 不提交任何凭证或本机配置：`.codex/auth.json`、`.codex/config.toml`、`.env` 类文件必须保持忽略。
- 不要随意修改 `vendor/` 中的二进制、`node_modules/`、`bin/`、`lib/`、`share/`、`*.exe` 等内容，除非任务明确要求。
- 不要强行统一平台入口脚本：macOS 继续允许 `.command + Bash`，Windows 继续允许 `.cmd/.ps1`。

## 推荐修改区域

- 统一逻辑优先在：`scripts/`、`ui/`、`docs/`、`specs/`、`longrun/`、`.specify/`
- 平台逻辑优先在：`platforms/linux/`、`platforms/mac/`、`platforms/windows/`
- 若研究运行时行为，先看对应 `vendor/*/README.*` 和平台说明，再决定是否调整 companion 或 wrapper

## 验证建议

- 统一先跑：`./longrun/workspaces/opensparrow-unified/init.sh`
- 继续会话前跑：`./longrun/scripts/session_start.sh longrun/workspaces/opensparrow-unified`
- 查看整体进度：`python3 longrun/scripts/progress_report.py longrun/workspaces/opensparrow-unified/feature_list.json`
- Shell / `.command` 改动后优先做 `bash -n`
- Windows PowerShell 改动后如环境可用，做 `pwsh` 语法解析或 dry-run

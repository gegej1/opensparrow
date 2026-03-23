# App Spec (openclaw-native)

## 0) Project metadata
- Project name: openclawNative (imported into opensparrow root)
- Workspace name: openclaw-native
- Existing repo path (if migrating): /Users/eduardogan/Desktop/GHJProject/opensparrow
- Primary owner: Eduard Ogan
- Last updated (YYYY-MM-DD): 2026-03-23

## 1) Product goal
本工作区用于维护从 `openclawNative` 迁入的多平台运行时包与 companion 源文件。
当前它不再代表独立仓库，而是作为统一根仓中的一个 imported workspace，继续覆盖：

1. `vendor/` 下的 Linux/macOS/Windows 运行时包；
2. `platforms/*/companion/` 下的平台配套脚本与平台说明；
3. 与这些运行时、companion 源文件相关的 handoff、验证与文档同步。

## 2) In-scope user workflows
1. 维护者能在 `vendor/` 与 `platforms/*/companion/` 中继续维护多平台运行时配套源文件。
2. 维护者能逐个平台核对 companion 指南与入口脚本是否一致。
3. 后续会话能沿本 workspace 继续做 Linux/macOS/Windows 三端校准。

## 3) Out of scope
- 不重写上游 `OpenClaw` runtime 内核。
- 不把 `platforms/*/companion/` 强行改造成统一入口脚本。
- 不直接在 legacy frozen 目录里修平台逻辑。

## 4) Technical baseline
- Runtime: `vendor/{linux-openclaw,mac-openclaw,windows-openclaw}`
- Companion source: `platforms/{linux,mac,windows}/companion/`
- Workflow: `longrun/` + `.specify/` + `docs/`
- Package manager: Windows vendor bundle 自带 Node/npm；其他平台按现有 runtime 说明使用
- Data store: 本地 runtime 状态、日志与后续导出产物

## 5) Existing-project migration constraints
- Stable modules that must not break: `platforms/*/companion/` 中现有入口名与使用指南
- APIs/contracts that must remain backward compatible: 平台说明中的文件名、命令名、调用顺序
- Files/directories that cannot be touched: `vendor/` 中二进制、`node_modules/`、`bin/`、`lib/`、`share/`、`*.exe`
- Required coding conventions: 优先改 companion 源文件和文档；保持 UTF-8；小步修改
- Required review/testing gates: `./longrun/workspaces/openclaw-native/init.sh` + shell 语法检查 + 文档核对

## 6) Commands contract
- Source locations: Linux `platforms/linux/companion/日常使用.sh` | macOS `platforms/mac/companion/start` | Windows `platforms/windows/companion/start-gateway.ps1`
- Workspace init: `./longrun/workspaces/openclaw-native/init.sh`
- Lint: `bash -n platforms/linux/companion/*.sh && bash -n platforms/mac/companion/*`
- Validation reference: `./longrun/workspaces/opensparrow-unified/init.sh`

## 7) Quality and non-functional requirements
- Performance: 不显著增加平台脚本复杂度
- Security: 不提交任何凭证、登录态或本机配置
- Accessibility: 文档以中文为主，路径完整可复制
- Observability: 每次变更都记录在 `claude-progress.txt`
- Reliability: companion 入口名、目录结构与使用方式保持稳定

## 8) Definition of done
- [ ] Linux/macOS/Windows companion workflows have matching entries in `feature_list.json`.
- [ ] Imported path changes are reflected in docs and workspace init.
- [ ] Vendor boundaries are respected.
- [ ] Session handoff remains clear from `claude-progress.txt`.

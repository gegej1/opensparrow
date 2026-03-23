# App Spec (opensparrow-unified)

## 0) Project metadata
- Project name: OpenSparrow Unified Source Repo
- Workspace name: opensparrow-unified
- Existing repo path (if migrating): /Users/eduardogan/Desktop/GHJProject/opensparrow
- Primary owner: Eduard Ogan
- Last updated (YYYY-MM-DD): 2026-03-23

## 1) Product goal
本工作区用于把 `opensparrow/` 根目录收敛成唯一真源仓。
它同时承载：

1. 多平台运行时 vendor；
2. Linux/macOS/Windows companion 与 wrapper 源文件；
3. USB/Feishu 安装与收口逻辑；
4. UI 控制面；
5. longrun/spec 持续开发骨架；
6. 后续容器化基线的落点。

## 2) In-scope user workflows
1. 维护者能在 `opensparrow/` 根目录中找到全部真源，而不是跨两个顶层目录工作。
2. 团队能沿 `specs/` → `plan.md` → `tasks.md` → `longrun/` 的流程继续推进仓库清理与容器化。
3. 维护者能从 `platforms/`、`scripts/openclaw-usb/`、`ui/`、`docs/` 继续演进平台能力与导出逻辑。
4. legacy workspace 上下文在新根目录中仍可用于交接和追踪。
5. 维护者能验证 legacy frozen 目录的逻辑归档状态，并通过 `deploy/docker/` 运行统一容器基线。

## 3) Out of scope
- 不在本阶段删除 legacy 目录或重写 OpenClaw runtime 内核。
- 不强行统一 macOS / Windows 的原生入口脚本。
- 不在本阶段完成 build/export 与 native wrapper 的最终收口。

## 4) Technical baseline
- Runtime: vendor OpenClaw runtime bundles + Bash / PowerShell / `.command` wrapper
- Framework: Longrun + Spec-Kit + OpenClaw USB install/hardening scripts
- Package manager: 以 vendor/node runtime 与现有 npm 生态为主
- Data store: 本地 runtime state、workspace 进度记录、后续 dist 生成物
- External APIs/services: Feishu、OpenAI-compatible endpoint、后续 Docker Desktop

## 5) Existing-project migration constraints
- Stable modules that must not break: `platforms/*/companion/` 的入口名、`scripts/openclaw-usb/*`、`ui/`、legacy workspace 历史记录
- APIs/contracts that must remain backward compatible: 平台使用指南中的路径与脚本名、Feishu 安装脚本参数契约、验证链命令
- Files/directories that cannot be touched casually: `vendor/`、legacy frozen 目录
- Required coding conventions: 文档优先、路径明确、冻结边界不漂移
- Required review/testing gates: `./longrun/workspaces/opensparrow-unified/init.sh` + shell 语法检查 + legacy workspace init

## 6) Commands contract
- Init: `./longrun/workspaces/opensparrow-unified/init.sh`
- Session start: `./longrun/scripts/session_start.sh longrun/workspaces/opensparrow-unified`
- Verify legacy freeze: `bash scripts/verify-legacy-freeze.sh`
- USB install (macOS/Linux): `bash scripts/openclaw-usb/install-local-feishu.sh --profile usb-portable --port 18889`
- USB install (Windows): `powershell -ExecutionPolicy Bypass -File scripts/openclaw-usb/install-local-feishu.ps1 -Profile usb-portable -Port 18889`
- Build delivery pack: `bash longrun/workspaces/openclaw-usb-portable/execution/scripts/build-delivery-pack.sh`
- Docker config: `docker compose -f deploy/docker/docker-compose.yml config`
- Docker up: `docker compose -f deploy/docker/docker-compose.yml up -d --build opensparrow-core`
- Docker bootstrap: `docker compose --env-file deploy/docker/.env -f deploy/docker/docker-compose.yml run --rm opensparrow-bootstrap`
- Lint shell: `bash -n scripts/openclaw-usb/*.sh && bash -n platforms/linux/companion/*.sh && bash -n platforms/mac/companion/* && bash -n platforms/mac/wrappers/*.command`

## 7) Quality and non-functional requirements
- Performance: 不显著增加现有脚本与导出链复杂度
- Security: 不提交密钥、登录态或本机配置
- Accessibility: 文档以中文为主，路径完整，可复制
- Observability: 每次变更都有 `claude-progress.txt` 证据与下一步
- Reliability: 根目录结构、入口名、legacy 边界稳定

## 8) Definition of done
- [ ] 统一真源目录已固定在 `opensparrow/`
- [ ] `openclaw-native` 与 `openclaw-usb-portable` 上下文已迁入并适配
- [ ] 根级规则文件与方案文档已到位
- [ ] unified workspace 初始化可重复执行
- [ ] legacy 冻结边界已清楚记录
- [ ] `deploy/docker/` 基线已可渲染并能返回 `/api/status`

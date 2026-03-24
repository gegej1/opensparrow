# OpenClaw 本地 / U 盘可迁移部署方案（执行与打磨版）

## 元数据
- 日期：`2026-03-23`
- 作者/Agent：`Codex-B`
- 关联 spec：`specs/002-openclaw-usb-installer/spec.md`；`specs/008-build-export-dist-closure/spec.md`

## 概述
- 本方案只解决一件事：把 OpenClaw + 飞书 WebSocket + OpenAI 兼容模型链路，做成一个可在新机器上重复执行、可打包到 U 盘交付、且不污染现有默认环境的本地部署包。
- 本文是 `usb-pack` 目录的架构总览，描述隔离原则、资产拆分、导出边界、平台策略与执行顺序。

## 前置条件
- 本文与主工作区中 Notion / VPS / 其他部署主题强隔离：
  1. 功能隔离：本目录只处理本地与 U 盘交付，不触碰 Notion 联动流程。
  2. 运行隔离：所有执行统一使用 `openclaw --profile usb-portable`。
  3. 状态隔离：配置、state、agent auth、workspace、service、gateway port 全部隔离。
  4. 证据隔离：日志、probe、smoke test 仍写到执行 workspace；生成物统一写到根级 `dist/`。
  5. 导出边界隔离：对外导出副本只保留 Feishu 本地/U 盘部署资产，不混入 Notion/VPS 内容。
- 我们隔离的是什么：
  - OpenClaw profile：`usb-portable`
  - OpenClaw state/config：`~/.openclaw-usb-portable/`
  - OpenClaw config file：`~/.openclaw-usb-portable/openclaw.json`
  - Agent auth：`~/.openclaw-usb-portable/agents/main/agent/auth-profiles.json`
  - Agent workspace：`~/.openclaw-usb-portable/workspace/`
  - Gateway service label：`ai.openclaw.usb-portable`
  - Gateway port：默认请求 `18889`，若占用则自动回退到下一个空闲端口
  - 执行日志：`longrun/workspaces/openclaw-usb-portable/execution/logs/`
  - 验证证据：`longrun/workspaces/openclaw-usb-portable/execution/evidence/`
  - U 盘 staging 包：`dist/usb-pack/openclaw-usb-pack/`
- 仍然共享的东西：
  - 全局 `openclaw` CLI 二进制本身可能复用机器已安装版本。
  - 全局 `node` / `npm` 复用系统已有安装。
  - 这意味着“工具链共享”，但“运行时状态隔离”。

## 操作步骤
1. 明确源资产、执行资产与最终交付件的分层

   ```text
   无固定命令；按下列分层审阅架构资产
   ```

   - 源资产：
     - 安装脚本：`scripts/openclaw-usb/install-local-feishu.sh`
     - 收口脚本：`scripts/openclaw-usb/harden-local-feishu.sh`
     - Skill：`skills/openclaw-local-feishu-usb/SKILL.md`
     - SOP：`research/openclaw-usb-installer/SOP.md`
     - 来源：`research/openclaw-usb-installer/SOURCES.md`
   - 执行资产：
     - 方案文档：`longrun/workspaces/openclaw-usb-portable/execution/docs/`
     - Runbook：`longrun/workspaces/openclaw-usb-portable/execution/runbooks/`
     - 本机联调辅助脚本：`longrun/workspaces/openclaw-usb-portable/execution/scripts/`
     - canonical 组包源：`docs/usb-pack/`、`docs/runbooks/`、`platforms/*/wrappers/`、`scripts/openclaw-usb/`

2. 组装最终 U 盘包并核对目录结构

   ```bash
   bash longrun/workspaces/openclaw-usb-portable/execution/scripts/build-delivery-pack.sh
   find dist/usb-pack/openclaw-usb-pack -maxdepth 3 | sort
   ```

   - 目标结构如下：

     ```text
     openclaw-usb-pack/
     ├── README.txt
     ├── one-click-deploy.cmd
     ├── one-click-deploy.ps1
     ├── docs/
     │   ├── SOP.md
     │   ├── SOURCES.md
     │   ├── isolation-boundary.md
     │   └── solution-architecture.md
     ├── mac/
     │   ├── run-openclaw-usb.command
     │   └── harden-openclaw-usb.command
     ├── windows/
     │   ├── run-openclaw-usb.cmd
     │   ├── install-local-feishu.ps1
     │   └── harden-local-feishu.ps1
     ├── ui/
     │   ├── server.mjs
     │   └── public/
     ├── runbooks/
     │   ├── F-001-install-and-configure.md
     │   ├── F-002-skill-polish.md
     │   ├── F-003-usb-delivery-pack.md
     │   └── F-004-security-hardening.md
     ├── scripts/
     │   └── openclaw-usb/
     │       ├── install-local-feishu.sh
     │       └── harden-local-feishu.sh
     └── skills/
         └── openclaw-local-feishu-usb/
             └── SKILL.md
     ```

3. 执行导出范围约束

   ```text
   无固定命令；按下列导出边界审阅 build/export 结果
   ```

   - Mac / Windows 导出包统一采用 **Feishu-only** 范围。
   - Notion 相关 specs / scripts / research 不进入导出副本。
   - 如果需要源码参考，只附带 002 USB/Feishu 本地部署相关文件，不附带 003 Notion 集成资产。
   - 导出公共逻辑统一收敛到 `execution/scripts/lib/export-common.sh`，平台脚本只保留平台差异。
   - bundled runtime 统一从根级 `vendor/` 复制，不再依赖本机全局安装或在线下载。

4. 按平台策略交付

   ```text
   无固定命令；按平台差异选择对应入口与导出方式
   ```

   - macOS：
     - 主入口：`.command` 文件
     - 运行方式：手动双击或 Terminal 执行
     - 说明：不绕过 Gatekeeper，不做 USB 自动执行
   - Windows：
     - 主入口：`.cmd` 调起原生 PowerShell
     - 安装逻辑：PowerShell 直接执行 `scripts/openclaw-usb/install-local-feishu.ps1`
     - 历史 UI 配置重放：`one-click-deploy.ps1` 启动 `ui/server.mjs` 并把现有 profile 配置重新提交到 `/api/install`
     - 运行时：Windows handoff copy 内置 `runtime/node/node.exe` 与 `runtime/openclaw/openclaw.mjs`
     - 打包方式：使用独立 `create-windows-handoff-copy.sh` 生成 Windows 专属副本
     - 说明：不绕过 AutoRun / AutoPlay 策略，不做自动执行

5. 按推荐顺序推进执行

   ```bash
   bash scripts/openclaw-usb/install-local-feishu.sh --profile usb-portable --port 18889
   bash scripts/openclaw-usb/harden-local-feishu.sh --profile usb-portable --dm-policy pairing --allow-from-json '[]' --require-mention true
   ```

   - 执行顺序：
     1. 先在 macOS 本机用隔离 profile 完成 F-001 实跑。
     2. 基于实跑结果补证据、补 Skill、补 SOP。
     3. 组装 U 盘交付包。
     4. 完成 F-004 收口命令与复验。
     5. Windows 入口、原生脚本与平台专属导出包同日补齐；若无 Windows 主机，先完成静态交付资产。

## 验证方法
- 每次 F-001 实跑必须至少产出：
  - `config-validate.json`
  - `health.json`
  - `daemon-status.txt`
  - `channels-probe.json`
  - `agent-smoke.json`
  - `session-metadata.txt`
  - 安装日志文件
- 今晚完成标准：
  - macOS：实机完成一次隔离安装与 probe/agent 验证
  - Windows：原生 PowerShell 入口、平台专属导出包与说明补齐
  - 文档：Skill / SOP / spec / plan / tasks / longrun 全部同步
  - 交付：staging 包可直接拷到 U 盘

## 故障排查
- 发现导出包混入 Notion/VPS 资产：回看导出范围约束和 `package-boundary.md`，重新收紧 build/export 源目录。
- 发现 bundled runtime 依赖在线下载或本机全局安装：重新核对 `vendor/` 是否被正确作为运行时来源。
- 发现 wrapper 承载了过多业务逻辑：回到“平台脚本只保留平台差异、共享逻辑收敛到 canonical 真源”的架构原则。

## 参考资料
- `specs/002-openclaw-usb-installer/spec.md`
- `specs/008-build-export-dist-closure/spec.md`
- `docs/usb-pack/SOP.md`
- `docs/usb-pack/package-boundary.md`
- `docs/runbooks/F-001-install-and-configure.md`
- `docs/runbooks/F-003-usb-delivery-pack.md`
- `docs/runbooks/F-004-security-hardening.md`

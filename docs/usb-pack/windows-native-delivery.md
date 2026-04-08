# Windows Native Delivery Notes

## 元数据
- 日期：`2026-03-23`
- 作者/Agent：`Codex-B`
- 关联 spec：`specs/002-openclaw-usb-installer/spec.md`；`specs/008-build-export-dist-closure/spec.md`

## 概述
- 为 Windows 目标机提供一份 **Feishu-only**、**原生 PowerShell**、**可拷贝到 U 盘** 的 OpenClaw 本地部署包。
- 本文聚焦 Windows 原生交付的边界、运行时策略、导出方式和历史配置重放路径。

## 前置条件
- 交付边界：
  - 只包含 OpenClaw + Feishu 本地/U 盘部署内容。
  - 不包含 Notion、VPS、知识检索、群聊归档等其他主题。
  - 不绕过 AutoRun / AutoPlay。
  - 不预置真实密钥；密钥仅在目标机运行时输入。
- 运行时策略：
  - 入口：`windows/run-openclaw-usb.cmd`
  - 实际执行：`windows/install-local-feishu.ps1`
  - 主逻辑：`scripts/openclaw-usb/install-local-feishu.ps1`
  - 历史 UI 配置重放入口：`one-click-deploy.ps1`（对应 canonical 真源：`platforms/windows/wrappers/one-click-deploy.ps1`）
  - GitHub 源码仓库直跑入口：根目录 `one-click-deploy.cmd`（桥接到 canonical wrapper）
  - UI 服务：`ui/server.mjs`
  - bundled runtime：
    - handoff copy：`runtime/node/node.exe` + `runtime/openclaw/openclaw.mjs`
    - GitHub / repo-root：`vendor/windows-openclaw/node.exe` + `vendor/windows-openclaw/node_modules/openclaw/openclaw.mjs`
- 默认隔离：
  - profile：`usb-portable`
  - state：`%USERPROFILE%\.openclaw-usb-portable\`
  - workspace：`%USERPROFILE%\.openclaw-usb-portable\workspace\`
  - gateway port：优先使用 `18889`，若占用则自动回退到下一个空闲端口

## 操作步骤
1. 导出 Windows handoff copy

   ```bash
   bash longrun/workspaces/openclaw-usb-portable/execution/scripts/create-windows-handoff-copy.sh
   ```

   - 默认导出：
     - 目录：`dist/handoff/windows-feishu-usb-copy-*/`
     - 压缩包：同名 `.zip`

2. 在目标机运行交付包

   ```cmd
   cmd /c windows\run-openclaw-usb.cmd
   ```

   - 目标机使用方式：
     1. 把 `usb-pack/` 整个目录拷到 Windows 本地磁盘。
     2. 双击 `windows/run-openclaw-usb.cmd`，或在命令行执行上面的命令。
     3. 输入：
        - `FEISHU_APP_ID`
        - `FEISHU_APP_SECRET`
        - `OPENAI_API_KEY`
        - `OPENAI_BASE_URL`（可选）
     4. 等待脚本完成。
     5. 联调后运行 `windows/harden-openclaw-usb.cmd` 收口权限。

2.1 从 GitHub 源码仓库直接运行（Windows）

   ```cmd
   cmd /c one-click-deploy.cmd
   ```

   - 适用场景：用户从 GitHub 下载 `opensparrow` 源码 ZIP，希望不安装 Node.js / npm，直接启动 Windows UI 安装入口。
   - 前提：源码目录中已包含 `vendor/windows-openclaw/`。
   - 边界：本模式只补齐 Windows runtime；顶层 `My_Skills/` 之类本机技能镜像不随仓库分发。

3. 重放历史 UI 配置（DingTalk / WeCom / auth profile）

   ```powershell
   powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\one-click-deploy.ps1 -NoPause
   ```

   - 适用条件：目标机已经有 `%USERPROFILE%\.openclaw-usb-portable\openclaw.json` 与 `auth-profiles.json`，并且希望直接复用现有 UI 配置执行重装。
   - 该入口会：
     1. 启动包内 `ui/server.mjs`；
     2. 读取现有 profile 中的 `openclaw.json`、`auth-profiles.json` 与可选 `ui-meta.json`；
     3. 对 DingTalk 仅提交最小必需字段（`clientId/clientSecret`），若存在则补带 `corpId/robotCode`；
     4. 在失败时优先输出后端 `errors[] / message`，而不是只显示 `HTTP 400`。
   - 路径兼容性说明：`one-click-deploy.ps1` 现在优先使用当前 `HOME` / `USERPROFILE`，并回退到 Windows 用户配置 API（`Win32_UserProfile`）发现历史 profile；不再写死依赖 `C:\Users\...`。

## 验证方法
- 导出后应至少确认：
  - `dist/handoff/windows-feishu-usb-copy-*/` 目录生成成功。
  - 同名 `.zip` 已生成。
- 当前状态：
  - 设计与脚本已完成到“可交付”级别。
  - 当前仓库在 macOS 上完成了路径与隔离验证。
  - Windows 方案尚未在真实 Windows 主机完成实机验收，交付前建议补一次主机验证。

## 故障排查
- 导出目录或 `.zip` 未生成：先检查 `create-windows-handoff-copy.sh` 是否执行成功，再核对 `dist/handoff/` 写入权限。
- 历史配置重放失败：优先查看 `one-click-deploy.ps1` 的终端输出，确认是否拿到了后端 `errors[] / message`。
- 真实 Windows 主机尚未验收：当前文档已明确这是已知缺口，交付前应补一轮主机实测。

## 参考资料
- `specs/002-openclaw-usb-installer/spec.md`
- `specs/008-build-export-dist-closure/spec.md`
- `docs/usb-pack/SOP.md`
- `docs/usb-pack/package-boundary.md`
- `platforms/windows/wrappers/one-click-deploy.ps1`

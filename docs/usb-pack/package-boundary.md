# Package Boundary: Feishu-Only

## 元数据
- 日期：`2026-03-23`
- 作者/Agent：`Codex-B`
- 关联 spec：`specs/002-openclaw-usb-installer/spec.md`；`specs/008-build-export-dist-closure/spec.md`

## 概述
- 本交付包只服务于一个目标：OpenClaw 本地部署、Feishu WebSocket 接入，以及 U 盘手动交付与安装。
- 本文用于界定允许进入交付包的内容、必须排除的内容，以及最终判断标准。

## 前置条件
- 在执行 build/export、审查 staging 包、或整理 handoff copy 前先阅读本文。
- 本文面向 Feishu-only 的 USB / handoff 交付，不覆盖 Notion、VPS、知识检索或其他主题。

## 操作步骤
1. 仅收集允许打包的内容

   ```text
   无固定命令；按下列允许清单收集交付资产
   ```

   - `scripts/openclaw-usb/`
   - `skills/openclaw-local-feishu-usb/`
   - `research/openclaw-usb-installer/`
   - `specs/002-openclaw-usb-installer/`
   - `longrun/workspaces/openclaw-usb-portable/` 中与 USB/Feishu 本地部署直接相关的说明、runbook、导出脚本
   - 包内运行时：`runtime/node/`、`runtime/openclaw/`
   - 包运行时临时数据：包目录下 `.openclaw-usb-runtime/`

2. 明确排除不应进入交付包的内容

   ```text
   无固定命令；按下列排除清单剔除非目标资产
   ```

   - `research/openclaw-feishu-notion/`
   - `scripts/openclaw-notion/`
   - `specs/003-feishu-notion-sync/`
   - 与 Notion 归档、检索、问答、引用回复相关的任何脚本或文档
   - VPS / Hetzner / 远程部署资产
   - 本机 `.env`、密钥、会话数据、默认 `~/.openclaw/` 状态

3. 对 staging 包执行边界复核

   ```bash
   find dist/usb-pack/openclaw-usb-pack -maxdepth 3 | sort
   ```

   - 平台统一规则：
     - 只包含 Feishu 本地 / U 盘部署资产
     - 不额外混入 Notion / VPS / 其他主题的仓库内容
   - 判断标准：如果某个文件不是为“明天在目标机器上安装 OpenClaw + Feishu”服务，就不应进入导出包。

## 验证方法
- 复核输出目录时，不应看到 Notion / VPS / 其他扩展主题资产。
- 包内不应出现本机密钥、本机会话数据或默认 `~/.openclaw/` 状态。
- 允许清单中的脚本、技能、说明和运行时应完整可追溯。

## 故障排查
- 发现 Notion / VPS 资产混入：回到 build/export 清单，把非 Feishu-only 目录从导出源中剔除。
- 发现密钥或本机状态被打包：立即清理输出目录，并检查是否误从本地运行目录而非 canonical 真源取文件。
- 无法判断某文件是否该打包：套用“是否服务于明天在目标机器上安装 OpenClaw + Feishu”这个判断标准。

## 参考资料
- `specs/002-openclaw-usb-installer/spec.md`
- `specs/008-build-export-dist-closure/spec.md`
- `docs/usb-pack/SOP.md`
- `docs/usb-pack/solution-architecture.md`

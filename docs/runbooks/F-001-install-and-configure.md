# F-001 Runbook - 安装与配置

## 元数据
- 日期：`2026-03-23`
- 作者/Agent：`Codex-B`
- 关联 spec：`specs/002-openclaw-usb-installer/spec.md`

## 概述
- 在本机用隔离 profile 完成 OpenClaw + Feishu + OpenAI 兼容模型的可运行配置，并生成完整证据。
- 本文是 F-001 的执行型 runbook，重点关注安装命令、通过标准和证据归档路径。

## 前置条件
- 当前位于仓库根目录 `/Users/eduardogan/Desktop/GHJProject/opensparrow`。
- 已准备好 `FEISHU_APP_ID`、`FEISHU_APP_SECRET`、`OPENAI_API_KEY`，以及可选的 `OPENAI_BASE_URL`。
- 需要使用隔离 profile `usb-portable` 与独立 gateway 端口 `18889`。

## 操作步骤
1. 执行安装命令

   ```bash
   bash scripts/openclaw-usb/install-local-feishu.sh \
     --profile usb-portable \
     --port 18889 \
     --evidence-dir longrun/workspaces/openclaw-usb-portable/execution/evidence/f001-run
   ```

   - 该步骤会完成 OpenClaw + Feishu + OpenAI 兼容模型的隔离安装，并把证据输出到指定目录。

2. 检查证据归档目录

   ```bash
   find longrun/workspaces/openclaw-usb-portable/execution/evidence/f001-run -maxdepth 2 -type f | sort
   ```

   - 重点确认以下文件已经落盘：
     - `config-validate.json`
     - `health.json`
     - `daemon-status.txt`
     - `channels-probe.json`
     - `agent-smoke.json`
     - `session-metadata.txt`
     - `logs/install-*.log`

## 验证方法
- 通过标准如下：
  - `openclaw --profile usb-portable health --json` 成功。
  - `openclaw --profile usb-portable channels status --probe` 显示 `feishu ... works`。
  - `openclaw --profile usb-portable agent --agent main --message "请只回复OK" --json` 成功。
  - 飞书实测可收到回复。

## 故障排查
- 安装命令执行失败：先查看 `longrun/workspaces/openclaw-usb-portable/execution/evidence/f001-run/logs/install-*.log`，再回看 `session-metadata.txt` 确认最终 profile 与端口。
- `health --json` 失败：先检查 daemon / gateway 是否已真正拉起，再核对是否误用默认 profile 或默认端口。
- `channels status --probe` 或 `agent` smoke 失败：优先检查飞书参数、模型 API 连通性，以及证据目录中的 `channels-probe.json`、`agent-smoke.json`。

## 参考资料
- `specs/002-openclaw-usb-installer/spec.md`
- `docs/usb-pack/SOP.md`
- `docs/usb-pack/isolation-boundary.md`
- `docs/runbooks/F-004-security-hardening.md`

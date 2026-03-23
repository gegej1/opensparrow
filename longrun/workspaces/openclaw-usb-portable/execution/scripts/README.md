# Execution Scripts Map

本目录只放“执行与交付编排层”脚本，不放 OpenClaw 安装核心实现。

## 分层

- `build-delivery-pack.sh`
  - 负责从根级 canonical 路径组装 staging 包，并输出到 `dist/usb-pack/`。
- `create-mac-handoff-copy.sh`
  - 负责生成 Mac 专属 handoff copy，并输出到 `dist/handoff/`。
- `create-windows-handoff-copy.sh`
  - 负责生成 Windows 专属 handoff copy，并输出到 `dist/handoff/`。
- `run-f001-from-local-defaults.sh`
  - 负责本机执行验证辅助。
- `lib/export-common.sh`
  - 负责 Mac / Windows 导出共用逻辑：源码快照复制、runtime 同步、校验和、版本文件等。

## 与核心脚本的边界

核心安装/收口脚本固定放在：

- `scripts/openclaw-usb/install-local-feishu.sh`
- `scripts/openclaw-usb/install-local-feishu.ps1`
- `scripts/openclaw-usb/harden-local-feishu.sh`
- `scripts/openclaw-usb/harden-local-feishu.ps1`

本目录不改这些脚本的业务语义，只负责：

- 交付包组装
- 平台专属导出
- 执行期辅助编排

## 真源约束

- 平台入口从 `platforms/mac/wrappers/` 与 `platforms/windows/wrappers/` 取源。
- 共享安装逻辑从 `scripts/openclaw-usb/` 取源。
- bundled runtime 从 `vendor/` 取源。
- 交付说明与 runbook 从 `docs/usb-pack/` 与 `docs/runbooks/` 取源。
- 本目录不再维护 `delivery-pack/` 模板副本，也不再把生成物写回 `execution/`。

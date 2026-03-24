# F-004 Runbook - 安全收口

## 元数据
- 日期：`2026-03-23`
- 作者/Agent：`Codex-B`
- 关联 spec：`specs/002-openclaw-usb-installer/spec.md`

## 概述
- 把联调阶段的 `dmPolicy=open` 收口到 `pairing` 或 `allowlist`，避免长期开放。
- 本文用于完成联调后的权限收敛，并确认 hardening 后核心能力仍可用。

## 前置条件
- 已完成安装与基础联调，确认当前 profile 为 `usb-portable`。
- 当前环境已经通过至少一次 Feishu probe 或消息 smoke。
- 需要在收口后继续保留必要的可验证性。

## 操作步骤
1. 执行 hardening 命令

   ```bash
   bash scripts/openclaw-usb/harden-local-feishu.sh \
     --profile usb-portable \
     --dm-policy pairing \
     --allow-from-json '[]' \
     --require-mention true
   ```

   - 该步骤会把联调时的开放策略收回到更安全的默认状态。

2. 运行复验命令

   ```bash
   openclaw --profile usb-portable channels status --probe
   openclaw --profile usb-portable daemon status
   ```

   - 通过 probe 与 daemon 状态确认 hardening 没有破坏可用性。

## 验证方法
- 配置已切换为 `pairing` 或 `allowlist`。
- `allowFrom` 不再是 `[*]`。
- 验证命令仍可正常执行。

## 故障排查
- hardening 后 probe 失败：先确认 daemon 仍然运行，再检查收口参数是否过严。
- `allowFrom` 仍为 `[*]`：重新检查 harden 命令参数与 profile 是否正确。
- 收口后消息不再可达：先回看联调阶段的消息来源范围，再决定是否切换到 `allowlist` 并补充允许来源。

## 参考资料
- `specs/002-openclaw-usb-installer/spec.md`
- `docs/runbooks/F-001-install-and-configure.md`
- `docs/usb-pack/SOP.md`

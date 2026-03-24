# Sources

## 元数据
- 日期：`2026-03-23`
- 作者/Agent：`Codex-B`
- 关联 spec：`specs/002-openclaw-usb-installer/spec.md`；`specs/008-build-export-dist-closure/spec.md`

## 概述
- 本文收录 USB / 本地手动部署方案所依赖的官方与高可信资料来源。
- 用途是为包边界、手动入口、平台限制和运行时选择提供可追溯依据。

## 前置条件
- 在设计、评审或更新 `docs/usb-pack/` 下文档前阅读本文。
- 需要核对的主题包括 OpenClaw CLI / Gateway / Channels、飞书事件订阅、以及 USB/系统执行限制。

## 操作步骤
1. 查阅 OpenClaw 官方资料

   ```text
   无固定命令；按下列链接逐项查阅
   ```

   1. OpenClaw CLI 文档首页: https://docs.openclaw.ai/cli
   2. OpenClaw Gateway 文档: https://docs.openclaw.ai/cli/gateway
   3. OpenClaw Channels 文档: https://docs.openclaw.ai/cli/channels
   4. OpenClaw Troubleshooting: https://docs.openclaw.ai/troubleshooting
   5. OpenClaw Setup 文档: https://docs.openclaw.ai/cli/setup

2. 查阅飞书官方资料

   ```text
   无固定命令；按下列链接逐项查阅
   ```

   1. 服务端 SDK / 长连接入口: https://open.feishu.cn/document/server-docs/server-side-sdk
   2. 事件订阅说明: https://open.feishu.cn/document/home/introduction-to-event-subscription

3. 查阅系统与 U 盘执行限制资料

   ```text
   无固定命令；按下列链接逐项查阅
   ```

   1. Microsoft AutoRun/AutoPlay 与策略说明: https://learn.microsoft.com/windows/win32/shell/autoplay-reg
   2. Microsoft AutoRun 限制背景（Windows 安全策略相关）: https://learn.microsoft.com/security-updates/securityadvisories/2011/967940
   3. Apple Gatekeeper 说明: https://support.apple.com/guide/security/gatekeeper-and-runtime-protection-sec5599b66df/web
   4. Node.js 官方下载与发行目录: https://nodejs.org/en/download

## 验证方法
- 结论摘要应始终保持一致：
  - USB 自动执行在现代系统中不是默认可行路径。
  - 交付方案应采用“手动运行入口脚本 + 明确验证步骤”的 SOP。
  - Mac / Windows 应分别导出平台专属 handoff copy，并各自携带对应运行时。
  - 对于 OpenClaw 场景，使用“隔离 profile + 独立端口 + 手动入口脚本”的本地部署路径是可行且可复刻的主路径。

## 故障排查
- 外部链接失效：优先更新到相同主题的官方最新地址，并在文档中保留用途说明。
- 外部资料与现有结论冲突：先更新 `docs/usb-pack/` 下相关文档，再同步 build/export 或平台入口说明。
- 无法判断某项设计是否有依据：回到本文逐项补齐来源，不要只保留口头结论。

## 参考资料
- `specs/002-openclaw-usb-installer/spec.md`
- `specs/008-build-export-dist-closure/spec.md`
- `docs/usb-pack/SOP.md`
- `docs/usb-pack/package-boundary.md`
- `docs/usb-pack/solution-architecture.md`

# 隔离边界说明

## 元数据
- 日期：`2026-03-23`
- 作者/Agent：`Codex-B`
- 关联 spec：`specs/002-openclaw-usb-installer/spec.md`

## 概述
- 如果只加 `--profile usb-portable`，OpenClaw 的默认网关端口仍可能是 `18789`，会和本机已存在的默认服务冲突。
- 因此本文把“profile 隔离”扩展为“五层隔离”，确保本地/U 盘部署不污染默认环境。

## 前置条件
- 适用于安装脚本设计、SOP 编写、问题排查与 build/export 边界校对。
- 当前默认目标 profile 为 `usb-portable`，默认隔离 gateway 端口为 `18889`。

## 操作步骤
1. 应用五层隔离策略

   ```bash
   bash scripts/openclaw-usb/install-local-feishu.sh --profile usb-portable --port 18889
   ```

   - 本方案采用“五层隔离”：
     1. Profile 隔离：`openclaw --profile usb-portable`
     2. 配置/状态隔离：`~/.openclaw-usb-portable/`
     3. Workspace 隔离：`~/.openclaw-usb-portable/workspace/`
     4. Service 隔离：`ai.openclaw.usb-portable`
     5. Gateway 端口隔离：默认 `18889`

2. 核对不会碰到的默认资产

   ```text
   无固定命令；按下列路径逐项核对
   ```

   - 默认 profile：`~/.openclaw/`
   - 默认 config：`~/.openclaw/openclaw.json`
   - 默认 agent auth：`~/.openclaw/agents/main/agent/auth-profiles.json`
   - 默认 service：`ai.openclaw.gateway`
   - 默认端口：`18789`

3. 记录共享系统依赖例外

   ```text
   无固定命令；按下列依赖说明执行环境准备
   ```

   - 以下内容仍属于共享系统依赖，不在 profile 隔离范围内：
     - `node`
     - `npm`
     - `openclaw` 可执行文件
   - 如果系统没有安装这些依赖，安装脚本会先检查并在缺失时报错或安装 CLI。

## 验证方法
- 安装与运行时应只写入 `~/.openclaw-usb-portable/` 及其 workspace，不应污染默认 `~/.openclaw/`。
- gateway 应优先占用隔离端口 `18889`（若占用则自动回退到下一个空闲端口），而不是默认 `18789`。
- service 名称应使用 `ai.openclaw.usb-portable`，而不是默认 service 名称。

## 故障排查
- 仍与默认环境冲突：优先检查是否真的传入 `--profile usb-portable` 与隔离端口参数。
- 端口冲突：回看安装输出或 `session-metadata.txt`，确认最终使用的是哪个端口。
- 缺少 `node` / `npm` / `openclaw`：先补系统依赖，再继续执行安装脚本。

## 参考资料
- `specs/002-openclaw-usb-installer/spec.md`
- `docs/usb-pack/SOP.md`
- `docs/runbooks/F-001-install-and-configure.md`

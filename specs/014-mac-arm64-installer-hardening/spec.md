# F-020 Mac arm64 installer hardening

## Summary

修复 macOS arm64 UI 包在首次安装时的两条失败链路：
1. `skills/superpowers` 含子目录时，安装流程错误地按普通文件复制，触发 `ENOTSUP`。
2. 钉钉 / 企微插件默认走 ClawHub 解析，遇到 `429 Rate limit exceeded` 时安装失败，随后仍继续写 `channels.dingtalk/*` / `channels.wecom/*` 配置，导致 `unknown channel id` 噪音错误。

## Goals

- superpowers 安装必须支持目录型 skill 结构。
- Mac arm64 交付包应优先使用随包本地插件归档安装钉钉 / 企微插件，避免首次部署依赖 ClawHub。
- 若插件仍未安装成功，安装流程必须跳过对应渠道配置写入，并返回单一、清晰的失败原因。
- 生成新的 arm64 ZIP，替换当前有缺陷的最新包。

## Non-goals

- 不改 Windows / Linux 包。
- 不改 DingTalk / WeCom 的业务字段模型。
- 不引入 DMG。

## Requirements

### R1. Recursive skill copy
- `installSkills()` 复制 `skills/superpowers/` 时，必须正确处理文件与目录。
- 安装失败信息应保留目标路径，便于终端定位。

### R2. Bundled plugin install path
- UI 安装流程在处理钉钉 / 企微时，应先检查包内 `plugins/` 目录是否存在对应 `.tgz`。
- 若存在，必须优先用本地归档安装；若不存在，再回退到现有远端 spec。

### R3. Config gating
- 当某个请求渠道的插件安装失败时，不得继续写该渠道的 `channels.*` 配置。
- 返回结果中应保留插件安装错误，不再追加 `unknown channel id` 级联报错。

### R4. arm64 package replacement
- 生成新的 mac arm64 UI ZIP，包含：
  - 修复后的 `ui/server.mjs`
  - `skills/superpowers/`
  - 包内 `plugins/` 下的钉钉 / 企微 `.tgz`
- 保留 UI-first 入口与现有 curated skills 形态。

## Validation

- `node --test ui/tests/install-helpers.test.mjs`
- `node --check ui/server.mjs`
- 隔离 HOME 下本地 `.tgz` 插件安装 smoke
- 新包目录中确认 `vendor/mac-openclaw/bin/node` 为 `arm64`

# OpenClaw macOS Companion 使用指南

## 1. 目录定位

`platforms/mac/companion/` 中的文件是 **macOS companion source 模板**。

它们的目标位置不是仓库根目录，而是一个带有 `bin/` 子目录的 OpenClaw runtime 根目录，例如：

- `vendor/mac-openclaw/`
- 之后生成的 macOS 交付包 runtime 根目录

请把需要的脚本复制到 runtime 根目录后再双击或在终端中执行。

## 2. 当前导入的脚本清单

| 文件 | 实际命令 | 建议用途 |
| --- | --- | --- |
| `start` | `npx openclaw onboard` | 推荐的首次启动入口 |
| `onboard` | `npx openclaw onboard` | 直接执行初始化 |
| `gateway` | `npx openclaw gateway --force` | 日常启动网关 |
| `pairing-feishu` | `npx openclaw pairing approve feishu` | 飞书配对 |
| `stop` | `npx openclaw gateway stop` | 停止网关 |

说明：当前导入的 macOS companion 集合 **没有 `reset` 文件**。因此本文档不再描述“双击 reset”的流程。

## 3. 推荐流程

### 首次启用

1. 双击 `start`（或直接执行 `onboard`）完成初始化
2. 双击 `gateway` 启动网关
3. 如需接入飞书，再双击 `pairing-feishu`

### 日常使用

1. 双击 `gateway`

### 暂停服务

1. 双击 `stop`

### 需要重新初始化时

1. 双击 `stop`
2. 按 runtime 侧状态清理流程处理现有 profile / 状态目录
3. 重新执行 `start`（或 `onboard`）
4. 再执行 `gateway`
5. 如需重新绑飞书，再执行 `pairing-feishu`

## 4. 使用注意事项

- 这些脚本会按“脚本所在目录 + `bin/`”定位 runtime，因此必须和 runtime 的 `bin/` 同级放置。
- 如果只是在仓库里的 `platforms/mac/companion/` 目录直接双击，通常不会找到正确的 runtime。
- 如需语法校验，可在仓库根目录执行：`bash -n platforms/mac/companion/*`

## 5. 本轮校准结论（2026-03-23）

- 指南已改为与实际导入脚本一致。
- 已补充 `start` 的真实语义：它执行的是 `onboard` 初始化流程。
- 已移除对不存在 `reset` 文件的描述。

# Feature Specification: WeCom Channel Integration Hardening

**Feature Branch**: `011-wecom-channel-integration`
**Created**: 2026-04-14
**Status**: In Progress
**Input**: 作为当前 unified repo 唯一未通过项 `F-014`，企业微信渠道已经有 UI 表单、插件安装和服务端配置主链路；当前业务主链是企业微信智能机器人 API / 长连接，最小真实入口为 `Bot ID + Secret`。现状主要缺少正式 spec、测试与收口文档，且企微纯逻辑仍堆在 `ui/server.mjs` 中，不利于后续优雅维护。

## Context & References

- `longrun/workspaces/opensparrow-unified/feature_list.json` (`F-014`)
- `AGENTS.md`
- `.specify/memory/constitution.md`
- `docs/governance/framework-stack.md`
- `ui/server.mjs`
- `ui/public/index.html`
- `ui/public/dashboard.html`
- `docs/tutorials/01-安装教程.md`
- `specs/014-mac-arm64-installer-hardening/spec.md`

## User Stories & Testing

### User Story 1 - 安装向导可以安全写入企业微信渠道配置（Priority: P1)

作为安装 OpenSparrow 的维护者，我希望在 UI 安装向导中以企微 `Bot ID + Secret` 完成长连接主链安装，并在需要时追加自建应用 / callback 增强字段；服务端应正确校验并写入企业微信渠道配置，同时在插件未就绪时给出清晰提示而不是报混乱错误。

**Independent Test**: 通过纯函数测试验证企微字段归一化、输入校验与 UI 扁平化逻辑；通过服务端语法校验确保提取 helper 后安装分支仍可运行。

### User Story 2 - 企微逻辑需要可维护、可测试（Priority: P1)

作为后续继续维护 UI 服务端的开发者，我希望企微纯逻辑从 `ui/server.mjs` 中抽离为可测试 helper 模块，并补 node:test 用例，这样后续修企微配置或回调路径时不需要在超长 server 文件里盲改。

**Independent Test**: `ui/lib/wecom.test.mjs` 可以直接验证 Bot ID 判断、配置归一化、错误收集与 UI 扁平化输出。

### User Story 3 - 企业微信功能要有明确的运维与验收文档（Priority: P2)

作为总司令或交接协作者，我希望仓库中存在企微专属 runbook，明确当前业务主链是智能机器人 API / 长连接、`Bot ID + Secret` 是最小真实入口、哪些增强字段仅适用于特定场景，以及需要人工补的真实凭据验证项。

**Independent Test**: 阅读 runbook 后，能知道当前仓哪些企微链路已自动验证、`Bot ID + Secret` 长连接主链还需哪些真实补证、callback 何时属于可选增强项，且不会把“插件安装可用”或“未配 callback”误当成默认 passing / failing 结论。

## Requirements

### Functional Requirements

- **FR-001**: `ui/server.mjs` 中的企微纯逻辑必须提取到独立 helper 模块。
- **FR-002**: helper 模块至少覆盖 `isLikelyWecomBotId`、`normalizeWecomCredentials`、`collectWecomInputErrors`、`enrichWecomChannelForUi`。
- **FR-003**: 必须新增针对企微 helper 的 `node:test` 用例，并按 TDD 先看到失败再实现/接线到通过。
- **FR-004**: 服务端安装与频道更新链路在提取 helper 后必须继续支持 `wecom` 分支，不改变现有行为契约。
- **FR-005**: 必须补齐 `spec.md`、`plan.md`、`tasks.md` 与 runbook，正式记录当前企微集成状态。
- **FR-006**: runbook 必须明确区分“已自动验证的插件安装 / 配置写入链路”“仍需以 `Bot ID + Secret` 补证的长连接主链”与“仅在实际业务依赖时另行补证的 callback / 自建应用增强链路”。
- **FR-007**: 本轮不得回写不存在的“真实企业微信 E2E 已通过”结论；若缺少一次真实 UI 安装与至少一次真实消息收发 / 对话成功证据，需明确保留后续人工验证步骤，且不得把 callback 缺证默认写成主链失败。
- **FR-008**: 安装向导页与 Dashboard 页重复的企微前端校验逻辑应收敛到共享浏览器 helper，避免两处重复维护。

### Non-Goals

- **NG-001**: 本轮不要求在无真实企业微信凭据的情况下伪造 E2E 通过证据。
- **NG-002**: 本轮不重做整套安装 UI，也不强制把浏览器端两个 HTML 页面的企微校验完全统一到单一实现。
- **NG-003**: 本轮不修改 `codeSPEC` 框架层；当前目标是基于已适配底座推进第一个真实产品 feature 收口。

## Success Criteria

- **SC-001**: `specs/011-wecom-channel-integration/` 下存在有效的 `spec.md`、`plan.md`、`tasks.md`。
- **SC-002**: 新增 `ui/lib/wecom.mjs` 与 `ui/lib/wecom.test.mjs`，并通过 `node --test`。
- **SC-003**: `ui/server.mjs` 通过导入 helper 使用企微纯逻辑，且 `node --check ui/server.mjs` 通过。
- **SC-004**: 新增企微 runbook，明确长连接主链、`Bot ID + Secret` 最小真实入口、已验证范围与待补真实 E2E / 扩展验证项。
- **SC-005**: `ui/public/index.html` 与 `ui/public/dashboard.html` 通过共享企微 helper 使用同一套前端校验规则。
- **SC-005**: `claude-progress.txt` 明确记录本轮自动验证证据与剩余人工 E2E 缺口。

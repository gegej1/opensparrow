# Feature Specification: Custom OpenAI-Compatible Provider Hardening

**Feature Branch**: `012-custom-openai-provider-hardening`
**Created**: 2026-04-08
**Refreshed**: 2026-04-16
**Status**: Planning (follow-up refresh)
**Input**: `specs/010-openclaw-runtime-upgrade/BUG-001-custom-openai-endpoint-and-model-drift.md` 的第一轮 root cause 已部分收口：`/api/config/api` 保存后，provider config 与 `auth-profiles` 已正确写盘，但当前 profile 下的 `agent:main:main` 旧 session 仍会被复用，导致下一条 agent turn 继续命中旧 `sessionId / model snapshot / authProfileOverride`。

## Follow-up Freeze

- `/api/config/api` 保存后，provider config 与 `auth-profiles` 已正确写盘。
- runtime restart 已经可以成功返回；当前 follow-up 不再把根因定义为“写盘失败”或“重启失败”。
- 真正剩余问题是：`~/.openclaw-usb-portable/agents/main/sessions/sessions.json` 中当前 profile 的 `agent:main:main` 旧 session 仍被复用。
- OpenClaw CLI 当前没有可直接依赖的 session reset/delete 命令；`sessions cleanup` 不等于主动 rebinding。
- 本轮 fix 必须围绕“save success + restart success 之后的 targeted fresh rebind”展开，而不是扩大为全量 session 清空或多渠道改造。

## Context & References

- `specs/010-openclaw-runtime-upgrade/BUG-001-custom-openai-endpoint-and-model-drift.md` — 第一轮调查与 provider/model 漂移根因
- `ui/server.mjs` — `/api/config/api` 保存与 runtime restart 入口
- `~/.openclaw-usb-portable/agents/main/sessions/sessions.json` — 当前 profile 的 session store
- `agent:main:main` — 本轮唯一目标 binding

## User Stories

### User Story 1 — 保存 API 配置后当前 profile 会 fresh rebind（P0）

作为维护者，我希望在 API 配置保存成功且 runtime restart 成功后，系统会让当前 profile 下的 `agent:main:main` 发生 fresh rebind，而不是继续沿用旧 session。

**Acceptance**:

1. `POST /api/config/api` 保存成功且 runtime restart 成功后，系统会对当前 profile 的 `agent:main:main` 执行 targeted fresh rebind。
2. rebind 结果不依赖“等待旧 session 自然过期”，而是在当前保存动作闭环内完成。
3. verifier 能从 session store 的保存前后差异中定位到 `agent:main:main` 已发生变化。

### User Story 2 — 下一条 agent turn 不再黏住旧 provider/model snapshot（P0）

作为运维中的用户，我希望在保存新的 provider/model 配置后，下一条 fresh agent turn 使用的是新配置，而不是继续命中旧的 `sessionId / model snapshot / authProfileOverride`。

**Acceptance**:

1. 下一条 fresh agent turn 不能继续复用保存前的 provider/model snapshot。
2. verifier 能证明下一条 fresh turn 使用的是新配置，而不是旧 session 的遗留快照。
3. “保存成功但下一条消息仍走旧配置”在本轮被视为失败。

### User Story 3 — fix 只影响目标 binding，不伤及其他 session（P1）

作为维护者，我希望这次修复只作用于当前 profile 的 `agent:main:main`，而不是粗暴清空所有 sessions 或破坏非目标 session。

**Acceptance**:

1. fix 不得清空整个 `sessions.json`，也不得删除非目标 session。
2. fix 不得把 `sessions cleanup` 当作主动 rebinding 的替代方案。
3. verifier 能证明非目标 session 记录保持不变，或至少未被本次 fix 粗暴移除。

## Functional Requirements

- FR-001: 系统 MUST 在 `POST /api/config/api` 保存成功且 runtime restart 成功后，让当前 profile 下的 `agent:main:main` 发生 fresh rebind。
- FR-002: 系统 MUST 保证下一条 fresh agent turn 不再继续复用保存前的 `sessionId / model snapshot / authProfileOverride`。
- FR-003: 系统 MUST 将本轮 fix 限定在当前 profile 的 `agent:main:main`，不得粗暴清空整个 session store。
- FR-004: 系统 MUST 不破坏非目标 session；若需要改写 session store，改写范围必须可追溯到目标 binding。
- FR-005: 系统 MUST NOT 把 `sessions cleanup` 视为主动 rebind 的等价物，也 MUST NOT 假设存在可直接依赖的 CLI session reset/delete 命令。
- FR-006: verifier MUST 检查 session store 的保存前后变化，并证明下一条 fresh agent turn 使用的是新配置。
- FR-007: 本轮 follow-up MUST 保持在 `012-custom-openai-provider-hardening` 内，不得顺手扩张到多模型前端、智能路由、officialization、`F-030` 或 DingTalk/WeCom 打通。

## Non-Goals

- 不在本轮做多模型前端。
- 不在本轮做智能路由。
- 不在本轮做 provider officialization。
- 不在本轮顺手并入 `F-030`。
- 不在本轮处理 DingTalk / WeCom 打通。
- 不在本轮做全量 session wipe 或 generic session management 子系统。

## Risk Assessment

| 风险 | 等级 | 缓解措施 |
|------|------|---------|
| session store 定位错误导致误伤非目标 session | 高 | 只允许针对当前 profile 的 `agent:main:main` 做 targeted 变更，并要求 before/after evidence |
| rebind 时机早于 runtime restart 成功，导致“写盘已新、运行仍旧” | 中 | 把 fresh rebind 明确挂到 save success + restart success 之后 |
| 误把 `sessions cleanup` 当作 rebind，导致表面清理但下一条 turn 仍黏旧状态 | 中 | 在 requirements / verifier gate 中显式禁止以 cleanup 代替 rebind |
| follow-up 被顺手扩大成多模型 / routing / 多渠道重构 | 中 | 在 spec 中冻结 non-goals，并把 scope creep 视为验证失败 |

## Fresh Evidence Gate

verifier 至少必须收集以下 fresh evidence：

1. `POST /api/config/api` 保存成功且 runtime restart 成功的可追溯证据；
2. `sessions.json` 中当前 profile `agent:main:main` 的保存前后对比，证明目标 binding 已变化；
3. 下一条 fresh agent turn 的证据，证明其使用的是新的 provider/model/auth 配置；
4. 负向证据，证明旧 session 状态不再黏住、非目标 session 未被粗暴清空。

## Success Criteria

1. 保存 API 配置成功且 runtime restart 成功后，当前 profile 的 `agent:main:main` 会发生 targeted fresh rebind。
2. 下一条 fresh agent turn 使用的是新 provider/model/auth 配置，而不是旧 `sessionId / model snapshot / authProfileOverride`。
3. fix 不会粗暴清空全部 sessions，也不会破坏非目标 session。
4. verifier 能提供 session store 前后变化与 fresh turn 的双重证据。
5. `012` 的 follow-up scope 保持聚焦，没有顺手扩张到多模型前端、智能路由、officialization、`F-030` 或 DingTalk/WeCom 打通。

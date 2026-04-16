# Implementation Plan: Custom OpenAI-Compatible Provider Hardening

**Branch**: `012-custom-openai-provider-hardening` | **Date**: 2026-04-16 | **Spec**: `specs/012-custom-openai-provider-hardening/spec.md`

## Summary

本次 refresh 假设第一轮 provider hardening 已完成最关键的写盘闭环：`/api/config/api` 保存后，provider config 与 `auth-profiles` 已正确写盘，runtime restart 也可成功返回。当前剩余问题已经冻结为 session rebinding bug：当前 profile 的 `agent:main:main` 旧 session 仍被复用，导致下一条 agent turn 继续命中旧 `sessionId / model snapshot / authProfileOverride`。本轮实现目标是 **save success + restart success 之后的 targeted fresh rebind**，而不是再去重做 provider builder、脚本同步或前端扩面。

## Technical Context

- **Bug report**: `specs/010-openclaw-runtime-upgrade/BUG-001-custom-openai-endpoint-and-model-drift.md`
- **Primary API entry**: `ui/server.mjs`
- **Session store**: `~/.openclaw-usb-portable/agents/main/sessions/sessions.json`
- **Target binding**: 当前 profile 的 `agent:main:main`
- **Known constraint**: OpenClaw CLI 当前没有可直接依赖的 session reset/delete 命令；`sessions cleanup` 不等于主动 rebinding

## Suggested Implementation Write-Set

优先建议 worker 把实现写面压到最小：

- `ui/server.mjs`
- `ui/tests/custom-openai-provider-rebind.test.mjs`

仅当 `ui/server.mjs` 内部抽离能显著降低风险时，才允许附加一个最小 helper：

- `ui/lib/session-rebind.mjs`（可选）

不建议本轮把写面扩张到：

- `ui/public/*`
- `scripts/openclaw-usb/*`
- `vendor/*`
- `longrun/*`

## Design Decisions

1. **Trigger condition 明确挂在 save success + restart success 之后**
   - 只有在 `/api/config/api` 保存成功且 runtime restart 成功后，才允许触发 fresh rebind。
   - 若 restart 失败，本轮不把目标描述成“已经完成 rebinding”。

2. **Targeted binding surgery 优先于全量 cleanup**
   - 只允许作用于当前 profile 的 `agent:main:main`。
   - 不允许通过清空全部 sessions 来“顺便解决”旧 snapshot 黏连。

3. **Fresh turn guarantee 是验收主轴**
   - fix 不仅要修改 session store，还必须让下一条 fresh agent turn 使用新配置。
   - 只看“文件被改了”不够，必须证明“旧 snapshot 不再生效”。

4. **不依赖 CLI 不存在的能力**
   - 方案不能建立在“应该有 session reset/delete 命令”这类假设上。
   - `sessions cleanup` 只能被视为清理工具，不能被写成 active rebind contract。

5. **Scope 保持在 012 follow-up**
   - 不顺手扩张到多模型前端、智能路由、officialization、`F-030`、DingTalk/WeCom 打通。

## Implementation Phases

### Phase A — Rebind Target Freeze + Focused Tests
- 为当前 profile 的 `agent:main:main` 建立 focused fixture / test harness
- 把 “before/after session store 变化” 与 “next fresh turn 使用新配置” 写进测试目标

### Phase B — API Save Path Fresh Rebind
- 在 `POST /api/config/api` 成功写盘且 restart 成功后触发 targeted fresh rebind
- 保证目标仅限当前 profile 的 `agent:main:main`
- 明确禁止 broad cleanup / broad delete

### Phase C — Verification Closure
- 收集 session store 的保存前后证据
- 跑下一条 fresh agent turn 验证
- 证明旧 session sticky state 不再继续生效，同时非目标 session 保持完整

## Validation Plan

### Automated / Local Checks
```bash
node --test ui/tests/custom-openai-provider-rebind.test.mjs
node --check ui/server.mjs
```

### Fresh Evidence Gate

verifier 必须拿到以下证据才能宣称通过：

1. `POST /api/config/api` 保存成功且 runtime restart 成功；
2. `sessions.json` 的 before/after diff，且变更集中在当前 profile 的 `agent:main:main`；
3. 下一条 fresh agent turn 使用的是新 provider/model/auth 配置；
4. 旧 `sessionId / model snapshot / authProfileOverride` 不再继续黏住；
5. 非目标 session 未被粗暴清空。

### Targeted Behavior Checks
```bash
# 1) 保存前后导出当前 profile 的 session store，定位 agent:main:main
# 2) 执行一次 /api/config/api 保存，并确认 runtime restart 成功
# 3) 再导出 session store，对比 agent:main:main 的变化
# 4) 触发下一条 fresh agent turn，确认使用的是新 provider/model/auth 配置
```

## Deferred

- 多模型前端
- 智能路由
- provider officialization
- `F-030`
- DingTalk / WeCom 打通
- generic session management 子系统化改造

# Tasks: Custom OpenAI-Compatible Provider Hardening

**Input**: `specs/012-custom-openai-provider-hardening/spec.md`, `specs/012-custom-openai-provider-hardening/plan.md`
**Prerequisites**: `specs/010-openclaw-runtime-upgrade/BUG-001-custom-openai-endpoint-and-model-drift.md`
**Frozen root cause**:

- `/api/config/api` 保存后，provider config 与 `auth-profiles` 已正确写盘；
- runtime restart 已可成功返回；
- 当前剩余问题是 `~/.openclaw-usb-portable/agents/main/sessions/sessions.json` 中当前 profile 的 `agent:main:main` 旧 session 仍被复用；
- OpenClaw CLI 当前无可直接依赖的 session reset/delete 命令；`sessions cleanup` 不等于主动 rebinding。

**Suggested implementation write-set**:

- `ui/server.mjs`
- `ui/tests/custom-openai-provider-rebind.test.mjs`
- `ui/lib/session-rebind.mjs`（仅当抽离 helper 能显著降低风险时再新增）

## Phase 1: Target Freeze & Focused Tests (P0)

- [ ] T001 为当前 profile 的 `agent:main:main` 建立 focused test harness，覆盖保存前后 session store 变化。
- [ ] T002 在测试中明确断言：fix 只允许影响目标 binding，不得清空全部 sessions，也不得伤及非目标 session。
- [ ] T003 在测试中明确断言：下一条 fresh agent turn 使用的是新 provider/model/auth 配置，而不是旧 `sessionId / model snapshot / authProfileOverride`。

## Phase 2: API Save Path Rebind Fix (P0)

- [ ] T004 在 `ui/server.mjs` 的 `POST /api/config/api` 成功路径中补上 targeted fresh rebind，前提是 provider config 写盘成功且 runtime restart 成功。
- [ ] T005 把 rebind 范围限定为当前 profile 的 `agent:main:main`，不得把 fix 实现成 broad cleanup / broad delete。
- [ ] T006 明确避免把 `sessions cleanup` 当作 active rebind，也不得假设存在可直接依赖的 CLI session reset/delete 命令。

## Phase 3: Verification Gates (P0)

- [ ] T007 运行 `node --test ui/tests/custom-openai-provider-rebind.test.mjs`
- [ ] T008 运行 `node --check ui/server.mjs`
- [ ] T009 保存 API 配置前后各抓一次 `sessions.json`，证明当前 profile 的 `agent:main:main` 已变化。
- [ ] T010 触发下一条 fresh agent turn，证明其使用的是新的 provider/model/auth 配置。
- [ ] T011 负向检查：旧 session sticky state 不再继续生效，非目标 session 未被粗暴清空。

## Validation Checklist

- [ ] V001 `POST /api/config/api` 保存成功且 runtime restart 成功后，当前 profile 的 `agent:main:main` 发生 targeted fresh rebind。
- [ ] V002 下一条 fresh agent turn 不再继续复用旧 `sessionId / model snapshot / authProfileOverride`。
- [ ] V003 fix 没有粗暴清空整个 session store，也没有破坏非目标 session。
- [ ] V004 verifier 拿到了 session store before/after 与 fresh turn evidence 的双重证据。
- [ ] V005 本轮没有扩张到多模型前端、智能路由、officialization、`F-030` 或 DingTalk/WeCom 打通。

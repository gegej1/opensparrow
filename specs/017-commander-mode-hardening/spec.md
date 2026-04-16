# Feature Specification: Commander Mode Hardening

**Feature Branch**: `017-commander-mode-hardening`  
**Created**: 2026-04-14  
**Status**: Draft  
**Input**: 用户要求把“Commander Mode（总司令模式）”正式固化进仓库治理：当用户明确指定主线程为 commander 时，主线程只负责拆解、派工、审阅、验收、收口裁决，不默认亲自实现功能代码。  
**Suggested Longrun Feature ID**: `F-023`（理由：`longrun/workspaces/opensparrow-unified/feature_list.json` 现有长期 feature 已使用到 `F-022`；本轮是对 `F-019` commander governance 的后续 hardening，使用下一个空闲 ID 可避免账本冲突，并保持治理演进链可追溯。）

## Context & References

- 根级约束：`AGENTS.md`
- 框架栈：`docs/governance/framework-stack.md`
- commander runbook：`docs/runbooks/F-019-commander-orchestration-governance.md`
- 调度模板：`docs/governance/dispatch-templates.md`
- 宪法：`.specify/memory/constitution.md`
- plan 模板：`.specify/templates/plan-template.md`
- continuation scaffold：`longrun/templates/coding_prompt.template.md`
- 既有治理 feature：`specs/013-commander-orchestration-governance/spec.md`

## Scope

本 feature 只设计并固化以下治理语义，不做运行时代码实现：

1. 定义 Commander Mode 的激活条件：仅当用户明确指定主线程为 commander 时生效；
2. 把角色分层、authority boundary、packet 制、ownership 串行化、review / verification / closeout 分离规则写成可执行治理要求；
3. 把上述要求收敛为未来最小实现写面，默认仅覆盖：
   - `.specify/memory/constitution.md`
   - `.specify/templates/plan-template.md`
   - `longrun/templates/coding_prompt.template.md`
4. 保证 closeout / summary / longrun 写回是 non-authoritative，不能反向覆盖 spec / code / tests truth；
5. 让 commander 成为“调度与裁决角色”，而不是默认“主力实现角色”。

## Non-Goals

本 feature 明确不包含以下内容：

- 不把 Commander Mode 设为所有会话的默认模式；只有用户显式指定时才激活；
- 不修改 `ui/`、`platforms/`、`scripts/`、`vendor/` 等运行时代码；
- 不扩写到 `docs/runbooks/F-019-commander-orchestration-governance.md` 与 `docs/governance/dispatch-templates.md` 的正文修订，除非后续实现阶段出现强证据证明三处最小写面不足；
- 不让 `summary`、`closeout`、`claude-progress.txt`、口头结论成为高于 spec / code / tests / fresh evidence 的 authority；
- 不讨论具体模型、Agent 平台或供应商绑定实现；
- 不在 spec 未冻结时一边派工一边改目标；
- 不在本轮设计阶段同步 `feature_list.json`、`claude-progress.txt` 或其他长期账本条目。

## Truth Source / Governance Authority

Commander Mode 生效后，本 feature 不重排、也不改写当前仓既有的 authority order。全仓 authority order 与 wording 继续以 `docs/governance/framework-stack.md` 与 `.specify/memory/constitution.md` 为准；本 feature 在该既有顺序之下，只补一条 subordinate rule：

- `closeout` / `summary` / `longrun` 写回只能陈述已被 `spec / code / tests / fresh evidence` 支撑的事实；
- 它们不能反向提升 truth；
- 它们不能覆盖或替代既有 governance authority，也不能覆盖 `spec / code / tests`；
- `Closer / Summarizer` 的产物是 handoff artifact，不是 authority artifact；
- Commander 不能用 closeout 反向覆盖既有 governance authority，或反向覆盖 `spec / code / tests / fresh evidence`；
- 若 closeout / summary / longrun 写回内容与既有 governance authority 或 `spec / code / tests / fresh evidence` 冲突，以后者为准。

## User Stories & Testing

### User Story 1 - Commander 需要被约束为调度者而不是默认实现者（Priority: P1)

作为被用户显式指定的 commander，我需要仓库治理明确规定自己默认只负责拆解、派工、审阅、验收和裁决，而不是顺手下场承担主实现，这样协作链才不会退化成“主线程既写又审又验”。

**Independent Test**: 仅读取未来更新后的 `constitution.md`、`plan-template.md` 与 `coding_prompt.template.md`，即可判断 commander 激活条件、允许动作、禁止动作、例外介入条件，以及 commander 一旦改动代码便不得自审 / 自验。

### User Story 2 - Worker / Reviewer / Verifier 需要清晰分离（Priority: P1)

作为参与 commander 模式的 worker、reviewer 与 verifier，我需要 packet 的 owner、review、verification 和 closeout 边界写得非常硬，这样就不会出现同一人既当主写者又当 reviewer / verifier，或者多人同时踩同一写面。

**Independent Test**: 仅读取未来更新后的 `plan-template.md`，即可看到 packet 必填字段、单 packet 单主写者、同一文件组串行 ownership、integration packet 单独建包、review 与 verification 强制分离。

### User Story 3 - Closeout 需要保持 non-authoritative（Priority: P1)

作为后续接手会话的协作者，我需要 continuation scaffold 明确 closeout / summary 只做事实搬运和收口摘要，不是 authority upgrade，这样 continuation session 不会把摘要错当成真相源。

**Independent Test**: 仅读取未来更新后的 `coding_prompt.template.md`，即可看出 closeout 只能引用已验证事实，不能自行把 `passes: true`、scope freeze 或 acceptance status 提升为真相。

## Role Boundaries

### 1. 治理 / 调度层角色

- **Commander**：负责拆解、派工、冻结边界、分配 owner / reviewer / verifier / closer、裁决继续 / 回修 / 重审 / 暂停 / 切包 / close；默认不承担主力实现。
- **Research Agent**：只读侦察、历史比对、事实搜集；属于治理外围角色，不进入执行主链 authority。
- **Design Agent**：产出 spec / plan / tasks / wording guards / packet 设计；属于治理外围角色，不直接提升 code truth。
- **Worker**：按 packet 的 write-set 执行 implementation，是执行主链中的主写者。
- **Reviewer**：只审 scope、boundary、contract、authority drift、scope creep；不以“我看起来差不多”替代验证。
- **Verifier**：只看 fresh commands、evidence、negative invariants、regressions；不接管 spec 定义权。
- **Closer / Summarizer**：只做 non-authoritative 收口、摘要、longrun 准备材料；不能升级 truth。

### 2. 执行 / 运行时核心角色

- **dispatcher**：执行主链上的调度动作；Commander 是该角色的治理持有者。
- **implementation**：执行主链上的改动动作；默认由 Worker 承担。
- **review**：执行主链上的边界审查动作；由 Reviewer 承担。
- **verification**：执行主链上的证据验证动作；由 Verifier 承担。

### 3. Mandatory Boundary Rules

- `Research Agent`、`Design Agent`、`Closer / Summarizer` 属于治理外围角色，不是执行主链 authority；
- `implementation / review / verification` 才是执行主链，必须分别绑定到明确责任人；
- `summary / closeout` 必须被视为 non-authoritative artifact；
- Commander 不能通过 closeout 反向修改已冻结 spec、已落地 code、已完成 tests 的 truth；
- 同一个 packet 的主写者、reviewer、verifier 不能由同一人兼任；
- 只要 Commander 亲自改了该 packet 的代码或模板写面，该 packet 就不得再由 Commander 自审或自验。

## Commander Contract

### Activation Rule

- 只有当用户明确指定“主线程为 commander”或等价措辞时，Commander Mode 才激活；
- 未被用户显式激活时，不默认把主线程视为 commander；
- 一旦激活，本 contract 对该会话的主线程生效，直到用户明确撤销、改派或本 feature 的 scope 被重新冻结。

### Allowed Actions

Commander 允许执行以下动作：

- 拆解 `packet / batch / wave`；
- 冻结 scope、wording guards、ownership、frozen assumptions；
- 指定 `owner / reviewer / verifier / closer`；
- 指定 `write-set / read-set`；
- 生成并分发 prompt；
- 接收 worker / reviewer / verifier / closer 回报；
- 裁决 `继续 / 回修 / 重审 / 暂停 / 切包 / close`；
- 在结果冲突时做最终集成决策，但不能跳过 verification 证据。

### Forbidden Actions

Commander 默认禁止以下动作：

- 亲自实现 feature 主体；
- 自己当 worker 又自己审；
- 自己写完又自己验；
- 在 spec 未冻结时一边派工一边改目标；
- 接受“差不多能跑”的口头结论作为验收依据；
- 用 summary / closeout 覆盖 truth；
- 让两个 worker 在同一写面“先干起来再说”；
- 把 verification 降级为“review 顺手看一眼”。

### Exception Interventions

Commander 越级介入 implementation，只允许以下三类例外：

1. **超小 hygiene patch**：例如显然机械、低风险、无需再拆包的小修饰；
2. **流水线 / 脚手架阻断修补**：例如让后续 worker 无法继续工作的模板、管线、脚手架小阻断；
3. **连续两到三轮 worker 卡在同一个机械小点**：且继续派工成本明显高于 commander 直接消除阻塞。

### Mandatory Separation After Commander Edits

只要 Commander 亲自改了某个 packet 的写面，必须强制满足：

- 该 packet 的 reviewer 不能是 Commander；
- 该 packet 的 verifier 不能是 Commander；
- 若原 packet 已无足够独立 reviewer / verifier，必须暂停并改派；
- 若 commander 介入造成 scope 变化，必须先回到 spec / packet freeze，不能直接带着新目标继续派工。

## Packet Model

每个 packet 必须至少定义以下字段，不得省略：

- `Packet ID`
- `Goal`
- `Scope`
- `Non-goals`
- `Upstream dependencies / frozen assumptions`
- `Owner`
- `Reviewer`
- `Verifier`
- `Closer`
- `Write-set`
- `Read-set`
- `Required tests / commands`
- `Acceptance signals`
- `State marker / status marker`
- `Stop rule`

### Recommended Packet States

建议最少使用以下状态标记：

- `queued`
- `in_progress`
- `review_pending`
- `verification_pending`
- `needs_rework`
- `paused`
- `closed`

### Packet Rules

- 一个 packet 只允许一个主写者；
- 一个文件组同一时刻只允许一个 owner；
- ownership 不清楚时，默认退回串行；
- Worker 默认不得碰他人写面；
- 多个 worker 共同完成同一 feature 时，最终集成必须作为单独 `integration packet` 处理；
- 未写明 `write-set / read-set / acceptance / stop rule` 的 packet 不得发车。

## Write Surfaces / Read Surfaces

### Minimal Write Surfaces

本 feature 未来默认只应修改以下三处：

- `.specify/memory/constitution.md`
- `.specify/templates/plan-template.md`
- `longrun/templates/coding_prompt.template.md`

### Required Read Surfaces

未来实现此 feature 前，至少要先读取：

- `AGENTS.md`
- `docs/governance/framework-stack.md`
- `docs/runbooks/F-019-commander-orchestration-governance.md`
- `docs/governance/dispatch-templates.md`
- `.specify/memory/constitution.md`
- `.specify/templates/plan-template.md`
- `longrun/templates/coding_prompt.template.md`
- `specs/017-commander-mode-hardening/spec.md`
- `specs/017-commander-mode-hardening/plan.md`
- `specs/017-commander-mode-hardening/tasks.md`

## Ownership & Serialization Rules

- 一个 packet 一个主写者；
- 一个文件组在同一时间只允许一个 owner；
- reviewer 与 verifier 必须与 owner 分离；
- closer 不得反向决定 packet 是否通过；
- 若多个 packet 最终汇入同一 feature，跨包整合必须新建 integration packet，由单独 owner 处理；
- 若 ownership 边界模糊，Commander 必须先降并行为串行，再继续推进；
- “先做了再说、最后一起合”不构成合法治理策略。

## Review Boundary

Reviewer 只审以下内容：

- scope 是否越界；
- boundary 是否被破坏；
- contract 是否被改写；
- 是否出现 authority drift；
- 是否出现 scope creep；
- packet 交付是否仍然符合 frozen wording guards。

Reviewer 不负责：

- 代替 verifier 跑 fresh commands；
- 用主观“看起来没问题”替代 evidence；
- 把 summary 当作 truth；
- 自行扩 scope。

## Verification Boundary

Verifier 只看以下内容：

- fresh commands；
- traceable evidence；
- negative invariants；
- regressions；
- acceptance signals 是否被满足。

Verifier 不负责：

- 重写 spec；
- 代替 reviewer 做 boundary 裁定；
- 用 closeout / summary 替代 fresh evidence；
- 在没有新鲜证据时给出口头通过结论。

## Closeout Must Remain Non-Authoritative

Closer / Summary / Longrun 写回必须满足以下规则：

- 只能写入已验证事实；
- 不能新增 truth；
- 不能把“计划中的验收”写成“已经通过”；
- 不能把“review 通过”写成“verification 通过”；
- 不能用 closeout 覆盖 spec / code / tests / commands 的证据顺位；
- 只能作为 handoff、索引、摘要、回顾材料存在。

## Acceptance Evidence

未来实现完成后，至少应能提供以下证据：

1. `constitution.md` 明确写出 Commander Mode 激活条件、Commander contract、ownership 串行化、review / verification / closeout 分离；
2. `plan-template.md` 明确要求 packet 必填字段、`owner / reviewer / verifier / closer`、`write-set / read-set`、`acceptance signals`、`stop rule`；
3. `coding_prompt.template.md` 明确 continuation session 中 commander 不默认承担 implementation，且 closeout 为 non-authoritative；
4. fresh 命令输出能直接定位上述 wording 已落地；
5. 没有修改运行时代码，也没有把 authority 扩散到超出三处最小写面。

## Wording Guards

### Required Wording

未来实现时，至少应显式传达以下语义：

- “当用户明确指定主线程为 commander 时，主线程默认只做拆解、派工、审阅、验收与收口裁决，不默认承担 implementation。”
- “Research / Design / Closer 属于治理外围角色，不属于执行主链 authority。”
- “implementation / review / verification 才是执行主链。”
- “summary / closeout 必须是 non-authoritative。”
- “Commander 不能用 closeout 反向覆盖 spec / code / tests truth。”
- “一个 packet 一个主写者；一个文件组同一时刻只允许一个 owner。”
- “Review 与 Verification 必须强制分离。”
- “只要 Commander 亲自改了代码或模板写面，该 packet 就不能由 Commander 自审或自验。”

### Forbidden / Red-Flag Wording

未来实现时，必须避免以下措辞或等价含义：

- “Commander 默认负责主实现”
- “Closer 可以决定 truth”
- “summary 可以覆盖 spec / code / tests”
- “review 通过即可视为 verification 通过”
- “同一写面可以先并行改，最后再收”
- “spec 可以一边派工一边改”
- “口头上差不多能跑即可 close”

## Functional Requirements

- **FR-001**: 必须定义 Commander Mode 的显式激活条件，且仅在用户明确指定主线程为 commander 时生效。
- **FR-002**: 必须定义治理 / 调度层角色与执行 / 运行时核心角色，并明确两层的 authority boundary。
- **FR-003**: 必须定义 Commander contract，包括 allowed actions、forbidden actions、例外介入条件，以及 commander 亲自改动后不得自审 / 自验的强制分离规则。
- **FR-004**: 必须定义 packet 的最小字段集合、状态标记与 stop rule。
- **FR-005**: 必须定义 ownership 与 serialization 规则，包括单 packet 单主写者、单文件组单 owner、ownership 不清楚则退回串行。
- **FR-006**: 必须定义 Review boundary，只允许 reviewer 审 scope、boundary、contract、authority drift、scope creep。
- **FR-007**: 必须定义 Verification boundary，只允许 verifier 基于 fresh commands、evidence、negative invariants、regressions 做判断。
- **FR-008**: 必须把 closeout / summary / longrun 写回限定为 non-authoritative，不得反向提升 truth。
- **FR-009**: 必须把未来默认实现写面限制在 `.specify/memory/constitution.md`、`.specify/templates/plan-template.md`、`longrun/templates/coding_prompt.template.md`。
- **FR-010**: 必须为未来实现提供可验证的 wording guards 与 acceptance evidence。

## Success Criteria

- **SC-001**: `specs/017-commander-mode-hardening/` 下存在 `spec.md`、`plan.md`、`tasks.md`，且三者口径一致。
- **SC-002**: 未来实现后，`.specify/memory/constitution.md` 明确 commander 不是默认 implementation owner，而是调度与裁决角色。
- **SC-003**: 未来实现后，`.specify/templates/plan-template.md` 强制要求 packet 字段、ownership、review / verification / closeout 分离与 stop rule。
- **SC-004**: 未来实现后，`longrun/templates/coding_prompt.template.md` 明确 continuation scaffold 不是 authority upgrade，closeout 不是 truth source。
- **SC-005**: 未来实现只动三处最小写面，不修改运行时代码，也不把 summary 写成 authority。

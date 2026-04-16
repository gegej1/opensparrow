# Implementation Plan: Commander Mode Hardening

**Branch**: `017-commander-mode-hardening` | **Date**: 2026-04-14 | **Spec**: `specs/017-commander-mode-hardening/spec.md`  
**Suggested Longrun Feature ID**: `F-023`（理由：当前长期账本已占用到 `F-022`，本轮是 `F-019` 的治理加固后续项；使用下一个空闲 ID 可保证 ledger 顺序与治理演进链一致。）

## Summary

本计划不是技术实现分解，而是 Commander 可直接执行的 orchestration plan。目标是把“主线程被用户明确指定为 commander 时，默认只做调度与裁决，不默认亲自实现”的 contract 固化进最小治理写面，并强制 packet 制、ownership 串行化、review / verification 分离、closeout non-authority 四条主线同时落地。

本轮未来实现默认只改三处：

- `.specify/memory/constitution.md`
- `.specify/templates/plan-template.md`
- `longrun/templates/coding_prompt.template.md`

## Orchestration Context

- **Repository root**: `/Users/eduardogan/Desktop/GHJProject/opensparrow`
- **Nature of change**: Governance hardening only；不改运行时代码
- **Activation boundary**: 只有当用户明确指定主线程为 commander 时，本计划所定义的 Commander contract 才进入执行态
- **Primary read surfaces**:
  - `AGENTS.md`
  - `docs/governance/framework-stack.md`
  - `docs/runbooks/F-019-commander-orchestration-governance.md`
  - `docs/governance/dispatch-templates.md`
  - `.specify/memory/constitution.md`
  - `.specify/templates/plan-template.md`
  - `longrun/templates/coding_prompt.template.md`
  - `specs/017-commander-mode-hardening/spec.md`
- **Frozen write surfaces**:
  - `.specify/memory/constitution.md`
  - `.specify/templates/plan-template.md`
  - `longrun/templates/coding_prompt.template.md`
- **Default stop condition**: 一旦发现需要扩大到其他治理文件或运行时代码，先暂停并回到 spec 重新冻结 scope，不得边做边扩面

## Commander Freeze Before Dispatch

在任何 packet 发出前，Commander 必须先冻结以下内容：

1. 激活条件：本轮是否真的由用户显式指定主线程为 commander；
2. truth source 顺序：不得把 summary / closeout 提升为 authority；
3. 最小写面：只允许三处模板/治理文件进入 write-set；
4. wording guards：必须出现哪些句子，必须避免哪些句子；
5. ownership：每个 packet 的唯一主写者、reviewer、verifier、closer；
6. stop rule：何时暂停、回修、切包或重审。

如果以上任一项未冻结，则不得派工。

## Packet Registry

### Packet `PKT-017-A` — Constitution Authority Hardening

| Field | Value |
| --- | --- |
| Goal | 把 Commander Mode 的激活条件、角色分层、Commander contract、ownership 串行化、review / verification / closeout 边界固化到宪法层 |
| Scope | 仅修改 `.specify/memory/constitution.md` 的治理边界与 authority wording |
| Non-goals | 不修改 runbook；不改运行时代码；不写 longrun ledger |
| Upstream dependencies / frozen assumptions | 以 `AGENTS.md`、`framework-stack.md`、`F-019 runbook`、本 feature spec 为上游约束 |
| Owner | Worker-A |
| Reviewer | Reviewer-A |
| Verifier | Verifier-A |
| Closer | Closer-A |
| Write-set | `.specify/memory/constitution.md` |
| Read-set | `AGENTS.md`, `docs/governance/framework-stack.md`, `docs/runbooks/F-019-commander-orchestration-governance.md`, `specs/017-commander-mode-hardening/spec.md` |
| Required tests / commands | `rg -n "Commander|implementation|review|verification|non-authoritative|ownership|serial" .specify/memory/constitution.md` |
| Negative-invariant verification | `! rg -n "Commander 默认负责主实现|Commander 默认负责主力开发|review 通过即可视为 verification 通过|verification 可由 review 代替|closeout.*提升 truth|summary.*提升 truth|closeout.*覆盖 .*spec|summary.*覆盖 .*spec|新的 authority order|重排 authority order" .specify/memory/constitution.md` |
| Acceptance signals | 宪法层明确：Commander 不是默认实现者；Research / Design / Closer 是治理外围；Review 与 Verification 分离；closeout 非 authority；且未出现 forbidden wording、authority drift、review=verification drift、closeout / summary truth promotion |
| State marker / status marker | `queued -> in_progress -> review_pending -> verification_pending -> closed` |
| Stop rule | 如需新增第四个写面或改动运行时代码，立即暂停并回到 commander freeze |

### Packet `PKT-017-B` — Plan Template Packetization Hardening

| Field | Value |
| --- | --- |
| Goal | 让 plan 模板默认要求 packet 字段、role assignment、write-set / read-set、acceptance signals、stop rule |
| Scope | 仅修改 `.specify/templates/plan-template.md` |
| Non-goals | 不定义具体 feature 实现；不新增运行时测试骨架 |
| Upstream dependencies / frozen assumptions | 以本 feature spec 的 packet model 和 wording guards 为唯一模板约束 |
| Owner | Worker-B |
| Reviewer | Reviewer-B |
| Verifier | Verifier-B |
| Closer | Closer-B |
| Write-set | `.specify/templates/plan-template.md` |
| Read-set | `.specify/memory/constitution.md`, `docs/governance/dispatch-templates.md`, `specs/017-commander-mode-hardening/spec.md` |
| Required tests / commands | `rg -n "Packet ID|Owner|Reviewer|Verifier|Closer|Write-set|Read-set|Acceptance signals|Stop rule" .specify/templates/plan-template.md` |
| Negative-invariant verification | `! rg -n "review 通过即可视为 verification 通过|verification 可选|summary 可作为 truth|closeout 可覆盖 spec|多个 worker 可同时修改同一写面|ownership 不清楚也可并行|新的 authority order|重排 authority order" .specify/templates/plan-template.md` |
| Acceptance signals | 模板不再只是技术实现计划；默认具备 commander 可派工的 packet 结构；且未出现 forbidden wording、authority drift、review=verification drift、closeout / summary truth promotion |
| State marker / status marker | `queued -> in_progress -> review_pending -> verification_pending -> closed` |
| Stop rule | 如模板改动开始替代 `specs/` 或替代 execution authority，立即暂停 |

### Packet `PKT-017-C` — Continuation Prompt Boundary Hardening

| Field | Value |
| --- | --- |
| Goal | 让 continuation scaffold 恢复 commander 模式边界：主线程默认不承担 implementation，closeout 不提升 authority |
| Scope | 仅修改 `longrun/templates/coding_prompt.template.md` |
| Non-goals | 不改 `initializer_prompt`；不新增 longrun 状态写回流程 |
| Upstream dependencies / frozen assumptions | 以现有 coding prompt 的 authority boundary 为基础，只补 commander-mode hardening 语义 |
| Owner | Worker-C |
| Reviewer | Reviewer-C |
| Verifier | Verifier-C |
| Closer | Closer-C |
| Write-set | `longrun/templates/coding_prompt.template.md` |
| Read-set | `longrun/templates/coding_prompt.template.md`, `.specify/memory/constitution.md`, `specs/017-commander-mode-hardening/spec.md` |
| Required tests / commands | `rg -n "Authority boundary|commander|non-authoritative|passes: true|traceable" longrun/templates/coding_prompt.template.md` |
| Negative-invariant verification | `! rg -n "Commander 默认负责主实现|closeout 可提升 truth|summary 可提升 truth|review 通过即可视为 verification 通过|closeout 可覆盖 spec|summary 可覆盖 code|新的 authority order|重排 authority order" longrun/templates/coding_prompt.template.md` |
| Acceptance signals | 模板显式声明 closeout 不是 truth source；Commander Mode 下主线程不默认承担 implementation；`passes: true` 仍需 traceable evidence；且未出现 forbidden wording、authority drift、review=verification drift、closeout / summary truth promotion |
| State marker / status marker | `queued -> in_progress -> review_pending -> verification_pending -> closed` |
| Stop rule | 如需求开始波及 longrun ledger、runbook 或其他模板，先暂停并重新定 scope |

### Packet `PKT-017-D` — Cross-Surface Integration Packet

| Field | Value |
| --- | --- |
| Goal | 在三个独立 packet 完成后做跨文档口径对齐，消除 authority drift、role drift 与 wording drift |
| Scope | 只对三处最小写面做必要的交叉修词和一致性收敛 |
| Non-goals | 不引入新职责；不扩大文件范围；不顺手补其他治理文档 |
| Upstream dependencies / frozen assumptions | `PKT-017-A/B/C` 均已完成 review 与 verification，且有 fresh evidence |
| Owner | Worker-D（不得与 A/B/C 任一 packet 同时占有同一写面） |
| Reviewer | Reviewer-D |
| Verifier | Verifier-D |
| Closer | Closer-D |
| Write-set | `.specify/memory/constitution.md`, `.specify/templates/plan-template.md`, `longrun/templates/coding_prompt.template.md`（仅限交叉一致性修词） |
| Read-set | 三处已落地文档 + `specs/017-commander-mode-hardening/spec.md` + `specs/017-commander-mode-hardening/tasks.md` |
| Required tests / commands | `rg -n "non-authoritative|Commander|Reviewer|Verifier|Write-set|Read-set|Stop rule" .specify/memory/constitution.md .specify/templates/plan-template.md longrun/templates/coding_prompt.template.md` |
| Negative-invariant verification | `! rg -n "Commander 默认负责主实现|Commander 默认负责主力开发|review 通过即可视为 verification 通过|verification 可由 review 代替|closeout.*提升 truth|summary.*提升 truth|closeout.*覆盖 .*spec|summary.*覆盖 .*spec|新的 authority order|重排 authority order" .specify/memory/constitution.md .specify/templates/plan-template.md longrun/templates/coding_prompt.template.md` |
| Acceptance signals | 三处文件的角色边界、authority 顺位、packet 字段与 closeout 语义完全一致；且未出现 forbidden wording、authority drift、review=verification drift、closeout / summary truth promotion |
| State marker / status marker | `queued -> in_progress -> review_pending -> verification_pending -> closed` |
| Stop rule | 发现任何跨面冲突无法在三处内解决时，暂停并回到 spec 请求扩面裁决 |

## Review Routing

- Reviewer 只审：scope、boundary、contract、authority drift、scope creep、wording guards 是否被破坏；
- Reviewer 不审：是否已经“看起来能跑”；不替 verifier 给通过结论；
- 同一个 packet 的 reviewer 与 verifier 必须是不同责任人；
- 若 Commander 亲自改了任一 packet 写面，则该 packet 的 reviewer 不得是 Commander。

## Verification Routing

- Verifier 只看：fresh commands、traceable evidence、negative invariants、regressions、acceptance signals；
- Verifier 不看：closeout 文案是否好看；不重写 spec；不替 reviewer 改 boundary；
- 若 Commander 亲自改了任一 packet 写面，则该 packet 的 verifier 不得是 Commander；
- 无 fresh evidence 时，不得 close。

## Closeout Routing

- Closer 只记录已验证事实与未决风险；
- Closer 不得新增 authority，不得把 plan/scope/summary 升级成 truth；
- Closer 不得写出“verification 已通过”除非 verifier 已给出可追溯证据；
- 如 closeout 与 spec / code / tests / commands 冲突，以后者为准。

## Suggested Ownership Split

推荐以四包四主写者执行，避免同写面碰撞：

- **Worker-A**：只拥有 `.specify/memory/constitution.md`
- **Worker-B**：只拥有 `.specify/templates/plan-template.md`
- **Worker-C**：只拥有 `longrun/templates/coding_prompt.template.md`
- **Worker-D**：只拥有 integration packet；仅在 `A/B/C` 都完成后接手一致性修词

推荐原因：

- 三个基础 packet 各自写面独立，可并行；
- integration packet 单独建包，符合“多人共同完成同一 feature 时，集成必须独立建包”的 doctrine；
- Commander 可以保持调度与裁决角色，不必落到默认实现者位置。

## Acceptance Gates

### Gate 1 — Scope Gate

- 激活条件已冻结；
- 最小写面未扩散；
- wording guards 已冻结；
- packet owner / reviewer / verifier / closer 已指派。

### Gate 2 — Review Gate

- reviewer 已明确没有 scope creep、authority drift、boundary break；
- 若 commander 介入过实现，已完成 reviewer / verifier 改派。

### Gate 3 — Verification Gate

- 三个基础 packet 与 integration packet 均有 fresh commands；
- evidence 可追溯；
- closeout 未被当成 authority source。

### Gate 4 — Close Gate

- 只允许 close verified packets；
- summary 只记录事实，不提升 truth；
- 若任何 packet 停在 `needs_rework` 或 `paused`，不得宣称 feature 完成。

# Tasks: Commander Mode Hardening

**Input**: `specs/017-commander-mode-hardening/spec.md`, `specs/017-commander-mode-hardening/plan.md`  
**Prerequisites**: `AGENTS.md`, `docs/governance/framework-stack.md`, `docs/runbooks/F-019-commander-orchestration-governance.md`, `docs/governance/dispatch-templates.md`, `.specify/memory/constitution.md`, `.specify/templates/plan-template.md`, `longrun/templates/coding_prompt.template.md`  
**Suggested Longrun Feature ID**: `F-023`（理由：当前统一账本已用到 `F-022`；本轮是 commander governance 的后续 hardening，应使用下一个空闲长期 feature ID。）

## Dispatch Rules

- 一个 packet 一个主写者；
- 一个文件组同一时刻只允许一个 owner；
- reviewer / verifier / closer 均不得与 packet owner 混用；
- Commander 只做拆解、派工、裁决与收口，不默认承担 implementation；
- 若 Commander 亲自改了某包写面，该包必须改派 reviewer 与 verifier；
- 多个 worker 共同完成同一 feature 时，最终集成必须走独立 integration packet。

## Phase 1: Scope Freeze & Packet Assignment (P0)

- [ ] T001 冻结本 feature 的激活条件：仅当用户明确指定主线程为 commander 时，本制度才生效
- [ ] T002 冻结最小写面为 `.specify/memory/constitution.md`、`.specify/templates/plan-template.md`、`longrun/templates/coding_prompt.template.md`
- [ ] T003 冻结 wording guards：明确需要出现的 commander / packet / non-authoritative 语义，以及必须避免的红旗措辞
- [ ] T004 为 `PKT-017-A/B/C/D` 分别指派 owner、reviewer、verifier、closer，并记录 write-set / read-set / stop rule
- [ ] T005 若 ownership 仍有歧义，则取消并行并退回串行，不得“先改起来再说”

## Phase 2: Packet `PKT-017-A` — Constitution Hardening (P0)

- [x] T006 修改 `.specify/memory/constitution.md`，加入 Commander Mode 激活条件、角色分层与 authority boundary
- [x] T007 在 `.specify/memory/constitution.md` 中加入 Commander contract：allowed actions、forbidden actions、exception interventions、commander 改写面后不得自审 / 自验
- [x] T008 在 `.specify/memory/constitution.md` 中加入 ownership / serialization 规则：单 packet 单主写者、单文件组单 owner、ownership 不清楚退回串行
- [x] T009 在 `.specify/memory/constitution.md` 中加入 review / verification / closeout 的边界与 non-authoritative closeout 规则
- [x] T010 Reviewer 对 `PKT-017-A` 只审 scope、boundary、contract、authority drift、scope creep
- [x] T011 Verifier 对 `PKT-017-A` 运行正向命中检查：`rg -n "Commander|implementation|review|verification|non-authoritative|ownership|serial" .specify/memory/constitution.md`
- [x] T012 Verifier 对 `PKT-017-A` 运行 negative-invariant checks：`! rg -n "Commander 默认负责主实现|Commander 默认负责主力开发|review 通过即可视为 verification 通过|verification 可由 review 代替|closeout.*提升 truth|summary.*提升 truth|closeout.*覆盖 .*spec|summary.*覆盖 .*spec|新的 authority order|重排 authority order" .specify/memory/constitution.md`
- [ ] T013 若 `PKT-017-A` 需要扩大到 runbook 或 runtime 文件，停止并回到 scope freeze

## Phase 3: Packet `PKT-017-B` — Plan Template Hardening (P0)

- [x] T013 修改 `.specify/templates/plan-template.md`，把 packet 制升格为模板默认结构，而不是可选备注
- [x] T014 在 `.specify/templates/plan-template.md` 中加入必填字段：`Packet ID`、`Goal`、`Scope`、`Non-goals`、`Upstream dependencies / frozen assumptions`、`Owner`、`Reviewer`、`Verifier`、`Closer`、`Write-set`、`Read-set`、`Required tests / commands`、`Acceptance signals`、`State marker / status marker`、`Stop rule`
- [x] T015 在 `.specify/templates/plan-template.md` 中加入 review / verification 强制分离、integration packet、ownership 串行化的模板提示
- [x] T016 Reviewer 对 `PKT-017-B` 只审模板是否越权替代 `specs/` 或 execution authority
- [x] T017 Verifier 对 `PKT-017-B` 运行正向命中检查：`rg -n "Packet ID|Owner|Reviewer|Verifier|Closer|Write-set|Read-set|Acceptance signals|Stop rule" .specify/templates/plan-template.md`
- [x] T018 Verifier 对 `PKT-017-B` 运行 negative-invariant checks：`! rg -n "review 通过即可视为 verification 通过|verification 可选|summary 可作为 truth|closeout 可覆盖 spec|多个 worker 可同时修改同一写面|ownership 不清楚也可并行|新的 authority order|重排 authority order" .specify/templates/plan-template.md`
- [ ] T019 若模板改动开始把 summary 当 authority，停止并回到 scope freeze

## Phase 4: Packet `PKT-017-C` — Continuation Prompt Hardening (P0)

- [x] T020 修改 `longrun/templates/coding_prompt.template.md`，补充 Commander Mode continuation 边界
- [x] T021 在 `longrun/templates/coding_prompt.template.md` 中明确：Commander Mode 下主线程默认不承担 implementation；closeout / summary 是 non-authoritative；`passes: true` 仍必须依赖 traceable acceptance evidence
- [x] T022 在 `longrun/templates/coding_prompt.template.md` 中明确：continuation scaffold 不能替代 `specs/`、不能替代 `superpowers`、不能覆盖 verified truth
- [x] T023 Reviewer 对 `PKT-017-C` 只审 authority wording 是否漂移
- [x] T024 Verifier 对 `PKT-017-C` 运行正向命中检查：`rg -n "Authority boundary|commander|non-authoritative|passes: true|traceable" longrun/templates/coding_prompt.template.md`
- [x] T025 Verifier 对 `PKT-017-C` 运行 negative-invariant checks：`! rg -n "Commander 默认负责主实现|closeout 可提升 truth|summary 可提升 truth|review 通过即可视为 verification 通过|closeout 可覆盖 spec|summary 可覆盖 code|新的 authority order|重排 authority order" longrun/templates/coding_prompt.template.md`
- [ ] T026 若需求波及 `initializer_prompt`、longrun ledger 或其他模板，停止并回到 scope freeze

## Phase 5: Packet `PKT-017-D` — Cross-Surface Integration (P0)

- [ ] T027 新建 integration packet，由独立 owner 统一对齐三处写面的 wording、authority order、role boundary、packet 结构
- [ ] T028 integration owner 只允许做交叉一致性修词，不得顺手扩展到其他治理文件
- [x] T029 Reviewer 对 `PKT-017-D` 只审 cross-surface drift：是否有 commander / reviewer / verifier / closer 定义不一致
- [x] T030 Verifier 对 `PKT-017-D` 运行正向命中检查：`rg -n "non-authoritative|Commander|Reviewer|Verifier|Write-set|Read-set|Stop rule" .specify/memory/constitution.md .specify/templates/plan-template.md longrun/templates/coding_prompt.template.md`
- [x] T031 Verifier 对 `PKT-017-D` 运行 negative-invariant checks：`! rg -n "Commander 默认负责主实现|Commander 默认负责主力开发|review 通过即可视为 verification 通过|verification 可由 review 代替|closeout.*提升 truth|summary.*提升 truth|closeout.*覆盖 .*spec|summary.*覆盖 .*spec|新的 authority order|重排 authority order" .specify/memory/constitution.md .specify/templates/plan-template.md longrun/templates/coding_prompt.template.md`
- [ ] T032 若三处文本无法在最小写面内达成一致，暂停并回到 spec 请求扩面裁决

## Acceptance Checklist

- [x] A001 只有用户显式指定主线程为 commander 时，Commander Mode 才会被视为激活
- [x] A002 `Research Agent`、`Design Agent`、`Closer / Summarizer` 被明确标记为治理外围角色，而非执行主链 authority
- [x] A003 `implementation / review / verification` 被明确标记为执行主链
- [x] A004 Commander contract 同时包含 allowed actions、forbidden actions、例外介入条件、commander 改写面后不得自审 / 自验
- [x] A005 每个 packet 的必填字段、状态标记与 stop rule 都已模板化
- [x] A006 ownership 串行化规则明确：单 packet 单主写者、单文件组单 owner、ownership 模糊即退回串行
- [x] A007 Review 与 Verification 被明确要求强制分离
- [x] A008 closeout / summary 被明确限定为 non-authoritative，不得覆盖 spec / code / tests / fresh evidence
- [x] A009 未来实现仍只覆盖三处最小写面，没有扩大到运行时代码或额外治理文件
- [x] A010 verifier 对 `PKT-017-A/B/C/D` 都有显式 negative-invariant checks，而不只是正向命中检查
- [x] A011 negative-invariant checks 至少覆盖 forbidden wording、authority drift、review=verification drift、closeout / summary truth promotion

## Handoff Notes

- 只有整个 `Acceptance Checklist` 均成立，且 `PKT-017-A/B/C/D` 均完成 verification，Commander 才能裁决 `close`；
- Closer 只能整理“已验证事实 + 未决风险 + 下一步建议”，不能把摘要升级为 authority；
- 若本 feature 进入长期账本，建议使用 `F-023`，并在写入时明确这是对 `F-019` commander governance 的 hardening，而不是新的运行时功能。

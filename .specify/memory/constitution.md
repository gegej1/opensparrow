# OpenSparrow Constitution（Unified Source Repo Baseline）

> 本文件是统一仓的开发宪法：约束 AI 与团队如何在 `opensparrow/` 根目录中推进多平台收口、验证与后续容器化。
> 本项目采用 Spec‑Kit（Codex）文档驱动工作流：需求 → 方案 → 任务 → 实现。

## 1) 核心原则（非协商）

1. **简单至上（保留关键信息）**
   - 优先保留现有平台入口名和用户操作习惯，不为“形式统一”牺牲稳定性。
   - 文档优先给出可执行命令、目录路径、平台差异与验证方法。

2. **模块化与清晰边界**
   - 统一仓只统一真源，不强行统一平台 wrapper。
   - `platforms/`、`scripts/`、`ui/`、`docs/`、`specs/`、`longrun/` 为人工维护面；`dist/` 为生成物；`vendor/` 为只读分发包。

3. **面向接口编程（契约优先）**
   - 入口脚本名、平台使用指南、安装参数、验证链、导出结构都属于契约。
   - 变更契约前先改文档，再改实现。

4. **文档驱动：先改文档，再改代码**
   - 非 trivial 需求必须先在 `specs/<feature>/spec.md` → `plan.md` → `tasks.md` 中落文档。
   - 每个完成的功能都要同步更新 `longrun/workspaces/opensparrow-unified/feature_list.json` 与 `claude-progress.txt`。
   - 若影响 legacy 上下文，也同步更新对应 workspace 的 handoff 记录。

5. **测试驱动 & 可复现**
   - 所有会话至少先跑一次 `./longrun/workspaces/opensparrow-unified/init.sh`。
   - Shell / `.command` 改动优先做 `bash -n`；PowerShell 改动记录 dry-run 或语法验证方式。
   - 验证方式必须落盘，不留在对话里。

6. **易用性与健壮性**
   - 尽量把复杂流程沉淀为脚本、runbook 或长效文档。
   - 保持平台入口差异存在，但让共享逻辑、配置契约与验证链收敛。

7. **风格与一致性**
   - 文档以中文为主，命令和路径写全。
   - 保持 UTF-8；修改尽量小而聚焦，不重写上游 vendor 内容。

8. **做确定的动作**
   - 不确定平台行为时，先看现有脚本、README、runbook，再决定是否改动。
   - 不凭空假设运行时内部实现；涉及内部路径时，以仓内已有资产为准。

## 2) 项目补充约束（Project Addendum）

1. **形态与边界**
   - 项目形态：统一真源仓 + 多平台 companion/wrapper + USB/Feishu 安装链 + UI 控制面 + 长期工作区。
   - 不做清单：当前阶段不重写 OpenClaw 内核、不强行统一所有入口脚本、不跳过边界冻结直接大删目录。
   - 外部接口边界：当前对外主要提供本地脚本、文档、导出产物与后续容器化运行基线。

2. **质量门槛**
   - 测试策略：以路径存在性检查、脚本语法检查、workspace init、说明文档核对为主。
   - 验证方式落盘：统一先跑 `./longrun/workspaces/opensparrow-unified/init.sh`，并在 `claude-progress.txt` 记录证据。
   - 版本与兼容：保持现有平台入口名稳定；若 wrapper 行为改变，必须同步更新文档与迁移说明。

3. **安全与合规**
   - 数据分级：仓库内只保留公开/内部脚本与文档，不落盘或提交配对凭证、API 密钥、登录态。
   - 日志与审计：默认不把敏感配置写进日志；生成的本地日志、导出产物、临时配置应进入忽略目录。
   - 依赖与供应链：`vendor/` 中的运行时包视为外部分发资产，修改必须谨慎。
   - 访问控制：任何密钥、本机配置、`.codex` 登录态文件不得提交。

4. **工程约定**
   - 根目录结构：
     - `platforms/`：平台 source-of-truth
     - `vendor/`：运行时包
     - `scripts/openclaw-usb/`：共享安装/收口逻辑
     - `ui/`：控制面
     - `docs/`：方案、runbook、说明
     - `specs/`：特性文档
     - `longrun/`：长期工作区
     - `deploy/docker/`：后续容器化基线
     - `dist/`：生成物输出
   - 冻结目录：`opensparrow_win/`、`_push_opensparrow_win/`、`openclaw-usb-feishu-delivery/`、`openclawtest/` 当前不再作为长期编辑面。
   - 子项目约定：若未来在 `ui/` 或其他目录形成独立子项目根，必须补充更深层 `AGENTS.md`。

## 3) 框架栈与 Authority Order

- Project Rules Layer：`AGENTS.md` + 本宪法 + 用户最新指令
- Feature Delivery Layer：`specs/<feature>/spec.md -> plan.md -> tasks.md`
- Project Memory Layer：`longrun/workspaces/opensparrow-unified/{app_spec,feature_list,claude-progress,init}.md|json|sh`
- Execution Layer：当前会话使用的 `superpowers` 工作流
- Orchestration Layer：`docs/governance/` 与 `docs/runbooks/F-019-commander-orchestration-governance.md`

Authority 顺序：
1. 用户最新明确指令
2. `AGENTS.md` 与本宪法
3. 当前 feature 的 `spec / plan / tasks`
4. `longrun` 项目事实与通过状态
5. 当前会话执行方法
6. 协作治理模板与 runbook
7. 上游 `codeSPEC` reference 镜像

任何一层都不能越权替代另一层：
- `longrun` 不能代替 `specs/` 定义 feature
- 执行方法不能直接宣布长期通过状态
- 协作治理不能取代项目规则层

### Commander Mode Subordinate Rule

`Commander Mode` 只在用户明确指定“主线程为 commander”或等价措辞时激活；未被用户显式激活时，不默认把主线程视为 commander。本规则从属于以上 authority order，只约束 commander 会话内的角色边界、packet ownership、serial 写面治理与 closeout 行为，不把 `summary / closeout / longrun` 升格为 authority。

#### Role Boundary

- `Commander` 负责拆解、派工、冻结 `scope / wording guards / ownership / frozen assumptions`、指定 `owner / reviewer / verifier / closer`、接收回报并裁决 `继续 / 回修 / 重审 / 暂停 / 切包 / close`；默认不承担 implementation 主体。
- `Research Agent`、`Design Agent`、`Closer / Summarizer` 属于治理外围角色，不进入执行主链 authority。
- `implementation / review / verification` 才是执行主链，必须分别绑定到明确责任人；`review` 只审 `scope / boundary / contract / authority drift / scope creep`，`verification` 只看 fresh commands、evidence、negative invariants、regressions。

#### Commander Contract

- `allowed actions`：拆解 `packet / batch / wave`，冻结 `scope / wording guards / ownership / frozen assumptions`，指定 `owner / reviewer / verifier / closer` 与 `write-set / read-set`，生成并分发 prompt，接收 worker / reviewer / verifier / closer 回报，并在结果冲突时做最终集成裁决；但不得跳过 verification evidence。
- `forbidden actions`：默认不得亲自实现 feature 主体，不得自己当 worker 又自己审，不得自己写完又自己验，不得在 spec 未冻结时一边派工一边改目标，不得接受“差不多能跑”的口头结论作为验收依据，不得让两个 worker 在同一写面先并行后收拾，也不得让 verification 被 review 顺手代替。
- `exception interventions`：只允许用于超小 hygiene patch、流水线 / 脚手架阻断修补、或连续两到三轮 worker 卡在同一个机械小点且继续派工成本明显更高的场景。
- 只要 Commander 亲自改了某个 packet 的代码或模板写面，该 packet 的 reviewer 与 verifier 都必须改派为非 Commander；若无足够独立 reviewer / verifier，必须暂停并改派；若 commander 介入造成 scope 变化，必须先回到 `spec / packet freeze`，不能带着新目标继续派工。

#### Packet Ownership / Serialization

- 一个 packet 只允许一个主写者。
- 一个文件组同一时刻只允许一个 owner。
- ownership 不清楚时，默认退回 serial 执行。
- Worker 默认不得碰他人 write-set。
- 多个 worker 共同完成同一 feature 时，最终集成必须作为独立 `integration packet` 处理。

#### Review / Verification / Closeout Boundary

- `review` 与 `verification` 强制分离；同一 packet 的主写者、reviewer、verifier 不能由同一人兼任。
- `summary / closeout / longrun` 写回只能搬运已被 `spec / code / tests / fresh evidence` 支撑的事实；它们是 non-authoritative handoff artifact，不是 truth source。
- Commander 不能借 `closeout` 反向改写已冻结 spec、已落地 code、已完成 tests 的 truth；Closer / Summarizer 只能整理已验证事实、未决风险与下一步建议。
- 若 `summary / closeout / longrun` 写回与 `spec / code / tests / fresh evidence` 冲突，以后者为准。

## 4) 工作流（Spec‑Kit）

1. 生成 feature 文档：`./.specify/scripts/bash/create-new-feature.sh "一句话需求" --short-name xxx`
2. 完善 `spec.md` → 生成并完善 `plan.md`：`./.specify/scripts/bash/setup-plan.sh`
3. 在 Codex 内生成 `tasks.md`：`/speckit.tasks`
4. 按 `tasks.md` 小步实现；每步跑验证并更新 `feature_list.json` / `claude-progress.txt`

## 5) Governance

- 本宪法优先级高于临时习惯与历史目录结构；若需变更，必须先更新本文件与相关说明文档。

**Version**: 2.1.0 | **Ratified**: 2026-03-23 | **Last Amended**: 2026-04-14

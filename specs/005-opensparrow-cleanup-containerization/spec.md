# Feature Specification: OpenSparrow Repo Cleanup, Cross-Platform Balance & Containerized Baseline

**Feature Branch**: `005-opensparrow-cleanup-containerization`  
**Created**: 2026-03-22  
**Updated**: 2026-03-23  
**Status**: Draft (Planning)  
**Input**: 用户要求先规划三件事：1) 清理 OpenSparrow 中重复、脏、生成物与源码混放的问题；2) 同时纳入 `openclaw-usb-feishu-delivery` 中的 Mac / Windows 历史副本，做跨平台平衡规划；3) 设计容器化部署基线，尽量降低 Mac / Windows 主机环境差异，再在评审通过后实施。

## Context & References

- Local code evidence:
  - 当前 `opensparrow` 下同时存在 `opensparrow_win/`、`_push_opensparrow_win/`、`openclaw-usb-feishu-delivery/` 等多套交付副本。
  - `openclaw-usb-feishu-delivery/mac/feishu-source` 与当前 `opensparrow_win/feishu-source` 已经分叉：Mac 副本只有 `002` / `003`，当前真源已推进到 `004` / `005`。
  - `openclaw-usb-feishu-delivery/mac/usb-pack` 与 `opensparrow_win/usb-pack` 已明显漂移，说明 Mac / Windows 交付包正分别演化而缺少统一真源。
  - 现有部署链路强依赖主机 PowerShell / Bash、主机 profile 状态目录、主机端口与本地服务管理器。
- Existing feature context:
  - `002-openclaw-usb-installer`：解决本地 / U 盘可迁移部署基线。
  - `003-opensparrow-ui-reset-hardening`：解决 UI-first 安装态与重置语义。
  - `004-dingtalk-stream-win-parity`：解决 Win/Mac 钉钉部署契约一致性。
- Planning hypothesis:
  - 容器化适合作为“统一控制面 + 统一运行时 + 统一验证”的基线方案，用于减少主机差异。
  - Mac 与 Windows 不应继续拆成两套长期手工维护的源码面；更合理的是一个统一真源仓库，平台差异仅体现在 wrapper / packaging 层。
  - 容器化不能自动解决所有平台差异；涉及原生桌面能力、U 盘交付入口、宿主系统服务管理的部分，需要明确保留为 host wrapper 或显式排除项。

## User Scenarios & Testing

### User Story 1 - 维护者需要单一源码真源（Priority: P1)

作为维护者，我希望知道哪些目录是“可编辑源码”，哪些目录是“构建/交付产物”，这样整理仓库时不会继续在副本上修修补补。

**Why this priority**: 如果真源边界不先收敛，后续不管是清理、平台平衡还是容器化，都会继续把重复和分叉放大。  
**Independent Test**: 审阅后能明确列出“源码真源目录”和“生成物目录”清单，并能给出迁移顺序。  

**Acceptance Scenarios**:
1. **Given** 当前存在多套 `usb-pack/`、`feishu-source/`、导出副本，**When** 完成规划，**Then** 每类资产都有唯一真源与明确生成路径。
2. **Given** 交付目录中存在运行时与文档，**When** 后续实施整理，**Then** 不再要求直接手改导出副本。
3. **Given** 有历史 dirty 代码与产物，**When** 定义边界，**Then** 后续清理可分阶段执行，而不是一次性大爆炸迁移。

---

### User Story 2 - 团队需要平衡 Mac / Windows 历史副本（Priority: P1)

作为团队成员，我希望把 `openclaw-usb-feishu-delivery/mac`、`winnew/winnew`、`opensparrow_win` 这些平台副本重新纳入统一规划，避免以后某个平台永远“落后一版”。

**Why this priority**: 现在问题不只是 Windows；Mac 历史副本也已经落后，继续双线手改只会越修越散。  
**Independent Test**: 审阅后能明确哪些 Mac / Windows 目录是历史副本，哪些是当前真源，哪些平台差异应该保留、哪些应该回归共享层。  

**Acceptance Scenarios**:
1. **Given** `openclaw-usb-feishu-delivery/mac/feishu-source` 与当前 `feishu-source` 已分叉，**When** 完成规划，**Then** Mac 副本被定义为历史/交付副本而非真源。
2. **Given** Mac / Windows 交付入口不同，**When** 后续实施，**Then** 平台差异仅保留在 wrapper / packaging 层，而不是复制整套源码。
3. **Given** 未来继续开发 Feishu / WeCom / DingTalk，**When** 新功能进入，**Then** 不需要先分别在 Mac / Windows 两套源码里改两遍。

---

### User Story 3 - 运维人员需要跨平台更稳定的部署基线（Priority: P1)

作为运维或开发人员，我希望在 Mac 与 Windows 上尽量使用同一套容器化运行时和验证命令，以减少“同样参数、不同主机结果不同”的问题。

**Why this priority**: 这是用户当前最直接的痛点，也是容器化最有价值的地方。  
**Independent Test**: 在干净的 Mac / Windows Docker 环境中，使用同一份 env 契约与 compose 配置拉起控制面与网关，能够得到一致的 health / probe / smoke 命令结果。  

**Acceptance Scenarios**:
1. **Given** 一台干净的 Mac 或 Windows 主机，**When** 使用文档中的 `docker compose` 命令启动，**Then** 能得到统一端口、统一卷挂载和统一健康检查入口。
2. **Given** 相同的 Feishu / WeCom / DingTalk / OpenAI 参数，**When** 在容器基线中运行，**Then** 至少能完成统一的安装/健康/探针/agent smoke 检查。
3. **Given** 主机原有默认 OpenClaw profile，**When** 启动容器方案，**Then** 不会污染默认 `~/.openclaw/` 路径。

---

### User Story 4 - 交付工程师仍需保留原生交付能力（Priority: P1)

作为交付工程师，我希望 USB 包、Windows handoff copy、Mac `.command` 入口仍然保留，但这些产物应从真源自动生成，而不是靠手工维护多份副本。

**Why this priority**: OpenSparrow 目前不仅是开发仓库，也是交付仓库；不能因为容器化就丢掉原生交付。  
**Independent Test**: 规划中能明确“容器基线”和“原生交付包”是并行产物，并定义哪个目录是生成入口。  

**Acceptance Scenarios**:
1. **Given** 仍需要 `usb-pack` 与 handoff copy，**When** 规划完成，**Then** 它们被定义为 build/export 产物，而不是主编辑面。
2. **Given** Windows / Mac 仍需提供用户可双击入口，**When** 容器方案实施后，**Then** 入口脚本要么调用 compose，要么调用统一 build 产物，而不是绕开真源。
3. **Given** 离线/U 盘交付仍然存在，**When** 规划审阅，**Then** 容器化不会被误当作唯一交付模式。

---

### User Story 5 - 团队需要明确仓库策略（Priority: P1)

作为仓库维护者，我希望明确“未来到底是一个统一源码仓，还是 Mac / Windows 分仓”，这样后续清理和上传才不会再反复摇摆。

**Why this priority**: 如果仓库策略不先定，代码越清理越可能再次散到多个仓库。  
**Independent Test**: 审阅后能得出明确建议：单一真源仓 / 平台分仓 / 发布仓的取舍，以及当前仓库是否适合直接承接。  

**Acceptance Scenarios**:
1. **Given** 当前 `opensparrow_win` 带平台语义，**When** 规划完成，**Then** 能判断它是否仍适合继续作为总真源。
2. **Given** 用户希望把清洁后的代码上传到当前仓库或新仓库，**When** 规划完成，**Then** 能得到明确推荐路径。
3. **Given** Mac / Windows 共享 UI、spec、脚本与交付逻辑，**When** 选择仓库策略，**Then** 不再推荐分裂成两个长期源码仓。

## Edge Cases

- Windows Docker Desktop 路径映射与 CRLF/权限问题。
- Apple Silicon（arm64）与 x86_64 镜像兼容性差异。
- 宿主机已有 profile / 端口占用 / service 残留导致的假回归。
- 需要直接依赖宿主桌面环境、系统服务、U 盘自动执行或本地 GUI 的能力。
- 离线交付场景下无法临时拉取镜像，需保留打包/导出策略。
- 当前若直接把 `opensparrow_win` 上传为总真源，平台命名会持续误导后续结构演化。

## Requirements

### Functional Requirements

- **FR-001**: 必须定义 OpenSparrow 的唯一“可编辑真源目录”清单，以及“生成物/交付物目录”清单。
- **FR-002**: 后续实施中，`openclaw-usb-feishu-delivery/mac`、`openclaw-usb-feishu-delivery/winnew/winnew`、顶层 `usb-pack/`、push 副本、导出副本等目录不得再作为长期人工编辑面。
- **FR-003**: 必须设计一套容器化部署基线，至少覆盖控制面、OpenClaw 运行时、profile 隔离卷、日志卷、配置 env 契约。
- **FR-004**: 容器化基线默认不依赖宿主机默认 profile，不写入默认 `~/.openclaw/`。
- **FR-005**: 容器化基线必须提供统一的 health / probe / smoke 验证路径。
- **FR-006**: 容器化方案必须显式区分 container-ready、host-adapter、out-of-scope 三类能力边界。
- **FR-007**: 原生交付包（USB / handoff copy / 双击入口）必须保留，但改为从真源生成。
- **FR-008**: 规划必须给出仓库清理迁移顺序，避免一次性删除或重排导致失控。
- **FR-009**: 规划必须给出 Docker/Compose 目录、镜像构建策略、卷策略、端口策略和密钥注入策略。
- **FR-010**: 规划必须给出 Mac / Windows 共享层与平台差异层的边界定义。
- **FR-011**: 规划必须明确推荐的仓库策略，并说明“当前仓库承接”与“新建中性真源仓”两条路径的利弊。
- **FR-012**: 变更必须先落 `spec.md` / `plan.md` / `tasks.md` / longrun 文档，再进入实现。

### Key Entities

- **Source-of-Truth Map**: 可编辑源码、构建脚本、导出产物和运行时副本的边界清单。
- **Platform Balance Map**: Mac / Windows 共用层、wrapper 层、packaging 层的分界。
- **Container Baseline**: 面向 Mac / Windows Docker 主机的统一 OpenSparrow 运行拓扑。
- **Compatibility Matrix**: 渠道/能力的容器支持矩阵（container-ready / host-adapter / out-of-scope）。
- **Artifact Build Pipeline**: 从真源生成 `usb-pack`、handoff copy 与对外交付副本的路径。
- **Repository Strategy**: 统一源码仓、平台发布仓和历史副本的角色划分。

## Success Criteria

### Measurable Outcomes

- **SC-001**: 审阅后可明确指定唯一真源，不再允许继续把 generated 副本当源码长期维护。
- **SC-002**: Mac / Windows 历史副本的身份被明确：哪些保留、哪些只生成、哪些待下线。
- **SC-003**: 规划中的容器基线能够在 Mac / Windows Docker 主机上使用同一套命令进行拉起与验证。
- **SC-004**: 容器基线明确覆盖 profile 隔离、统一端口、统一 health / probe / smoke 验证。
- **SC-005**: 原生 USB / handoff 交付链被保留，但被重新定义为构建产物而非长期编辑目录。
- **SC-006**: 已形成明确仓库策略建议：不再长期分裂 Mac / Windows 源码仓；如需分仓，仅分发布仓而不分真源仓。

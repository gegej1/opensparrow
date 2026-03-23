# Implementation Plan: OpenSparrow 仓库清理、Mac/Windows 平衡与容器化部署基线

**Branch**: `005-opensparrow-cleanup-containerization` | **Date**: 2026-03-23 | **Spec**: `specs/005-opensparrow-cleanup-containerization/spec.md`  
**Input**: Feature specification from `specs/005-opensparrow-cleanup-containerization/spec.md`

## Summary

本特性不直接改实现，而是先为 OpenSparrow 的下一轮工程化重构建立一套可审核路线图，解决三类结构性问题：

1. **源码真源不清**：仓库里混有源码、打包运行时、导出副本、push 副本和历史产物，导致同一逻辑多处手改。
2. **Mac / Windows 副本失衡**：`openclaw-usb-feishu-delivery/mac` 与 `winnew/winnew` 都在持续保留整套副本，Mac 副本甚至已经落后于当前真源。
3. **主机环境漂移明显**：当前部署链路强依赖 Mac / Windows 主机状态、Shell、端口、profile、service manager，造成“同参数不同主机结果不同”。

规划目标是：

- 先收敛“真源 vs 生成物”的仓库边界；
- 再明确 Mac / Windows 的共享层与平台差异层；
- 再引入一套 **container-first baseline**，统一控制面与 OpenClaw 运行时；
- 同时保留 USB / handoff copy 这条原生交付线，但将其降级为构建产物；
- 最后给出**仓库策略建议**：是把清理后的真源上传到当前仓库，还是迁到一个新的中性仓库。

## Technical Context

**Language/Version**: Node.js ESM + PowerShell + Bash + Markdown + Docker Compose  
**Primary Dependencies**: bundled `openclaw`, bundled Node runtime, Docker / Docker Compose  
**Storage**: named volumes / bind mounts for OpenClaw state, workspace, UI metadata, logs  
**Testing**: `docker compose config` + `up/down` + HTTP health + `channels status --probe` + `agent` smoke + 原生导出包回归  
**Target Platform**: macOS / Windows Docker Desktop（后续可补 Linux CI）  
**Project Type**: deployment architecture + repo refactor planning + delivery pipeline consolidation  
**Performance Goals**: 容器基线在干净主机上 5 分钟内拉起到可健康检查状态  
**Constraints**: 不把所有能力强行塞入容器；不破坏现有 USB / handoff 交付；不提交明文密钥；不一次性做高风险大迁移  

## Constitution Check

- 文档先行：本 feature 先建立 `spec.md` / `plan.md` / `tasks.md`，再决定是否实施。✅
- 可复现验证：规划中明确保留 compose / health / probe / smoke 验证链。✅
- 安全约束：容器镜像不内置真实密钥，统一使用 env / mounted config 注入。✅
- 渐进重构：先收敛边界，再改实现，不直接进行大规模 destructive cleanup。✅

## Investigation Conclusions (Validated)

1. **Mac / Windows 交付副本都不适合继续作为真源**
   - `openclaw-usb-feishu-delivery/mac/feishu-source` 仍保留整套源码副本，但已落后于当前 `opensparrow_win/feishu-source`；
   - `openclaw-usb-feishu-delivery/winnew/winnew` 也携带 `feishu-source` 与 `usb-pack` 的整套历史副本；
   - 这说明当前平台副本本质上是交付快照，不应再继续承担长期开发职责。

2. **当前仓库存在明显“源码与产物混仓”问题**
   - 同时存在 `opensparrow_win/`、`_push_opensparrow_win/`、`openclaw-usb-feishu-delivery/`、顶层 `usb-pack/` 等多类角色不同的目录；
   - 人容易在 generated 目录里直接修 bug，导致修复无法稳定回流。

3. **当前部署链过度绑定宿主机**
   - PowerShell / Bash / host profile / host service manager / host port 状态都会影响行为；
   - 当前一键部署与 UI-first 流程虽能工作，但跨平台一致性弱。

4. **容器化可以显著降低“运行时差异”，但不能替代全部宿主行为**
   - 适合容器化的部分：OpenClaw 运行时、控制 UI、网络型渠道（Feishu / WeCom / DingTalk Stream）、health/probe/smoke 验证；
   - 不宜直接容器化的部分：U 盘启动入口、宿主系统服务注册、特定原生桌面能力、明确 host-bound 的渠道或桥接。

5. **仓库策略不宜继续按 OS 分裂真源**
   - Mac 与 Windows 共用 spec、skill、核心脚本、UI、OpenClaw runtime 配置逻辑；
   - 长期维护两套源码仓只会导致平台漂移；
   - 更合理的是 **单一真源仓 + 平台 wrapper 子目录 + 生成式发布产物**。

## Proposed Design

### A. Source-of-Truth Boundary Freeze

先冻结资产边界，避免继续在副本上修逻辑：

- **Editable source-of-truth**（计划保留人工编辑）
  - `feishu-source/specs/`
  - `feishu-source/scripts/`
  - `feishu-source/skills/`
  - `feishu-source/longrun/workspaces/openclaw-usb-portable/execution/`
  - 新增的 `feishu-source/deploy/` 或 `feishu-source/infra/`（容器资产）
- **Generated outputs**（计划由构建脚本生成）
  - 顶层 `usb-pack/`
  - `_push_opensparrow_win/`
  - `openclaw-usb-feishu-delivery/mac`
  - `openclaw-usb-feishu-delivery/winnew/winnew`
  - `execution/export/*` 和其他 staging copy

目标不是立刻删除这些目录，而是先定义：**未来它们只允许由 build/export 生成，不再作为手改真源**。

### B. Mac / Windows Balance Strategy

核心思路：

- **共享层**：spec、plan、tasks、longrun、UI backend/frontend、核心安装/收口逻辑、OpenClaw 配置契约。
- **平台差异层**：
  - macOS：`.command` wrapper、mac runtime packaging、Gatekeeper / shell 兼容处理；
  - Windows：`.cmd/.ps1` wrapper、PowerShell UX、Windows runtime packaging。
- **明确禁止**：不再保留“Mac 一套完整源码副本 + Windows 一套完整源码副本”的长期维护方式。

### C. Repository Strategy Recommendation

本规划给出三种路径：

1. **方案 A：单一中性真源仓（推荐）**
   - 创建或迁移到一个中性名称仓库，例如 `opensparrow-source` / `opensparrow-delivery-source`；
   - 在该仓中统一维护 `specs/`、`longrun/`、`scripts/`、`deploy/docker/`、`platforms/mac/`、`platforms/windows/`；
   - `usb-pack`、handoff copy、push copy 全部作为 build/export 产物。

2. **方案 B：把“当前目标仓库”升级为统一真源仓（可行，但需先重构目录/命名）**
   - 如果你希望最终上传到“现在这个仓库”，可以；
   - 但前提是它要从“平台/运行时仓”升级为**中性源码仓结构**，不能继续沿用会误导平台角色的历史命名与散乱布局。

3. **方案 C：Mac / Windows 分仓（不推荐）**
   - 仅在发布层面需要分仓时才考虑；
   - **不推荐**把源码层长期拆成两个仓，因为共享逻辑太多，会显著放大维护成本。

结论：**推荐单一真源仓，不推荐长期分裂 Mac / Windows 源码仓；如需分开，只分 release 仓或交付仓，不分 source-of-truth 仓。**

### D. Container-First Baseline Architecture

计划引入统一容器运行模式，目录建议如下：

```text
<canonical-source-repo>/
├── docs/
├── specs/
├── longrun/
├── scripts/
├── deploy/
│   └── docker/
│       ├── Dockerfile
│       ├── docker-compose.yml
│       ├── .env.example
│       └── entrypoints/
├── platforms/
│   ├── mac/
│   └── windows/
└── packaging/
```

容器拓扑建议采用 **单主服务 + 可选 builder**：

- `opensparrow-core`
  - 内置 OpenClaw runtime + control UI
  - 使用 compose restart policy 代替宿主机 `daemon install`
  - 暴露 UI 端口与 gateway 端口
- `opensparrow-builder`（可选）
  - 用于生成 `usb-pack` / handoff copy / export 副本
  - 不常驻，仅在 build/release 时运行

关键设计点：

- **容器内不走宿主 service manager 模式**，避免把 `daemon install` 逻辑强塞进容器；
- **profile/state/workspace/logs 全部映射到独立卷**；
- **env 文件只注入配置，不写入镜像**；
- **默认端口延续当前约定**（如 `18889` / `19000`），但允许通过 compose 覆盖。

### E. Compatibility Matrix

规划中将渠道与能力分三类：

- **Container-ready**
  - Feishu WebSocket
  - WeCom stream / webhook 类接入
  - DingTalk Stream
  - OpenAI-compatible provider
  - health / probe / smoke / UI 管理
- **Host-adapter**
  - 原生 Windows / macOS 双击入口
  - USB handoff / 打包导出
  - 需要宿主文件浏览器或桌面动作的启动器
- **Out-of-scope（当前阶段不容器化）**
  - 强依赖宿主系统服务注册或桌面桥接的能力
  - 明显 host-native 的渠道与桌面自动化能力

### F. Native Delivery Remains, but Becomes Derived Output

保留现有“对非技术同事友好”的交付模式，但做角色切分：

- **源码层**：只维护模板、脚本、文档、UI、runtime manifest；
- **产物层**：通过 build/export 组装出 `usb-pack`、Windows handoff copy、Mac handoff copy、push 副本；
- **入口层**：顶层 `.cmd/.ps1/.command` 只负责启动 compose 或启动生成后的产物，不再隐式携带业务逻辑。

## Sequencing Recommendation

建议按以下顺序实施，而不是大混改：

1. **Phase 0**：冻结边界，先出 Mac/Windows/历史副本清单与迁移图。
2. **Phase 1**：决定统一真源仓策略（当前仓接管 vs 新建中性仓）。
3. **Phase 2**：把 hand-maintained 逻辑从 generated 目录抽回真源。
4. **Phase 3**：做容器运行基线（最小可运行）。
5. **Phase 4**：把 native wrapper 改成薄封装。
6. **Phase 5**：统一 build/export 管线。
7. **Phase 6**：回归 Feishu / WeCom / DingTalk + USB/handoff。

## Complexity Tracking

| Decision | Why Needed | Simpler Alternative Rejected Because |
|----------|------------|--------------------------------------|
| 单一真源仓 + 平台 wrapper | Mac/Windows 共享逻辑很多，分仓会持续漂移 | 继续两套源码仓会放大重复维护 |
| 采用“container-first + native delivery”双轨 | 同时解决环境漂移与交付现实需求 | 只做 Docker 会丢失当前原生交付能力 |
| 先冻结真源边界，再动代码 | 避免继续在副本上修逻辑 | 直接删目录风险极高，容易误伤仍在使用的产物 |
| 容器内不走 host daemon install | 宿主 service manager 与容器职责不同 | 把 daemon/service 强塞进容器会放大平台差异 |

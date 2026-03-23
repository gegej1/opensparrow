# 边界冻结表 + 迁移矩阵

**文档编号**：BCM-20260323
**日期**：2026-03-23
**状态**：草稿，待团队评审
**配套文档**：`cross-platform-unification-risk-assessment-20260323.md`、`repo-topology-recommendation-20260323.md`
**归档路径**：`opensparrow_win/feishu-source/longrun/workspaces/openclaw-usb-portable/execution/docs/`

---

## 目录

1. [文档目标](#1-文档目标)
2. [边界冻结表](#2-边界冻结表)
   - 2.1 openclawNative 资产分类
   - 2.2 opensparrow 资产分类
   - 2.3 分类统计汇总
3. [迁移矩阵](#3-迁移矩阵)
   - 3.1 统一仓目标结构
   - 3.2 迁移步骤矩阵
   - 3.3 冲突合并策略
4. [仓库承载决策](#4-仓库承载决策)
5. [`.gitattributes` 初始模板](#5-gitattributes-初始模板)
6. [`.gitignore` 统一模板](#6-gitignore-统一模板)
7. [下一步行动清单](#7-下一步行动清单)

---

## 1. 文档目标

本文档是跨平台统一仓工作的核心决策文件，服务以下三个目的：

**目的一：边界冻结（Boundary Freeze）**

明确声明当前两个仓库（`openclawNative` 和 `opensparrow`）中每一个目录和文件的归属类别，防止在迁移期间因认知混乱导致数据丢失或重复维护。边界一旦冻结，任何对现有仓库的写入操作都应被视为需要同步到统一仓的变更。

**目的二：迁移矩阵（Migration Matrix）**

提供从当前分散状态收敛到单一统一真实源仓库（unified true source repo）的具体行动路径，每个迁移步骤均包含源路径、目标路径、所需操作、前置依赖和风险评级。

**目的三：仓库承载决策（Repository Decision）**

基于现有两仓的实际结构，给出统一仓的选型建议——是改造现有 `openclawNative` 还是新建中性仓，并说明推荐理由。

**范围说明**

本文档涵盖的两个仓库：

- `openclawNative`：路径 `/Users/eduardogan/Desktop/GHJProject/openclawNative/`，多平台运行时分发仓（Linux/macOS/Windows），当前**不是** git 仓库。
- `opensparrow`：路径 `/Users/eduardogan/Desktop/GHJProject/opensparrow/`，包含主部署/安装源，核心子目录为 `opensparrow_win/`（已是 git 仓库）。

本文档**不涉及**运行时二进制文件的版本管理策略，该议题由 Git LFS 决策文档单独处理。

---

## 2. 边界冻结表

边界冻结表使用以下四个分类：

| 分类标签 | 含义 |
|---------|------|
| **source-of-truth** | 真实源，人工维护，所有改动必须在此处发生 |
| **generated output** | 生成产物，由构建脚本从 source-of-truth 派生，不可直接编辑 |
| **vendor (只读)** | 第三方或外部提供的二进制/运行时包，不在本项目中维护 |
| **historical snapshot** | 历史快照，已被更新版本取代，仅供归档参考，不再同步 |

---

### 2.1 openclawNative 资产分类

基础路径：`/Users/eduardogan/Desktop/GHJProject/openclawNative/`

| 路径 | 分类 | 说明 | 迁移目标 |
|------|------|------|---------|
| `linux-openclaw/` | vendor (只读) | Linux 运行时二进制包，外部提供 | `unified-repo/vendor/linux-openclaw/` |
| `mac-openclaw/` | vendor (只读) | macOS 运行时二进制包，外部提供 | `unified-repo/vendor/mac-openclaw/` |
| `windows-openclaw/` | vendor (只读) | Windows 运行时包（含 Node.js，91MB+） | `unified-repo/vendor/windows-openclaw/` |
| `linux-配套文件/` | source-of-truth | Linux 配套脚本（`初始化.sh`、`关闭.sh`、`配对.sh`、`日常使用.sh`、`重置.sh` + `使用说明.md`，共 6 个文件） | `unified-repo/platforms/linux/companion/` |
| `mac-配套使用文件/` | source-of-truth | macOS 配套脚本（`gateway`、`onboard`、`pairing-feishu`、`start`、`stop` 五个可执行文件 + `使用指南-mac版.md`，共 6 个文件） | `unified-repo/platforms/mac/companion/` |
| `windows-配套文件/` | source-of-truth | Windows 配套脚本（`onboard.ps1`、`pairing.ps1`、`reset-gateway.ps1`、`start-gateway.ps1`、`stop-gateway.ps1` + `使用指南.md`，共 6 个文件） | `unified-repo/platforms/windows/companion/` |
| `docs/` | source-of-truth | 项目文档（`Codex 快速开始.md`、`开发流程（Spec-Kit）.md`、`项目持久化说明.md`） | `unified-repo/docs/` |
| `longrun/` | source-of-truth | 持久化开发框架（含 `workspaces/openclaw-native/`、`workspaces/demo-longrun/`） | `unified-repo/longrun/`（workspaces 子目录保留，见 3.3） |
| `scripts/` | source-of-truth | 项目工具脚本（`codex/` 子目录） | `unified-repo/scripts/` |
| `.specify/` | source-of-truth | Spec-Kit memory（`memory/constitution.md`） | `unified-repo/.specify/`（与 opensparrow 合并，见 3.3） |
| `.codex/` | source-of-truth | Codex 配置（`prompts/` 子目录） | `unified-repo/.codex/` |
| `AGENTS.md` | source-of-truth | Agent 使用指南（多平台运行时维度） | `unified-repo/AGENTS.md`（与 opensparrow 合并，见 3.3） |
| `使用说明.md` | source-of-truth | 用户使用说明（顶层） | `unified-repo/docs/使用说明.md` |

**openclawNative 特别说明**：该目录当前不是 git 仓库。`longrun/workspaces/` 下存在 `openclaw-native/` 和 `demo-longrun/` 两个工作区，均含 `app_spec.md`、`claude-progress.txt`、`feature_list.json`、`init.sh` 四个标准 longrun 文件。

---

### 2.2 opensparrow 资产分类

基础路径：`/Users/eduardogan/Desktop/GHJProject/opensparrow/`

| 路径 | 分类 | 说明 | 迁移目标 |
|------|------|------|---------|
| `opensparrow_win/feishu-source/specs/` | source-of-truth | Feature 规格说明（`002-openclaw-usb-installer/`、`003-opensparrow-ui-reset-hardening/`、`004-dingtalk-stream-win-parity/`、`005-opensparrow-cleanup-containerization/`） | `unified-repo/specs/` |
| `opensparrow_win/feishu-source/longrun/` | source-of-truth | Long-run 工作区（`workspaces/openclaw-usb-portable/`，含完整 execution/ 结构和 docs/ 子目录） | `unified-repo/longrun/workspaces/openclaw-usb-portable/` |
| `opensparrow_win/feishu-source/scripts/` | source-of-truth | 安装脚本（核心：`openclaw-usb/install-local-feishu.sh` 471 行；同目录含 `harden-local-feishu.sh`、`install-local-feishu.ps1`、`harden-local-feishu.ps1`） | `unified-repo/scripts/openclaw-usb/` |
| `opensparrow_win/feishu-source/skills/` | source-of-truth | Skills 模块（`openclaw-local-feishu-usb/SKILL.md`） | `unified-repo/skills/` |
| `opensparrow_win/feishu-source/research/` | source-of-truth | 研究材料（`openclaw-usb-installer/`） | `unified-repo/research/` |
| `opensparrow_win/feishu-source/AGENTS.md` | source-of-truth | Agent 使用指南（USB 部署维度） | `unified-repo/AGENTS.md`（与 openclawNative 合并） |
| `opensparrow_win/feishu-source/.specify/` | source-of-truth | Spec-Kit memory（`memory/constitution.md`） | `unified-repo/.specify/`（与 openclawNative 合并） |
| `opensparrow_win/usb-pack/` | generated output | USB 交付包（整体由 `install-local-feishu.sh` 派生） | `unified-repo/dist/usb-pack/`（加入 `.gitignore`）；其中 source 部分单独提取（见下行） |
| `opensparrow_win/usb-pack/windows/` | 混合（部分 source-of-truth，部分 generated） | Windows 包装脚本：`run-openclaw-usb.cmd` 和 `harden-openclaw-usb.cmd` 为入口 source；`install-local-feishu.ps1` 为 generated copy | source 入口 → `unified-repo/platforms/windows/wrappers/`；generated copy → `dist/` |
| `opensparrow_win/usb-pack/mac/` | 混合（部分 source-of-truth，部分 generated） | Mac 包装脚本：`run-openclaw-usb.command` 和 `harden-openclaw-usb.command` 为入口 source | source 入口 → `unified-repo/platforms/mac/wrappers/`；generated → `dist/` |
| `opensparrow_win/usb-pack/runtime/` | vendor (只读) | 捆绑 Node.js（`node/` 子目录含 `codex`、`codex.cmd`、`codex.ps1`、`corepack` 等）和 OpenClaw（`openclaw/` 子目录） | `unified-repo/vendor/`（参考，评估是否使用 Git LFS） |
| `opensparrow_win/usb-pack/ui/` | source-of-truth | UI 服务器文件（`public/` 静态资源 + `server.mjs`） | `unified-repo/ui/` |
| `opensparrow_win/usb-pack/docs/` | source-of-truth | USB Pack 架构文档（`isolation-boundary.md`、`package-boundary.md`、`solution-architecture.md`、`SOP.md`、`SOURCES.md`、`windows-native-delivery.md`） | `unified-repo/docs/usb-pack/` |
| `opensparrow_win/usb-pack/runbooks/` | source-of-truth | 运维 runbook（`F-001` 至 `F-004` feature runbooks） | `unified-repo/docs/runbooks/` |
| `opensparrow_win/usb-pack/skills/` | generated output | Skills 模块的 USB 包副本（`openclaw-local-feishu-usb/SKILL.md`，与 feishu-source/skills/ 内容相同） | 不单独迁移，由构建脚本从 `skills/` 生成到 `dist/` |
| `opensparrow_win/` (顶层文件) | source-of-truth | `one-click-deploy.cmd`、`one-click-stop.cmd`、`run-codex.cmd`、`README-FIRST.txt`、`VERSIONS.txt`、`CHECKSUMS.sha256` | `unified-repo/platforms/windows/wrappers/`（入口脚本）；`unified-repo/docs/`（README 等） |
| `openclaw-usb-feishu-delivery/mac/` | historical snapshot | Mac 交付包历史快照（仅含 specs 002-003，已过时） | **ARCHIVE — 不迁移** |
| `openclaw-usb-feishu-delivery/winnew/` | historical snapshot | Windows 交付快照（已被 usb-pack 取代） | **ARCHIVE — 不迁移** |
| `openclaw-usb-feishu-delivery/_backup/` | historical snapshot | 备份存档 | **ARCHIVE — 不迁移** |
| `_push_opensparrow_win/` | push copy | 推送副本（`feishu-source/`、`usb-pack/`、`scripts/`、`runbooks/` 的分发镜像） | **ARCHIVE — 不迁移**（由 CI/CD 重建） |
| `openclawtest/` | experimental | 实验性工作区（含 `specs/`、`skills/`、`research/`、`docs/`、`longrun/`） | **ARCHIVE — 评审后决定是否抽取有效内容** |

**opensparrow 特别说明**：`usb-pack/` 中的 `skills/` 与 `feishu-source/skills/` 内容相同，确认为生成副本，不作为独立 source。`opensparrow_win/` 顶层的 `.codex/` 目录若存在，应与 `feishu-source/.codex/` 对比后合并。

---

### 2.3 分类统计汇总

| 分类 | 数量（目录/文件组） | 主要分布 |
|------|-------------------|---------|
| **source-of-truth** | 27 | openclawNative 全部可编辑目录；opensparrow feishu-source/ 全部；usb-pack/ui/、docs/、runbooks/；opensparrow_win/ 顶层入口脚本 |
| **generated output** | 4 | usb-pack/（整体）；usb-pack/skills/；usb-pack/windows/ 中的 .ps1 copy；usb-pack/mac/ 中的 generated 部分 |
| **vendor (只读)** | 5 | linux-openclaw/、mac-openclaw/、windows-openclaw/；usb-pack/runtime/node/；usb-pack/runtime/openclaw/ |
| **historical snapshot** | 4 | openclaw-usb-feishu-delivery/mac/、/winnew/、/_backup/；_push_opensparrow_win/ |
| **experimental** | 1 | openclawtest/ |
| **混合（source + generated）** | 2 | usb-pack/windows/；usb-pack/mac/ |

> **结论**：两仓合计 27 组 source-of-truth 资产，4 组生成产物，5 组 vendor，4 组历史快照，1 组实验性。迁移工作的实际范围是 27 组 source-of-truth + vendor 处理决策。历史快照和实验性工作区不进入统一仓，仅归档。

---

## 3. 迁移矩阵

### 3.1 统一仓目标结构

```
unified-repo/          (暂定名：openclawNative 改造后，或 openclaw-source 新建)
│
├── .gitattributes          # 新建：跨平台换行符 + 权限控制（见第 5 节）
├── .gitignore              # 新建/更新：排除 dist/、vendor binaries（见第 6 节）
│
├── .specify/               # Spec-Kit memory（从两仓合并）
│   └── memory/
│       └── constitution.md
│
├── .codex/                 # Codex 配置（从 openclawNative 迁移）
│   └── prompts/
│
├── AGENTS.md               # Agent 指南（从两仓合并）
│
├── docs/                   # 所有文档
│   ├── 使用说明.md          # 来自 openclawNative 顶层
│   ├── Codex 快速开始.md    # 来自 openclawNative/docs/
│   ├── 开发流程（Spec-Kit）.md
│   ├── 项目持久化说明.md
│   ├── usb-pack/            # 来自 opensparrow usb-pack/docs/
│   │   ├── isolation-boundary.md
│   │   ├── package-boundary.md
│   │   ├── solution-architecture.md
│   │   ├── SOP.md
│   │   ├── SOURCES.md
│   │   └── windows-native-delivery.md
│   └── runbooks/            # 来自 opensparrow usb-pack/runbooks/
│       ├── F-001-install-and-configure.md
│       ├── F-002-skill-polish.md
│       ├── F-003-usb-delivery-pack.md
│       └── F-004-security-hardening.md
│
├── longrun/                 # 持久化开发框架
│   ├── METHOD.md
│   ├── METHOD.zh-CN.md
│   ├── CHECKLIST.md
│   ├── README.md
│   ├── scripts/
│   ├── templates/
│   └── workspaces/
│       ├── openclaw-native/          # 来自 openclawNative/longrun/workspaces/openclaw-native/
│       ├── demo-longrun/             # 来自 openclawNative/longrun/workspaces/demo-longrun/
│       └── openclaw-usb-portable/   # 来自 opensparrow feishu-source/longrun/workspaces/
│           ├── app_spec.md
│           ├── claude-progress.txt
│           ├── execution/
│           │   ├── docs/             # 本文档所在位置
│           │   └── ...
│           ├── feature_list.json
│           └── init.sh
│
├── specs/                   # Feature 规格说明（来自 opensparrow feishu-source/specs/）
│   ├── 002-openclaw-usb-installer/
│   ├── 003-opensparrow-ui-reset-hardening/
│   ├── 004-dingtalk-stream-win-parity/
│   └── 005-opensparrow-cleanup-containerization/
│
├── scripts/                 # 共享安装/工具脚本
│   └── openclaw-usb/
│       ├── install-local-feishu.sh     # 核心：471 行 installer
│       ├── install-local-feishu.ps1
│       ├── harden-local-feishu.sh
│       └── harden-local-feishu.ps1
│
├── skills/                  # Skills 模块（来自 opensparrow feishu-source/skills/）
│   └── openclaw-local-feishu-usb/
│       └── SKILL.md
│
├── research/                # 研究材料（来自 opensparrow feishu-source/research/）
│   └── openclaw-usb-installer/
│
├── ui/                      # UI 服务器文件（来自 opensparrow usb-pack/ui/）
│   ├── public/
│   └── server.mjs
│
├── platforms/               # 平台特定文件（配套脚本 + 入口包装）
│   ├── linux/
│   │   ├── companion/       # 来自 openclawNative/linux-配套文件/
│   │   │   ├── 初始化.sh
│   │   │   ├── 关闭.sh
│   │   │   ├── 配对.sh
│   │   │   ├── 日常使用.sh
│   │   │   ├── 重置.sh
│   │   │   └── 使用说明.md
│   │   └── wrappers/        # Linux 入口点（如有）
│   ├── mac/
│   │   ├── companion/       # 来自 openclawNative/mac-配套使用文件/
│   │   │   ├── gateway
│   │   │   ├── onboard
│   │   │   ├── pairing-feishu
│   │   │   ├── start
│   │   │   ├── stop
│   │   │   └── 使用指南-mac版.md
│   │   └── wrappers/        # 来自 opensparrow usb-pack/mac/（source 部分）
│   │       ├── run-openclaw-usb.command
│   │       └── harden-openclaw-usb.command
│   └── windows/
│       ├── companion/       # 来自 openclawNative/windows-配套文件/
│       │   ├── onboard.ps1
│       │   ├── pairing.ps1
│       │   ├── reset-gateway.ps1
│       │   ├── start-gateway.ps1
│       │   ├── stop-gateway.ps1
│       │   └── 使用指南.md
│       └── wrappers/        # 来自 opensparrow usb-pack/windows/ source 部分 + 顶层脚本
│           ├── run-openclaw-usb.cmd
│           ├── harden-openclaw-usb.cmd
│           ├── one-click-deploy.cmd
│           ├── one-click-stop.cmd
│           └── run-codex.cmd
│
├── deploy/                  # 未来：容器化部署
│   └── docker/              # Dockerfile、compose、.env.example（待 Phase 3）
│
├── vendor/                  # 运行时二进制包（大文件，考虑 .gitignore 或 Git LFS）
│   ├── linux-openclaw/      # 来自 openclawNative/linux-openclaw/
│   ├── mac-openclaw/        # 来自 openclawNative/mac-openclaw/
│   └── windows-openclaw/    # 来自 openclawNative/windows-openclaw/
│
└── dist/                    # GENERATED（加入 .gitignore，不提交）
    ├── usb-pack/            # 由 scripts/openclaw-usb/install-local-feishu.sh 构建
    └── handoff/             # 交付包输出
```

---

### 3.2 迁移步骤矩阵

以下步骤按推荐执行顺序排列。风险等级分为：**低**（可直接执行）、**中**（需人工确认）、**高**（需测试验证）。

| 步骤 | 操作名称 | 源路径 | 目标路径 | 操作类型 | 前置依赖 | 风险 |
|------|---------|--------|---------|---------|---------|------|
| M-01 | 初始化 git 仓库 | `openclawNative/`（当前无 git） | `unified-repo/`（原地改造） | `git init` + 创建 `.gitattributes` | 无 | 低 |
| M-02 | 创建 `.gitattributes` | 第 5 节模板 | `unified-repo/.gitattributes` | 新建文件 | M-01 | 低 |
| M-03 | 创建 `.gitignore` | 第 6 节模板 | `unified-repo/.gitignore` | 新建文件 | M-01 | 低 |
| M-04 | 迁移 Linux 配套脚本 | `openclawNative/linux-配套文件/` | `unified-repo/platforms/linux/companion/` | `git mv`（或手动移动后 add） | M-01 | 低 |
| M-05 | 迁移 macOS 配套脚本 | `openclawNative/mac-配套使用文件/` | `unified-repo/platforms/mac/companion/` | `git mv` + 验证可执行位 | M-01 | 中（可执行位可能丢失） |
| M-06 | 迁移 Windows 配套脚本 | `openclawNative/windows-配套文件/` | `unified-repo/platforms/windows/companion/` | `git mv` | M-01 | 低 |
| M-07 | 迁移 vendor 运行时 | `openclawNative/{linux,mac,windows}-openclaw/` | `unified-repo/vendor/` | 移动 + 决定是否 LFS | M-03（.gitignore） | 中（91MB+ Windows bundle，确认 LFS 策略） |
| M-08 | 迁移 openclawNative/longrun | `openclawNative/longrun/` | `unified-repo/longrun/`（保留 workspaces 子结构） | `git mv` | M-01 | 低 |
| M-09 | 迁移 feishu-source/specs | `opensparrow_win/feishu-source/specs/` | `unified-repo/specs/` | 复制 + git add | M-01 | 低 |
| M-10 | 迁移 feishu-source/longrun | `opensparrow_win/feishu-source/longrun/workspaces/openclaw-usb-portable/` | `unified-repo/longrun/workspaces/openclaw-usb-portable/` | 复制 + git add | M-08 | 低 |
| M-11 | 迁移核心安装脚本 | `opensparrow_win/feishu-source/scripts/openclaw-usb/` | `unified-repo/scripts/openclaw-usb/` | 复制 + git add + 验证换行符 | M-02 | 中（LF 换行符必须保留，Windows 构建依赖此文件） |
| M-12 | 提取 usb-pack 入口脚本（Windows） | `opensparrow_win/usb-pack/windows/{run-openclaw-usb.cmd,harden-openclaw-usb.cmd}` | `unified-repo/platforms/windows/wrappers/` | 复制 source 部分（不含 generated .ps1 copy） | M-03 | 中（区分 source 与 generated，`.ps1` 副本不提取） |
| M-13 | 提取 usb-pack 入口脚本（macOS） | `opensparrow_win/usb-pack/mac/{run-openclaw-usb.command,harden-openclaw-usb.command}` | `unified-repo/platforms/mac/wrappers/` | 复制 + 验证可执行位 | M-02、M-03 | 中（可执行位，换行符 LF） |
| M-14 | 迁移 opensparrow_win 顶层入口脚本 | `opensparrow_win/{one-click-deploy.cmd,one-click-stop.cmd,run-codex.cmd}` | `unified-repo/platforms/windows/wrappers/` | 复制 + git add | M-06 | 低 |
| M-15 | 迁移 UI 服务器文件 | `opensparrow_win/usb-pack/ui/` | `unified-repo/ui/` | 复制 + git add | M-01 | 低 |
| M-16 | 迁移 skills 模块 | `opensparrow_win/feishu-source/skills/` | `unified-repo/skills/` | 复制 + git add（`usb-pack/skills/` 副本不迁移） | M-01 | 低 |
| M-17 | 迁移 research 材料 | `opensparrow_win/feishu-source/research/` | `unified-repo/research/` | 复制 + git add | M-01 | 低 |
| M-18 | 合并 `.specify/memory/constitution.md` | `openclawNative/.specify/` + `opensparrow_win/feishu-source/.specify/` | `unified-repo/.specify/` | 人工合并（见 3.3） | M-01 | 高（需人工审阅内容差异） |
| M-19 | 合并 `AGENTS.md` | `openclawNative/AGENTS.md` + `opensparrow_win/feishu-source/AGENTS.md` | `unified-repo/AGENTS.md` | 人工合并（见 3.3） | M-01 | 高（两份文件视角不同，需统一） |
| M-20 | 迁移 usb-pack/docs 和 runbooks | `opensparrow_win/usb-pack/docs/` + `usb-pack/runbooks/` | `unified-repo/docs/usb-pack/` + `unified-repo/docs/runbooks/` | 复制 + git add | M-01 | 低 |
| M-21 | 更新所有内部路径引用 | 全仓 `*.sh`、`*.ps1`、`*.cmd`、`*.md` 中的路径硬编码 | 同文件（in-place 修改） | `grep` 扫描 + 人工修正 | M-04 到 M-20 全部完成 | 高（路径变更影响脚本运行时行为） |
| M-22 | 验证 macOS companion 脚本 | `unified-repo/platforms/mac/companion/` 中所有可执行文件 | — | 在 macOS 上实际运行冒烟测试 | M-05、M-21 | 高（可执行位、LF 换行符、相对路径三重风险） |
| M-23 | 验证 Windows companion 脚本 | `unified-repo/platforms/windows/companion/*.ps1` + `wrappers/*.cmd` | — | 在 Windows 上实际运行冒烟测试 | M-06、M-12、M-14、M-21 | 高（CRLF、PowerShell 执行策略、路径变更） |
| M-24 | 归档历史快照 | `opensparrow/openclaw-usb-feishu-delivery/`、`_push_opensparrow_win/` | 外部归档存储（如 zip 压缩后移至专用归档目录） | 压缩 + 移出工作目录 | M-09 到 M-20 完成 | 低（只读操作） |
| M-25 | 初始 git commit | `unified-repo/` 全部 source-of-truth 文件 | — | `git add -A`（排除 vendor 和 dist） + `git commit` | M-01 到 M-24 | 低 |

---

### 3.3 冲突合并策略

迁移过程中，以下三个区域存在双仓内容并存的情况，需要明确的合并策略：

#### 3.3.1 `longrun/workspaces/` 合并

**冲突类型**：目录命名和层级存在差异。

- `openclawNative/longrun/` 包含：`workspaces/openclaw-native/`、`workspaces/demo-longrun/`，以及 `METHOD.md`、`METHOD.zh-CN.md`、`CHECKLIST.md`、`README.md`、`scripts/`、`templates/` 等框架文件。
- `opensparrow_win/feishu-source/longrun/` 仅包含：`workspaces/openclaw-usb-portable/`，无框架文件。

**合并策略**：以 `openclawNative/longrun/` 的框架结构为骨架，将 `openclaw-usb-portable/` 作为新的子工作区插入 `workspaces/` 目录。框架文件（`METHOD.md` 等）无冲突，直接保留。

**手动审阅需求**：无需人工内容合并，仅需确认 `openclaw-usb-portable/` 下的 `execution/` 子目录中的 docs 路径引用在新结构中仍然有效。

#### 3.3.2 `.specify/memory/constitution.md` 合并

**冲突类型**：两份 `constitution.md` 文件的内容视角不同。

- `openclawNative/.specify/memory/constitution.md`：以多平台运行时分发为视角，聚焦三平台 companion 脚本的规范。
- `opensparrow_win/feishu-source/.specify/memory/constitution.md`：以 USB 可移植部署为视角，聚焦 install-local-feishu.sh 的安装约束。

**合并策略**：
1. **不自动覆盖**，两份文件内容均须保留。
2. 合并后的 `constitution.md` 应包含两个明确命名的章节：`## 平台运行时规范（来源：openclawNative）` 和 `## USB 可移植部署规范（来源：opensparrow）`。
3. 如两份文件对同一约束有相互冲突的描述（例如对脚本换行符的要求），以 `opensparrow` 版本为准，因其更新且经过实际安装验证。

**手动审阅需求**：必须人工对比两份文件后合并，不可自动化。

#### 3.3.3 `AGENTS.md` 合并

**冲突类型**：两份 `AGENTS.md` 描述的是同一系统的不同操作维度。

- `openclawNative/AGENTS.md`：描述多平台运行时维护的 agent 工作流（三平台 companion 脚本的编辑、测试规范）。
- `opensparrow_win/feishu-source/AGENTS.md`：描述 USB 部署安装流程的 agent 工作流（install-local-feishu.sh 的调用约定、测试方法）。

**合并策略**：
1. 统一仓的 `AGENTS.md` 作为顶层入口文件，增加章节导航，引导 agent 根据任务类型查阅对应章节。
2. `openclawNative/AGENTS.md` 内容整体纳入新章节：`## Platform Runtime Maintenance`。
3. `opensparrow_win/feishu-source/AGENTS.md` 内容整体纳入新章节：`## USB Portable Deployment`。
4. 顶层增加 `## Quick Reference` 章节，提供两种任务类型的入口速查。

**手动审阅需求**：内容合并后需要一次完整的人工审阅，确保章节间无互相矛盾的指令。

#### 3.3.4 `.codex/` 合并

**冲突类型**：目前仅 `openclawNative/.codex/prompts/` 目录有内容，`opensparrow_win/feishu-source/` 未发现独立 `.codex/` 目录（如有，路径为 `opensparrow_win/.codex/`，需检查）。

**合并策略**：直接使用 `openclawNative/.codex/` 作为统一仓的 `.codex/`，迁移前执行一次 diff 确认无遗漏。

**手动审阅需求**：低，一次 diff 确认即可。

---

## 4. 仓库承载决策

### 4.1 方案 A：改造 openclawNative 为统一仓

将 `openclawNative/` 目录原地改造为统一仓，在其中执行 `git init`，并将 `opensparrow_win/feishu-source/` 中的 source-of-truth 内容迁移进来。

**优势**

- 已具备三平台目录结构（`linux-*/`、`mac-*/`、`windows-*/`），与统一仓目标结构高度吻合。
- 已有完整的持久化开发骨架：`longrun/`（含框架文件和两个工作区）、`.specify/`、`.codex/`、`AGENTS.md`、`docs/`、`scripts/`，无需从零建立。
- 尚未初始化 git 反而是优势：可在第一次 commit 时就设置好 `.gitattributes`，确保所有历史 commit 的换行符和权限都是干净的。
- 迁移路径中的"移动"操作（M-04 到 M-08）可使用 `git mv`，天然保留文件来源记录。
- Windows 命名偏差（`opensparrow_win`）比 "Native" 更具误导性，因为该仓实际上是跨平台的。

**劣势**

- "openclawNative" 这个名字可能让新成员误以为该仓仅包含 native 运行时内容，而忽略 USB 部署、specs、skills 等高层内容。
- 如果将来项目规模扩大，该名字可能需要再次更名。

### 4.2 方案 B：新建中性仓（如 openclaw-source）

在 `/Users/eduardogan/Desktop/GHJProject/openclaw-source/`（或类似路径）新建一个空仓，从两个现有仓分别迁移所有 source-of-truth 资产。

**优势**

- 仓库名称中性，不携带历史包袱。
- 目录结构完全按统一仓目标结构规划，无需绕过现有布局。

**劣势**

- 需要将 `openclawNative` 的 27 组 source-of-truth 资产**全部复制**到新仓，而方案 A 中 openclawNative 自身的内容只需重新组织，不需要跨仓复制。
- 总迁移工作量增加约 30%（多出一个"全量复制 openclawNative"的步骤）。
- 不保留任何文件的 git 历史（因为 openclawNative 当前也无 git 历史，这一点与方案 A 持平）。
- opensparrow_win 是 git 仓库，如需保留其 commit 历史，方案 B 需要额外的 `git filter-repo` 操作。

### 4.3 推荐：采用方案 A

**推荐结论**：将 `openclawNative` 改造为统一仓。

**主要理由如下**：

**理由一：结构契合度最高。** `openclawNative` 已有 `linux-*/`、`mac-*/`、`windows-*/` 三平台结构，与目标统一仓的 `platforms/{linux,mac,windows}/` 层级只差一次 `git mv` 重命名，迁移成本最低。

**理由二：持久化骨架完整。** `longrun/`（含 `METHOD.md`、`CHECKLIST.md` 等框架文件）、`.specify/`、`.codex/` 都已存在，这些文件在方案 B 中需要从零建立或从 openclawNative 复制。方案 A 直接复用。

**理由三："不是 git 仓库"是净优势。** 从零初始化 git 意味着第一次 commit 可以用最干净的 `.gitattributes` 和 `.gitignore`，不存在历史 commit 中换行符混乱的遗留问题。这比从一个已有数百次 commit 的仓库中抹除历史更简单。

**理由四：名称问题可以解决。** "Native" 可以重新解读为"原生多平台支持"（native multi-platform support），而非"仅包含 native 运行时"。如果未来团队认为名称确实造成困惑，可在统一仓稳定后再做一次仓库重命名，代价远低于方案 B 的额外迁移工作量。

**理由五：避免命名误导的对比。** `opensparrow_win` 中的 `_win` 后缀本身就是历史遗留的命名误导（该目录实际上包含 macOS 内容），将其作为统一仓基础反而会放大命名混乱。

**执行前提**：采用方案 A 的前提是团队确认 `openclawNative/` 目录本身不存在未备份的临时文件或本地配置。确认后执行 M-01（`git init`）即可开始迁移。

---

## 5. `.gitattributes` 初始模板

以下模板应在 M-02 步骤中作为第一个提交的文件写入 `unified-repo/.gitattributes`。核心原则：Unix 脚本强制 LF，Windows 脚本强制 CRLF，二进制文件标记为 binary 防止换行符转换损坏。

```gitattributes
# Default: auto-detect text files and normalize line endings
* text=auto

# Unix scripts - always LF regardless of platform
*.sh        text eol=lf
*.bash      text eol=lf
*.command   text eol=lf

# Windows scripts - always CRLF
*.bat       text eol=crlf
*.cmd       text eol=crlf
*.ps1       text eol=crlf

# Web/Node.js source files - LF
*.mjs       text eol=lf
*.js        text eol=lf
*.ts        text eol=lf
*.json      text eol=lf
*.html      text eol=lf
*.css       text eol=lf

# Documentation
*.md        text eol=lf
*.txt       text eol=lf

# Config files
*.yaml      text eol=lf
*.yml       text eol=lf
*.toml      text eol=lf
.gitignore  text eol=lf

# Binary files - no conversion
*.exe       binary
*.node      binary
*.png       binary
*.jpg       binary
*.jpeg      binary
*.ico       binary
*.tar.gz    binary
*.tar.bz2   binary
*.zip       binary
*.dmg       binary
*.pkg       binary
*.msi       binary

# Explicitly mark macOS companion executables as text with LF
# (they have no extension but are shell scripts)
platforms/mac/companion/gateway        text eol=lf
platforms/mac/companion/onboard        text eol=lf
platforms/mac/companion/pairing-feishu text eol=lf
platforms/mac/companion/start          text eol=lf
platforms/mac/companion/stop           text eol=lf

# Large vendored runtime files (if not using Git LFS)
# vendor/windows-openclaw/**  binary
# vendor/linux-openclaw/**    binary
# vendor/mac-openclaw/**      binary

# Git LFS tracking (uncomment if using LFS for vendor binaries)
# vendor/**                   filter=lfs diff=lfs merge=lfs -text
```

> **注意**：macOS companion 脚本无文件扩展名，必须用完整路径在 `.gitattributes` 中单独声明换行符规则，否则 `text=auto` 可能将其误判。这是 M-05 步骤中"中风险"的具体来源。

---

## 6. `.gitignore` 统一模板

以下模板应在 M-03 步骤中写入 `unified-repo/.gitignore`。

```gitignore
# =============================================
# OS artifacts
# =============================================
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
desktop.ini

# =============================================
# Credentials and secrets
# =============================================
.codex/auth.json
.codex/config.toml
*.env
.env.*
!.env.example
*.key
*.pem
*.p12
*.pfx

# =============================================
# Generated outputs - never commit these
# =============================================
dist/
dist/usb-pack/
dist/handoff/

# =============================================
# Node.js
# =============================================
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# =============================================
# Vendor runtime binaries (large files)
# If using Git LFS, remove these ignores and
# add LFS tracking in .gitattributes instead
# =============================================
# vendor/windows-openclaw/
# vendor/linux-openclaw/
# vendor/mac-openclaw/
# Uncomment above lines if NOT using Git LFS

# =============================================
# Temporary and editor files
# =============================================
*.tmp
*.log
*.swp
*.swo
*~
.vscode/settings.json
.idea/

# =============================================
# Longrun workspace runtime state
# (keep structure, ignore generated state)
# =============================================
longrun/workspaces/*/claude-progress.txt
```

> **注意**：`longrun/workspaces/*/claude-progress.txt` 被忽略，因为该文件是 agent 运行时自动生成的状态记录，不应提交至 git。`app_spec.md`、`feature_list.json`、`init.sh` 则应正常提交。

---

## 7. 下一步行动清单

以下行动项按优先级排序，建议在本文档通过团队评审后按序执行。

1. **团队评审本文档**：确认边界冻结表的分类是否准确，特别是 `usb-pack/windows/` 和 `usb-pack/mac/` 的"混合"分类中，哪些文件属于 source、哪些属于 generated 的判断是否与实际构建流程一致。

2. **确认统一仓选型**：正式确认采用方案 A（改造 `openclawNative`）或方案 B（新建 `openclaw-source`）。如选方案 A，确认 `openclawNative/` 目录中不存在未备份的本地临时文件。

3. **决定 vendor 二进制策略**：在执行 M-07 之前，决定 `vendor/` 目录下三个运行时包（总计 91MB+ 仅 Windows 包）是否使用 Git LFS，并相应更新 `.gitattributes` 和 `.gitignore` 模板。

4. **执行 M-01 至 M-03**（基础初始化）：在 `openclawNative/` 中执行 `git init`，写入 `.gitattributes` 和 `.gitignore`，完成第一次空结构 commit。此步骤不可逆，执行前再次确认选型决策。

5. **执行 M-04 至 M-08**（openclawNative 内部重组）：将现有目录重组为统一仓目标结构，使用 `git mv` 保留操作记录。此阶段不引入外部文件，风险最低。

6. **执行 M-09 至 M-17**（opensparrow source-of-truth 迁入）：将 `feishu-source/` 中的所有 source-of-truth 资产复制到统一仓。此阶段不删除 opensparrow 中的原始文件，双仓并行存在直到验证完成。

7. **执行 M-18 至 M-19**（人工合并 `.specify/` 和 `AGENTS.md`）：按 3.3 节的合并策略，人工合并两份 `constitution.md` 和两份 `AGENTS.md`。此步骤需要最长的人工投入时间，建议单独安排评审会议。

8. **执行 M-20 至 M-21**（文档迁移和路径引用更新）：迁移 `usb-pack/docs/` 和 `runbooks/`，然后全仓扫描路径硬编码并逐一修正。建议使用 `grep -r "linux-配套文件\|mac-配套使用文件\|windows-配套文件\|feishu-source" .` 定位所有需要更新的引用。

9. **执行 M-22 至 M-23**（平台验证）：在 macOS 和 Windows 上分别运行冒烟测试，确认 companion 脚本和 wrapper 脚本在新路径下正常工作。这是整个迁移中风险最高的步骤，建议预留足够的测试时间。

10. **执行 M-24**（归档历史快照）：将 `openclaw-usb-feishu-delivery/`、`_push_opensparrow_win/` 压缩归档，移出工作目录。归档前确认这些目录中没有尚未迁移的 source-of-truth 内容。

11. **执行 M-25**（初始 commit）：完成统一仓的第一次完整 git commit，提交信息应包含本文档编号（`BCM-20260323`）以便追溯。

12. **更新 `AGENTS.md` 和 `constitution.md`**：根据合并后的新结构，更新 Agent 使用指南中的路径示例和操作说明，确保新成员可以按 `AGENTS.md` 的指引直接在统一仓中工作。

13. **更新 `longrun/workspaces/openclaw-native/app_spec.md`**：修订 openclaw-native 工作区的 app spec，使其反映统一仓新结构（原 `openclawNative/` 顶层结构已变更为 `platforms/{linux,mac,windows}/`）。

14. **验证 `feishu-source/longrun/` execution docs 路径**：确认 `openclaw-usb-portable/execution/docs/` 下的现有文档（包括本文档）中的所有路径引用在新的 `unified-repo/longrun/workspaces/openclaw-usb-portable/` 层级下仍然有效。

15. **进入 plan.md Phase 3+**（容器化基线）：统一仓验证稳定后，在 `deploy/docker/` 下开始容器化工作，此时 `scripts/openclaw-usb/install-local-feishu.sh` 将作为容器构建的基础脚本，路径已在统一仓中固定。

---

## 附录 A：边界冻结声明

本文档签发之日（2026-03-23）起，以下边界正式冻结：

1. `opensparrow_win/usb-pack/` 下的任何文件被视为**生成产物**，不得直接编辑。所有对 USB 包内容的修改必须先修改 `feishu-source/` 中对应的 source-of-truth 文件，再通过构建脚本重新生成。

2. `openclaw-usb-feishu-delivery/`、`_push_opensparrow_win/` 下的所有文件被视为**历史归档**，不得向其写入任何新内容。

3. `openclawNative/{linux,mac,windows}-openclaw/` 下的运行时二进制文件被视为 **vendor 只读内容**，不得在本项目中修改。

4. 所有新功能的开发和文档，**必须在 `feishu-source/` 或（迁移完成后）统一仓的 source-of-truth 目录中**进行，不得在任何 generated output 或 historical snapshot 目录中进行。

---

## 附录 B：术语表

| 术语 | 定义 |
|------|------|
| **unified-repo** | 本文档规划的统一真实源仓库，暂定由 openclawNative 改造而来 |
| **source-of-truth** | 真实源，所有改动的发生地点 |
| **generated output** | 由构建脚本从 source-of-truth 派生的产物，不独立维护 |
| **vendor** | 外部提供的二进制包，不在本项目中修改 |
| **historical snapshot** | 已被更新版本取代的历史存档，不再同步 |
| **feishu-source** | `opensparrow_win/feishu-source/` 的简称，是 opensparrow 仓中的 source-of-truth 根目录 |
| **companion 脚本** | `{linux,mac,windows}-配套文件/` 下的平台操作脚本，提供给最终用户使用 |
| **wrapper 脚本** | `usb-pack/{windows,mac}/` 下的入口包装脚本，用于 USB 部署场景的启动 |
| **longrun workspace** | `longrun/workspaces/` 下的持久化开发工作区，每个功能一个工作区 |
| **boundary freeze** | 边界冻结，声明每个目录/文件的分类不再变更 |
| **migration matrix** | 迁移矩阵，从当前状态到目标状态的步骤映射表 |

---

*文档结束*

*本文档由 Claude Code（claude-sonnet-4-6）根据 openclawNative 和 opensparrow 两仓的实际目录结构分析生成，作为统一仓迁移工作的决策基础文件。执行前请完整阅读并通过团队评审。*

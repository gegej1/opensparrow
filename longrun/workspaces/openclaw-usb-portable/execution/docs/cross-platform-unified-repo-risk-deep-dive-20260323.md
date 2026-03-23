# 跨平台统一仓风险深潜调研 (2026-03-23)

---

## 1. 调研背景与目标

### 1.1 背景

当前 OpenClaw / OpenSparrow 项目的源代码分散在两个独立仓库中：

- **openclawNative**：多平台运行时核心，包含 macOS 与 Windows 的 bundled runtime、Node.js 应用主体、容器化基线。
- **opensparrow_win/feishu-source**：飞书渠道的部署脚本、配置契约、USB 便携式交付包、longrun 工作区。

两仓分离的历史成因是平台特化需求各自演进，但随着共享逻辑增多，双仓维护的摩擦成本持续上升：配置契约改动需要在两处同步、health/probe/smoke 验证标准容易漂移、CI/CD 无法统一。

### 1.2 已有结论（本次调研的前提）

前一份风险评估文档（`cross-platform-unification-risk-assessment-20260323.md`）已经得出以下结论，本次调研以此为起点，不重复论证：

1. 统一真源仓技术上可行，不会天然引入不可控风险。
2. 入口脚本（`.command` / `.cmd` / `.ps1`）**不应被强行统一**，应保留为平台适配层。
3. 真正需要统一的是：specs、longrun、配置契约、渠道契约、构建规则、容器化基线。

### 1.3 本次调研目标

**核心问题**：在官方文档、社区 RFC 和工程实践层面，上述统一仓方案是否存在任何**不可控的阻断性障碍**？

具体调研维度：

- Git 多平台协作机制（换行符、权限位、二进制检测）
- GitHub Actions 跨平台 CI/CD 矩阵
- Docker Desktop 跨平台差异（挂载、权限、网络）
- Node.js 跨平台路径与 optionalDependencies 机制
- USB 可移动介质的文件系统限制（exFAT/FAT32）
- PowerShell 与 Bash 共存的官方支持边界

---

## 2. 调研方法

本次调研严格基于一手文献，不依赖推断或经验假设。信息来源分为以下四类：

### 2.1 官方技术文档

- **Git 官方文档**：`git-scm.com/docs`，涵盖 `.gitattributes`、`update-index`、`add --renormalize` 的规范行为。
- **GitHub Docs**：`docs.github.com`，涵盖 GitHub Actions `strategy.matrix`、`runs-on` 矩阵、Actions 环境变量差异。
- **Docker 官方文档**：`docs.docker.com`，涵盖 Docker Desktop for Mac（VirtioFS）、Docker Desktop for Windows（WSL2 backend）、bind mount 性能、UID/GID 映射、host networking。
- **Node.js 官方文档**：`nodejs.org/api/path.html`，涵盖 `path.join`、`path.resolve`、`path.posix`、`path.win32` 的跨平台语义。
- **Microsoft Learn**：`learn.microsoft.com`，涵盖 PowerShell 与 Unix shell 共存、MAX_PATH 限制、Windows 文件名字符限制、exFAT 规范。

### 2.2 GitHub Issue 与 RFC 追踪

- **docker/roadmap#238**：`--network host` 在 Mac/Windows 上的支持历史与当前状态。
- **nodejs/node#50753**：Node.js 在 Windows 长路径（LongPathsEnabled）下的行为记录。

### 2.3 主流工程项目博客

- **esbuild 发布说明**：`esbuild.github.io/faq`，`optionalDependencies` 作为跨平台 native binary 分发的事实标准来源。
- **SWC 项目文档**：`swc.rs/docs`，同上。
- **Sentry Engineering Blog**：Sentry 工程团队关于 native addon 跨平台分发的实践记录。

### 2.4 文件系统规范文献

- **Microsoft exFAT 规范**：`learn.microsoft.com/en-us/windows/win32/fileio/exfat-specification`。
- **Microsoft 文件名命名约定**：`learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file`。

---

## 3. 风险清单（按可控性分类）

### 3.1 完全可控风险（有成熟解决方案）

以下风险均有官方文档明确记载的解决方案，落地成本可预估，不存在灰色地带。

---

#### 风险 1：换行符 CRLF/LF 漂移

**问题描述**

Git 在跨平台 clone 时，默认的 `core.autocrlf` 行为因开发者本地配置而异。若未统一，同一份 `.sh` 文件可能在 Mac 上以 LF 结尾、在 Windows 上以 CRLF 结尾，导致 Bash 脚本执行时出现 `\r: command not found` 错误；反过来，`.ps1` 文件若以 LF 结尾，PowerShell 5.1 在某些版本下会产生解析警告。

**官方文档依据**

- Git `.gitattributes` 文档：`https://git-scm.com/docs/gitattributes`
- GitHub 关于换行符的官方建议：`https://docs.github.com/en/get-started/getting-started-with-git/configuring-git-to-handle-line-endings`

**推荐解决方案**

在仓库根目录添加 `.gitattributes`：

```
# 默认：所有文本文件自动规范化
* text=auto

# Shell 脚本强制 LF（必须，否则 macOS/Linux 执行报错）
*.sh    text eol=lf
*.command text eol=lf

# PowerShell / Windows 批处理强制 CRLF
*.ps1   text eol=crlf
*.cmd   text eol=crlf
*.bat   text eol=crlf

# 二进制文件不做转换（见风险 3）
*.exe   binary
*.png   binary
*.jpg   binary
*.gz    binary
*.zip   binary
```

添加后执行一次规范化：

```bash
git add --renormalize .
git commit -m "chore: normalize line endings via .gitattributes"
```

**落地成本评估**

低。一次性操作，之后由 Git 自动维护。新加文件只需按扩展名命名规范放置即可。

---

#### 风险 2：可执行权限位丢失

**问题描述**

Git 的对象模型只记录两种权限位：`100644`（普通文件）和 `100755`（可执行文件）。若 `.sh` 或 `.command` 文件在 Windows 上被 clone 或编辑后 re-add，权限位可能被重置为 `100644`，导致 macOS 用户 clone 后无法直接双击运行 `.command` 文件。

**官方文档依据**

- Git `update-index` 文档：`https://git-scm.com/docs/git-update-index`

**推荐解决方案**

对需要可执行权限的文件，显式设置 Git 权限位：

```bash
git update-index --chmod=+x platforms/mac/run-openclaw-usb.command
git update-index --chmod=+x platforms/mac/01-开始部署.command
git update-index --chmod=+x scripts/shared/*.sh
```

Windows 平台 clone 后会忽略此位（因为 Windows 不使用 Unix 权限模型），不会产生副作用。macOS/Linux clone 后文件将保持 `755`。

**落地成本评估**

低。每个需要可执行权限的文件执行一次，之后权限位随 Git 对象永久保存。

---

#### 风险 3：二进制文件被误检测为文本并转换换行符

**问题描述**

Git 的 `text=auto` 模式通过启发式算法判断文件是否为文本。对于某些二进制文件（如小型 `.exe`、未压缩的 `.json` 数据文件、包含大量 ASCII 的 `.bin`），Git 可能误判为文本并尝试转换换行符，导致文件损坏。

**官方文档依据**

- Git `.gitattributes` 中 `binary` 属性的说明：`https://git-scm.com/docs/gitattributes`

**推荐解决方案**

在 `.gitattributes` 中对所有已知二进制类型显式标记：

```
*.exe    binary
*.dll    binary
*.node   binary
*.png    binary
*.jpg    binary
*.jpeg   binary
*.gif    binary
*.ico    binary
*.gz     binary
*.tar    binary
*.zip    binary
*.7z     binary
*.pdf    binary
```

**落地成本评估**

低。一次性配置，维护成本接近零。

---

#### 风险 4：PowerShell 与 Bash 脚本在同一仓库共存

**问题描述**

部分开发者对"一个仓库里同时存在 `.sh` 和 `.ps1`"有直觉上的抵触，担心两者在 CI/CD 或本地调试中相互干扰，或导致"哪个脚本是权威版本"的混乱。

**官方文档依据**

- Microsoft Learn 关于 PowerShell 与 Unix Shell 共存的官方说明：`https://learn.microsoft.com/en-us/powershell/scripting/install/installing-powershell-on-macos`
- Microsoft 明确支持 PowerShell 7+ 在 macOS/Linux 上运行，同时明确 Windows PowerShell 5.1 不需要与 Bash 互操作。

**推荐解决方案**

维持平行的平台脚本层，不强求统一语言：

```
platforms/
  mac/
    run-openclaw-usb.command   # Bash，macOS 专用
    01-开始部署.command
  windows/
    run-openclaw-usb.cmd       # 调用 PowerShell，Windows 专用
    one-click-deploy.cmd
```

共享业务逻辑抽回 `shared/` 层（JSON 配置契约、Node.js 脚本），各平台 wrapper 只负责平台特化的用户交互和入口引导。

**落地成本评估**

低。这是本项目已有的目录结构意图，只需显式固化边界即可。

---

#### 风险 5：GitHub Actions 跨平台 CI/CD 矩阵配置

**问题描述**

若 CI/CD 流水线只在一个平台上运行测试，跨平台 bug 将在生产交付时才暴露。需要在 macOS、Windows、Linux 三个平台上验证构建和测试。

**官方文档依据**

- GitHub Actions `strategy.matrix` 文档：`https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/running-variations-of-jobs-in-a-workflow`

**推荐解决方案**

在 GitHub Actions workflow 中使用矩阵策略：

```yaml
jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: npm test
```

对于平台特化步骤，可使用条件表达式：

```yaml
- name: Run Mac-specific checks
  if: runner.os == 'macOS'
  run: bash platforms/mac/verify.sh

- name: Run Windows-specific checks
  if: runner.os == 'Windows'
  run: powershell platforms/windows/verify.ps1
```

**落地成本评估**

低到中。需要为每个平台准备对应的测试脚本入口，但核心业务逻辑测试可以在所有平台上共享同一份 `npm test`。

---

#### 风险 6：路径分隔符差异（`/` vs `\`）

**问题描述**

Bash 脚本使用 `/` 作为路径分隔符；Windows 原生路径使用 `\`；PowerShell 在大多数情况下接受两者，但部分 cmdlet 或第三方工具仅接受 `\`。Node.js 内联代码若硬编码路径字符串会产生跨平台问题。

**官方文档依据**

- Node.js `path` 模块文档：`https://nodejs.org/api/path.html`
- 文档明确说明：`path.join()` 和 `path.resolve()` 在 Windows 上返回 `\` 分隔的路径，在 POSIX 上返回 `/` 分隔的路径。`path.posix` 和 `path.win32` 允许显式指定平台行为。

**推荐解决方案**

- **Node.js 代码**：始终使用 `path.join()`、`path.resolve()`，禁止字符串拼接路径。
- **Bash 脚本**：始终使用 `/`，不需要处理 `\`。
- **PowerShell 脚本**：使用 `Join-Path` cmdlet 或 `[System.IO.Path]::Combine()`，避免硬编码分隔符。
- **配置文件**：JSON/YAML 中的路径统一使用 `/`（Windows 路径在 Node.js 处理时会自动映射）。

**落地成本评估**

低。主要是编码规范问题，可通过 lint 规则（如 ESLint `no-path-concat` 规则或 custom rule）在 CI 中强制。

---

#### 风险 7：Docker bind mount 在 macOS 上的 I/O 性能

**问题描述**

Docker 在 macOS 上使用虚拟化层（Docker Desktop for Mac 使用 Apple Hypervisor + VirtioFS），bind mount 的宿主目录 I/O 性能低于 Linux 原生。`node_modules` 目录包含大量小文件，若通过 bind mount 挂载，`npm install` 速度可慢 5-10 倍。

**官方文档依据**

- Docker Desktop for Mac 文件共享性能说明：`https://docs.docker.com/desktop/mac/performance/`
- Docker Desktop VirtioFS 说明（Docker Desktop 4.6+）：`https://docs.docker.com/desktop/release-notes/`

**推荐解决方案**

对高 I/O 目录（尤其是 `node_modules`）使用 named volume，而非 bind mount：

```yaml
# docker-compose.yml
services:
  openclaw:
    volumes:
      - .:/app                    # bind mount 源代码（读写不频繁）
      - node_modules:/app/node_modules  # named volume 隔离 node_modules

volumes:
  node_modules:
```

macOS 上 Docker Desktop 4.6+ 默认启用 VirtioFS，比旧版 gRPC FUSE 快约 1.5-2 倍，但对于 `node_modules` 这类场景，named volume 仍是推荐方案。

**落地成本评估**

低。修改 `docker-compose.yml` 即可，不影响应用逻辑。

---

#### 风险 8：Docker 容器内 UID/GID 权限不匹配

**问题描述**

Docker 容器默认以 `root`（UID 0）运行，bind mount 的文件归属可能与宿主用户冲突。macOS 的 VirtioFS 会透明地进行 UID 重映射（对开发者透明，但可能掩盖权限 bug）；Windows WSL2 backend 不做同等的重映射，可能导致容器写入的文件在宿主上属于 root，宿主用户无法删除。

**官方文档依据**

- Docker 关于用户权限与 bind mount 的说明：`https://docs.docker.com/engine/reference/run/#user`
- Docker Desktop for Mac UID 映射行为：`https://docs.docker.com/desktop/mac/`

**推荐解决方案**

在 `Dockerfile` 中显式创建非 root 用户，并在 entrypoint 脚本中使用 `gosu` 或 `su-exec` 处理 UID 映射：

```dockerfile
FROM node:20-slim

# 创建与宿主匹配的用户（构建时可通过 ARG 传入）
ARG UID=1000
ARG GID=1000
RUN groupadd -g ${GID} openclaw && \
    useradd -u ${UID} -g openclaw -m openclaw

USER openclaw
WORKDIR /app
```

或者在 entrypoint 中动态处理：

```bash
#!/bin/sh
# entrypoint.sh
HOST_UID=${HOST_UID:-1000}
HOST_GID=${HOST_GID:-1000}
groupmod -g ${HOST_GID} openclaw 2>/dev/null || true
usermod -u ${HOST_UID} openclaw 2>/dev/null || true
exec gosu openclaw "$@"
```

**落地成本评估**

中。需要修改 Dockerfile 和 entrypoint，并在 `docker-compose.yml` 中传入 `UID`/`GID` 环境变量。对于 USB 便携式场景，UID 可固定为约定值（如 1000），减少动态处理复杂度。

---

#### 风险 9：npm optionalDependencies 平台原生二进制管理

**问题描述**

OpenClaw 的 Node.js 依赖可能包含带有原生 addon 的包（如 `@swc/core`、`esbuild`、`@sentry/node`）。这些包在不同平台上对应不同的 native binary。若直接复制 `node_modules` 到另一平台，或在共享目录中混用不同平台安装的 `node_modules`，会导致运行时错误。

**官方文档依据**

- npm `optionalDependencies` 文档：`https://docs.npmjs.com/cli/v10/configuring-npm/package-json#optionaldependencies`
- esbuild 关于跨平台安装的说明（optionalDependencies 事实标准来源）：`https://esbuild.github.io/getting-started/#download-using-npm`
- SWC 跨平台 binary 分发说明：`https://swc.rs/docs/getting-started`

**推荐解决方案**

- **永远不要跨平台复制 `node_modules`**。这是 npm/yarn/pnpm 生态的铁则，任何主流工具链都不支持此操作。
- 每个平台独立执行 `npm install`，让 npm 根据当前平台的 `os`/`cpu` 字段自动选择正确的 optional binary。
- USB 便携式场景中，针对每个目标平台独立打包一份完整的 `node_modules`（或使用 `npm pack` + 离线 install 流程）。
- 若需要在 Docker 镜像中提前安装，在对应平台的 runner 上构建镜像，不要在 Linux runner 上构建后直接用于 macOS/Windows。

**落地成本评估**

低（前提是不走跨平台复制 node_modules 的错误路径）。正确的流程本身就是各平台独立 install，这与 npm 的设计意图完全一致。

---

#### 风险 10：USB 设备文件名字符限制（exFAT/FAT32）

**问题描述**

USB 便携式交付包存储在 exFAT 或 FAT32 格式的 U 盘上。这两种文件系统对文件名的限制比 APFS（macOS）和 NTFS（Windows）更严格，不支持以下字符：`\ / : * ? " < > |`，且 FAT32 还有文件名长度（255 字节）限制。若仓库中的文件名包含上述字符（即使在 APFS/NTFS 上合法），拷贝到 USB 时会失败。

**官方文档依据**

- Microsoft exFAT 文件命名约定：`https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file`
- Microsoft exFAT 规范：`https://learn.microsoft.com/en-us/windows/win32/fileio/exfat-specification`

**推荐解决方案**

验证规则：以 Windows/exFAT 的超集限制作为统一标准（即使目标是 macOS，也按最严格的 exFAT 规则命名）。

具体要求：
- 禁止文件名包含：`\ / : * ? " < > |`
- 禁止文件名以 `.` 或空格结尾
- 单个文件名不超过 255 字节
- 全路径（从 USB 根目录起算）不超过 200 字符（留余量，见风险 12 的 MAX_PATH 问题）

可在 CI 中加入文件名合规检查脚本，拦截不合规的文件名在合并前进入仓库。

**落地成本评估**

低。主要是命名规范约束，现有文件名需做一次性审查。

---

#### 风险 11：USB 介质上可执行权限丢失

**问题描述**

exFAT 和 FAT32 文件系统不支持 Unix 权限位。将 `.command` 或 `.sh` 文件拷贝到 exFAT U 盘后，文件在 macOS 上 mount 时会失去 `755` 权限，用户双击 `.command` 文件时会收到"权限不足"错误。

**官方文档依据**

- 此行为是 exFAT/FAT32 的规范限制，macOS Finder 文档及 Apple 开发者文档均有说明：`https://developer.apple.com/library/archive/documentation/FileManagement/Conceptual/FileSystemProgrammingGuide/FileSystemOverview/FileSystemOverview.html`

**推荐解决方案**

Mac 端的 USB 启动器（最外层 `.command` 文件）需要在运行时自我修复权限，或通过一个中间层（如一个有 AppleScript 包装的 `.app` bundle）来绕过权限问题。

实际可行方案：在 USB 根目录放一个 `启动.command`，其内容第一行就是：

```bash
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
chmod +x "${SCRIPT_DIR}/platforms/mac/"*.command
chmod +x "${SCRIPT_DIR}/scripts/"*.sh
exec "${SCRIPT_DIR}/platforms/mac/run-openclaw-usb.command"
```

该文件本身在首次 `chmod +x` 失败时，用户需要手动在 Terminal 中执行一次。可在 USB 根目录的 `README.txt` 中提供明确说明。

**落地成本评估**

低。已知限制，有成熟的用户操作规避路径。需要在交付文档中写明"首次使用需在 Terminal 执行一次 chmod"。

---

### 3.2 部分可控风险（需持续关注）

以下风险有已知的缓解方案，但存在平台不对称性或依赖外部环境条件，需要在项目生命周期内持续关注。

---

#### 风险 12：Docker `--network host` 在 Mac/Windows 上的受限行为

**问题描述**

Linux 上 `--network host` 让容器直接共享宿主网络栈，可以绑定宿主上的任意端口，并访问宿主上监听的所有服务（如 localhost:3000）。

macOS 和 Windows 上，Docker Desktop 运行在一个轻量虚拟机（HyperKit/Hyper-V）中。`--network host` 实际上是容器共享该 VM 的网络，而非宿主机网络。以下行为与 Linux 不同：

- 容器无法直接访问宿主机上运行的服务（需改用 `host.docker.internal`）。
- Docker Desktop 4.34+ 增加了 Layer 4 (TCP/UDP) 级别的 host networking 支持，但 Layer 3 及以下（ICMP、raw socket）仍被 VM 隔离阻断。

**官方文档依据**

- Docker Desktop networking 说明：`https://docs.docker.com/desktop/networking/`
- GitHub docker/roadmap#238（`--network host` macOS/Windows 支持演进）：`https://github.com/docker/roadmap/issues/238`

**当前状态**

Docker Desktop 4.34（2024 年发布）开始在 macOS 和 Windows 上支持 `--network host` 的 TCP/UDP 层，但仍不支持 ICMP 和 raw socket。对于 OpenClaw 这类 HTTP/WebSocket 应用，TCP 层支持已经足够。

**缓解方案**

- 在 `docker-compose.yml` 中对 host networking 场景提供两种配置：
  - **Linux**：`network_mode: host`
  - **macOS/Windows**：使用 `extra_hosts: ["host.docker.internal:host-gateway"]` 代替
- 在 README 和 runbook 中明确说明此差异。
- 对 Docker Desktop 版本设置最低要求（推荐 4.34+）。

**持续关注原因**

Docker Desktop 版本要求增加了对用户环境的依赖，在 USB 便携式场景中尤为敏感（用户机器上的 Docker Desktop 版本不可控）。需要在 USB 交付包的前置检查脚本中加入 Docker Desktop 版本检测。

---

#### 风险 13：Windows MAX_PATH 260 字符路径长度限制

**问题描述**

Windows 默认的 MAX_PATH 限制为 260 个字符（含驱动器字母、路径分隔符和 null 终止符）。`node_modules` 的深层嵌套路径（尤其是旧版 npm 的非扁平化 node_modules 或某些依赖链较深的包）容易超出此限制，导致 `npm install`、文件复制或构建过程中出现 `ENAMETOOLONG` 或 `ERROR_PATH_NOT_FOUND` 错误。

USB 便携式场景中，问题更严重：USB 盘符（如 `E:\openclaw-usb-portable\`）本身就消耗了约 30 个字符，剩余路径空间更少。

**官方文档依据**

- Microsoft 关于 MAX_PATH 限制的说明：`https://learn.microsoft.com/en-us/windows/win32/fileio/maximum-file-path-limitation`
- 通过组策略或注册表启用 LongPathsEnabled 的方法：同上
- Node.js issue #50753（Node.js 在 Windows LongPathsEnabled 下的行为）：`https://github.com/nodejs/node/issues/50753`

**当前状态**

Windows 10 1607+ 和 Windows 11 支持通过以下方式解除 MAX_PATH 限制：

1. 组策略：`计算机配置 > 管理模板 > 系统 > 文件系统 > 启用 Win32 长路径`
2. 注册表：`HKLM\SYSTEM\CurrentControlSet\Control\FileSystem\LongPathsEnabled = 1`

但**不能假设目标用户的 Windows 机器已启用此设置**，尤其在企业托管环境中，注册表修改可能受 MDM 策略限制。

**缓解方案**

- 保持目录结构浅层化，控制全路径不超过 200 字符（为 USB 盘符预留至少 60 字符）。
- 在 USB 交付包根目录使用短名称（如 `openclaw` 而非 `openclaw-usb-feishu-delivery`）。
- 在 Windows 安装前置检查脚本中，检测当前路径长度并警告用户。
- 对于 `node_modules` 深层路径问题，使用 npm 7+ 的扁平化 node_modules（默认行为）而非旧版嵌套结构。

**持续关注原因**

不能通过代码层面完全消除此限制（需要用户环境配合）。即使当前路径长度合规，未来新增目录层级或重命名时可能重新触发。需要在 CI 中加入路径长度检查。

---

#### 风险 14：exFAT 无日志（USB 数据完整性）

**问题描述**

exFAT 文件系统没有日志（journaling）机制，不同于 APFS（macOS）、NTFS（Windows）或 ext4（Linux）。这意味着：

- 在写入过程中意外断电或强制拔出 USB，可能导致文件系统损坏或文件内容不完整。
- 损坏可能是静默的（文件存在但内容不完整），而非立即可见的错误。
- FAT32 同样无日志，且存在 4GB 单文件大小限制，对 Docker 镜像文件尤为敏感。

**官方文档依据**

- Microsoft exFAT 规范（无日志段落）：`https://learn.microsoft.com/en-us/windows/win32/fileio/exfat-specification`

**缓解方案**

此风险只能通过操作规范缓解，无法通过代码完全消除：

1. 在 USB 交付包的用户文档中，用醒目格式说明"必须安全弹出 USB 后再拔出"。
2. 交付包内的核心文件（配置、部署脚本）在完成拷贝后由脚本自动验证 checksum（`sha256sum` / `Get-FileHash`）。
3. 对于写入量较大的操作（如首次拷贝 node_modules），在脚本完成后通过 `sync` 命令（macOS/Linux）强制刷新缓冲区。

**持续关注原因**

这是 exFAT 的规范限制，无法通过软件手段从根本上解决。需要依靠用户操作规范作为最后一道防线。

---

#### 风险 15：Docker Synchronized File Shares 的平台不对称

**问题描述**

Docker Desktop for Mac 提供了 "Synchronized File Shares"（Docker Desktop 4.27+，Pro/Team/Business 订阅）功能，可以显著提升 bind mount 的 I/O 性能（接近 Linux 原生速度）。但此功能**仅适用于 macOS**，Windows Docker Desktop（WSL2 backend）没有等效功能，也没有计划表明会为 Windows 推出相同功能。

**官方文档依据**

- Docker Desktop Synchronized File Shares 文档：`https://docs.docker.com/desktop/synchronized-file-sharing/`
- 该文档明确标注"Available on Mac only"（截至 2026-03）。

**缓解方案**

- **不依赖** Synchronized File Shares 作为跨平台 I/O 方案。
- 在两个平台上统一使用 named volume（见风险 7 的解决方案），从架构层面绕过此不对称性。
- 如果某些场景必须使用 bind mount（如源代码热重载），在 macOS runbook 中将 Synchronized File Shares 列为可选的性能优化项，但不作为跨平台必要条件。

**持续关注原因**

此功能的不对称性可能导致开发体验在 macOS 和 Windows 上出现明显差异，进而影响开发者在两个平台上的调试效率。如果后续 Docker 为 Windows 推出等效功能，此风险可自然降级为完全可控。

---

### 3.3 不可控但不构成阻断的限制

经过本次全面调研，**没有发现任何不可控且会阻断统一仓方案的技术限制**。

需要特别说明以下几点，以防止过度解读：

**关于 `--network host` 在 Mac/Windows 的限制**

这是 Docker Desktop 架构决策（VM 隔离），不是 Git 仓库结构或代码组织方式可以影响的。但它不阻断统一仓——它只要求 `docker-compose.yml` 针对不同平台提供不同的网络配置，这本就属于平台适配层的职责范围。

**关于 MAX_PATH 260 字符限制**

这是 Windows 内核的历史遗留限制。它不阻断统一仓，只要求仓库和交付包的目录结构保持足够浅。当前项目的目录深度在合理范围内，只需在设计规范中明确路径长度上限即可。

**关于 exFAT 无日志**

这是物理存储介质的规范约束，任何代码或仓库结构都无法改变。它不阻断统一仓，只影响 USB 交付包的用户操作规范。

**结论**：以上三类"不可控"限制均属于**基础设施层或物理层约束**，不影响统一仓本身的可行性，只对具体的配置文件、目录结构设计和用户操作文档提出要求。

---

## 4. 与现有风险文档的对照

本节将调研结果与 `cross-platform-unification-risk-assessment-20260323.md` 中识别的六类风险逐一比对，确认其可控性判断。

| 原文档风险 | 风险简述 | 本次调研结论 | 关键依据 |
|-----------|---------|------------|---------|
| **风险 A** | 入口脚本双线漂移（`.command` vs `.cmd/.ps1`） | **完全可控** | 已有平台适配层设计，shared 层抽取逻辑可行。不需要统一语言，保留平行 wrapper 即可。 |
| **风险 B** | 运行时目录布局不同（`bin/node` vs `node.exe`） | **完全可控** | 不统一二进制布局，只统一 runtime manifest / build rules，由 packaging 层按平台生成不同目录。 |
| **风险 C** | CRLF/权限位/路径分隔符差异 | **完全可控**（`.gitattributes` 配置后） | Git 官方 `.gitattributes` 文档、`git update-index --chmod=+x` 文档、Node.js `path` 模块文档均提供完整解决方案。 |
| **风险 D** | 宿主服务管理语义不同（`daemon install` 行为差异） | **完全可控** | 将 service manager 交互留在平台 wrapper 层，容器基线不依赖宿主 daemon install 语义。 |
| **风险 E** | 交互输入方式不同（`read -r -p` vs `Read-Host`） | **完全可控** | 不统一交互语法，统一 env 参数契约和非交互模式。各平台 wrapper 保留原生交互体验。 |
| **风险 F** | Docker 平台差异（卷挂载、权限、路径映射） | **部分可控，不阻断** | Docker 官方文档确认 VirtioFS（macOS）和 WSL2（Windows）各自的限制和推荐做法。named volume 策略可统一两平台行为。Synchronized File Shares 的 macOS-only 不对称性需持续关注，但不阻断。 |

**对照小结**：原文档中识别的所有风险，在本次文献调研后均得到确认和细化。原文档的风险等级判断（高/中/低）与本次调研结论一致，没有发现被低估的风险。

本次调研新增了原文档未覆盖的四个风险（风险 9-15 中的部分内容）：

- `optionalDependencies` 平台 binary 管理（风险 9）—— 完全可控
- USB 文件名字符限制（风险 10）—— 完全可控
- USB 可执行权限丢失（风险 11）—— 完全可控
- exFAT 无日志（风险 14）—— 部分可控，不阻断
- Docker Synchronized File Shares 不对称（风险 15）—— 部分可控，不阻断

这些风险均不影响统一仓的总体可行性结论。

---

## 5. 结论

### 5.1 核心结论

**统一真源仓不存在不可控阻断风险。**

经过对 Git、GitHub Actions、Docker、Node.js、Microsoft 官方文档的系统性检索，以及对 docker/roadmap#238、nodejs/node#50753 等工程 issue 的追踪，本次调研未发现任何技术层面的、不可绕过的、会阻止将 openclawNative 与 opensparrow_win/feishu-source 整合为单一统一真源仓的障碍。

所有识别到的风险，均属于以下两类之一：

1. **完全可控**：有官方文档明确记载的解决方案，落地成本低，一次性配置即可。
2. **部分可控**：存在缓解方案，但依赖外部环境条件（Docker Desktop 版本、Windows 注册表设置、用户操作规范），需要在项目生命周期内持续关注。

### 5.2 需要持续关注的三个重点

以下三个风险在本次调研中被认定为需要长期跟踪的技术关注点：

**关注点一：Windows MAX_PATH 260 字符限制**

不能假设目标用户的 Windows 机器已启用 LongPathsEnabled。需要在目录设计和 CI 规范中主动约束路径长度不超过 200 字符，并在 Windows 前置检查脚本中加入路径长度验证。

**关注点二：Docker `--network host` 的跨平台不对称**

macOS 和 Windows 上的 Docker Desktop 在 4.34 版本后开始支持 TCP/UDP 级别的 host networking，但低于此版本的环境仍需使用 `host.docker.internal`。USB 便携式场景中，用户的 Docker Desktop 版本不可控，需要在启动脚本中加入版本检测和降级指引。

**关注点三：exFAT 无日志导致的 USB 数据完整性**

无法通过代码手段从根本上消除此风险，只能通过用户操作规范（安全弹出提示）和交付脚本中的 checksum 验证来缓解。

### 5.3 推荐行动

基于本次调研结论，推荐按以下顺序推进统一仓落地：

1. **立即执行**（一次性配置，低风险）：
   - 在统一仓根目录添加 `.gitattributes`，配置 CRLF/LF 规则和二进制文件标记。
   - 对所有需要可执行权限的 `.sh`/`.command` 文件执行 `git update-index --chmod=+x`。
   - 执行 `git add --renormalize .` 并提交，完成历史文件规范化。

2. **架构固化**（目录结构和边界）：
   - 建立 `platforms/mac/` 和 `platforms/windows/` 的平台适配层目录。
   - 建立 `shared/` 层存放配置契约、渠道契约、health/probe/smoke 验证标准。
   - 更新 `docker-compose.yml`，为 `node_modules` 使用 named volume，并为 macOS/Windows 网络差异提供注释说明。

3. **CI/CD 矩阵**（持续保障）：
   - 在 GitHub Actions 中配置 `strategy.matrix` 三平台矩阵。
   - 在 Windows runner 步骤中加入路径长度检查。
   - 在 CI 中加入 `.gitattributes` 合规验证（确保所有新文件有正确的行尾属性）。

4. **USB 交付规范**（用户文档）：
   - 在 USB 交付包用户文档中明确"安全弹出"要求。
   - 在 Mac USB 启动脚本中加入运行时 `chmod +x` 自修复逻辑。
   - 在 Windows USB 启动脚本中加入 Docker Desktop 版本检测和 MAX_PATH 检测。

---

## 6. 参考文献

以下为本次调研所引用的全部一手文献，按技术领域分类。

### 6.1 Git 官方文档

1. **Git `.gitattributes` 手册页**
   换行符规范化、`text=auto`、`eol=lf`/`eol=crlf`、`binary` 属性的完整说明。
   `https://git-scm.com/docs/gitattributes`

2. **Git `update-index` 手册页**
   `--chmod=+x` 标志的说明，用于为文件设置可执行权限位。
   `https://git-scm.com/docs/git-update-index`

3. **GitHub 关于配置换行符处理的官方建议**
   推荐 `.gitattributes` 的使用方式，以及 `git add --renormalize .` 的操作步骤。
   `https://docs.github.com/en/get-started/getting-started-with-git/configuring-git-to-handle-line-endings`

### 6.2 GitHub Actions 文档

4. **GitHub Actions `strategy.matrix` 文档**
   跨平台矩阵构建的配置语法，`runs-on` 与矩阵变量的结合使用方式。
   `https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/running-variations-of-jobs-in-a-workflow`

### 6.3 Docker 官方文档

5. **Docker Desktop for Mac 性能说明**
   VirtioFS 与 gRPC FUSE 的性能对比，bind mount 与 named volume 的性能差异说明。
   `https://docs.docker.com/desktop/mac/performance/`

6. **Docker Desktop networking 文档**
   `--network host` 在 macOS 和 Windows 上的行为差异，`host.docker.internal` 的使用说明。
   `https://docs.docker.com/desktop/networking/`

7. **Docker `run --user` 文档**
   容器内 UID/GID 设置方式，bind mount 与用户权限的交互行为。
   `https://docs.docker.com/engine/reference/run/#user`

8. **Docker Desktop Synchronized File Shares 文档**
   macOS-only 的 Synchronized File Shares 功能说明，性能提升数据及订阅要求。
   `https://docs.docker.com/desktop/synchronized-file-sharing/`

9. **GitHub docker/roadmap#238**
   `--network host` 在 macOS 和 Windows 上的功能支持历史追踪（Docker Desktop 4.34 的 TCP/UDP 支持里程碑）。
   `https://github.com/docker/roadmap/issues/238`

### 6.4 Node.js 官方文档

10. **Node.js `path` 模块文档**
    `path.join()`、`path.resolve()`、`path.posix`、`path.win32` 的跨平台语义说明。
    `https://nodejs.org/api/path.html`

11. **npm `optionalDependencies` 文档**
    平台特化 optional binary 的声明方式及 npm install 的自动选择逻辑。
    `https://docs.npmjs.com/cli/v10/configuring-npm/package-json#optionaldependencies`

12. **GitHub nodejs/node#50753**
    Node.js 在 Windows 启用 LongPathsEnabled 后的行为记录，以及 Node.js 工具链对长路径的支持现状。
    `https://github.com/nodejs/node/issues/50753`

### 6.5 Microsoft 官方文档

13. **Microsoft Learn：PowerShell 在 macOS 上的安装说明**
    PowerShell 7+ 与 macOS Bash/Zsh 共存的官方指引，确认两者无互操作要求。
    `https://learn.microsoft.com/en-us/powershell/scripting/install/installing-powershell-on-macos`

14. **Microsoft Learn：Windows MAX_PATH 路径长度限制**
    260 字符限制的历史背景，通过组策略/注册表启用 LongPathsEnabled 的方法，以及各 Windows 版本的支持情况。
    `https://learn.microsoft.com/en-us/windows/win32/fileio/maximum-file-path-limitation`

15. **Microsoft Learn：Windows 文件命名约定**
    Windows 和 exFAT/FAT32 文件名的禁用字符清单、长度限制及保留名称列表。
    `https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file`

16. **Microsoft exFAT 规范**
    exFAT 文件系统的结构说明，确认无日志（journaling）机制的规范依据。
    `https://learn.microsoft.com/en-us/windows/win32/fileio/exfat-specification`

### 6.6 工程项目文献

17. **esbuild：跨平台安装说明（optionalDependencies 事实标准来源）**
    esbuild 作为最早大规模使用 `optionalDependencies` 分发 native binary 的 Node.js 工具之一，其文档是该模式的事实参考。
    `https://esbuild.github.io/getting-started/#download-using-npm`

18. **SWC：跨平台 binary 分发说明**
    SWC Rust-backed compiler 的跨平台 npm 包分发方式，与 esbuild 共同构成 `optionalDependencies` 模式的双重确认。
    `https://swc.rs/docs/getting-started`

19. **Apple 开发者文档：macOS 文件系统概述**
    exFAT/FAT32 在 macOS 上 mount 时权限位行为的官方说明，确认无 Unix 权限位支持。
    `https://developer.apple.com/library/archive/documentation/FileManagement/Conceptual/FileSystemProgrammingGuide/FileSystemOverview/FileSystemOverview.html`

---

*本文档基于截至 2026-03-23 的官方文档版本编写。Docker Desktop、GitHub Actions、Node.js 等工具的具体行为可能随版本更新而变化，建议在项目重大版本升级时重新核查部分可控风险章节的内容。*

# OpenSparrow 统一源码仓的跨平台风险评估（2026-03-23）

## 先回答核心问题

### 统一仓库会不会天然导致不可控因素？

**不会天然导致。**

真正要区分的是：

- **统一仓库（source-of-truth）**
- **统一执行入口（runtime/wrapper）**

这两件事不是一回事。

一个统一源码仓，并不要求：

- Mac 和 Windows 用同一个入口脚本
- Mac 和 Windows 用同一种脚本语言
- Mac 和 Windows 用完全相同的打包方式

统一源码仓只要求：

- 共享逻辑只有一个真源
- 平台差异有明确边界
- 产物从真源生成，而不是各自手改

所以：

**可以统一仓库，但不能粗暴追求“统一入口脚本”。**

## 现有代码说明了什么

### 1) 入口层本来就应该不同

当前 Mac 顶层入口是 `.command` + `bash`：

- `openclaw-usb-feishu-delivery/mac/01-开始部署.command`
- `openclaw-usb-feishu-delivery/mac/usb-pack/mac/run-openclaw-usb.command`

当前 Windows 顶层入口是 `.cmd` 调 `PowerShell`：

- `opensparrow_win/one-click-deploy.cmd`
- `opensparrow_win/usb-pack/windows/run-openclaw-usb.cmd`

这不是坏事，而是**正常平台差异**。

### 2) 真正共享的是“安装契约”和“配置动作”

尽管入口不同，Mac / Windows 的核心安装逻辑其实非常接近：

- 都写隔离 profile
- 都写 `gateway.mode/bind/port`
- 都启用 `plugins.entries.feishu` 与 `channels.feishu`
- 都写 `appId/appSecret/dmPolicy/allowFrom/requireMention`
- 都做 `config validate`
- 都 `daemon install` + `daemon restart`
- 都做 `health` / `channels status --probe` / `agent smoke`

这说明：

**共享层不是入口脚本本身，而是安装契约、配置步骤、验证链。**

## 统一仓库后的真实风险

下面这些风险是“真实存在、但可控”的：

### 风险 A：入口脚本继续双线漂移

表现：

- Mac `.command` 一套逻辑
- Windows `.cmd/.ps1` 一套逻辑
- 以后修 bug 时两边不同步

风险等级：高

原因：

- 入口脚本语言不同
- 当前很多业务行为仍埋在平台脚本里

控制策略：

- 保留不同 wrapper
- 但把共享业务逻辑抽回统一真源层
- wrapper 只负责采集输入、调用共享逻辑、显示平台友好提示

### 风险 B：运行时布局不同

表现：

- macOS bundled Node 走 `runtime/node/bin/node`
- Windows bundled Node 走 `runtime/node/node.exe`
- OpenClaw 入口路径和可执行方式不同

风险等级：中

控制策略：

- 不追求二进制布局统一
- 只统一 runtime manifest / build rules
- 让 packaging 层按平台产出不同目录结构

### 风险 C：路径、权限、换行符问题

表现：

- macOS 依赖可执行位与 LF
- Windows 依赖 `.cmd/.ps1`、CRLF、ExecutionPolicy
- 带空格路径、分隔符、引用方式容易分叉

风险等级：高

控制策略：

- 明确 `.gitattributes` / line-ending 规则
- shell 脚本与 PowerShell 脚本分开做语法检查
- 共享参数契约与测试样例，不共享平台特定引用方式

### 风险 D：宿主服务管理语义不同

表现：

- `daemon install` 在不同 OS 下背后的 service manager 行为不同
- 同样命令在 Mac / Windows 的“安装成功”含义不完全一样

风险等级：中

控制策略：

- 不把“宿主服务安装语义”当作共享层
- 在容器基线中尽量不用 host daemon install
- 把原生服务管理留在 host wrapper / native delivery 层

### 风险 E：交互输入方式不同

表现：

- macOS 用 `read -r -p`
- Windows 用 `Read-Host`
- 密码输入、回显、暂停方式都不同

风险等级：低

控制策略：

- 不统一交互语法
- 统一 env 参数契约和非交互模式
- wrapper 可以继续保留平台原生交互体验

### 风险 F：Docker 也有平台差异

表现：

- Mac Docker Desktop 和 Windows Docker Desktop 的卷挂载、权限、路径映射仍有差异
- 但会比当前“全靠宿主脚本”稳定很多

风险等级：中

控制策略：

- 容器化只统一运行基线，不承诺消灭全部宿主差异
- 统一 compose、env、volume、health/probe/smoke
- 单独保留 Mac / Windows 的 Docker runbook

## 哪些不是“不可控因素”

下面这些差异**不是阻止统一仓库的理由**：

- Mac 用 `.command`，Windows 用 `.cmd/.ps1`
- Mac 用 Bash，Windows 用 PowerShell
- 两个平台 bundled runtime 目录布局不同
- 两个平台交互提示文案不同

这些都属于：

**平台适配层差异**

而不是：

**源码仓不能统一的理由**

## 真正不能乱统一的东西

统一仓库以后，下面这些东西不能粗暴合并成“一份脚本跑全平台”：

1. 顶层 wrapper
2. 原生 runtime 打包结构
3. 文件权限和换行控制
4. 宿主 service manager 行为
5. 平台特有的启动器 / 双击入口

这些应该保留为：

- `platforms/mac/*`
- `platforms/windows/*`

## 统一仓库后应该统一什么

应该统一的是：

1. `specs/`
2. `longrun/`
3. 配置契约
4. 渠道契约
5. health / probe / smoke 验证标准
6. 构建规则
7. export / packaging 流程定义
8. 容器化基线

## 最终建议

### 结论 1

**统一仓库是可行的，不会天然带来不可控风险。**

### 结论 2

真正危险的不是“统一仓库”，而是：

- 误把“统一仓库”理解成“统一入口脚本”
- 误把平台差异层也硬合并到一个脚本里

### 结论 3

正确做法应该是：

- **一个统一真源仓**
- **两个平台 wrapper 层**
- **一个共享契约层**
- **一个容器化运行基线**
- **多个生成式交付产物**

## 对下一步实施的建议

如果开始进入实际清理，我建议优先顺序是：

1. 先冻结共享层 / 平台层边界
2. 再确认哪些逻辑必须从 wrapper 抽回共享层
3. 再做目录重构
4. 最后再做容器化最小基线

这样做，风险最低。

# OpenSparrow 仓库清理、平台平衡与容器化部署规划（2026-03-23 修订）

## 这次修订新增回答的问题

1. `openclaw-usb-feishu-delivery/mac` 这套 Mac 代码到底是什么角色？
2. 未来到底应该一个源码仓，还是 Mac / Windows 分仓？
3. 如果后面要把清理后的代码上传到当前仓库，还是新建一个仓库，哪个更合适？

## 新发现：Mac 副本也已经分叉

这次补盘后可以确认：

- `openclaw-usb-feishu-delivery/mac/feishu-source` 不是“当前真源”，而是一套历史交付快照；
- 它目前只保留到 `002` / `003`，而当前 `opensparrow_win/feishu-source` 已推进到 `004` / `005`；
- 这意味着如果继续分别维护 Mac / Windows 整套源码，Mac 会持续落后，Windows 也会持续偏离。

结论：

**Mac 和 Windows 不应该各自维护一套完整源码树。**

## 当前真正的问题是什么

### 1) 源码和产物混在一起

当前仓库里同时存在：

- 真正在继续演进的 `feishu-source/`
- 顶层 `usb-pack/` 交付目录
- push 用副本
- delivery 导出副本
- Mac 历史交付副本
- Windows 历史交付副本
- bundled runtime 副本

结果是：

- 同一逻辑可能在多个目录里都有一份；
- 人会在“产物目录”里直接修 bug；
- 修完后不一定能回流到真源；
- Mac / Windows 两边容易逐步漂移。

### 2) 当前部署强依赖宿主机

当前方案大量依赖：

- 宿主机的 Node / PowerShell / Bash 行为
- 宿主机 profile 与状态目录
- 宿主机端口占用情况
- 宿主机 service manager / 本地脚本入口

这就是为什么“在 Mac 跑通”不等于“在 Windows 一定没问题”。

## 我现在的仓库策略建议

### 推荐：一个统一真源仓，不分 Mac/Windows 源码仓

最推荐的结构是：

- 一个统一源码仓
- 里面有共享层
- 里面有 `platforms/mac`、`platforms/windows` 的 wrapper / packaging 层
- 所有 `usb-pack` / handoff / push / delivery copy 都从它生成

### 不推荐：两个长期源码仓

不建议继续把：

- Mac 真源放一份
- Windows 真源再放一份

因为它们共享的内容太多：

- spec / longrun
- skill / docs
- OpenClaw 配置契约
- UI-first 安装链
- 容器化运行基线

分仓以后，平台平衡会越来越难做。

### 当前仓库能不能承接？

可以，但要分两种情况：

#### 路线 A：当前目标仓库承接（可行）

如果你希望把清理后的代码上传到“现在这个仓库”，可以。
但前提是它要被重新定义为：

- **统一真源仓**
- 而不是“某个平台代码临时存放处”

也就是说，目录要重构成中性结构，不能继续让仓库语义被历史目录绑架。

#### 路线 B：新建一个中性真源仓（我更推荐）

如果你希望把后续结构做得更干净，我更推荐：

- 新建一个中性名称仓库，例如 `opensparrow-source`
- 把清理后的真源放进去
- 老的 `opensparrow_win/`、`openclaw-usb-feishu-delivery/` 等只保留为历史参考或发布产物来源

这样后续不会被旧命名和旧目录结构拖着走。

## 容器化会不会更好？

**会更好，但不是银弹。**

### 它能解决的

- 统一 Node / OpenClaw runtime 版本
- 统一 health / probe / smoke 验证命令
- 统一 profile 隔离和卷挂载
- 统一端口约定
- 让 Mac / Windows 至少在“控制面 + 运行时 + 网络渠道”层面更接近

### 它不能自动解决的

- U 盘交付入口
- 宿主系统服务注册
- 需要原生桌面 / 本地系统桥接的能力
- 所有 host-specific 的脚本行为

所以正确姿势不是“所有东西都 Docker 化”，而是：

- **容器化统一运行基线**
- **原生入口保留为 wrapper / 交付产物**

## 建议的真源边界

### 可编辑真源

- `feishu-source/specs/`
- `feishu-source/scripts/`
- `feishu-source/skills/`
- `feishu-source/longrun/workspaces/openclaw-usb-portable/execution/`
- 未来新增的 `feishu-source/deploy/docker/`
- 未来新增的 `platforms/mac/`、`platforms/windows/`

### 生成产物

- 顶层 `usb-pack/`
- `_push_opensparrow_win/`
- `openclaw-usb-feishu-delivery/mac`
- `openclaw-usb-feishu-delivery/winnew/winnew`
- `execution/export/*`

## 推荐实施顺序

1. 先冻结边界，不删目录，只定义身份。
2. 再决定“当前仓库承接”还是“新建中性仓库承接”。
3. 再把 hand-edit 逻辑迁回真源。
4. 再做容器基线最小可运行版本。
5. 再把 native wrapper 变薄。
6. 最后统一 build/export 和回归。

## 当前结论

- **第一步不是立刻改 Docker，而是先把 Mac / Windows 的真源边界收紧。**
- **第二步是决定真源仓到底放哪。**
- **第三步再做 container-first baseline。**
- 我当前推荐：**单一真源仓，不分 Mac / Windows 源码仓；如要重新承接，优先考虑新建中性仓。**

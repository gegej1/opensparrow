# OpenSparrow 仓库拓扑建议（2026-03-23）

## 结论先说

### 推荐方案

- **一个统一真源仓**（推荐）
- **零个长期平台源码分仓**
- **按需保留多个发布/交付仓或导出目录**

也就是说：

- Mac 和 Windows **不要**各自维护一套长期源码仓
- 如果以后真的要分开，也应该分的是 **release / delivery**，不是 **source-of-truth**

## 为什么不建议分成 Mac 仓 + Windows 仓

因为共享内容太多：

- `specs/`
- `longrun/`
- `skills/`
- `scripts/` 里的核心安装 / 收口逻辑
- UI-first 安装链
- OpenClaw 配置契约
- 后续容器化基线

分成两个源码仓以后：

- Bug 修一次要改两边
- 文档和 spec 很快分叉
- 平台节奏会失衡
- Mac / Windows parity 永远变成追赶游戏

## 推荐的仓库角色划分

### 1. Canonical Source Repo（唯一真源）

建议包含：

```text
specs/
longrun/
scripts/
skills/
deploy/docker/
platforms/mac/
platforms/windows/
packaging/
```

### 2. Generated Release Outputs（构建产物）

包括：

- `usb-pack`
- Windows handoff copy
- Mac handoff copy
- push copy
- 对外交付包

这些可以：

- 留在同仓的 `dist/` / `release/` / `artifacts/`（默认忽略）
- 或导出到独立发布仓 / 独立交付目录

### 3. Historical Snapshot（历史快照）

包括：

- `openclaw-usb-feishu-delivery/mac`
- `openclaw-usb-feishu-delivery/winnew/winnew`
- `_push_opensparrow_win/`

这些不再承担开发真源角色。

## 当前仓库还是新建仓库？

### 当前仓库承接：优点

- 迁移成本低
- 你现在已经在这里工作
- 不需要立刻做仓库切换

### 当前仓库承接：缺点

- 容易被旧命名和旧目录拖累
- 如果仓库本身带明显平台语义，后续仍会误导团队
- 历史产物更容易继续混进来

### 新建中性仓：优点

- 边界最清晰
- 目录从第一天就能按统一真源思路设计
- 更适合承接后续 Docker / Mac / Windows 统一规划

### 新建中性仓：缺点

- 需要一次明确迁移
- 需要后续把旧仓角色降级为历史参考或发布源

## 我的建议

如果你问我“下一步最健康的结果是什么”，我的建议是：

- **中期目标**：新建一个中性真源仓
- **短期动作**：先在当前可编辑真源上完成清理规划与边界冻结
- **之后**：把收敛后的真源整体迁入中性仓，再把旧目录降级为历史/发布产物

## 例外情况

如果你现在非常确定：

- 当前目标仓库就是你未来长期维护的地方
- 你愿意把它彻底改造成中性结构
- 你不会再让 Mac / Windows 历史副本继续回流

那也可以直接让当前仓库承接。

但无论哪条路，都**不建议**把源码层继续拆成 Mac 仓和 Windows 仓。

# 模型智能路由 USB 打包注意事项

## 目的

这份文档只用于临时保存后续打包注意点。
目标不是解释方案，而是避免后面把 `F-027 custom model routing plugin` 并入 USB 交付链时踩坑。

## 当前结论

- 当前模型智能路由已经接入为 **OpenClaw 内部 custom plugin**，不是单独 fake demo。
- 当前可用 provider / model 入口是：`opensparrow-router/auto`
- 当前稳定演示链路是：
  - 日志终端：`bash scripts/model-routing/watch-custom-routing-plugin-log.sh`
  - 聊天终端：`bash scripts/model-routing/chat-custom-routing-plugin.sh`
- 当前 USB 打包基线还是 **Feishu-only**，还**没有**自动把 `F-027` 这套路由资产并进去。

## 打包时必须注意的事

### 1. 不要默认认为 USB 包会自动带上模型路由

当前 `scripts/build-usb-pack.sh` 主要明确复制的是：

- `docs/usb-pack/`
- `docs/runbooks/`
- `scripts/openclaw-usb/`
- `skills/openclaw-local-feishu-usb/`

所以如果后续要把模型智能路由带进 USB 包，必须显式把下面这些内容加入打包清单：

- `scripts/model-routing/custom-plugin/`
- `scripts/model-routing/lib/`
- `scripts/model-routing/enable-custom-routing-plugin.sh`
- `scripts/model-routing/status-custom-routing-plugin.sh`
- `scripts/model-routing/disable-custom-routing-plugin.sh`
- `scripts/model-routing/run-openclaw-custom-plugin.sh`
- `scripts/model-routing/watch-custom-routing-plugin-log.sh`
- `scripts/model-routing/chat-custom-routing-plugin.sh`
- `scripts/model-routing/open-custom-routing-demo-terminals.sh`
- 对应 runbook / wrapper

### 2. USB 交付时必须走“单入口”

不要依赖目标机器上原有的 `openclaw` 默认环境自己碰巧接到这套路由。

必须固定成一条单入口启动链：

1. 先设置隔离 profile
2. 再 stage / enable `opensparrow-router` plugin
3. 再启动 USB 专用 OpenClaw gateway
4. 再通过这个 gateway 做聊天 / 渠道调用

否则会出现下面这些问题：

- 走到目标机默认 profile
- 走到目标机默认端口 `18789`
- 没加载 plugin，但表面上看起来像 OpenClaw 已经启动
- 演示时混入旧配置，导致结果不稳定

### 3. 配置必须隔离，不能污染主环境

建议 USB 版固定使用独立 profile，例如：

- `usb-portable-router`

至少要隔离这些东西：

- `OPENCLAW_HOME`
- profile 名称
- gateway 端口
- workspace
- logs / evidence 输出目录

原则：

- 不污染默认 `~/.openclaw/`
- 不复用主环境正在跑的 gateway
- 不和主机上已有 OpenClaw 服务抢端口

### 4. 凭证不要写进仓库

后续 USB 打包时，`baseUrl` / `apiKey` 不能直接写死进仓库文件。

推荐做法二选一：

- 运行时输入
- 写入 USB 包自己的隔离 profile / 本地配置文件（该文件不进 git）

至少不要改这些位置：

- `.env`
- `.codex/auth.json`
- `.codex/config.toml`

### 5. 不要改 `vendor/`

模型智能路由继续走外围集成：

- custom plugin
- wrapper
- launcher
- config staging
- USB 安装 / 启动脚本

不要为了 USB 打包去改：

- `vendor/`
- 上游 runtime 二进制

### 6. 要明确“包内 runtime”还是“宿主机 runtime”

当前 USB 基线虽然支持优先使用包内 runtime，但仍可能回退到宿主机环境。

所以打包前必须明确：

- 是不是把 `node` / `openclaw` runtime 一起带上
- 还是继续依赖目标机已有 `node` / `openclaw`

如果不明确这件事，到了另一台电脑上最容易出现：

- 版本不一致
- plugin 能复制但网关起不来
- profile 正常但 runtime 缺失

### 7. 默认模型必须锁到智能路由入口

USB 包要保证启动后默认就走：

- `opensparrow-router/auto`

不要让目标机启动后又退回普通直连模型。

也就是说，USB 版启动链里必须包含：

- plugin 已启用
- 默认模型已切到 `opensparrow-router/auto`
- 上游 `baseUrl` / `apiKey` 已注入或可回读

### 8. fallback 仍然保留，不要破坏

这套模型智能路由接入时，不应破坏 OpenClaw 现有 fallback 能力。

打包时要避免两类错误：

- 把 fallback 配置覆盖掉
- 把 provider 改成只剩单一路径，导致上游异常时无法回退

原则是：

- 智能路由负责“优先选哪个模型”
- fallback 继续负责“上游失败后怎么退”

### 9. 飞书 / USB / CLI 都应该复用同一条模型路由主链

后续如果要给飞书、USB、本地 CLI 共用，建议都走同一套：

- OpenClaw gateway
- `opensparrow-router` plugin
- 用户自有 OpenAI-compatible 上游

不要拆成：

- CLI 走一套临时脚本
- 飞书走另一套硬编码
- USB 再走第三套特殊逻辑

这样后期维护会很乱，也不利于演示一致性。

## 后续正式并入 USB 构建链时，建议按这个顺序做

1. 新开一个 feature（建议单独编号，例如 `F-028`）
2. 写 `specs/<feature>/spec.md`
3. 补 `plan.md` / `tasks.md`
4. 把 `F-027` 相关资产加入 `scripts/build-usb-pack.sh`
5. 增加 USB 专用 enable / start 入口
6. 固定 USB 专用 profile、端口、日志目录、evidence 目录
7. 验证另一台机器上是否能直接拉起并路由成功
8. 再补 runbook 与 longrun 记录

## 最关键的一句话

后续要做的不是“把一个 demo 文件夹拷到 U 盘里”，而是：

**把 `OpenClaw + opensparrow-router plugin + 隔离 profile + 启动脚本 + 配置注入` 作为一整套 USB portable 交付链打包出去。**

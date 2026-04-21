# Packaged mac Diagnostics

## 目标

P0 目标不是直接宣布 packaged WeCom / DingTalk 已闭环，而是先把 mac packaged deployment 变成：

- 可诊断
- 可定位
- 可导出证据
- 可回归验证

## 当前诊断面

### 安装状态

- `GET /api/install/status`
- package-local file: `install-state.json`
- package-local file: `install.log`

安装向导不再只依赖前端模拟进度；它会轮询后端真实 step 状态，并把状态映射到：

1. 安装渠道插件
2. 写入基础配置
3. 配置渠道
4. 启动服务
5. 验证连接

### 诊断信息

- `GET /api/diagnostics`
- `GET /api/diagnostics/export`
- package-local file: `diagnostic-bundle.json`

诊断 bundle 当前包含：

- profile / config / runtime path
- resolved OpenClaw entry
- bundled OpenClaw version
- daemon / runtime / gateway health
- install-state snapshot
- install log tail
- 渠道 probe 回读（若当前配置存在）

## runtime truth

当前 packaged mac 的 runtime truth 规则：

- `ui/server.mjs` 优先从 `vendor/mac-openclaw/lib/node_modules/openclaw` 解析 entry / version
- `bin/node_modules/openclaw` 只作为 fallback
- build/export 阶段必须有 drift guard，防止 `lib` 与 `bin` 出现版本分叉仍被打包

## 当前边界

- 这不是 packaged channel PASS 证明
- 这不是 WeCom / DingTalk full closure 结论
- fresh packaged live evidence 仍然需要单独跑

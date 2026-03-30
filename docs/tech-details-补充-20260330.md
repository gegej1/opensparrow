# OpenSparrow 技术细节补充（2026-03-30）

> 本文档记录与用户讨论确认的技术细节，待同步到 Notion 技术架构文档

---

## 1. 部署拓扑与网络架构

### 端口规划
- **UI 控制面**：默认 19000（环境变量 `OPENSPARROW_UI_PORT`）
- **OpenClaw Gateway**：默认 18889（环境变量 `OPENCLAW_GATEWAY_PORT`）
- **端口冲突处理**：直接报错 + 提示修改环境变量

### 多实例支持
- **不支持**同一台机器运行多个 OpenSparrow 实例
- 一台机器一个 Bot，通过 Profile 隔离

### 网络依赖
- **外网访问**：必须（WebSocket 连接 IM 平台 + OpenAI API 调用 + ClawHub 插件下载）
- **代理支持**：支持 `HTTP_PROXY` / `HTTPS_PROXY` 环境变量（适配企业内网）
- **离线模式开关**：UI 提供"离线模式"按钮（政企合规需求，实际功能受限）

### WebSocket Stream 模式
- **连接方向**：OpenSparrow 主动连接飞书/钉钉服务器
- **长连接**：建立后由 IM 平台推送消息
- **无需公网 IP**：不需要配置回调 URL 或开放端口

### Docker 网络配置
- **端口映射**：`19000:19000` + `18889:18889`
- **访问方式**：用户访问 `localhost:19000`（宿主机地址）
- **容器网络**：bridge 模式，自动转发

---

## 待讨论的技术细节

### 2. 数据持久化与状态管理 ✅

#### Profile 目录结构
```
~/.openclaw-usb-portable/
├── agents/main/agent/
│   ├── auth-profiles.json  # API 密钥
│   └── models.json         # 模型配置
├── agents/main/sessions/
│   └── sessions.json       # 会话状态
├── logs/
│   ├── gateway.log         # 标准输出
│   └── gateway.err.log     # 错误日志
└── update-check.json       # 更新缓存
```

#### 配置文件
- **auth-profiles.json**：OpenClaw 自动生成，UI 通过 `/api/install` 写入
- **格式**：`{ version, profiles: { "openai:default": { type, provider, key } } }`
- **不建议手动编辑**

#### 日志
- **位置**：`~/.openclaw-${PROFILE}/logs/`
- **轮转**：当前无，建议后续增加（保留 7 天或 100MB）

### 3. 构建与发布流程 ✅

#### USB 包构建
- **构建脚本**：当前无自动化构建脚本
- **手动流程**：
  1. 源文件来自 canonical 根路径（`platforms/`, `scripts/`, `ui/`, `docs/`）
  2. Runtime 来自 `vendor/`（Node.js + OpenClaw）
  3. 输出到 `dist/usb-pack/`
- **入口脚本**：`platforms/{mac,windows}/wrappers/` 的平台入口

#### 版本号管理
- **当前版本**：v0.1.0-alpha（M2 阶段）
- **版本文件**：待创建 `VERSION` 文件
- **发布流程**：待定（M3 规划）

#### vendor 更新
- **手动更新**：替换 `vendor/{mac,windows,linux}-openclaw/` 目录
- **验证**：`scripts/verify-vendor.sh`

### 4. 平台差异处理细节 ✅

#### 脚本语言
- **Mac/Linux**：Bash (`.sh`)
- **Windows**：PowerShell (`.ps1`)
- **统一逻辑**：`ui/server.mjs` 跨平台

#### 路径处理
- 使用 Node.js `path` 模块自动处理分隔符
- 避免硬编码 `/` 或 `\`

#### 换行符
- **Mac/Linux**：LF
- **Windows**：CRLF（Git 自动转换）

#### 进程检测
- **Mac/Linux**：`ps` 命令
- **Windows**：`tasklist` 命令
- 已在 Codex 修复中统一处理

### 5. 错误处理与降级策略 ✅

#### Gateway 启动失败
- 端口被占用 → 报错提示修改环境变量
- OpenClaw 未安装 → 安装向导引导

#### Extension 安装失败
- 429 限流 → 3 次指数退避重试（2s/4s/8s）
- 已安装 → 跳过重复安装
- 失败后 → 友好错误提示

#### WebSocket 断连
- 依赖 OpenClaw gateway 内置重连机制
- UI 显示连接状态

#### UI 控制面崩溃
- 进程崩溃 → 用户手动重启
- 无自动恢复机制（待 M3 增强）

---

## 同步到 Notion 的位置

在 Notion 技术架构文档（https://www.notion.so/f2ab100f99eb42d7be5d841f7ada6edd）中：

1. 在"关键技术决策"之前插入"部署拓扑与网络架构"章节
2. 在文档末尾"术语表"之后添加"迭代记录"章节，记录本次更新：
   ```
   ## 迭代记录

   ### 2026-03-30
   - 补充部署拓扑与网络架构细节
   - 明确端口冲突处理、多实例支持、网络依赖、Docker 配置
   - 确认 M2 Windows 验证完成（Codex 修复 2 个 bug）
   ```

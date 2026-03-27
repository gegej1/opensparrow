# OpenSparrow 产品需求文档（PRD）

> **⚠️ 本地只读副本**
> 此文档为 Notion PRD 的本地只读副本，供无法访问 Notion 的 worker agents 参考。
> **真源（Source of Truth）在 Notion**：https://www.notion.so/32dd6fd653bd80ba9224fe15ffde5f9d
> 如需修改 PRD，请在 Notion 编辑，然后同步到此文件。

**文档版本**: v1.0
**创建日期**: 2026-03-26
**作者**: ccA (Claude Code A)
**状态**: Read-only local copy
**最后更新**: 2026-03-26

---

## 文档导航

1. [产品概述](#1-产品概述)
2. [产品愿景与目标](#2-产品愿景与目标)
3. [用户画像与场景](#3-用户画像与场景)
4. [功能需求](#4-功能需求)
5. [非功能需求](#5-非功能需求)
6. [技术架构](#6-技术架构)
7. [里程碑与路线图](#7-里程碑与路线图)
8. [风险与依赖](#8-风险与依赖)
9. [成功指标](#9-成功指标)

---

## 1. 产品概述

### 1.1 产品定位

**OpenSparrow 是一个零配置、多平台、多渠道的 IM Bot 本地部署工具链。**

它让企业 IT 管理员和个人开发者无需配置 Node.js 环境、无需理解 OpenClaw 复杂的安装流程，即可在 5 分钟内完成飞书/钉钉 Bot 的本地部署，并通过浏览器 UI 进行可视化管理。

### 1.2 目标用户

| 用户类型 | 典型角色 | 核心诉求 |
|---------|---------|---------|
| **企业 IT 管理员** | 中小企业 IT 负责人 | 在内网环境快速部署 IM Bot，无需依赖外网或云服务 |
| **个人开发者** | AI 应用爱好者 | 快速体验 OpenClaw 能力，不想折腾 Node.js 环境配置 |
| **小团队负责人** | 创业公司 CTO | 同时管理多个渠道（飞书+钉钉），需要统一管理界面 |
| **安全合规团队** | 金融/政企 IT | 数据不出本地，凭据加密存储，满足合规要求 |

### 1.3 核心价值

#### 问题：直接安装 OpenClaw 的痛点

1. **环境配置复杂**：需要安装 Node.js v22+、配置 npm、理解 profile 隔离
2. **命令行门槛高**：需要手动执行 `openclaw onboard`、`openclaw gateway`、`openclaw config set` 等命令
3. **多渠道配置繁琐**：飞书/钉钉/企微各有不同的配置参数和 SDK 依赖
4. **缺乏可视化管理**：所有操作都在命令行，无法直观查看 Bot 状态
5. **版本管理困难**：OpenClaw 更新频繁，手动升级容易出错

#### 解决方案：OpenSparrow 的差异化价值

| 痛点 | OpenSparrow 方案 | 价值 |
|------|-----------------|------|
| 环境配置 | 内置 Node.js v24.14.0 + OpenClaw runtime，开箱即用 | **零依赖** |
| 命令行门槛 | 浏览器 UI 安装向导，填表单即可完成配置 | **零门槛** |
| 多渠道配置 | 统一 UI 界面，自动处理渠道差异和插件安装 | **零学习成本** |
| 可视化管理 | `/dashboard` 实时查看 Bot 状态、日志、配置 | **可观测** |
| 版本管理 | vendor 目录统一管理运行时版本，升级可控 | **可维护** |
| 离线部署 | USB 便携包支持完全离线安装 | **合规友好** |

### 1.4 竞品对比

| 维度 | 直接安装 OpenClaw | OpenSparrow | 优势 |
|------|------------------|-------------|------|
| **安装复杂度** | 需要 Node.js + npm + 命令行操作 | 双击启动 + 浏览器配置 | ⭐⭐⭐ |
| **多渠道支持** | 需要分别配置各渠道插件 | 统一 UI 选择渠道 | ⭐⭐⭐ |
| **离线部署** | 需要联网下载依赖 | USB 包完全离线 | ⭐⭐⭐ |
| **可视化管理** | 无 | 浏览器 UI | ⭐⭐⭐ |
| **多 Bot 管理** | 需要手动管理多个 profile | 规划中（M2） | ⭐⭐ |
| **灵活性** | 完全可定制 | 封装后灵活性降低 | ⭐ |
| **社区生态** | OpenClaw 官方生态 | 依赖 OpenClaw 生态 | ⭐⭐ |

**结论**：OpenSparrow 适合追求快速部署、零配置、可视化管理的用户；OpenClaw 原生安装适合需要深度定制的高级用户。

---

## 2. 产品愿景与目标

### 2.1 产品愿景

**让每个企业和个人都能在 5 分钟内拥有自己的 AI Bot，无需云服务、无需技术门槛。**

### 2.2 短期目标（3 个月内，2026 Q2）

| 目标 | 关键结果（KR） | 当前状态 |
|------|---------------|---------|
| **三渠道稳定支持** | 飞书/钉钉/企微 Mac+Windows E2E 通过率 > 95% | 飞书 Mac ✅，钉钉 Mac ✅，Windows 部分阻塞 |
| **USB 交付成熟** | USB 包在 10 台不同配置机器上安装成功率 > 90% | Mac USB ✅，Windows USB 待验证 |
| **Docker 生产就绪** | Docker 镜像启动时间 < 30s，健康检查稳定 | Baseline ✅，生产优化待完成 |
| **文档完善** | 用户手册、SOP、Runbook 覆盖所有核心场景 | 部分完成，待补充故障排查 |

### 2.3 中期目标（6-12 个月，2026 Q3-Q4）

| 目标 | 关键结果（KR） | 优先级 |
|------|---------------|--------|
| **企业微信渠道** | 企微 Bot 完整安装流程 + E2E 验证 | P0 |
| **多 Profile 管理** | 单机同时运行 3+ 个独立 Bot，互不干扰 | P1 |
| **配置导入导出** | 支持 JSON/YAML 格式配置备份与迁移 | P1 |
| **插件市场集成** | UI 内浏览和安装 ClawHub 插件 | P2 |
| **监控告警** | Bot 离线/异常自动告警（邮件/webhook） | P2 |

### 2.4 长期目标（1 年以上，2027+）

| 目标 | 愿景描述 | 技术挑战 |
|------|---------|---------|
| **国际化渠道** | Slack、Teams、Discord 支持 | 需要适配不同认证机制 |
| **云端同步** | 配置云端备份，多设备同步 | 需要构建云端服务 |
| **AI 能力增强** | 内置 RAG、Function Calling 模板 | 需要深度集成 OpenClaw 新特性 |
| **企业版** | 多租户、RBAC、审计日志 | 需要重构架构 |

---

## 3. 用户画像与场景

### 3.1 用户画像 1：企业 IT 管理员（张工）

**基本信息**：
- 角色：某制造企业 IT 部门负责人
- 技术背景：熟悉 Windows Server、网络配置，不熟悉 Node.js 生态
- 工作环境：内网隔离，无法访问外网

**痛点**：
1. 公司使用飞书办公，希望部署一个 AI 助手帮助员工查询内部知识库
2. 数据安全要求高，不能使用云端 Bot 服务
3. IT 部门人手不足，没有时间学习复杂的技术栈
4. 需要在 Windows Server 上部署，但不熟悉 Node.js 环境配置

**使用 OpenSparrow 的完整流程**：

```
Day 1 上午：
1. 从 IT 供应商处获得 OpenSparrow USB 安装包
2. 插入 USB，双击 one-click-deploy.cmd
3. 浏览器自动打开 http://localhost:19000/setup
4. 填写飞书 App ID、App Secret（从飞书开放平台获取）
5. 填写 OpenAI API Key（公司已购买）
6. 点击"安装"，等待 30 秒
7. 安装成功，跳转到 /dashboard

Day 1 下午：
8. 在飞书群里 @Bot，测试对话功能
9. 发现响应正常，通知团队开始试用

Day 2：
10. 收到用户反馈：希望 Bot 只在工作时间响应
11. 在 /dashboard 点击"配置"，调整响应策略
12. 保存配置，Bot 自动重启

Week 2：
13. 公司新增钉钉办公，需要同时支持两个渠道
14. 在 /dashboard 点击"添加渠道"，选择钉钉
15. 填写钉钉凭据，保存
16. 两个渠道的 Bot 同时运行，互不干扰
```

**期望结果**：
- 安装时间 < 5 分钟
- 无需学习 Node.js、OpenClaw 命令
- 配置变更通过 UI 完成，无需重启服务器
- 数据完全本地化，满足合规要求

---

### 3.2 用户画像 2：个人开发者（李明）

**基本信息**：
- 角色：AI 应用爱好者，前端开发者
- 技术背景：熟悉 JavaScript，但不熟悉 Node.js 后端开发
- 工作环境：macOS，有外网访问

**痛点**：
1. 想体验 OpenClaw 的 AI 能力，但官方文档太复杂
2. 尝试过 `npm install -g openclaw`，但遇到各种环境问题
3. 不想污染全局 Node.js 环境
4. 希望快速验证想法，不想花时间在环境配置上

**使用 OpenSparrow 的完整流程**：

```
周六上午：
1. 从 GitHub 下载 OpenSparrow Mac 版
2. 解压后双击 01-开始部署.command
3. 浏览器打开安装向导
4. 选择飞书渠道，填写个人飞书 Bot 凭据
5. 填写 OpenAI API Key
6. 安装完成，在飞书私聊 Bot 测试

周六下午：
7. 想测试不同的 AI 模型（gpt-4 vs claude-3）
8. 在 /dashboard 切换模型配置
9. 对比不同模型的响应效果

周日：
10. 想尝试钉钉渠道，但不想影响飞书配置
11. 发现 OpenSparrow 暂不支持多 Profile（记录到 Roadmap）
12. 决定先用飞书，等多 Profile 功能上线后再扩展
```

**期望结果**：
- 安装过程 < 3 分钟
- 不污染全局环境（profile 隔离）
- 可以随时卸载，不留残留文件
- UI 操作直观，无需查文档

---

### 3.3 用户画像 3：小团队负责人（王总）

**基本信息**：
- 角色：创业公司 CTO，10 人技术团队
- 技术背景：全栈开发者，熟悉 Docker
- 工作环境：团队同时使用飞书和钉钉

**痛点**：
1. 团队内部有飞书用户，外部客户用钉钉，需要同时支持两个渠道
2. 希望 Bot 能回答产品文档、技术支持等问题
3. 需要部署在公司服务器上，24/7 运行
4. 预算有限，不想购买云端 Bot 服务

**使用 OpenSparrow 的完整流程**：

```
Week 1：
1. 在开发服务器上安装 Docker
2. 克隆 OpenSparrow 仓库
3. 配置 .env 文件（飞书/钉钉凭据 + OpenAI Key）
4. docker compose up -d
5. 访问 http://server-ip:19000/dashboard 确认运行正常

Week 2：
6. 团队成员在飞书群里测试 Bot，反馈良好
7. 外部客户在钉钉群里测试 Bot，发现响应速度慢
8. 检查日志，发现是 OpenAI API 限流
9. 在 /dashboard 调整并发配置

Week 3：
10. 产品文档更新，需要 Bot 学习新内容
11. 准备上传文档到 Bot 的知识库（发现当前版本不支持）
12. 记录需求到 Roadmap：RAG 知识库集成

Month 2：
13. 公司业务扩展，需要增加企业微信渠道
14. 等待 OpenSparrow 企微支持上线
15. 同时在 /dashboard 导出当前配置备份
```

**期望结果**：
- Docker 部署 < 10 分钟
- 支持多渠道同时运行
- 配置可导入导出，便于迁移
- 日志可查询，便于排查问题

---

## 4. 功能需求

### 4.1 P0 功能（必须有，当前版本）

#### FR-001: 飞书渠道完整支持

**功能描述**：用户可以通过 UI 配置飞书 Bot，完成从安装到消息收发的全流程。

**验收标准**：
- [ ] UI 安装向导支持飞书渠道选择
- [ ] 自动安装 feishu extension
- [ ] 支持飞书 App ID + App Secret 配置
- [ ] 支持飞书 Stream 模式（WebSocket 长连接）
- [ ] 飞书群聊 @Bot 可正常对话
- [ ] 飞书私聊可正常对话
- [ ] Mac + Windows 平台 E2E 通过

**当前状态**：Mac ✅，Windows 部分完成

**参考实现**：
- `ui/server.mjs:1545` — handleInstall() 飞书配置写入
- `scripts/openclaw-usb/install-local-feishu.sh` — 飞书安装脚本

---

#### FR-002: 钉钉渠道完整支持

**功能描述**：用户可以通过 UI 配置钉钉 Bot，支持 Stream 模式。

**验收标准**：
- [ ] UI 安装向导支持钉钉渠道选择
- [ ] 自动安装 @openclaw-china/channels 插件
- [ ] 支持钉钉 AppKey + AppSecret + CorpId 配置
- [ ] 支持钉钉 Stream 模式
- [ ] 钉钉群聊 @Bot 可正常对话
- [ ] Mac + Windows 平台 E2E 通过

**当前状态**：Mac ✅，Windows 阻塞（spec-004）

**技术依赖**：
- OpenClaw v2026.3.23+ 的 ClawHub-first 插件安装
- @openclaw-china/channels 社区插件

---

#### FR-003: UI 安装向导

**功能描述**：零配置安装向导，引导用户完成 Bot 配置。

**验收标准**：
- [ ] `/setup` 页面提供渠道选择（飞书/钉钉/企微）
- [ ] 表单验证：必填项检查、格式校验
- [ ] 安装进度实时反馈
- [ ] 安装失败时显示详细错误信息
- [ ] 安装成功后自动跳转 /dashboard

**当前状态**：✅ 已实现（F-009）

**参考实现**：
- `ui/public/setup.html` — 安装向导前端
- `ui/server.mjs:1545` — POST /api/install 后端逻辑

---

#### FR-004: Dashboard 状态监控

**功能描述**：实时查看 Bot 运行状态、配置信息。

**验收标准**：
- [ ] 显示 Bot 在线/离线状态
- [ ] 显示当前渠道配置
- [ ] 显示当前模型配置
- [ ] 提供"启动"/"停止"/"重启"按钮
- [ ] 提供"重置"按钮（工厂重置）

**当前状态**：✅ 基础功能已实现（F-009）

**待增强**：
- 实时日志查看
- 消息统计（今日消息数、响应时长）
- 健康检查历史

---

#### FR-005: 配置管理

**功能描述**：用户可以修改 Bot 配置，无需重新安装。

**验收标准**：
- [ ] 支持修改 OpenAI API Key
- [ ] 支持修改默认模型
- [ ] 支持修改 OpenAI Base URL（兼容第三方 API）
- [ ] 配置变更后自动重启 gateway

**当前状态**：✅ 模型配置已实现

**待增强**：
- 渠道凭据修改
- DM 策略配置
- 响应策略配置

---

#### FR-006: USB 便携包交付

**功能描述**：提供 USB 安装包，支持完全离线部署。

**验收标准**：
- [ ] Mac 版 USB 包（包含 Node.js + OpenClaw runtime）
- [ ] Windows 版 USB 包（包含 Node.js + OpenClaw runtime）
- [ ] 双击启动脚本即可运行
- [ ] 包含完整文档（SOP、Runbook）

**当前状态**：✅ Mac 已完成（F-008），Windows 待验证

**参考实现**：
- `dist/usb-pack/` — USB 包输出目录
- `platforms/mac/wrappers/01-开始部署.command` — Mac 启动脚本
- `platforms/windows/wrappers/one-click-deploy.ps1` — Windows 启动脚本

---

#### FR-007: Docker 容器化部署

**功能描述**：提供 Docker 镜像，支持服务器部署。

**验收标准**：
- [ ] Dockerfile 构建成功
- [ ] docker-compose.yml 一键启动
- [ ] 支持环境变量配置（.env 文件）
- [ ] 健康检查正常
- [ ] 日志持久化

**当前状态**：✅ Baseline 已完成（F-007）

**待增强**：
- 多阶段构建优化镜像大小
- 支持 Kubernetes 部署

---

### 4.2 P1 功能（应该有，中期目标）

#### FR-008: 企业微信渠道支持

**功能描述**：支持企业微信 Bot 配置和消息收发。

**验收标准**：
- [ ] UI 支持企微渠道选择
- [ ] 支持企微 Bot ID + Secret 配置
- [ ] 企微群聊/私聊正常对话
- [ ] Mac + Windows E2E 通过

**当前状态**：未实现

**技术依赖**：OpenClaw wecom extension

---

#### FR-009: 多 Profile 管理

**功能描述**：单机同时运行多个独立 Bot，互不干扰。

**验收标准**：
- [ ] UI 支持创建/切换/删除 Profile
- [ ] 每个 Profile 独立配置（渠道、模型、端口）
- [ ] Profile 间完全隔离（配置、日志、状态）
- [ ] 支持同时运行 3+ 个 Profile

**当前状态**：未实现

**技术方案**：
- 扩展 `OPENCLAW_PROFILE` 环境变量支持
- UI 增加 Profile 管理页面
- 每个 Profile 独立 gateway 端口

---

#### FR-010: 配置导入导出

**功能描述**：支持配置备份与迁移。

**验收标准**：
- [ ] 导出当前配置为 JSON 文件
- [ ] 导入配置文件快速恢复
- [ ] 支持部分配置导入（仅渠道/仅模型）
- [ ] 敏感信息加密存储

**当前状态**：未实现

---

#### FR-011: 日志查看与搜索

**功能描述**：UI 内查看 Bot 运行日志。

**验收标准**：
- [ ] 实时日志流（WebSocket）
- [ ] 日志级别过滤（info/warn/error）
- [ ] 关键词搜索
- [ ] 日志下载

**当前状态**：未实现

---

### 4.3 P2 功能（可以有，长期目标）

#### FR-012: 插件市场集成

**功能描述**：UI 内浏览和安装 ClawHub 插件。

**验收标准**：
- [ ] 展示 ClawHub 插件列表
- [ ] 一键安装/卸载插件
- [ ] 插件配置管理

**当前状态**：未实现

**技术依赖**：OpenClaw v2026.3.22+ ClawHub-first

---

#### FR-013: 监控告警

**功能描述**：Bot 异常时自动告警。

**验收标准**：
- [ ] Bot 离线告警（邮件/webhook）
- [ ] 错误率阈值告警
- [ ] 响应时长告警

**当前状态**：未实现

---

#### FR-014: 国际化渠道（Slack/Teams/Discord）

**功能描述**：支持国际主流 IM 平台。

**验收标准**：
- [ ] Slack Bot 支持
- [ ] Microsoft Teams 支持
- [ ] Discord Bot 支持

**当前状态**：未实现

**技术依赖**：OpenClaw 对应 extension

---

## 5. 非功能需求

### 5.1 性能要求

| 指标 | 目标值 | 当前状态 | 测量方法 |
|------|--------|---------|---------|
| UI 响应时间 | < 200ms | 未测量 | Chrome DevTools |
| Bot 消息延迟 | < 1s（P95） | 未测量 | 飞书消息时间戳对比 |
| 安装时间 | < 5 分钟 | Mac ~3 分钟 | 手动计时 |
| Docker 启动时间 | < 30s | ~20s | docker compose logs |
| 内存占用 | < 500MB | 未测量 | docker stats |

---

### 5.2 安全要求

| 需求 | 实现方式 | 当前状态 |
|------|---------|---------|
| 凭据加密存储 | OpenClaw auth-profiles.json 加密 | ✅ |
| 数据本地化 | 所有数据存储在 ~/.openclaw-* | ✅ |
| HTTPS 支持 | UI 支持 HTTPS（可选） | ❌ |
| 访问控制 | UI 支持密码保护（可选） | ❌ |
| 审计日志 | 记录配置变更操作 | ❌ |

---

### 5.3 兼容性要求

| 平台 | 最低版本 | 当前支持 |
|------|---------|---------|
| macOS | 12.0+ | ✅ |
| Windows | 10+ | ✅ |
| Linux | Ubuntu 20.04+ / CentOS 8+ | ✅ |
| Node.js | v24.14.0（内置） | ✅ |
| OpenClaw | v2026.3.23+ | ✅ |
| 浏览器 | Chrome 90+ / Safari 14+ / Edge 90+ | ✅ |

---

### 5.4 可维护性要求

| 需求 | 实现方式 | 当前状态 |
|------|---------|---------|
| 模块化架构 | platforms/ + scripts/ + ui/ 分离 | ✅ |
| 文档完善 | Spec + Runbook + SOP | ✅ |
| CI/CD | GitHub Actions 4 jobs | ✅ |
| 版本管理 | vendor/ 统一管理运行时版本 | ✅ |
| 日志规范 | 结构化日志输出 | ❌ |

---

### 5.5 用户体验要求

| 需求 | 目标 | 当前状态 |
|------|------|---------|
| 零配置安装 | 5 分钟内完成首次部署 | ✅ |
| 错误提示 | 清晰的错误信息和解决建议 | 部分完成 |
| 文档可达性 | UI 内嵌帮助文档链接 | ❌ |
| 多语言支持 | 中文/英文 | 仅中文 |
| 响应式设计 | 支持移动端浏览器 | ❌ |

---

## 6. 技术架构

### 6.1 系统架构总览

```
┌──────────────────────────────────────────────────────────────────┐
│                        用户浏览器                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐    │
│  │  /setup      │  │  /dashboard  │  │  /api/* (REST)       │    │
│  │  安装向导     │  │  状态监控     │  │  配置/控制接口        │    │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘    │
└─────────┼─────────────────┼─────────────────────┼────────────────┘
          │ HTTP :19000     │                     │
┌─────────▼─────────────────▼─────────────────────▼────────────────┐
│                 UI 控制面（Node.js + Express）                     │
│                     ui/server.mjs                                 │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────────────────┐   │
│  │ 静态文件服务 │ │ REST API     │ │ 进程管理                  │   │
│  │ setup.html  │ │ /api/install │ │ openclaw gateway          │   │
│  │ dashboard   │ │ /api/status  │ │ 启动/停止/重启/健康检查    │   │
│  └─────────────┘ │ /api/config  │ └──────────┬───────────────┘   │
│                  │ /api/reset   │            │                    │
│                  └──────────────┘            │                    │
└─────────────────────────────────────────────┼────────────────────┘
                                              │ spawn / kill
┌─────────────────────────────────────────────▼────────────────────┐
│                OpenClaw Runtime 层                                │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  openclaw gateway --profile <profile> --port <port>      │    │
│  │  └─ 加载 openclaw.json 配置                               │    │
│  │  └─ 启动 Agent（main）                                    │    │
│  │  └─ 监听 IM 渠道 WebSocket 连接                           │    │
│  └──────────────────────────────────────────────────────────┘    │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────────┐      │
│  │ Feishu Ext    │ │ DingTalk Ext  │ │ WeCom Ext (规划)  │      │
│  │ @openclaw/    │ │ @openclaw-    │ │                   │      │
│  │ ext-feishu    │ │ china/channels│ │                   │      │
│  └───────────────┘ └───────────────┘ └───────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
                              │ HTTP / WebSocket
┌─────────────────────────────▼────────────────────────────────────┐
│                    外部服务                                       │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────────┐      │
│  │ 飞书开放平台   │ │ 钉钉开放平台   │ │ OpenAI API        │      │
│  │ (Stream WS)   │ │ (Stream WS)   │ │ (或兼容 API)      │      │
│  └───────────────┘ └───────────────┘ └───────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
```

### 6.2 核心组件

#### 6.2.1 UI 控制面

| 属性 | 说明 |
|------|------|
| **技术栈** | Node.js + Express，纯 HTML/CSS/JS 前端（无框架依赖） |
| **入口文件** | `ui/server.mjs` |
| **默认端口** | `19000`（环境变量 `OPENSPARROW_UI_PORT` 可配） |
| **功能** | 安装向导、Dashboard 监控、REST API、进程管理 |

**关键 API 端点**：

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/status` | GET | 获取 Bot 运行状态、版本信息 |
| `/api/install` | POST | 执行安装流程（渠道配置 + 插件安装 + gateway 启动） |
| `/api/config` | GET/POST | 获取/修改模型配置 |
| `/api/reset` | POST | 工厂重置（清除 profile 数据） |
| `/api/start` | POST | 启动 gateway 进程 |
| `/api/stop` | POST | 停止 gateway 进程 |
| `/api/restart` | POST | 重启 gateway 进程 |

#### 6.2.2 Vendor 运行时

OpenSparrow 通过 `vendor/` 目录打包所有运行时依赖，实现零外部依赖的部署体验。

| 组件 | 版本 | 路径 | 说明 |
|------|------|------|------|
| Node.js | v24.14.0 | `vendor/node/` | 多平台二进制（darwin-arm64, win-x64, linux-x64） |
| OpenClaw CLI | v2026.3.23+ | `vendor/openclaw/` | 包含 CLI + 核心插件 |

**运行时解析顺序**：
1. 检查 `USB_RUNTIME_ROOT` 环境变量指向的路径
2. 检查 `vendor/node/` 目录
3. 回退到系统 `PATH` 中的 `node` / `openclaw`

#### 6.2.3 Profile 隔离机制

OpenSparrow 使用 OpenClaw 的 Profile 隔离能力，确保不同部署实例互不干扰。

| 部署模式 | Profile 名称 | 配置目录 | Gateway 端口 |
|----------|-------------|----------|-------------|
| USB 便携 | `usb-portable` | `~/.openclaw-usb-portable/` | 18889 |
| Docker 容器 | `container-baseline` | `/var/opensparrow/home/` | 18889 |
| 开发调试 | `dev` | `~/.openclaw-dev/` | 18890 |

**Profile 隔离的内容**：
- 配置文件：`openclaw.json`
- Agent 认证：`agents/main/agent/auth-profiles.json`
- 工作空间数据：`workspace/`
- Gateway 服务标签：`ai.openclaw.<profile>`
- 日志与证据：独立目录

#### 6.2.4 渠道适配层

| 渠道 | Extension 包 | 安装方式 | 配置参数 |
|------|-------------|----------|----------|
| **飞书** | `@openclaw/ext-feishu` | 内置 / `openclaw ext install` | App ID, App Secret |
| **钉钉** | `@openclaw-china/channels` | ClawHub-first 安装 | AppKey, AppSecret, CorpId |
| **企微** | 待定 | 待定 | Bot ID, Secret |

**渠道通信模式**：所有渠道统一采用 **Stream（WebSocket 长连接）模式**，无需公网 IP 或域名，适合内网部署。

### 6.3 部署架构

#### 6.3.1 USB 便携包部署

```
U 盘 / 解压目录
├── 01-开始部署.command          # Mac 双击入口
├── one-click-deploy.ps1        # Windows 双击入口
├── vendor/
│   ├── node/                   # Node.js 二进制
│   └── openclaw/               # OpenClaw CLI + 插件
├── scripts/openclaw-usb/
│   ├── install-local-feishu.sh # 安装脚本
│   └── harden-local-feishu.sh  # 收口脚本
├── ui/
│   ├── server.mjs              # UI 后端
│   └── public/                 # UI 前端
└── docs/                       # 用户文档
```

**启动流程**：
1. 用户双击平台入口脚本
2. 脚本探测/使用 vendor 内的 Node.js
3. 启动 `ui/server.mjs`
4. 自动打开浏览器 `http://localhost:19000/setup`
5. 用户通过 UI 完成渠道配置
6. UI 后端调用 OpenClaw CLI 执行安装并启动 gateway

#### 6.3.2 Docker 容器化部署

```yaml
# docker-compose.yml 核心结构
services:
  opensparrow-core:        # 主服务：UI + OpenClaw gateway
    ports:
      - "19000:19000"      # UI 端口
      - "18889:18889"      # Gateway 端口
    volumes:
      - opensparrow-home   # 持久化配置
      - opensparrow-logs   # 持久化日志
    healthcheck:
      test: curl -fsS http://127.0.0.1:19000/api/status

  opensparrow-bootstrap:   # 初始化服务（可选，首次配置时使用）
    profiles: ["bootstrap"]
    command: bootstrap-profile.sh
```

**Docker 部署特点**：
- 两阶段设计：bootstrap（初始化） + core（运行）
- Volume 持久化：配置、日志、证据三卷分离
- 健康检查：10s 间隔，12 次重试
- 环境变量驱动：所有配置通过 `.env` 文件注入

#### 6.3.3 源码直接部署

适用于开发者调试和贡献代码：

```bash
git clone <repo>
cd opensparrow
# 确保系统已安装 Node.js v22+ 和 OpenClaw
node ui/server.mjs
```

### 6.4 数据流

```
用户 IM 消息 → 飞书/钉钉 平台 → WebSocket Stream → OpenClaw Gateway
    → Agent 处理 → OpenAI API 调用 → 响应生成 → WebSocket 回传 → 用户 IM
```

**配置数据流**：
```
UI 表单提交 → POST /api/install → openclaw onboard + openclaw config set
    → 写入 ~/.openclaw-<profile>/openclaw.json → openclaw gateway 启动
```

### 6.5 技术栈总览

| 层次 | 技术选型 | 选型理由 |
|------|---------|---------|
| UI 前端 | 原生 HTML/CSS/JS | 零依赖，最大兼容性 |
| UI 后端 | Node.js + Express | 与 OpenClaw 生态统一，减少运行时依赖 |
| 核心运行时 | OpenClaw v2026.3.23+ | 成熟的 IM Bot 框架，ClawHub 插件生态 |
| 渠道通信 | WebSocket Stream | 无需公网 IP，内网友好 |
| AI 模型 | OpenAI 兼容 API | 灵活切换模型提供商 |
| 容器化 | Docker + Compose | 标准化部署，生产就绪 |
| CI/CD | GitHub Actions | 4 jobs：lint + test + build + verify |
| 构建输出 | `dist/` 目录 | 统一管理所有构建产物 |

### 6.6 扩展性设计

#### 新增渠道的标准流程

1. **Extension 开发/获取**：从 ClawHub 获取或自研 OpenClaw extension
2. **UI 适配**：在 `setup.html` 添加渠道选项卡，定义配置表单字段
3. **后端适配**：在 `server.mjs` 的 `handleInstall()` 中添加渠道分支逻辑
4. **安装脚本**：在 `scripts/openclaw-usb/` 添加渠道专属安装脚本
5. **测试验证**：E2E 测试覆盖 Mac + Windows

#### 插件市场集成（规划中）

```
ClawHub Registry → UI 插件浏览页 → 一键安装
    → openclaw ext install <package> → 重启 gateway
```

---

## 7. 里程碑与路线图

### 7.1 里程碑定义

#### M1: 双渠道 Mac 闭环（2026 Q1）✅ 已完成

**目标**：飞书 + 钉钉在 macOS 上完成全流程验证。

| 交付物 | 状态 | 说明 |
|--------|------|------|
| 飞书 Mac USB 包 | ✅ | E2E 通过 |
| 钉钉 Mac 本机闭环 | ✅ | Stream 模式验证 |
| UI 安装向导 v1 | ✅ | /setup + /dashboard |
| Docker baseline | ✅ | 构建 + 健康检查通过 |
| 文档体系 v1 | ✅ | Spec + Runbook + SOP |

**关键成果**：
- 12 个 Feature（F-001 ~ F-012）中 11 个 passes=true
- USB 便携包 Mac 版交付成功
- CI/CD 4-job pipeline 建立

---

#### M2: 三平台稳定交付（2026 Q2）🔄 进行中

**目标**：Windows 平台补齐，三渠道（飞书/钉钉/企微）稳定可用。

| 交付物 | 目标日期 | 依赖 |
|--------|---------|------|
| OpenClaw runtime 升级至 v2026.3.23+ | 2026-04 | spec-010 |
| Windows 飞书 E2E | 2026-04 | 需 Windows 测试机 |
| Windows 钉钉 E2E | 2026-04 | spec-004 Windows 部分 |
| USB Windows 包验证 | 2026-05 | 上述两项完成后 |
| Docker 生产优化 | 2026-05 | 多阶段构建、镜像瘦身 |
| 企业微信基础支持 | 2026-06 | OpenClaw wecom extension |

**关键风险**：
- Windows 环境差异大，E2E 通过率可能低于 Mac
- 企微 extension 成熟度未知

---

#### M3: 企业级能力增强（2026 Q3）📋 规划中

**目标**：面向企业场景的功能增强。

| 交付物 | 优先级 | 说明 |
|--------|--------|------|
| 多 Profile 管理 | P1 | 单机运行多个独立 Bot |
| 配置导入导出 | P1 | JSON 格式备份与迁移 |
| 实时日志查看 | P1 | WebSocket 日志流 |
| UI 密码保护 | P1 | 基础访问控制 |
| HTTPS 支持 | P2 | 可选 TLS 证书配置 |

---

#### M4: 生态与国际化（2026 Q4+）📋 远期规划

**目标**：拓展渠道生态，建立社区。

| 交付物 | 优先级 | 说明 |
|--------|--------|------|
| ClawHub 插件市场集成 | P2 | UI 内浏览和安装插件 |
| 监控告警 | P2 | Bot 离线/错误率告警 |
| Slack 渠道支持 | P2 | 国际化第一步 |
| 多语言 UI | P2 | 中文/英文切换 |
| 配置云端同步 | P3 | 多设备配置同步 |

### 7.2 路线图时间线

```
2026 Q1          Q2              Q3              Q4          2027
  │               │               │               │           │
  ▼               ▼               ▼               ▼           ▼
┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐
│ M1 ✅    │  │ M2 🔄    │  │ M3 📋    │  │ M4 📋    │  │ 企业版   │
│ 双渠道   │  │ 三平台   │  │ 企业级   │  │ 生态     │  │ 多租户   │
│ Mac 闭环 │  │ 稳定交付 │  │ 能力增强 │  │ 国际化   │  │ RBAC    │
└─────────┘  └──────────┘  └──────────┘  └──────────┘  └─────────┘
```

### 7.3 当前 Spec 与里程碑映射

| Spec | 标题 | 状态 | 里程碑 |
|------|------|------|--------|
| spec-002 | OpenClaw USB installer | ✅ 完成 | M1 |
| spec-003 | UI reset/hardening | ✅ 首轮完成 | M1 |
| spec-004 | DingTalk Stream 对齐 | ⚠️ Mac ✅, Win 待验 | M2 |
| spec-006 | Root unification | ✅ 完成 | M1 |
| spec-007 | Legacy archive + Docker | ✅ 完成 | M1 |
| spec-008 | Build/export dist closure | ✅ 完成 | M1 |
| spec-009 | CI/CD pipeline | ✅ 完成 | M1 |
| spec-010 | OpenClaw runtime upgrade | 🔄 进行中 | M2 |

---

## 8. 风险与依赖

### 8.1 技术风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| **OpenClaw 版本兼容性破坏** | 高：runtime 升级可能导致 API 变更 | 中 | vendor 目录锁定版本；spec-010 升级前做 diff 分析 |
| **Windows 环境差异** | 高：路径分隔符、权限模型、防火墙策略 | 高 | 平台适配层隔离（`platforms/windows/`）；CI 增加 Windows runner |
| **WebSocket Stream 稳定性** | 中：长连接断开后的重连机制依赖 OpenClaw | 中 | 依赖 OpenClaw gateway 内置重连；UI 增加连接状态监控 |
| **Node.js v24 vendor 体积** | 低：二进制体积增长影响 USB 包大小 | 低 | 多平台按需打包；考虑 sea（single executable application） |
| **浏览器兼容性** | 低：原生 HTML/JS 无框架，兼容性好 | 低 | 最低支持 Chrome 90+ / Safari 14+ |

### 8.2 资源风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| **无 Windows 测试机** | 高：Windows E2E 无法验证 | 申请 Windows CI runner 或虚拟机 |
| **无真实 IM 凭据** | 中：E2E 测试需要飞书/钉钉开放平台真实 App | 区分 mock 测试（CI）+ 真实测试（手动） |
| **单人维护瓶颈** | 中：Agent 驱动开发，但人工验证是瓶颈 | 建立自动化验证流水线，减少手动步骤 |

### 8.3 外部依赖

| 依赖 | 类型 | 风险等级 | 说明 |
|------|------|---------|------|
| **OpenClaw 社区** | 核心依赖 | 高 | runtime + CLI + extension 生态；版本更新频率高 |
| **飞书开放平台** | 渠道依赖 | 中 | API 变更、Stream 协议更新 |
| **钉钉开放平台** | 渠道依赖 | 中 | Stream 模式稳定性、SDK 更新 |
| **OpenAI API** | AI 依赖 | 低 | 通过 base URL 可切换至任意兼容 API |
| **GitHub Actions** | CI/CD 依赖 | 低 | 标准 CI 服务，可替换 |

### 8.4 合规风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| **数据隐私** | 用户 IM 消息经过本地 gateway | 数据不出本地；凭据加密存储 |
| **API Key 泄露** | OpenAI Key 明文存储在环境变量中 | Profile 目录权限收敛；UI 密码保护（M3） |
| **开源许可证** | 依赖 OpenClaw 及其 extension 的许可证 | 定期审计依赖许可证兼容性 |

---

## 9. 成功指标

### 9.1 用户体验指标

| 指标 | 目标值 | 测量方法 | 当前值 |
|------|--------|---------|--------|
| **首次安装成功率** | > 95%（Mac），> 90%（Win） | USB 包 10 台机器测试 | Mac ~95%，Win 未测 |
| **安装完成时间** | < 5 分钟 | 从双击到 Bot 首次响应 | Mac ~3 分钟 |
| **UI 操作无文档完成率** | > 80% | 用户测试（无引导完成安装） | 未测量 |
| **配置变更生效时间** | < 10 秒 | 修改配置到 gateway 重启 | ~5 秒 |

### 9.2 技术质量指标

| 指标 | 目标值 | 测量方法 | 当前值 |
|------|--------|---------|--------|
| **E2E 通过率** | > 95%（核心路径） | CI pipeline smoke test | Mac ✅，Win 待验 |
| **Docker 启动时间** | < 30 秒 | `docker compose up` 到健康检查通过 | ~20 秒 |
| **UI 响应时间** | < 200ms（P95） | Chrome DevTools | 未测量 |
| **Gateway 内存占用** | < 500MB | `docker stats` | 未测量 |
| **CI Pipeline 时间** | < 5 分钟 | GitHub Actions 执行时间 | ~3 分钟 |

### 9.3 项目健康指标

| 指标 | 目标值 | 测量方法 | 当前值 |
|------|--------|---------|--------|
| **Feature 完成率** | 100%（P0） | feature_list.json passes=true | 11/12（91.7%） |
| **Spec 完成率** | 100%（M1 scope） | spec status tracking | 6/8 ✅，1 部分，1 进行中 |
| **文档覆盖率** | > 90%（核心流程） | Runbook + SOP 覆盖检查 | ~80% |
| **已知 Bug 数** | < 5（P0/P1） | Issue tracker | 未统计 |

### 9.4 生态指标（M3+ 追踪）

| 指标 | 目标值 | 说明 |
|------|--------|------|
| **支持渠道数** | ≥ 3 | 飞书 + 钉钉 + 企微 |
| **支持平台数** | 3 | macOS + Windows + Linux（Docker） |
| **社区贡献者** | ≥ 5 | GitHub contributors |
| **USB 包部署成功机器数** | ≥ 20 | 不同硬件/OS 配置的成功记录 |

---

## 附录

### A. 术语表

| 术语 | 说明 |
|------|------|
| **OpenClaw** | AI Bot 框架，提供 CLI + Agent + Gateway + Extension 能力 |
| **ClawHub** | OpenClaw 的插件仓库，类似 npm registry |
| **Profile** | OpenClaw 的配置隔离单元，每个 Profile 有独立的配置、状态和端口 |
| **Gateway** | OpenClaw 的 HTTP/WebSocket 网关服务，负责接收和转发 IM 消息 |
| **Extension** | OpenClaw 的渠道/功能插件，如 `ext-feishu`、`@openclaw-china/channels` |
| **Stream 模式** | IM 平台提供的 WebSocket 长连接模式，无需公网回调 URL |
| **Vendor** | 项目内置的运行时依赖目录，包含 Node.js 和 OpenClaw 二进制 |

### B. 相关文档索引

| 文档 | 路径 | 说明 |
|------|------|------|
| USB 部署架构 | `docs/usb-pack/solution-architecture.md` | USB 包详细架构 |
| Docker SOP | `docs/runbooks/F-007-docker-baseline.md` | Docker 操作手册 |
| CI/CD 说明 | `docs/runbooks/F-010-ci-cd-pipeline.md` | CI 流水线配置 |
| Vendor 清单 | `docs/vendor-source-inventory.md` | 运行时版本追踪 |
| Feature 清单 | `longrun/workspaces/opensparrow-unified/feature_list.json` | 功能完成状态 |
| Spec 目录 | `specs/` | 所有技术规格文档 |

### C. 变更日志

| 版本 | 日期 | 变更说明 |
|------|------|---------|
| v1.0 | 2026-03-26 | 初始版本，覆盖 9 大章节 |


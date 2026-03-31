# OpenSparrow Windows E2E 测试报告（M3 发布）

**测试日期**：2026-03-31  
**测试环境**：Windows（PowerShell）  
**测试执行**：Codex Win  
**任务**：M3-windows-e2e-verification（P0）

## 1. 测试范围与前提

- 目标：验证 Windows USB 模式端到端流程（启动 -> 安装向导 -> Dashboard -> Reset）。
- 参考项：用户提供的 release-checklist Section 2.2 检查点。
- 实际环境说明：当前机器不存在 `D:\opensparrow-usb-pack\openclaw-usb-pack`，本次在现有包目录 `C:\opensparrow` 执行等价验证。
- 启动入口：`platforms/windows/wrappers/one-click-deploy.cmd`。

## 2. 启动验证

执行命令：

```powershell
C:\opensparrow\platforms\windows\wrappers\one-click-deploy.cmd -Profile m3-e2e -UiPort 19000 -NoPause
```

结果：

- 启动耗时：`16.48s`
- 输出包含：
  - `One-click deployment started.`
  - `Deploy service is ready on port 19000.`
  - `Config or credentials not found, opening setup page...`
- 访问地址：`http://localhost:19000`

日志：`C:\test-output\logs\m3-e2e-deploy-output.log`

## 3. E2E 结果汇总

| 模块 | 状态 | 备注 |
|---|---|---|
| Step 1 渠道选择 | 通过 | 飞书/钉钉/企业微信 3 项均可见 |
| Step 2 凭证配置 | 通过 | 三渠道字段均可渲染 |
| Step 3 API 配置 | 部分通过 | Base URL/API Key/Model 有；Provider 下拉未见 |
| Step 4 Skill 选择 | N/A | 当前 M3 Windows 向导为 4 步，无独立 Skill 步骤 |
| Step 5 安装确认与安装 | 通过 | 安装成功并可进入 Dashboard |
| Dashboard 页面加载 | 通过 | 状态页、渠道页、API 页均可访问 |
| Dashboard 按钮（启动/停止/重启） | 通过 | 二次专项复测全部返回 200 |
| Reset 功能 | 部分通过 | Reset API 成功；自动跳转在 headless 未稳定复现 |
| Reset 后配置清空 | 通过 | `/api/status` 显示 `installed=false`, `configExists=false` |

## 4. 用例统计

- 总检查项：19
- 通过：16
- 部分通过：2
- N/A：1
- 失败：0

统计口径：
- 通过/部分通过依据 `C:\test-output\logs\m3-windows-e2e-result.json` 与 `m3-dashboard-actions-seq.json`。

## 5. 关键耗时

- one-click 启动到服务就绪：`16.48s`
- 安装耗时（向导 Step5 点击开始安装 -> 完成）：`41.55s`
- Reset API 响应耗时：`9.79s`
- Dashboard 按钮响应耗时（专项复测）：
  - 停止：`3.55s`
  - 启动：`2.56s`
  - 重启：`19.18s`

## 6. 详细验证记录

### 6.1 安装向导

- Step 1：页面可加载，3 个渠道项存在。
- Step 2：
  - 飞书字段：`appId` / `appSecret`
  - 钉钉字段：`corpId` / `clientId` / `clientSecret`
  - 企微字段：`botId` / `secret`
- Step 3：可填写 `baseUrl` / `apiKey` / `model`。
- Step 4（Skill）：当前构建无独立 Skill 选择页（4 步向导：选择渠道 -> 填写凭证 -> API 配置 -> 安装）。
- Step 5：安装进度展示正常，安装完成可进 Dashboard。

### 6.2 Dashboard

- 页面可访问，状态可读。
- 渠道配置页面可加载。
- API 配置页面可加载。
- 按钮专项复测（stop/start/restart）均返回 200。

### 6.3 Reset

- 点击“全量重置”后出现确认弹窗。
- 接口返回：`200`，`resetComplete=true`。
- reset 后状态：`installed=false`、`configExists=false`。
- 自动跳转说明：Playwright headless 下 30 秒内未稳定观察到自动跳转，脚本补充手动打开 `/setup?force=1` 完成截图与回归验证。

## 7. 问题与偏差

1. **规格偏差：向导步数与文档不一致**
- 现象：任务描述为 5 步（含 Skill），当前 Windows M3 实际为 4 步。
- 影响：`step4-skill-categories` 只能标注为 N/A。
- 阻塞性：否（需与产品/发布清单对齐）。

2. **API Provider 选择缺失**
- 现象：Step 3 未见 Provider 下拉（仅 Base URL/API Key/Model）。
- 影响：与“显示 API 提供商选择（OpenAI/Azure/Anthropic）”预期不一致。
- 阻塞性：否（当前仍可完成安装）。

3. **Reset 后自动跳转稳定性（Headless）**
- 现象：Reset API 成功后，自动跳转 `/setup` 未在 30 秒内稳定复现。
- 影响：可能影响自动化验收脚本稳定性。
- 阻塞性：否（功能本体成功，手动访问可恢复向导）。

## 8. 截图清单（9 张）

目录：`C:\opensparrow\docs\e2e-screenshots-windows\`

1. `step1-channel-selection.png`
2. `step2-credentials.png`
3. `step3-api-config.png`
4. `step4-skill-categories.png`（N/A 标注图）
5. `step5-install-progress.png`
6. `step5-install-complete.png`
7. `dashboard.png`
8. `reset-complete.png`
9. `after-reset-setup.png`

## 9. 证据日志

- 启动日志：`C:\test-output\logs\m3-e2e-deploy-output.log`
- 主流程日志：`C:\test-output\logs\m3-windows-e2e-result.json`
- Dashboard 按钮专项复测：`C:\test-output\logs\m3-dashboard-actions-seq.json`
- 安装请求日志：`C:\test-output\logs\m3-dashboard-install.json`

## 10. 结论

- Windows 端 M3 USB 流程主链路可走通：**启动 -> 安装 -> Dashboard -> Reset -> 回到 setup（手动兜底）**。
- 发布前建议处理/确认：
  - release-checklist 与实际 4 步向导差异
  - Step 3 Provider 选择项产品预期
  - Reset 自动跳转在自动化场景的稳定性

# F-014 Runbook - WeCom Channel Integration

## 目标

把 OpenSparrow 当前仓的企业微信渠道集成收口为“可维护、可验证、可继续补证”的状态。

本 runbook 的重点不是声称“企微已经 100% 端到端跑通”，而是明确：

- 哪些链路已经在代码与自动化测试层面落地；
- 哪些链路已经在离线插件安装层面被验证；
- 哪些步骤仍然需要真实企业微信凭据做人工补证；其中当前业务主链是企业微信智能机器人 API / 长连接，`Bot ID + Secret` 是最小真实入口，callback 仅在实际业务依赖时另列扩展验证。

## 当前实现面

### UI

- 安装向导页：`ui/public/index.html`
- Dashboard 渠道配置页：`ui/public/dashboard.html`
- 浏览器共享企微 helper：`ui/public/wecom-helpers.js`

当前 UI 已支持：

- Bot ID
- Bot Secret
- 可选的自建应用增强出站字段：CorpId / CorpSecret / AgentId / Reply Format
- 可选的回调入站字段：Callback Token / EncodingAESKey / Callback Path

当前验收口径应以长连接主链为先：`Bot ID + Bot Secret` 足以构成最小真实安装入口；CorpId / CorpSecret / AgentId / callback* 只在增强链路或特定场景下参与补证，不作为默认必经门槛。

### 服务端

- 主入口：`ui/server.mjs`
- 企微纯逻辑：`ui/lib/wecom.mjs`

当前服务端已支持：

- 企微输入字段归一化
- 成组字段校验
- 企微插件安装
- `handleInstall()` 的 `wecom` 分支
- `POST /api/config/channels` 的 `wecom` 更新分支
- 企微 probe 报告

### 打包 / 插件来源

- 离线插件打包：`scripts/build-usb-pack.sh`
- 本地归档查找：`ui/install-helpers.mjs`

当前企微插件优先使用随包 `.tgz` 归档，避免首次安装依赖 ClawHub。

## 已自动验证的内容

### 1. 企微纯逻辑测试

```bash
node --test ui/lib/wecom.test.mjs
```

已覆盖：

- Bot ID 格式识别
- UI 扁平字段与嵌套 agent/callback 字段归一化
- 必填字段与成组字段错误提示
- 持久化配置到 UI 表单字段的扁平化

### 2. 浏览器共享 helper 测试

```bash
node --test ui/public/wecom-helpers.test.mjs
```

已覆盖：

- 浏览器端共享 API 已导出
- 两个页面共用的企微字段校验规则保持一致

### 3. 服务端语法检查

```bash
node --check ui/server.mjs
```

### 3. 企微插件本地归档可用性

相关已有证据见：

- `longrun/workspaces/opensparrow-unified/claude-progress.txt`
- `specs/014-mac-arm64-installer-hardening/spec.md`

已知记录：

- 本地 `sunnoy-wecom-3.0.0.tgz` 可安装
- 随后 `config set channels.wecom.enabled true --strict-json` 可执行

## 仍需人工补证的内容

### 主链必补证

以下内容是当前 `F-014` 的真实补证主目标：

1. UI 安装向导以真实企业微信 `Bot ID + Secret` 完成一次真实安装
2. 至少一次真实消息收发 / 对话成功（单聊或群聊均可）

### 扩展链路按业务另行补证

以下内容保留为增强链路或特定场景链路，不再作为 `F-014` 默认必经门槛：

1. 自建应用增强出站链路（CorpId / CorpSecret / AgentId）
2. 回调入站链路（`/wecom/callback`）

## 推荐人工补证步骤

### A. 安装前检查

```bash
./longrun/workspaces/opensparrow-unified/init.sh
node --check ui/server.mjs
node --test ui/lib/wecom.test.mjs
```

### B. 启动 UI 并填写企微配置

在 UI 中至少填写（当前业务主链）：

- Bot ID
- Bot Secret

如业务实际需要自建应用增强出站，再补：

- CorpId
- CorpSecret
- AgentId
- Reply Format（可选，`markdown` / `text`）

如业务实际需要 callback 入站，再补：

- Callback Token
- EncodingAESKey
- Callback Path

### C. 如业务依赖 callback，再做企业微信后台补配置

参考：`docs/tutorials/01-安装教程.md`

典型回调地址：

```text
http://你的IP地址:18889/wecom/callback
```

若实际使用自定义 path，则以 UI 中填写值为准。

### D. 采证建议

至少保留：

- UI 安装成功截图 / 失败截图
- `/api/install` 返回中的 warnings / probe 信息
- 实际单聊 / 群聊触发记录
- 若失败，保留 `wecomProbe` 内容与网关日志

若本次补证包含 callback / 自建应用增强链路，再额外保留：

- 企业微信后台回调配置截图
- CorpId / CorpSecret / AgentId 对应的配置与执行证据

## 通过判定建议

只有在下面两层都具备证据时，才建议把 `F-014` 写成通过：

1. **自动验证层**：helper 测试 + 服务端语法检查 + 插件安装链路稳定
2. **真实渠道层**：带真实企业微信 `Bot ID + Secret` 的一次真实 UI 安装，并至少完成一次真实消息收发 / 对话成功

若当前业务额外依赖自建应用增强链路或 callback，再把相应补证追加为扩展通过条件；它们不是默认的主链 passing 门槛。

在缺少第 2 层前，不要伪造“企微 E2E 已通过”的长期状态。

# F-024 Unified Channel Contract Baseline Runbook

## Purpose

本 runbook 只记录 `F-024` 在 `PKT-024-B` / `PKT-024-C` 冻结下来的 canonical contract baseline，供 docs / live-spec / tutorial wording sync 使用。它不是实现包、不是 verification 包，也不宣称真实凭据 E2E 或 Windows replay fidelity 已完成。

## Canonical Contract Baseline

### Feishu
- Core：`appId + appSecret`
- F-024 口径：只保留 minimal baseline，不新增 live 可编辑字段
- 说明：其余策略继续由服务端 defaults 写入

### DingTalk
- Core：`clientId + clientSecret`
- Optional metadata：`corpId`
- Alias / baggage：接受 `appKey`、`appSecret`、`robotCode`、`cropId` 历史 alias
- 说明：`corpId` 只作 metadata / read-back enrichment，不再写成 install blocker；`robotCode` 是兼容 / 展示字段，不是 core credential

### WeCom
- Core：`botId + secret`
- Enhanced optional：`corpId`、`corpSecret`、`agentId`、`replyFormat`
- Advanced optional：`callbackToken`、`encodingAESKey`、`callbackPath`
- 说明：persisted schema 继续保持 nested；不要把 live tutorial wording 写回旧式 `corpid + AgentId + Secret` 主模型

## Surface Notes

- Dashboard baseline 固定为三张渠道卡片：`feishu` / `dingtalk` / `wecom`
- 每张卡片通过 `编辑` 打开 modal，在 modal 内点击 `保存` 持久化配置
- 渠道启停通过卡片上的 `enabled` toggle 控制
- F-024 不把当前 Dashboard surface 写成通用“添加渠道 / 保存并启用”的动态流程

## F-024 / F-025 Boundary

### F-024 Covers
- Install / Dashboard / server canonical handling / read-back 的 contract baseline
- live-spec / tutorial / SOP / runbook 的最小直接受影响 wording sync

### F-024 Does Not Cover
- 真实凭据 E2E
- Windows replay fidelity 全量收口
- broader docs parity / product docs 大扫除
- 新的 server/browser 实现修正

### F-025 Owns
- replay parity
- broader docs parity
- 本轮 baseline 之外的后续文档扩面

## Verification Boundary

- 本 runbook 不替代 `PKT-024-E` 的 verification-only closure
- 若 verification 发现 bug，应新开 fix packet；不要把实现修正回灌到 docs packet

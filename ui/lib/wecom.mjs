export function isLikelyWecomBotId(raw) {
  const value = String(raw ?? '').trim()
  if (!value) return false
  return /^aib(?:[_-]?[A-Za-z0-9][A-Za-z0-9._-]*)$/i.test(value)
}

export function normalizeWecomCredentials(raw) {
  const data = raw && typeof raw === 'object' ? raw : {}
  const agent = data.agent && typeof data.agent === 'object' ? data.agent : {}
  const rootCallback = data.callback && typeof data.callback === 'object' ? data.callback : {}
  const agentCallback = agent.callback && typeof agent.callback === 'object' ? agent.callback : {}
  const botId = String(data.botId ?? '').trim()
  const secret = String(data.secret ?? '').trim()
  const corpId = String(data.corpId ?? agent.corpId ?? '').trim()
  const corpSecret = String(data.corpSecret ?? agent.corpSecret ?? '').trim()
  const agentId = String(data.agentId ?? agent.agentId ?? '').trim()
  const replyFormat = String(data.replyFormat ?? agent.replyFormat ?? '').trim().toLowerCase()
  const callbackToken = String(data.callbackToken ?? rootCallback.token ?? agentCallback.token ?? '').trim()
  const encodingAESKey = String(data.encodingAESKey ?? rootCallback.encodingAESKey ?? agentCallback.encodingAESKey ?? '').trim()
  const callbackPath = String(data.callbackPath ?? rootCallback.path ?? agentCallback.path ?? '').trim()
  const hasAnyAgentFields = Boolean(corpId || corpSecret || agentId || replyFormat)
  const agentConfigured = Boolean(corpId && corpSecret && agentId)
  const hasCallbackFields = Boolean(callbackToken || encodingAESKey || callbackPath)
  const callbackConfigured = Boolean(callbackToken && encodingAESKey && callbackPath)

  return {
    botId,
    secret,
    corpId,
    corpSecret,
    agentId,
    replyFormat,
    callbackToken,
    encodingAESKey,
    callbackPath,
    hasAnyAgentFields,
    agentConfigured,
    hasCallbackFields,
    callbackConfigured,
  }
}

export function collectWecomInputErrors(raw) {
  const normalized = normalizeWecomCredentials(raw)
  const {
    botId,
    secret,
    corpId,
    corpSecret,
    agentId,
    replyFormat,
    callbackToken,
    encodingAESKey,
    callbackPath,
    hasAnyAgentFields,
    hasCallbackFields,
  } = normalized
  const errors = []

  if (!botId) errors.push('企业微信需要填写 Bot ID')
  if (botId && !isLikelyWecomBotId(botId)) {
    errors.push('企业微信 Bot ID 格式疑似错误，请填写智能机器人（API+长连接）生成的 Bot ID（通常以 aib 或 aib_ 开头）')
  }
  if (!secret) errors.push('企业微信需要填写 Bot Secret')
  if (hasAnyAgentFields && (!corpId || !corpSecret || !agentId)) {
    errors.push('启用企业微信自建应用增强出站时，需要同时填写 CorpId、CorpSecret、AgentId')
  }
  if (agentId && !/^\d+$/.test(agentId)) {
    errors.push('企业微信 AgentId 必须是正整数')
  }
  if (replyFormat && !['markdown', 'text'].includes(replyFormat)) {
    errors.push('企业微信 Reply Format 仅支持 markdown 或 text')
  }
  if (hasCallbackFields && (!callbackToken || !encodingAESKey || !callbackPath)) {
    errors.push('启用企业微信回调入站时，需要同时填写 Callback Token、EncodingAESKey、Callback Path')
  }
  if (hasCallbackFields && (!corpId || !corpSecret || !agentId)) {
    errors.push('企业微信回调入站依赖完整的自建应用 CorpId、CorpSecret、AgentId')
  }

  return {
    ...normalized,
    errors,
  }
}

export function enrichWecomChannelForUi(channelCfg) {
  if (!channelCfg || typeof channelCfg !== 'object') return channelCfg
  const normalized = normalizeWecomCredentials(channelCfg)
  return {
    ...channelCfg,
    botId: normalized.botId,
    secret: normalized.secret,
    corpId: normalized.corpId,
    corpSecret: normalized.corpSecret,
    agentId: normalized.agentId,
    replyFormat: normalized.replyFormat,
    callbackToken: normalized.callbackToken,
    encodingAESKey: normalized.encodingAESKey,
    callbackPath: normalized.callbackPath,
  }
}

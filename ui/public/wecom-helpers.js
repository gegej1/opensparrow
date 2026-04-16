(function bootstrapWecomHelpers(globalScope) {
  function createEmptyWecomFields() {
    return {
      botId: '',
      secret: '',
      corpId: '',
      corpSecret: '',
      agentId: '',
      replyFormat: '',
      callbackToken: '',
      encodingAESKey: '',
      callbackPath: '',
    }
  }

  function isLikelyWecomBotId(value) {
    return /^aib(?:[_-]?[A-Za-z0-9][A-Za-z0-9._-]*)$/i.test(String(value || '').trim())
  }

  function validateWecomFields(fields) {
    const botId = String(fields?.botId || '').trim()
    const secret = String(fields?.secret || '').trim()
    const corpId = String(fields?.corpId || '').trim()
    const corpSecret = String(fields?.corpSecret || '').trim()
    const agentId = String(fields?.agentId || '').trim()
    const replyFormat = String(fields?.replyFormat || '').trim().toLowerCase()
    const callbackToken = String(fields?.callbackToken || '').trim()
    const encodingAESKey = String(fields?.encodingAESKey || '').trim()
    const callbackPath = String(fields?.callbackPath || '').trim()
    const hasAgentBasics = Boolean(corpId || corpSecret || agentId)
    const hasCallback = Boolean(callbackToken || encodingAESKey || callbackPath)
    const errors = []

    if (!botId) errors.push('企业微信需要填写 Bot ID')
    if (botId && !isLikelyWecomBotId(botId)) {
      errors.push('企业微信 Bot ID 格式疑似错误，请填写智能机器人（API+长连接）生成的 Bot ID（通常以 aib 或 aib_ 开头）')
    }
    if (!secret) errors.push('企业微信需要填写 Bot Secret')
    if (hasAgentBasics && (!corpId || !corpSecret || !agentId)) {
      errors.push('启用企业微信自建应用增强出站时，需要同时填写 CorpId、CorpSecret、AgentId')
    }
    if (agentId && !/^\d+$/.test(agentId)) {
      errors.push('企业微信 AgentId 必须是正整数')
    }
    if (replyFormat && !['markdown', 'text'].includes(replyFormat)) {
      errors.push('企业微信 Reply Format 仅支持 markdown 或 text')
    }
    if (hasCallback && (!callbackToken || !encodingAESKey || !callbackPath)) {
      errors.push('启用企业微信回调入站时，需要同时填写 Callback Token、EncodingAESKey、Callback Path')
    }
    if (hasCallback && (!corpId || !corpSecret || !agentId)) {
      errors.push('企业微信回调入站依赖完整的自建应用 CorpId、CorpSecret、AgentId')
    }

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
      errors,
    }
  }

  globalScope.OpenSparrowWecom = {
    createEmptyWecomFields,
    isLikelyWecomBotId,
    validateWecomFields,
  }
})(typeof window !== 'undefined' ? window : globalThis)

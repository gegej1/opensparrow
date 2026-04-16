(function bootstrapChannelHelpers(globalScope) {
  function normalizeChannelType(type) {
    return String(type || '').trim().toLowerCase()
  }

  function createEmptyFeishuFields() {
    return {
      appId: '',
      appSecret: '',
    }
  }

  function createEmptyDingtalkFields() {
    return {
      corpId: '',
      clientId: '',
      robotCode: '',
      clientSecret: '',
    }
  }

  function createEmptyWecomFields() {
    const api = globalScope.OpenSparrowWecom
    if (api && typeof api.createEmptyWecomFields === 'function') {
      return api.createEmptyWecomFields()
    }

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

  function createEmptyUiFields(type) {
    const channelType = normalizeChannelType(type)

    if (channelType === 'feishu') return createEmptyFeishuFields()
    if (channelType === 'dingtalk') return createEmptyDingtalkFields()
    if (channelType === 'wecom') return createEmptyWecomFields()
    return {}
  }

  function normalizeFeishuFields(raw) {
    const data = raw && typeof raw === 'object' ? raw : {}
    return {
      appId: String(data.appId ?? '').trim(),
      appSecret: String(data.appSecret ?? '').trim(),
    }
  }

  function validateFeishuFields(raw) {
    const normalized = normalizeFeishuFields(raw)
    const errors = []

    if (!normalized.appId) errors.push('飞书 App ID 不能为空')
    if (!normalized.appSecret) errors.push('飞书 App Secret 不能为空')

    return {
      ...normalized,
      errors,
    }
  }

  function normalizeDingtalkFields(raw) {
    const data = raw && typeof raw === 'object' ? raw : {}
    const rawClientId = String(
      data.clientId ?? data.appKey ?? ''
    ).trim()
    const rawRobotCode = String(
      data.robotCode ?? ''
    ).trim()

    return {
      corpId: String(data.corpId ?? data.cropId ?? '').trim(),
      clientId: rawClientId || rawRobotCode,
      robotCode: rawRobotCode || rawClientId,
      clientSecret: String(data.clientSecret ?? data.appSecret ?? '').trim(),
    }
  }

  function validateDingtalkFields(raw) {
    const normalized = normalizeDingtalkFields(raw)
    const errors = []

    if (!normalized.clientId) errors.push('钉钉 Client ID（兼容 AppKey / Robot Code）不能为空')
    if (!normalized.clientSecret) errors.push('钉钉 Client Secret（兼容 AppSecret）不能为空')

    return {
      ...normalized,
      errors,
    }
  }

  function normalizeWecomFields(raw) {
    const api = globalScope.OpenSparrowWecom
    if (api && typeof api.validateWecomFields === 'function') {
      const { errors, ...normalized } = api.validateWecomFields(raw)
      return normalized
    }

    const data = raw && typeof raw === 'object' ? raw : {}
    return {
      botId: String(data.botId ?? '').trim(),
      secret: String(data.secret ?? '').trim(),
      corpId: String(data.corpId ?? '').trim(),
      corpSecret: String(data.corpSecret ?? '').trim(),
      agentId: String(data.agentId ?? '').trim(),
      replyFormat: String(data.replyFormat ?? '').trim().toLowerCase(),
      callbackToken: String(data.callbackToken ?? '').trim(),
      encodingAESKey: String(data.encodingAESKey ?? '').trim(),
      callbackPath: String(data.callbackPath ?? '').trim(),
    }
  }

  function validateWecomFields(raw) {
    const api = globalScope.OpenSparrowWecom
    if (!api || typeof api.validateWecomFields !== 'function') {
      return {
        ...normalizeWecomFields(raw),
        errors: ['企业微信 helper 未加载'],
      }
    }

    const result = api.validateWecomFields(raw)
    return {
      ...result,
      errors: Array.isArray(result.errors) ? result.errors : [],
    }
  }

  function normalizeUiFields(type, raw) {
    const channelType = normalizeChannelType(type)

    if (channelType === 'feishu') return normalizeFeishuFields(raw)
    if (channelType === 'dingtalk') return normalizeDingtalkFields(raw)
    if (channelType === 'wecom') return normalizeWecomFields(raw)
    return raw && typeof raw === 'object' ? { ...raw } : {}
  }

  function validateUiFields(type, raw) {
    const channelType = normalizeChannelType(type)

    if (channelType === 'feishu') return validateFeishuFields(raw)
    if (channelType === 'dingtalk') return validateDingtalkFields(raw)
    if (channelType === 'wecom') return validateWecomFields(raw)

    return {
      ...normalizeUiFields(channelType, raw),
      errors: [`未知渠道类型：${channelType || String(type || '').trim() || 'empty'}`],
    }
  }

  function hasReplayValue(type, raw) {
    const normalized = normalizeUiFields(type, raw)
    return Object.values(normalized).some((value) => String(value ?? '').trim() !== '')
  }

  function buildChannelPayload(type, raw, options = {}) {
    const channelType = normalizeChannelType(type)
    const validated = validateUiFields(channelType, raw)
    const payload = {
      type: channelType,
    }

    if (Object.prototype.hasOwnProperty.call(options, 'enabled')) {
      payload.enabled = options.enabled !== false
    }

    if (channelType === 'feishu') {
      return {
        ...payload,
        appId: validated.appId,
        appSecret: validated.appSecret,
      }
    }

    if (channelType === 'dingtalk') {
      return {
        ...payload,
        corpId: validated.corpId,
        clientId: validated.clientId,
        robotCode: validated.robotCode,
        clientSecret: validated.clientSecret,
      }
    }

    if (channelType === 'wecom') {
      return {
        ...payload,
        botId: validated.botId,
        secret: validated.secret,
        corpId: validated.corpId,
        corpSecret: validated.corpSecret,
        agentId: validated.agentId,
        replyFormat: validated.replyFormat,
        callbackToken: validated.callbackToken,
        encodingAESKey: validated.encodingAESKey,
        callbackPath: validated.callbackPath,
      }
    }

    return payload
  }

  globalScope.OpenSparrowChannels = {
    createEmptyUiFields,
    hasReplayValue,
    normalizeUiFields,
    validateUiFields,
    buildChannelPayload,
  }
})(typeof window !== 'undefined' ? window : globalThis)

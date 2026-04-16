import {
  collectWecomInputErrors,
  enrichWecomChannelForUi,
  normalizeWecomCredentials,
} from './wecom.mjs'

function normalizeChannelType(raw) {
  return typeof raw?.type === 'string' ? raw.type.trim() : ''
}

function isEnabledByDefault(raw) {
  return raw?.enabled !== false
}

export function normalizeFeishuCredentials(raw) {
  const data = raw && typeof raw === 'object' ? raw : {}
  return {
    appId: String(data.appId ?? '').trim(),
    appSecret: String(data.appSecret ?? '').trim(),
  }
}

export function collectFeishuInputErrors(raw) {
  const normalized = normalizeFeishuCredentials(raw)
  const errors = []

  if (!normalized.appId) errors.push('飞书 App ID 不能为空')
  if (!normalized.appSecret) errors.push('飞书 App Secret 不能为空')

  return {
    ...normalized,
    errors,
  }
}

/**
 * Normalize DingTalk credentials from UI aliases.
 * Accepts:
 * - clientId / appKey / robotCode (same source value)
 * - corpId / cropId
 * - clientSecret / appSecret
 * @param {any} raw
 * @returns {{clientId: string, clientSecret: string, robotCode: string, corpId: string}}
 */
export function normalizeDingtalkCredentials(raw) {
  const data = raw && typeof raw === 'object' ? raw : {}
  const rawClientId = String(
    data.clientId ?? data.appKey ?? ''
  ).trim()
  const rawRobotCode = String(
    data.robotCode ?? ''
  ).trim()
  const clientId = rawClientId || rawRobotCode
  const clientSecret = String(
    data.clientSecret ?? data.appSecret ?? ''
  ).trim()
  const corpId = String(
    data.corpId ?? data.cropId ?? ''
  ).trim()
  return {
    clientId,
    clientSecret,
    robotCode: rawRobotCode || rawClientId,
    corpId,
  }
}

export function collectDingtalkInputErrors(raw) {
  const normalized = normalizeDingtalkCredentials(raw)
  const errors = []

  if (!normalized.clientId) errors.push('钉钉 AppKey（Client ID / Robot Code）不能为空')
  if (!normalized.clientSecret) errors.push('钉钉 AppSecret（Client Secret）不能为空')

  return {
    ...normalized,
    errors,
  }
}

/**
 * Apply DingTalk UI-only metadata patch.
 * Explicit empty strings clear optional values; missing keys preserve current values.
 * @param {{corpId?: string, cropId?: string, robotCode?: string}} currentMeta
 * @param {{corpId?: string, cropId?: string, robotCode?: string}} [patch]
 * @returns {{corpId?: string, robotCode?: string}}
 */
export function applyDingtalkUiMetaPatch(currentMeta = {}, patch = {}) {
  const current = currentMeta && typeof currentMeta === 'object' ? currentMeta : {}
  const nextPatch = patch && typeof patch === 'object' ? patch : {}
  const hasCorpIdPatch = Object.prototype.hasOwnProperty.call(nextPatch, 'corpId')
    || Object.prototype.hasOwnProperty.call(nextPatch, 'cropId')
  const hasRobotCodePatch = Object.prototype.hasOwnProperty.call(nextPatch, 'robotCode')

  const corpId = hasCorpIdPatch
    ? String(nextPatch.corpId ?? nextPatch.cropId ?? '').trim()
    : String(current.corpId ?? current.cropId ?? '').trim()
  const robotCode = hasRobotCodePatch
    ? String(nextPatch.robotCode ?? '').trim()
    : String(current.robotCode ?? '').trim()

  return {
    ...(corpId ? { corpId } : {}),
    ...(robotCode ? { robotCode } : {}),
  }
}

/**
 * Merge UI meta back into DingTalk channel payload for frontend forms.
 * @param {any} channelCfg
 * @param {{corpId?: string, cropId?: string, robotCode?: string}} [dingtalkUiMeta]
 * @returns {any}
 */
export function enrichDingtalkChannelForUi(channelCfg, dingtalkUiMeta = {}) {
  if (!channelCfg || typeof channelCfg !== 'object') return channelCfg
  const meta = dingtalkUiMeta && typeof dingtalkUiMeta === 'object' ? dingtalkUiMeta : {}
  const clientId = String(channelCfg.clientId ?? '').trim()
  const robotCode = String(channelCfg.robotCode ?? '').trim() || String(meta.robotCode ?? '').trim() || clientId
  const corpId = String(channelCfg.corpId ?? channelCfg.cropId ?? '').trim() || String(meta.corpId ?? meta.cropId ?? '').trim()

  return {
    ...channelCfg,
    robotCode,
    ...(corpId ? { corpId } : {}),
  }
}

function buildCanonicalDeltaFromPairs(pairs) {
  return Object.fromEntries(pairs.filter(([, value]) => Boolean(value)))
}

export function buildChannelCanonicalEntry(raw) {
  const type = normalizeChannelType(raw)
  const enabled = isEnabledByDefault(raw)

  if (!type) {
    return {
      type,
      enabled,
      normalized: {},
      canonical: null,
      errors: ['渠道类型无效，请重新选择渠道'],
    }
  }

  if (type === 'feishu') {
    const result = collectFeishuInputErrors(raw)
    return {
      type,
      enabled,
      normalized: {
        appId: result.appId,
        appSecret: result.appSecret,
      },
      canonical: {
        type,
        enabled,
        core: {
          primaryId: result.appId,
          primarySecret: result.appSecret,
        },
        delta: {},
      },
      errors: result.errors,
    }
  }

  if (type === 'dingtalk') {
    const result = collectDingtalkInputErrors(raw)
    return {
      type,
      enabled,
      normalized: {
        clientId: result.clientId,
        clientSecret: result.clientSecret,
        robotCode: result.robotCode,
        corpId: result.corpId,
      },
      canonical: {
        type,
        enabled,
        core: {
          primaryId: result.clientId,
          primarySecret: result.clientSecret,
        },
        delta: buildCanonicalDeltaFromPairs([
          ['tenantId', result.corpId],
          ['displayCode', result.robotCode],
        ]),
      },
      errors: result.errors,
    }
  }

  if (type === 'wecom') {
    const result = collectWecomInputErrors(raw)
    return {
      type,
      enabled,
      normalized: {
        botId: result.botId,
        secret: result.secret,
        corpId: result.corpId,
        corpSecret: result.corpSecret,
        agentId: result.agentId,
        replyFormat: result.replyFormat,
        callbackToken: result.callbackToken,
        encodingAESKey: result.encodingAESKey,
        callbackPath: result.callbackPath,
        hasAnyAgentFields: result.hasAnyAgentFields,
        agentConfigured: result.agentConfigured,
        hasCallbackFields: result.hasCallbackFields,
        callbackConfigured: result.callbackConfigured,
      },
      canonical: {
        type,
        enabled,
        core: {
          primaryId: result.botId,
          primarySecret: result.secret,
        },
        delta: buildCanonicalDeltaFromPairs([
          ['tenantId', result.corpId],
          ['agentSecret', result.corpSecret],
          ['agentId', result.agentId],
          ['replyFormat', result.replyFormat],
          ['callbackToken', result.callbackToken],
          ['encodingAESKey', result.encodingAESKey],
          ['callbackPath', result.callbackPath],
        ]),
      },
      errors: result.errors,
    }
  }

  return {
    type,
    enabled,
    normalized: {},
    canonical: null,
    errors: [`Unknown channel type: ${type}`],
  }
}

export function collectChannelInputErrors(raw) {
  return buildChannelCanonicalEntry(raw).errors
}

function buildSet(path, value) {
  return { path, value }
}

export function buildChannelPersistPlan(raw) {
  const entry = buildChannelCanonicalEntry(raw)
  const plan = {
    ...entry,
    set: [],
    unset: [],
    uiMetaPatch: null,
  }

  if (entry.errors.length > 0) return plan

  if (entry.type === 'feishu') {
    const { appId, appSecret } = entry.normalized
    plan.set.push(
      buildSet('channels.feishu.enabled', 'true'),
      buildSet('channels.feishu.connectionMode', '"websocket"'),
      buildSet('channels.feishu.domain', '"feishu"'),
      buildSet('channels.feishu.appId', JSON.stringify(appId)),
      buildSet('channels.feishu.appSecret', JSON.stringify(appSecret)),
      buildSet('channels.feishu.dmPolicy', '"open"'),
      buildSet('channels.feishu.allowFrom', '["*"]'),
      buildSet('channels.feishu.requireMention', 'false'),
      buildSet('plugins.entries.feishu.enabled', 'true')
    )
    return plan
  }

  if (entry.type === 'dingtalk') {
    const { clientId, clientSecret, robotCode, corpId } = entry.normalized
    plan.set.push(
      buildSet('channels.dingtalk.enabled', 'true'),
      buildSet('channels.dingtalk.clientId', JSON.stringify(clientId)),
      buildSet('channels.dingtalk.clientSecret', JSON.stringify(clientSecret)),
      buildSet('channels.dingtalk.robotCode', JSON.stringify(robotCode)),
      buildSet('channels.dingtalk.connectionMode', '"stream"'),
      buildSet('channels.dingtalk.dmPolicy', '"open"'),
      buildSet('channels.dingtalk.allowFrom', '["*"]'),
      buildSet('channels.dingtalk.groupPolicy', '"open"'),
      buildSet('channels.dingtalk.requireMention', 'true'),
      buildSet('gateway.http.endpoints.chatCompletions.enabled', 'true')
    )
    plan.uiMetaPatch = { corpId, robotCode }
    return plan
  }

  if (entry.type === 'wecom') {
    const normalized = entry.normalized
    plan.set.push(
      buildSet('plugins.entries.wecom.enabled', 'true'),
      buildSet('channels.wecom.enabled', 'true'),
      buildSet('channels.wecom.botId', JSON.stringify(normalized.botId)),
      buildSet('channels.wecom.secret', JSON.stringify(normalized.secret)),
      buildSet('channels.wecom.dmPolicy', '"open"'),
      buildSet('channels.wecom.allowFrom', '["*"]'),
      buildSet('channels.wecom.groupPolicy', '"open"'),
      buildSet('channels.wecom.groupChat.enabled', 'true'),
      buildSet('channels.wecom.groupChat.requireMention', 'true'),
      buildSet('channels.wecom.groupChat.mentionPatterns', '["@"]')
    )
    plan.unset.push('channels.wecom.mode', 'channels.wecom.requireMention')

    if (normalized.agentConfigured) {
      plan.set.push(
        buildSet('channels.wecom.agent.corpId', JSON.stringify(normalized.corpId)),
        buildSet('channels.wecom.agent.corpSecret', JSON.stringify(normalized.corpSecret)),
        buildSet('channels.wecom.agent.agentId', String(normalized.agentId))
      )
      if (normalized.replyFormat) {
        plan.set.push(buildSet('channels.wecom.agent.replyFormat', JSON.stringify(normalized.replyFormat)))
      } else {
        plan.unset.push('channels.wecom.agent.replyFormat')
      }
    } else {
      plan.unset.push(
        'channels.wecom.agent.corpId',
        'channels.wecom.agent.corpSecret',
        'channels.wecom.agent.agentId',
        'channels.wecom.agent.replyFormat'
      )
    }

    if (normalized.callbackConfigured && normalized.agentConfigured) {
      plan.set.push(
        buildSet('channels.wecom.agent.callback.token', JSON.stringify(normalized.callbackToken)),
        buildSet('channels.wecom.agent.callback.encodingAESKey', JSON.stringify(normalized.encodingAESKey)),
        buildSet('channels.wecom.agent.callback.path', JSON.stringify(normalized.callbackPath))
      )
    } else {
      plan.unset.push(
        'channels.wecom.agent.callback.token',
        'channels.wecom.agent.callback.encodingAESKey',
        'channels.wecom.agent.callback.path'
      )
    }

    return plan
  }

  return plan
}

export function enrichChannelForUi(type, channelCfg, options = {}) {
  if (type === 'dingtalk') {
    return enrichDingtalkChannelForUi(channelCfg, options.dingtalkUiMeta)
  }
  if (type === 'wecom') {
    return enrichWecomChannelForUi(channelCfg)
  }
  return channelCfg
}

export function enrichChannelsForUi(channels, options = {}) {
  if (!channels || typeof channels !== 'object') return channels

  return Object.fromEntries(
    Object.entries(channels).map(([type, channelCfg]) => [
      type,
      enrichChannelForUi(type, channelCfg, options),
    ])
  )
}

export { normalizeWecomCredentials }

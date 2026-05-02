export const OPENAI_COMPAT_API = 'openai-completions'
export const CUSTOM_ROUTER_PROVIDER_ID = 'opensparrow-router'
export const CUSTOM_ROUTER_MODEL_ID = 'auto'
export const CUSTOM_ROUTER_MODEL_TARGET = `${CUSTOM_ROUTER_PROVIDER_ID}/${CUSTOM_ROUTER_MODEL_ID}`
export const CUSTOM_ROUTER_AUTH_PROFILE_ID = `${CUSTOM_ROUTER_PROVIDER_ID}:default`
export const CUSTOM_ROUTER_LOCAL_AUTH_KEY = 'opensparrow-router-local'
export const DEFAULT_CUSTOM_ROUTER_PORT = 8412
const ROUTER_DIAGNOSTIC_CHANNELS = new Set(['feishu', 'dingtalk', 'wecom'])

export const DEFAULT_CUSTOM_TIER_MODEL_MAP = Object.freeze({
  SIMPLE: 'gemini-2.0-flash-ssvip',
  MEDIUM: 'kimi-k2-0711-preview',
  COMPLEX: 'deepseek-r1-250528',
  REASONING: 'deepseek-r1-250528',
})

export function normalizeCustomRouterPort(value, fallback = DEFAULT_CUSTOM_ROUTER_PORT) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10)
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535 ? parsed : fallback
}

export function buildCustomRouterBaseUrl(port = DEFAULT_CUSTOM_ROUTER_PORT) {
  return `http://127.0.0.1:${normalizeCustomRouterPort(port)}/v1`
}

export function buildCustomRouterProviderConfig(options = {}) {
  return {
    baseUrl: buildCustomRouterBaseUrl(options.port),
    api: OPENAI_COMPAT_API,
    models: [
      {
        id: CUSTOM_ROUTER_MODEL_ID,
        name: CUSTOM_ROUTER_MODEL_ID,
        api: OPENAI_COMPAT_API,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      },
    ],
  }
}

export function buildCurlChatCompletionArgs(options = {}) {
  const baseUrl = String(options.baseUrl ?? '').trim().replace(/\/+$/, '')
  const apiKey = String(options.apiKey ?? '').trim()
  const payloadJson = String(options.payloadJson ?? '').trim()
  const args = [
    '--silent',
    '--show-error',
    '--location',
  ]
  if (options.stream) args.push('--no-buffer')
  args.push(
    '--header',
    'content-type: application/json',
    '--header',
    `authorization: Bearer ${apiKey}`,
    '--data',
    payloadJson,
    `${baseUrl}/chat/completions`,
  )
  return args
}

export function normalizeCustomTierModelMap(value = {}) {
  const next = { ...DEFAULT_CUSTOM_TIER_MODEL_MAP }
  for (const key of Object.keys(DEFAULT_CUSTOM_TIER_MODEL_MAP)) {
    const normalized = String(value?.[key] ?? '').trim()
    if (normalized) next[key] = normalized
  }
  return next
}

export function sanitizeDebugHeaderValue(value, maxLength = 512) {
  return String(value ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[^\t\x20-\x7e]+/g, '?')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

export function normalizeRouterDiagnosticChannel(value) {
  const normalized = String(value ?? '').trim().toLowerCase()
  return ROUTER_DIAGNOSTIC_CHANNELS.has(normalized) ? normalized : 'unknown'
}

export function buildCustomRouterUpstreamPayload(body = {}, model = '') {
  const next = body && typeof body === 'object' ? { ...body } : {}
  next.model = String(model ?? '').trim()
  return next
}

export function resolveRequestedMaxTokens(body = {}, fallback = 220) {
  const candidates = [
    body?.max_tokens,
    body?.max_completion_tokens,
    body?.max_output_tokens,
    fallback,
  ]
  for (const candidate of candidates) {
    const parsed = Number.parseInt(String(candidate ?? '').trim(), 10)
    if (Number.isInteger(parsed) && parsed > 0) return parsed
  }
  return fallback
}

export function extractProviderModelFromResponseText(value, fallback = '') {
  const matches = [...String(value ?? '').matchAll(/"model":"([^"]+)"/g)]
  return matches.at(-1)?.[1] || fallback
}

function collectMessageText(message = {}) {
  const parts = []
  const content = message?.content
  if (typeof content === 'string') {
    parts.push(content)
  } else if (Array.isArray(content)) {
    for (const block of content) {
      if (block?.type === 'text' && typeof block?.text === 'string') parts.push(block.text)
    }
  }
  return parts.join('\n').trim()
}

function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean))]
}

function getEnvelopeLines(value = '') {
  return String(value ?? '').split(/\r?\n/).map((line) => line.trim())
}

function isKnownChannelPrefixEnvelope(lines = []) {
  const firstNonEmptyIndex = lines.findIndex((line) => line)
  if (firstNonEmptyIndex === -1) return false
  if (!/^(feishu|dingtalk|wecom)\b/i.test(lines[firstNonEmptyIndex])) return false
  const metadataLimit = Math.min(lines.length, firstNonEmptyIndex + 8)
  const hasMetadataLine = lines
    .slice(firstNonEmptyIndex + 1, metadataLimit)
    .some((line) => /^(from|sender|conversation|chat|user|source)\s*:/i.test(line))
  const hasBodySeparator = lines.some((line, index) => index > firstNonEmptyIndex && !line)
  return hasMetadataLine && hasBodySeparator
}

function hasConversationInfoLine(lines = []) {
  return lines.some((line) => /^conversation info:?$/i.test(line))
}

function hasUntrustedMetadataLine(lines = []) {
  return lines.some((line) => /^untrusted metadata:?$/i.test(line))
}

function hasLiveWrapperPreambleLine(lines = []) {
  if (hasUntrustedMetadataLine(lines)) return true
  return lines.some((line) => (
    /\bconversation info\b/i.test(line)
    || /\b(?:channel|message)\s+(?:ingress|wrapper|control)\b/i.test(line)
    || /\b(?:ingress|wrapper|control)\s+(?:preamble|metadata)\b/i.test(line)
  ))
}

function hasKnownChannelLine(lines = []) {
  return lines.some((line) => /^channel\s*=\s*(feishu|dingtalk|wecom)\b/i.test(line))
}

function hasChannelEnvelopeMarkerLine(lines = []) {
  return lines.some((line) => (
    /^source\s*=\s*channel-envelope\b/i.test(line)
    || /^transport\s*=\s*channel-envelope\b/i.test(line)
  ))
}

function normalizeIdentifiedCurrentBody(value) {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text ? text : null
}

function detectExcludedInputCategories(value = '') {
  const text = String(value ?? '')
  const excluded = []
  if (
    /conversation info|channel-envelope|^\s*(feishu|dingtalk|wecom)\b/im.test(text)
    || /^\s*channel\s*=\s*(feishu|dingtalk|wecom)\b/im.test(text)
  ) {
    excluded.push('channel-envelope')
  }
  if (
    /untrusted metadata|^\s*metadata\s*:/im.test(text)
    || (/conversation info/i.test(text) && /```json/i.test(text))
  ) {
    excluded.push('json-metadata')
  }
  if (/"\s*history\s*"|^\s*history\s*:/im.test(text)) excluded.push('history')
  if (/\btool(?:s)?\b|tool descriptions?/i.test(text)) excluded.push('tool-context')
  if (/\bsystem context\b|^\s*system\s*:/im.test(text)) excluded.push('system-context')
  return uniqueValues(excluded)
}

function getFencedJsonBlocks(value = '') {
  const blocks = []
  const pattern = /```json\s*([\s\S]*?)```/gi
  let match
  while ((match = pattern.exec(String(value ?? ''))) !== null) {
    blocks.push({
      raw: match[1] ?? '',
      endIndex: pattern.lastIndex,
    })
  }
  return blocks
}

function hasKnownLiveWrapperMarker(value, depth = 0) {
  if (value === null || value === undefined || depth > 4) return false
  if (typeof value === 'string') {
    return /\b(?:packaged-live-channel|live-channel-ingress|channel-ingress|message-plugin|external-message-plugin|channel-envelope|feishu-openclaw-plugin|dingtalk-openclaw-plugin|wecom-openclaw-plugin)\b/i.test(value)
  }
  if (Array.isArray(value)) return value.some((item) => hasKnownLiveWrapperMarker(item, depth + 1))
  if (typeof value === 'object') {
    return Object.entries(value).some(([key, item]) => (
      hasKnownLiveWrapperMarker(key, depth + 1)
      || hasKnownLiveWrapperMarker(item, depth + 1)
    ))
  }
  return false
}

function hasLiveWrapperJsonShape(value) {
  if (Array.isArray(value)) return value.some((item) => hasLiveWrapperJsonShape(item))
  if (!value || typeof value !== 'object') return false
  const entries = Object.entries(value)
  const keys = new Set(entries.map(([key]) => key.toLowerCase()))

  const hasWrapperObject = keys.has('wrapper') || keys.has('envelope')
  const hasTransport = value.transport && typeof value.transport === 'object'
  const hasRequest = value.request && typeof value.request === 'object'
  const hasHistory = Array.isArray(value.history)
  const hasConversation = value.conversation && typeof value.conversation === 'object'
  const hasSession = Boolean(value.session) || Boolean(value.transport?.session)
  const hasMessage = value.message && typeof value.message === 'object'
  const hasSenderLike = keys.has('sender') || keys.has('senderid') || keys.has('chat') || keys.has('event')
  const structuralSignals = [
    hasWrapperObject,
    hasTransport,
    hasRequest,
    hasHistory,
    hasConversation,
    hasSession,
    hasMessage,
    hasSenderLike,
  ].filter(Boolean).length
  const hasKnownMarker = hasKnownLiveWrapperMarker(value)

  if (hasKnownMarker && structuralSignals >= 2) return true

  for (const [key, item] of entries) {
    const normalizedKey = key.toLowerCase()
    if (normalizedKey === 'metadata' || normalizedKey === 'debug' || normalizedKey === 'channel') continue
    if (item && typeof item === 'object' && hasLiveWrapperJsonShape(item)) return true
  }
  return false
}

function hasFeishuLiveConversationJsonShape(value) {
  if (Array.isArray(value)) return value.some((item) => hasFeishuLiveConversationJsonShape(item))
  if (!value || typeof value !== 'object') return false
  const keys = new Set(Object.keys(value).map((key) => key.toLowerCase()))
  const hasChatId = keys.has('chat_id') || keys.has('chatid')
  const hasMessageId = keys.has('message_id') || keys.has('messageid')
  const hasSender = keys.has('sender_id') || keys.has('senderid') || keys.has('sender')
  const hasTimestamp = keys.has('timestamp') || keys.has('create_time') || keys.has('createtime')
  return hasChatId && hasMessageId && hasSender && hasTimestamp
}

function hasFeishuLiveSenderJsonShape(value) {
  if (Array.isArray(value)) return value.some((item) => hasFeishuLiveSenderJsonShape(item))
  if (!value || typeof value !== 'object') return false
  const keys = new Set(Object.keys(value).map((key) => key.toLowerCase()))
  return keys.has('id') && keys.has('label') && keys.has('name')
}

function hasFeishuLiveConversationFencedJsonStructure(value = '') {
  const parsedBlocks = []
  for (const block of getFencedJsonBlocks(value)) {
    try {
      parsedBlocks.push(JSON.parse(block.raw))
    } catch {
      // Ignore malformed fences; live wrapper detection requires valid JSON.
    }
  }
  return parsedBlocks.some((block) => hasFeishuLiveConversationJsonShape(block))
    && parsedBlocks.some((block) => hasFeishuLiveSenderJsonShape(block))
}

function hasFencedJsonWrapperStructure(value = '') {
  for (const block of getFencedJsonBlocks(value)) {
    try {
      const parsed = JSON.parse(block.raw)
      if (hasLiveWrapperJsonShape(parsed)) return true
    } catch {
      // Ignore malformed fences; live wrapper detection requires valid JSON.
    }
  }
  return false
}

function extractAfterLastFencedJsonBlock(value = '') {
  const text = String(value ?? '')
  const blocks = getFencedJsonBlocks(text)
  if (blocks.length === 0) return null
  return text.slice(blocks.at(-1).endIndex).trim()
}

function extractAfterLatestUserMarker(value = '') {
  const text = String(value ?? '')
  const markerPattern = /(?:^|\n)\s*(?:latest user message|current user message|current user text|current turn user text|user message)\s*:\s*/gi
  let match
  let lastIndex = -1
  while ((match = markerPattern.exec(text)) !== null) {
    lastIndex = match.index + match[0].length
  }
  if (lastIndex === -1) return null
  return text.slice(lastIndex).trim()
}

function extractAfterChannelPrefix(value = '') {
  const text = String(value ?? '')
  const lines = text.split(/\r?\n/)
  if (!/^\s*(feishu|dingtalk|wecom)\b/i.test(lines[0] ?? '')) return null
  const metadataLimit = Math.min(lines.length, 8)
  const hasMetadataLine = lines
    .slice(1, metadataLimit)
    .some((line) => /^\s*(from|sender|conversation|chat|user|source)\s*:/i.test(line))
  if (!hasMetadataLine) return null
  const blankIndex = lines.findIndex((line, index) => index > 0 && !line.trim())
  if (blankIndex === -1) return null
  return lines.slice(blankIndex + 1).join('\n').trim()
}

function detectKnownChannelEnvelope(value = '') {
  const rawText = String(value ?? '').trim()
  if (!rawText) return null

  const lines = getEnvelopeLines(rawText)
  const channelPrefixedText = isKnownChannelPrefixEnvelope(lines)
    ? normalizeIdentifiedCurrentBody(extractAfterChannelPrefix(rawText))
    : null
  if (channelPrefixedText !== null) {
    return {
      text: channelPrefixedText,
      excludedInputCategories: uniqueValues([...detectExcludedInputCategories(rawText), 'channel-envelope']),
    }
  }

  const hasExplicitEnvelopePath = hasKnownChannelLine(lines) || hasChannelEnvelopeMarkerLine(lines)
  if (hasExplicitEnvelopePath) {
    const markedText = normalizeIdentifiedCurrentBody(extractAfterLatestUserMarker(rawText))
    if (markedText !== null) {
      return {
        text: markedText,
        excludedInputCategories: detectExcludedInputCategories(rawText),
      }
    }

    const textAfterFence = normalizeIdentifiedCurrentBody(extractAfterLastFencedJsonBlock(rawText))
    if (textAfterFence !== null) {
      return {
        text: textAfterFence,
        excludedInputCategories: detectExcludedInputCategories(rawText),
      }
    }

    return null
  }

  const hasLiveCompatibleWrapper = (hasConversationInfoLine(lines) || hasLiveWrapperPreambleLine(lines))
    && (
      hasFencedJsonWrapperStructure(rawText)
      || hasFeishuLiveConversationFencedJsonStructure(rawText)
    )
  if (hasLiveCompatibleWrapper) {
    const textAfterFence = normalizeIdentifiedCurrentBody(extractAfterLastFencedJsonBlock(rawText))
    if (textAfterFence !== null) {
      return {
        text: textAfterFence,
        excludedInputCategories: detectExcludedInputCategories(rawText),
      }
    }
  }

  return null
}

function sanitizeCurrentUserText(rawPrompt = '') {
  const rawText = String(rawPrompt ?? '').trim()
  if (!rawText) {
    return {
      text: '',
      rawText,
      source: 'raw-current-user-text',
      excludedInputCategories: [],
    }
  }

  const detectedEnvelope = detectKnownChannelEnvelope(rawText)
  if (detectedEnvelope !== null) {
    return {
      text: detectedEnvelope.text,
      rawText,
      source: 'sanitized-current-user-text',
      excludedInputCategories: detectedEnvelope.excludedInputCategories,
    }
  }

  return {
    text: rawText,
    rawText,
    source: 'raw-current-user-text',
    excludedInputCategories: [],
  }
}

export function extractCurrentUserTextFromMessages(messages) {
  if (!Array.isArray(messages)) {
    return {
      text: '',
      rawText: '',
      source: 'raw-current-user-text',
      excludedInputCategories: [],
    }
  }
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (String(message?.role ?? '') !== 'user') continue
    const prompt = collectMessageText(message)
    if (prompt) return sanitizeCurrentUserText(prompt)
  }
  return {
    text: '',
    rawText: '',
    source: 'raw-current-user-text',
    excludedInputCategories: [],
  }
}

export function extractPromptFromMessages(messages) {
  return extractCurrentUserTextFromMessages(messages).text
}

function normalizeEvidenceComparable(value) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function normalizeEvidenceNumber(value) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10)
  return Number.isFinite(parsed) ? parsed : null
}

function compareEvidenceField(evidence = {}, active = {}, key) {
  if (key.endsWith('Port')) {
    const evidenceValue = normalizeEvidenceNumber(evidence[key])
    const activeValue = normalizeEvidenceNumber(active[key])
    return {
      key,
      present: evidenceValue !== null && activeValue !== null,
      matches: evidenceValue !== null && activeValue !== null && evidenceValue === activeValue,
    }
  }

  const evidenceValue = normalizeEvidenceComparable(evidence[key])
  const activeValue = normalizeEvidenceComparable(active[key])
  return {
    key,
    present: Boolean(evidenceValue) && Boolean(activeValue),
    matches: Boolean(evidenceValue) && Boolean(activeValue) && evidenceValue === activeValue,
  }
}

export function classifyChannelAuthorityEvidence(evidence = {}, active = {}) {
  const channel = normalizeRouterDiagnosticChannel(evidence?.channel)
  const reasons = []
  const instanceFields = ['packRoot', 'configPath', 'profile', 'uiPort', 'gatewayPort', 'routerPort']
  const authorityFields = ['provider', 'model']
  const instanceComparisons = instanceFields.map((key) => compareEvidenceField(evidence, active, key))
  const authorityComparisons = authorityFields.map((key) => compareEvidenceField(evidence, active, key))
  const evidenceEpoch = normalizeEvidenceNumber(evidence?.reloadEpoch)
  const activeEpoch = normalizeEvidenceNumber(active?.reloadEpoch)

  if (evidence?.preReload === true || (evidenceEpoch !== null && activeEpoch !== null && evidenceEpoch < activeEpoch)) {
    if (evidence?.preReload === true) reasons.push('pre-reload evidence is not current authority')
    if (evidenceEpoch !== null && activeEpoch !== null && evidenceEpoch < activeEpoch) {
      reasons.push('evidence reload epoch is older than the active instance')
    }
    return {
      accepted: false,
      ignored: true,
      channel,
      classification: 'stale_pre_reload_evidence',
      reasons,
      matchedInstanceFields: [],
    }
  }

  const missingFields = [...instanceComparisons, ...authorityComparisons]
    .filter((comparison) => !comparison.present)
    .map((comparison) => comparison.key)
  if (missingFields.length > 0) {
    return {
      accepted: false,
      ignored: true,
      channel,
      classification: 'ambiguous_evidence',
      reasons: [`missing active-instance authority fields: ${missingFields.join(',')}`],
      matchedInstanceFields: instanceComparisons.filter((comparison) => comparison.matches).map((comparison) => comparison.key),
    }
  }

  const mismatchedInstanceFields = instanceComparisons
    .filter((comparison) => !comparison.matches)
    .map((comparison) => comparison.key)
  if (mismatchedInstanceFields.length > 0) {
    return {
      accepted: false,
      ignored: true,
      channel,
      classification: 'stale_instance_evidence',
      reasons: [`active instance mismatch: ${mismatchedInstanceFields.join(',')}`],
      matchedInstanceFields: instanceComparisons.filter((comparison) => comparison.matches).map((comparison) => comparison.key),
    }
  }

  const mismatchedAuthorityFields = authorityComparisons
    .filter((comparison) => !comparison.matches)
    .map((comparison) => comparison.key)
  if (mismatchedAuthorityFields.length > 0) {
    return {
      accepted: false,
      ignored: true,
      channel,
      classification: 'stale_authority_evidence',
      reasons: [`current provider/model mismatch: ${mismatchedAuthorityFields.join(',')}`],
      matchedInstanceFields: instanceFields,
    }
  }

  return {
    accepted: true,
    ignored: false,
    channel,
    classification: 'current_authority',
    reasons: [],
    matchedInstanceFields: instanceFields,
  }
}

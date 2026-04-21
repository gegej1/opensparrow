export const OPENAI_COMPAT_API = 'openai-completions'
export const CUSTOM_ROUTER_PROVIDER_ID = 'opensparrow-router'
export const CUSTOM_ROUTER_MODEL_ID = 'auto'
export const CUSTOM_ROUTER_MODEL_TARGET = `${CUSTOM_ROUTER_PROVIDER_ID}/${CUSTOM_ROUTER_MODEL_ID}`
export const DEFAULT_CUSTOM_ROUTER_PORT = 8412

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

export function extractPromptFromMessages(messages) {
  if (!Array.isArray(messages)) return ''
  const parts = []
  for (const message of messages) {
    if (String(message?.role ?? '') !== 'user') continue
    const content = message?.content
    if (typeof content === 'string') {
      parts.push(content)
      continue
    }
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block?.type === 'text' && typeof block?.text === 'string') parts.push(block.text)
      }
    }
  }
  return parts.join('\n').trim()
}

export const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1'
export const OPENAI_COMPAT_API = 'openai-completions'

const OPENAI_ENDPOINT_SUFFIX_RE = /\/(chat\/completions|responses|models|completions|embeddings|audio\/transcriptions)$/i

/**
 * Normalize user-provided OpenAI-compatible base URL.
 * - Host-only input -> append /v1
 * - Endpoint input (e.g. .../chat/completions) -> trim to provider base
 * - Custom non-root path is preserved
 * @param {string | null | undefined} rawInput
 * @param {string} [fallback]
 * @returns {string}
 */
export function normalizeOpenAIBaseUrl(rawInput, fallback = DEFAULT_OPENAI_BASE_URL) {
  const fallbackValue = String(fallback || DEFAULT_OPENAI_BASE_URL).trim()
  const raw = String(rawInput ?? '').trim()
  if (!raw) return fallbackValue

  let candidate = raw
  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(candidate)
  if (!hasScheme && candidate.includes('.')) {
    candidate = `https://${candidate}`
  }

  let parsed
  try {
    parsed = new URL(candidate)
  } catch {
    return raw.replace(/\/+$/, '') || fallbackValue
  }

  if (!/^https?:$/i.test(parsed.protocol)) {
    return raw.replace(/\/+$/, '') || fallbackValue
  }

  let pathname = (parsed.pathname || '/').replace(/\/+$/, '')
  pathname = pathname.replace(OPENAI_ENDPOINT_SUFFIX_RE, '')

  if (!pathname || pathname === '/') pathname = '/v1'

  parsed.pathname = pathname
  parsed.search = ''
  parsed.hash = ''

  return parsed.toString().replace(/\/+$/, '')
}

/**
 * Build conservative base URL probe candidates.
 * The normalized base stays first; `/v1` is added only for custom non-root paths.
 * @param {string | null | undefined} rawInput
 * @param {string} [fallback]
 * @returns {string[]}
 */
export function buildOpenAIBaseUrlCandidates(rawInput, fallback = DEFAULT_OPENAI_BASE_URL) {
  const normalized = normalizeOpenAIBaseUrl(rawInput, fallback)
  const candidates = [normalized]

  try {
    const parsed = new URL(normalized)
    const pathname = (parsed.pathname || '').replace(/\/+$/, '')
    if (pathname && pathname !== '/v1' && !pathname.endsWith('/v1')) {
      candidates.push(`${normalized}/v1`)
    }
  } catch {
    // keep normalized only
  }

  return [...new Set(candidates)]
}

/**
 * @param {string | null | undefined} model
 * @returns {string}
 */
export function buildOpenAIModelTarget(model) {
  const trimmed = String(model ?? '').trim()
  if (!trimmed) return 'openai/'
  return trimmed.includes('/') ? trimmed : `openai/${trimmed}`
}

/**
 * @param {string | null | undefined} baseUrl
 * @param {string | null | undefined} model
 * @returns {{baseUrl: string, api: string, models: Array<{id: string, name: string, api: string}>}}
 */
export function buildOpenAIProviderConfig(baseUrl, model) {
  const normalizedBaseUrl = normalizeOpenAIBaseUrl(baseUrl)
  const normalizedModel = String(model ?? '').trim()

  return {
    baseUrl: normalizedBaseUrl,
    api: OPENAI_COMPAT_API,
    models: [{ id: normalizedModel, name: normalizedModel, api: OPENAI_COMPAT_API }],
  }
}

export const OPENAI_COMPAT_API = 'openai-completions'
export const CLAWROUTER_PROVIDER = 'clawrouter'
export const CLAWROUTER_MODEL_ID = 'blockrun/auto'
export const CLAWROUTER_MODEL_TARGET = `${CLAWROUTER_PROVIDER}/${CLAWROUTER_MODEL_ID}`
export const CLAWROUTER_AUTH_PROFILE = `${CLAWROUTER_PROVIDER}:default`
export const CLAWROUTER_API_KEY = 'x402'
export const DEFAULT_CLAWROUTER_PORT = 8402
export const DEFAULT_CLAWROUTER_VERSION = '0.12.149'

export function normalizePort(value, fallback = DEFAULT_CLAWROUTER_PORT) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535 ? parsed : fallback
}

export function buildClawRouterBaseUrl(port = DEFAULT_CLAWROUTER_PORT) {
  return `http://127.0.0.1:${normalizePort(port)}/v1`
}

export function buildClawRouterProviderConfig(options = {}) {
  const configuredBaseUrl = typeof options.baseUrl === 'string' ? options.baseUrl.trim() : ''
  const baseUrl = (configuredBaseUrl || buildClawRouterBaseUrl(options.port)).replace(/\/+$/, '')

  return {
    baseUrl,
    api: OPENAI_COMPAT_API,
    models: [
      {
        id: CLAWROUTER_MODEL_ID,
        name: CLAWROUTER_MODEL_ID,
        api: OPENAI_COMPAT_API,
      },
    ],
  }
}

export function normalizeFallbacks(items) {
  if (!Array.isArray(items)) return []

  const seen = new Set()
  const next = []

  for (const item of items) {
    const value = String(item ?? '').trim()
    if (!value || seen.has(value)) continue
    seen.add(value)
    next.push(value)
  }

  return next
}

export function mergeFallbacksForEnable(previousPrimary, previousFallbacks, target = CLAWROUTER_MODEL_TARGET) {
  const merged = normalizeFallbacks(previousFallbacks)
  const primary = String(previousPrimary ?? '').trim()
  if (primary && primary !== target && !merged.includes(primary)) {
    merged.push(primary)
  }
  return merged
}

function normalizeAuthProfiles(authData) {
  const source = authData && typeof authData === 'object' ? authData : {}
  const version = Number.isInteger(source.version) ? source.version : 1
  const profiles = source.profiles && typeof source.profiles === 'object' ? { ...source.profiles } : {}
  const order = source.order && typeof source.order === 'object' ? { ...source.order } : {}
  return { version, profiles, order }
}

export function mergeProviderAuth(authData, options = {}) {
  const provider = String(options.provider ?? CLAWROUTER_PROVIDER).trim() || CLAWROUTER_PROVIDER
  const apiKey = String(options.apiKey ?? CLAWROUTER_API_KEY).trim() || CLAWROUTER_API_KEY
  const profileId = String(options.profileId ?? `${provider}:default`).trim() || `${provider}:default`
  const current = normalizeAuthProfiles(authData)

  current.profiles[profileId] = {
    type: 'api_key',
    provider,
    key: apiKey,
  }

  const providerOrder = Array.isArray(current.order[provider])
    ? current.order[provider].map((item) => String(item ?? '').trim()).filter(Boolean)
    : []
  current.order[provider] = [profileId, ...providerOrder.filter((item) => item !== profileId)]

  return current
}

export function stripProviderAuth(authData, provider = CLAWROUTER_PROVIDER) {
  const current = normalizeAuthProfiles(authData)
  const nextProfiles = {}
  const nextOrder = {}
  const providerPrefix = `${provider}:`

  for (const [profileId, profile] of Object.entries(current.profiles)) {
    const profileProvider = String(profile?.provider ?? '').trim()
    if (profileProvider === provider || profileId.startsWith(providerPrefix)) continue
    nextProfiles[profileId] = profile
  }

  for (const [name, items] of Object.entries(current.order)) {
    if (name === provider) continue
    const filtered = Array.isArray(items)
      ? items.map((item) => String(item ?? '').trim()).filter((item) => item && nextProfiles[item])
      : []
    if (filtered.length > 0) nextOrder[name] = filtered
  }

  return {
    version: current.version,
    profiles: nextProfiles,
    order: nextOrder,
  }
}

export function buildRoutingStateSnapshot(input = {}) {
  return {
    version: 1,
    provider: CLAWROUTER_PROVIDER,
    modelTarget: CLAWROUTER_MODEL_TARGET,
    modelId: CLAWROUTER_MODEL_ID,
    port: normalizePort(input.port),
    routerVersion: String(input.routerVersion ?? DEFAULT_CLAWROUTER_VERSION).trim() || DEFAULT_CLAWROUTER_VERSION,
    enabledAt: String(input.enabledAt ?? new Date().toISOString()),
    proxyOwned: Boolean(input.proxyOwned),
    previousPrimary: String(input.previousPrimary ?? '').trim(),
    previousFallbacks: normalizeFallbacks(input.previousFallbacks),
    previousProviderConfig: input.previousProviderConfig ?? null,
    previousAuthProfiles: input.previousAuthProfiles ?? null,
  }
}

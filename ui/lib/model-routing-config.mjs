import fs from 'node:fs'
import path from 'node:path'

import {
  CUSTOM_ROUTER_MODEL_TARGET,
  CUSTOM_ROUTER_PROVIDER_ID,
  normalizeCustomTierModelMap,
} from '../../scripts/model-routing/lib/custom-plugin-routing.mjs'

const TIER_KEYS = Object.freeze(['SIMPLE', 'MEDIUM', 'COMPLEX', 'REASONING'])
const OPENAI_AUTH_PROFILE_ID = 'openai:default'

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function readJsonFile(filePath, fallback) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return fallback
    const raw = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function writeJsonFile(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

function cloneJson(value, fallback) {
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return fallback
  }
}

function stripOpenAIProviderPrefix(rawValue) {
  const value = String(rawValue ?? '').trim()
  if (!value) return ''
  if (value.startsWith('openai/')) return value.slice('openai/'.length).trim()
  return value
}

function normalizeOpenAIBaseUrl(rawInput, fallback = '') {
  const fallbackValue = String(fallback ?? '').trim()
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
  pathname = pathname.replace(
    /\/(chat\/completions|responses|models|completions|embeddings|audio\/transcriptions)$/i,
    ''
  )
  if (!pathname || pathname === '/') pathname = '/v1'

  parsed.pathname = pathname
  parsed.search = ''
  parsed.hash = ''

  return parsed.toString().replace(/\/+$/, '')
}

function normalizePrimaryModel(rawValue, fallback = '') {
  const value = String(rawValue ?? '').trim()
  if (!value) return fallback
  if (value.includes('/')) return value
  return `openai/${value}`
}

function readOpenAIProvider(config = {}) {
  return isPlainObject(config?.models?.providers?.openai) ? config.models.providers.openai : {}
}

function readOpenAIProviderModelId(config = {}) {
  const openai = readOpenAIProvider(config)
  const modelId = Array.isArray(openai.models) ? openai.models[0]?.id : ''
  return stripOpenAIProviderPrefix(modelId)
}

function readOpenAIAuthKey(auth = {}) {
  return String(auth?.profiles?.[OPENAI_AUTH_PROFILE_ID]?.key ?? '').trim()
}

function readSavedApiConnection(config = {}, auth = {}) {
  const openai = readOpenAIProvider(config)
  const baseUrl = String(openai.baseUrl ?? '').trim()
  const apiKey = readOpenAIAuthKey(auth)
  return {
    baseUrl,
    apiKey,
    baseUrlConfigured: Boolean(baseUrl),
    apiKeyConfigured: Boolean(apiKey),
    source: 'openai-provider',
  }
}

function readRouterEntry(config = {}) {
  return isPlainObject(config?.plugins?.entries?.[CUSTOM_ROUTER_PROVIDER_ID])
    ? config.plugins.entries[CUSTOM_ROUTER_PROVIDER_ID]
    : null
}

function readModelRoutingUiMeta(uiMeta = {}) {
  return isPlainObject(uiMeta?.modelRouting) ? uiMeta.modelRouting : {}
}

function resolveSingleModeDefaultModel(config = {}, uiMeta = {}, defaultModel = 'openai/gpt-4o-mini') {
  const fromUiMeta = stripOpenAIProviderPrefix(readModelRoutingUiMeta(uiMeta).singleModeDefaultModel)
  if (fromUiMeta) return fromUiMeta

  const currentPrimary = String(config?.agents?.defaults?.model?.primary ?? '').trim()
  if (currentPrimary && currentPrimary !== CUSTOM_ROUTER_MODEL_TARGET) {
    const fromPrimary = stripOpenAIProviderPrefix(currentPrimary)
    if (fromPrimary) return fromPrimary
  }

  const modelDefault = String(config?.models?.default ?? '').trim()
  if (modelDefault && modelDefault !== CUSTOM_ROUTER_MODEL_TARGET) {
    const fromDefault = stripOpenAIProviderPrefix(modelDefault)
    if (fromDefault) return fromDefault
  }

  const fromProvider = readOpenAIProviderModelId(config)
  if (fromProvider) return fromProvider

  return stripOpenAIProviderPrefix(defaultModel)
}

function buildEffectivePrimaryModel(config = {}, defaultModel = 'openai/gpt-4o-mini') {
  const currentPrimary = String(config?.agents?.defaults?.model?.primary ?? '').trim()
  if (currentPrimary) return currentPrimary

  const modelDefault = String(config?.models?.default ?? '').trim()
  if (modelDefault) return normalizePrimaryModel(modelDefault, defaultModel)

  const providerModelId = readOpenAIProviderModelId(config)
  if (providerModelId) return normalizePrimaryModel(providerModelId, defaultModel)

  return normalizePrimaryModel(defaultModel, 'openai/gpt-4o-mini')
}

function normalizeSingleModelInput(rawValue) {
  return stripOpenAIProviderPrefix(rawValue)
}

function normalizeRoutingObject(rawValue) {
  if (!isPlainObject(rawValue)) {
    return {
      value: null,
      errors: ['routing 必须为合法对象'],
    }
  }

  return {
    value: cloneJson(rawValue, {}),
    errors: [],
  }
}

function setNestedPath(target, keys, value) {
  let cursor = target
  for (let index = 0; index < keys.length - 1; index += 1) {
    const key = keys[index]
    if (!isPlainObject(cursor[key])) cursor[key] = {}
    cursor = cursor[key]
  }
  cursor[keys[keys.length - 1]] = value
}

function writeSingleModeUiMeta(uiMetaFile, model) {
  const currentUiMeta = readJsonFile(uiMetaFile, {}) ?? {}
  const currentModelRouting = readModelRoutingUiMeta(currentUiMeta)
  writeJsonFile(uiMetaFile, {
    ...currentUiMeta,
    modelRouting: {
      ...currentModelRouting,
      singleModeDefaultModel: model,
    },
  })
}

function writeOpenAIAuthProfile(authFile, currentAuth, apiKey) {
  const nextAuth = isPlainObject(currentAuth) ? cloneJson(currentAuth, {}) : {}
  const profiles = isPlainObject(nextAuth.profiles) ? nextAuth.profiles : {}
  const existingProfile = isPlainObject(profiles[OPENAI_AUTH_PROFILE_ID]) ? profiles[OPENAI_AUTH_PROFILE_ID] : {}
  const order = isPlainObject(nextAuth.order) ? nextAuth.order : {}
  const openaiOrder = Array.isArray(order.openai)
    ? order.openai.map((item) => String(item ?? '').trim()).filter(Boolean)
    : []
  if (!openaiOrder.includes(OPENAI_AUTH_PROFILE_ID)) openaiOrder.unshift(OPENAI_AUTH_PROFILE_ID)

  writeJsonFile(authFile, {
    ...nextAuth,
    version: Number.isInteger(nextAuth.version) ? nextAuth.version : 1,
    profiles: {
      ...profiles,
      [OPENAI_AUTH_PROFILE_ID]: {
        ...existingProfile,
        type: 'api_key',
        provider: 'openai',
        key: apiKey,
      },
    },
    order: {
      ...order,
      openai: openaiOrder,
    },
  })
}

function readBackingState(options = {}) {
  const config = readJsonFile(options.configFile, {}) ?? {}
  const auth = readJsonFile(options.authFile, {}) ?? {}
  const uiMeta = readJsonFile(options.uiMetaFile, {}) ?? {}
  return { config, auth, uiMeta }
}

function buildSingleReadback(config = {}, auth = {}, uiMeta = {}, defaultModel = 'openai/gpt-4o-mini') {
  const connection = readSavedApiConnection(config, auth)
  return {
    baseUrl: connection.baseUrl,
    model: resolveSingleModeDefaultModel(config, uiMeta, defaultModel),
    apiKeyConfigured: connection.apiKeyConfigured,
    source: connection.source,
  }
}

function buildTierReadback(routerConfig = {}, rawTierModelMap = {}, tier) {
  const tierConnectionMap = isPlainObject(routerConfig?.tierConnectionMap) ? routerConfig.tierConnectionMap : {}
  const current = isPlainObject(tierConnectionMap[tier]) ? tierConnectionMap[tier] : null

  if (current) {
    return {
      baseUrl: String(current.baseUrl ?? '').trim(),
      model: stripOpenAIProviderPrefix(current.model || rawTierModelMap?.[tier] || ''),
      apiKeyConfigured: Boolean(String(current.apiKey ?? '').trim()),
      source: 'tierConnectionMap',
    }
  }

  const legacyBaseUrl = String(routerConfig?.baseUrl ?? '').trim()
  const legacyApiKey = String(routerConfig?.apiKey ?? '').trim()
  const legacyModel = stripOpenAIProviderPrefix(rawTierModelMap?.[tier] ?? '')
  if (legacyBaseUrl || legacyApiKey || legacyModel) {
    return {
      baseUrl: legacyBaseUrl,
      model: legacyModel,
      apiKeyConfigured: Boolean(legacyApiKey),
      source: 'legacy-shared',
    }
  }

  return {
    baseUrl: '',
    model: '',
    apiKeyConfigured: false,
    source: 'empty',
  }
}

function buildTierReadbackMap(routerConfig = {}) {
  const rawTierModelMap = isPlainObject(routerConfig?.tierModelMap) ? routerConfig.tierModelMap : {}
  return Object.fromEntries(TIER_KEYS.map((tier) => [
    tier,
    buildTierReadback(routerConfig, rawTierModelMap, tier),
  ]))
}

function buildTierModelMapCompatibility(tierConnectionMap = {}) {
  const values = {}
  for (const tier of TIER_KEYS) {
    const model = stripOpenAIProviderPrefix(tierConnectionMap?.[tier]?.model ?? '')
    if (model) values[tier] = model
  }
  return normalizeCustomTierModelMap(values)
}

export function getModelRoutingConfig(options = {}) {
  const { config, auth, uiMeta } = readBackingState(options)
  const routerEntry = readRouterEntry(config)
  const routerConfig = isPlainObject(routerEntry?.config) ? routerEntry.config : {}
  const effectivePrimaryModel = buildEffectivePrimaryModel(config, options.defaultModel)
  const single = buildSingleReadback(config, auth, uiMeta, options.defaultModel)
  const tierConnectionMap = buildTierReadbackMap(routerConfig)
  const routing = isPlainObject(routerConfig?.routing) ? cloneJson(routerConfig.routing, {}) : {}

  return {
    ok: true,
    surface: 'model-configuration',
    mode: effectivePrimaryModel === CUSTOM_ROUTER_MODEL_TARGET ? 'smart' : 'single',
    single,
    smart: {
      tiers: cloneJson(tierConnectionMap, {}),
      routing,
    },
    tierConnectionMap: cloneJson(tierConnectionMap, {}),
    connection: {
      baseUrl: single.baseUrl,
      baseUrlConfigured: Boolean(single.baseUrl),
      apiKeyConfigured: single.apiKeyConfigured,
      source: single.source,
    },
    singleModeDefaultModel: single.model,
    tierModelMap: buildTierModelMapCompatibility(tierConnectionMap),
    routing,
    effectivePrimaryModel,
    router: {
      providerId: CUSTOM_ROUTER_PROVIDER_ID,
      modelTarget: CUSTOM_ROUTER_MODEL_TARGET,
      configPresent: Boolean(routerEntry && isPlainObject(routerEntry.config)),
    },
    compatibility: {
      legacyApiEndpointAvailable: true,
    },
  }
}

function normalizeSinglePayload(payload = {}, snapshot) {
  const baseUrl = normalizeOpenAIBaseUrl(payload.baseUrl, '')
  const model = normalizeSingleModelInput(payload.model ?? payload.singleModeDefaultModel)
  const incomingApiKey = String(payload.apiKey ?? '').trim()
  const existingApiKey = readOpenAIAuthKey(snapshot.auth)
  const errors = []

  if (!baseUrl) errors.push('baseUrl 不能为空')
  if (!model) errors.push('model 不能为空')
  if (!incomingApiKey && !existingApiKey) {
    errors.push('API Key 不能为空：不存在可保留的 OpenAI API Key')
  }

  return {
    value: errors.length === 0
      ? {
          baseUrl,
          apiKey: incomingApiKey || existingApiKey,
          apiKeyChanged: Boolean(incomingApiKey),
          model,
        }
      : null,
    errors,
  }
}

function normalizeSmartTierConnectionMap(rawValue, currentRouterConfig = {}) {
  if (!isPlainObject(rawValue)) {
    return {
      value: null,
      errors: ['tierConnectionMap 必须是对象'],
    }
  }

  const errors = []
  const extraTiers = Object.keys(rawValue).filter((key) => !TIER_KEYS.includes(key))
  if (extraTiers.length > 0) {
    errors.push(`tierConnectionMap 包含未知 tier：${extraTiers.join(', ')}`)
  }

  const currentTierConnectionMap = isPlainObject(currentRouterConfig?.tierConnectionMap)
    ? currentRouterConfig.tierConnectionMap
    : {}
  const legacySharedApiKey = String(currentRouterConfig?.apiKey ?? '').trim()
  const next = {}

  for (const tier of TIER_KEYS) {
    const rawTier = rawValue[tier]
    if (!isPlainObject(rawTier)) {
      errors.push(`tierConnectionMap.${tier} 必须是对象`)
      continue
    }

    const baseUrl = normalizeOpenAIBaseUrl(rawTier.baseUrl, '')
    const model = stripOpenAIProviderPrefix(rawTier.model)
    const incomingApiKey = String(rawTier.apiKey ?? '').trim()
    const existingTierApiKey = String(currentTierConnectionMap?.[tier]?.apiKey ?? '').trim()
    const apiKey = incomingApiKey || existingTierApiKey || legacySharedApiKey

    if (!baseUrl) errors.push(`tierConnectionMap.${tier}.baseUrl 不能为空`)
    if (!model) errors.push(`tierConnectionMap.${tier}.model 不能为空`)
    if (!apiKey) errors.push(`tierConnectionMap.${tier}.apiKey 不能为空：不存在可保留的 API Key`)

    next[tier] = {
      baseUrl,
      apiKey,
      model,
    }
  }

  return {
    value: errors.length === 0 ? next : null,
    errors,
  }
}

function persistSingleMode(options = {}, snapshot, payload = {}) {
  const normalized = normalizeSinglePayload(payload, snapshot)
  if (normalized.errors.length > 0) {
    return { ok: false, status: 400, errors: normalized.errors }
  }

  const { baseUrl, apiKey, apiKeyChanged, model } = normalized.value
  const nextConfig = cloneJson(snapshot.config, {})
  const openai = readOpenAIProvider(nextConfig)
  const currentModel = Array.isArray(openai.models) && isPlainObject(openai.models[0]) ? openai.models[0] : {}

  setNestedPath(nextConfig, ['models', 'providers', 'openai'], {
    ...openai,
    baseUrl,
    models: [
      {
        ...currentModel,
        id: model,
        name: model,
        api: String(currentModel.api ?? 'openai-completions').trim() || 'openai-completions',
      },
    ],
  })
  setNestedPath(nextConfig, ['models', 'default'], `openai/${model}`)
  setNestedPath(nextConfig, ['agents', 'defaults', 'model', 'primary'], `openai/${model}`)

  try {
    writeJsonFile(options.configFile, nextConfig)
    if (apiKeyChanged) {
      writeOpenAIAuthProfile(options.authFile, snapshot.auth, apiKey)
    }
    writeSingleModeUiMeta(options.uiMetaFile, model)
  } catch (error) {
    return {
      ok: false,
      status: 500,
      errors: [`单模型配置写入失败：${error instanceof Error ? error.message : String(error)}`],
    }
  }

  return {
    ok: true,
    status: 200,
    mode: 'single',
    effectivePrimaryModel: `openai/${model}`,
    message: '单模型配置已保存',
  }
}

function persistSmartMode(options = {}, snapshot, payload = {}) {
  const routerEntry = readRouterEntry(snapshot.config)
  const currentEntryConfig = isPlainObject(routerEntry?.config) ? routerEntry.config : {}
  const normalizedTierConnectionMap = normalizeSmartTierConnectionMap(payload.tierConnectionMap, currentEntryConfig)
  const normalizedRouting = normalizeRoutingObject(payload.routing)
  const errors = [...normalizedTierConnectionMap.errors, ...normalizedRouting.errors]
  if (errors.length > 0) {
    return { ok: false, status: 400, errors }
  }

  const tierConnectionMap = normalizedTierConnectionMap.value
  const tierModelMap = Object.fromEntries(TIER_KEYS.map((tier) => [tier, tierConnectionMap[tier].model]))

  const nextConfig = cloneJson(snapshot.config, {})
  const currentPlugins = isPlainObject(nextConfig.plugins) ? nextConfig.plugins : {}
  const currentEntries = isPlainObject(currentPlugins.entries) ? currentPlugins.entries : {}
  const currentEntry = isPlainObject(currentEntries[CUSTOM_ROUTER_PROVIDER_ID]) ? currentEntries[CUSTOM_ROUTER_PROVIDER_ID] : {}
  const {
    baseUrl: _legacyBaseUrl,
    apiKey: _legacyApiKey,
    ...currentEntryConfigWithoutLegacySharedConnection
  } = isPlainObject(currentEntry.config) ? currentEntry.config : {}
  const allow = Array.isArray(currentPlugins.allow)
    ? currentPlugins.allow.map((item) => String(item ?? '').trim()).filter(Boolean)
    : []
  if (!allow.includes(CUSTOM_ROUTER_PROVIDER_ID)) allow.push(CUSTOM_ROUTER_PROVIDER_ID)

  nextConfig.plugins = {
    ...currentPlugins,
    entries: {
      ...currentEntries,
      [CUSTOM_ROUTER_PROVIDER_ID]: {
        ...currentEntry,
        enabled: true,
        config: {
          ...currentEntryConfigWithoutLegacySharedConnection,
          tierConnectionMap,
          tierModelMap,
          routing: normalizedRouting.value,
        },
      },
    },
    allow,
  }
  setNestedPath(nextConfig, ['agents', 'defaults', 'model', 'primary'], CUSTOM_ROUTER_MODEL_TARGET)

  try {
    writeJsonFile(options.configFile, nextConfig)
  } catch (error) {
    return {
      ok: false,
      status: 500,
      errors: [`模型智能路由配置写入失败：${error instanceof Error ? error.message : String(error)}`],
    }
  }

  return {
    ok: true,
    status: 200,
    mode: 'smart',
    effectivePrimaryModel: CUSTOM_ROUTER_MODEL_TARGET,
    message: `模型智能路由已保存，主模型已切换到 ${CUSTOM_ROUTER_MODEL_TARGET}`,
  }
}

export function saveModelRoutingConfig(options = {}, payload = {}) {
  const snapshot = readBackingState(options)

  const mode = String(payload?.mode ?? '').trim().toLowerCase()
  if (mode === 'single') return persistSingleMode(options, snapshot, payload)
  if (mode === 'smart') return persistSmartMode(options, snapshot, payload)

  return {
    ok: false,
    status: 400,
    errors: ['mode 必须为 single 或 smart'],
  }
}

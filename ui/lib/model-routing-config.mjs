import fs from 'node:fs'
import path from 'node:path'

import {
  CUSTOM_ROUTER_MODEL_TARGET,
  CUSTOM_ROUTER_PROVIDER_ID,
  normalizeCustomTierModelMap,
} from '../../scripts/model-routing/lib/custom-plugin-routing.mjs'

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

function readSavedApiConnection(config = {}, auth = {}) {
  const openai = readOpenAIProvider(config)
  const baseUrl = String(openai.baseUrl ?? '').trim()
  const apiKey = String(auth?.profiles?.['openai:default']?.key ?? '').trim()
  return {
    baseUrl,
    apiKey,
    baseUrlConfigured: Boolean(baseUrl),
    apiKeyConfigured: Boolean(apiKey),
    source: 'last-saved-api-config',
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

  const fromProvider = readOpenAIProviderModelId(config)
  if (fromProvider) return fromProvider

  return stripOpenAIProviderPrefix(defaultModel)
}

function buildEffectivePrimaryModel(config = {}, defaultModel = 'openai/gpt-4o-mini') {
  const currentPrimary = String(config?.agents?.defaults?.model?.primary ?? '').trim()
  if (currentPrimary) return currentPrimary

  const providerModelId = readOpenAIProviderModelId(config)
  if (providerModelId) return normalizePrimaryModel(providerModelId, defaultModel)

  return normalizePrimaryModel(defaultModel, 'openai/gpt-4o-mini')
}

function buildValidationErrorsForSavedConnection(connection) {
  const errors = []
  if (!connection.baseUrlConfigured) errors.push('请先在上方 API 配置区保存 Base URL')
  if (!connection.apiKeyConfigured) errors.push('请先在上方 API 配置区保存 API Key')
  return errors
}

function normalizeSingleModelInput(rawValue) {
  return stripOpenAIProviderPrefix(rawValue)
}

function normalizeSmartTierModelMap(rawValue) {
  if (!isPlainObject(rawValue)) {
    return {
      value: null,
      errors: ['tierModelMap 必须是对象'],
    }
  }

  const keys = ['SIMPLE', 'MEDIUM', 'COMPLEX', 'REASONING']
  const next = {}
  const errors = []
  for (const key of keys) {
    const value = String(rawValue[key] ?? '').trim()
    if (!value) {
      errors.push(`tierModelMap.${key} 不能为空`)
      continue
    }
    next[key] = value
  }

  return {
    value: errors.length === 0 ? next : null,
    errors,
  }
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

function readBackingState(options = {}) {
  const config = readJsonFile(options.configFile, {}) ?? {}
  const auth = readJsonFile(options.authFile, {}) ?? {}
  const uiMeta = readJsonFile(options.uiMetaFile, {}) ?? {}
  return { config, auth, uiMeta }
}

export function getModelRoutingConfig(options = {}) {
  const { config, auth, uiMeta } = readBackingState(options)
  const connection = readSavedApiConnection(config, auth)
  const routerEntry = readRouterEntry(config)
  const routerConfig = isPlainObject(routerEntry?.config) ? routerEntry.config : {}
  const effectivePrimaryModel = buildEffectivePrimaryModel(config, options.defaultModel)

  return {
    ok: true,
    mode: effectivePrimaryModel === CUSTOM_ROUTER_MODEL_TARGET ? 'smart' : 'single',
    connection: {
      baseUrl: connection.baseUrl,
      baseUrlConfigured: connection.baseUrlConfigured,
      apiKeyConfigured: connection.apiKeyConfigured,
      source: connection.source,
    },
    singleModeDefaultModel: resolveSingleModeDefaultModel(config, uiMeta, options.defaultModel),
    tierModelMap: normalizeCustomTierModelMap(routerConfig?.tierModelMap),
    routing: isPlainObject(routerConfig?.routing) ? cloneJson(routerConfig.routing, {}) : {},
    effectivePrimaryModel,
    router: {
      providerId: CUSTOM_ROUTER_PROVIDER_ID,
      modelTarget: CUSTOM_ROUTER_MODEL_TARGET,
      configPresent: Boolean(routerEntry && isPlainObject(routerEntry.config)),
    },
  }
}

function persistSingleMode(options = {}, snapshot, payload = {}) {
  const singleModeDefaultModel = normalizeSingleModelInput(payload.singleModeDefaultModel)
  const errors = [
    ...buildValidationErrorsForSavedConnection(snapshot.connection),
  ]
  if (!singleModeDefaultModel) errors.push('singleModeDefaultModel 不能为空')
  if (errors.length > 0) {
    return { ok: false, status: 400, errors }
  }

  const nextConfig = cloneJson(snapshot.config, {})
  const openai = readOpenAIProvider(nextConfig)
  const currentModel = Array.isArray(openai.models) && isPlainObject(openai.models[0]) ? openai.models[0] : {}

  setNestedPath(nextConfig, ['models', 'providers', 'openai'], {
    ...openai,
    baseUrl: snapshot.connection.baseUrl || String(openai.baseUrl ?? '').trim(),
    models: [
      {
        ...currentModel,
        id: singleModeDefaultModel,
        name: singleModeDefaultModel,
        api: String(currentModel.api ?? 'openai-completions').trim() || 'openai-completions',
      },
    ],
  })
  setNestedPath(nextConfig, ['agents', 'defaults', 'model', 'primary'], `openai/${singleModeDefaultModel}`)

  try {
    writeJsonFile(options.configFile, nextConfig)
    writeSingleModeUiMeta(options.uiMetaFile, singleModeDefaultModel)
  } catch (error) {
    return {
      ok: false,
      status: 500,
      errors: [`普通单模型配置写入失败：${error instanceof Error ? error.message : String(error)}`],
    }
  }

  return {
    ok: true,
    status: 200,
    mode: 'single',
    effectivePrimaryModel: `openai/${singleModeDefaultModel}`,
    message: '普通单模型配置已保存',
  }
}

function persistSmartMode(options = {}, snapshot, payload = {}) {
  const errors = [
    ...buildValidationErrorsForSavedConnection(snapshot.connection),
  ]
  const normalizedTierModelMap = normalizeSmartTierModelMap(payload.tierModelMap)
  const normalizedRouting = normalizeRoutingObject(payload.routing)
  errors.push(...normalizedTierModelMap.errors, ...normalizedRouting.errors)
  if (errors.length > 0) {
    return { ok: false, status: 400, errors }
  }

  const nextConfig = cloneJson(snapshot.config, {})
  const currentPlugins = isPlainObject(nextConfig.plugins) ? nextConfig.plugins : {}
  const currentEntries = isPlainObject(currentPlugins.entries) ? currentPlugins.entries : {}
  const currentEntry = isPlainObject(currentEntries[CUSTOM_ROUTER_PROVIDER_ID]) ? currentEntries[CUSTOM_ROUTER_PROVIDER_ID] : {}
  const currentEntryConfig = isPlainObject(currentEntry.config) ? currentEntry.config : {}
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
          ...currentEntryConfig,
          baseUrl: snapshot.connection.baseUrl,
          apiKey: snapshot.connection.apiKey,
          tierModelMap: normalizedTierModelMap.value,
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
  snapshot.connection = readSavedApiConnection(snapshot.config, snapshot.auth)

  const mode = String(payload?.mode ?? '').trim().toLowerCase()
  if (mode === 'single') return persistSingleMode(options, snapshot, payload)
  if (mode === 'smart') return persistSmartMode(options, snapshot, payload)

  return {
    ok: false,
    status: 400,
    errors: ['mode 必须为 single 或 smart'],
  }
}

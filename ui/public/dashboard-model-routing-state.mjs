const ROUTING_TIERS = ['SIMPLE', 'MEDIUM', 'COMPLEX', 'REASONING']

export const SINGLE_MODE_SUCCESS_MESSAGE = '普通单模型配置已保存'
export const SMART_MODE_SUCCESS_MESSAGE = '模型智能路由已保存，主模型已切换到 opensparrow-router/auto'

function normalizeText(value) {
  return String(value ?? '').trim()
}

function cloneJson(value, fallback) {
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return fallback
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function stableJson(value) {
  try {
    return JSON.stringify(value)
  } catch {
    return ''
  }
}

function normalizeMode(value) {
  return normalizeText(value).toLowerCase() === 'smart' ? 'smart' : 'single'
}

function normalizeApiSavedSnapshot(snapshot = {}) {
  const baseUrl = normalizeText(snapshot.baseUrl)
  return {
    baseUrl,
    baseUrlConfigured: snapshot.baseUrlConfigured === true || Boolean(baseUrl),
    apiKeyConfigured: snapshot.apiKeyConfigured === true,
    source: 'last-saved-api-config',
  }
}

function normalizeTierModelMap(rawValue = {}) {
  const next = {}
  for (const tier of ROUTING_TIERS) {
    next[tier] = normalizeText(rawValue?.[tier])
  }
  return next
}

function formatRoutingText(value) {
  if (!isPlainObject(value)) return '{}'
  try {
    return `${JSON.stringify(value, null, 2)}`
  } catch {
    return '{}'
  }
}

function parseRoutingText(text) {
  const rawText = String(text ?? '')
  try {
    const parsed = JSON.parse(rawText)
    return {
      routingText: rawText,
      routingParsed: parsed,
      routingParseError: '',
      routingTopLevelObject: isPlainObject(parsed),
    }
  } catch (error) {
    return {
      routingText: rawText,
      routingParsed: null,
      routingParseError: error instanceof Error ? error.message : String(error),
      routingTopLevelObject: false,
    }
  }
}

function normalizeSavedConfig(savedConfig = {}) {
  const mode = normalizeMode(savedConfig.mode)
  const routing = isPlainObject(savedConfig.routing) ? cloneJson(savedConfig.routing, {}) : {}
  return {
    mode,
    singleModeDefaultModel: normalizeText(savedConfig.singleModeDefaultModel),
    tierModelMap: normalizeTierModelMap(savedConfig.tierModelMap),
    routing,
    routingText: formatRoutingText(routing),
    effectivePrimaryModel: normalizeText(savedConfig.effectivePrimaryModel),
    router: isPlainObject(savedConfig.router) ? cloneJson(savedConfig.router, {}) : {},
  }
}

function createDraftsFromSaved(saved) {
  const smartRoutingState = parseRoutingText(saved.routingText)
  return {
    single: {
      singleModeDefaultModel: saved.singleModeDefaultModel,
    },
    smart: {
      tierModelMap: cloneJson(saved.tierModelMap, normalizeTierModelMap()),
      ...smartRoutingState,
    },
  }
}

function extractErrorMessage(error) {
  if (Array.isArray(error)) return error.map((item) => normalizeText(item)).filter(Boolean).join(' | ')
  if (typeof error === 'string') return normalizeText(error)
  if (isPlainObject(error)) {
    if (typeof error.message === 'string' && error.message.trim()) return error.message.trim()
    if (Array.isArray(error.errors)) return extractErrorMessage(error.errors)
  }
  return '保存失败'
}

function buildConnectionView(snapshot, apiDraft = {}) {
  const draftBaseUrl = normalizeText(apiDraft.baseUrl)
  const draftApiKey = normalizeText(apiDraft.apiKey)
  const baseUrlDirty = draftBaseUrl !== snapshot.baseUrl
  const apiKeyDirty = draftApiKey.length > 0

  return {
    ...snapshot,
    hasSavedApiConfig: snapshot.baseUrlConfigured && snapshot.apiKeyConfigured,
    apiDraftDirty: baseUrlDirty || apiKeyDirty,
    showUnsavedDraftNotice: baseUrlDirty || apiKeyDirty,
  }
}

function buildSingleView(state, apiDraft) {
  const connection = buildConnectionView(state.apiSavedSnapshot, apiDraft)
  const singleModeDefaultModel = normalizeText(state.draft.single.singleModeDefaultModel)
  const modeChanged = state.mode !== state.saved.mode
  const dirty = modeChanged || singleModeDefaultModel !== state.saved.singleModeDefaultModel
  const disabledReasons = []

  if (!connection.baseUrlConfigured) disabledReasons.push('missingSavedBaseUrl')
  if (!connection.apiKeyConfigured) disabledReasons.push('missingSavedApiKey')
  if (!singleModeDefaultModel) disabledReasons.push('missingSingleModeDefaultModel')
  if (!dirty) disabledReasons.push('noDirtyChanges')
  if (state.saveState.loading) disabledReasons.push('saving')

  return {
    mode: 'single',
    connection,
    singleModeDefaultModel,
    dirty,
    saveDisabled: disabledReasons.length > 0,
    disabledReasons,
  }
}

function buildSmartView(state, apiDraft) {
  const connection = buildConnectionView(state.apiSavedSnapshot, apiDraft)
  const tierModelMap = normalizeTierModelMap(state.draft.smart.tierModelMap)
  const routingText = String(state.draft.smart.routingText ?? '')
  const routingParsed = state.draft.smart.routingParsed
  const routingParseError = normalizeText(state.draft.smart.routingParseError)
  const routingTopLevelObject = state.draft.smart.routingTopLevelObject === true
  const modeChanged = state.mode !== state.saved.mode
  const tierDirty = stableJson(tierModelMap) !== stableJson(state.saved.tierModelMap)

  let routingDirty = false
  if (routingParseError || !routingTopLevelObject) {
    routingDirty = routingText !== state.saved.routingText
  } else {
    routingDirty = stableJson(routingParsed) !== stableJson(state.saved.routing)
  }

  const dirty = modeChanged || tierDirty || routingDirty
  const disabledReasons = []

  if (!connection.baseUrlConfigured) disabledReasons.push('missingSavedBaseUrl')
  if (!connection.apiKeyConfigured) disabledReasons.push('missingSavedApiKey')
  for (const tier of ROUTING_TIERS) {
    if (!tierModelMap[tier]) disabledReasons.push(`missingTierModel:${tier}`)
  }
  if (routingParseError) disabledReasons.push('routingParseError')
  if (!routingParseError && !routingTopLevelObject) disabledReasons.push('routingTopLevelNotObject')
  if (!dirty) disabledReasons.push('noDirtyChanges')
  if (state.saveState.loading) disabledReasons.push('saving')

  return {
    mode: 'smart',
    connection,
    tierModelMap,
    routingText,
    routingParsed,
    routingParseError,
    routingTopLevelObject,
    dirty,
    saveDisabled: disabledReasons.length > 0,
    disabledReasons,
  }
}

export function createDashboardModelRoutingState(initial = {}) {
  const state = {
    mode: 'single',
    apiSavedSnapshot: normalizeApiSavedSnapshot(),
    saved: normalizeSavedConfig(),
    draft: createDraftsFromSaved(normalizeSavedConfig()),
    saveState: {
      loading: false,
      error: '',
      success: '',
    },

    replaceSavedConfig(savedConfig = {}) {
      this.saved = normalizeSavedConfig(savedConfig)
      this.mode = this.saved.mode
      this.draft = createDraftsFromSaved(this.saved)
      this.saveState = { loading: false, error: '', success: '' }
      this.setApiSavedSnapshot(savedConfig.connection)
      return this
    },

    setApiSavedSnapshot(snapshot = {}) {
      this.apiSavedSnapshot = normalizeApiSavedSnapshot(snapshot)
      return this.apiSavedSnapshot
    },

    setMode(mode) {
      this.mode = normalizeMode(mode)
      return this.mode
    },

    setSingleModeDefaultModel(value) {
      this.draft.single.singleModeDefaultModel = normalizeText(value)
      return this.draft.single.singleModeDefaultModel
    },

    setTierModel(tier, value) {
      const key = String(tier ?? '').trim().toUpperCase()
      if (!ROUTING_TIERS.includes(key)) return this.draft.smart.tierModelMap
      this.draft.smart.tierModelMap[key] = normalizeText(value)
      return this.draft.smart.tierModelMap
    },

    setRoutingText(text) {
      Object.assign(this.draft.smart, parseRoutingText(text))
      return this.draft.smart
    },

    getSingleView(context = {}) {
      return buildSingleView(this, context.apiDraft)
    },

    getSmartView(context = {}) {
      return buildSmartView(this, context.apiDraft)
    },

    getActiveView(context = {}) {
      return this.mode === 'smart' ? this.getSmartView(context) : this.getSingleView(context)
    },

    buildSavePayload(context = {}) {
      const activeView = this.getActiveView(context)
      if (activeView.saveDisabled) return null

      if (activeView.mode === 'single') {
        return {
          mode: 'single',
          singleModeDefaultModel: activeView.singleModeDefaultModel,
        }
      }

      return {
        mode: 'smart',
        tierModelMap: cloneJson(activeView.tierModelMap, normalizeTierModelMap()),
        routing: cloneJson(activeView.routingParsed, {}),
      }
    },

    beginSave() {
      this.saveState.loading = true
      this.saveState.error = ''
      this.saveState.success = ''
    },

    applySaveFailure(error) {
      this.saveState.loading = false
      this.saveState.success = ''
      this.saveState.error = extractErrorMessage(error)
      return this.saveState.error
    },

    applySaveSuccess(result = {}) {
      const mode = normalizeMode(result.mode || this.mode)
      this.saveState.loading = false
      this.saveState.error = ''
      this.saveState.success = normalizeText(result.message) || (mode === 'smart' ? SMART_MODE_SUCCESS_MESSAGE : SINGLE_MODE_SUCCESS_MESSAGE)
      this.saved.mode = mode
      this.saved.effectivePrimaryModel = normalizeText(result.effectivePrimaryModel) || this.saved.effectivePrimaryModel
      this.mode = mode

      if (mode === 'single') {
        this.saved.singleModeDefaultModel = normalizeText(this.draft.single.singleModeDefaultModel)
      } else {
        this.saved.tierModelMap = normalizeTierModelMap(this.draft.smart.tierModelMap)
        this.saved.routing = isPlainObject(this.draft.smart.routingParsed)
          ? cloneJson(this.draft.smart.routingParsed, {})
          : {}
        this.saved.routingText = formatRoutingText(this.saved.routing)
        Object.assign(this.draft.smart, parseRoutingText(this.saved.routingText))
      }

      return this.saveState.success
    },
  }

  state.replaceSavedConfig(initial.savedConfig ?? {})
  if (initial.apiSavedSnapshot) state.setApiSavedSnapshot(initial.apiSavedSnapshot)
  return state
}

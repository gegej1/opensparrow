(function attachDashboardModelRoutingState(globalScope) {
  const TIER_KEYS = ['SIMPLE', 'MEDIUM', 'COMPLEX', 'REASONING']

  const INVARIANTS = Object.freeze({
    providerId: 'opensparrow-router',
    modelTarget: 'opensparrow-router/auto',
  })

  const ENDPOINTS = Object.freeze({
    load: '/api/config/model-routing',
    save: '/api/config/model-routing',
  })

  const COMPATIBILITY_LANE = Object.freeze({
    title: '兼容 API 写入',
    description: '旧 /api/config/api 仅保留给兼容调用；模型配置以本页 /api/config/model-routing 为 authoritative surface。',
    hint: '高级路由 JSON 只编辑 routing object，不能修改 provider id 或 target。',
  })

  function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
  }

  function cloneJson(value, fallback) {
    try {
      return JSON.parse(JSON.stringify(value))
    } catch {
      return fallback
    }
  }

  function emptyTierConnection() {
    return {
      baseUrl: '',
      apiKey: '',
      model: '',
      apiKeyConfigured: false,
      source: 'empty',
    }
  }

  function emptyTierConnectionMap() {
    return Object.fromEntries(TIER_KEYS.map((tier) => [tier, emptyTierConnection()]))
  }

  function normalizeSingle(rawValue = {}) {
    return {
      baseUrl: String(rawValue?.baseUrl ?? '').trim(),
      apiKey: '',
      model: String(rawValue?.model ?? '').trim(),
      apiKeyConfigured: rawValue?.apiKeyConfigured === true,
      source: String(rawValue?.source ?? '').trim() || 'openai-provider',
    }
  }

  function normalizeTierConnection(rawValue = {}) {
    return {
      baseUrl: String(rawValue?.baseUrl ?? '').trim(),
      apiKey: '',
      model: String(rawValue?.model ?? '').trim(),
      apiKeyConfigured: rawValue?.apiKeyConfigured === true,
      source: String(rawValue?.source ?? '').trim() || 'empty',
    }
  }

  function normalizeTierConnectionMap(rawValue = {}) {
    const next = emptyTierConnectionMap()
    for (const tier of TIER_KEYS) {
      next[tier] = normalizeTierConnection(isPlainObject(rawValue?.[tier]) ? rawValue[tier] : {})
    }
    return next
  }

  function legacyTierConnectionMap(payload = {}) {
    const connection = isPlainObject(payload?.connection) ? payload.connection : {}
    const tierModelMap = isPlainObject(payload?.tierModelMap) ? payload.tierModelMap : {}
    const next = emptyTierConnectionMap()
    for (const tier of TIER_KEYS) {
      next[tier] = {
        baseUrl: String(connection.baseUrl ?? '').trim(),
        apiKey: '',
        model: String(tierModelMap[tier] ?? '').trim(),
        apiKeyConfigured: connection.apiKeyConfigured === true,
        source: connection.apiKeyConfigured === true || connection.baseUrlConfigured === true ? 'legacy-shared' : 'empty',
      }
    }
    return next
  }

  function formatRoutingText(value = {}) {
    const normalized = isPlainObject(value) ? cloneJson(value, {}) : {}
    return JSON.stringify(normalized, null, 2)
  }

  function extractError(payload = {}, status = null, fallback = '模型配置请求失败') {
    if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
      return payload.errors.map((item) => String(item ?? '').trim()).filter(Boolean).join('；')
    }
    if (typeof payload?.message === 'string' && payload.message.trim()) {
      return payload.message.trim()
    }
    if (typeof payload?.error === 'string' && payload.error.trim()) {
      return payload.error.trim()
    }
    if (Number.isInteger(status)) {
      return `${fallback}（HTTP ${status}）`
    }
    return fallback
  }

  function parseRoutingText(rawValue) {
    const source = String(rawValue ?? '').trim() || '{}'
    try {
      const parsed = JSON.parse(source)
      if (!isPlainObject(parsed)) {
        return {
          ok: false,
          error: '高级路由 JSON 顶层必须是对象',
          value: {},
        }
      }
      return {
        ok: true,
        error: '',
        value: cloneJson(parsed, {}),
      }
    } catch (error) {
      return {
        ok: false,
        error: `高级路由 JSON 解析失败：${error instanceof Error ? error.message : String(error)}`,
        value: {},
      }
    }
  }

  function shouldAutoExpandAdvanced(routingObject, parseResult) {
    if (parseResult && parseResult.ok === false) return true
    return isPlainObject(routingObject) && Object.keys(routingObject).length > 0
  }

  function buildInitialState() {
    return {
      loadState: 'idle',
      saving: false,
      error: '',
      saveError: '',
      routingError: '',
      mode: 'single',
      single: normalizeSingle(),
      tierConnectionMap: emptyTierConnectionMap(),
      routingText: '{}',
      advancedOpen: false,
      effectivePrimaryModel: '',
      router: {
        providerId: INVARIANTS.providerId,
        modelTarget: INVARIANTS.modelTarget,
        configPresent: false,
      },
      compatibilityLane: { ...COMPATIBILITY_LANE },
    }
  }

  function applyPayload(state, payload = {}) {
    const router = isPlainObject(payload?.router) ? payload.router : {}
    const providerId = String(router.providerId ?? INVARIANTS.providerId).trim() || INVARIANTS.providerId
    const modelTarget = String(router.modelTarget ?? INVARIANTS.modelTarget).trim() || INVARIANTS.modelTarget
    if (providerId !== INVARIANTS.providerId || modelTarget !== INVARIANTS.modelTarget) {
      throw new Error('检测到内部模型路由标识漂移，已拒绝加载非 authoritative routing state')
    }

    const smart = isPlainObject(payload?.smart) ? payload.smart : {}
    const tiers = isPlainObject(smart?.tiers)
      ? smart.tiers
      : (isPlainObject(payload?.tierConnectionMap) ? payload.tierConnectionMap : legacyTierConnectionMap(payload))
    const routingObject = isPlainObject(smart?.routing)
      ? cloneJson(smart.routing, {})
      : (isPlainObject(payload?.routing) ? cloneJson(payload.routing, {}) : {})
    const parseResult = parseRoutingText(JSON.stringify(routingObject))

    state.mode = String(payload?.mode ?? '').trim() === 'smart' ? 'smart' : 'single'
    state.single = normalizeSingle(isPlainObject(payload?.single) ? payload.single : {
      baseUrl: payload?.connection?.baseUrl,
      model: payload?.singleModeDefaultModel,
      apiKeyConfigured: payload?.connection?.apiKeyConfigured,
      source: payload?.connection?.source,
    })
    state.tierConnectionMap = normalizeTierConnectionMap(tiers)
    state.routingText = formatRoutingText(routingObject)
    state.routingError = ''
    state.advancedOpen = shouldAutoExpandAdvanced(routingObject, parseResult)
    state.effectivePrimaryModel = String(payload?.effectivePrimaryModel ?? '').trim()
    state.router = {
      providerId: INVARIANTS.providerId,
      modelTarget: INVARIANTS.modelTarget,
      configPresent: router.configPresent === true,
    }
    state.loadState = 'ready'
    state.error = ''
    state.saveError = ''
    state.compatibilityLane = { ...COMPATIBILITY_LANE }
    return state
  }

  function buildSavePayload(state = {}) {
    const mode = String(state?.mode ?? '').trim() === 'smart' ? 'smart' : 'single'
    if (mode === 'single') {
      const single = isPlainObject(state?.single) ? state.single : {}
      return {
        mode: 'single',
        baseUrl: String(single.baseUrl ?? '').trim(),
        apiKey: String(single.apiKey ?? '').trim(),
        model: String(single.model ?? '').trim(),
      }
    }

    const parseResult = parseRoutingText(state?.routingText)
    if (!parseResult.ok) {
      const error = new Error(parseResult.error)
      error.code = 'INVALID_ROUTING_JSON'
      throw error
    }

    const sourceMap = isPlainObject(state?.tierConnectionMap) ? state.tierConnectionMap : {}
    return {
      mode: 'smart',
      tierConnectionMap: Object.fromEntries(TIER_KEYS.map((tier) => {
        const connection = isPlainObject(sourceMap[tier]) ? sourceMap[tier] : {}
        return [tier, {
          baseUrl: String(connection.baseUrl ?? '').trim(),
          apiKey: String(connection.apiKey ?? '').trim(),
          model: String(connection.model ?? '').trim(),
        }]
      })),
      routing: parseResult.value,
    }
  }

  async function load(host) {
    const state = host.modelRouting
    state.loadState = 'loading'
    state.error = ''

    try {
      const response = await host.fetchWithTimeout(ENDPOINTS.load, {}, host.requestTimeout.status)
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.ok === false) {
        state.loadState = 'error'
        state.error = extractError(payload, response.status, '读取模型配置失败')
        return false
      }
      applyPayload(state, payload)
      return true
    } catch (error) {
      state.loadState = 'error'
      state.error = `读取模型配置失败：${error instanceof Error ? error.message : String(error)}`
      return false
    }
  }

  async function save(host) {
    const state = host.modelRouting
    state.saving = true
    state.saveError = ''
    state.routingError = ''

    let payload
    try {
      payload = buildSavePayload(state)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      state.routingError = message
      state.saveError = message
      if (typeof host.showToast === 'function') host.showToast(message, 'error')
      state.saving = false
      return false
    }

    try {
      const response = await host.fetchWithTimeout(ENDPOINTS.save, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }, host.requestTimeout.save)

      const result = await response.json().catch(() => ({}))
      if (!response.ok || result?.ok === false) {
        const message = extractError(result, response.status, '保存模型配置失败')
        state.saveError = message
        if (typeof host.showToast === 'function') host.showToast(message, 'error')
        return false
      }

      const reloaded = await load(host)
      const warning = typeof result?.warning === 'string' && result.warning.trim()
        ? `；告警：${result.warning.trim()}`
        : ''
      if (typeof host.showToast === 'function') {
        host.showToast(
          reloaded
            ? `模型配置已保存${warning}`
            : `模型配置已保存，但 authoritative 回读失败${warning}`,
          reloaded ? 'success' : 'error'
        )
      }
      return reloaded
    } catch (error) {
      state.saveError = `无法连接到服务：${error instanceof Error ? error.message : String(error)}`
      if (typeof host.showToast === 'function') host.showToast(state.saveError, 'error')
      return false
    } finally {
      state.saving = false
    }
  }

  globalScope.OpenSparrowDashboardModelRouting = {
    ENDPOINTS,
    INVARIANTS,
    TIER_KEYS,
    createInitialState: buildInitialState,
    buildSavePayload,
    applyPayload,
    load,
    save,
  }
})(window)

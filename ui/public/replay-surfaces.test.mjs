import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

function toPlain(value) {
  return JSON.parse(JSON.stringify(value))
}

function createResponse(payload, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    async json() {
      return payload
    },
  }
}

function extractInlineScript(relativePath) {
  const html = fs.readFileSync(path.resolve(relativePath), 'utf8')
  const matches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  if (matches.length === 0) {
    throw new Error(`No inline script found in ${relativePath}`)
  }
  return matches[matches.length - 1][1]
}

function loadPageFactory(relativePath, factoryName) {
  const context = {
    window: {
      location: {
        search: '',
        pathname: '/',
        href: '',
        replace(url) {
          this.href = url
        },
      },
      confirm: () => true,
    },
    globalThis: {},
    console,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
  }
  context.window.window = context.window
  context.window.globalThis = context.window
  context.globalThis = context.window
  vm.createContext(context)

  for (const helperPath of [
    'ui/public/wecom-helpers.js',
    'ui/public/channel-helpers.js',
    'ui/public/dashboard-model-routing-state.mjs',
  ]) {
    if (!fs.existsSync(path.resolve(helperPath))) continue
    const source = fs.readFileSync(path.resolve(helperPath), 'utf8')
    vm.runInContext(source, context)
  }
  vm.runInContext(extractInlineScript(relativePath), context)

  const factory = context[factoryName]
  if (typeof factory !== 'function') {
    throw new Error(`Factory ${factoryName} not found in ${relativePath}`)
  }

  return { context, factory }
}

test('wizard header uses a stable visible GTClaw brand mark without depending on logo.png', () => {
  const html = fs.readFileSync(path.resolve('ui/public/index.html'), 'utf8')

  assert.match(html, /\.brand-mark\s*\{[\s\S]*background:\s*linear-gradient\(135deg,\s*#1677FF,\s*#0958D9\)/)
  assert.match(html, /<span class="brand-mark" aria-hidden="true">GT<\/span>[\s\S]*<h1[^>]*>GTClaw<\/h1>/)
  assert.doesNotMatch(html, /<img\s+[^>]*src="logo\.png"/)
})

test('wizard init keeps API fields blank/default even when authoritative config exists', async () => {
  const { context, factory } = loadPageFactory('ui/public/index.html', 'wizard')
  context.window.location.search = '?force=1'
  context.window.location.pathname = '/setup'

  const instance = factory()
  instance.$nextTick = (fn) => (typeof fn === 'function' ? fn() : undefined)

  const calls = []
  instance.fetchWithTimeout = async (url) => {
    calls.push(url)
    if (url === '/api/status') {
      return createResponse({ installed: true, daemon: 'running' })
    }
    if (url === '/api/config') {
      return createResponse({
        channels: {
          dingtalk: {
            enabled: false,
            corpId: 'ding-corp',
            clientId: 'ding-client',
            clientSecret: 'ding-secret',
          },
          wecom: {
            enabled: true,
            botId: 'aib_demo',
            secret: 'bot-secret',
          },
        },
        models: {
          providers: {
            openai: {
              baseUrl: 'https://example.test/v1',
              models: [{ id: 'gpt-4o-mini' }],
            },
          },
        },
      })
    }
    throw new Error(`Unexpected request: ${url}`)
  }

  await instance.init()

  assert.deepEqual(Array.from(instance.selectedChannels), ['dingtalk', 'wecom'])
  assert.equal(instance.credentials.dingtalk.corpId, 'ding-corp')
  assert.equal(instance.credentials.dingtalk.clientId, 'ding-client')
  assert.equal(instance.credentials.dingtalk.robotCode, 'ding-client')
  assert.equal(instance.credentials.wecom.botId, 'aib_demo')
  assert.equal(instance.apiConfig.baseUrl, '')
  assert.equal(instance.apiConfig.model, 'gpt-4o-mini')
  assert.equal(context.window.location.href, '')
  assert.deepEqual(calls, ['/api/status', '/api/config'])
})

test('wizard init redirects to dashboard when gateway fallback runtime is already healthy', async () => {
  const { context, factory } = loadPageFactory('ui/public/index.html', 'wizard')
  context.window.location.search = '?launch=abc123'
  const instance = factory()
  instance.$nextTick = (fn) => (typeof fn === 'function' ? fn() : undefined)

  const calls = []
  instance.fetchWithTimeout = async (url) => {
    calls.push(url)
    if (url === '/api/status') {
      return createResponse({
        installed: true,
        daemon: 'stopped',
        runtimeMode: 'gateway-fallback',
        gatewayHealthy: true,
      })
    }
    throw new Error(`Unexpected request: ${url}`)
  }

  await instance.init()

  assert.equal(context.window.location.href, '/dashboard?launch=abc123')
  assert.deepEqual(calls, ['/api/status'])
})

test('dashboard loadConfig keeps API form blank even when authoritative config exists', async () => {
  const { factory } = loadPageFactory('ui/public/dashboard.html', 'dashboard')
  const instance = factory()
  instance.$nextTick = (fn) => (typeof fn === 'function' ? fn() : undefined)

  instance.fetchWithTimeout = async (url) => {
    if (url === '/api/config') {
      return createResponse({
        models: {
          providers: {
            openai: {
              baseUrl: 'https://example.test/v1',
              models: [{ id: 'gpt-5.4-mini' }],
            },
          },
        },
        channels: {
          feishu: {
            enabled: true,
            appId: 'server-app-id',
            appSecret: 'server-app-secret',
          },
        },
      })
    }
    throw new Error(`Unexpected request: ${url}`)
  }

  const loaded = await instance.loadConfig()

  assert.equal(loaded, true)
  assert.deepEqual(toPlain(instance.apiForm), { baseUrl: '', apiKey: '', model: '' })
  const feishu = instance.channelCards.find((entry) => entry.key === 'feishu')
  assert.equal(feishu.enabled, true)
  assert.equal(feishu.fields.appId, 'server-app-id')
  assert.equal(feishu.fields.appSecret, 'server-app-secret')
})

test('dashboard loadStatus reflects authoritative running truth without inventing a fake version', async () => {
  const { factory } = loadPageFactory('ui/public/dashboard.html', 'dashboard')
  const instance = factory()

  instance.fetchWithTimeout = async (url) => {
    if (url === '/api/status') {
      return createResponse({
        installed: true,
        daemon: 'running',
        gatewayHealthy: true,
        profile: 'gtclaw-portable',
        configPath: '~/.openclaw-gtclaw-portable/openclaw.json',
        gatewayPort: 18929,
      })
    }
    throw new Error(`Unexpected request: ${url}`)
  }

  const keepOnDashboard = await instance.loadStatus()

  assert.equal(keepOnDashboard, true)
  assert.equal(instance.serviceStatus, 'running')
  assert.equal(instance.serviceInfo.profile, 'gtclaw-portable')
  assert.equal(instance.serviceInfo.configPath, '~/.openclaw-gtclaw-portable/openclaw.json')
  assert.equal(instance.serviceInfo.port, '18929')
  assert.equal(instance.version, '—')
})

test('dashboard loadStatus marks status as unavailable instead of showing a stopped default when status fetch fails', async () => {
  const { factory } = loadPageFactory('ui/public/dashboard.html', 'dashboard')
  const instance = factory()

  instance.fetchWithTimeout = async () => {
    throw new Error('status unavailable')
  }

  const keepOnDashboard = await instance.loadStatus()

  assert.equal(keepOnDashboard, true)
  assert.equal(instance.serviceStatus, 'unknown')
  assert.equal(instance.version, '—')
  instance.clearStatusRecoveryTimer()
})

test('dashboard loadStatus auto-recovers from transient unavailable status to later backend truth', async () => {
  const { context, factory } = loadPageFactory('ui/public/dashboard.html', 'dashboard')
  const instance = factory()

  const originalSetTimeout = context.setTimeout
  const originalClearTimeout = context.clearTimeout
  const originalWindowSetTimeout = context.window.setTimeout
  const originalWindowClearTimeout = context.window.clearTimeout
  const scheduled = []
  let nextTimerId = 1

  context.setTimeout = (fn, delay) => {
    const id = nextTimerId
    nextTimerId += 1
    scheduled.push({ id, fn, delay })
    return id
  }
  context.clearTimeout = (id) => {
    const index = scheduled.findIndex((entry) => entry.id === id)
    if (index >= 0) scheduled.splice(index, 1)
  }
  context.window.setTimeout = context.setTimeout
  context.window.clearTimeout = context.clearTimeout

  let statusRequests = 0
  let activeRequests = 0
  let maxActiveRequests = 0
  instance.fetchWithTimeout = async (url) => {
    assert.equal(url, '/api/status')
    statusRequests += 1
    activeRequests += 1
    maxActiveRequests = Math.max(maxActiveRequests, activeRequests)
    try {
      if (statusRequests === 1) {
        throw new Error('transient status drop')
      }
      return createResponse({
        installed: true,
        daemon: 'running',
        runtimeMode: 'daemon',
        gatewayHealthy: true,
        version: '2026.3.23',
        profile: 'gtclaw-portable',
        configPath: '~/.openclaw-gtclaw-portable/openclaw.json',
        gatewayPort: 18929,
      })
    } finally {
      activeRequests -= 1
    }
  }

  try {
    const keepOnDashboard = await instance.loadStatus()

    assert.equal(keepOnDashboard, true)
    assert.equal(instance.statusLoadState, 'error')
    assert.equal(instance.serviceStatus, 'unknown')
    assert.equal(instance.serviceInfo.profile, '')
    assert.equal(instance.serviceInfo.configPath, '')
    assert.equal(instance.serviceInfo.port, '')
    assert.equal(scheduled.length, 1)
    assert.equal(maxActiveRequests, 1)

    await scheduled.shift().fn()

    assert.equal(statusRequests, 2)
    assert.equal(maxActiveRequests, 1)
    assert.equal(instance.statusLoadState, 'ready')
    assert.equal(instance.serviceStatus, 'running')
    assert.equal(instance.version, '2026.3.23')
    assert.equal(instance.serviceInfo.profile, 'gtclaw-portable')
    assert.equal(instance.serviceInfo.configPath, '~/.openclaw-gtclaw-portable/openclaw.json')
    assert.equal(instance.serviceInfo.port, '18929')
    assert.equal(instance.statusRecoveryTimer, null)
    assert.equal(instance.statusRecoveryInFlight, false)
    assert.equal(scheduled.length, 0)
  } finally {
    context.setTimeout = originalSetTimeout
    context.clearTimeout = originalClearTimeout
    context.window.setTimeout = originalWindowSetTimeout
    context.window.clearTimeout = originalWindowClearTimeout
  }
})

test('dashboard loadModelRoutingConfig uses unified readback and masks API keys', async () => {
  const { factory } = loadPageFactory('ui/public/dashboard.html', 'dashboard')
  const instance = factory()

  const requests = []
  instance.fetchWithTimeout = async (url) => {
    requests.push(url)
    if (url === '/api/config/model-routing') {
      return createResponse({
        ok: true,
        surface: 'model-configuration',
        mode: 'smart',
        single: {
          baseUrl: 'https://single.example/v1',
          model: 'single-model',
          apiKeyConfigured: true,
          apiKey: 'plain-single-key',
          source: 'openai-provider',
        },
        tierConnectionMap: {
          SIMPLE: { baseUrl: 'https://simple.example/v1', model: 'simple-model', apiKeyConfigured: true, apiKey: 'plain-simple-key', source: 'tierConnectionMap' },
          MEDIUM: { baseUrl: 'https://medium.example/v1', model: 'medium-model', apiKeyConfigured: true, apiKey: 'plain-medium-key', source: 'tierConnectionMap' },
          COMPLEX: { baseUrl: 'https://complex.example/v1', model: 'complex-model', apiKeyConfigured: true, apiKey: 'plain-complex-key', source: 'tierConnectionMap' },
          REASONING: { baseUrl: 'https://reasoning.example/v1', model: 'reasoning-model', apiKeyConfigured: true, apiKey: 'plain-reasoning-key', source: 'tierConnectionMap' },
        },
        smart: {
          tiers: {
            SIMPLE: { baseUrl: 'https://simple.example/v1', model: 'simple-model', apiKeyConfigured: true, apiKey: 'plain-simple-key', source: 'tierConnectionMap' },
            MEDIUM: { baseUrl: 'https://medium.example/v1', model: 'medium-model', apiKeyConfigured: true, apiKey: 'plain-medium-key', source: 'tierConnectionMap' },
            COMPLEX: { baseUrl: 'https://complex.example/v1', model: 'complex-model', apiKeyConfigured: true, apiKey: 'plain-complex-key', source: 'tierConnectionMap' },
            REASONING: { baseUrl: 'https://reasoning.example/v1', model: 'reasoning-model', apiKeyConfigured: true, apiKey: 'plain-reasoning-key', source: 'tierConnectionMap' },
          },
          routing: { default: 'SIMPLE' },
        },
        effectivePrimaryModel: 'opensparrow-router/auto',
        router: {
          providerId: 'opensparrow-router',
          modelTarget: 'opensparrow-router/auto',
          configPresent: true,
        },
      })
    }
    throw new Error(`Unexpected request: ${url}`)
  }

  const loaded = await instance.loadModelRoutingConfig()

  assert.equal(loaded, true)
  assert.deepEqual(requests, ['/api/config/model-routing'])
  assert.equal(instance.modelRouting.mode, 'smart')
  assert.equal(instance.modelRouting.router.providerId, 'opensparrow-router')
  assert.equal(instance.modelRouting.router.modelTarget, 'opensparrow-router/auto')
  assert.equal(instance.modelRouting.effectivePrimaryModel, 'opensparrow-router/auto')
  assert.equal(instance.modelRouting.single.baseUrl, 'https://single.example/v1')
  assert.equal(instance.modelRouting.single.model, 'single-model')
  assert.equal(instance.modelRouting.single.apiKey, '')
  assert.equal(instance.modelRouting.tierConnectionMap.SIMPLE.baseUrl, 'https://simple.example/v1')
  assert.equal(instance.modelRouting.tierConnectionMap.SIMPLE.model, 'simple-model')
  assert.equal(instance.modelRouting.tierConnectionMap.SIMPLE.apiKey, '')
  assert.equal(JSON.stringify(instance.modelRouting).includes('plain-simple-key'), false)
  assert.equal(JSON.stringify(instance.modelRouting).includes('plain-single-key'), false)
})

test('dashboard saveModelRoutingConfig sends single-mode payload and re-reads authoritative state', async () => {
  const { factory } = loadPageFactory('ui/public/dashboard.html', 'dashboard')
  const instance = factory()
  instance.showToast = () => {}

  instance.modelRouting.mode = 'single'
  instance.modelRouting.single.baseUrl = 'https://draft-single.example/v1'
  instance.modelRouting.single.apiKey = 'entered-single-key'
  instance.modelRouting.single.model = 'draft-model'

  const requests = []
  let postedPayload = null
  instance.fetchWithTimeout = async (url, options = {}) => {
    requests.push({ url, method: options.method ?? 'GET' })
    if (url === '/api/config/model-routing' && options.method === 'POST') {
      postedPayload = JSON.parse(options.body)
      return createResponse({
        ok: true,
        mode: 'single',
        effectivePrimaryModel: 'openai/draft-model',
        message: 'saved',
      })
    }
    if (url === '/api/config/model-routing') {
      return createResponse({
        ok: true,
        surface: 'model-configuration',
        mode: 'single',
        single: {
          baseUrl: 'https://authoritative.example/v1',
          model: 'server-model',
          apiKeyConfigured: true,
          source: 'openai-provider',
        },
        tierConnectionMap: {
          SIMPLE: { baseUrl: '', model: '', apiKeyConfigured: false, source: 'empty' },
          MEDIUM: { baseUrl: '', model: '', apiKeyConfigured: false, source: 'empty' },
          COMPLEX: { baseUrl: '', model: '', apiKeyConfigured: false, source: 'empty' },
          REASONING: { baseUrl: '', model: '', apiKeyConfigured: false, source: 'empty' },
        },
        smart: { tiers: {}, routing: {} },
        effectivePrimaryModel: 'openai/server-model',
        router: {
          providerId: 'opensparrow-router',
          modelTarget: 'opensparrow-router/auto',
          configPresent: false,
        },
      })
    }
    throw new Error(`Unexpected request: ${url}`)
  }

  const saved = await instance.saveModelRoutingConfig()

  assert.equal(saved, true)
  assert.deepEqual(postedPayload, {
    mode: 'single',
    baseUrl: 'https://draft-single.example/v1',
    apiKey: 'entered-single-key',
    model: 'draft-model',
  })
  assert.deepEqual(requests, [
    { url: '/api/config/model-routing', method: 'POST' },
    { url: '/api/config/model-routing', method: 'GET' },
  ])
  assert.equal(instance.modelRouting.single.model, 'server-model')
  assert.equal(instance.modelRouting.single.baseUrl, 'https://authoritative.example/v1')
  assert.equal(instance.modelRouting.single.apiKey, '')
  assert.equal(instance.modelRouting.effectivePrimaryModel, 'openai/server-model')
})

test('dashboard saveModelRoutingConfig sends smart-mode tier connections and re-reads authoritative state', async () => {
  const { factory } = loadPageFactory('ui/public/dashboard.html', 'dashboard')
  const instance = factory()
  instance.showToast = () => {}

  instance.modelRouting.mode = 'smart'
  for (const tier of ['SIMPLE', 'MEDIUM', 'COMPLEX', 'REASONING']) {
    instance.modelRouting.tierConnectionMap[tier].baseUrl = `https://${tier.toLowerCase()}.draft.example/v1`
    instance.modelRouting.tierConnectionMap[tier].apiKey = `${tier.toLowerCase()}-draft-key`
    instance.modelRouting.tierConnectionMap[tier].model = `${tier.toLowerCase()}-draft-model`
  }
  instance.modelRouting.routingText = '{"default":"SIMPLE"}'

  const requests = []
  let postedPayload = null
  instance.fetchWithTimeout = async (url, options = {}) => {
    requests.push({ url, method: options.method ?? 'GET' })
    if (url === '/api/config/model-routing' && options.method === 'POST') {
      postedPayload = JSON.parse(options.body)
      return createResponse({
        ok: true,
        mode: 'smart',
        effectivePrimaryModel: 'opensparrow-router/auto',
        message: 'saved',
      })
    }
    if (url === '/api/config/model-routing') {
      return createResponse({
        ok: true,
        surface: 'model-configuration',
        mode: 'smart',
        single: { baseUrl: '', model: '', apiKeyConfigured: false, source: 'openai-provider' },
        tierConnectionMap: {
          SIMPLE: { baseUrl: 'https://simple.authoritative.example/v1', model: 'simple-server-model', apiKeyConfigured: true, source: 'tierConnectionMap' },
          MEDIUM: { baseUrl: 'https://medium.authoritative.example/v1', model: 'medium-server-model', apiKeyConfigured: true, source: 'tierConnectionMap' },
          COMPLEX: { baseUrl: 'https://complex.authoritative.example/v1', model: 'complex-server-model', apiKeyConfigured: true, source: 'tierConnectionMap' },
          REASONING: { baseUrl: 'https://reasoning.authoritative.example/v1', model: 'reasoning-server-model', apiKeyConfigured: true, source: 'tierConnectionMap' },
        },
        smart: { routing: { default: 'SIMPLE' } },
        effectivePrimaryModel: 'opensparrow-router/auto',
        router: {
          providerId: 'opensparrow-router',
          modelTarget: 'opensparrow-router/auto',
          configPresent: true,
        },
      })
    }
    throw new Error(`Unexpected request: ${url}`)
  }

  const saved = await instance.saveModelRoutingConfig()

  assert.equal(saved, true)
  assert.deepEqual(requests, [
    { url: '/api/config/model-routing', method: 'POST' },
    { url: '/api/config/model-routing', method: 'GET' },
  ])
  assert.deepEqual(Object.keys(postedPayload.tierConnectionMap), ['SIMPLE', 'MEDIUM', 'COMPLEX', 'REASONING'])
  assert.equal(postedPayload.tierConnectionMap.SIMPLE.baseUrl, 'https://simple.draft.example/v1')
  assert.equal(postedPayload.tierConnectionMap.REASONING.model, 'reasoning-draft-model')
  assert.deepEqual(postedPayload.routing, { default: 'SIMPLE' })
  assert.equal(instance.modelRouting.tierConnectionMap.SIMPLE.baseUrl, 'https://simple.authoritative.example/v1')
  assert.equal(instance.modelRouting.tierConnectionMap.SIMPLE.model, 'simple-server-model')
  assert.equal(instance.modelRouting.tierConnectionMap.SIMPLE.apiKey, '')
})

test('dashboard saveChannelConfig refreshes card fields from authoritative read-back instead of local payload replay', async () => {
  const { factory } = loadPageFactory('ui/public/dashboard.html', 'dashboard')
  const instance = factory()
  instance.$nextTick = (fn) => (typeof fn === 'function' ? fn() : undefined)
  instance.showToast = () => {}

  const card = instance.channelCards.find((entry) => entry.key === 'dingtalk')
  card.enabled = true
  card.fields = {
    corpId: 'local-corp',
    clientId: 'local-client',
    robotCode: 'local-robot',
    clientSecret: 'local-secret',
  }

  instance.modal.channel = 'dingtalk'
  instance.modal.fields = {
    corpId: '',
    clientId: 'payload-client',
    robotCode: '',
    clientSecret: 'payload-secret',
  }

  const requests = []
  instance.fetchWithTimeout = async (url, options = {}) => {
    requests.push({ url, method: options.method ?? 'GET' })
    if (url === '/api/config/channels' && options.method === 'POST') {
      return createResponse({ ok: true })
    }
    if (url === '/api/config') {
      return createResponse({
        channels: {
          dingtalk: {
            enabled: true,
            corpId: 'server-corp',
            clientId: 'server-client',
            robotCode: 'server-robot',
            clientSecret: 'server-secret',
          },
        },
      })
    }
    if (url === '/api/dingtalk/probe' && options.method === 'POST') {
      return createResponse({
        ok: true,
        status: 'warning',
        ready: false,
        daemon: 'running',
        checks: ['钉钉渠道已启用'],
        warnings: ['仍需 fresh live verification'],
        errors: [],
        probe: {
          code: 0,
          summary: 'server probe unavailable',
        },
      })
    }
    throw new Error(`Unexpected request: ${url}`)
  }

  await instance.saveChannelConfig()

  const updated = instance.channelCards.find((entry) => entry.key === 'dingtalk')
  assert.equal(updated.fields.corpId, 'server-corp')
  assert.equal(updated.fields.clientId, 'server-client')
  assert.equal(updated.fields.robotCode, 'server-robot')
  assert.equal(updated.fields.clientSecret, 'server-secret')
  assert.equal(updated.diagnostics.status, 'warning')
  assert.equal(updated.diagnostics.probe.summary, 'server probe unavailable')
  assert.deepEqual(requests, [
    { url: '/api/config/channels', method: 'POST' },
    { url: '/api/config', method: 'GET' },
    { url: '/api/dingtalk/probe', method: 'POST' },
  ])
})

test('dashboard toggleChannel refreshes enabled state from authoritative read-back', async () => {
  const { factory } = loadPageFactory('ui/public/dashboard.html', 'dashboard')
  const instance = factory()
  instance.$nextTick = (fn) => (typeof fn === 'function' ? fn() : undefined)
  instance.showToast = () => {}

  const card = instance.channelCards.find((entry) => entry.key === 'feishu')
  card.enabled = false
  card.fields = {
    appId: 'local-app-id',
    appSecret: 'local-app-secret',
  }

  const requests = []
  instance.fetchWithTimeout = async (url, options = {}) => {
    requests.push({ url, method: options.method ?? 'GET' })
    if (url === '/api/config/channels' && options.method === 'POST') {
      return createResponse({ ok: true })
    }
    if (url === '/api/config') {
      return createResponse({
        channels: {
          feishu: {
            enabled: true,
            appId: 'server-app-id',
            appSecret: 'server-app-secret',
          },
        },
      })
    }
    throw new Error(`Unexpected request: ${url}`)
  }

  await instance.toggleChannel(card)

  const updated = instance.channelCards.find((entry) => entry.key === 'feishu')
  assert.equal(updated.enabled, true)
  assert.equal(updated.fields.appId, 'server-app-id')
  assert.equal(updated.fields.appSecret, 'server-app-secret')
  assert.deepEqual(requests, [
    { url: '/api/config/channels', method: 'POST' },
    { url: '/api/config', method: 'GET' },
  ])
})

test('wizard install keeps DingTalk probe evidence from packaged install response for follow-up verification', async () => {
  const { factory } = loadPageFactory('ui/public/index.html', 'wizard')
  const instance = factory()
  instance.$nextTick = (fn) => (typeof fn === 'function' ? fn() : undefined)

  instance.selectedChannels = ['dingtalk']
  instance.credentials.dingtalk = {
    corpId: 'ding-corp',
    clientId: 'ding-client',
    robotCode: 'ding-robot',
    clientSecret: 'ding-secret',
  }
  instance.apiConfig = {
    baseUrl: 'https://example.test/v1',
    apiKey: 'sk-test',
    model: 'gpt-4o-mini',
  }

  instance.fetchWithTimeout = async (url, options = {}) => {
    if (url === '/api/install' && options.method === 'POST') {
      return createResponse({
        ok: true,
        warnings: ['钉钉检测告警：daemon 当前状态：stopped'],
        dingtalkProbe: {
          status: 'warning',
          ready: false,
          daemon: 'stopped',
          checks: ['钉钉渠道已启用'],
          warnings: ['daemon 当前状态：stopped'],
          errors: [],
          probe: {
            code: 0,
            summary: 'channels.dingtalk enabled, configured',
          },
        },
      })
    }
    throw new Error(`Unexpected request: ${url}`)
  }

  await instance.startInstall()

  assert.equal(instance.installDone, true)
  assert.deepEqual(toPlain(instance.installReports.dingtalk), {
    status: 'warning',
    ready: false,
    daemon: 'stopped',
    checks: ['钉钉渠道已启用'],
    warnings: ['daemon 当前状态：stopped'],
    errors: [],
    probe: {
      code: 0,
      summary: 'channels.dingtalk enabled, configured',
    },
  })
})

test('wizard install redirects to dashboard after a successful install response completes', async () => {
  const { context, factory } = loadPageFactory('ui/public/index.html', 'wizard')
  context.window.location.search = '?launch=abc123'
  const instance = factory()
  instance.$nextTick = (fn) => (typeof fn === 'function' ? fn() : undefined)

  instance.selectedChannels = ['dingtalk']
  instance.credentials.dingtalk = {
    corpId: 'ding-corp',
    clientId: 'ding-client',
    robotCode: 'ding-robot',
    clientSecret: 'ding-secret',
  }

  instance.startInstallStatusPolling = () => {}
  instance.stopInstallStatusPolling = () => {}

  const originalSetTimeout = context.setTimeout
  const originalWindowSetTimeout = context.window.setTimeout
  context.setTimeout = (fn) => {
    if (typeof fn === 'function') fn()
    return 0
  }
  context.window.setTimeout = context.setTimeout

  instance.fetchWithTimeout = async (url, options = {}) => {
    if (url === '/api/install/status') {
      return createResponse({
        status: 'running',
        summary: '正在部署中',
        steps: [
          { key: 'plugins', status: 'running' },
        ],
      })
    }
    if (url === '/api/install' && options.method === 'POST') {
      return createResponse({
        ok: true,
        warnings: [],
        installStatus: {
          status: 'completed',
          summary: '安装完成，可导出诊断信息',
          steps: [
            { key: 'plugins', status: 'done' },
            { key: 'config', status: 'done' },
            { key: 'channels', status: 'done' },
            { key: 'runtime', status: 'done' },
            { key: 'probe', status: 'done' },
          ],
        },
      })
    }
    throw new Error(`Unexpected request: ${url}`)
  }

  try {
    await instance.startInstall()
    assert.equal(instance.installDone, true)
    assert.equal(context.window.location.href, '/dashboard?launch=abc123')
  } finally {
    context.setTimeout = originalSetTimeout
    context.window.setTimeout = originalWindowSetTimeout
  }
})

test('wizard redirects after timed-out install request when install status is already completed', async () => {
  const { context, factory } = loadPageFactory('ui/public/index.html', 'wizard')
  context.window.location.search = '?launch=timeoutcase'
  const instance = factory()
  instance.$nextTick = (fn) => (typeof fn === 'function' ? fn() : undefined)

  instance.selectedChannels = ['dingtalk']
  instance.credentials.dingtalk = {
    corpId: 'ding-corp',
    clientId: 'ding-client',
    robotCode: 'ding-robot',
    clientSecret: 'ding-secret',
  }

  instance.startInstallStatusPolling = () => {}
  instance.stopInstallStatusPolling = () => {}

  const originalSetTimeout = context.setTimeout
  const originalWindowSetTimeout = context.window.setTimeout
  context.setTimeout = (fn) => {
    if (typeof fn === 'function') fn()
    return 0
  }
  context.window.setTimeout = context.setTimeout

  let waitUntilInstalledCalls = 0
  instance.waitUntilInstalled = async () => {
    waitUntilInstalledCalls += 1
    return false
  }
  instance.waitForInstallTerminalState = async () => ({
    status: 'completed',
    installState: 'completed',
    summary: '安装完成，可导出诊断信息',
    runtimeMode: 'daemon',
    steps: [
      { key: 'plugins', status: 'done' },
      { key: 'config', status: 'done' },
      { key: 'channels', status: 'done' },
      { key: 'runtime', status: 'done' },
      { key: 'probe', status: 'done' },
    ],
  })

  instance.fetchWithTimeout = async (url, options = {}) => {
    if (url === '/api/install/status') {
      return createResponse({
        status: 'running',
        summary: '正在部署中',
        steps: [
          { key: 'plugins', status: 'running' },
        ],
      })
    }
    if (url === '/api/install' && options.method === 'POST') {
      const abortError = new Error('The operation was aborted.')
      abortError.name = 'AbortError'
      throw abortError
    }
    throw new Error(`Unexpected request: ${url}`)
  }

  try {
    await instance.startInstall()
    assert.equal(waitUntilInstalledCalls, 0)
    assert.equal(instance.installDone, true)
    assert.equal(instance.installError, false)
    assert.equal(instance.installLoadingMessage, '安装完成，可导出诊断信息')
    assert.deepEqual(
      toPlain(instance.installTasks.map((task) => task.status)),
      ['done', 'done', 'done', 'done', 'done'],
    )
    assert.equal(context.window.location.href, '/dashboard?launch=timeoutcase')
  } finally {
    context.setTimeout = originalSetTimeout
    context.window.setTimeout = originalWindowSetTimeout
  }
})

test('wizard waitUntilInstalled accepts gateway fallback runtime as install-complete', async () => {
  const { context, factory } = loadPageFactory('ui/public/index.html', 'wizard')
  const instance = factory()

  let callCount = 0
  instance.fetchWithTimeout = async (url) => {
    assert.equal(url, '/api/status')
    callCount += 1
    if (callCount < 4) {
      return createResponse({
        installed: true,
        daemon: 'stopped',
        runtimeMode: 'gateway-fallback',
        gatewayHealthy: true,
      })
    }
    return createResponse({
      installed: true,
      daemon: 'running',
      runtimeMode: 'daemon',
      gatewayHealthy: true,
    })
  }

  const originalSetTimeout = context.setTimeout
  const originalWindowSetTimeout = context.window.setTimeout
  context.setTimeout = (fn) => {
    if (typeof fn === 'function') fn()
    return 0
  }
  context.window.setTimeout = context.setTimeout

  try {
    const result = await instance.waitUntilInstalled()
    assert.equal(result, true)
    assert.equal(callCount, 1)
  } finally {
    context.setTimeout = originalSetTimeout
    context.window.setTimeout = originalWindowSetTimeout
  }
})

test('wizard applyInstallStatus maps backend step states onto install tasks', () => {
  const { factory } = loadPageFactory('ui/public/index.html', 'wizard')
  const instance = factory()

  assert.equal(typeof instance.applyInstallStatus, 'function')

  instance.applyInstallStatus({
    status: 'running',
    summary: '正在启动服务',
    steps: [
      { key: 'plugins', status: 'done' },
      { key: 'config', status: 'done' },
      { key: 'channels', status: 'done' },
      { key: 'runtime', status: 'running' },
      { key: 'probe', status: 'pending' },
    ],
  })

  assert.deepEqual(
    toPlain(instance.installTasks.map((task) => task.status)),
    ['done', 'done', 'done', 'running', 'pending'],
  )
  assert.equal(instance.installLoadingMessage, '正在启动服务')
})

test('wizard pollInstallStatusOnce reads backend install status instead of simulated progress', async () => {
  const { factory } = loadPageFactory('ui/public/index.html', 'wizard')
  const instance = factory()

  assert.equal(typeof instance.pollInstallStatusOnce, 'function')

  const calls = []
  instance.fetchWithTimeout = async (url) => {
    calls.push(url)
    assert.equal(url, '/api/install/status')
    return createResponse({
      status: 'running',
      summary: '正在验证连接',
      steps: [
        { key: 'plugins', status: 'done' },
        { key: 'config', status: 'done' },
        { key: 'channels', status: 'done' },
        { key: 'runtime', status: 'done' },
        { key: 'probe', status: 'running' },
      ],
    })
  }

  await instance.pollInstallStatusOnce()

  assert.deepEqual(calls, ['/api/install/status'])
  assert.deepEqual(
    toPlain(instance.installTasks.map((task) => task.status)),
    ['done', 'done', 'done', 'done', 'running'],
  )
  assert.equal(instance.installLoadingMessage, '正在验证连接')
})

test('dashboard daemon lifecycle refresh keeps DingTalk diagnostics aligned with packaged state', async () => {
  const { factory } = loadPageFactory('ui/public/dashboard.html', 'dashboard')
  const instance = factory()
  instance.$nextTick = (fn) => (typeof fn === 'function' ? fn() : undefined)
  instance.showToast = () => {}

  const card = instance.channelCards.find((entry) => entry.key === 'dingtalk')
  card.enabled = true
  card.fields = {
    corpId: 'ding-corp',
    clientId: 'ding-client',
    robotCode: 'ding-robot',
    clientSecret: 'ding-secret',
  }

  const requests = []
  instance.fetchWithTimeout = async (url, options = {}) => {
    requests.push({ url, method: options.method ?? 'GET' })
    if (url === '/api/daemon' && options.method === 'POST') {
      return createResponse({ ok: true, mode: 'daemon' })
    }
    if (url === '/api/status') {
      return createResponse({
        installed: true,
        daemon: 'running',
        runtimeMode: 'daemon',
        gatewayPort: 18889,
        profile: 'usb-portable',
        configPath: '~/.openclaw-usb-portable/openclaw.json',
      })
    }
    if (url === '/api/dingtalk/probe' && options.method === 'POST') {
      return createResponse({
        ok: true,
        status: 'ok',
        ready: true,
        daemon: 'running',
        checks: ['channels status 已识别钉钉为 configured'],
        warnings: [],
        errors: [],
        probe: {
          code: 0,
          summary: 'channels.dingtalk enabled, configured',
        },
      })
    }
    throw new Error(`Unexpected request: ${url}`)
  }

  await instance.daemonAction('restart')

  assert.equal(card.diagnostics.status, 'ok')
  assert.equal(card.diagnostics.ready, true)
  assert.equal(card.diagnostics.probe.summary, 'channels.dingtalk enabled, configured')
  assert.deepEqual(requests, [
    { url: '/api/daemon', method: 'POST' },
    { url: '/api/status', method: 'GET' },
    { url: '/api/dingtalk/probe', method: 'POST' },
  ])
})

test('dashboard DingTalk diagnostics uses probe timeout, keeps daemon, and recovers after timeout', async () => {
  const { factory } = loadPageFactory('ui/public/dashboard.html', 'dashboard')
  const instance = factory()
  instance.$nextTick = (fn) => (typeof fn === 'function' ? fn() : undefined)
  instance.statusSnapshot.daemon = 'running'
  assert.equal(instance.requestTimeout.status, 10000)
  assert.equal(instance.requestTimeout.diagnostics, 30000)

  const card = instance.channelCards.find((entry) => entry.key === 'dingtalk')
  card.enabled = true
  card.fields = {
    corpId: 'ding-corp',
    clientId: 'ding-client',
    robotCode: 'ding-robot',
    clientSecret: 'ding-secret',
  }

  const requests = []
  let probeCount = 0
  instance.fetchWithTimeout = async (url, options = {}, timeoutMs) => {
    requests.push({ url, method: options.method ?? 'GET', timeoutMs })
    if (url === '/api/dingtalk/probe' && options.method === 'POST') {
      probeCount += 1
      if (probeCount === 1) {
        const abortError = new Error('signal is aborted without reason')
        abortError.name = 'AbortError'
        throw abortError
      }
      return createResponse({
        ok: true,
        status: 'ok',
        ready: true,
        daemon: 'running',
        checks: ['channels status 已识别钉钉为 configured'],
        warnings: [],
        errors: [],
        probe: {
          code: 0,
          summary: 'channels.dingtalk enabled, configured',
        },
      })
    }
    throw new Error(`Unexpected request: ${url}`)
  }

  const firstOk = await instance.refreshDingtalkDiagnostics()

  assert.equal(firstOk, false)
  assert.equal(requests[0].timeoutMs, instance.requestTimeout.diagnostics)
  assert.notEqual(requests[0].timeoutMs, instance.requestTimeout.status)
  assert.equal(card.diagnostics.status, 'warning')
  assert.equal(card.diagnostics.ready, false)
  assert.equal(card.diagnostics.daemon, 'running')
  assert.equal(card.diagnostics.timedOut, true)
  assert.deepEqual(toPlain(card.diagnostics.warnings), ['钉钉诊断请求超时，请稍后重试；这不代表消息发送失败。'])
  assert.deepEqual(toPlain(card.diagnostics.errors), [])
  assert.doesNotMatch(card.diagnostics.warnings.join('\n'), /signal is aborted/)
  assert.doesNotMatch(card.diagnostics.probe.summary, /signal is aborted/)
  assert.equal(instance.diagnosticsStatusLabel(card.diagnostics), '诊断超时')

  const secondOk = await instance.refreshDingtalkDiagnostics()

  assert.equal(secondOk, true)
  assert.equal(requests[1].timeoutMs, instance.requestTimeout.diagnostics)
  assert.equal(card.diagnostics.status, 'ok')
  assert.equal(card.diagnostics.ready, true)
  assert.equal(card.diagnostics.daemon, 'running')
  assert.deepEqual(toPlain(card.diagnostics.errors), [])
  assert.equal(card.diagnostics.probe.summary, 'channels.dingtalk enabled, configured')
  assert.equal(instance.diagnosticsStatusLabel(card.diagnostics), '已读回')
})

test('install and dashboard wording uses canonical DingTalk client labels while preserving alias hints', () => {
  const installHtml = fs.readFileSync(path.resolve('ui/public/index.html'), 'utf8')
  const dashboardHtml = fs.readFileSync(path.resolve('ui/public/dashboard.html'), 'utf8')

  assert.match(installHtml, /Client ID（兼容 AppKey \/ Robot Code）/)
  assert.match(installHtml, /Client Secret（兼容 AppSecret）/)
  assert.match(installHtml, /钉钉安装读回/)
  assert.match(installHtml, /不代表钉钉已判 PASS/)
  assert.match(dashboardHtml, /Client ID（兼容 AppKey \/ Robot Code）/)
  assert.match(dashboardHtml, /Client Secret（兼容 AppSecret）/)
  assert.match(dashboardHtml, /钉钉诊断/)
  assert.match(dashboardHtml, /不代表 PASS/)
  assert.match(dashboardHtml, /Client ID/)
  assert.match(dashboardHtml, /Client Secret/)
})

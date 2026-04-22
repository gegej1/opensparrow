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

  for (const helperPath of ['ui/public/wecom-helpers.js', 'ui/public/channel-helpers.js']) {
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

  assert.equal(context.window.location.href, '/dashboard')
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
    assert.equal(context.window.location.href, '/dashboard')
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

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')
const dashboardHtml = fs.readFileSync(path.join(repoRoot, 'ui', 'public', 'dashboard.html'), 'utf8')
const stateFile = path.join(repoRoot, 'ui', 'public', 'dashboard-model-routing-state.mjs')

function loadRoutingStateApi() {
  const source = fs.readFileSync(stateFile, 'utf8')
  const context = {
    window: {},
    globalThis: {},
    console,
  }
  context.window.window = context.window
  context.window.globalThis = context.window
  context.globalThis = context.window
  vm.createContext(context)
  vm.runInContext(source, context)
  return context.window.OpenSparrowDashboardModelRouting
}

function toPlain(value) {
  return JSON.parse(JSON.stringify(value))
}

test('dashboard exposes a dedicated model-routing surface separate from the API compatibility lane', () => {
  assert.match(dashboardHtml, /label: '模型智能路由'/)
  assert.match(dashboardHtml, /API 配置（上游连接）/)
  assert.match(dashboardHtml, /API 配置仅负责上游 API 连接与兼容写入/)
})

test('dashboard model-routing state module freezes the internal router ids and authoritative endpoints', () => {
  assert.equal(fs.existsSync(stateFile), true)

  const api = loadRoutingStateApi()
  assert.ok(api)
  assert.equal(api.INVARIANTS.providerId, 'opensparrow-router')
  assert.equal(api.INVARIANTS.modelTarget, 'opensparrow-router/auto')
  assert.equal(api.ENDPOINTS.load, '/api/config/model-routing')
  assert.equal(api.ENDPOINTS.save, '/api/config/model-routing')
})

test('model-routing save payload stays scoped to routing mode data instead of native provider selection', () => {
  const api = loadRoutingStateApi()
  const payload = toPlain(api.buildSavePayload({
    mode: 'smart',
    singleModeDefaultModel: 'ignored-model',
    tierModelMap: {
      SIMPLE: 'gpt-4o-mini',
      MEDIUM: 'gpt-4.1-mini',
      COMPLEX: 'gpt-4.1',
      REASONING: 'o4-mini',
    },
    routingText: '{"default":"SIMPLE"}',
    router: {
      providerId: 'tampered-provider',
      modelTarget: 'tampered-target',
    },
  }))

  assert.deepEqual(payload, {
    mode: 'smart',
    tierModelMap: {
      SIMPLE: 'gpt-4o-mini',
      MEDIUM: 'gpt-4.1-mini',
      COMPLEX: 'gpt-4.1',
      REASONING: 'o4-mini',
    },
    routing: { default: 'SIMPLE' },
  })
  assert.ok(!('router' in payload))
  assert.ok(!('providerId' in payload))
  assert.ok(!('modelTarget' in payload))
})

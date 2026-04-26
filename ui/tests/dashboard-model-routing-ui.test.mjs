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

test('dashboard exposes one unified model configuration primary tab', () => {
  assert.match(dashboardHtml, /label: '模型配置'/)
  assert.doesNotMatch(dashboardHtml, /\{\s*key:\s*'routing',\s*label:\s*'模型智能路由'\s*\}/)
  assert.doesNotMatch(dashboardHtml, /\{\s*key:\s*'api',\s*label:\s*'API 配置（上游连接）'\s*\}/)
  assert.match(dashboardHtml, /单模型/)
  assert.match(dashboardHtml, /模型智能路由/)
  assert.match(dashboardHtml, /Base URL/)
  assert.match(dashboardHtml, /API Key/)
  assert.match(dashboardHtml, /Model ID/)
  for (const tier of ['SIMPLE', 'MEDIUM', 'COMPLEX', 'REASONING']) {
    assert.match(dashboardHtml, new RegExp(`modelRouting\\.tierConnectionMap\\.${tier}\\.baseUrl`))
    assert.match(dashboardHtml, new RegExp(`modelRouting\\.tierConnectionMap\\.${tier}\\.apiKey`))
    assert.match(dashboardHtml, new RegExp(`modelRouting\\.tierConnectionMap\\.${tier}\\.model`))
  }
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

test('single model save payload includes baseUrl, apiKey, and model', () => {
  const api = loadRoutingStateApi()
  const payload = toPlain(api.buildSavePayload({
    mode: 'single',
    single: {
      baseUrl: 'https://single.example/v1',
      apiKey: 'entered-single-key',
      model: 'single-model',
    },
    router: {
      providerId: 'tampered-provider',
      modelTarget: 'tampered-target',
    },
  }))

  assert.deepEqual(payload, {
    mode: 'single',
    baseUrl: 'https://single.example/v1',
    apiKey: 'entered-single-key',
    model: 'single-model',
  })
  assert.ok(!('router' in payload))
  assert.ok(!('providerId' in payload))
  assert.ok(!('modelTarget' in payload))
})

test('smart model save payload includes four per-tier connection objects and routing only', () => {
  const api = loadRoutingStateApi()
  const payload = toPlain(api.buildSavePayload({
    mode: 'smart',
    single: {
      baseUrl: 'https://ignored.example/v1',
      apiKey: 'ignored-single-key',
      model: 'ignored-model',
    },
    tierConnectionMap: {
      SIMPLE: { baseUrl: 'https://simple.example/v1', apiKey: 'simple-key', model: 'simple-model' },
      MEDIUM: { baseUrl: 'https://medium.example/v1', apiKey: 'medium-key', model: 'medium-model' },
      COMPLEX: { baseUrl: 'https://complex.example/v1', apiKey: 'complex-key', model: 'complex-model' },
      REASONING: { baseUrl: 'https://reasoning.example/v1', apiKey: 'reasoning-key', model: 'reasoning-model' },
    },
    routingText: '{"default":"SIMPLE"}',
    router: {
      providerId: 'tampered-provider',
      modelTarget: 'tampered-target',
    },
  }))

  assert.deepEqual(payload, {
    mode: 'smart',
    tierConnectionMap: {
      SIMPLE: { baseUrl: 'https://simple.example/v1', apiKey: 'simple-key', model: 'simple-model' },
      MEDIUM: { baseUrl: 'https://medium.example/v1', apiKey: 'medium-key', model: 'medium-model' },
      COMPLEX: { baseUrl: 'https://complex.example/v1', apiKey: 'complex-key', model: 'complex-model' },
      REASONING: { baseUrl: 'https://reasoning.example/v1', apiKey: 'reasoning-key', model: 'reasoning-model' },
    },
    routing: { default: 'SIMPLE' },
  })
  assert.ok(!('router' in payload))
  assert.ok(!('providerId' in payload))
  assert.ok(!('modelTarget' in payload))
})

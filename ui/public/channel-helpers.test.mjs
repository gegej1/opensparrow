import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

function toPlain(value) {
  return JSON.parse(JSON.stringify(value))
}

function loadBrowserHelpers() {
  const context = {
    window: {},
    globalThis: {},
    console,
  }
  context.window.window = context.window
  context.window.globalThis = context.window
  vm.createContext(context)

  for (const relativePath of ['ui/public/wecom-helpers.js', 'ui/public/channel-helpers.js']) {
    const source = fs.readFileSync(path.resolve(relativePath), 'utf8')
    vm.runInContext(source, context)
  }

  return context.window.OpenSparrowChannels
}

test('shared browser helper exports the expected entry points', () => {
  const api = loadBrowserHelpers()

  assert.equal(typeof api?.createEmptyUiFields, 'function')
  assert.equal(typeof api?.hasReplayValue, 'function')
  assert.equal(typeof api?.normalizeUiFields, 'function')
  assert.equal(typeof api?.validateUiFields, 'function')
  assert.equal(typeof api?.buildChannelPayload, 'function')
})

test('shared browser helper returns empty ui field shapes for all known channels', () => {
  const api = loadBrowserHelpers()

  assert.deepEqual(toPlain(api.createEmptyUiFields('feishu')), {
    appId: '',
    appSecret: '',
  })
  assert.deepEqual(toPlain(api.createEmptyUiFields('dingtalk')), {
    corpId: '',
    clientId: '',
    robotCode: '',
    clientSecret: '',
  })
  assert.deepEqual(toPlain(api.createEmptyUiFields('wecom')), {
    botId: '',
    secret: '',
    corpId: '',
    corpSecret: '',
    agentId: '',
    replyFormat: '',
    callbackToken: '',
    encodingAESKey: '',
    callbackPath: '',
  })
})

test('Feishu helper keeps live requiredness limited to appId + appSecret', () => {
  const api = loadBrowserHelpers()
  const validated = api.validateUiFields('feishu', {
    appId: ' cli_app_id ',
    appSecret: ' cli_app_secret ',
    corpId: 'should-not-exist',
  })

  assert.deepEqual(toPlain(validated), {
    appId: 'cli_app_id',
    appSecret: 'cli_app_secret',
    errors: [],
  })

  const payload = api.buildChannelPayload('feishu', {
    appId: ' cli_app_id ',
    appSecret: ' cli_app_secret ',
  })
  assert.deepEqual(toPlain(payload), {
    type: 'feishu',
    appId: 'cli_app_id',
    appSecret: 'cli_app_secret',
  })
})

test('DingTalk helper no longer treats corpId as a preflight blocker', () => {
  const api = loadBrowserHelpers()
  const validated = api.validateUiFields('dingtalk', {
    clientId: 'ding-client-id',
    clientSecret: 'ding-client-secret',
    corpId: '',
  })

  assert.deepEqual(toPlain(validated), {
    corpId: '',
    clientId: 'ding-client-id',
    robotCode: 'ding-client-id',
    clientSecret: 'ding-client-secret',
    errors: [],
  })

  const payload = api.buildChannelPayload('dingtalk', {
    clientId: 'ding-client-id',
    clientSecret: 'ding-client-secret',
  })

  assert.deepEqual(toPlain(payload), {
    type: 'dingtalk',
    corpId: '',
    clientId: 'ding-client-id',
    robotCode: 'ding-client-id',
    clientSecret: 'ding-client-secret',
  })
})

test('DingTalk helper exposes canonical Client ID / Client Secret wording while preserving aliases', () => {
  const api = loadBrowserHelpers()
  const validated = api.validateUiFields('dingtalk', {
    corpId: '',
    clientId: '',
    clientSecret: '',
  })

  assert.deepEqual(Array.from(validated.errors), [
    '钉钉 Client ID（兼容 AppKey / Robot Code）不能为空',
    '钉钉 Client Secret（兼容 AppSecret）不能为空',
  ])
})

test('DingTalk helper keeps historical alias inputs compatible', () => {
  const api = loadBrowserHelpers()
  const validated = api.validateUiFields('dingtalk', {
    appKey: 'ding-app-key',
    appSecret: 'ding-app-secret',
    cropId: 'ding-corp-id',
  })

  assert.deepEqual(toPlain(validated), {
    corpId: 'ding-corp-id',
    clientId: 'ding-app-key',
    robotCode: 'ding-app-key',
    clientSecret: 'ding-app-secret',
    errors: [],
  })
})

test('browser helper can detect whether a channel has replayable field values', () => {
  const api = loadBrowserHelpers()

  assert.equal(api.hasReplayValue('feishu', { appId: '', appSecret: '' }), false)
  assert.equal(api.hasReplayValue('feishu', { appId: 'cli_app_id' }), true)
  assert.equal(api.hasReplayValue('dingtalk', { corpId: '', clientId: '', robotCode: '', clientSecret: '' }), false)
  assert.equal(api.hasReplayValue('dingtalk', { corpId: 'ding-corp' }), true)
  assert.equal(api.hasReplayValue('wecom', { botId: '', secret: '' }), false)
  assert.equal(api.hasReplayValue('wecom', { botId: 'aib_demo' }), true)
})

test('WeCom helper preserves grouped validation through the shared entry point', () => {
  const api = loadBrowserHelpers()
  const validated = api.validateUiFields('wecom', {
    botId: 'aib_demo',
    secret: 'bot-secret',
    corpId: 'wwcorp',
    corpSecret: '',
    agentId: 'abc',
    callbackToken: 'token-only',
  })

  assert.deepEqual(Array.from(validated.errors), [
    '启用企业微信自建应用增强出站时，需要同时填写 CorpId、CorpSecret、AgentId',
    '企业微信 AgentId 必须是正整数',
    '启用企业微信回调入站时，需要同时填写 Callback Token、EncodingAESKey、Callback Path',
    '企业微信回调入站依赖完整的自建应用 CorpId、CorpSecret、AgentId',
  ])
})

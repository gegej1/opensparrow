import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

function loadBrowserHelper() {
  const scriptPath = path.resolve('ui/public/wecom-helpers.js')
  const source = fs.readFileSync(scriptPath, 'utf8')
  const context = {
    window: {},
    globalThis: {},
    console,
  }
  context.window.window = context.window
  context.window.globalThis = context.window
  vm.createContext(context)
  vm.runInContext(source, context)
  return context.window.OpenSparrowWecom
}

test('browser helper exports expected API', () => {
  const api = loadBrowserHelper()
  assert.equal(typeof api?.createEmptyWecomFields, 'function')
  assert.equal(typeof api?.isLikelyWecomBotId, 'function')
  assert.equal(typeof api?.validateWecomFields, 'function')
})

test('browser helper returns fresh empty wecom field objects', () => {
  const api = loadBrowserHelper()
  const first = api.createEmptyWecomFields()
  const second = api.createEmptyWecomFields()

  assert.deepEqual({ ...first }, {
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
  assert.notStrictEqual(first, second)
})

test('browser helper validates wecom fields consistently', () => {
  const api = loadBrowserHelper()
  const result = api.validateWecomFields({
    botId: 'aib_demo',
    secret: 'secret',
    corpId: 'wwcorp',
    corpSecret: '',
    agentId: 'abc',
    callbackToken: 'token-only',
  })

  assert.deepEqual(Array.from(result.errors), [
    '启用企业微信自建应用增强出站时，需要同时填写 CorpId、CorpSecret、AgentId',
    '企业微信 AgentId 必须是正整数',
    '启用企业微信回调入站时，需要同时填写 Callback Token、EncodingAESKey、Callback Path',
    '企业微信回调入站依赖完整的自建应用 CorpId、CorpSecret、AgentId',
  ])
})

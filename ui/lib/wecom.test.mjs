import test from 'node:test'
import assert from 'node:assert/strict'

import {
  collectWecomInputErrors,
  enrichWecomChannelForUi,
  isLikelyWecomBotId,
  normalizeWecomCredentials,
} from './wecom.mjs'

test('isLikelyWecomBotId accepts common bot ids and rejects invalid values', () => {
  assert.equal(isLikelyWecomBotId('aib_123456'), true)
  assert.equal(isLikelyWecomBotId('aib-demo.bot'), true)
  assert.equal(isLikelyWecomBotId('bot_123456'), false)
  assert.equal(isLikelyWecomBotId(''), false)
})

test('normalizeWecomCredentials reads flat and nested agent fields', () => {
  const normalized = normalizeWecomCredentials({
    botId: 'aib_demo',
    secret: 'top-secret',
    agent: {
      corpId: 'ww123',
      corpSecret: 'corp-secret',
      agentId: '1000001',
      replyFormat: 'Markdown',
      callback: {
        token: 'cb-token',
        encodingAESKey: 'aes-key',
        path: '/wecom/callback',
      },
    },
  })

  assert.deepEqual(normalized, {
    botId: 'aib_demo',
    secret: 'top-secret',
    corpId: 'ww123',
    corpSecret: 'corp-secret',
    agentId: '1000001',
    replyFormat: 'markdown',
    callbackToken: 'cb-token',
    encodingAESKey: 'aes-key',
    callbackPath: '/wecom/callback',
    hasAnyAgentFields: true,
    agentConfigured: true,
    hasCallbackFields: true,
    callbackConfigured: true,
  })
})

test('collectWecomInputErrors reports grouped field problems', () => {
  const result = collectWecomInputErrors({
    botId: 'demo',
    secret: '',
    corpId: 'ww123',
    callbackToken: 'token-only',
  })

  assert.deepEqual(result.errors, [
    '企业微信 Bot ID 格式疑似错误，请填写智能机器人（API+长连接）生成的 Bot ID（通常以 aib 或 aib_ 开头）',
    '企业微信需要填写 Bot Secret',
    '启用企业微信自建应用增强出站时，需要同时填写 CorpId、CorpSecret、AgentId',
    '启用企业微信回调入站时，需要同时填写 Callback Token、EncodingAESKey、Callback Path',
    '企业微信回调入站依赖完整的自建应用 CorpId、CorpSecret、AgentId',
  ])
})

test('enrichWecomChannelForUi flattens persisted nested config for UI forms', () => {
  const enriched = enrichWecomChannelForUi({
    enabled: true,
    agent: {
      corpId: 'wwcorp',
      corpSecret: 'corp-secret',
      agentId: '1000002',
      replyFormat: 'text',
      callback: {
        token: 'callback-token',
        encodingAESKey: 'encoding-key',
        path: '/hook/wecom',
      },
    },
    botId: 'aib_demo_2',
    secret: 'secret-2',
  })

  assert.equal(enriched.botId, 'aib_demo_2')
  assert.equal(enriched.secret, 'secret-2')
  assert.equal(enriched.corpId, 'wwcorp')
  assert.equal(enriched.corpSecret, 'corp-secret')
  assert.equal(enriched.agentId, '1000002')
  assert.equal(enriched.replyFormat, 'text')
  assert.equal(enriched.callbackToken, 'callback-token')
  assert.equal(enriched.encodingAESKey, 'encoding-key')
  assert.equal(enriched.callbackPath, '/hook/wecom')
})

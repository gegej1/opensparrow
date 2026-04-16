import test from 'node:test'
import assert from 'node:assert/strict'

import {
  applyDingtalkUiMetaPatch,
  buildChannelCanonicalEntry,
  buildChannelPersistPlan,
  collectChannelInputErrors,
  enrichChannelForUi,
} from './channel-canonical.mjs'

test('DingTalk treats corpId as optional metadata in canonical validation', () => {
  const raw = {
    type: 'dingtalk',
    clientId: 'dt-client',
    clientSecret: 'dt-secret',
  }

  assert.deepEqual(collectChannelInputErrors(raw), [])

  const entry = buildChannelCanonicalEntry(raw)
  assert.deepEqual(entry.canonical, {
    type: 'dingtalk',
    enabled: true,
    core: {
      primaryId: 'dt-client',
      primarySecret: 'dt-secret',
    },
    delta: {
      displayCode: 'dt-client',
    },
  })

  const plan = buildChannelPersistPlan(raw)
  assert.deepEqual(plan.errors, [])
  assert.ok(!plan.set.some((op) => op.path === 'channels.dingtalk.corpId'))
  assert.ok(!plan.set.some((op) => op.path === 'channels.dingtalk.cropId'))
  assert.deepEqual(plan.uiMetaPatch, { corpId: '', robotCode: 'dt-client' })
})

test('DingTalk accepts alias inputs and read-back enrichment still restores corpId/robotCode', () => {
  const raw = {
    type: 'dingtalk',
    appKey: 'ding-app-key',
    appSecret: 'ding-app-secret',
    cropId: 'ding-corp',
  }

  const plan = buildChannelPersistPlan(raw)
  assert.deepEqual(plan.errors, [])
  assert.equal(plan.normalized.clientId, 'ding-app-key')
  assert.equal(plan.normalized.clientSecret, 'ding-app-secret')
  assert.equal(plan.normalized.robotCode, 'ding-app-key')
  assert.equal(plan.normalized.corpId, 'ding-corp')

  const enriched = enrichChannelForUi(
    'dingtalk',
    {
      enabled: true,
      clientId: 'ding-app-key',
      clientSecret: 'ding-app-secret',
    },
    {
      dingtalkUiMeta: { corpId: 'ding-corp', robotCode: '' },
    }
  )
  assert.equal(enriched.robotCode, 'ding-app-key')
  assert.equal(enriched.corpId, 'ding-corp')
})

test('DingTalk ui-meta patch treats explicit empty optional values as clear operations', () => {
  const next = applyDingtalkUiMetaPatch(
    {
      corpId: 'old-corp',
      robotCode: 'old-robot',
    },
    {
      corpId: '',
      robotCode: '',
    }
  )

  assert.deepEqual(next, {})
})

test('Feishu goes through the shared canonical pipeline without extra live fields', () => {
  const raw = {
    type: 'feishu',
    appId: ' cli-app-id ',
    appSecret: ' cli-app-secret ',
  }

  const entry = buildChannelCanonicalEntry(raw)
  assert.deepEqual(entry.errors, [])
  assert.deepEqual(entry.canonical, {
    type: 'feishu',
    enabled: true,
    core: {
      primaryId: 'cli-app-id',
      primarySecret: 'cli-app-secret',
    },
    delta: {},
  })

  const plan = buildChannelPersistPlan(raw)
  assert.deepEqual(plan.errors, [])
  assert.ok(plan.set.some((op) => op.path === 'channels.feishu.appId'))
  assert.ok(plan.set.some((op) => op.path === 'channels.feishu.appSecret'))

  const enriched = enrichChannelForUi('feishu', {
    appId: 'cli-app-id',
    appSecret: 'cli-app-secret',
  })
  assert.deepEqual(enriched, {
    appId: 'cli-app-id',
    appSecret: 'cli-app-secret',
  })
})

test('WeCom remains bot-first and persists nested agent/callback paths while read-back stays flat', () => {
  const raw = {
    type: 'wecom',
    botId: 'aib_demo',
    secret: 'bot-secret',
    corpId: 'wwcorp',
    corpSecret: 'corp-secret',
    agentId: '1000001',
    replyFormat: 'Markdown',
    callbackToken: 'cb-token',
    encodingAESKey: 'aes-key',
    callbackPath: '/wecom/callback',
  }

  assert.deepEqual(collectChannelInputErrors({
    type: 'wecom',
    botId: 'aib_demo',
    secret: 'bot-secret',
  }), [])

  const plan = buildChannelPersistPlan(raw)
  assert.deepEqual(plan.errors, [])
  assert.deepEqual(plan.canonical.core, {
    primaryId: 'aib_demo',
    primarySecret: 'bot-secret',
  })
  assert.equal(plan.canonical.delta.tenantId, 'wwcorp')
  assert.ok(plan.set.some((op) => op.path === 'channels.wecom.agent.corpId'))
  assert.ok(plan.set.some((op) => op.path === 'channels.wecom.agent.corpSecret'))
  assert.ok(plan.set.some((op) => op.path === 'channels.wecom.agent.agentId'))
  assert.ok(plan.set.some((op) => op.path === 'channels.wecom.agent.callback.token'))
  assert.ok(plan.set.some((op) => op.path === 'channels.wecom.agent.callback.encodingAESKey'))
  assert.ok(plan.set.some((op) => op.path === 'channels.wecom.agent.callback.path'))
  assert.ok(!plan.set.some((op) => op.path === 'channels.wecom.corpId'))
  assert.ok(!plan.set.some((op) => op.path === 'channels.wecom.callbackToken'))

  const enriched = enrichChannelForUi('wecom', {
    enabled: true,
    botId: 'aib_demo',
    secret: 'bot-secret',
    agent: {
      corpId: 'wwcorp',
      corpSecret: 'corp-secret',
      agentId: '1000001',
      replyFormat: 'text',
      callback: {
        token: 'cb-token',
        encodingAESKey: 'aes-key',
        path: '/wecom/callback',
      },
    },
  })
  assert.equal(enriched.botId, 'aib_demo')
  assert.equal(enriched.secret, 'bot-secret')
  assert.equal(enriched.corpId, 'wwcorp')
  assert.equal(enriched.corpSecret, 'corp-secret')
  assert.equal(enriched.agentId, '1000001')
  assert.equal(enriched.replyFormat, 'text')
  assert.equal(enriched.callbackToken, 'cb-token')
  assert.equal(enriched.encodingAESKey, 'aes-key')
  assert.equal(enriched.callbackPath, '/wecom/callback')
})

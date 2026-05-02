import test from 'node:test'
import assert from 'node:assert/strict'

import * as routing from '../../scripts/model-routing/lib/custom-plugin-routing.mjs'

const { extractCurrentUserTextFromMessages, extractPromptFromMessages } = routing

const SIMPLE_CURRENT_TEXT = 'reply OK only for CURRENT_USER_TEXT_SHOULD_NOT_LEAK'

function wrappedChannelText(channel, currentText) {
  return [
    'Conversation info:',
    `channel=${channel}`,
    'source=channel-envelope',
    '',
    'untrusted metadata:',
    '```json',
    JSON.stringify({
      channel,
      format: 'json',
      transport: 'channel-envelope',
      metadata: {
        senderId: 'synthetic-sender',
        debug: true,
        regex: 'metadata-only',
      },
      history: [
        { role: 'user', content: 'solve this logic proof step by step' },
      ],
    }, null, 2),
    '```',
    '',
    'Latest user message:',
    currentText,
  ].join('\n')
}

function liveCompatibleWrappedText(currentText) {
  return [
    'Conversation info:',
    'portable packaged conversation snapshot',
    '',
    'Untrusted metadata:',
    '```json',
    JSON.stringify({
      wrapper: 'packaged-live-channel',
      transport: {
        source: 'message-plugin',
        session: 'agent:main:main',
      },
      request: {
        format: 'json',
        debug: true,
        stack: 'metadata-only',
      },
      history: [
        { role: 'user', content: 'solve this logic proof step by step' },
      ],
    }, null, 2),
    '```',
    '',
    currentText,
  ].join('\n')
}

function redactedLiveWeComWrappedText(currentText) {
  return [
    'OpenSparrow live channel ingress control preamble',
    'Conversation info snapshot for packaged external WeCom ingress',
    '',
    '```json',
    JSON.stringify({
      wrapper: {
        kind: 'live-channel-ingress',
        source: 'external-message-plugin',
      },
      transport: {
        plugin: 'wecom-openclaw-plugin',
        session: 'agent:main:main',
      },
      request: {
        format: 'json',
        debug: true,
        trace: 'metadata-only',
      },
      history: [
        { role: 'user', content: 'debug this stack trace and fix the code' },
        { role: 'assistant', content: 'old answer' },
      ],
    }, null, 2),
    '```',
    '',
    currentText,
  ].join('\n')
}

function redactedTrueLiveFeishuWrappedText(currentText) {
  return [
    'Conversation info snapshot for packaged Feishu live ingress',
    '```json',
    JSON.stringify({
      chat_id: 'synthetic-chat-id-000000000000000000000000',
      message_id: 'synthetic-message-id-000000000000000',
      sender_id: 'synthetic-sender-id-000000000000000',
      sender: 'synthetic-sender-id-000000000000000',
      timestamp: '2026-04-30T16:00:00.000Z',
    }, null, 2),
    '```',
    '',
    'Sender info',
    '```json',
    JSON.stringify({
      label: 'synthetic-sender-id-000000000000000',
      id: 'synthetic-sender-id-000000000000000',
      name: 'synthetic-sender-id-000000000000000',
    }, null, 2),
    '```',
    '',
    '[current message metadata]: synthetic-redacted-live-feishu',
    currentText,
  ].join('\n')
}

function markerLikeRealDebugPayload() {
  return [
    'Conversation info:',
    'Debug notes copied from a real incident report.',
    '',
    'Untrusted metadata:',
    '```json',
    JSON.stringify({
      channel: 'feishu',
      metadata: {
        debug: true,
        requestId: 'real-marker-like-debug-payload',
      },
      debug: {
        stack: 'TypeError: render failed while reading metadata',
        regex: 'metadata|channel|debug',
      },
    }, null, 2),
    '```',
    '',
    'OK',
  ].join('\n')
}

test('current-turn extractor unwraps DingTalk metadata and ignores prior complex history', () => {
  const prompt = extractPromptFromMessages([
    { role: 'user', content: 'debug this stack trace and fix the code' },
    { role: 'assistant', content: 'ok' },
    { role: 'user', content: wrappedChannelText('dingtalk', SIMPLE_CURRENT_TEXT) },
  ])

  assert.equal(prompt, SIMPLE_CURRENT_TEXT)
})

test('current-turn extractor unwraps WeCom metadata and ignores literal JSON envelope text', () => {
  const prompt = extractPromptFromMessages([
    {
      role: 'user',
      content: [
        { type: 'text', text: wrappedChannelText('wecom', SIMPLE_CURRENT_TEXT) },
      ],
    },
  ])

  assert.equal(prompt, SIMPLE_CURRENT_TEXT)
})

test('current-turn extractor unwraps live-compatible channel metadata without explicit channel marker', () => {
  const evidence = extractCurrentUserTextFromMessages([
    {
      role: 'user',
      content: liveCompatibleWrappedText(SIMPLE_CURRENT_TEXT),
    },
  ])

  assert.equal(evidence.text, SIMPLE_CURRENT_TEXT)
  assert.equal(evidence.source, 'sanitized-current-user-text')
  assert.deepEqual(evidence.excludedInputCategories, [
    'channel-envelope',
    'json-metadata',
    'history',
  ])
})

test('current-turn extractor unwraps redacted live WeCom wrapper without explicit channel or latest-user markers', () => {
  const evidence = extractCurrentUserTextFromMessages([
    {
      role: 'user',
      content: redactedLiveWeComWrappedText(SIMPLE_CURRENT_TEXT),
    },
  ])

  assert.equal(evidence.text, SIMPLE_CURRENT_TEXT)
  assert.equal(evidence.source, 'sanitized-current-user-text')
  assert.deepEqual(evidence.excludedInputCategories, [
    'channel-envelope',
    'json-metadata',
    'history',
  ])
})

test('current-turn extractor unwraps redacted true-live Feishu wrapper without explicit channel or latest-user markers', () => {
  const evidence = extractCurrentUserTextFromMessages([
    {
      role: 'user',
      content: redactedTrueLiveFeishuWrappedText(SIMPLE_CURRENT_TEXT),
    },
  ])

  assert.equal(evidence.text, [
    '[current message metadata]: synthetic-redacted-live-feishu',
    SIMPLE_CURRENT_TEXT,
  ].join('\n'))
  assert.equal(evidence.source, 'sanitized-current-user-text')
  assert.deepEqual(evidence.excludedInputCategories, [
    'channel-envelope',
    'json-metadata',
  ])
})

test('current-turn extractor preserves redacted true-live Feishu complex current body', () => {
  const complexCurrentText = 'debug this stack trace and fix the code'
  const evidence = extractCurrentUserTextFromMessages([
    {
      role: 'user',
      content: redactedTrueLiveFeishuWrappedText(complexCurrentText),
    },
  ])

  assert.equal(evidence.text, [
    '[current message metadata]: synthetic-redacted-live-feishu',
    complexCurrentText,
  ].join('\n'))
  assert.equal(evidence.source, 'sanitized-current-user-text')
  assert.deepEqual(evidence.excludedInputCategories, [
    'channel-envelope',
    'json-metadata',
  ])
})

test('Conversation info plus a fenced channel field alone is preserved as raw current text', () => {
  const payload = [
    'Conversation info snapshot from a copied debug note',
    '',
    '```json',
    JSON.stringify({
      channel: 'wecom',
      metadata: {
        requestId: 'channel-field-only',
      },
    }, null, 2),
    '```',
    '',
    'OK',
  ].join('\n')
  const evidence = extractCurrentUserTextFromMessages([
    {
      role: 'user',
      content: payload,
    },
  ])

  assert.equal(evidence.source, 'raw-current-user-text')
  assert.equal(evidence.text, payload)
  assert.deepEqual(evidence.excludedInputCategories, [])
})

test('arbitrary debug JSON with a wrapper label is not treated as live channel ingress', () => {
  const payload = [
    'Conversation info copied from a design review.',
    '',
    '```json',
    JSON.stringify({
      wrapper: 'debug-wrapper',
      metadata: {
        debug: true,
        requestId: 'debug-wrapper-label-only',
      },
      debug: {
        stack: 'Error: metadata parser failed',
        sql: 'ALTER TABLE audit_log ADD COLUMN metadata JSON',
      },
    }, null, 2),
    '```',
    '',
    'OK',
  ].join('\n')
  const evidence = extractCurrentUserTextFromMessages([
    {
      role: 'user',
      content: payload,
    },
  ])

  assert.equal(evidence.source, 'raw-current-user-text')
  assert.equal(evidence.text, payload)
  assert.match(evidence.text, /debug-wrapper/u)
  assert.match(evidence.text, /ALTER TABLE audit_log/u)
  assert.deepEqual(evidence.excludedInputCategories, [])
})

test('marker-like JSON metadata without a current body is preserved instead of stripped', () => {
  const payload = [
    'Conversation info:',
    '```json',
    JSON.stringify({
      channel: 'feishu',
      format: 'json',
      metadata: {
        debug: true,
        stack: 'metadata-only',
        regex: 'metadata-only',
      },
    }, null, 2),
    '```',
  ].join('\n')
  const evidence = extractCurrentUserTextFromMessages([
    {
      role: 'user',
      content: payload,
    },
  ])

  assert.equal(evidence.source, 'raw-current-user-text')
  assert.equal(evidence.text.length, payload.length, 'full marker-like payload length should be preserved')
  assert.equal(evidence.text.includes('```json'), true, 'fenced JSON should remain present')
  assert.deepEqual(evidence.excludedInputCategories, [])
})

test('unwrapped marker-like debug JSON payload is not treated as a live channel wrapper', () => {
  const payload = markerLikeRealDebugPayload()
  const evidence = extractCurrentUserTextFromMessages([
    {
      role: 'user',
      content: payload,
    },
  ])

  assert.equal(evidence.source, 'raw-current-user-text')
  assert.equal(evidence.text.length, payload.length, 'full debug payload length should be preserved')
  assert.equal(evidence.text.includes('```json'), true, 'debug fence should remain present')
  assert.deepEqual(evidence.excludedInputCategories, [])
})

test('real debug JSON payload keeps fenced metadata stack and error content', () => {
  const prompt = extractPromptFromMessages([
    {
      role: 'user',
      content: [
        'What is wrong with this?',
        '```json',
        JSON.stringify({
          metadata: { requestId: 'real-user-debug-payload' },
          stack: 'TypeError: Cannot read properties of undefined',
          error: 'runtime crash',
        }, null, 2),
        '```',
      ].join('\n'),
    },
  ])

  assert.match(prompt, /What is wrong with this\?/u)
  assert.match(prompt, /```json/u)
  assert.match(prompt, /"metadata"/u)
  assert.match(prompt, /"stack"/u)
  assert.match(prompt, /"error"/u)
})

test('unwrapped debug payload containing latest user marker is not truncated', () => {
  const prompt = extractPromptFromMessages([
    {
      role: 'user',
      content: [
        'Debug this production failure before answering the marker text.',
        '```json',
        JSON.stringify({
          metadata: { requestId: 'real-unwrapped-debug-payload' },
          stack: 'Error: migration failed at applyStep',
          error: 'SQL timeout while updating metadata',
        }, null, 2),
        '```',
        'log: 2026-04-30T08:15:00Z ERROR applyStep failed after retry',
        '```sql',
        'ALTER TABLE audit_log ADD COLUMN metadata JSON;',
        '```',
        'Design note: preserve rollback and observability.',
        'Latest user message:',
        'OK',
      ].join('\n'),
    },
  ])

  assert.match(prompt, /Debug this production failure/u)
  assert.match(prompt, /Latest user message:/u)
  assert.match(prompt, /"metadata"/u)
  assert.match(prompt, /"stack"/u)
  assert.match(prompt, /"error"/u)
  assert.match(prompt, /ALTER TABLE audit_log/u)
  assert.match(prompt, /Design note/u)
})

test('latest user text preserves real SQL and design payload blocks', () => {
  const prompt = extractPromptFromMessages([
    {
      role: 'user',
      content: [
        'Conversation info:',
        'channel=feishu',
        'source=channel-envelope',
        '',
        'untrusted metadata:',
        '```json',
        JSON.stringify({ channel: 'feishu', metadata: { envelope: true } }, null, 2),
        '```',
        '',
        'Latest user message:',
        'Analyze this SQL and design a safer migration.',
        '```sql',
        'ALTER TABLE users ADD COLUMN metadata JSON;',
        '```',
        'Architecture design notes: keep rollback explicit.',
      ].join('\n'),
    },
  ])

  assert.match(prompt, /Analyze this SQL/u)
  assert.match(prompt, /```sql/u)
  assert.match(prompt, /metadata JSON/u)
  assert.match(prompt, /Architecture design notes/u)
})

test('raw current complex and reasoning prompts remain available for tier classification', () => {
  assert.equal(
    extractPromptFromMessages([{ role: 'user', content: 'debug this stack trace and fix the code' }]),
    'debug this stack trace and fix the code',
  )
  assert.equal(
    extractPromptFromMessages([{ role: 'user', content: 'solve this logic proof step by step' }]),
    'solve this logic proof step by step',
  )
})

test('Feishu pre-reload model evidence is ignored without active instance authority match', () => {
  const active = {
    packRoot: '/active/pack',
    configPath: '/active/profile/openclaw.json',
    profile: 'usb-portable',
    uiPort: 19000,
    gatewayPort: 18930,
    routerPort: 18412,
    provider: 'opensparrow-router',
    model: 'opensparrow-router/auto',
    reloadEpoch: 20,
  }
  const evidence = {
    channel: 'feishu',
    packRoot: '/old/pack',
    configPath: '/old/profile/openclaw.json',
    profile: 'usb-portable',
    uiPort: 19000,
    gatewayPort: 18930,
    routerPort: 18412,
    provider: 'openai',
    model: 'gpt-4o-mini',
    reloadEpoch: 19,
    preReload: true,
  }

  assert.equal(typeof routing.classifyChannelAuthorityEvidence, 'function')
  const result = routing.classifyChannelAuthorityEvidence(evidence, active)

  assert.equal(result.accepted, false)
  assert.equal(result.ignored, true)
  assert.equal(result.channel, 'feishu')
  assert.equal(result.classification, 'stale_pre_reload_evidence')
  assert.match(result.reasons.join('\n'), /pre-reload|reload/i)
})

test('active opensparrow-router auto evidence is accepted only when instance fields match', () => {
  const active = {
    packRoot: '/active/pack',
    configPath: '/active/profile/openclaw.json',
    profile: 'usb-portable',
    uiPort: 19000,
    gatewayPort: 18930,
    routerPort: 18412,
    provider: 'opensparrow-router',
    model: 'opensparrow-router/auto',
  }

  assert.equal(typeof routing.classifyChannelAuthorityEvidence, 'function')
  const accepted = routing.classifyChannelAuthorityEvidence({
    channel: 'dingtalk',
    packRoot: '/active/pack',
    configPath: '/active/profile/openclaw.json',
    profile: 'usb-portable',
    uiPort: 19000,
    gatewayPort: 18930,
    routerPort: 18412,
    provider: 'opensparrow-router',
    model: 'opensparrow-router/auto',
  }, active)

  assert.equal(accepted.accepted, true)
  assert.equal(accepted.classification, 'current_authority')

  const stale = routing.classifyChannelAuthorityEvidence({
    channel: 'wecom',
    packRoot: '/active/pack',
    configPath: '/different/profile/openclaw.json',
    profile: 'usb-portable',
    uiPort: 19000,
    gatewayPort: 18930,
    routerPort: 18412,
    provider: 'opensparrow-router',
    model: 'opensparrow-router/auto',
  }, active)

  assert.equal(stale.accepted, false)
  assert.equal(stale.ignored, true)
  assert.equal(stale.classification, 'stale_instance_evidence')
  assert.match(stale.reasons.join('\n'), /configPath/u)
})

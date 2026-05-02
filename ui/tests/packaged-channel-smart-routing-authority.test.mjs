import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

import {
  getModelRoutingConfig,
  saveModelRoutingConfig,
} from '../lib/model-routing-config.mjs'
import {
  CUSTOM_ROUTER_MODEL_ID,
  CUSTOM_ROUTER_MODEL_TARGET,
  CUSTOM_ROUTER_PROVIDER_ID,
  OPENAI_COMPAT_API,
} from '../../scripts/model-routing/lib/custom-plugin-routing.mjs'

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')
const TIERS = ['SIMPLE', 'MEDIUM', 'COMPLEX', 'REASONING']
const ROUTER_TIER_MODELS = {
  SIMPLE: 'gpt-4o',
  MEDIUM: 'gpt-5.4-nano',
  COMPLEX: 'gpt-5.4',
  REASONING: 'gpt-5.5',
}
const ROUTER_TIER_KEYS = {
  SIMPLE: 'sk-test-simple-key-SHOULD_NOT_LEAK',
  MEDIUM: 'sk-test-medium-key-SHOULD_NOT_LEAK',
  COMPLEX: 'sk-test-complex-key-SHOULD_NOT_LEAK',
  REASONING: 'sk-test-reasoning-key-SHOULD_NOT_LEAK',
}
const SIMPLE_CURRENT_TEXT = 'reply OK only for CURRENT_USER_TEXT_SHOULD_NOT_LEAK'
const SYNTHETIC_SECRETS = [
  ...Object.values(ROUTER_TIER_KEYS),
  'fake-auth-profile-key-SHOULD_NOT_LEAK',
  'fake-gateway-token-SHOULD_NOT_LEAK',
  'fake-dingtalk-client-secret-SHOULD_NOT_LEAK',
  'fake-wecom-channel-secret-SHOULD_NOT_LEAK',
]
const RAW_ENVELOPE_MARKERS = [
  'Conversation info',
  'untrusted metadata',
  'source=channel-envelope',
  '```json',
  SIMPLE_CURRENT_TEXT,
]

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'opensparrow-channel-routing-'))
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function writeJson(filePath, payload) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function getProfileDir(homeDir, profile = 'usb-portable') {
  return path.join(homeDir, `.openclaw-${profile}`)
}

function getConfigPath(homeDir, profile = 'usb-portable') {
  return path.join(getProfileDir(homeDir, profile), 'openclaw.json')
}

function getAuthProfilesPath(homeDir, profile = 'usb-portable') {
  return path.join(getProfileDir(homeDir, profile), 'agents', 'main', 'agent', 'auth-profiles.json')
}

async function findFreePort() {
  return await new Promise((resolve, reject) => {
    const server = http.createServer()
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close((error) => {
        if (error) reject(error)
        else resolve(port)
      })
    })
    server.on('error', reject)
  })
}

async function stopServer(server) {
  if (!server) return
  await new Promise((resolve) => server.close(() => resolve()))
}

async function stopChild(child) {
  if (!child || child.exitCode !== null) return
  child.kill('SIGTERM')
  await new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      if (child.exitCode === null) child.kill('SIGKILL')
    }, 2000)
    child.once('exit', () => {
      clearTimeout(timeoutId)
      resolve()
    })
  })
}

async function waitForServerReady(child, port, timeoutMs = 15000) {
  const target = `Listening: http://localhost:${port}`
  return await new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''

    const timeoutId = setTimeout(() => {
      cleanup()
      reject(new Error(`ui server did not become ready within ${timeoutMs}ms\nstdout:\n${stdout}\nstderr:\n${stderr}`))
    }, timeoutMs)
    const onStdout = (chunk) => {
      stdout += chunk.toString()
      if (stdout.includes(target)) {
        cleanup()
        resolve({ stdout, stderr })
      }
    }
    const onStderr = (chunk) => {
      stderr += chunk.toString()
    }
    const onExit = (code, signal) => {
      cleanup()
      reject(new Error(`ui server exited before ready (code=${code}, signal=${signal})\nstdout:\n${stdout}\nstderr:\n${stderr}`))
    }
    const cleanup = () => {
      clearTimeout(timeoutId)
      child.stdout.off('data', onStdout)
      child.stderr.off('data', onStderr)
      child.off('exit', onExit)
    }

    child.stdout.on('data', onStdout)
    child.stderr.on('data', onStderr)
    child.on('exit', onExit)
  })
}

async function startUiServer({ homeDir, uiPort, routerPort }) {
  const child = spawn(process.execPath, ['ui/server.mjs'], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      OPENCLAW_HOME: homeDir,
      OPENSPARROW_AUTO_OPEN: '0',
      OPENSPARROW_UI_PORT: String(uiPort),
      OPENSPARROW_ROUTER_PORT: String(routerPort),
      USB_RUNTIME_ROOT: path.join(homeDir, 'unused-runtime'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  await waitForServerReady(child, uiPort)
  return child
}

async function readRequestJson(req) {
  return await new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => { raw += chunk.toString() })
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

async function startUpstreamFixture({ tier, expectedModel, expectedApiKey }) {
  const port = await findFreePort()
  const calls = []
  const server = http.createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/v1/chat/completions') {
      res.writeHead(404, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'unexpected route' }))
      return
    }

    const body = await readRequestJson(req)
    const authorizationOk = req.headers.authorization === `Bearer ${expectedApiKey}`
    const modelOk = body?.model === expectedModel
    calls.push({ authorizationOk, modelOk, body })

    if (!authorizationOk || !modelOk) {
      res.writeHead(409, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: false, tier, authorizationOk, modelOk }))
      return
    }

    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({
      id: `fixture-${tier}`,
      object: 'chat.completion',
      model: body.model,
      choices: [{ index: 0, message: { role: 'assistant', content: tier }, finish_reason: 'stop' }],
    }))
  })

  await new Promise((resolve, reject) => {
    server.listen(port, '127.0.0.1', resolve)
    server.on('error', reject)
  })

  return {
    server,
    calls,
    baseUrl: `http://127.0.0.1:${port}/v1`,
  }
}

function buildTierConnectionMap(upstreams) {
  return Object.fromEntries(TIERS.map((tier) => [
    tier,
    {
      baseUrl: upstreams[tier].baseUrl,
      apiKey: ROUTER_TIER_KEYS[tier],
      model: ROUTER_TIER_MODELS[tier],
    },
  ]))
}

function writeSmartRouterConfig(homeDir, upstreams) {
  const tierConnectionMap = buildTierConnectionMap(upstreams)
  writeJson(getConfigPath(homeDir), {
    models: {
      providers: {
        [CUSTOM_ROUTER_PROVIDER_ID]: {
          baseUrl: 'http://127.0.0.1:18412/v1',
          api: OPENAI_COMPAT_API,
          models: [{ id: CUSTOM_ROUTER_MODEL_ID, name: CUSTOM_ROUTER_MODEL_ID, api: OPENAI_COMPAT_API }],
        },
      },
    },
    agents: {
      defaults: {
        model: {
          primary: CUSTOM_ROUTER_MODEL_TARGET,
        },
      },
    },
    plugins: {
      allow: [CUSTOM_ROUTER_PROVIDER_ID],
      entries: {
        [CUSTOM_ROUTER_PROVIDER_ID]: {
          enabled: true,
          config: {
            tierConnectionMap,
            tierModelMap: Object.fromEntries(TIERS.map((tier) => [tier, ROUTER_TIER_MODELS[tier]])),
            routing: {},
          },
        },
      },
    },
  })
  writeJson(getAuthProfilesPath(homeDir), {
    version: 1,
    profiles: {
      [`${CUSTOM_ROUTER_PROVIDER_ID}:default`]: {
        type: 'api_key',
        provider: CUSTOM_ROUTER_PROVIDER_ID,
        key: 'fake-auth-profile-key-SHOULD_NOT_LEAK',
      },
    },
    order: { [CUSTOM_ROUTER_PROVIDER_ID]: [`${CUSTOM_ROUTER_PROVIDER_ID}:default`] },
  })
}

function wrappedChannelPrompt(channel, currentText) {
  const secretKey = channel === 'dingtalk'
    ? 'clientSecret'
    : channel === 'wecom'
      ? 'secret'
      : 'appSecret'
  const secretValue = channel === 'dingtalk'
    ? 'fake-dingtalk-client-secret-SHOULD_NOT_LEAK'
    : channel === 'wecom'
      ? 'fake-wecom-channel-secret-SHOULD_NOT_LEAK'
      : 'fake-feishu-app-secret-SHOULD_NOT_LEAK'

  return [
    'Conversation info:',
    `channel=${channel}`,
    'source=channel-envelope',
    '',
    'untrusted metadata:',
    '```json',
    JSON.stringify({
      channel,
      transport: 'channel-envelope',
      format: 'json',
      gatewayToken: 'fake-gateway-token-SHOULD_NOT_LEAK',
      [secretKey]: secretValue,
      metadata: {
        senderId: 'synthetic-sender',
        debug: true,
        stack: 'metadata-only',
        regex: 'metadata-only',
      },
      history: [
        { role: 'user', content: 'solve this logic proof step by step' },
        { role: 'assistant', content: 'old answer' },
      ],
    }, null, 2),
    '```',
    '',
    'Latest user message:',
    currentText,
  ].join('\n')
}

function liveCompatibleWrappedPrompt(currentText) {
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
        regex: 'metadata-only',
      },
      history: [
        { role: 'user', content: 'solve this logic proof step by step' },
        { role: 'assistant', content: 'old answer' },
      ],
    }, null, 2),
    '```',
    '',
    currentText,
  ].join('\n')
}

function redactedLiveWeComWrappedPrompt(currentText) {
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

function redactedTrueLiveFeishuWrappedPrompt(currentText) {
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

function collectRouterDiagnostics(response) {
  return [
    `x-opensparrow-router-tier: ${response.headers.get('x-opensparrow-router-tier') ?? ''}`,
    `x-opensparrow-router-model: ${response.headers.get('x-opensparrow-router-model') ?? ''}`,
    `x-opensparrow-router-channel: ${response.headers.get('x-opensparrow-router-channel') ?? ''}`,
    `x-opensparrow-router-input-source: ${response.headers.get('x-opensparrow-router-input-source') ?? ''}`,
    `x-opensparrow-router-input-length: ${response.headers.get('x-opensparrow-router-input-length') ?? ''}`,
    `x-opensparrow-router-input-hash: ${response.headers.get('x-opensparrow-router-input-hash') ?? ''}`,
    `x-opensparrow-router-session-hash: ${response.headers.get('x-opensparrow-router-session-hash') ?? ''}`,
    `x-opensparrow-router-authority: ${response.headers.get('x-opensparrow-router-authority') ?? ''}`,
    `x-opensparrow-router-excluded: ${response.headers.get('x-opensparrow-router-excluded') ?? ''}`,
  ].join('\n')
}

async function waitForChildStdoutLine(child, marker, timeoutMs = 5000) {
  return await new Promise((resolve, reject) => {
    let buffer = ''
    const timeoutId = setTimeout(() => {
      cleanup()
      reject(new Error(`timed out waiting for child stdout marker ${marker}`))
    }, timeoutMs)
    const cleanup = () => {
      clearTimeout(timeoutId)
      child.stdout.off('data', onData)
      child.off('exit', onExit)
    }
    const onData = (chunk) => {
      buffer += chunk.toString()
      const lines = buffer.split(/\r?\n/u)
      const matched = lines.find((line) => line.includes(marker))
      if (matched) {
        cleanup()
        resolve(matched)
      }
    }
    const onExit = (code, signal) => {
      cleanup()
      reject(new Error(`child exited before stdout marker ${marker} (code=${code}, signal=${signal})`))
    }
    child.stdout.on('data', onData)
    child.once('exit', onExit)
  })
}

async function postRouter(routerPort, channel, body) {
  return await fetch(`http://127.0.0.1:${routerPort}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-openclaw-message-channel': channel,
      'x-openclaw-session-key': 'agent:main:main',
    },
    body: JSON.stringify(body),
  })
}

test('packaged channel smart routing uses current user text and emits redacted diagnostics', { timeout: 25000 }, async (t) => {
  const homeDir = makeTempDir()
  const uiPort = await findFreePort()
  const routerPort = await findFreePort()
  const upstreams = {}

  for (const tier of TIERS) {
    upstreams[tier] = await startUpstreamFixture({
      tier,
      expectedModel: ROUTER_TIER_MODELS[tier],
      expectedApiKey: ROUTER_TIER_KEYS[tier],
    })
    t.after(async () => {
      await stopServer(upstreams[tier].server)
    })
  }

  writeSmartRouterConfig(homeDir, upstreams)

  const child = await startUiServer({ homeDir, uiPort, routerPort })
  t.after(async () => {
    await stopChild(child)
  })

  const cases = [
    {
      name: 'DingTalk wrapped simple prompt',
      channel: 'dingtalk',
      expectedTier: 'SIMPLE',
      expectedModel: 'gpt-4o',
      body: {
        model: CUSTOM_ROUTER_MODEL_TARGET,
        max_tokens: 8192,
        messages: [
          { role: 'user', content: 'solve this logic proof step by step' },
          { role: 'assistant', content: 'old answer' },
          { role: 'user', content: wrappedChannelPrompt('dingtalk', SIMPLE_CURRENT_TEXT) },
        ],
      },
    },
    {
      name: 'WeCom wrapped simple prompt',
      channel: 'wecom',
      expectedTier: 'SIMPLE',
      expectedModel: 'gpt-4o',
      body: {
        model: CUSTOM_ROUTER_MODEL_TARGET,
        max_tokens: 8192,
        messages: [
          { role: 'system', content: 'tool context mentions json, regex, stack, debug and must be ignored' },
          { role: 'user', content: 'debug this stack trace and fix the code' },
          { role: 'assistant', content: 'old answer' },
          { role: 'user', content: [{ type: 'text', text: wrappedChannelPrompt('wecom', SIMPLE_CURRENT_TEXT) }] },
        ],
      },
    },
    {
      name: 'literal JSON metadata without current text',
      channel: 'feishu',
      expectedTier: 'COMPLEX',
      expectedModel: 'gpt-5.4',
      expectedSource: 'raw-current-user-text',
      body: {
        model: CUSTOM_ROUTER_MODEL_TARGET,
        max_tokens: 8192,
        messages: [
          {
            role: 'user',
            content: [
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
            ].join('\n'),
          },
        ],
      },
    },
    {
      name: 'unwrapped marker-like debug JSON payload',
      channel: 'feishu',
      expectedTier: 'COMPLEX',
      expectedModel: 'gpt-5.4',
      expectedSource: 'raw-current-user-text',
      body: {
        model: CUSTOM_ROUTER_MODEL_TARGET,
        max_tokens: 8192,
        messages: [
          {
            role: 'user',
            content: markerLikeRealDebugPayload(),
          },
        ],
      },
    },
    {
      name: 'live-compatible wrapped simple prompt without explicit channel marker',
      channel: 'feishu',
      expectedTier: 'SIMPLE',
      expectedModel: 'gpt-4o',
      body: {
        model: CUSTOM_ROUTER_MODEL_TARGET,
        max_tokens: 8192,
        messages: [
          { role: 'user', content: 'debug this stack trace and fix the code' },
          { role: 'assistant', content: 'old answer' },
          { role: 'user', content: liveCompatibleWrappedPrompt(SIMPLE_CURRENT_TEXT) },
        ],
      },
    },
    {
      name: 'redacted live WeCom wrapped simple prompt without explicit channel or latest-user markers',
      channel: 'wecom',
      expectedTier: 'SIMPLE',
      expectedModel: 'gpt-4o',
      expectedSource: 'sanitized-current-user-text',
      expectedExcluded: ['channel-envelope', 'json-metadata', 'history'],
      body: {
        model: CUSTOM_ROUTER_MODEL_TARGET,
        max_tokens: 8192,
        messages: [
          { role: 'system', content: 'tool context mentions json, regex, stack, debug and must be ignored' },
          { role: 'user', content: 'debug this stack trace and fix the code' },
          { role: 'assistant', content: 'old answer' },
          { role: 'user', content: redactedLiveWeComWrappedPrompt(SIMPLE_CURRENT_TEXT) },
        ],
      },
    },
    {
      name: 'redacted true-live Feishu wrapped simple prompt without explicit channel or latest-user markers',
      channel: 'feishu',
      expectedTier: 'SIMPLE',
      expectedModel: 'gpt-4o',
      expectedSource: 'sanitized-current-user-text',
      expectedExcluded: ['channel-envelope', 'json-metadata'],
      body: {
        model: CUSTOM_ROUTER_MODEL_TARGET,
        max_tokens: 8192,
        messages: [
          { role: 'system', content: 'tool context mentions json, regex, stack, debug and must be ignored' },
          { role: 'user', content: 'debug this stack trace and fix the code' },
          { role: 'assistant', content: 'old answer' },
          { role: 'user', content: redactedTrueLiveFeishuWrappedPrompt(SIMPLE_CURRENT_TEXT) },
        ],
      },
    },
    {
      name: 'redacted true-live Feishu wrapped complex prompt without explicit channel or latest-user markers',
      channel: 'feishu',
      expectedTier: 'COMPLEX',
      expectedModel: 'gpt-5.4',
      expectedSource: 'sanitized-current-user-text',
      expectedExcluded: ['channel-envelope', 'json-metadata'],
      body: {
        model: CUSTOM_ROUTER_MODEL_TARGET,
        max_tokens: 8192,
        messages: [
          { role: 'user', content: 'reply OK only' },
          { role: 'assistant', content: 'old answer' },
          { role: 'user', content: redactedTrueLiveFeishuWrappedPrompt('debug this stack trace and fix the code') },
        ],
      },
    },
    {
      name: 'real fenced JSON debug payload',
      channel: 'feishu',
      expectedTier: 'COMPLEX',
      expectedModel: 'gpt-5.4',
      body: {
        model: CUSTOM_ROUTER_MODEL_TARGET,
        max_tokens: 8192,
        messages: [
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
        ],
      },
    },
    {
      name: 'unwrapped marker-bearing debug log payload',
      channel: 'feishu',
      expectedTier: 'COMPLEX',
      expectedModel: 'gpt-5.4',
      body: {
        model: CUSTOM_ROUTER_MODEL_TARGET,
        max_tokens: 8192,
        messages: [
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
        ],
      },
    },
    {
      name: 'wrapped current user SQL and design payload',
      channel: 'dingtalk',
      expectedTier: 'COMPLEX',
      expectedModel: 'gpt-5.4',
      body: {
        model: CUSTOM_ROUTER_MODEL_TARGET,
        max_tokens: 8192,
        messages: [
          {
            role: 'user',
            content: [
              'Conversation info:',
              'channel=dingtalk',
              'source=channel-envelope',
              '',
              'untrusted metadata:',
              '```json',
              JSON.stringify({ channel: 'dingtalk', metadata: { envelope: true } }, null, 2),
              '```',
              '',
              'Latest user message:',
              'Analyze this SQL and design a safer migration.',
              '```sql',
              'ALTER TABLE users ADD COLUMN metadata JSON;',
              '```',
            ].join('\n'),
          },
        ],
      },
    },
    {
      name: 'raw complex current text',
      channel: 'feishu',
      expectedTier: 'COMPLEX',
      expectedModel: 'gpt-5.4',
      body: {
        model: CUSTOM_ROUTER_MODEL_TARGET,
        max_tokens: 8192,
        messages: [{ role: 'user', content: 'debug this stack trace and fix the code' }],
      },
    },
    {
      name: 'raw reasoning current text',
      channel: 'feishu',
      expectedTier: 'REASONING',
      expectedModel: 'gpt-5.5',
      body: {
        model: CUSTOM_ROUTER_MODEL_TARGET,
        max_tokens: 8192,
        messages: [{ role: 'user', content: 'solve this logic proof step by step' }],
      },
    },
  ]

  for (const item of cases) {
    const response = await postRouter(routerPort, item.channel, item.body)
    assert.equal(response.status, 200, item.name)
    assert.equal(response.headers.get('x-opensparrow-router-tier'), item.expectedTier, item.name)
    assert.equal(response.headers.get('x-opensparrow-router-model'), item.expectedModel, item.name)
    assert.equal(response.headers.get('x-opensparrow-router-channel'), item.channel, item.name)
    assert.ok(response.headers.get('x-opensparrow-router-input-source'), item.name)
    if (item.expectedSource) {
      assert.equal(response.headers.get('x-opensparrow-router-input-source'), item.expectedSource, item.name)
    }
    if (item.expectedExcluded) {
      const excluded = response.headers.get('x-opensparrow-router-excluded') ?? ''
      for (const category of item.expectedExcluded) {
        assert.match(excluded, new RegExp(`(?:^|,)${category}(?:,|$)`, 'u'), item.name)
      }
    }
    assert.ok(response.headers.get('x-opensparrow-router-input-length'), item.name)
    assert.match(response.headers.get('x-opensparrow-router-input-hash') ?? '', /^[a-f0-9]{16}$/u, item.name)
    assert.equal(response.headers.get('x-opensparrow-router-authority'), CUSTOM_ROUTER_MODEL_TARGET, item.name)

    const payload = await response.json()
    assert.equal(payload.model, item.expectedModel, item.name)
  }

  const redactedDiagnostics = collectRouterDiagnostics(
    await postRouter(routerPort, 'dingtalk', cases[0].body),
  )
  assert.match(redactedDiagnostics, /x-opensparrow-router-input-source: sanitized-current-user-text/u)
  assert.match(redactedDiagnostics, /x-opensparrow-router-excluded: .*channel-envelope/u)
  for (const value of SYNTHETIC_SECRETS) {
    assert.equal(redactedDiagnostics.includes(value), false, `diagnostics leaked ${value}`)
  }
  for (const value of RAW_ENVELOPE_MARKERS) {
    assert.equal(redactedDiagnostics.includes(value), false, `diagnostics leaked ${value}`)
  }

  const routerLogPromise = waitForChildStdoutLine(child, '[router-invoked]')
  const observedRouterResponse = await postRouter(routerPort, 'feishu', cases[0].body)
  assert.equal(observedRouterResponse.status, 200)
  await observedRouterResponse.json()
  const routerLogLine = await routerLogPromise
  assert.match(routerLogLine, /"phase":"router-invoked"/u)
  assert.match(routerLogLine, /"channel":"feishu"/u)
  assert.match(routerLogLine, /"sessionKeyHash":"[a-f0-9]{16}"/u)
  assert.match(routerLogLine, /"inputHash":"[a-f0-9]{16}"/u)
  assert.match(routerLogLine, /"selectedTier":"SIMPLE"/u)
  assert.match(routerLogLine, /"outboundModel":"gpt-4o"/u)
  assert.match(routerLogLine, /"upstreamBaseUrlOrigin":"http:\/\/127\.0\.0\.1:/u)
  assert.equal(routerLogLine.includes(SIMPLE_CURRENT_TEXT), false)
  assert.equal(routerLogLine.includes('agent:main:main'), false)
  for (const value of SYNTHETIC_SECRETS) {
    assert.equal(routerLogLine.includes(value), false, `router log leaked ${value}`)
  }

  const unknownChannelResponse = await postRouter(routerPort, 'unknown-channel-secret-SHOULD_NOT_LEAK', cases[0].body)
  assert.equal(unknownChannelResponse.status, 200)
  assert.equal(unknownChannelResponse.headers.get('x-opensparrow-router-channel'), 'unknown')

  const expectedCallsByTier = {
    SIMPLE: cases.filter((item) => item.expectedTier === 'SIMPLE').length + 3,
    MEDIUM: cases.filter((item) => item.expectedTier === 'MEDIUM').length,
    COMPLEX: cases.filter((item) => item.expectedTier === 'COMPLEX').length,
    REASONING: cases.filter((item) => item.expectedTier === 'REASONING').length,
  }
  assert.equal(upstreams.SIMPLE.calls.length, expectedCallsByTier.SIMPLE)
  assert.equal(upstreams.MEDIUM.calls.length, expectedCallsByTier.MEDIUM)
  assert.equal(upstreams.COMPLEX.calls.length, expectedCallsByTier.COMPLEX)
  assert.equal(upstreams.REASONING.calls.length, expectedCallsByTier.REASONING)
})

test('model routing authority preserves single-mode behavior and internal router ids', () => {
  const root = makeTempDir()
  const configFile = path.join(root, 'openclaw.json')
  const authFile = path.join(root, 'agents', 'main', 'agent', 'auth-profiles.json')
  const uiMetaFile = path.join(root, 'ui-meta.json')

  writeJson(configFile, {
    models: {
      providers: {
        openai: {
          baseUrl: 'https://single.example.invalid/v1',
          models: [{ id: 'gpt-existing', name: 'gpt-existing', api: OPENAI_COMPAT_API }],
        },
      },
    },
    agents: {
      defaults: {
        model: {
          primary: 'openai/gpt-existing',
        },
      },
    },
  })
  writeJson(authFile, {
    version: 1,
    profiles: {
      'openai:default': { type: 'api_key', provider: 'openai', key: 'fake-auth-profile-key-SHOULD_NOT_LEAK' },
    },
    order: { openai: ['openai:default'] },
  })

  const singleResult = saveModelRoutingConfig({ configFile, authFile, uiMetaFile, routerPort: 18412 }, {
    mode: 'single',
    baseUrl: 'https://single.example.invalid/v1',
    apiKey: '',
    model: 'gpt-single-authority',
  })

  assert.equal(singleResult.ok, true)
  assert.equal(singleResult.mode, 'single')
  assert.equal(singleResult.effectivePrimaryModel, 'openai/gpt-single-authority')

  const singleConfig = readJson(configFile)
  assert.equal(singleConfig.agents.defaults.model.primary, 'openai/gpt-single-authority')
  assert.equal(singleConfig.models.providers.openai.models[0].id, 'gpt-single-authority')

  const readBack = getModelRoutingConfig({ configFile, authFile, uiMetaFile, routerPort: 18412 })
  assert.equal(readBack.mode, 'single')
  assert.equal(readBack.router.providerId, CUSTOM_ROUTER_PROVIDER_ID)
  assert.equal(readBack.router.modelTarget, CUSTOM_ROUTER_MODEL_TARGET)
})

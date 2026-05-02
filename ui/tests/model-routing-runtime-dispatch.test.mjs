import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')
const TIERS = ['SIMPLE', 'MEDIUM', 'COMPLEX', 'REASONING']

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'opensparrow-router-dispatch-'))
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function writeJson(filePath, payload) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8')
}

function getProfileDir(homeDir, profile = 'usb-portable') {
  return path.join(homeDir, `.openclaw-${profile}`)
}

function getConfigPath(homeDir, profile = 'usb-portable') {
  return path.join(getProfileDir(homeDir, profile), 'openclaw.json')
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

function liveCompatibleChannelPrompt(currentText) {
  return [
    'OpenSparrow live channel ingress control preamble',
    'Conversation info snapshot for packaged external channel ingress',
    '',
    '```json',
    JSON.stringify({
      wrapper: {
        kind: 'live-channel-ingress',
        source: 'external-message-plugin',
      },
      transport: {
        plugin: 'feishu-openclaw-plugin',
        session: 'agent:main:main',
      },
      request: {
        format: 'json',
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

test('router outbound provider body model follows selected tier config instead of OpenAI provider default', { timeout: 20000 }, async (t) => {
  const homeDir = makeTempDir()
  const uiPort = await findFreePort()
  const routerPort = await findFreePort()
  const tierModels = {
    SIMPLE: 'gpt-4o',
    MEDIUM: 'gpt-5.4-nano',
    COMPLEX: 'gpt-5.4',
    REASONING: 'gpt-5.5',
  }
  const upstreams = {}

  for (const tier of TIERS) {
    upstreams[tier] = await startUpstreamFixture({
      tier,
      expectedModel: tierModels[tier],
      expectedApiKey: `${tier.toLowerCase()}-authority-key`,
    })
    t.after(async () => {
      await stopServer(upstreams[tier].server)
    })
  }

  writeJson(getConfigPath(homeDir), {
    models: {
      providers: {
        openai: {
          baseUrl: 'https://provider-default.example/v1',
          models: [{ id: 'gpt-4o-mini', name: 'gpt-4o-mini', api: 'openai-completions' }],
        },
        'opensparrow-router': {
          baseUrl: `http://127.0.0.1:${routerPort}/v1`,
          api: 'openai-completions',
          models: [{ id: 'auto', name: 'auto', api: 'openai-completions' }],
        },
      },
      default: 'openai/gpt-4o-mini',
    },
    agents: {
      defaults: {
        model: {
          primary: 'opensparrow-router/auto',
        },
      },
    },
    plugins: {
      entries: {
        'opensparrow-router': {
          enabled: true,
          config: {
            tierConnectionMap: Object.fromEntries(TIERS.map((tier) => [
              tier,
              {
                baseUrl: upstreams[tier].baseUrl,
                apiKey: `${tier.toLowerCase()}-authority-key`,
                model: tierModels[tier],
              },
            ])),
            tierModelMap: tierModels,
            routing: {},
          },
        },
      },
    },
  })

  const child = await startUiServer({ homeDir, uiPort, routerPort })
  t.after(async () => {
    await stopChild(child)
  })

  const cases = [
    {
      tier: 'SIMPLE',
      body: {
        model: 'opensparrow-router/auto',
        max_tokens: 8192,
        messages: [{ role: 'user', content: liveCompatibleChannelPrompt('reply OK only') }],
      },
    },
    {
      tier: 'MEDIUM',
      body: {
        model: 'opensparrow-router/auto',
        max_tokens: 8192,
        messages: [{ role: 'user', content: '请把下面的会议记录整理成行动项清单，按负责人、截止 时间、风险点分类，并补充一段给团队群的简短同步消 息：今天讨论了客服工单积压问题，张三负责梳理高频问 题，周五前给出分类；李四负责检查自动回复规则，明天 下午前提交修改建议；王五负责统计过去两周超时工单， 后天中午前给出报表。风险是节假日前咨询量会上升，当前值班人手不足。' }],
      },
    },
    {
      tier: 'COMPLEX',
      body: {
        model: 'opensparrow-router/auto',
        max_tokens: 8192,
        messages: [{ role: 'user', content: 'debug this stack trace and fix the code' }],
      },
    },
    {
      tier: 'REASONING',
      body: {
        model: 'opensparrow-router/auto',
        max_tokens: 8192,
        messages: [{ role: 'user', content: 'solve this logic proof step by step' }],
      },
    },
  ]

  for (const item of cases) {
    const response = await fetch(`http://127.0.0.1:${routerPort}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-openclaw-message-channel': 'feishu',
        'x-openclaw-session-key': 'agent:main:main',
      },
      body: JSON.stringify(item.body),
    })
    assert.equal(response.status, 200, item.tier)
    assert.equal(response.headers.get('x-opensparrow-router-tier'), item.tier, item.tier)
    assert.equal(response.headers.get('x-opensparrow-router-model'), tierModels[item.tier], item.tier)
    await response.json()
  }

  for (const tier of TIERS) {
    assert.equal(upstreams[tier].calls.length, 1, tier)
    assert.equal(upstreams[tier].calls[0].body.model, tierModels[tier], tier)
    assert.notEqual(upstreams[tier].calls[0].body.model, 'gpt-4o-mini', tier)
  }
})

test('router fallback uses later tier config with a redacted reason and never provider default', { timeout: 20000 }, async (t) => {
  const homeDir = makeTempDir()
  const uiPort = await findFreePort()
  const routerPort = await findFreePort()
  const tierModels = {
    SIMPLE: 'gpt-4o',
    MEDIUM: 'gpt-5.4-nano',
    COMPLEX: 'gpt-5.4',
    REASONING: 'gpt-5.5',
  }
  const upstreams = {}

  for (const tier of TIERS) {
    upstreams[tier] = await startUpstreamFixture({
      tier,
      expectedModel: tierModels[tier],
      expectedApiKey: `${tier.toLowerCase()}-fallback-key`,
    })
    t.after(async () => {
      await stopServer(upstreams[tier].server)
    })
  }

  writeJson(getConfigPath(homeDir), {
    models: {
      providers: {
        openai: {
          baseUrl: 'https://provider-default.example/v1',
          models: [{ id: 'gpt-4o-mini', name: 'gpt-4o-mini', api: 'openai-completions' }],
        },
        'opensparrow-router': {
          baseUrl: `http://127.0.0.1:${routerPort}/v1`,
          api: 'openai-completions',
          models: [{ id: 'auto', name: 'auto', api: 'openai-completions' }],
        },
      },
      default: 'openai/gpt-4o-mini',
    },
    agents: {
      defaults: {
        model: {
          primary: 'opensparrow-router/auto',
        },
      },
    },
    plugins: {
      entries: {
        'opensparrow-router': {
          enabled: true,
          config: {
            tierConnectionMap: {
              SIMPLE: {
                baseUrl: upstreams.SIMPLE.baseUrl,
                apiKey: '',
                model: tierModels.SIMPLE,
              },
              ...Object.fromEntries(['MEDIUM', 'COMPLEX', 'REASONING'].map((tier) => [
                tier,
                {
                  baseUrl: upstreams[tier].baseUrl,
                  apiKey: `${tier.toLowerCase()}-fallback-key`,
                  model: tierModels[tier],
                },
              ])),
            },
            tierModelMap: tierModels,
            routing: {},
          },
        },
      },
    },
  })

  const child = await startUiServer({ homeDir, uiPort, routerPort })
  t.after(async () => {
    await stopChild(child)
  })

  const response = await fetch(`http://127.0.0.1:${routerPort}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-openclaw-message-channel': 'feishu',
      'x-openclaw-session-key': 'agent:main:main',
    },
    body: JSON.stringify({
      model: 'opensparrow-router/auto',
      max_tokens: 8192,
      messages: [{ role: 'user', content: liveCompatibleChannelPrompt('reply OK only') }],
    }),
  })

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('x-opensparrow-router-selected-tier'), 'SIMPLE')
  assert.equal(response.headers.get('x-opensparrow-router-tier'), 'MEDIUM')
  assert.equal(response.headers.get('x-opensparrow-router-model'), 'gpt-5.4-nano')
  assert.match(response.headers.get('x-opensparrow-router-fallback-reason') ?? '', /SIMPLE:not-configured/u)
  await response.json()

  assert.equal(upstreams.SIMPLE.calls.length, 0)
  assert.equal(upstreams.MEDIUM.calls.length, 1)
  assert.equal(upstreams.MEDIUM.calls[0].body.model, 'gpt-5.4-nano')
  assert.notEqual(upstreams.MEDIUM.calls[0].body.model, 'gpt-4o-mini')
})

test('router runtime dispatch uses each tier connection baseUrl, key, and model', { timeout: 20000 }, async (t) => {
  const homeDir = makeTempDir()
  const uiPort = await findFreePort()
  const routerPort = await findFreePort()
  const upstreams = {}

  for (const tier of TIERS) {
    upstreams[tier] = await startUpstreamFixture({
      tier,
      expectedModel: `${tier.toLowerCase()}-runtime-model`,
      expectedApiKey: `${tier.toLowerCase()}-runtime-key`,
    })
    t.after(async () => {
      await stopServer(upstreams[tier].server)
    })
  }

  writeJson(getConfigPath(homeDir), {
    models: {
      providers: {
        openai: {
          baseUrl: 'https://existing.example/v1',
          models: [{ id: 'gpt-4o-mini', name: 'gpt-4o-mini', api: 'openai-completions' }],
        },
      },
      default: 'openai/gpt-4o-mini',
    },
    agents: {
      defaults: {
        model: {
          primary: 'opensparrow-router/auto',
        },
      },
    },
    plugins: {
      allow: ['opensparrow-router'],
      entries: {
        'opensparrow-router': {
          enabled: true,
          config: {
            tierConnectionMap: Object.fromEntries(TIERS.map((tier) => [
              tier,
              {
                baseUrl: upstreams[tier].baseUrl,
                apiKey: `${tier.toLowerCase()}-runtime-key`,
                model: `${tier.toLowerCase()}-runtime-model`,
              },
            ])),
            tierModelMap: Object.fromEntries(TIERS.map((tier) => [tier, `${tier.toLowerCase()}-runtime-model`])),
            routing: {},
          },
        },
      },
    },
  })

  const child = await startUiServer({ homeDir, uiPort, routerPort })
  t.after(async () => {
    await stopChild(child)
  })

  const cases = [
    { tier: 'SIMPLE', body: { messages: [{ role: 'user', content: 'hi' }], max_tokens: 50 } },
    {
      tier: 'SIMPLE',
      body: {
        messages: [
          { role: 'user', content: 'solve this logic proof' },
          { role: 'assistant', content: 'ok' },
          { role: 'user', content: '你好，回复 OK。\n\n把这句话翻译成英文：今天下午三点开会。' },
        ],
        max_tokens: 50,
      },
    },
    { tier: 'MEDIUM', body: { messages: [{ role: 'user', content: '请总结这段内容' }], max_tokens: 800 } },
    { tier: 'COMPLEX', body: { messages: [{ role: 'user', content: 'debug this stack trace and fix the code' }], max_tokens: 500 } },
    { tier: 'REASONING', body: { messages: [{ role: 'user', content: 'solve this logic proof' }], max_tokens: 1700 } },
    { tier: 'SIMPLE', body: { messages: [{ role: 'user', content: 'hi' }], max_tokens: 8192 } },
    { tier: 'MEDIUM', body: { messages: [{ role: 'user', content: '请总结这段内容' }], max_tokens: 8192 } },
    { tier: 'COMPLEX', body: { messages: [{ role: 'user', content: 'debug this stack trace and fix the code' }], max_tokens: 8192 } },
    { tier: 'REASONING', body: { messages: [{ role: 'user', content: 'solve this logic proof' }], max_tokens: 8192 } },
  ]

  for (const item of cases) {
    const response = await fetch(`http://127.0.0.1:${routerPort}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(item.body),
    })
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('x-opensparrow-router-tier'), item.tier)
    assert.equal(response.headers.get('x-opensparrow-router-model'), `${item.tier.toLowerCase()}-runtime-model`)
  }

  const expectedCallsByTier = cases.reduce((acc, item) => {
    acc[item.tier] = (acc[item.tier] ?? 0) + 1
    return acc
  }, {})

  for (const tier of TIERS) {
    assert.equal(upstreams[tier].calls.length, expectedCallsByTier[tier])
    assert.equal(upstreams[tier].calls.every((call) => call.authorizationOk), true)
    assert.equal(upstreams[tier].calls.every((call) => call.modelOk), true)
  }
})

test('router runtime dispatch handles Feishu WeCom and DingTalk channel-shaped prompts', { timeout: 20000 }, async (t) => {
  const homeDir = makeTempDir()
  const uiPort = await findFreePort()
  const routerPort = await findFreePort()
  const upstreams = {}

  for (const tier of TIERS) {
    upstreams[tier] = await startUpstreamFixture({
      tier,
      expectedModel: `${tier.toLowerCase()}-channel-model`,
      expectedApiKey: `${tier.toLowerCase()}-channel-key`,
    })
    t.after(async () => {
      await stopServer(upstreams[tier].server)
    })
  }

  writeJson(getConfigPath(homeDir), {
    agents: {
      defaults: {
        model: {
          primary: 'opensparrow-router/auto',
        },
      },
    },
    plugins: {
      allow: ['opensparrow-router'],
      entries: {
        'opensparrow-router': {
          enabled: true,
          config: {
            tierConnectionMap: Object.fromEntries(TIERS.map((tier) => [
              tier,
              {
                baseUrl: upstreams[tier].baseUrl,
                apiKey: `${tier.toLowerCase()}-channel-key`,
                model: `${tier.toLowerCase()}-channel-model`,
              },
            ])),
            tierModelMap: Object.fromEntries(TIERS.map((tier) => [tier, `${tier.toLowerCase()}-channel-model`])),
            routing: {},
          },
        },
      },
    },
  })

  const child = await startUiServer({ homeDir, uiPort, routerPort })
  t.after(async () => {
    await stopChild(child)
  })

  const simplePrompt = '你好，回复 OK。\n\n把这句话翻译成英文：今天下午三点开会。'
  const mediumPrompt = '请分析这段会议纪要，列出三条行动项、负责人和截止时间。'
  const complexPrompt = '请 debug 这段 TypeScript 错误，找出根因并给出修复方案。'
  const reasoningPrompt = '请一步步推理并证明这个逻辑命题是否成立。'

  const channelBodies = [
    {
      channel: 'feishu',
      build: (prompt, tier) => ({
        model: 'opensparrow-router/auto',
        max_tokens: 8192,
        messages: [
          { role: 'user', content: tier === 'SIMPLE' ? 'solve this logic proof' : '上一轮普通消息' },
          { role: 'assistant', content: 'ok' },
          { role: 'user', content: prompt },
        ],
      }),
    },
    {
      channel: 'wecom',
      build: (prompt, tier) => ({
        model: 'opensparrow-router/auto',
        max_tokens: 8192,
        messages: [
          { role: 'user', content: tier === 'SIMPLE' ? 'solve this logic proof' : '上一轮普通消息' },
          { role: 'assistant', content: 'ok' },
          {
            role: 'user',
            content: [
              { type: 'text', text: `WeCom\nfrom: user:wx-user\n\n${prompt}` },
            ],
          },
        ],
      }),
    },
    {
      channel: 'dingtalk',
      build: (prompt, tier) => ({
        model: 'default',
        max_tokens: 8192,
        messages: [
          { role: 'user', content: tier === 'SIMPLE' ? 'solve this logic proof' : '上一轮普通消息' },
          { role: 'assistant', content: 'ok' },
          { role: 'user', content: `DingTalk\nfrom: user:ding-user\n\n${prompt}` },
        ],
      }),
    },
  ]
  const promptsByTier = {
    SIMPLE: simplePrompt,
    MEDIUM: mediumPrompt,
    COMPLEX: complexPrompt,
    REASONING: reasoningPrompt,
  }

  const cases = channelBodies.flatMap(({ channel, build }) => (
    TIERS.map((tier) => ({
      channel,
      tier,
      body: build(promptsByTier[tier], tier),
    }))
  ))

  for (const item of cases) {
    const response = await fetch(`http://127.0.0.1:${routerPort}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-openclaw-message-channel': item.channel,
        'x-openclaw-session-key': `${item.channel}:simulated-session`,
      },
      body: JSON.stringify(item.body),
    })
    assert.equal(response.status, 200, `${item.channel} ${item.tier}`)
    assert.equal(response.headers.get('x-opensparrow-router-tier'), item.tier, `${item.channel} ${item.tier}`)
    assert.equal(response.headers.get('x-opensparrow-router-model'), `${item.tier.toLowerCase()}-channel-model`, `${item.channel} ${item.tier}`)
    const payload = await response.json()
    assert.equal(payload.model, `${item.tier.toLowerCase()}-channel-model`, `${item.channel} ${item.tier}`)
  }

  for (const tier of TIERS) {
    assert.equal(upstreams[tier].calls.length, channelBodies.length)
    assert.equal(upstreams[tier].calls.every((call) => call.authorizationOk), true)
    assert.equal(upstreams[tier].calls.every((call) => call.modelOk), true)
  }
})

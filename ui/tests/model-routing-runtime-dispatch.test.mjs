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
    calls.push({ authorizationOk, modelOk })

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
    { tier: 'MEDIUM', body: { messages: [{ role: 'user', content: '请总结这段内容' }], max_tokens: 800 } },
    { tier: 'COMPLEX', body: { messages: [{ role: 'user', content: 'debug this stack trace and fix the code' }], max_tokens: 500 } },
    { tier: 'REASONING', body: { messages: [{ role: 'user', content: 'solve this logic proof' }], max_tokens: 1700 } },
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

  for (const tier of TIERS) {
    assert.equal(upstreams[tier].calls.length, 1)
    assert.equal(upstreams[tier].calls[0].authorizationOk, true)
    assert.equal(upstreams[tier].calls[0].modelOk, true)
  }
})

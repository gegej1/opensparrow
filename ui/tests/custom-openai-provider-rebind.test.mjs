import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'

import {
  MAIN_AGENT_SESSION_KEY,
  maybeFreshRebindMainSession,
  shouldRebindMainSession,
} from '../lib/session-rebind.mjs'

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'opensparrow-session-rebind-'))
}

function writeStore(storePath, data) {
  fs.mkdirSync(path.dirname(storePath), { recursive: true })
  fs.writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf8')
}

function readStore(storePath) {
  return JSON.parse(fs.readFileSync(storePath, 'utf8'))
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

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
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

function getSessionStorePath(homeDir, profile = 'usb-portable') {
  return path.join(getProfileDir(homeDir, profile), 'agents', 'main', 'sessions', 'sessions.json')
}

function createInitialMainSession(rootDir, sessionId, model = 'gpt-4o-mini') {
  return {
    sessionId,
    updatedAt: 1776320656016,
    modelProvider: 'openai',
    model,
    authProfileOverride: 'openai:default',
    sessionFile: path.join(rootDir, 'sessions', `${sessionId}.jsonl`),
  }
}

function writeFakeOpenClawRuntime(runtimeRoot) {
  const binDir = path.join(runtimeRoot, 'bin')
  const openclawDir = path.join(runtimeRoot, 'openclaw')
  ensureDir(binDir)
  ensureDir(openclawDir)

  const nodeLinkPath = path.join(binDir, 'node')
  try {
    fs.symlinkSync(process.execPath, nodeLinkPath)
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error
  }

  const fakeCliPath = path.join(openclawDir, 'openclaw.mjs')
  fs.writeFileSync(fakeCliPath, `
import fs from 'node:fs'
import path from 'node:path'

const argv = process.argv.slice(2)
const profileIndex = argv.indexOf('--profile')
const profile = profileIndex >= 0 ? argv[profileIndex + 1] : 'usb-portable'
const args = profileIndex >= 0 ? argv.slice(profileIndex + 2) : argv
const homeDir = process.env.OPENCLAW_HOME || process.env.HOME
const profileDir = path.join(homeDir, \`.openclaw-\${profile}\`)
const configPath = path.join(profileDir, 'openclaw.json')
const failMode = String(process.env.FAKE_OC_FAIL || '').trim()

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'))
  } catch {
    return {}
  }
}

function writeConfig(config) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true })
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8')
}

function exitOk(message = 'ok') {
  if (message) process.stdout.write(\`\${message}\\n\`)
  process.exit(0)
}

function exitFail(message) {
  process.stderr.write(\`\${message}\\n\`)
  process.exit(1)
}

if (args[0] === 'config' && args[1] === 'set' && args[2] === 'models.providers.openai') {
  if (failMode === 'config-set') exitFail('config-set failed')
  const config = readConfig()
  config.models = config.models && typeof config.models === 'object' ? config.models : {}
  config.models.providers = config.models.providers && typeof config.models.providers === 'object' ? config.models.providers : {}
  config.models.providers.openai = JSON.parse(args[3])
  writeConfig(config)
  exitOk('config-set ok')
}

if (args[0] === 'models' && args[1] === 'set') {
  if (failMode === 'models-set') exitFail('models-set failed')
  const config = readConfig()
  config.models = config.models && typeof config.models === 'object' ? config.models : {}
  config.models.default = args[2]
  writeConfig(config)
  exitOk('models-set ok')
}

if (args[0] === 'daemon' && args[1] === 'restart') {
  if (failMode === 'daemon-restart') exitFail('daemon-restart failed')
  exitOk('daemon-restart ok')
}

if (args[0] === 'daemon' && args[1] === 'status') {
  process.stdout.write(JSON.stringify({ status: 'running' }))
  process.exit(0)
}

if (args[0] === 'health') {
  process.stdout.write(JSON.stringify({ ok: true }))
  process.exit(0)
}

exitFail(\`unsupported fake openclaw command: \${args.join(' ')}\`)
`, 'utf8')
}

async function startFakeProvider() {
  const port = await findFreePort()
  const requests = []
  const server = http.createServer(async (req, res) => {
    const bodyChunks = []
    for await (const chunk of req) bodyChunks.push(chunk)
    requests.push({
      method: req.method,
      url: req.url,
      body: Buffer.concat(bodyChunks).toString('utf8'),
      authorization: req.headers.authorization ?? null,
    })

    if (req.method === 'POST' && req.url === '/v1/responses') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ id: 'resp_1', object: 'response', output: [] }))
      return
    }

    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'not-found' }))
  })

  await new Promise((resolve, reject) => {
    server.listen(port, '127.0.0.1', (error) => {
      if (error) reject(error)
      else resolve()
    })
  })

  return {
    baseUrl: `http://127.0.0.1:${port}/v1`,
    requests,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  }
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

async function startUiServer({ homeDir, runtimeRoot, port, failMode = '' }) {
  const child = spawn(process.execPath, ['ui/server.mjs'], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      OPENCLAW_HOME: homeDir,
      OPENSPARROW_AUTO_OPEN: '0',
      OPENSPARROW_UI_PORT: String(port),
      USB_RUNTIME_ROOT: runtimeRoot,
      FAKE_OC_FAIL: failMode,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const ready = await waitForServerReady(child, port)
  return {
    child,
    logs: ready,
    baseUrl: `http://127.0.0.1:${port}`,
  }
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = await response.json()
  return { status: response.status, payload }
}

async function withRouteHarness(testContext, options, run) {
  const homeDir = makeTempDir()
  const runtimeRoot = path.join(homeDir, 'fake-runtime')
  const uiPort = await findFreePort()
  const provider = await startFakeProvider()
  writeFakeOpenClawRuntime(runtimeRoot)

  const currentStorePath = getSessionStorePath(homeDir, 'usb-portable')
  const otherStorePath = getSessionStorePath(homeDir, 'other-profile')
  writeStore(currentStorePath, {
    [MAIN_AGENT_SESSION_KEY]: createInitialMainSession(path.dirname(currentStorePath), 'sid-current-main'),
    'agent:main:feishu:dm:user-42': createInitialMainSession(path.dirname(currentStorePath), 'sid-current-peer', 'claude-3-7-sonnet'),
  })
  writeStore(otherStorePath, {
    [MAIN_AGENT_SESSION_KEY]: createInitialMainSession(path.dirname(otherStorePath), 'sid-other-main'),
  })

  const ui = await startUiServer({
    homeDir,
    runtimeRoot,
    port: uiPort,
    failMode: options?.failMode ?? '',
  })

  testContext.after(async () => {
    await provider.close()
    await stopChild(ui.child)
  })

  return await run({
    homeDir,
    providerBaseUrl: provider.baseUrl,
    providerRequests: provider.requests,
    uiBaseUrl: ui.baseUrl,
    currentStorePath,
    otherStorePath,
  })
}

function simulateFreshTurnBind({
  storePath,
  sessionKey = MAIN_AGENT_SESSION_KEY,
  model,
  modelProvider = 'openai',
  authProfileOverride = 'openai:default',
  now = 1776322000000,
}) {
  const store = readStore(storePath)
  assert.equal(store[sessionKey], undefined, 'fresh turn should not inherit an old binding')

  const sessionId = randomUUID()
  store[sessionKey] = {
    sessionId,
    updatedAt: now,
    sessionFile: path.join(path.dirname(storePath), `${sessionId}.jsonl`),
    modelProvider,
    model,
    authProfileOverride,
  }

  writeStore(storePath, store)
  return store[sessionKey]
}

test('targeted fresh rebind removes only agent:main:main after save and restart succeed', () => {
  const root = makeTempDir()
  const storePath = path.join(root, 'sessions', 'sessions.json')
  const targetBefore = {
    sessionId: 'sid-old-main',
    updatedAt: 1776320656016,
    modelProvider: 'openai',
    model: 'gpt-4o-mini',
    authProfileOverride: 'openai:default',
    sessionFile: path.join(root, 'sessions', 'sid-old-main.jsonl'),
  }
  const peerBefore = {
    sessionId: 'sid-peer',
    updatedAt: 1776320657000,
    modelProvider: 'anthropic',
    model: 'claude-3-7-sonnet',
    authProfileOverride: 'anthropic:default',
    sessionFile: path.join(root, 'sessions', 'sid-peer.jsonl'),
  }
  writeStore(storePath, {
    [MAIN_AGENT_SESSION_KEY]: targetBefore,
    'agent:main:feishu:dm:user-42': peerBefore,
  })

  assert.equal(
    shouldRebindMainSession({
      providerConfigWritten: true,
      authProfileWritten: true,
      runtimeRestarted: true,
    }),
    true,
  )

  const result = maybeFreshRebindMainSession({
    storePath,
    providerConfigWritten: true,
    authProfileWritten: true,
    runtimeRestarted: true,
  })
  const after = readStore(storePath)

  assert.equal(result.changed, true)
  assert.equal(result.reason, 'binding-removed')
  assert.equal(result.removedEntry.sessionId, targetBefore.sessionId)
  assert.equal(after[MAIN_AGENT_SESSION_KEY], undefined)
  assert.deepEqual(after['agent:main:feishu:dm:user-42'], peerBefore)
})

test('targeted fresh rebind stays inactive until provider, auth, and restart all succeed', () => {
  const root = makeTempDir()
  const storePath = path.join(root, 'sessions', 'sessions.json')
  const before = {
    [MAIN_AGENT_SESSION_KEY]: {
      sessionId: 'sid-old-main',
      updatedAt: 1776320656016,
      modelProvider: 'openai',
      model: 'gpt-4o-mini',
      authProfileOverride: 'openai:default',
      sessionFile: path.join(root, 'sessions', 'sid-old-main.jsonl'),
    },
  }
  writeStore(storePath, before)

  assert.equal(
    shouldRebindMainSession({
      providerConfigWritten: true,
      authProfileWritten: true,
      runtimeRestarted: false,
    }),
    false,
  )

  const result = maybeFreshRebindMainSession({
    storePath,
    providerConfigWritten: true,
    authProfileWritten: true,
    runtimeRestarted: false,
  })

  assert.equal(result.changed, false)
  assert.equal(result.reason, 'gates-not-satisfied')
  assert.deepEqual(readStore(storePath), before)
})

test('next fresh turn allocates a new session and uses the new config after rebind', () => {
  const root = makeTempDir()
  const storePath = path.join(root, 'sessions', 'sessions.json')
  writeStore(storePath, {
    [MAIN_AGENT_SESSION_KEY]: {
      sessionId: 'sid-old-main',
      updatedAt: 1776320656016,
      modelProvider: 'openai',
      model: 'gpt-4o-mini',
      authProfileOverride: 'openai:default',
      sessionFile: path.join(root, 'sessions', 'sid-old-main.jsonl'),
    },
    'agent:main:feishu:dm:user-42': {
      sessionId: 'sid-peer',
      updatedAt: 1776320657000,
      modelProvider: 'anthropic',
      model: 'claude-3-7-sonnet',
      authProfileOverride: 'anthropic:default',
      sessionFile: path.join(root, 'sessions', 'sid-peer.jsonl'),
    },
  })

  const removed = maybeFreshRebindMainSession({
    storePath,
    providerConfigWritten: true,
    authProfileWritten: true,
    runtimeRestarted: true,
  })
  const rebound = simulateFreshTurnBind({
    storePath,
    modelProvider: 'openai',
    model: 'gpt-5.4',
    authProfileOverride: 'openai:default',
  })
  const after = readStore(storePath)

  assert.equal(removed.changed, true)
  assert.notEqual(rebound.sessionId, removed.removedEntry.sessionId)
  assert.equal(rebound.modelProvider, 'openai')
  assert.equal(rebound.model, 'gpt-5.4')
  assert.equal(rebound.authProfileOverride, 'openai:default')
  assert.equal(after[MAIN_AGENT_SESSION_KEY].sessionId, rebound.sessionId)
  assert.equal(after['agent:main:feishu:dm:user-42'].sessionId, 'sid-peer')
})

test('route-level save path rebinds only after provider/auth success and restart success', { timeout: 15000 }, async (t) => {
  await withRouteHarness(t, {}, async ({
    homeDir,
    providerBaseUrl,
    providerRequests,
    uiBaseUrl,
    currentStorePath,
    otherStorePath,
  }) => {
    const result = await postJson(`${uiBaseUrl}/api/config/api`, {
      baseUrl: providerBaseUrl,
      model: 'gpt-5.4',
      apiKey: 'sk-test-route',
    })

    assert.equal(result.status, 200)
    assert.equal(result.payload.ok, true)

    const currentStoreAfter = readStore(currentStorePath)
    const otherStoreAfter = readStore(otherStorePath)
    assert.equal(currentStoreAfter[MAIN_AGENT_SESSION_KEY], undefined)
    assert.ok(currentStoreAfter['agent:main:feishu:dm:user-42'], 'non-target current-profile session should stay intact')
    assert.equal(otherStoreAfter[MAIN_AGENT_SESSION_KEY].sessionId, 'sid-other-main')

    const config = JSON.parse(fs.readFileSync(getConfigPath(homeDir), 'utf8'))
    assert.equal(config.models.providers.openai.baseUrl, providerBaseUrl)
    assert.equal(config.models.providers.openai.models[0].id, 'gpt-5.4')
    assert.equal(config.models.default, 'openai/gpt-5.4')

    const authProfiles = JSON.parse(fs.readFileSync(getAuthProfilesPath(homeDir), 'utf8'))
    assert.equal(authProfiles.profiles['openai:default'].key, 'sk-test-route')

    assert.equal(providerRequests.length, 1)
    assert.equal(providerRequests[0].url, '/v1/responses')
    assert.equal(providerRequests[0].authorization, 'Bearer sk-test-route')
  })
})

test('route-level save path does not rebind when provider write fails before restart gate can pass', { timeout: 15000 }, async (t) => {
  await withRouteHarness(t, { failMode: 'config-set' }, async ({
    providerBaseUrl,
    uiBaseUrl,
    currentStorePath,
    otherStorePath,
  }) => {
    const beforeCurrent = readStore(currentStorePath)
    const beforeOther = readStore(otherStorePath)

    const result = await postJson(`${uiBaseUrl}/api/config/api`, {
      baseUrl: providerBaseUrl,
      model: 'gpt-5.4',
      apiKey: 'sk-test-route',
    })

    assert.equal(result.status, 500)
    assert.equal(result.payload.ok, false)
    assert.match(result.payload.errors.join('\n'), /config set models\.providers\.openai failed/)
    assert.deepEqual(readStore(currentStorePath), beforeCurrent)
    assert.deepEqual(readStore(otherStorePath), beforeOther)
  })
})

test('route-level save path does not rebind when runtime restart fails after successful writes', { timeout: 15000 }, async (t) => {
  await withRouteHarness(t, { failMode: 'daemon-restart' }, async ({
    providerBaseUrl,
    uiBaseUrl,
    currentStorePath,
    otherStorePath,
  }) => {
    const beforeCurrent = readStore(currentStorePath)
    const beforeOther = readStore(otherStorePath)

    const result = await postJson(`${uiBaseUrl}/api/config/api`, {
      baseUrl: providerBaseUrl,
      model: 'gpt-5.4',
      apiKey: 'sk-test-route',
    })

    assert.equal(result.status, 500)
    assert.equal(result.payload.ok, false)
    assert.match(result.payload.errors.join('\n'), /daemon restart failed/)
    assert.deepEqual(readStore(currentStorePath), beforeCurrent)
    assert.deepEqual(readStore(otherStorePath), beforeOther)
  })
})

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
import {
  CUSTOM_ROUTER_AUTH_PROFILE_ID,
  CUSTOM_ROUTER_MODEL_TARGET,
  CUSTOM_ROUTER_PROVIDER_ID,
} from '../../scripts/model-routing/lib/custom-plugin-routing.mjs'

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

function createSmartRoutingPayload(baseUrl) {
  return {
    mode: 'smart',
    tierConnectionMap: {
      SIMPLE: {
        baseUrl,
        apiKey: 'sk-test-simple-routing',
        model: 'gpt-4o',
      },
      MEDIUM: {
        baseUrl,
        apiKey: 'sk-test-medium-routing',
        model: 'gpt-5.4-nano',
      },
      COMPLEX: {
        baseUrl,
        apiKey: 'sk-test-complex-routing',
        model: 'gpt-5.4',
      },
      REASONING: {
        baseUrl,
        apiKey: 'sk-test-reasoning-routing',
        model: 'gpt-5.5',
      },
    },
    routing: {},
  }
}

function assertAuthorityFieldsCleared(entry, label) {
  assert.ok(entry, `${label} session entry should be preserved`)
  assert.equal(entry.modelProvider, undefined, `${label} modelProvider should be cleared`)
  assert.equal(entry.model, undefined, `${label} model should be cleared`)
  assert.equal(entry.authProfileOverride, undefined, `${label} authProfileOverride should be cleared`)
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
const daemonStatusJson = String(process.env.FAKE_OC_DAEMON_STATUS_JSON || '{"service":{"runtime":{"status":"running"},"rpc":{"healthy":true}}}').trim()
const daemonStatusStderr = String(process.env.FAKE_OC_DAEMON_STATUS_STDERR || '').trim()
const daemonStatusExit = Number.parseInt(String(process.env.FAKE_OC_DAEMON_STATUS_EXIT || '0').trim(), 10)
const healthOk = String(process.env.FAKE_OC_HEALTH_OK || '1').trim() !== '0'
const restartError = String(process.env.FAKE_OC_RESTART_ERROR || '').trim() || 'daemon-restart failed'
const failIfSessionAuthorityOnRestart = String(process.env.FAKE_OC_FAIL_IF_SESSION_AUTHORITY_ON_RESTART || '').trim() === '1'
const sessionStorePath = path.join(profileDir, 'agents', 'main', 'sessions', 'sessions.json')

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

function countAgentMainAuthorityBindings() {
  try {
    const store = JSON.parse(fs.readFileSync(sessionStorePath, 'utf8'))
    if (!store || typeof store !== 'object' || Array.isArray(store)) return 0
    let count = 0
    for (const [key, entry] of Object.entries(store)) {
      if (!String(key).startsWith('agent:main:')) continue
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
      if (
        entry.modelProvider !== undefined
        || entry.model !== undefined
        || entry.authProfileOverride !== undefined
      ) {
        count += 1
      }
    }
    return count
  } catch {
    return 0
  }
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
  if (failMode === 'daemon-restart') exitFail(restartError)
  if (failIfSessionAuthorityOnRestart) {
    const staleAuthorityCount = countAgentMainAuthorityBindings()
    if (staleAuthorityCount > 0) {
      exitFail(\`daemon-restart saw stale smart session authority before restart: count=\${staleAuthorityCount}\`)
    }
  }
  exitOk('daemon-restart ok')
}

if (args[0] === 'daemon' && args[1] === 'status') {
  if (daemonStatusJson) process.stdout.write(daemonStatusJson)
  if (daemonStatusStderr) process.stderr.write(daemonStatusStderr)
  process.exit(Number.isFinite(daemonStatusExit) ? daemonStatusExit : 0)
}

if (args[0] === 'health') {
  process.stdout.write(JSON.stringify({ ok: healthOk }))
  process.exit(healthOk ? 0 : 1)
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

    if (req.method === 'POST' && req.url === '/v1/chat/completions') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        id: 'chatcmpl_1',
        object: 'chat.completion',
        model: JSON.parse(requests.at(-1)?.body || '{}')?.model || 'unknown',
        choices: [{ index: 0, message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
      }))
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

async function startUiServer({
  homeDir,
  runtimeRoot,
  port,
  routerPort,
  gatewayPort,
  failMode = '',
  daemonStatusJson = '',
  healthOk = true,
  restartError = '',
  failIfSessionAuthorityOnRestart = false,
}) {
  const child = spawn(process.execPath, ['ui/server.mjs'], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      OPENCLAW_HOME: homeDir,
      OPENSPARROW_AUTO_OPEN: '0',
      OPENSPARROW_UI_PORT: String(port),
      OPENSPARROW_ROUTER_PORT: String(routerPort),
      OPENSPARROW_SMART_SESSION_AUTHORITY_REFRESH_MS: '100',
      OPENCLAW_GATEWAY_PORT: String(gatewayPort),
      USB_RUNTIME_ROOT: runtimeRoot,
      FAKE_OC_FAIL: failMode,
      FAKE_OC_DAEMON_STATUS_JSON: daemonStatusJson,
      FAKE_OC_HEALTH_OK: healthOk ? '1' : '0',
      FAKE_OC_RESTART_ERROR: restartError,
      FAKE_OC_FAIL_IF_SESSION_AUTHORITY_ON_RESTART: failIfSessionAuthorityOnRestart ? '1' : '0',
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
  const routerPort = await findFreePort()
  const gatewayPort = await findFreePort()
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
    routerPort,
    gatewayPort,
    failMode: options?.failMode ?? '',
    daemonStatusJson: options?.daemonStatusJson ?? '',
    healthOk: options?.healthOk ?? true,
    restartError: options?.restartError ?? '',
    failIfSessionAuthorityOnRestart: options?.failIfSessionAuthorityOnRestart ?? false,
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
    uiPort,
    routerBaseUrl: `http://127.0.0.1:${routerPort}`,
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

async function waitForAuthorityFieldsCleared(storePath, sessionKey, timeoutMs = 5000) {
  const startedAt = Date.now()
  let lastEntry = null
  while (Date.now() - startedAt < timeoutMs) {
    const store = readStore(storePath)
    lastEntry = store[sessionKey]
    if (
      lastEntry
      && lastEntry.modelProvider === undefined
      && lastEntry.model === undefined
      && lastEntry.authProfileOverride === undefined
    ) {
      return lastEntry
    }
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error(`authority fields were not cleared for ${sessionKey}: ${JSON.stringify(lastEntry)}`)
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
    assert.equal(result.payload.saveState, 'saved')
    assert.equal(result.payload.persisted, true)
    assert.equal(result.payload.restart.ok, true)

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
  })
})

test('model-routing smart save clears stale agent main channel authority bindings', { timeout: 15000 }, async (t) => {
  await withRouteHarness(t, {}, async ({
    homeDir,
    providerBaseUrl,
    uiBaseUrl,
    currentStorePath,
    otherStorePath,
  }) => {
    writeJson(getConfigPath(homeDir), {
      models: {
        providers: {
          openai: {
            baseUrl: providerBaseUrl,
            models: [{ id: 'gpt-4o-mini', name: 'gpt-4o-mini', api: 'openai-completions' }],
          },
        },
        default: 'openai/gpt-4o-mini',
      },
      agents: {
        defaults: {
          model: {
            primary: 'openai/gpt-4o-mini',
          },
        },
      },
    })
    writeJson(getAuthProfilesPath(homeDir), {
      version: 1,
      profiles: {
        'openai:default': { type: 'api_key', provider: 'openai', key: 'sk-test-openai-default' },
      },
      order: { openai: ['openai:default'] },
    })
    writeStore(currentStorePath, {
      [MAIN_AGENT_SESSION_KEY]: createInitialMainSession(path.dirname(currentStorePath), 'sid-current-main'),
      'agent:main:feishu:dm:user-42': createInitialMainSession(path.dirname(currentStorePath), 'sid-feishu-dm'),
      'agent:main:wecom:dm:user-77': createInitialMainSession(path.dirname(currentStorePath), 'sid-wecom-dm'),
      'agent:main:dingtalk:group:room-9': createInitialMainSession(path.dirname(currentStorePath), 'sid-dingtalk-group'),
      'agent:other:feishu:dm:user-42': createInitialMainSession(path.dirname(currentStorePath), 'sid-other-agent'),
    })

    const result = await postJson(`${uiBaseUrl}/api/config/model-routing`, createSmartRoutingPayload(providerBaseUrl))

    assert.equal(result.status, 200)
    assert.equal(result.payload.ok, true)
    assert.equal(result.payload.saveState, 'saved')
    assert.equal(result.payload.mode, 'smart')
    assert.equal(result.payload.effectivePrimaryModel, CUSTOM_ROUTER_MODEL_TARGET)
    assert.deepEqual(result.payload.sessionAuthorityRefresh, {
      changed: true,
      reason: 'smart-mode-channel-authority',
      affectedCount: 4,
      affectedProviderModelAggregate: [
        { provider: 'openai', model: 'gpt-4o-mini', count: 4 },
      ],
      channelFamilies: {
        main: 1,
        feishu: 1,
        wecom: 1,
        dingtalk: 1,
      },
      phase: 'save-time',
    })
    assert.equal(JSON.stringify(result.payload.sessionAuthorityRefresh).includes('user-42'), false)
    assert.equal(JSON.stringify(result.payload.sessionAuthorityRefresh).includes('sid-feishu-dm'), false)

    const storeAfter = readStore(currentStorePath)
    assertAuthorityFieldsCleared(storeAfter[MAIN_AGENT_SESSION_KEY], 'main')
    assertAuthorityFieldsCleared(storeAfter['agent:main:feishu:dm:user-42'], 'feishu')
    assertAuthorityFieldsCleared(storeAfter['agent:main:wecom:dm:user-77'], 'wecom')
    assertAuthorityFieldsCleared(storeAfter['agent:main:dingtalk:group:room-9'], 'dingtalk')
    assert.equal(storeAfter['agent:main:feishu:dm:user-42'].sessionId, 'sid-feishu-dm')
    assert.equal(storeAfter['agent:main:feishu:dm:user-42'].sessionFile.endsWith('sid-feishu-dm.jsonl'), true)
    assert.equal(storeAfter['agent:other:feishu:dm:user-42'].model, 'gpt-4o-mini')

    const otherStoreAfter = readStore(otherStorePath)
    assert.equal(otherStoreAfter[MAIN_AGENT_SESSION_KEY].sessionId, 'sid-other-main')

    const config = JSON.parse(fs.readFileSync(getConfigPath(homeDir), 'utf8'))
    assert.equal(config.agents.defaults.model.primary, CUSTOM_ROUTER_MODEL_TARGET)
    assert.ok(config.models.providers[CUSTOM_ROUTER_PROVIDER_ID])
    assert.equal(config.models.providers[CUSTOM_ROUTER_PROVIDER_ID].models[0].id, 'auto')
    assert.equal(config.plugins.entries[CUSTOM_ROUTER_PROVIDER_ID].config.tierConnectionMap.SIMPLE.model, 'gpt-4o')
    assert.equal(config.plugins.entries[CUSTOM_ROUTER_PROVIDER_ID].config.tierConnectionMap.MEDIUM.model, 'gpt-5.4-nano')
    assert.equal(config.plugins.entries[CUSTOM_ROUTER_PROVIDER_ID].config.tierConnectionMap.COMPLEX.model, 'gpt-5.4')
    assert.equal(config.plugins.entries[CUSTOM_ROUTER_PROVIDER_ID].config.tierConnectionMap.REASONING.model, 'gpt-5.5')

    const authProfiles = JSON.parse(fs.readFileSync(getAuthProfilesPath(homeDir), 'utf8'))
    assert.equal(authProfiles.profiles[CUSTOM_ROUTER_AUTH_PROFILE_ID].provider, CUSTOM_ROUTER_PROVIDER_ID)
    assert.equal(authProfiles.order[CUSTOM_ROUTER_PROVIDER_ID][0], CUSTOM_ROUTER_AUTH_PROFILE_ID)

    const singleResult = await postJson(`${uiBaseUrl}/api/config/model-routing`, {
      mode: 'single',
      baseUrl: providerBaseUrl,
      apiKey: 'sk-test-single-routing',
      model: 'gpt-5.4',
    })
    assert.equal(singleResult.status, 200)
    assert.equal(singleResult.payload.ok, true)
    assert.equal(singleResult.payload.mode, 'single')
    assert.equal(singleResult.payload.effectivePrimaryModel, 'openai/gpt-5.4')
    const singleConfig = JSON.parse(fs.readFileSync(getConfigPath(homeDir), 'utf8'))
    assert.equal(singleConfig.agents.defaults.model.primary, 'openai/gpt-5.4')
  })
})

test('model-routing smart save clears channel authority before daemon restart observes sessions', { timeout: 15000 }, async (t) => {
  await withRouteHarness(t, { failIfSessionAuthorityOnRestart: true }, async ({
    homeDir,
    providerBaseUrl,
    uiBaseUrl,
    uiPort,
    currentStorePath,
  }) => {
    writeJson(getConfigPath(homeDir), {
      models: {
        providers: {
          openai: {
            baseUrl: providerBaseUrl,
            models: [{ id: 'gpt-4o-mini', name: 'gpt-4o-mini', api: 'openai-completions' }],
          },
        },
        default: 'openai/gpt-4o-mini',
      },
      agents: {
        defaults: {
          model: {
            primary: 'openai/gpt-4o-mini',
          },
        },
      },
    })
    writeJson(getAuthProfilesPath(homeDir), {
      version: 1,
      profiles: {
        'openai:default': { type: 'api_key', provider: 'openai', key: 'sk-test-openai-default' },
      },
      order: { openai: ['openai:default'] },
    })
    writeStore(currentStorePath, {
      [MAIN_AGENT_SESSION_KEY]: createInitialMainSession(path.dirname(currentStorePath), 'sid-current-main'),
      'agent:main:feishu:dm:user-42': createInitialMainSession(path.dirname(currentStorePath), 'sid-feishu-dm'),
    })

    const result = await postJson(`${uiBaseUrl}/api/config/model-routing`, createSmartRoutingPayload(providerBaseUrl))

    assert.equal(result.status, 200)
    assert.equal(result.payload.ok, true)
    assert.equal(result.payload.saveState, 'saved')
    assert.equal(result.payload.restart.ok, true)
    assert.equal(result.payload.sessionAuthorityRefresh.reason, 'smart-mode-channel-authority')
    assert.equal(result.payload.sessionAuthorityRefresh.phase, 'save-time')
    assert.equal(result.payload.sessionAuthorityRefresh.affectedCount, 2)
    assert.equal(result.payload.diagnostics.mode, 'smart')
    assert.equal(result.payload.diagnostics.effectivePrimaryModel, CUSTOM_ROUTER_MODEL_TARGET)
    assert.equal(result.payload.diagnostics.uiPort, uiPort)
    assert.equal(result.payload.diagnostics.routerProviderPresent, true)
    assert.equal(result.payload.diagnostics.tierModelMap.SIMPLE, 'gpt-4o')
    assert.equal(result.payload.diagnostics.tierModelMap.MEDIUM, 'gpt-5.4-nano')
    assert.equal(result.payload.diagnostics.tierModelMap.COMPLEX, 'gpt-5.4')
    assert.equal(result.payload.diagnostics.tierModelMap.REASONING, 'gpt-5.5')
    assert.equal(JSON.stringify(result.payload.diagnostics).includes('sk-test'), false)
    assert.equal(JSON.stringify(result.payload.diagnostics).includes('user-42'), false)

    const storeAfter = readStore(currentStorePath)
    assertAuthorityFieldsCleared(storeAfter[MAIN_AGENT_SESSION_KEY], 'main before restart')
    assertAuthorityFieldsCleared(storeAfter['agent:main:feishu:dm:user-42'], 'feishu before restart')
  })
})

test('smart channel authority refresh clears Feishu stale authority re-persisted after first turn before second turn dispatch', { timeout: 20000 }, async (t) => {
  await withRouteHarness(t, {}, async ({
    homeDir,
    providerBaseUrl,
    providerRequests,
    uiBaseUrl,
    routerBaseUrl,
    currentStorePath,
  }) => {
    writeJson(getConfigPath(homeDir), {
      models: {
        providers: {
          openai: {
            baseUrl: providerBaseUrl,
            models: [{ id: 'gpt-4o-mini', name: 'gpt-4o-mini', api: 'openai-completions' }],
          },
        },
        default: 'openai/gpt-4o-mini',
      },
      agents: {
        defaults: {
          model: {
            primary: 'openai/gpt-4o-mini',
          },
        },
      },
    })
    writeJson(getAuthProfilesPath(homeDir), {
      version: 1,
      profiles: {
        'openai:default': { type: 'api_key', provider: 'openai', key: 'sk-test-openai-default' },
      },
      order: { openai: ['openai:default'] },
    })
    writeStore(currentStorePath, {
      [MAIN_AGENT_SESSION_KEY]: createInitialMainSession(path.dirname(currentStorePath), 'sid-current-main'),
      'agent:main:feishu:dm:user-42': createInitialMainSession(path.dirname(currentStorePath), 'sid-feishu-before-save'),
    })

    const saveResult = await postJson(`${uiBaseUrl}/api/config/model-routing`, createSmartRoutingPayload(providerBaseUrl))
    assert.equal(saveResult.status, 200)
    assert.equal(saveResult.payload.ok, true)
    assert.equal(saveResult.payload.mode, 'smart')
    assert.equal(saveResult.payload.effectivePrimaryModel, CUSTOM_ROUTER_MODEL_TARGET)
    assertAuthorityFieldsCleared(readStore(currentStorePath)['agent:main:feishu:dm:user-42'], 'save-time feishu')

    const storeAfterFirstTurn = readStore(currentStorePath)
    storeAfterFirstTurn['agent:main:feishu:dm:user-42'] = {
      ...storeAfterFirstTurn['agent:main:feishu:dm:user-42'],
      updatedAt: 1776323000000,
      modelProvider: 'openai',
      model: 'gpt-4o-mini',
      authProfileOverride: 'openai:default',
    }
    writeStore(currentStorePath, storeAfterFirstTurn)

    const refreshedEntry = await waitForAuthorityFieldsCleared(
      currentStorePath,
      'agent:main:feishu:dm:user-42',
    )
    assert.equal(refreshedEntry.sessionId, 'sid-feishu-before-save')

    const secondTurn = await fetch(`${routerBaseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-openclaw-message-channel': 'feishu',
        'x-openclaw-session-key': 'agent:main:feishu:dm:user-42',
      },
      body: JSON.stringify({
        model: CUSTOM_ROUTER_MODEL_TARGET,
        max_tokens: 8192,
        messages: [{ role: 'user', content: '你好' }],
      }),
    })

    assert.equal(secondTurn.status, 200)
    assert.equal(secondTurn.headers.get('x-opensparrow-router-tier'), 'SIMPLE')
    assert.equal(secondTurn.headers.get('x-opensparrow-router-model'), 'gpt-4o')
    await secondTurn.json()

    const chatRequests = providerRequests.filter((request) => request.url === '/v1/chat/completions')
    assert.equal(chatRequests.length, 1)
    const outbound = JSON.parse(chatRequests[0].body)
    assert.equal(outbound.model, 'gpt-4o')
    assert.notEqual(outbound.model, 'gpt-4o-mini')
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
    assert.equal(result.payload.saveState, 'rejected')
    assert.match(result.payload.errors.join('\n'), /config set models\.providers\.openai failed/)
    assert.deepEqual(readStore(currentStorePath), beforeCurrent)
    assert.deepEqual(readStore(otherStorePath), beforeOther)
  })
})

test('route-level save path keeps persisted truth and skips rebind when runtime restart is degraded', { timeout: 15000 }, async (t) => {
  await withRouteHarness(t, {
    failMode: 'daemon-restart',
    healthOk: false,
    daemonStatusJson: '{"service":{"runtime":{"status":"running"},"rpc":{"healthy":false}}}',
    restartError: 'Gateway restart timed out after 60s waiting for health checks',
  }, async ({
    homeDir,
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

    assert.equal(result.status, 200)
    assert.equal(result.payload.ok, true)
    assert.equal(result.payload.saveState, 'saved_degraded')
    assert.equal(result.payload.persisted, true)
    assert.equal(result.payload.restart.ok, false)
    assert.match(result.payload.restart.issue, /timed out/i)
    assert.equal(result.payload.followUp.statusEndpoint, '/api/status')
    assert.equal(result.payload.followUp.configEndpoint, '/api/config')
    assert.equal(result.payload.followUp.saveEndpoint, '/api/config/api')
    assert.ok(Array.isArray(result.payload.warnings))
    assert.match(result.payload.warnings.join('\n'), /timed out/i)

    const config = JSON.parse(fs.readFileSync(getConfigPath(homeDir), 'utf8'))
    assert.equal(config.models.providers.openai.baseUrl, providerBaseUrl)
    assert.equal(config.models.providers.openai.models[0].id, 'gpt-5.4')
    assert.equal(config.models.default, 'openai/gpt-5.4')

    const authProfiles = JSON.parse(fs.readFileSync(getAuthProfilesPath(homeDir), 'utf8'))
    assert.equal(authProfiles.profiles['openai:default'].key, 'sk-test-route')

    assert.deepEqual(readStore(currentStorePath), beforeCurrent)
    assert.deepEqual(readStore(otherStorePath), beforeOther)
  })
})

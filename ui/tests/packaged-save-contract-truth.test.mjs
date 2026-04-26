import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'opensparrow-save-contract-'))
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
const daemonStatusJson = String(process.env.FAKE_OC_DAEMON_STATUS_JSON || '{"service":{"runtime":{"status":"running"},"rpc":{"healthy":false}}}').trim()
const healthOk = String(process.env.FAKE_OC_HEALTH_OK || '0').trim() !== '0'
const restartError = String(process.env.FAKE_OC_RESTART_ERROR || '').trim() || 'Gateway restart timed out after 60s waiting for health checks'
const restartDelayMs = Number.parseInt(String(process.env.FAKE_OC_DAEMON_RESTART_DELAY_MS || '0').trim(), 10)

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
  const config = readConfig()
  config.models = config.models && typeof config.models === 'object' ? config.models : {}
  config.models.providers = config.models.providers && typeof config.models.providers === 'object' ? config.models.providers : {}
  config.models.providers.openai = JSON.parse(args[3])
  writeConfig(config)
  exitOk('config-set ok')
}

if (args[0] === 'models' && args[1] === 'set') {
  const config = readConfig()
  config.models = config.models && typeof config.models === 'object' ? config.models : {}
  config.models.default = args[2]
  writeConfig(config)
  exitOk('models-set ok')
}

if (args[0] === 'daemon' && args[1] === 'restart') {
  if (Number.isFinite(restartDelayMs) && restartDelayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, restartDelayMs))
  }
  if (failMode === 'daemon-restart') exitFail(restartError)
  exitOk('daemon-restart ok')
}

if (args[0] === 'daemon' && args[1] === 'status') {
  if (daemonStatusJson) process.stdout.write(daemonStatusJson)
  process.exit(0)
}

if (args[0] === 'health') {
  process.stdout.write(JSON.stringify({ ok: healthOk }))
  process.exit(healthOk ? 0 : 1)
}

exitFail(\`unsupported fake openclaw command: \${args.join(' ')}\`)
`, 'utf8')
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

async function startUiServer({ homeDir, runtimeRoot, port, gatewayPort, restartDelayMs = 0, saveRouteRestartTimeoutMs = 0 }) {
  const child = spawn(process.execPath, ['ui/server.mjs'], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      OPENCLAW_HOME: homeDir,
      OPENSPARROW_AUTO_OPEN: '0',
      OPENSPARROW_UI_PORT: String(port),
      OPENCLAW_GATEWAY_PORT: String(gatewayPort),
      USB_RUNTIME_ROOT: runtimeRoot,
      FAKE_OC_FAIL: 'daemon-restart',
      FAKE_OC_DAEMON_STATUS_JSON: '{"service":{"runtime":{"status":"running"},"rpc":{"healthy":false}}}',
      FAKE_OC_HEALTH_OK: '0',
      FAKE_OC_RESTART_ERROR: 'Gateway restart timed out after 60s waiting for health checks',
      FAKE_OC_DAEMON_RESTART_DELAY_MS: String(restartDelayMs),
      OPENSPARROW_SAVE_ROUTE_RESTART_TIMEOUT_MS: String(saveRouteRestartTimeoutMs),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  await waitForServerReady(child, port)
  return {
    child,
    baseUrl: `http://127.0.0.1:${port}`,
  }
}

async function postJson(url, body, { timeoutMs = 0 } = {}) {
  const controller = timeoutMs > 0 ? new AbortController() : null
  const startedAt = Date.now()
  const timeoutId = controller
    ? setTimeout(() => controller.abort(new Error(`request timed out after ${timeoutMs}ms`)), timeoutMs)
    : null

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller?.signal,
    })
    const payload = await response.json()
    return { status: response.status, payload, durationMs: Date.now() - startedAt }
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

async function getJson(url) {
  const response = await fetch(url)
  const payload = await response.json()
  return { status: response.status, payload }
}

async function withSaveHarness(testContext, options, run) {
  const homeDir = makeTempDir()
  const runtimeRoot = path.join(homeDir, 'fake-runtime')
  const uiPort = await findFreePort()
  const gatewayPort = await findFreePort()

  writeFakeOpenClawRuntime(runtimeRoot)
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
  })
  writeJson(getAuthProfilesPath(homeDir), {
    version: 1,
    profiles: {
      'openai:default': { type: 'api_key', provider: 'openai', key: 'sk-existing' },
    },
    order: { openai: ['openai:default'] },
  })

  const ui = await startUiServer({
    homeDir,
    runtimeRoot,
    port: uiPort,
    gatewayPort,
    restartDelayMs: options?.restartDelayMs ?? 0,
    saveRouteRestartTimeoutMs: options?.saveRouteRestartTimeoutMs ?? 0,
  })

  testContext.after(async () => {
    await stopChild(ui.child)
  })

  return await run({
    homeDir,
    uiBaseUrl: ui.baseUrl,
  })
}

test('api save returns saved_degraded with authoritative follow-up when persistence succeeds but restart truth is degraded', { timeout: 15000 }, async (t) => {
  await withSaveHarness(t, {}, async ({ homeDir, uiBaseUrl }) => {
    const result = await postJson(`${uiBaseUrl}/api/config/api`, {
      baseUrl: 'https://degraded.example/v1',
      model: 'gpt-5.4',
      apiKey: 'sk-degraded',
    })

    assert.equal(result.status, 200)
    assert.equal(result.payload.ok, true)
    assert.equal(result.payload.saveState, 'saved_degraded')
    assert.equal(result.payload.persisted, true)
    assert.equal(result.payload.restart.ok, false)
    assert.equal(result.payload.followUp.statusEndpoint, '/api/status')
    assert.equal(result.payload.followUp.configEndpoint, '/api/config')
    assert.equal(result.payload.followUp.saveEndpoint, '/api/config/api')
    assert.ok(Array.isArray(result.payload.warnings))
    assert.match(result.payload.warnings.join('\n'), /timed out/i)

    const config = JSON.parse(fs.readFileSync(getConfigPath(homeDir), 'utf8'))
    assert.equal(config.models.providers.openai.baseUrl, 'https://degraded.example/v1')
    assert.equal(config.models.providers.openai.models[0].id, 'gpt-5.4')
    assert.equal(config.models.default, 'openai/gpt-5.4')

    const auth = JSON.parse(fs.readFileSync(getAuthProfilesPath(homeDir), 'utf8'))
    assert.equal(auth.profiles['openai:default'].key, 'sk-degraded')

    const readBack = await getJson(`${uiBaseUrl}/api/config`)
    assert.equal(readBack.status, 200)
    assert.equal(readBack.payload.models.providers.openai.baseUrl, 'https://degraded.example/v1')
    assert.equal(readBack.payload.models.providers.openai.models[0].id, 'gpt-5.4')
  })
})

test('model-routing save returns saved_degraded without drifting internal router ids', { timeout: 15000 }, async (t) => {
  await withSaveHarness(t, {}, async ({ homeDir, uiBaseUrl }) => {
    const result = await postJson(`${uiBaseUrl}/api/config/model-routing`, {
      mode: 'smart',
      tierModelMap: {
        SIMPLE: 'gpt-4o-mini',
        MEDIUM: 'gpt-4.1-mini',
        COMPLEX: 'gpt-4.1',
        REASONING: 'o4-mini',
      },
      routing: {
        default: 'SIMPLE',
      },
    })

    assert.equal(result.status, 200)
    assert.equal(result.payload.ok, true)
    assert.equal(result.payload.saveState, 'saved_degraded')
    assert.equal(result.payload.persisted, true)
    assert.equal(result.payload.mode, 'smart')
    assert.equal(result.payload.effectivePrimaryModel, 'opensparrow-router/auto')
    assert.equal(result.payload.restart.ok, false)
    assert.equal(result.payload.followUp.statusEndpoint, '/api/status')
    assert.equal(result.payload.followUp.configEndpoint, '/api/config/model-routing')
    assert.match(result.payload.warning, /timed out/i)

    const config = JSON.parse(fs.readFileSync(getConfigPath(homeDir), 'utf8'))
    assert.equal(config.agents.defaults.model.primary, 'opensparrow-router/auto')
    assert.equal(config.plugins.entries['opensparrow-router'].enabled, true)

    const readBack = await getJson(`${uiBaseUrl}/api/config/model-routing`)
    assert.equal(readBack.status, 200)
    assert.equal(readBack.payload.ok, true)
    assert.equal(readBack.payload.mode, 'smart')
    assert.equal(readBack.payload.effectivePrimaryModel, 'opensparrow-router/auto')
    assert.equal(readBack.payload.router.providerId, 'opensparrow-router')
    assert.equal(readBack.payload.router.modelTarget, 'opensparrow-router/auto')
  })
})

test('api save still returns a truthful degraded response when restart stalls after persistence', { timeout: 15000 }, async (t) => {
  await withSaveHarness(t, {
    restartDelayMs: 4000,
    saveRouteRestartTimeoutMs: 1000,
  }, async ({ uiBaseUrl }) => {
    const result = await postJson(`${uiBaseUrl}/api/config/api`, {
      baseUrl: 'https://slow-restart.example/v1',
      model: 'gpt-5.4',
      apiKey: 'sk-slow-restart',
    }, {
      timeoutMs: 2500,
    })

    assert.equal(result.status, 200)
    assert.equal(result.payload.ok, true)
    assert.equal(result.payload.saveState, 'saved_degraded')
    assert.equal(result.payload.persisted, true)
    assert.ok(result.durationMs < 2500, `expected response before client timeout, got ${result.durationMs}ms`)
  })
})

test('model-routing save still returns a truthful degraded response when restart stalls after persistence', { timeout: 15000 }, async (t) => {
  await withSaveHarness(t, {
    restartDelayMs: 4000,
    saveRouteRestartTimeoutMs: 1000,
  }, async ({ uiBaseUrl }) => {
    const result = await postJson(`${uiBaseUrl}/api/config/model-routing`, {
      mode: 'smart',
      tierModelMap: {
        SIMPLE: 'gpt-4o-mini',
        MEDIUM: 'gpt-4.1-mini',
        COMPLEX: 'gpt-4.1',
        REASONING: 'o4-mini',
      },
      routing: {
        default: 'SIMPLE',
      },
    }, {
      timeoutMs: 2500,
    })

    assert.equal(result.status, 200)
    assert.equal(result.payload.ok, true)
    assert.equal(result.payload.saveState, 'saved_degraded')
    assert.equal(result.payload.persisted, true)
    assert.ok(result.durationMs < 2500, `expected response before client timeout, got ${result.durationMs}ms`)
  })
})

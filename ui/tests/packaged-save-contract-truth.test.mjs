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

function buildTierConnectionMap(keySuffix = 'new') {
  return {
    SIMPLE: { baseUrl: 'https://simple.example/v1', apiKey: `simple-${keySuffix}`, model: 'simple-model' },
    MEDIUM: { baseUrl: 'https://medium.example/v1', apiKey: `medium-${keySuffix}`, model: 'medium-model' },
    COMPLEX: { baseUrl: 'https://complex.example/v1', apiKey: `complex-${keySuffix}`, model: 'complex-model' },
    REASONING: { baseUrl: 'https://reasoning.example/v1', apiKey: `reasoning-${keySuffix}`, model: 'reasoning-model' },
  }
}

async function withSaveHarness(testContext, options, run) {
  const homeDir = makeTempDir()
  const runtimeRoot = path.join(homeDir, 'fake-runtime')
  const uiPort = await findFreePort()
  const gatewayPort = await findFreePort()

  writeFakeOpenClawRuntime(runtimeRoot)
  writeJson(getConfigPath(homeDir), options?.initialConfig ?? {
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
  if (options?.initialAuth !== null) {
    writeJson(getAuthProfilesPath(homeDir), options?.initialAuth ?? {
      version: 1,
      profiles: {
        'openai:default': { type: 'api_key', provider: 'openai', key: 'existing-single-key' },
      },
      order: { openai: ['openai:default'] },
    })
  }

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
      tierConnectionMap: buildTierConnectionMap('router'),
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
    assert.equal(config.plugins.entries['opensparrow-router'].config.tierConnectionMap.SIMPLE.model, 'simple-model')

    const readBack = await getJson(`${uiBaseUrl}/api/config/model-routing`)
    assert.equal(readBack.status, 200)
    assert.equal(readBack.payload.ok, true)
    assert.equal(readBack.payload.mode, 'smart')
    assert.equal(readBack.payload.effectivePrimaryModel, 'opensparrow-router/auto')
    assert.equal(readBack.payload.router.providerId, 'opensparrow-router')
    assert.equal(readBack.payload.router.modelTarget, 'opensparrow-router/auto')
    assert.equal(readBack.payload.tierConnectionMap.SIMPLE.apiKeyConfigured, true)
    assert.equal(Object.hasOwn(readBack.payload.tierConnectionMap.SIMPLE, 'apiKey'), false)
    assert.equal(JSON.stringify(readBack.payload).includes('simple-router'), false)
  })
})

test('single model-routing empty key preserves an existing OpenAI key and masks readback', { timeout: 15000 }, async (t) => {
  await withSaveHarness(t, {}, async ({ homeDir, uiBaseUrl }) => {
    const result = await postJson(`${uiBaseUrl}/api/config/model-routing`, {
      mode: 'single',
      baseUrl: 'https://single-preserve.example/v1',
      apiKey: '',
      model: 'single-preserve-model',
    })

    assert.equal(result.status, 200)
    assert.equal(result.payload.ok, true)
    assert.equal(result.payload.saveState, 'saved_degraded')
    assert.equal(result.payload.mode, 'single')
    assert.equal(result.payload.effectivePrimaryModel, 'openai/single-preserve-model')

    const config = JSON.parse(fs.readFileSync(getConfigPath(homeDir), 'utf8'))
    assert.equal(config.models.providers.openai.baseUrl, 'https://single-preserve.example/v1')
    assert.equal(config.models.providers.openai.models[0].id, 'single-preserve-model')
    assert.equal(config.agents.defaults.model.primary, 'openai/single-preserve-model')

    const auth = JSON.parse(fs.readFileSync(getAuthProfilesPath(homeDir), 'utf8'))
    assert.equal(auth.profiles['openai:default'].key, 'existing-single-key')

    const readBack = await getJson(`${uiBaseUrl}/api/config/model-routing`)
    assert.equal(readBack.status, 200)
    assert.equal(readBack.payload.single.baseUrl, 'https://single-preserve.example/v1')
    assert.equal(readBack.payload.single.model, 'single-preserve-model')
    assert.equal(readBack.payload.single.apiKeyConfigured, true)
    assert.equal(Object.hasOwn(readBack.payload.single, 'apiKey'), false)
    assert.equal(JSON.stringify(readBack.payload).includes('existing-single-key'), false)
  })
})

test('single model-routing empty key without an existing key is rejected precisely', { timeout: 15000 }, async (t) => {
  await withSaveHarness(t, { initialAuth: null }, async ({ uiBaseUrl }) => {
    const result = await postJson(`${uiBaseUrl}/api/config/model-routing`, {
      mode: 'single',
      baseUrl: 'https://single-reject.example/v1',
      apiKey: '',
      model: 'single-reject-model',
    })

    assert.equal(result.status, 400)
    assert.equal(result.payload.ok, false)
    assert.equal(result.payload.saveState, 'rejected')
    assert.match(result.payload.errors.join('\n'), /API Key/)
    assert.match(result.payload.errors.join('\n'), /不存在可保留的 OpenAI API Key/)
  })
})

test('legacy shared smart config readback is represented as masked per-tier legacy-shared state', { timeout: 15000 }, async (t) => {
  await withSaveHarness(t, {
    initialConfig: {
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
              baseUrl: 'https://legacy-shared.example/v1',
              apiKey: 'legacy-shared-key',
              tierModelMap: {
                SIMPLE: 'legacy-simple-model',
                MEDIUM: 'legacy-medium-model',
                COMPLEX: 'legacy-complex-model',
                REASONING: 'legacy-reasoning-model',
              },
              routing: {},
            },
          },
        },
      },
    },
  }, async ({ uiBaseUrl }) => {
    const readBack = await getJson(`${uiBaseUrl}/api/config/model-routing`)

    assert.equal(readBack.status, 200)
    assert.equal(readBack.payload.mode, 'smart')
    assert.equal(readBack.payload.tierConnectionMap.SIMPLE.baseUrl, 'https://legacy-shared.example/v1')
    assert.equal(readBack.payload.tierConnectionMap.SIMPLE.model, 'legacy-simple-model')
    assert.equal(readBack.payload.tierConnectionMap.SIMPLE.apiKeyConfigured, true)
    assert.equal(readBack.payload.tierConnectionMap.SIMPLE.source, 'legacy-shared')
    assert.equal(Object.hasOwn(readBack.payload.tierConnectionMap.SIMPLE, 'apiKey'), false)
    assert.equal(JSON.stringify(readBack.payload).includes('legacy-shared-key'), false)
  })
})

test('smart model-routing empty tier keys preserve existing per-tier keys and masks readback', { timeout: 15000 }, async (t) => {
  const existingTierConnectionMap = buildTierConnectionMap('existing')
  await withSaveHarness(t, {
    initialConfig: {
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
              tierConnectionMap: existingTierConnectionMap,
              tierModelMap: {
                SIMPLE: 'simple-model',
                MEDIUM: 'medium-model',
                COMPLEX: 'complex-model',
                REASONING: 'reasoning-model',
              },
              routing: {},
            },
          },
        },
      },
    },
  }, async ({ homeDir, uiBaseUrl }) => {
    const incomingTierConnectionMap = {
      SIMPLE: { baseUrl: 'https://simple-new.example/v1', apiKey: '', model: 'simple-new-model' },
      MEDIUM: { baseUrl: 'https://medium-new.example/v1', apiKey: '', model: 'medium-new-model' },
      COMPLEX: { baseUrl: 'https://complex-new.example/v1', apiKey: '', model: 'complex-new-model' },
      REASONING: { baseUrl: 'https://reasoning-new.example/v1', apiKey: '', model: 'reasoning-new-model' },
    }
    const result = await postJson(`${uiBaseUrl}/api/config/model-routing`, {
      mode: 'smart',
      tierConnectionMap: incomingTierConnectionMap,
      routing: { default: 'SIMPLE' },
    })

    assert.equal(result.status, 200)
    assert.equal(result.payload.ok, true)
    assert.equal(result.payload.mode, 'smart')
    assert.equal(result.payload.effectivePrimaryModel, 'opensparrow-router/auto')

    const config = JSON.parse(fs.readFileSync(getConfigPath(homeDir), 'utf8'))
    assert.equal(config.plugins.entries['opensparrow-router'].config.tierConnectionMap.SIMPLE.apiKey, existingTierConnectionMap.SIMPLE.apiKey)
    assert.equal(config.plugins.entries['opensparrow-router'].config.tierConnectionMap.SIMPLE.baseUrl, 'https://simple-new.example/v1')
    assert.equal(config.plugins.entries['opensparrow-router'].config.tierModelMap.REASONING, 'reasoning-new-model')

    const readBack = await getJson(`${uiBaseUrl}/api/config/model-routing`)
    assert.equal(readBack.payload.tierConnectionMap.SIMPLE.apiKeyConfigured, true)
    assert.equal(Object.hasOwn(readBack.payload.tierConnectionMap.SIMPLE, 'apiKey'), false)
    assert.equal(JSON.stringify(readBack.payload).includes(existingTierConnectionMap.SIMPLE.apiKey), false)

    const configReadBack = await getJson(`${uiBaseUrl}/api/config`)
    assert.equal(configReadBack.status, 200)
    assert.equal(JSON.stringify(configReadBack.payload).includes(existingTierConnectionMap.SIMPLE.apiKey), false)
  })
})

test('smart model-routing empty tier key without existing or legacy key is rejected precisely', { timeout: 15000 }, async (t) => {
  await withSaveHarness(t, {}, async ({ uiBaseUrl }) => {
    const emptyTierConnectionMap = {
      SIMPLE: { baseUrl: 'https://simple-empty.example/v1', apiKey: '', model: 'simple-empty-model' },
      MEDIUM: { baseUrl: 'https://medium-empty.example/v1', apiKey: 'medium-new-key', model: 'medium-empty-model' },
      COMPLEX: { baseUrl: 'https://complex-empty.example/v1', apiKey: 'complex-new-key', model: 'complex-empty-model' },
      REASONING: { baseUrl: 'https://reasoning-empty.example/v1', apiKey: 'reasoning-new-key', model: 'reasoning-empty-model' },
    }

    const result = await postJson(`${uiBaseUrl}/api/config/model-routing`, {
      mode: 'smart',
      tierConnectionMap: emptyTierConnectionMap,
      routing: {},
    })

    assert.equal(result.status, 400)
    assert.equal(result.payload.ok, false)
    assert.equal(result.payload.saveState, 'rejected')
    assert.match(result.payload.errors.join('\n'), /tierConnectionMap\.SIMPLE\.apiKey/)
    assert.match(result.payload.errors.join('\n'), /不存在可保留的 API Key/)
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
      tierConnectionMap: buildTierConnectionMap('slow'),
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

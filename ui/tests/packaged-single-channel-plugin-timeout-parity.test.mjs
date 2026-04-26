import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'opensparrow-single-channel-parity-'))
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function writeJson(filePath, payload) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8')
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

function getInstallStatePath(homeDir, profile = 'usb-portable') {
  return path.join(getProfileDir(homeDir, profile), 'install-state.json')
}

function getDiagnosticBundlePath(homeDir, profile = 'usb-portable') {
  return path.join(getProfileDir(homeDir, profile), 'diagnostic-bundle.json')
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

  writeJson(path.join(openclawDir, 'package.json'), { version: '2026.4.23' })

  const fakeCliPath = path.join(openclawDir, 'openclaw.mjs')
  fs.writeFileSync(fakeCliPath, `
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const argv = process.argv.slice(2)
const profileIndex = argv.indexOf('--profile')
const profile = profileIndex >= 0 ? argv[profileIndex + 1] : 'usb-portable'
const args = profileIndex >= 0 ? argv.slice(profileIndex + 2) : argv
const homeDir = process.env.OPENCLAW_HOME || process.env.HOME
const profileDir = path.join(homeDir, \`.openclaw-\${profile}\`)
const configPath = path.join(profileDir, 'openclaw.json')
const sharedExtensionsRoot = path.join(homeDir, '.openclaw', 'extensions')
const profileExtensionsRoot = path.join(profileDir, 'extensions')
const pluginDelayMs = Number.parseInt(String(process.env.FAKE_OC_PLUGIN_DELAY_MS || '0').trim(), 10)
const channelsBehavior = String(process.env.FAKE_OC_CHANNELS_PLUGIN_BEHAVIOR || 'success').trim()

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'))
  } catch {
    return {}
  }
}

function writeConfig(config) {
  ensureDir(path.dirname(configPath))
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8')
}

function writeJson(filePath, payload) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8')
}

function writeChannelsCriticalDist(extDir) {
  const distFile = path.join(extDir, 'node_modules', '@openclaw-china', 'dingtalk', 'dist', 'index.js')
  ensureDir(path.dirname(distFile))
  fs.writeFileSync(distFile, 'export default {}\\n', 'utf8')
}

function writePluginEntrypointDist(extDir) {
  const distFile = path.join(extDir, 'dist', 'index.js')
  ensureDir(path.dirname(distFile))
  fs.writeFileSync(distFile, 'export default {}\\n', 'utf8')
}

function scheduleChannelsCriticalDist(extDir, delayMs) {
  const script = [
    "const fs=require('node:fs');",
    "const path=require('node:path');",
    "const extDir=process.argv[1];",
    "const delayMs=Number(process.argv[2]||0);",
    "const file=path.join(extDir,'node_modules','@openclaw-china','dingtalk','dist','index.js');",
    "setTimeout(()=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,'export default {}\\\\n','utf8');},delayMs);",
    "setTimeout(()=>process.exit(0),delayMs+100);",
  ].join('')
  const child = spawn(process.execPath, ['-e', script, extDir, String(delayMs)], {
    detached: true,
    stdio: 'ignore',
  })
  child.unref()
}

function setDeepValue(target, dottedPath, rawValue) {
  const segments = String(dottedPath || '').split('.').filter(Boolean)
  if (segments.length === 0) return
  let cursor = target
  for (let index = 0; index < segments.length - 1; index += 1) {
    const key = segments[index]
    if (!cursor[key] || typeof cursor[key] !== 'object' || Array.isArray(cursor[key])) {
      cursor[key] = {}
    }
    cursor = cursor[key]
  }
  cursor[segments[segments.length - 1]] = JSON.parse(rawValue)
}

function unsetDeepValue(target, dottedPath) {
  const segments = String(dottedPath || '').split('.').filter(Boolean)
  if (segments.length === 0) return
  let cursor = target
  for (let index = 0; index < segments.length - 1; index += 1) {
    const key = segments[index]
    if (!cursor[key] || typeof cursor[key] !== 'object' || Array.isArray(cursor[key])) {
      return
    }
    cursor = cursor[key]
  }
  delete cursor[segments[segments.length - 1]]
}

function writePluginFootprint(rootDir, pluginId, packageName, mode = 'final') {
  ensureDir(rootDir)
  const extDir = mode === 'stage' || mode === 'stage-shell'
    ? fs.mkdtempSync(path.join(rootDir, '.openclaw-install-stage-'))
    : path.join(rootDir, pluginId)
  ensureDir(extDir)

  writeJson(path.join(extDir, 'openclaw.plugin.json'), {
    id: pluginId,
    name: pluginId,
  })
  writeJson(path.join(extDir, 'package.json'), {
    name: packageName,
    version: '1.0.0',
  })
  writePluginEntrypointDist(extDir)

  if (pluginId === 'channels' && mode !== 'stage-shell') {
    writeChannelsCriticalDist(extDir)
  }

  return extDir
}

function resolveConfiguredChannels(config) {
  const dingtalk = Boolean(config?.channels?.dingtalk && typeof config.channels.dingtalk === 'object' && config.channels.dingtalk.enabled !== false)
  const wecom = Boolean(config?.channels?.wecom && typeof config.channels.wecom === 'object' && config.channels.wecom.enabled !== false)
  return { dingtalk, wecom }
}

function exitOk(message = 'ok') {
  if (message) process.stdout.write(\`\${message}\\n\`)
  process.exit(0)
}

function exitFail(message) {
  process.stderr.write(\`\${message}\\n\`)
  process.exit(1)
}

if (args[0] === 'plugins' && args[1] === 'install') {
  const installSpec = String(args[2] || '')
  if (installSpec.includes('wecom-openclaw-plugin')) {
    writePluginFootprint(sharedExtensionsRoot, 'wecom-openclaw-plugin', '@wecom/wecom-openclaw-plugin')
    exitOk('plugin install ok: wecom-openclaw-plugin')
  }
  const stageMode = channelsBehavior === 'timeout-stage-shell' ? 'stage-shell' : 'stage'
  const extDir = writePluginFootprint(sharedExtensionsRoot, 'channels', '@openclaw-china/channels', stageMode)
  if (channelsBehavior === 'timeout-stage-shell') {
    scheduleChannelsCriticalDist(extDir, pluginDelayMs)
  }
  await new Promise((resolve) => setTimeout(resolve, pluginDelayMs))
  exitOk('plugin install late ok: channels')
}

if (args[0] === 'config' && args[1] === 'set') {
  const config = readConfig()
  setDeepValue(config, args[2], args[3])
  writeConfig(config)
  exitOk(\`config-set ok: \${args[2]}\`)
}

if (args[0] === 'config' && args[1] === 'unset') {
  const config = readConfig()
  unsetDeepValue(config, args[2])
  writeConfig(config)
  exitOk(\`config-unset ok: \${args[2]}\`)
}

if (args[0] === 'models' && args[1] === 'set') {
  const config = readConfig()
  config.models = config.models && typeof config.models === 'object' ? config.models : {}
  config.models.default = args[2]
  writeConfig(config)
  exitOk('models-set ok')
}

if (args[0] === 'daemon' && args[1] === 'install') exitOk('daemon-install ok')
if (args[0] === 'daemon' && args[1] === 'restart') exitOk('daemon-restart ok')
if (args[0] === 'daemon' && args[1] === 'status') {
  process.stdout.write(JSON.stringify({ service: { runtime: { status: 'running' }, rpc: { healthy: true } } }))
  process.exit(0)
}

if (args[0] === 'health') {
  process.stdout.write(JSON.stringify({ ok: true }))
  process.exit(0)
}

if (args[0] === 'channels' && args[1] === 'status') {
  const config = readConfig()
  const configured = resolveConfiguredChannels(config)
  if (configured.dingtalk && configured.wecom) {
    process.stdout.write('dingtalk enabled, configured\\nwecom: enabled, configured\\nAuthentication failed: invalid bot_id or secret (code: 853000)\\n')
    process.exit(0)
  }
  if (configured.dingtalk) {
    process.stdout.write('dingtalk enabled, configured\\n')
    process.exit(0)
  }
  if (configured.wecom) {
    process.stdout.write('wecom: enabled, configured\\n')
    process.exit(0)
  }
  process.stderr.write('channel probe unavailable\\n')
  process.exit(1)
}

if (args[0] === 'debug' && args[1] === 'extensions') {
  process.stdout.write(JSON.stringify({
    sharedExtensionsRoot,
    profileExtensionsRoot,
    sharedEntries: fs.existsSync(sharedExtensionsRoot) ? fs.readdirSync(sharedExtensionsRoot) : [],
    profileEntries: fs.existsSync(profileExtensionsRoot) ? fs.readdirSync(profileExtensionsRoot) : [],
  }))
  process.exit(0)
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

async function startUiServer({ homeDir, runtimeRoot, port, gatewayPort, channelsBehavior = 'success' }) {
  const child = spawn(process.execPath, ['ui/server.mjs'], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      OPENCLAW_HOME: homeDir,
      OPENSPARROW_AUTO_OPEN: '0',
      OPENSPARROW_UI_PORT: String(port),
      OPENCLAW_GATEWAY_PORT: String(gatewayPort),
      USB_RUNTIME_ROOT: runtimeRoot,
      OPENSPARROW_PACKAGED_RUNTIME: '1',
      OPENSPARROW_PLUGIN_INSTALL_TIMEOUT_MS: '1000',
      OPENSPARROW_PLUGIN_AUTHORITY_GRACE_MS: '5000',
      OPENSPARROW_PLUGIN_AUTHORITY_POLL_MS: '100',
      FAKE_OC_PLUGIN_DELAY_MS: '4000',
      FAKE_OC_CHANNELS_PLUGIN_BEHAVIOR: channelsBehavior,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  await waitForServerReady(child, port)
  return {
    child,
    baseUrl: `http://127.0.0.1:${port}`,
  }
}

function createInstallBody(channels) {
  return {
    channels,
    api: {
      baseUrl: 'https://example.test/v1',
      apiKey: 'sk-test',
      model: 'gpt-4o-mini',
    },
  }
}

async function postJson(url, body, { timeoutMs = 0 } = {}) {
  const controller = timeoutMs > 0 ? new AbortController() : null
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
    const payload = await response.json().catch(() => ({}))
    return { status: response.status, payload }
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

async function getJson(url) {
  const response = await fetch(url)
  const payload = await response.json().catch(() => ({}))
  return { status: response.status, payload }
}

async function withInstallHarness(testContext, channels, run, options = {}) {
  const homeDir = makeTempDir()
  const runtimeRoot = path.join(homeDir, 'fake-runtime')
  const uiPort = await findFreePort()
  const gatewayPort = await findFreePort()

  writeFakeOpenClawRuntime(runtimeRoot)
  writeJson(getConfigPath(homeDir), {})

  const ui = await startUiServer({
    homeDir,
    runtimeRoot,
    port: uiPort,
    gatewayPort,
    channelsBehavior: options.channelsBehavior ?? 'success',
  })

  testContext.after(async () => {
    await stopChild(ui.child)
  })

  const install = await postJson(`${ui.baseUrl}/api/install`, createInstallBody(channels), {
    timeoutMs: 7000,
  })

  const installStatus = await getJson(`${ui.baseUrl}/api/install/status`)
  const diagnostics = await getJson(`${ui.baseUrl}/api/diagnostics`)
  const diagnosticsExport = await getJson(`${ui.baseUrl}/api/diagnostics/export`)
  const modelRouting = await getJson(`${ui.baseUrl}/api/config/model-routing`)

  return await run({
    homeDir,
    install,
    installStatus,
    diagnostics,
    diagnosticsExport,
    diagnosticBundle: readJson(getDiagnosticBundlePath(homeDir)),
    installState: readJson(getInstallStatePath(homeDir)),
    modelRouting,
  })
}

function assertRouterInvariant(modelRouting) {
  assert.equal(modelRouting.status, 200)
  assert.equal(modelRouting.payload.ok, true)
  assert.equal(modelRouting.payload.router.providerId, 'opensparrow-router')
  assert.equal(modelRouting.payload.router.modelTarget, 'opensparrow-router/auto')
}

function assertChannelProbes(actual, expected) {
  assert.deepEqual(actual ? Object.keys(actual).sort() : actual, expected ? Object.keys(expected).sort() : expected)
  for (const key of Object.keys(expected ?? {})) {
    const actualProbe = actual?.[key] ?? null
    const expectedProbe = expected[key]
    if (expectedProbe === null) {
      assert.equal(actualProbe, null)
      continue
    }
    assert.equal(actualProbe?.status, expectedProbe.status)
    assert.equal(actualProbe?.ready, expectedProbe.ready)
    assert.equal(actualProbe?.daemon, expectedProbe.daemon)
    if (expectedProbe.probeCode !== undefined) {
      assert.equal(actualProbe?.probe?.code, expectedProbe.probeCode)
    }
    if (expectedProbe.probeSummary) {
      assert.match(actualProbe?.probe?.summary ?? '', expectedProbe.probeSummary)
    }
    if (expectedProbe.firstWarning) {
      assert.equal(actualProbe?.warnings?.[0], expectedProbe.firstWarning)
    }
    if (expectedProbe.firstError) {
      assert.equal(actualProbe?.errors?.[0], expectedProbe.firstError)
    }
  }
}

function assertSurfaceConsistency({
  install,
  installStatus,
  diagnostics,
  diagnosticsExport,
  diagnosticBundle,
  installState,
  expectedStatus,
  expectedInstallState,
  expectedBlockingStep,
  expectedBlockingPlugin,
  expectedBypass,
  expectedRequestedChannelReadiness,
  expectedChannelProbes,
}) {
  assert.equal(install.payload.installState, expectedInstallState)
  assert.deepEqual(install.payload.requestedChannelReadiness, expectedRequestedChannelReadiness)
  assert.deepEqual(install.payload.bypass, expectedBypass)
  assertChannelProbes(install.payload.channelProbes, expectedChannelProbes)

  if (expectedBlockingStep === null) {
    assert.equal(install.payload.installStatus?.blockingStep ?? null, null)
    assert.equal(install.payload.installStatus?.blockingPlugin ?? null, null)
  } else {
    assert.equal(install.payload.blockingStep, expectedBlockingStep)
    assert.equal(install.payload.blockingPlugin, expectedBlockingPlugin)
  }

  assert.equal(install.payload.installStatus?.status, expectedStatus)
  assert.equal(install.payload.installStatus?.installState, expectedInstallState)
  assert.deepEqual(install.payload.installStatus?.requestedChannelReadiness, expectedRequestedChannelReadiness)
  assert.deepEqual(install.payload.installStatus?.bypass, expectedBypass)
  assertChannelProbes(install.payload.installStatus?.channelProbes, expectedChannelProbes)
  assert.equal(install.payload.installStatus?.blockingStep ?? null, expectedBlockingStep)
  assert.equal(install.payload.installStatus?.blockingPlugin ?? null, expectedBlockingPlugin)

  assert.equal(installStatus.payload.status, expectedStatus)
  assert.equal(installStatus.payload.installState, expectedInstallState)
  assert.equal(installStatus.payload.blockingStep ?? null, expectedBlockingStep)
  assert.equal(installStatus.payload.blockingPlugin ?? null, expectedBlockingPlugin)
  assert.deepEqual(installStatus.payload.bypass, expectedBypass)
  assert.deepEqual(installStatus.payload.requestedChannelReadiness, expectedRequestedChannelReadiness)
  assertChannelProbes(installStatus.payload.channelProbes, expectedChannelProbes)

  assert.equal(installState.status, expectedStatus)
  assert.equal(installState.installState, expectedInstallState)
  assert.equal(installState.blockingStep ?? null, expectedBlockingStep)
  assert.equal(installState.blockingPlugin ?? null, expectedBlockingPlugin)
  assert.deepEqual(installState.bypass, expectedBypass)
  assert.deepEqual(installState.requestedChannelReadiness, expectedRequestedChannelReadiness)
  assertChannelProbes(installState.channelProbes, expectedChannelProbes)

  for (const payload of [diagnostics.payload, diagnosticsExport.payload, diagnosticBundle]) {
    assert.equal(payload.install?.status, expectedStatus)
    assert.equal(payload.install?.installState, expectedInstallState)
    assert.equal(payload.install?.blockingStep ?? null, expectedBlockingStep)
    assert.equal(payload.install?.blockingPlugin ?? null, expectedBlockingPlugin)
    assert.deepEqual(payload.install?.bypass, expectedBypass)
    assert.deepEqual(payload.install?.requestedChannelReadiness, expectedRequestedChannelReadiness)
    assertChannelProbes(payload.install?.channelProbes, expectedChannelProbes)
    assertChannelProbes(payload.channelProbes, expectedChannelProbes)
    assertChannelProbes(payload.channels, expectedChannelProbes)
  }
}

test('dingtalk-only closes the latest packaged profile-only timeout blocker into truthful success', { timeout: 15000 }, async (t) => {
  await withInstallHarness(t, [
    { type: 'dingtalk', clientId: 'dt-client', clientSecret: 'dt-secret', corpId: 'ding-corp' },
  ], async (surfaces) => {
    assert.equal(surfaces.install.status, 200)
    assert.equal(surfaces.install.payload.ok, true)
    assert.equal(surfaces.install.payload.installState, 'completed')

    assertRouterInvariant(surfaces.modelRouting)
    assertSurfaceConsistency({
      ...surfaces,
      expectedStatus: 'completed',
      expectedInstallState: 'completed',
      expectedBlockingStep: null,
      expectedBlockingPlugin: null,
      expectedBypass: {
        verdict: 'safe_bypass',
        used: true,
        plugin: 'channels',
        reason: 'plugin install timed out after 1000ms, but packaged plugin footprint is structurally ready',
      },
      expectedRequestedChannelReadiness: {
        dingtalk: true,
        wecom: true,
      },
      expectedChannelProbes: {
        dingtalk: {
          status: 'ok',
          ready: true,
          daemon: 'running',
          probeCode: 0,
          probeSummary: /dingtalk enabled, configured/i,
        },
        wecom: null,
      },
    })
  }, {
    channelsBehavior: 'timeout-stage-shell',
  })
})

test('wecom-only closes the latest packaged profile-only timeout blocker into truthful success', { timeout: 15000 }, async (t) => {
  await withInstallHarness(t, [
    { type: 'wecom', botId: 'aib_test_bot', secret: 'wx-secret' },
  ], async (surfaces) => {
    assert.equal(surfaces.install.status, 200)
    assert.equal(surfaces.install.payload.ok, true)
    assert.equal(surfaces.install.payload.installState, 'completed')

    assertRouterInvariant(surfaces.modelRouting)
    assertSurfaceConsistency({
      ...surfaces,
      expectedStatus: 'completed',
      expectedInstallState: 'completed',
      expectedBlockingStep: null,
      expectedBlockingPlugin: null,
      expectedBypass: {
        verdict: 'none',
        used: false,
        plugin: null,
        reason: null,
      },
      expectedRequestedChannelReadiness: {
        dingtalk: true,
        wecom: true,
      },
      expectedChannelProbes: {
        dingtalk: null,
        wecom: {
          status: 'ok',
          ready: true,
          daemon: 'running',
          probeCode: 0,
          probeSummary: /wecom:\s*enabled, configured/i,
        },
      },
    })
  })
})

test('combined dingtalk+wecom closes the latest timeout blocker but keeps exact frozen F-033 probe truth', { timeout: 15000 }, async (t) => {
  await withInstallHarness(t, [
    { type: 'dingtalk', clientId: 'dt-client', clientSecret: 'dt-secret', corpId: 'ding-corp' },
    { type: 'wecom', botId: 'aib_test_bot', secret: 'wx-secret' },
  ], async (surfaces) => {
    assert.equal(surfaces.install.status, 500)
    assert.equal(surfaces.install.payload.ok, false)
    assert.equal(surfaces.install.payload.installState, 'failed')
    assert.equal(surfaces.install.payload.blockingStep, 'probe')
    assert.equal(surfaces.install.payload.blockingPlugin, 'wecom-openclaw-plugin')

    assertRouterInvariant(surfaces.modelRouting)
    assertSurfaceConsistency({
      ...surfaces,
      expectedStatus: 'error',
      expectedInstallState: 'failed',
      expectedBlockingStep: 'probe',
      expectedBlockingPlugin: 'wecom-openclaw-plugin',
      expectedBypass: {
        verdict: 'safe_bypass',
        used: true,
        plugin: 'channels',
        reason: 'plugin install timed out after 1000ms, but packaged plugin footprint is structurally ready',
      },
      expectedRequestedChannelReadiness: {
        dingtalk: false,
        wecom: false,
      },
      expectedChannelProbes: {
        dingtalk: {
          status: 'warning',
          ready: false,
          daemon: 'running',
          probeCode: 0,
          probeSummary: /invalid bot_id or secret \(code: 853000\)/i,
        },
        wecom: {
          status: 'error',
          ready: false,
          daemon: 'running',
          probeCode: 0,
          firstError: '企业微信返回鉴权错误，请检查 Bot ID / Bot Secret；若启用了自建应用回调，再同时检查 CorpSecret / Token / EncodingAESKey',
          probeSummary: /invalid bot_id or secret \(code: 853000\)/i,
        },
      },
    })
  })
})

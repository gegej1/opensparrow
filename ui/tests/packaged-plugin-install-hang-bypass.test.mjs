import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')
const UI_SOURCE = fs.readFileSync(path.join(REPO_ROOT, 'ui', 'public', 'index.html'), 'utf8')

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'opensparrow-plugin-hang-'))
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

function getInstallStatePath(homeDir, profile = 'usb-portable') {
  return path.join(getProfileDir(homeDir, profile), 'install-state.json')
}

function getSharedExtensionDir(homeDir, pluginId) {
  return path.join(homeDir, '.openclaw', 'extensions', pluginId)
}

function getProfileExtensionDir(homeDir, pluginId, profile = 'usb-portable') {
  return path.join(getProfileDir(homeDir, profile), 'extensions', pluginId)
}

function getChannelsCriticalDistPath(extDir) {
  return path.join(extDir, 'node_modules', '@openclaw-china', 'dingtalk', 'dist', 'index.js')
}

function assertChannelsAuthorityFootprint(extDir) {
  assert.equal(fs.existsSync(path.join(extDir, 'package.json')), true)
  assert.equal(fs.existsSync(path.join(extDir, 'openclaw.plugin.json')), true)
  assert.equal(fs.existsSync(path.join(extDir, 'dist', 'index.js')), true)
  assert.equal(fs.existsSync(getChannelsCriticalDistPath(extDir)), true)
}

function assertNoChannelsAuthorityFootprint(homeDir) {
  assert.equal(fs.existsSync(getSharedExtensionDir(homeDir, 'channels')), false)
  assert.equal(fs.existsSync(getProfileExtensionDir(homeDir, 'channels')), false)
}

function assertChannelsStagedShellWithoutAuthority(homeDir) {
  const sharedRoot = path.join(homeDir, '.openclaw', 'extensions')
  const stagedNames = fs.existsSync(sharedRoot)
    ? fs.readdirSync(sharedRoot).filter((name) => name.startsWith('.openclaw-install-stage-'))
    : []
  assert.equal(stagedNames.length, 1)
  const stageDir = path.join(sharedRoot, stagedNames[0])
  assert.equal(fs.existsSync(path.join(stageDir, 'package.json')), true)
  assert.equal(fs.existsSync(path.join(stageDir, 'openclaw.plugin.json')), true)
  assert.equal(fs.existsSync(path.join(stageDir, 'dist', 'index.js')), true)
  assert.equal(fs.existsSync(getChannelsCriticalDistPath(stageDir)), false)
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
const pluginDelayMs = Number.parseInt(String(process.env.FAKE_OC_PLUGIN_DELAY_MS || '0').trim(), 10)
const channelsBehavior = String(process.env.FAKE_OC_CHANNELS_PLUGIN_BEHAVIOR || 'success').trim()
const wecomBehavior = String(process.env.FAKE_OC_WECOM_PLUGIN_BEHAVIOR || 'success').trim()
const probeMode = String(process.env.FAKE_OC_PROBE_MODE || 'ready-all').trim()

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

function writePluginFootprint(pluginId, packageName, mode) {
  ensureDir(sharedExtensionsRoot)
  const extDir = mode === 'stage-shell' || mode === 'stage-structural'
    ? fs.mkdtempSync(path.join(sharedExtensionsRoot, '.openclaw-install-stage-'))
    : path.join(sharedExtensionsRoot, pluginId)
  ensureDir(extDir)
  if (mode === 'weak') return

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

function resolvePluginBehavior(spec) {
  const raw = String(spec || '')
  if (raw.includes('wecom-openclaw-plugin')) {
    return {
      pluginId: 'wecom-openclaw-plugin',
      packageName: '@wecom/wecom-openclaw-plugin',
      behavior: wecomBehavior,
    }
  }
  return {
    pluginId: 'channels',
    packageName: '@openclaw-china/channels',
    behavior: channelsBehavior,
  }
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
  const installSpec = args[2]
  const resolved = resolvePluginBehavior(installSpec)
  if (resolved.behavior === 'success') {
    writePluginFootprint(resolved.pluginId, resolved.packageName, 'structural')
    exitOk(\`plugin install ok: \${resolved.pluginId}\`)
  }
  if (resolved.behavior === 'timeout-weak') {
    writePluginFootprint(resolved.pluginId, resolved.packageName, 'weak')
    await new Promise((resolve) => setTimeout(resolve, pluginDelayMs))
    exitOk(\`plugin install late ok: \${resolved.pluginId}\`)
  }
  if (resolved.behavior === 'timeout-structural') {
    writePluginFootprint(resolved.pluginId, resolved.packageName, 'structural')
    await new Promise((resolve) => setTimeout(resolve, pluginDelayMs))
    exitOk(\`plugin install late ok: \${resolved.pluginId}\`)
  }
  if (resolved.behavior === 'timeout-stage-shell') {
    const extDir = writePluginFootprint(resolved.pluginId, resolved.packageName, 'stage-shell')
    if (resolved.pluginId === 'channels') scheduleChannelsCriticalDist(extDir, pluginDelayMs)
    await new Promise((resolve) => setTimeout(resolve, pluginDelayMs))
    exitOk(\`plugin install late ok: \${resolved.pluginId}\`)
  }
  if (resolved.behavior === 'timeout-stage-shell-never-ready') {
    writePluginFootprint(resolved.pluginId, resolved.packageName, 'stage-shell')
    await new Promise((resolve) => setTimeout(resolve, pluginDelayMs))
    exitOk(\`plugin install never became structurally ready: \${resolved.pluginId}\`)
  }
  exitFail(\`unsupported fake plugin behavior: \${resolved.behavior}\`)
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
  if (probeMode === 'ready-all') {
    process.stdout.write('dingtalk enabled, configured\\nwecom enabled, configured\\n')
    process.exit(0)
  }
  if (probeMode === 'warning-wecom') {
    process.stdout.write('wecom: enabled, configured\\nstatus code 401\\n')
    process.exit(0)
  }
  if (probeMode === 'auth-fail-wecom') {
    process.stdout.write('wecom: enabled, configured\\nAuthentication failed: invalid bot_id or secret (code: 853000)\\n')
    process.exit(0)
  }
  if (probeMode === 'auth-fail-wecom-no-prefix') {
    process.stdout.write('Authentication failed: invalid bot_id or secret (code: 853000)\\n')
    process.exit(0)
  }
  if (probeMode === 'dingtalk-and-wecom-auth-fail-no-prefix') {
    process.stdout.write('dingtalk enabled, configured\\nstatus code 401\\nAuthentication failed: invalid bot_id or secret (code: 853000)\\n')
    process.exit(0)
  }
  process.stderr.write('channel probe unavailable\\n')
  process.exit(1)
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

async function startUiServer({
  homeDir,
  runtimeRoot,
  port,
  gatewayPort,
  channelsBehavior,
  wecomBehavior,
  probeMode,
  installTimeoutMs = 1000,
  authorityGraceMs = 5000,
  lateStageAuthorityGraceMs = authorityGraceMs,
  authorityPollMs = 100,
  pluginDelayMs = 4000,
}) {
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
      OPENSPARROW_PLUGIN_INSTALL_TIMEOUT_MS: String(installTimeoutMs),
      OPENSPARROW_PLUGIN_AUTHORITY_GRACE_MS: String(authorityGraceMs),
      OPENSPARROW_PLUGIN_LATE_STAGE_AUTHORITY_GRACE_MS: String(lateStageAuthorityGraceMs),
      OPENSPARROW_PLUGIN_AUTHORITY_POLL_MS: String(authorityPollMs),
      FAKE_OC_PLUGIN_DELAY_MS: String(pluginDelayMs),
      FAKE_OC_CHANNELS_PLUGIN_BEHAVIOR: channelsBehavior,
      FAKE_OC_WECOM_PLUGIN_BEHAVIOR: wecomBehavior,
      FAKE_OC_PROBE_MODE: probeMode,
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

function isInstallTimeoutLike(errorText) {
  const text = String(errorText || '')
  const timeoutLike = /(timed out|timeout|health\s*check)/i.test(text)
  const hardFail = /(config set|models set|plugin install|writing auth-profiles|spawn .*enoent|unknown channel type|不能为空|invalid)/i.test(text)
  return timeoutLike && !hardFail
}

function buildInstallErrorText(payload, statusCode) {
  const parts = []
  if (typeof payload?.summary === 'string' && payload.summary.trim()) parts.push(payload.summary.trim())
  if (Array.isArray(payload?.errors)) parts.push(...payload.errors)
  if (typeof payload?.error === 'string' && payload.error.trim()) parts.push(payload.error.trim())
  if (typeof payload?.message === 'string' && payload.message.trim()) parts.push(payload.message.trim())
  if (parts.length === 0) parts.push(`服务器返回错误 ${statusCode}`)
  return parts.join('\n')
}

async function withInstallHarness(testContext, options, run) {
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
    channelsBehavior: options.channelsBehavior,
    wecomBehavior: options.wecomBehavior,
    probeMode: options.probeMode,
    installTimeoutMs: options.installTimeoutMs,
    authorityGraceMs: options.authorityGraceMs,
    lateStageAuthorityGraceMs: options.lateStageAuthorityGraceMs,
    authorityPollMs: options.authorityPollMs,
    pluginDelayMs: options.pluginDelayMs,
  })

  testContext.after(async () => {
    await stopChild(ui.child)
  })

  return await run({
    homeDir,
    uiBaseUrl: ui.baseUrl,
  })
}

test('weak plugin install signals do not become safe bypass and terminate with non-success status', { timeout: 15000 }, async (t) => {
  await withInstallHarness(t, {
    channelsBehavior: 'success',
    wecomBehavior: 'timeout-weak',
    probeMode: 'ready-all',
  }, async ({ homeDir, uiBaseUrl }) => {
    const result = await postJson(`${uiBaseUrl}/api/install`, createInstallBody([
      { type: 'dingtalk', clientId: 'dt-client', clientSecret: 'dt-secret', corpId: 'ding-corp' },
      { type: 'wecom', botId: 'aib_test_bot', secret: 'wx-secret' },
    ]), {
      timeoutMs: 2500,
    })

    assert.equal(result.status, 500)
    assert.equal(result.payload.ok, false)
    assert.equal(result.payload.installState, 'failed')
    assert.equal(result.payload.blockingStep, 'plugins')
    assert.equal(result.payload.blockingPlugin, 'wecom-openclaw-plugin')
    assert.equal(result.payload.bypass?.verdict, 'failed')
    assert.equal(result.payload.bypass?.used, false)
    assert.equal(result.payload.requestedChannelReadiness?.wecom, false)

    const errorText = buildInstallErrorText(result.payload, result.status)
    assert.equal(isInstallTimeoutLike(errorText), false)

    const installState = JSON.parse(fs.readFileSync(getInstallStatePath(homeDir), 'utf8'))
    assert.equal(installState.status, 'error')
    assert.equal(installState.installState, 'failed')
    assert.equal(installState.blockingPlugin, 'wecom-openclaw-plugin')
    assert.equal(installState.currentStep, 'plugins')

    const readBack = await getJson(`${uiBaseUrl}/api/install/status`)
    assert.equal(readBack.status, 200)
    assert.equal(readBack.payload.status, 'error')
    assert.equal(readBack.payload.installState, 'failed')
    assert.equal(readBack.payload.blockingPlugin, 'wecom-openclaw-plugin')
  })
})

test('structurally ready packaged plugin installs can use safe bypass and still finish only after requested channels are ready', { timeout: 15000 }, async (t) => {
  await withInstallHarness(t, {
    channelsBehavior: 'success',
    wecomBehavior: 'timeout-structural',
    probeMode: 'ready-all',
  }, async ({ uiBaseUrl }) => {
    const result = await postJson(`${uiBaseUrl}/api/install`, createInstallBody([
      { type: 'dingtalk', clientId: 'dt-client', clientSecret: 'dt-secret', corpId: 'ding-corp' },
      { type: 'wecom', botId: 'aib_test_bot', secret: 'wx-secret' },
    ]), {
      timeoutMs: 2500,
    })

    assert.equal(result.status, 200)
    assert.equal(result.payload.ok, true)
    assert.equal(result.payload.installState, 'completed')
    assert.equal(result.payload.bypass?.verdict, 'safe_bypass')
    assert.equal(result.payload.bypass?.used, true)
    assert.equal(result.payload.requestedChannelReadiness?.dingtalk, true)
    assert.equal(result.payload.requestedChannelReadiness?.wecom, true)
    assert.equal(result.payload.channelProbes?.dingtalk?.ready, true)
    assert.equal(result.payload.channelProbes?.wecom?.ready, true)
  })
})

test('staged packaged shells that become structurally ready after timeout still close safe bypass once authority catches up', { timeout: 15000 }, async (t) => {
  await withInstallHarness(t, {
    channelsBehavior: 'timeout-stage-shell',
    wecomBehavior: 'success',
    probeMode: 'ready-all',
  }, async ({ uiBaseUrl }) => {
    const result = await postJson(`${uiBaseUrl}/api/install`, createInstallBody([
      { type: 'dingtalk', clientId: 'dt-client', clientSecret: 'dt-secret', corpId: 'ding-corp' },
    ]), {
      timeoutMs: 8000,
    })

    assert.equal(result.status, 200)
    assert.equal(result.payload.ok, true)
    assert.equal(result.payload.installState, 'completed')
    assert.equal(result.payload.bypass?.verdict, 'safe_bypass')
    assert.equal(result.payload.bypass?.used, true)
    assert.equal(result.payload.requestedChannelReadiness?.dingtalk, true)
    assert.equal(result.payload.channelProbes?.dingtalk?.ready, true)
  })
})

test('late staged channels shell closes after normal authority grace but within bounded late-stage authority wait', { timeout: 15000 }, async (t) => {
  await withInstallHarness(t, {
    channelsBehavior: 'timeout-stage-shell',
    wecomBehavior: 'success',
    probeMode: 'ready-all',
    installTimeoutMs: 250,
    authorityGraceMs: 300,
    lateStageAuthorityGraceMs: 1200,
    authorityPollMs: 50,
    pluginDelayMs: 800,
  }, async ({ homeDir, uiBaseUrl }) => {
    const result = await postJson(`${uiBaseUrl}/api/install`, createInstallBody([
      { type: 'dingtalk', clientId: 'dt-client', clientSecret: 'dt-secret', corpId: 'ding-corp' },
    ]), {
      timeoutMs: 6000,
    })

    assert.equal(result.status, 200)
    assert.equal(result.payload.ok, true)
    assert.equal(result.payload.installState, 'completed')
    assert.equal(result.payload.bypass?.verdict, 'safe_bypass')
    assert.equal(result.payload.bypass?.used, true)
    assert.equal(result.payload.bypass?.plugin, 'channels')
    assert.equal(result.payload.bypass?.reason, 'plugin install timed out after 250ms, but packaged plugin footprint is structurally ready')
    assert.equal(result.payload.requestedChannelReadiness?.dingtalk, true)
    assert.equal(result.payload.channelProbes?.dingtalk?.ready, true)

    assertChannelsAuthorityFootprint(getSharedExtensionDir(homeDir, 'channels'))
    assertChannelsAuthorityFootprint(getProfileExtensionDir(homeDir, 'channels'))
  })
})

test('matching staged channels shell without structural authority remains precise failure', { timeout: 15000 }, async (t) => {
  await withInstallHarness(t, {
    channelsBehavior: 'timeout-stage-shell-never-ready',
    wecomBehavior: 'success',
    probeMode: 'ready-all',
    installTimeoutMs: 250,
    authorityGraceMs: 300,
    lateStageAuthorityGraceMs: 700,
    authorityPollMs: 50,
    pluginDelayMs: 1200,
  }, async ({ homeDir, uiBaseUrl }) => {
    const result = await postJson(`${uiBaseUrl}/api/install`, createInstallBody([
      { type: 'dingtalk', clientId: 'dt-client', clientSecret: 'dt-secret', corpId: 'ding-corp' },
    ]), {
      timeoutMs: 6000,
    })

    assert.equal(result.status, 500)
    assert.equal(result.payload.ok, false)
    assert.equal(result.payload.installState, 'failed')
    assert.equal(result.payload.blockingStep, 'plugins')
    assert.equal(result.payload.blockingPlugin, 'channels')
    assert.equal(result.payload.bypass?.verdict, 'failed')
    assert.equal(result.payload.bypass?.used, false)
    assert.equal(result.payload.bypass?.plugin, 'channels')
    assert.equal(result.payload.bypass?.reason, 'plugin install timed out after 250ms without structurally ready packaged footprint')
    assert.equal(result.payload.requestedChannelReadiness?.dingtalk, false)
    assert.equal(result.payload.channelProbes?.dingtalk ?? null, null)

    assertNoChannelsAuthorityFootprint(homeDir)
    assertChannelsStagedShellWithoutAuthority(homeDir)
  })
})

test('safe bypass does not turn requested-but-not-ready channels into success or timeout-like pseudo-success', { timeout: 15000 }, async (t) => {
  await withInstallHarness(t, {
    channelsBehavior: 'success',
    wecomBehavior: 'timeout-structural',
    probeMode: 'warning-wecom',
  }, async ({ homeDir, uiBaseUrl }) => {
    const result = await postJson(`${uiBaseUrl}/api/install`, createInstallBody([
      { type: 'wecom', botId: 'aib_test_bot', secret: 'wx-secret' },
    ]), {
      timeoutMs: 2500,
    })

    assert.equal(result.status, 500)
    assert.equal(result.payload.ok, false)
    assert.equal(result.payload.installState, 'blocked_degraded')
    assert.equal(result.payload.bypass?.verdict, 'safe_bypass')
    assert.equal(result.payload.bypass?.used, true)
    assert.equal(result.payload.requestedChannelReadiness?.wecom, false)
    assert.equal(result.payload.channelProbes?.wecom?.ready, false)

    const errorText = buildInstallErrorText(result.payload, result.status)
    assert.equal(isInstallTimeoutLike(errorText), false)

    const readBack = await getJson(`${uiBaseUrl}/api/install/status`)
    assert.equal(readBack.payload.status, 'error')
    assert.equal(readBack.payload.installState, 'blocked_degraded')

    const installState = JSON.parse(fs.readFileSync(getInstallStatePath(homeDir), 'utf8'))
    assert.equal(installState.status, 'error')
    assert.equal(installState.installState, 'blocked_degraded')
    assert.equal(installState.requestedChannelReadiness.wecom, false)
  })
})

test('explicit wecom auth failure cannot be classified as ready or completed across install and diagnostics surfaces', { timeout: 15000 }, async (t) => {
  await withInstallHarness(t, {
    channelsBehavior: 'success',
    wecomBehavior: 'success',
    probeMode: 'auth-fail-wecom',
  }, async ({ homeDir, uiBaseUrl }) => {
    const result = await postJson(`${uiBaseUrl}/api/install`, createInstallBody([
      { type: 'dingtalk', clientId: 'dt-client', clientSecret: 'dt-secret', corpId: 'ding-corp' },
      { type: 'wecom', botId: 'aib_test_bot', secret: 'wx-secret' },
    ]), {
      timeoutMs: 2500,
    })

    assert.equal(result.status, 500)
    assert.equal(result.payload.ok, false)
    assert.equal(result.payload.installState, 'failed')
    assert.equal(result.payload.bypass?.used, false)
    assert.equal(result.payload.requestedChannelReadiness?.wecom, false)
    assert.notEqual(result.payload.channelProbes?.wecom?.status, 'ok')
    assert.notEqual(result.payload.channelProbes?.wecom?.ready, true)
    assert.match(result.payload.channelProbes?.wecom?.probe?.summary ?? '', /invalid bot_id or secret/i)

    const errorText = buildInstallErrorText(result.payload, result.status)
    assert.equal(isInstallTimeoutLike(errorText), false)

    const readBack = await getJson(`${uiBaseUrl}/api/install/status`)
    assert.equal(readBack.status, 200)
    assert.equal(readBack.payload.status, 'error')
    assert.equal(readBack.payload.installState, 'failed')
    assert.equal(readBack.payload.requestedChannelReadiness?.wecom, false)
    assert.notEqual(readBack.payload.channelProbes?.wecom?.status, 'ok')
    assert.notEqual(readBack.payload.channelProbes?.wecom?.ready, true)
    assert.match(readBack.payload.channelProbes?.wecom?.probe?.summary ?? '', /invalid bot_id or secret/i)

    const diagnostics = await getJson(`${uiBaseUrl}/api/diagnostics`)
    assert.equal(diagnostics.status, 200)
    assert.equal(diagnostics.payload.install?.status, 'error')
    assert.equal(diagnostics.payload.install?.installState, 'failed')
    assert.equal(diagnostics.payload.install?.requestedChannelReadiness?.wecom, false)
    assert.notEqual(diagnostics.payload.install?.channelProbes?.wecom?.status, 'ok')
    assert.notEqual(diagnostics.payload.install?.channelProbes?.wecom?.ready, true)
    assert.notEqual(diagnostics.payload.channelProbes?.wecom?.status, 'ok')
    assert.notEqual(diagnostics.payload.channelProbes?.wecom?.ready, true)
    assert.match(diagnostics.payload.channelProbes?.wecom?.probe?.summary ?? '', /invalid bot_id or secret/i)

    const diagnosticsExport = await getJson(`${uiBaseUrl}/api/diagnostics/export`)
    assert.equal(diagnosticsExport.status, 200)
    assert.equal(diagnosticsExport.payload.install?.status, 'error')
    assert.equal(diagnosticsExport.payload.install?.installState, 'failed')
    assert.equal(diagnosticsExport.payload.install?.requestedChannelReadiness?.wecom, false)
    assert.notEqual(diagnosticsExport.payload.channelProbes?.wecom?.status, 'ok')
    assert.notEqual(diagnosticsExport.payload.channelProbes?.wecom?.ready, true)
    assert.match(diagnosticsExport.payload.channelProbes?.wecom?.probe?.summary ?? '', /invalid bot_id or secret/i)

    const installState = JSON.parse(fs.readFileSync(getInstallStatePath(homeDir), 'utf8'))
    assert.equal(installState.status, 'error')
    assert.equal(installState.installState, 'failed')
    assert.equal(installState.requestedChannelReadiness?.wecom, false)
    assert.notEqual(installState.channelProbes?.wecom?.status, 'ok')
    assert.notEqual(installState.channelProbes?.wecom?.ready, true)
    assert.match(installState.channelProbes?.wecom?.probe?.summary ?? '', /invalid bot_id or secret/i)
  })
})

test('wecom auth failure without wecom-prefixed summary still becomes hard failure across install and diagnostics surfaces', { timeout: 15000 }, async (t) => {
  await withInstallHarness(t, {
    channelsBehavior: 'success',
    wecomBehavior: 'success',
    probeMode: 'auth-fail-wecom-no-prefix',
  }, async ({ homeDir, uiBaseUrl }) => {
    const result = await postJson(`${uiBaseUrl}/api/install`, createInstallBody([
      { type: 'wecom', botId: 'aib_test_bot', secret: 'wx-secret' },
    ]), {
      timeoutMs: 2500,
    })

    assert.equal(result.status, 500)
    assert.equal(result.payload.ok, false)
    assert.equal(result.payload.installState, 'failed')
    assert.equal(result.payload.bypass?.used, false)
    assert.equal(result.payload.requestedChannelReadiness?.wecom, false)
    assert.equal(result.payload.channelProbes?.wecom?.status, 'error')
    assert.equal(result.payload.channelProbes?.wecom?.ready, false)
    assert.match(result.payload.channelProbes?.wecom?.probe?.summary ?? '', /invalid bot_id or secret/i)

    const errorText = buildInstallErrorText(result.payload, result.status)
    assert.equal(isInstallTimeoutLike(errorText), false)

    const readBack = await getJson(`${uiBaseUrl}/api/install/status`)
    assert.equal(readBack.status, 200)
    assert.equal(readBack.payload.status, 'error')
    assert.equal(readBack.payload.installState, 'failed')
    assert.equal(readBack.payload.requestedChannelReadiness?.wecom, false)
    assert.equal(readBack.payload.channelProbes?.wecom?.status, 'error')
    assert.equal(readBack.payload.channelProbes?.wecom?.ready, false)

    const diagnostics = await getJson(`${uiBaseUrl}/api/diagnostics`)
    assert.equal(diagnostics.status, 200)
    assert.equal(diagnostics.payload.install?.status, 'error')
    assert.equal(diagnostics.payload.install?.installState, 'failed')
    assert.equal(diagnostics.payload.install?.requestedChannelReadiness?.wecom, false)
    assert.equal(diagnostics.payload.channelProbes?.wecom?.status, 'error')
    assert.equal(diagnostics.payload.channelProbes?.wecom?.ready, false)

    const diagnosticsExport = await getJson(`${uiBaseUrl}/api/diagnostics/export`)
    assert.equal(diagnosticsExport.status, 200)
    assert.equal(diagnosticsExport.payload.install?.status, 'error')
    assert.equal(diagnosticsExport.payload.install?.installState, 'failed')
    assert.equal(diagnosticsExport.payload.install?.requestedChannelReadiness?.wecom, false)
    assert.equal(diagnosticsExport.payload.channelProbes?.wecom?.status, 'error')
    assert.equal(diagnosticsExport.payload.channelProbes?.wecom?.ready, false)

    const installState = JSON.parse(fs.readFileSync(getInstallStatePath(homeDir), 'utf8'))
    assert.equal(installState.status, 'error')
    assert.equal(installState.installState, 'failed')
    assert.equal(installState.requestedChannelReadiness?.wecom, false)
    assert.equal(installState.channelProbes?.wecom?.status, 'error')
    assert.equal(installState.channelProbes?.wecom?.ready, false)
  })
})

test('combined dingtalk+wecom non-success path still keeps wecom auth failure truthful without prefix drift', { timeout: 15000 }, async (t) => {
  await withInstallHarness(t, {
    channelsBehavior: 'success',
    wecomBehavior: 'success',
    probeMode: 'dingtalk-and-wecom-auth-fail-no-prefix',
  }, async ({ homeDir, uiBaseUrl }) => {
    const result = await postJson(`${uiBaseUrl}/api/install`, createInstallBody([
      { type: 'dingtalk', clientId: 'dt-client', clientSecret: 'dt-secret', corpId: 'ding-corp' },
      { type: 'wecom', botId: 'aib_test_bot', secret: 'wx-secret' },
    ]), {
      timeoutMs: 2500,
    })

    assert.equal(result.status, 500)
    assert.equal(result.payload.ok, false)
    assert.equal(result.payload.installState, 'failed')
    assert.equal(result.payload.requestedChannelReadiness?.dingtalk, false)
    assert.equal(result.payload.requestedChannelReadiness?.wecom, false)
    assert.notEqual(result.payload.channelProbes?.dingtalk?.ready, true)
    assert.equal(result.payload.channelProbes?.wecom?.status, 'error')
    assert.equal(result.payload.channelProbes?.wecom?.ready, false)
    assert.match(result.payload.channelProbes?.wecom?.probe?.summary ?? '', /invalid bot_id or secret/i)

    const errorText = buildInstallErrorText(result.payload, result.status)
    assert.equal(isInstallTimeoutLike(errorText), false)

    const readBack = await getJson(`${uiBaseUrl}/api/install/status`)
    assert.equal(readBack.status, 200)
    assert.equal(readBack.payload.status, 'error')
    assert.equal(readBack.payload.installState, 'failed')
    assert.equal(readBack.payload.requestedChannelReadiness?.dingtalk, false)
    assert.equal(readBack.payload.requestedChannelReadiness?.wecom, false)
    assert.equal(readBack.payload.channelProbes?.wecom?.status, 'error')
    assert.equal(readBack.payload.channelProbes?.wecom?.ready, false)

    const diagnostics = await getJson(`${uiBaseUrl}/api/diagnostics`)
    assert.equal(diagnostics.status, 200)
    assert.equal(diagnostics.payload.install?.status, 'error')
    assert.equal(diagnostics.payload.install?.installState, 'failed')
    assert.equal(diagnostics.payload.install?.requestedChannelReadiness?.dingtalk, false)
    assert.equal(diagnostics.payload.install?.requestedChannelReadiness?.wecom, false)
    assert.equal(diagnostics.payload.install?.channelProbes?.wecom?.status, 'error')
    assert.equal(diagnostics.payload.install?.channelProbes?.wecom?.ready, false)
    assert.equal(diagnostics.payload.channelProbes?.wecom?.status, 'error')
    assert.equal(diagnostics.payload.channelProbes?.wecom?.ready, false)

    const diagnosticsExport = await getJson(`${uiBaseUrl}/api/diagnostics/export`)
    assert.equal(diagnosticsExport.status, 200)
    assert.equal(diagnosticsExport.payload.install?.status, 'error')
    assert.equal(diagnosticsExport.payload.install?.installState, 'failed')
    assert.equal(diagnosticsExport.payload.install?.requestedChannelReadiness?.dingtalk, false)
    assert.equal(diagnosticsExport.payload.install?.requestedChannelReadiness?.wecom, false)
    assert.equal(diagnosticsExport.payload.channelProbes?.wecom?.status, 'error')
    assert.equal(diagnosticsExport.payload.channelProbes?.wecom?.ready, false)

    const installState = JSON.parse(fs.readFileSync(getInstallStatePath(homeDir), 'utf8'))
    assert.equal(installState.status, 'error')
    assert.equal(installState.installState, 'failed')
    assert.equal(installState.requestedChannelReadiness?.dingtalk, false)
    assert.equal(installState.requestedChannelReadiness?.wecom, false)
    assert.equal(installState.channelProbes?.wecom?.status, 'error')
    assert.equal(installState.channelProbes?.wecom?.ready, false)
  })
})

test('install UI still guards timeout-like fallback through hard-fail wording rules', () => {
  assert.match(UI_SOURCE, /const timeoutLike = \/\(timed out\|timeout\|health\\s\*check\)\/i/)
  assert.match(UI_SOURCE, /const hardFail = \/\(config set\|models set\|plugin install\|writing auth-profiles\|spawn \.\*enoent\|unknown channel type\|不能为空\|invalid\)\/i/)
})

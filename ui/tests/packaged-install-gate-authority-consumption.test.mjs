import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'opensparrow-install-gate-authority-'))
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return fallback
  }
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

function profileDir(homeDir, profile = 'gtclaw-portable') {
  return path.join(homeDir, `.openclaw-${profile}`)
}

function installStatePath(homeDir, profile = 'gtclaw-portable') {
  return path.join(profileDir(homeDir, profile), 'install-state.json')
}

function writeFakeOpenClawRuntime(runtimeRoot) {
  const binDir = path.join(runtimeRoot, 'bin')
  const openclawDir = path.join(runtimeRoot, 'openclaw')
  ensureDir(binDir)
  ensureDir(openclawDir)

  try {
    fs.symlinkSync(process.execPath, path.join(binDir, 'node'))
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error
  }

  fs.writeFileSync(path.join(openclawDir, 'openclaw.mjs'), `
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { spawn } from 'node:child_process'

const argv = process.argv.slice(2)
const profileIndex = argv.indexOf('--profile')
const profile = profileIndex >= 0 ? argv[profileIndex + 1] : (process.env.OPENCLAW_PROFILE || 'gtclaw-portable')
const args = profileIndex >= 0 ? argv.slice(profileIndex + 2) : argv
const statePath = process.env.FAKE_OC_STATE_PATH
const home = process.env.OPENCLAW_HOME
const configPath = process.env.OPENCLAW_CONFIG_PATH || path.join(home, '.openclaw-' + profile, 'openclaw.json')

function readState() {
  try { return JSON.parse(fs.readFileSync(statePath, 'utf8')) } catch { return { counts: {} } }
}

function writeState(state) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true })
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8')
}

function bump(name) {
  const state = readState()
  state.counts = state.counts || {}
  state.counts[name] = (state.counts[name] || 0) + 1
  writeState(state)
  return state.counts[name]
}

function setNested(target, dottedPath, value) {
  const parts = dottedPath.split('.').filter(Boolean)
  let cursor = target
  while (parts.length > 1) {
    const key = parts.shift()
    cursor[key] = cursor[key] && typeof cursor[key] === 'object' && !Array.isArray(cursor[key])
      ? cursor[key]
      : {}
    cursor = cursor[key]
  }
  cursor[parts[0]] = value
}

function readConfig() {
  try { return JSON.parse(fs.readFileSync(configPath, 'utf8')) } catch { return {} }
}

function writeConfig(config) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true })
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8')
}

function parseConfigValue(raw) {
  try { return JSON.parse(raw) } catch { return raw }
}

function writePluginFootprint(rootDir) {
  const extDir = path.join(rootDir, 'channels')
  fs.mkdirSync(path.join(extDir, 'dist'), { recursive: true })
  fs.mkdirSync(path.join(extDir, 'node_modules', '@openclaw-china', 'dingtalk', 'dist'), { recursive: true })
  fs.writeFileSync(path.join(extDir, 'package.json'), JSON.stringify({ name: '@openclaw-china/channels' }), 'utf8')
  fs.writeFileSync(path.join(extDir, 'openclaw.plugin.json'), JSON.stringify({ id: 'channels' }), 'utf8')
  fs.writeFileSync(path.join(extDir, 'dist', 'index.js'), 'export default {}\\n', 'utf8')
  fs.writeFileSync(path.join(extDir, 'node_modules', '@openclaw-china', 'dingtalk', 'dist', 'index.js'), 'var REQUEST_TIMEOUT = 3e4;\\n', 'utf8')
}

function maybeStartForeignGateway() {
  if (process.env.FAKE_FOREIGN_GATEWAY_AFTER_RESTART !== '1') return
  const state = readState()
  if (state.foreignPid) return
  const port = Number.parseInt(process.env.OPENCLAW_GATEWAY_PORT || '0', 10)
  const code = [
    "const http = require('node:http')",
    "const server = http.createServer((req, res) => res.end('foreign gateway'))",
    "server.listen(" + port + ", '127.0.0.1')",
    "setInterval(() => {}, 1000)",
  ].join(';')
  const child = spawn(process.execPath, ['-e', code], { detached: true, stdio: 'ignore' })
  child.unref()
  state.foreignPid = child.pid
  writeState(state)
}

if (args[0] === 'plugins' && args[1] === 'install') {
  const sharedRoot = path.join(home, '.openclaw', 'extensions')
  const profileRoot = path.join(home, '.openclaw-' + profile, 'extensions')
  writePluginFootprint(sharedRoot)
  writePluginFootprint(profileRoot)
  process.stdout.write('installed channels\\n')
  process.exit(0)
}

if (args[0] === 'config' && args[1] === 'set') {
  const config = readConfig()
  setNested(config, args[2], parseConfigValue(args[3]))
  writeConfig(config)
  process.stdout.write('{}\\n')
  process.exit(0)
}

if (args[0] === 'config' && args[1] === 'unset') {
  process.stdout.write('{}\\n')
  process.exit(0)
}

if (args[0] === 'models' && args[1] === 'set') {
  process.stdout.write('{}\\n')
  process.exit(0)
}

if (args[0] === 'daemon' && args[1] === 'install') {
  process.stdout.write('{}\\n')
  process.exit(0)
}

if (args[0] === 'daemon' && args[1] === 'restart') {
  maybeStartForeignGateway()
  process.stdout.write('{}\\n')
  process.exit(0)
}

if (args[0] === 'daemon' && args[1] === 'status') {
  const count = bump('daemonStatus')
  const readyAfter = Number.parseInt(process.env.FAKE_DAEMON_READY_AFTER || '0', 10)
  const running = count > readyAfter
  process.stdout.write(JSON.stringify({
    service: {
      runtime: { status: running ? 'running' : 'unknown' },
      rpc: { healthy: running }
    }
  }))
  process.exit(0)
}

if (args[0] === 'health') {
  const count = bump('health')
  const readyAfter = Number.parseInt(process.env.FAKE_HEALTH_READY_AFTER || '0', 10)
  const healthy = count > readyAfter
  if (healthy) {
    process.stdout.write(JSON.stringify({ ok: true }))
    process.exit(0)
  }
  const kind = process.env.FAKE_HEALTH_FAILURE_KIND || 'gateway_unhealthy'
  if (kind === 'config_path_token_mismatch') {
    process.stderr.write('gateway token mismatch: default config is missing gateway token')
  } else {
    process.stderr.write('current profile gateway health check failed')
  }
  process.exit(1)
}

if (args[0] === 'channels' && args[1] === 'status') {
  bump('channelStatus')
  process.stdout.write(process.env.FAKE_CHANNELS_STATUS_OUTPUT || 'dingtalk enabled, configured\\n')
  process.exit(0)
}

process.stderr.write('unsupported fake openclaw command: ' + args.join(' ') + '\\n')
process.exit(1)
`, 'utf8')
}

async function waitForServerReady(child, port, timeoutMs = 15000) {
  const target = `Listening: http://localhost:${port}`
  return await new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''
    const timeoutId = setTimeout(() => {
      cleanup()
      reject(new Error(`server did not become ready\\nstdout:\\n${stdout}\\nstderr:\\n${stderr}`))
    }, timeoutMs)
    const cleanup = () => {
      clearTimeout(timeoutId)
      child.stdout.off('data', onStdout)
      child.stderr.off('data', onStderr)
      child.off('exit', onExit)
    }
    const onStdout = (chunk) => {
      stdout += chunk.toString()
      if (stdout.includes(target)) {
        cleanup()
        resolve()
      }
    }
    const onStderr = (chunk) => {
      stderr += chunk.toString()
    }
    const onExit = (code, signal) => {
      cleanup()
      reject(new Error(`server exited before ready code=${code} signal=${signal}\\nstdout:\\n${stdout}\\nstderr:\\n${stderr}`))
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

function stopForeignGateway(statePath) {
  const state = readJson(statePath, {})
  if (!state?.foreignPid) return
  try {
    process.kill(state.foreignPid, 'SIGTERM')
  } catch {}
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options)
  return {
    status: response.status,
    payload: await response.json(),
  }
}

function buildInstallPayload(overrides = {}) {
  return {
    api: {
      baseUrl: 'https://api.example.test/v1',
      apiKey: 'synthetic-api-key-value',
      model: 'gpt-4o-mini',
    },
    channels: [
      {
        type: 'dingtalk',
        clientId: 'synthetic-dingtalk-client-id',
        clientSecret: 'synthetic-dingtalk-client-secret',
        corpId: 'synthetic-corp-id',
        ...overrides.dingtalk,
      },
    ],
  }
}

async function withInstallHarness(t, options, run) {
  const homeDir = makeTempDir()
  const runtimeRoot = path.join(homeDir, 'fake-runtime')
  const statePath = path.join(homeDir, 'fake-openclaw-state.json')
  const uiPort = await findFreePort()
  const gatewayPort = await findFreePort()
  const profile = 'gtclaw-portable'

  writeFakeOpenClawRuntime(runtimeRoot)

  const child = spawn(process.execPath, ['ui/server.mjs'], {
    cwd: repoRoot,
    env: {
      ...process.env,
      HOME: path.join(homeDir, 'home'),
      OPENCLAW_HOME: homeDir,
      OPENCLAW_PROFILE: profile,
      OPENCLAW_GATEWAY_PORT: String(gatewayPort),
      OPENSPARROW_UI_PORT: String(uiPort),
      OPENSPARROW_AUTO_OPEN: '0',
      OPENSPARROW_INSTALL_GATE_AUTHORITY_CONVERGENCE_MS: String(options.convergenceMs ?? 700),
      OPENSPARROW_INSTALL_GATE_AUTHORITY_CONVERGENCE_POLL_MS: String(options.convergencePollMs ?? 100),
      USB_RUNTIME_ROOT: runtimeRoot,
      FAKE_OC_STATE_PATH: statePath,
      FAKE_DAEMON_READY_AFTER: String(options.daemonReadyAfter ?? 0),
      FAKE_HEALTH_READY_AFTER: String(options.healthReadyAfter ?? 0),
      FAKE_HEALTH_FAILURE_KIND: options.healthFailureKind ?? 'gateway_unhealthy',
      FAKE_FOREIGN_GATEWAY_AFTER_RESTART: options.foreignGatewayAfterRestart ? '1' : '0',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  t.after(async () => {
    await stopChild(child)
    stopForeignGateway(statePath)
  })

  await waitForServerReady(child, uiPort)

  return await run({
    homeDir,
    statePath,
    gatewayPort,
    baseUrl: `http://127.0.0.1:${uiPort}`,
  })
}

test('install gate converges past stale dingtalk daemon unknown evidence before terminal failure', { timeout: 30000 }, async (t) => {
  await withInstallHarness(t, {
    daemonReadyAfter: 1,
    healthReadyAfter: 1,
  }, async ({ baseUrl, homeDir }) => {
    const install = await requestJson(`${baseUrl}/api/install`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildInstallPayload()),
    })

    assert.equal(install.status, 200)
    assert.equal(install.payload.ok, true)
    assert.equal(install.payload.installState, 'completed')
    assert.equal(install.payload.requestedChannelReadiness.dingtalk, true)
    assert.equal(install.payload.channelProbes.dingtalk.ready, true)
    assert.equal(install.payload.channelProbes.dingtalk.authority.classification, 'authoritative_ready')
    assert.notEqual(install.payload.channelProbes.dingtalk.daemon, 'unknown')

    const installState = readJson(installStatePath(homeDir))
    assert.equal(installState.installState, 'completed')
    assert.equal(installState.requestedChannelReadiness.dingtalk, true)
    assert.equal(installState.channelProbes.dingtalk.ready, true)
    assert.equal(installState.channelProbes.dingtalk.authority.classification, 'authoritative_ready')
    assert.notEqual(installState.channelProbes.dingtalk.daemon, 'unknown')

    const serialized = JSON.stringify({ install: install.payload, installState })
    assert.doesNotMatch(serialized, /synthetic-dingtalk-client-secret/)
    assert.doesNotMatch(serialized, /synthetic-api-key-value/)
    assert.doesNotMatch(serialized, /export\\s+OPENCLAW_CONFIG_PATH/)
  })
})

test('persistent foreign gateway port remains non-ready after convergence', { timeout: 30000 }, async (t) => {
  await withInstallHarness(t, {
    daemonReadyAfter: 999,
    healthReadyAfter: 999,
    foreignGatewayAfterRestart: true,
  }, async ({ baseUrl, homeDir }) => {
    const install = await requestJson(`${baseUrl}/api/install`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildInstallPayload()),
    })

    assert.equal(install.status, 500)
    assert.equal(install.payload.installState, 'failed')
    assert.equal(install.payload.requestedChannelReadiness.dingtalk, false)
    assert.equal(install.payload.channelProbes.dingtalk.ready, false)
    assert.equal(install.payload.channelProbes.dingtalk.authority.classification, 'foreign_gateway_port')

    const installState = readJson(installStatePath(homeDir))
    assert.equal(installState.channelProbes.dingtalk.authority.classification, 'foreign_gateway_port')
  })
})

test('persistent gateway unhealthy remains non-ready after convergence', { timeout: 30000 }, async (t) => {
  await withInstallHarness(t, {
    daemonReadyAfter: 999,
    healthReadyAfter: 999,
  }, async ({ baseUrl, homeDir }) => {
    const install = await requestJson(`${baseUrl}/api/install`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildInstallPayload()),
    })

    assert.equal(install.status, 500)
    assert.equal(install.payload.installState, 'failed')
    assert.equal(install.payload.requestedChannelReadiness.dingtalk, false)
    assert.equal(install.payload.channelProbes.dingtalk.authority.classification, 'gateway_unhealthy')

    const installState = readJson(installStatePath(homeDir))
    assert.equal(installState.channelProbes.dingtalk.authority.classification, 'gateway_unhealthy')
  })
})

test('persistent config path token mismatch remains distinct after convergence', { timeout: 30000 }, async (t) => {
  await withInstallHarness(t, {
    daemonReadyAfter: 999,
    healthReadyAfter: 999,
    healthFailureKind: 'config_path_token_mismatch',
  }, async ({ baseUrl, homeDir }) => {
    const install = await requestJson(`${baseUrl}/api/install`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildInstallPayload()),
    })

    assert.equal(install.status, 500)
    assert.equal(install.payload.installState, 'failed')
    assert.equal(install.payload.requestedChannelReadiness.dingtalk, false)
    assert.equal(install.payload.channelProbes.dingtalk.authority.classification, 'config_path_token_mismatch')

    const serialized = JSON.stringify({ install: install.payload, installState: readJson(installStatePath(homeDir)) })
    assert.match(serialized, /config_path_token_mismatch/)
    assert.doesNotMatch(serialized, /synthetic-dingtalk-client-secret/)
    assert.doesNotMatch(serialized, /synthetic-api-key-value/)
  })
})

test('missing dingtalk credential fails as channel input validation before authority convergence', { timeout: 15000 }, async (t) => {
  await withInstallHarness(t, {}, async ({ baseUrl }) => {
    const payload = buildInstallPayload({ dingtalk: { clientSecret: '' } })
    const install = await requestJson(`${baseUrl}/api/install`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    assert.equal(install.status, 400)
    assert.equal(install.payload.ok, false)
    assert.match(install.payload.errors.join('\\n'), /AppSecret|Client Secret/)
    assert.doesNotMatch(JSON.stringify(install.payload), /authority|OPENCLAW_CONFIG_PATH/)
  })
})

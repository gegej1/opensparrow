import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')
const serverSource = fs.readFileSync(path.join(repoRoot, 'ui', 'server.mjs'), 'utf8')

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'opensparrow-profile-authority-'))
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function writeJson(filePath, payload) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8')
}

function profileDir(homeDir, profile) {
  return path.join(homeDir, `.openclaw-${profile}`)
}

function configPath(homeDir, profile) {
  return path.join(profileDir(homeDir, profile), 'openclaw.json')
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

  try {
    fs.symlinkSync(process.execPath, path.join(binDir, 'node'))
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error
  }

  fs.writeFileSync(path.join(openclawDir, 'openclaw.mjs'), `
import fs from 'node:fs'

const argv = process.argv.slice(2)
const profileIndex = argv.indexOf('--profile')
const args = profileIndex >= 0 ? argv.slice(profileIndex + 2) : argv
const envSnapshot = {
  args,
  OPENCLAW_HOME: process.env.OPENCLAW_HOME ?? null,
  OPENCLAW_PROFILE: process.env.OPENCLAW_PROFILE ?? null,
  OPENCLAW_CONFIG_PATH: process.env.OPENCLAW_CONFIG_PATH ?? null,
  OPENCLAW_GATEWAY_PORT: process.env.OPENCLAW_GATEWAY_PORT ?? null,
  CI: process.env.CI ?? null,
}
fs.appendFileSync(process.env.FAKE_OC_ENV_LOG_JSONL, JSON.stringify(envSnapshot) + '\\n')

const expectedConfig = process.env.FAKE_EXPECTED_OPENCLAW_CONFIG_PATH
const hasProfileConfig = process.env.OPENCLAW_CONFIG_PATH === expectedConfig
const daemonStatusJson = String(process.env.FAKE_OC_DAEMON_STATUS_JSON || '{"service":{"runtime":{"status":"running"},"rpc":{"healthy":true}}}').trim()

if (args[0] === 'daemon' && args[1] === 'status') {
  process.stdout.write(daemonStatusJson)
  process.exit(0)
}

if (args[0] === 'health') {
  if (!hasProfileConfig) {
    process.stderr.write('gateway token mismatch: default config is missing gateway token')
    process.exit(1)
  }
  process.stdout.write(JSON.stringify({ ok: true }))
  process.exit(0)
}

if (args[0] === 'channels' && args[1] === 'status') {
  if (!hasProfileConfig) {
    process.stderr.write('gateway token mismatch: default config is missing gateway token')
    process.exit(1)
  }
  process.stdout.write('dingtalk enabled, configured\\n')
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
      reject(new Error(`server did not become ready\nstdout:\n${stdout}\nstderr:\n${stderr}`))
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
      reject(new Error(`server exited before ready code=${code} signal=${signal}\nstdout:\n${stdout}\nstderr:\n${stderr}`))
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

async function requestJson(url, options = {}) {
  const response = await fetch(url, options)
  return {
    status: response.status,
    payload: await response.json(),
  }
}

function readEnvSnapshots(logPath) {
  return fs.readFileSync(logPath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
}

test('server centralizes OpenClaw child env authority without user workaround text', () => {
  assert.match(serverSource, /function buildOpenClawChildEnv\(/)
  assert.match(serverSource, /OPENCLAW_HOME:\s*OPENCLAW_HOME/)
  assert.match(serverSource, /OPENCLAW_PROFILE:\s*PROFILE/)
  assert.match(serverSource, /OPENCLAW_CONFIG_PATH:\s*CONFIG_FILE/)
  assert.match(serverSource, /OPENCLAW_GATEWAY_PORT:\s*String\(GATEWAY_PORT\)/)
  assert.match(serverSource, /CI:\s*process\.env\.CI \?\? '1'/)
  assert.match(serverSource, /env:\s*buildOpenClawChildEnv\(\)/)
  assert.doesNotMatch(serverSource, /export\s+OPENCLAW_CONFIG_PATH/)
})

test('daemon status, health, and channel probe use the same profile config env', { timeout: 20000 }, async (t) => {
  const homeDir = makeTempDir()
  const runtimeRoot = path.join(homeDir, 'fake-runtime')
  const profile = 'gtclaw-portable'
  const expectedConfigPath = configPath(homeDir, profile)
  const envLogPath = path.join(homeDir, 'openclaw-child-env.jsonl')
  const uiPort = await findFreePort()
  const gatewayPort = await findFreePort()

  writeFakeOpenClawRuntime(runtimeRoot)
  writeJson(expectedConfigPath, {
    channels: {
      dingtalk: {
        enabled: true,
        clientId: 'synthetic-dingtalk-client-id',
        clientSecret: 'synthetic-dingtalk-client-secret',
        corpId: 'synthetic-corp-id',
      },
    },
  })

  const child = spawn(process.execPath, ['ui/server.mjs'], {
    cwd: repoRoot,
    env: {
      ...process.env,
      OPENCLAW_HOME: homeDir,
      OPENCLAW_PROFILE: profile,
      OPENCLAW_GATEWAY_PORT: String(gatewayPort),
      OPENSPARROW_UI_PORT: String(uiPort),
      OPENSPARROW_AUTO_OPEN: '0',
      USB_RUNTIME_ROOT: runtimeRoot,
      FAKE_EXPECTED_OPENCLAW_CONFIG_PATH: expectedConfigPath,
      FAKE_OC_ENV_LOG_JSONL: envLogPath,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  t.after(async () => {
    await stopChild(child)
  })

  await waitForServerReady(child, uiPort)
  const baseUrl = `http://127.0.0.1:${uiPort}`

  const status = await requestJson(`${baseUrl}/api/status`)
  assert.equal(status.status, 200)
  assert.equal(status.payload.statusAuthority.classification, 'authoritative_ready')
  assert.equal(status.payload.statusAuthority.configPath, expectedConfigPath)
  assert.equal(status.payload.statusAuthority.gatewayPort, gatewayPort)

  const probe = await requestJson(`${baseUrl}/api/dingtalk/probe`, { method: 'POST' })
  assert.equal(probe.status, 200)
  assert.equal(probe.payload.ready, true)
  assert.match(probe.payload.checks.join('\n'), /configured/)

  const snapshots = readEnvSnapshots(envLogPath)
  const daemonStatus = snapshots.find((entry) => entry.args.join(' ') === 'daemon status --json')
  const health = snapshots.find((entry) => entry.args[0] === 'health')
  const channelProbe = snapshots.find((entry) => entry.args.join(' ').startsWith('channels status --probe'))

  for (const entry of [daemonStatus, health, channelProbe]) {
    assert.ok(entry, 'expected daemon status, health, and channels status invocations')
    assert.equal(entry.OPENCLAW_HOME, homeDir)
    assert.equal(entry.OPENCLAW_PROFILE, profile)
    assert.equal(entry.OPENCLAW_CONFIG_PATH, expectedConfigPath)
    assert.equal(entry.OPENCLAW_GATEWAY_PORT, String(gatewayPort))
    assert.equal(entry.CI, '1')
  }

  const serialized = JSON.stringify({ status: status.payload, probe: probe.payload })
  assert.doesNotMatch(serialized, /synthetic-dingtalk-client-secret/)
  assert.doesNotMatch(serialized, /default config is missing gateway token/)
})

test('dingtalk probe remains ready when same-profile health and channel probe are authoritative', { timeout: 20000 }, async (t) => {
  const homeDir = makeTempDir()
  const runtimeRoot = path.join(homeDir, 'fake-runtime')
  const profile = 'gtclaw-portable'
  const expectedConfigPath = configPath(homeDir, profile)
  const envLogPath = path.join(homeDir, 'openclaw-child-env.jsonl')
  const uiPort = await findFreePort()
  const gatewayPort = await findFreePort()

  writeFakeOpenClawRuntime(runtimeRoot)
  writeJson(expectedConfigPath, {
    channels: {
      dingtalk: {
        enabled: true,
        clientId: 'synthetic-dingtalk-client-id',
        clientSecret: 'synthetic-dingtalk-client-secret',
        corpId: 'synthetic-corp-id',
      },
    },
  })

  const child = spawn(process.execPath, ['ui/server.mjs'], {
    cwd: repoRoot,
    env: {
      ...process.env,
      OPENCLAW_HOME: homeDir,
      OPENCLAW_PROFILE: profile,
      OPENCLAW_GATEWAY_PORT: String(gatewayPort),
      OPENSPARROW_UI_PORT: String(uiPort),
      OPENSPARROW_AUTO_OPEN: '0',
      USB_RUNTIME_ROOT: runtimeRoot,
      FAKE_EXPECTED_OPENCLAW_CONFIG_PATH: expectedConfigPath,
      FAKE_OC_DAEMON_STATUS_JSON: '{"service":{"runtime":{"status":"unknown"},"rpc":{"healthy":false}}}',
      FAKE_OC_ENV_LOG_JSONL: envLogPath,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  t.after(async () => {
    await stopChild(child)
  })

  await waitForServerReady(child, uiPort)
  const baseUrl = `http://127.0.0.1:${uiPort}`

  const status = await requestJson(`${baseUrl}/api/status`)
  assert.equal(status.status, 200)
  assert.equal(status.payload.runtimeMode, 'gateway-fallback')
  assert.equal(status.payload.statusAuthority.classification, 'authoritative_ready')

  const probe = await requestJson(`${baseUrl}/api/dingtalk/probe`, { method: 'POST' })
  assert.equal(probe.status, 200)
  assert.equal(probe.payload.ready, true)
  assert.equal(probe.payload.authority.classification, 'authoritative_ready')
  assert.doesNotMatch(probe.payload.warnings.join('\n'), /daemon 当前状态/)

  const serialized = JSON.stringify({ status: status.payload, probe: probe.payload })
  assert.doesNotMatch(serialized, /synthetic-dingtalk-client-secret/)
  assert.doesNotMatch(serialized, /export\s+OPENCLAW_CONFIG_PATH/)
})

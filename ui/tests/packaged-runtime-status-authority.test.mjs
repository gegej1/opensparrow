import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'opensparrow-runtime-authority-'))
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
const argv = process.argv.slice(2)
const profileIndex = argv.indexOf('--profile')
const args = profileIndex >= 0 ? argv.slice(profileIndex + 2) : argv
const daemonStatusJson = String(process.env.FAKE_OC_DAEMON_STATUS_JSON || '{"service":{"runtime":{"status":"running"},"rpc":{"healthy":true}}}').trim()
const healthOk = String(process.env.FAKE_OC_HEALTH_OK || '1').trim() !== '0'

if (args[0] === 'daemon' && args[1] === 'status') {
  if (daemonStatusJson) process.stdout.write(daemonStatusJson)
  process.exit(0)
}

if (args[0] === 'health') {
  process.stdout.write(JSON.stringify({ ok: healthOk }))
  process.exit(healthOk ? 0 : 1)
}

process.stderr.write(\`unsupported fake openclaw command: \${args.join(' ')}\\n\`)
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

async function startUiServer({ homeDir, runtimeRoot, port, gatewayPort, daemonStatusJson, healthOk }) {
  const child = spawn(process.execPath, ['ui/server.mjs'], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      OPENCLAW_HOME: homeDir,
      OPENSPARROW_AUTO_OPEN: '0',
      OPENSPARROW_UI_PORT: String(port),
      OPENCLAW_GATEWAY_PORT: String(gatewayPort),
      USB_RUNTIME_ROOT: runtimeRoot,
      FAKE_OC_DAEMON_STATUS_JSON: daemonStatusJson,
      FAKE_OC_HEALTH_OK: healthOk ? '1' : '0',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  await waitForServerReady(child, port)
  return {
    child,
    baseUrl: `http://127.0.0.1:${port}`,
  }
}

async function getJson(url) {
  const response = await fetch(url)
  const payload = await response.json()
  return { status: response.status, payload }
}

async function withStatusHarness(testContext, options, run) {
  const homeDir = makeTempDir()
  const runtimeRoot = path.join(homeDir, 'fake-runtime')
  const uiPort = await findFreePort()
  const gatewayPort = await findFreePort()

  writeFakeOpenClawRuntime(runtimeRoot)
  writeJson(getConfigPath(homeDir), {
    models: {
      providers: {
        openai: {
          baseUrl: 'https://example.test/v1',
          models: [{ id: 'gpt-4o-mini' }],
        },
      },
    },
  })

  const ui = await startUiServer({
    homeDir,
    runtimeRoot,
    port: uiPort,
    gatewayPort,
    daemonStatusJson: options.daemonStatusJson,
    healthOk: options.healthOk,
  })

  testContext.after(async () => {
    await stopChild(ui.child)
  })

  return await run({
    homeDir,
    uiBaseUrl: ui.baseUrl,
    gatewayPort,
  })
}

test('status endpoint marks contradictory same-profile runtime evidence as non-running authority', { timeout: 15000 }, async (t) => {
  await withStatusHarness(t, {
    daemonStatusJson: '{"service":{"runtime":{"status":"running"},"rpc":{"healthy":false}}}',
    healthOk: false,
  }, async ({ uiBaseUrl }) => {
    const result = await getJson(`${uiBaseUrl}/api/status`)

    assert.equal(result.status, 200)
    assert.equal(result.payload.configExists, true)
    assert.equal(result.payload.gatewayHealthy, false)
    assert.equal(result.payload.gatewayPortBusy, false)
    assert.equal(result.payload.installed, false)
    assert.notEqual(result.payload.daemon, 'running')
    assert.notEqual(result.payload.runtimeMode, 'daemon')
    assert.equal(result.payload.statusAuthority.verdict, 'contradictory')
    assert.equal(result.payload.statusAuthority.rpcHealthy, false)
    assert.match(result.payload.statusAuthority.reasons.join('\n'), /health check failed/i)
    assert.match(result.payload.statusAuthority.reasons.join('\n'), /port .* free/i)
  })
})

test('status endpoint keeps authoritative daemon truth when live runtime signals are healthy', { timeout: 15000 }, async (t) => {
  await withStatusHarness(t, {
    daemonStatusJson: '{"service":{"runtime":{"status":"running"},"rpc":{"healthy":true}}}',
    healthOk: true,
  }, async ({ uiBaseUrl }) => {
    const result = await getJson(`${uiBaseUrl}/api/status`)

    assert.equal(result.status, 200)
    assert.equal(result.payload.installed, true)
    assert.equal(result.payload.daemon, 'running')
    assert.equal(result.payload.runtimeMode, 'daemon')
    assert.equal(result.payload.gatewayHealthy, true)
    assert.equal(result.payload.statusAuthority.verdict, 'authoritative')
    assert.equal(result.payload.statusAuthority.rpcHealthy, true)
  })
})
